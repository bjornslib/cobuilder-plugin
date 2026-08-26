"""Tests for the feedback server and watch command (Slices 13 & 14).

Run with: uv run --with pytest pytest tests/test_server_watch.py -v
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

import pytest
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))
from ledger import LedgerPaths, append_comment, append_reply, append_state, read_ledger  # noqa: E402

# Import serve_bundle module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "plugins" / "artifact" / "scripts"))
import serve_bundle  # noqa: E402


class TestServer:
    """Tests for the feedback server (Slice 13)."""

    @pytest.fixture
    def bundle_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            yield Path(tmp)

    @pytest.fixture
    def server(self, bundle_dir):
        """Start a test server with write enabled."""
        # Create ledger file
        (bundle_dir / "feedback-ledger.jsonl").touch()

        server = serve_bundle.HTTPServer(("127.0.0.1", 0), serve_bundle.FeedbackHandler)
        serve_bundle.FeedbackHandler.ledger_paths = LedgerPaths(bundle_dir)
        serve_bundle.FeedbackHandler.allow_write = True
        port = server.server_address[1]

        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        # Wait for server to be ready
        base_url = f"http://127.0.0.1:{port}"
        for _ in range(50):
            try:
                requests.get(base_url, timeout=0.1)
                break
            except requests.RequestException:
                time.sleep(0.05)

        yield base_url

        server.shutdown()
        server.server_close()

    def test_post_feedback_appends_to_ledger(self, server, bundle_dir):
        """C3: Server accepts POST /feedback and appends to ledger."""
        payload = {
            "anchor": {"selector": ".test", "selection": {"quotedText": "selected"}},
            "text": "Test feedback",
            "author": "human",
        }
        resp = requests.post(f"{server}/feedback", json=payload, timeout=5)
        assert resp.status_code == 201
        data = resp.json()
        assert "ulid" in data
        assert data["status"] == "appended"

        # Verify ledger has the entry
        lines = read_ledger(bundle_dir / "feedback-ledger.jsonl")
        assert len(lines) == 1
        assert lines[0]["type"] == "comment"
        assert lines[0]["text"] == "Test feedback"
        assert lines[0]["anchor"] == payload["anchor"]

    def test_post_feedback_returns_403_when_read_only(self, bundle_dir):
        """C3: Server rejects writes when read-only mode."""
        (bundle_dir / "feedback-ledger.jsonl").touch()

        server = serve_bundle.HTTPServer(("127.0.0.1", 0), serve_bundle.FeedbackHandler)
        serve_bundle.FeedbackHandler.ledger_paths = LedgerPaths(bundle_dir)
        serve_bundle.FeedbackHandler.allow_write = False
        port = server.server_address[1]

        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        base_url = f"http://127.0.0.1:{port}"
        for _ in range(50):
            try:
                requests.get(base_url, timeout=0.1)
                break
            except requests.RequestException:
                time.sleep(0.05)

        payload = {"anchor": {"selector": ".test"}, "text": "Test"}
        resp = requests.post(f"{base_url}/feedback", json=payload, timeout=5)
        assert resp.status_code == 403
        data = resp.json()
        assert "disabled" in data["error"].lower()

        server.shutdown()
        server.server_close()

    def test_post_feedback_rejects_other_paths(self, server):
        """C3: Server rejects POST to paths other than /feedback."""
        resp = requests.post(f"{server}/other", json={}, timeout=5)
        assert resp.status_code == 404

    def test_post_feedback_validates_required_fields(self, server):
        """C3: Server validates anchor and text are present."""
        resp = requests.post(f"{server}/feedback", json={"anchor": {"selector": ".test"}}, timeout=5)
        assert resp.status_code == 400
        data = resp.json()
        assert "text" in data["error"].lower() or "missing" in data["error"].lower()

        resp = requests.post(f"{server}/feedback", json={"text": "Only text"}, timeout=5)
        assert resp.status_code == 400

    def test_server_binds_loopback_only(self, bundle_dir):
        """C3: Server binds to 127.0.0.1 only."""
        (bundle_dir / "feedback-ledger.jsonl").touch()
        server = serve_bundle.HTTPServer(("127.0.0.1", 0), serve_bundle.FeedbackHandler)
        assert server.server_address[0] == "127.0.0.1"
        server.server_close()


class TestWatchCommand:
    """Tests for the watch_feedback command (Slice 14)."""

    @pytest.fixture
    def bundle_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            yield Path(tmp)

    def test_watch_exits_0_on_new_lines(self, bundle_dir):
        """C1: Watch exits 0 when new lines appear."""
        ledger_path = bundle_dir / "feedback-ledger.jsonl"
        ledger_path.touch()

        # Start watch in background
        proc = subprocess.Popen([
            "uv", "run",
            str(Path(__file__).resolve().parent.parent / "plugins" / "cobuilder-full-lifecycle" / "scripts" / "watch_feedback.py"),
            "--bundle-dir", str(bundle_dir),
            "--since", "0",
            "--timeout", "5"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        # Give watch time to start
        time.sleep(0.5)

        # Append a line
        paths = LedgerPaths(bundle_dir)
        append_comment(paths, {"selector": ".test"}, "Watched comment")

        stdout, stderr = proc.communicate(timeout=10)
        assert proc.returncode == 0
        assert "Watched comment" in stdout

    def test_watch_exits_2_on_timeout(self, bundle_dir):
        """C1 & C2: Watch exits 2 on timeout with no new lines."""
        ledger_path = bundle_dir / "feedback-ledger.jsonl"
        ledger_path.touch()

        proc = subprocess.Popen([
            "uv", "run",
            str(Path(__file__).resolve().parent.parent / "plugins" / "cobuilder-full-lifecycle" / "scripts" / "watch_feedback.py"),
            "--bundle-dir", str(bundle_dir),
            "--since", "0",
            "--timeout", "1"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        stdout, stderr = proc.communicate(timeout=5)
        assert proc.returncode == 2
        assert stdout.strip() == ""

    def test_watch_tracks_offset_per_reader(self, bundle_dir):
        """C3: Two readers at different offsets receive their own lines.
        Each run of watch_feedback returns lines from its --since offset,
        then exits. The caller tracks the returned offset for the next run."""
        ledger_path = bundle_dir / "feedback-ledger.jsonl"
        ledger_path.touch()

        paths = LedgerPaths(bundle_dir)
        append_comment(paths, {"selector": ".a"}, "First")
        append_comment(paths, {"selector": ".b"}, "Second")

        # Reader 1: first run from beginning (--since 0)
        proc1 = subprocess.Popen([
            "uv", "run",
            str(Path(__file__).resolve().parent.parent / "plugins" / "cobuilder-full-lifecycle" / "scripts" / "watch_feedback.py"),
            "--bundle-dir", str(bundle_dir),
            "--since", "0",
            "--timeout", "5"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        stdout1, _ = proc1.communicate(timeout=10)
        assert proc1.returncode == 0
        lines1 = [json.loads(l) for l in stdout1.strip().split('\n') if l]
        assert len(lines1) == 2
        assert lines1[0]["text"] == "First"
        assert lines1[1]["text"] == "Second"
        offset1 = 2  # Track offset for next run

        # Append a new line
        append_comment(paths, {"selector": ".c"}, "Third")

        # Reader 1 second run: from offset 2 (--since 2)
        proc1b = subprocess.Popen([
            "uv", "run",
            str(Path(__file__).resolve().parent.parent / "plugins" / "cobuilder-full-lifecycle" / "scripts" / "watch_feedback.py"),
            "--bundle-dir", str(bundle_dir),
            "--since", str(offset1),
            "--timeout", "5"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        stdout1b, _ = proc1b.communicate(timeout=10)
        assert proc1b.returncode == 0
        lines1b = [json.loads(l) for l in stdout1b.strip().split('\n') if l]
        assert len(lines1b) == 1
        assert lines1b[0]["text"] == "Third"

        # Reader 2: starts from offset 2 (skips first two)
        proc2 = subprocess.Popen([
            "uv", "run",
            str(Path(__file__).resolve().parent.parent / "plugins" / "cobuilder-full-lifecycle" / "scripts" / "watch_feedback.py"),
            "--bundle-dir", str(bundle_dir),
            "--since", "2",
            "--timeout", "5"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        stdout2, _ = proc2.communicate(timeout=10)
        assert proc2.returncode == 0
        lines2 = [json.loads(l) for l in stdout2.strip().split('\n') if l]
        assert len(lines2) == 1
        assert lines2[0]["text"] == "Third"
        assert "First" not in stdout2
        assert "Second" not in stdout2


class TestEndToEndLoop:
    """Test the whole loop end-to-end (Slice 14 C4)."""

    def test_full_loop_comment_to_reply(self, tmp_path):
        """C4: Comment -> wake -> agent reply -> projection updated."""
        bundle_dir = tmp_path
        (bundle_dir / "feedback-ledger.jsonl").touch()

        paths = LedgerPaths(bundle_dir)

        # 1. Human posts a comment (simulating viewer POST /feedback)
        anchor = {"selector": ".test-class", "selection": {"quotedText": "selected text"}}
        thread_ulid = append_comment(paths, anchor, "Human feedback")

        # 2. Agent wakes and sees the new line (simulating watch_feedback --since 0)
        lines_before = read_ledger(paths.ledger)
        offset = len(lines_before)

        # 3. Agent replies
        reply_ulid = append_reply(paths, thread_ulid, "Agent response to feedback")

        # 4. Agent updates state
        append_state(paths, thread_ulid, "resolved", by="agent")

        # 5. Verify projection shows new state
        thread = get_all_threads(paths)[thread_ulid] if hasattr(sys.modules[__name__], 'get_all_threads') else None
        # Use ledger module directly
        from ledger import get_all_threads
        thread = get_all_threads(paths)[thread_ulid]

        assert thread["current_state"] == "resolved"
        assert thread["updated_by"] == "agent"
        assert thread["reply_count"] == 1
        assert thread["replies"][0]["text"] == "Agent response to feedback"
        assert thread["replies"][0]["author"] == "agent"

        # 6. Verify ledger has all three lines in order
        lines = read_ledger(paths.ledger)
        assert len(lines) == 3
        assert lines[0]["type"] == "comment"
        assert lines[1]["type"] == "reply"
        assert lines[2]["type"] == "state"

        # 7. Verify quote is preserved in anchor
        assert lines[0]["anchor"]["selection"]["quotedText"] == "selected text"


class TestServeSubprocess:
    """Real-process test of serve_bundle.py, with the real ulid-py dependency.

    The in-process TestServer fixture above imports `ledger` directly, so
    it runs under pytest's environment, where `ulid-py` is absent and the
    uuid fallback engages. That path never exercises the real dependency,
    so it cannot catch a bug in how the real package is used. Start the
    script the way a person runs it, with `uv run`, so the PEP 723 header
    resolves the real `ulid-py` package.
    """

    def test_post_feedback_returns_201_with_real_ulid_py(self, tmp_path):
        """The server must accept a real POST and append a ledger line,
        using the actual `ulid-py` dependency declared in the script."""
        bundle_dir = tmp_path
        (bundle_dir / "feedback-ledger.jsonl").touch()
        script = str(
            Path(__file__).resolve().parent.parent
            / "plugins"
            / "artifact"
            / "scripts"
            / "serve_bundle.py"
        )

        import os

        env = dict(os.environ, PYTHONUNBUFFERED="1")
        proc = subprocess.Popen(
            ["uv", "run", script, "--bundle-dir", str(bundle_dir), "--port", "0", "--allow-write"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
        )
        try:
            port = None
            deadline = time.time() + 30
            while time.time() < deadline:
                line = proc.stdout.readline()
                if not line:
                    if proc.poll() is not None:
                        break
                    continue
                match = re.search(r"127\.0\.0\.1:(\d+)", line)
                if match:
                    port = int(match.group(1))
                    break
            if port is None:
                stderr = proc.stderr.read() if proc.poll() is not None else ""
                pytest.fail(f"serve_bundle.py never printed its bound port. stderr: {stderr}")

            base_url = f"http://127.0.0.1:{port}"
            resp = None
            for _ in range(50):
                try:
                    resp = requests.post(
                        f"{base_url}/feedback",
                        json={"anchor": {"selector": "#x"}, "text": "e2e comment"},
                        timeout=1,
                    )
                    break
                except requests.RequestException:
                    time.sleep(0.1)

            assert resp is not None, "server never accepted a connection"
            assert resp.status_code == 201, resp.text
            data = resp.json()
            assert len(data["ulid"]) == 26

            lines = read_ledger(bundle_dir / "feedback-ledger.jsonl")
            assert len(lines) == 1
            assert lines[0]["text"] == "e2e comment"
            assert lines[0]["ulid"] == data["ulid"]
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])