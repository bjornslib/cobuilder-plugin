"""CLI contract for shared/tracker.py. Slice 2 checks the write refusal with no adapter.

A write with no configured adapter exits 2, prints a message that names the
missing adapter, and changes no file.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path
import pytest

REPO_DIR = Path(__file__).resolve().parent.parent
TRACKER_CLI = REPO_DIR / "shared" / "tracker.py"
FIXTURES_DIR = REPO_DIR / "tests" / "fixtures" / "tracker"
CORPUS_DIR = FIXTURES_DIR / "corpus"
PLANS_DIR = FIXTURES_DIR / "plans"


def _snapshot(root: Path) -> dict[str, str]:
    # Map each file's relative path to a digest of its bytes. A missing root is an empty snapshot.
    if not root.exists():
        return {}
    return {
        str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def test_write_without_adapter_exits_2_and_changes_no_file(tmp_path: Path) -> None:
    assert TRACKER_CLI.is_file(), "shared/tracker.py does not exist"

    # A tmp repo with one state file, and no .cobuilder/tracker.yaml.
    status_file = tmp_path / "docs" / "plans" / "demo" / "04-slices.md"
    status_file.parent.mkdir(parents=True)
    status_file.write_text("| demo-E1-s3 | open |\n", encoding="utf-8")
    missing_config = tmp_path / ".cobuilder" / "tracker.yaml"
    assert not missing_config.exists()

    before_repo = _snapshot(tmp_path)
    before_fixtures = _snapshot(FIXTURES_DIR)

    result = subprocess.run(
        [
            "uv",
            "run",
            str(TRACKER_CLI),
            "--config",
            str(missing_config),
            "set-slice-state",
            "demo-E1-s3",
            "closed",
        ],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
    )

    assert result.returncode == 2, result.stderr
    assert "adapter" in result.stderr.lower(), result.stderr
    # The command prints JSON on stdout. Empty stdout is also allowed for a refusal.
    if result.stdout.strip():
        assert isinstance(json.loads(result.stdout), dict), result.stdout
    assert _snapshot(tmp_path) == before_repo
    assert _snapshot(FIXTURES_DIR) == before_fixtures


def _cfg(tmp_path: Path, corpus: Path = CORPUS_DIR, state_file: Path | None = None) -> Path:
    # The config names the fake adapter and a corpus. The tmp repo holds it, never docs/plans.
    config = tmp_path / ".cobuilder" / "tracker.yaml"
    config.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "adapter: fake",
        f"corpus: {json.dumps(str(corpus))}",
        f"plans_dir: {json.dumps(str(PLANS_DIR))}",
    ]
    if state_file is not None:
        lines.append(f"state_file: {json.dumps(str(state_file))}")
    config.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return config


def _cli(config: Path, cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["uv", "run", str(TRACKER_CLI), "--config", str(config), *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
    )


def _payload(result: subprocess.CompletedProcess[str]) -> object:
    # A success prints {"ok": true, "result": ...} on stdout.
    assert result.returncode == 0, result.stderr
    body = json.loads(result.stdout)
    assert body["ok"] is True, result.stdout
    return body["result"]


def test_list_programs_prints_corpus_ids(tmp_path: Path) -> None:
    programs = _payload(_cli(_cfg(tmp_path), tmp_path, "list-programs"))
    corpus = json.loads((CORPUS_DIR / "program.json").read_text(encoding="utf-8"))
    rows = corpus if isinstance(corpus, list) else [corpus]
    assert [row["id"] for row in programs] == [row["id"] for row in rows]


def test_success_exits_0(tmp_path: Path) -> None:
    result = _cli(_cfg(tmp_path), tmp_path, "get-slice", "demo-E1-s3")
    assert result.returncode == 0, result.stderr
    assert _payload(result)["id"] == "demo-E1-s3"


def test_missing_corpus_exits_3(tmp_path: Path) -> None:
    config = _cfg(tmp_path, corpus=tmp_path / "no-such-corpus")
    assert _cli(config, tmp_path, "list-programs").returncode == 3


def test_unknown_subcommand_exits_4(tmp_path: Path) -> None:
    assert _cli(_cfg(tmp_path), tmp_path, "no-such-command").returncode == 4


def test_missing_argument_exits_4(tmp_path: Path) -> None:
    assert _cli(_cfg(tmp_path), tmp_path, "get-slice").returncode == 4


def test_state_file_carries_write_to_next_call(tmp_path: Path) -> None:
    state = tmp_path / "state" / "tracker-state.json"
    config = _cfg(tmp_path, state_file=state)
    _payload(_cli(config, tmp_path, "claim-slice", "demo-E1-s3", "agent-x"))
    assert state.is_file()
    assert _payload(_cli(config, tmp_path, "get-slice", "demo-E1-s3"))["assignee"] == "agent-x"


def test_capabilities_reports_flags(tmp_path: Path) -> None:
    caps = _payload(_cli(_cfg(tmp_path), tmp_path, "capabilities"))
    assert {"atomic_claim", "rich_envelope", "offline_read"} <= set(caps)
    assert all(isinstance(value, bool) for value in caps.values())


def test_doctor_with_adapter_reports_adapter_and_capabilities(tmp_path: Path) -> None:
    report = _payload(_cli(_cfg(tmp_path), tmp_path, "doctor"))
    assert report["adapter"] == "fake"
    assert isinstance(report["capabilities"], dict)


def test_doctor_without_adapter_exits_2(tmp_path: Path) -> None:
    result = _cli(tmp_path / ".cobuilder" / "tracker.yaml", tmp_path, "doctor")
    assert result.returncode == 2, result.stderr
    assert "adapter" in (result.stdout + result.stderr).lower()


def test_seed_dry_run_prints_lines_and_writes_nothing(tmp_path: Path) -> None:
    state = tmp_path / "state.json"
    config = _cfg(tmp_path, state_file=state)
    dry = _cli(config, tmp_path, "seed-from-files", str(PLANS_DIR), "--dry-run")
    assert dry.returncode == 0, dry.stderr
    assert not state.exists()
    created = _payload(_cli(config, tmp_path, "seed-from-files", str(PLANS_DIR)))
    assert created, "the real seed creates records"
    for row in created:
        assert row["id"] in dry.stdout, row["id"]


SPY_SOURCE = '''
import json
import runpy
import sys

opened = []
sys.addaudithook(lambda event, args: opened.append(str(args[0])) if event == "open" else None)
cli, out, *rest = sys.argv[1:]
sys.path.insert(0, cli.rsplit("/", 1)[0])
sys.argv = [cli, *rest]
code = 0
try:
    runpy.run_path(cli, run_name="__main__")
except SystemExit as exc:
    code = exc.code if isinstance(exc.code, int) else 1
finally:
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(opened, handle)
sys.exit(code)
'''


def _spy_opens(tmp_path: Path, config: Path, *argv: str) -> list[str]:
    # The spy records every file the CLI opens, then the test reads that list.
    spy = tmp_path / "spy.py"
    spy.write_text(SPY_SOURCE, encoding="utf-8")
    out = tmp_path / "opens.json"
    result = subprocess.run(
        ["uv", "run", "python", str(spy), str(TRACKER_CLI), str(out), "--config", str(config), *argv],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(out.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "argv",
    [["list-programs"], ["next-ready", "--kind", "slice", "--under", "demo-E1"]],
    ids=["list-programs", "next-ready"],
)
def test_read_path_never_opens_docs_plans(tmp_path: Path, argv: list[str]) -> None:
    opens = _spy_opens(tmp_path, _cfg(tmp_path), *argv)
    assert any("corpus" in path for path in opens), "the fake adapter reads the corpus"
    assert [path for path in opens if "docs/plans" in path] == []
