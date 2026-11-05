"""Slice 25, the digest previous-run link and the digest report (RED role). Every test uses DummyLM or made-up rows.

The contract that these tests pin:
1. `priority digest <transcript> --stop 2 --log-dir DIR` loads the digest that the stop 1 run stored at
   `DIR/digests/<session_id>.json` and passes it as `previous` to `build_brief`. The digest model then receives
   the `PREVIOUS RUN:` block. Today the digest command passes no `previous`, so the block is missing.
2. `probes/digest_report.py` reads `DIR/calls.jsonl`. `digest_rows(DIR)` returns one dict per call row, holds
   numbers and flags only, and never holds brief or reply text.
3. `compare_rows(full_out, compact_out, full_calls, compact_calls, groups)` pairs the `score stop` lines of
   two eval outputs by session and stop. `groups` maps each full session id to its test-set group name, such as
   `"test set 1"`. It returns `rows`, `all`, and one summary per group. A summary holds
   `n`, `sessions`, `full`, `compact`, `diff`, `lo`, and `hi`. ASSUMED here: `diff` is `compact - full`, and the
   bootstrap resamples sessions with a fixed seed at 95 percent.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

from brief_support import Transcript, require
from digest_support import digest_reply, dummy, no_live_call, read_calls  # noqa: F401  (no_live_call is autouse)

PROBE = Path(__file__).resolve().parents[1] / "probes" / "digest_report.py"
PREVIOUS = "PREVIOUS RUN:"
FIRST_RAN = "RANFIRST the export model and its 9 tests are built."


# ---- helpers ------------------------------------------------------------------

def run_cli(monkeypatch, capsys, command, lm, transcript, *args):
    """Run `priority <command>` with the digest model patched in, as the CLI tests of slice 6 do."""
    interpreter = require("priority.interpreter")
    cli = require("priority.cli")
    monkeypatch.setattr(interpreter, "digest_lm", lambda *a, **k: lm)
    try:
        code = cli.main([command, str(transcript), *args])
    except SystemExit as exc:
        code = exc.code
    return code, capsys.readouterr().out


def spy_on_build_brief(monkeypatch) -> list:
    """The briefs that the CLI builds, in order."""
    cli = require("priority.cli")
    real = cli.build_brief
    briefs = []

    def recording(*args, **kwargs):
        brief = real(*args, **kwargs)
        briefs.append(brief)
        return brief

    monkeypatch.setattr(cli, "build_brief", recording)
    return briefs


def two_stops(tmp_path: Path, name: str = "f1a2b3c4.jsonl") -> Path:
    t = Transcript()
    t.human("Do the first thing.")
    t.reply("FIRSTREPLY the first thing is done.")
    t.human("Now do the second thing.")
    t.reply("SECONDREPLY the second thing is done.")
    return t.write(tmp_path / name)


def digest_inputs(log_dir: Path) -> list[str]:
    return [c["rendered_input"] for c in read_calls(log_dir) if c["stage"] == "digest"]


# ---- 1. The digest command passes the stored digest as previous --------------

def test_the_second_digest_run_shows_the_first_digest_under_previous_run(monkeypatch, capsys, tmp_path):
    path = two_stops(tmp_path)
    log_dir = tmp_path / "log"
    run_cli(monkeypatch, capsys, "digest", dummy([digest_reply(ran=FIRST_RAN)]), path,
            "--stop", "1", "--log-dir", str(log_dir))
    run_cli(monkeypatch, capsys, "digest", dummy([digest_reply()]), path,
            "--stop", "2", "--log-dir", str(log_dir))
    inputs = digest_inputs(log_dir)
    assert len(inputs) == 2, f"expected two digest calls, got {len(inputs)}"
    assert PREVIOUS not in inputs[0], "the stop 1 digest input has a PREVIOUS RUN: block with no stored digest"
    assert PREVIOUS in inputs[1], "the stop 2 digest input has no PREVIOUS RUN: block"
    assert FIRST_RAN in inputs[1], "the stop 2 PREVIOUS RUN: block does not carry the stop 1 digest"


def test_the_second_digest_run_passes_the_stored_digest_to_build_brief(monkeypatch, capsys, tmp_path):
    path = two_stops(tmp_path)
    log_dir = tmp_path / "log"
    run_cli(monkeypatch, capsys, "digest", dummy([digest_reply(ran=FIRST_RAN)]), path,
            "--stop", "1", "--log-dir", str(log_dir))
    briefs = spy_on_build_brief(monkeypatch)
    run_cli(monkeypatch, capsys, "digest", dummy([digest_reply()]), path,
            "--stop", "2", "--log-dir", str(log_dir))
    assert len(briefs) == 1, f"expected one brief for stop 2, got {len(briefs)}"
    previous = getattr(briefs[0], "previous", None)
    assert previous is not None, "build_brief received previous=None for stop 2"
    assert previous.ran == FIRST_RAN, "build_brief received a digest that is not the stop 1 digest"


# ---- 2. The digest report ------------------------------------------------------

def load_report():
    """Load probes/digest_report.py by path. A missing file fails on an assertion."""
    assert PROBE.is_file(), f"the report script is missing: {PROBE}"
    spec = importlib.util.spec_from_file_location("digest_report", PROBE)
    assert spec is not None and spec.loader is not None, f"cannot load {PROBE}"
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def call_row(**changes) -> dict:
    """One made-up call row, as the digest and interpret calls append it to calls.jsonl."""
    row = {"session_id": "a1b2c3d4", "stop": 2, "stage": "digest", "model_id": "mercury-3",
           "prompt_hash": "0f0f", "rendered_input": "BRIEF one stop of made-up text.",
           "raw_reply": '{"ran": "x"}', "adapter": "json", "seconds": 0.5, "valid": True}
    return {**row, **changes}


def write_calls(log_dir: Path, rows: list[dict]) -> Path:
    log_dir.mkdir(parents=True, exist_ok=True)
    (log_dir / "calls.jsonl").write_text("".join(json.dumps(row) + "\n" for row in rows))
    return log_dir


def test_the_digest_report_row_holds_the_call_numbers(tmp_path):
    report = load_report()
    text = "BRIEF one stop of made-up text."
    reply = '{"ran": "x"}'
    log = write_calls(tmp_path, [call_row(rendered_input=text, raw_reply=reply)])
    assert report.digest_rows(log) == [{
        "session": "a1b2c3d4", "stop": 2, "stage": "digest", "model_id": "mercury-3",
        "input_chars": len(text), "reply_chars": len(reply), "previous_run": False,
        "human_asked_chars": 0, "valid": True}]


def test_the_digest_report_flags_previous_run_and_a_filled_human_asked(tmp_path):
    report = load_report()
    first = "BRIEF stop one, with no earlier run.\n"
    later = "PREVIOUS RUN:\nRan the export model.\nHUMAN ASKED:\nShould money fields use cents?\n"
    log = write_calls(tmp_path, [call_row(stop=1, rendered_input=first), call_row(stop=2, rendered_input=later)])
    rows = report.digest_rows(log)
    assert len(rows) == 2, f"expected one row per call, got {len(rows)}"
    assert [row["previous_run"] for row in rows] == [False, True]
    assert rows[0]["human_asked_chars"] == 0, "a brief with no HUMAN ASKED: field counts it as filled"
    assert rows[1]["human_asked_chars"] > 0, "a filled HUMAN ASKED: field counts as zero"


def test_the_digest_report_marks_a_row_with_an_error_invalid(tmp_path):
    report = load_report()
    log = write_calls(tmp_path, [call_row(valid=True, error="ValueError: the reply has no digest field")])
    rows = report.digest_rows(log)
    assert len(rows) == 1, f"expected one row, got {len(rows)}"
    assert rows[0]["valid"] is False, "a call row with an error counts as valid"


def test_the_digest_report_holds_no_brief_or_reply_text(tmp_path):
    report = load_report()
    log = write_calls(tmp_path, [call_row(rendered_input="PRIVATEBRIEFTEXT alpha", raw_reply="PRIVATEREPLYTEXT beta")])
    rows = report.digest_rows(log)
    assert "PRIVATE" not in repr(rows), "the digest report copied brief or reply text into its rows"


# ---- 2b. The compact comparison -----------------------------------------------

FULL = [("aaaa1111", 1, 0.200), ("aaaa1111", 2, 0.400), ("bbbb2222", 1, 0.600),
        ("bbbb2222", 2, 0.800), ("cccc3333", 1, 0.500), ("cccc3333", 2, 0.500)]
COMPACT = [("aaaa1111", 1, 0.300), ("aaaa1111", 2, 0.500), ("bbbb2222", 1, 0.600),
           ("bbbb2222", 2, 0.900), ("cccc3333", 1, 0.400), ("cccc3333", 2, 0.600)]
GROUPS = {"aaaa1111": "test set 1", "bbbb2222": "test set 1", "cccc3333": "test set 2"}


def score_line(session: str, stop: int, overall: float) -> str:
    """One line as `priority eval` prints it: the score line format of eval_report.py."""
    return (f"score stop session={session} stop={stop} overall={overall:.3f} payload=0.500 "
            f"gate=1 ambiguous=no")


def eval_output(scores) -> str:
    return "\n".join(score_line(s, n, x) for s, n, x in scores) + "\n"


def form_calls(scores, text: str) -> list[dict]:
    return [call_row(session_id=s, stop=n, stage="digest", rendered_input=text) for s, n, _ in scores]


def compare(report):
    return report.compare_rows(eval_output(FULL), eval_output(COMPACT), form_calls(FULL, "BRIEF full form."),
                               form_calls(COMPACT, "BRIEF compact form."), GROUPS)


def test_compare_rows_gives_the_paired_means_and_the_compact_minus_full_difference():
    summary = compare(load_report())["all"]
    assert summary["n"] == 6, f"expected six paired stops, got {summary['n']}"
    assert summary["sessions"] == 3, f"expected three sessions, got {summary['sessions']}"
    assert summary["full"] == pytest.approx(0.5)
    assert summary["compact"] == pytest.approx(0.55)
    assert summary["diff"] == pytest.approx(0.05)
    assert summary["lo"] <= summary["diff"] <= summary["hi"], "the interval does not hold the difference"


def test_compare_rows_keeps_a_summary_for_each_test_set_group():
    result = compare(load_report())
    assert "rows" in result and "all" in result, f"missing keys in {sorted(result)}"
    for group in ("test set 1", "test set 2"):
        assert group in result, f"no summary for the group {group!r}, keys are {sorted(result)}"
        assert {"n", "sessions", "full", "compact", "diff", "lo", "hi"} <= set(result[group])


def test_compare_rows_summarises_each_group_from_its_own_stops_only():
    full = [("dddd4444", 1, 0.300), ("dddd4444", 2, 0.500), ("eeee5555", 1, 0.700), ("eeee5555", 2, 0.100),
            ("ffff6666", 1, 0.900), ("ffff6666", 2, 0.300), ("gggg7777", 1, 0.300)]
    compact = [("dddd4444", 1, 0.200), ("dddd4444", 2, 0.800), ("eeee5555", 1, 0.600), ("eeee5555", 2, 0.400),
               ("ffff6666", 1, 0.500), ("ffff6666", 2, 0.100), ("gggg7777", 1, 0.600)]
    groups = {"dddd4444": "test set 1", "eeee5555": "test set 1",
              "ffff6666": "test set 2", "gggg7777": "test set 2"}
    result = load_report().compare_rows(eval_output(full), eval_output(compact),
                                        form_calls(full, "BRIEF full form."),
                                        form_calls(compact, "BRIEF compact form."), groups)
    one, two = result["test set 1"], result["test set 2"]
    assert one["n"] == 4, f"test set 1: expected four stops, got {one['n']}"
    assert one["sessions"] == 2, f"test set 1: expected two sessions, got {one['sessions']}"
    assert one["full"] == pytest.approx(0.4), f"test set 1 full mean is {one['full']}"
    assert one["compact"] == pytest.approx(0.5), f"test set 1 compact mean is {one['compact']}"
    assert one["diff"] == pytest.approx(0.1), f"test set 1 diff is {one['diff']}"
    assert two["n"] == 3, f"test set 2: expected three stops, got {two['n']}"
    assert two["sessions"] == 2, f"test set 2: expected two sessions, got {two['sessions']}"
    assert two["full"] == pytest.approx(0.5), f"test set 2 full mean is {two['full']}"
    assert two["compact"] == pytest.approx(0.4), f"test set 2 compact mean is {two['compact']}"
    assert two["diff"] == pytest.approx(-0.1), f"test set 2 diff is {two['diff']}"


def test_compare_rows_bootstrap_is_seeded_and_repeats():
    report = load_report()
    assert compare(report)["all"] == compare(report)["all"], "two runs of the bootstrap gave different intervals"
