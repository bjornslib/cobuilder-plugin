"""RED, slice 25 (epic E7): the compact stop brief.

1. RED: `StopBrief.for_model_compact(digest)` has the four sections in order, and no run item.
2. RED: the compact text fills `HUMAN ASKED:` and keeps the human line after the stop.
3. RED: the `RUN DIGEST:` section shows the ran, result, open item, and decision fields.
4. RED: `priority eval --brief compact` is accepted and exits 0.
5. RED: with `--digest-dir`, each scored stop makes one digest call on the full brief and caches it as
   `<session>-<stop>.json`.
6. RED: the task model receives the compact text, not the full brief.

Every model here is a stub: the digest run is a stub class and the task model is a stub interpreter.
No test makes a live model call. The made-up transcripts hold no secret.
"""
from __future__ import annotations

import contextlib
import io
from pathlib import Path

from brief_support import build, simple
from digest_support import make_digest
from eval_support import (StubInterpreter, metric_api, require, stub_predictions_for,
                          write_eval_world)

ASK = "Ship the export model."
HUMAN_AFTER = "Use integer cents for money."
CLIENT_TEXT = "API Error: rate limited"
TOOL_RESULT = "ALPHA-RESULT-7731"
ORDER = ("HUMAN ASKED:", "RUN DIGEST:", "FINAL REPLY:", "CLIENT MESSAGE:")


def stop_brief(tmp_path: Path, **kwargs):
    """Build the stop brief of a made-up transcript. Fail on an assertion when the result is not a StopBrief."""
    brief_type = require("priority.brief").StopBrief
    result = build(simple(tmp_path / "run.jsonl", **kwargs))
    assert isinstance(result, brief_type), f"expected a StopBrief, got {result!r}"
    return result


def compact_text(brief, digest) -> str:
    assert hasattr(brief, "for_model_compact"), "StopBrief has no for_model_compact(digest) yet"
    return brief.for_model_compact(digest)


def section_of(text: str, label: str) -> str:
    """The text of one section: from its label to the next section label, or to the end."""
    assert label in text, f"the compact brief has no {label} section"
    start = text.index(label) + len(label)
    ends = [text.index(other, start) for other in ORDER if other != label and other in text[start:]]
    return text[start:min(ends) if ends else len(text)]


class RecordingInterpreter(StubInterpreter):
    """A stub task model that keeps the keyword arguments of each call."""

    def __init__(self, predictions, calls: list) -> None:
        super().__init__(predictions)
        self.calls = calls

    def __call__(self, *args, **kwargs):
        self.calls.append(kwargs)
        return super().__call__(*args, **kwargs)


class EvalRun:
    """What one `priority eval --brief compact` run printed and recorded."""

    def __init__(self, code, printed, parts, digest_dir, digest_calls, task_calls):
        self.code = code
        self.printed = printed
        self.parts = parts
        self.digest_dir = digest_dir
        self.digest_calls = digest_calls
        self.task_calls = task_calls


def run_compact(monkeypatch, tmp_path: Path, *, compact: bool = True, work_dir: Path | None = None,
                digest_dir: Path | None = None, digest_for=None) -> EvalRun:
    """Run `priority eval --split train` in process, with stub models.

    With `compact`, add `--brief compact --digest-dir DIR`. `digest_for(brief)` answers each digest call;
    the default answers one fixed RunDigest. The SystemExit guard covers the argparse error of a missing flag,
    so the tests fail on their assertions.
    """
    metric_api()
    interpreter = require("priority.interpreter")
    config = require("priority.config")
    work = work_dir or tmp_path
    work.mkdir(parents=True, exist_ok=True)
    manifest_path, labels_path, real_dir, parts = write_eval_world(work)
    digest_dir = digest_dir or tmp_path / "digests"
    digest_calls: list = []
    digest = make_digest()

    class StubDigestRun:
        """Stand in for DigestRun. It records each brief it reads and returns the stub answer."""

        def __init__(self, lm=None, **kwargs):
            self.lm = lm

        def forward(self, brief):
            digest_calls.append(brief)
            return digest_for(brief) if digest_for else digest

        def __call__(self, brief):
            return self.forward(brief)

    task_calls: list = []
    predictions = stub_predictions_for(manifest_path, labels_path)
    monkeypatch.setattr(config, "load_key",
                        lambda *args, **kwargs: (_ for _ in ()).throw(
                            AssertionError("a test reached for the real key")))
    monkeypatch.setattr(interpreter, "digest_lm", lambda *args, **kwargs: object())
    monkeypatch.setattr(interpreter, "DigestRun", StubDigestRun)
    monkeypatch.setattr(interpreter, "Interpreter",
                        lambda *args, **kwargs: RecordingInterpreter(predictions, task_calls))
    from priority.cli import main

    argv = ["eval", "--split", "train"]
    if compact:
        argv += ["--brief", "compact", "--digest-dir", str(digest_dir)]
    argv += ["--manifest", str(manifest_path), "--labels", str(labels_path),
             "--real-dir", str(real_dir), "--log-dir", str(work / "logs")]
    code = None
    out = io.StringIO()
    with contextlib.suppress(SystemExit):
        with contextlib.redirect_stdout(out):
            code = main(argv)
    return EvalRun(code, out.getvalue(), parts, digest_dir, digest_calls, task_calls)


def test_compact_render_has_four_sections_in_order_and_no_run_items(tmp_path):
    brief = stop_brief(tmp_path, ask=ASK, final="Done.",
                       exchanges=[("Read", {"path": "a.txt"}, TOOL_RESULT)],
                       after=[("client", CLIENT_TEXT), ("human", HUMAN_AFTER)])
    text = compact_text(brief, make_digest())
    for label in ORDER:
        assert label in text, f"the compact brief has no {label} section"
    positions = [text.index(label) for label in ORDER]
    assert positions == sorted(positions), "the compact sections are not in the order HUMAN ASKED, RUN DIGEST, FINAL REPLY, CLIENT MESSAGE"
    for run_item in ("[tool ", "[result]", "[agent]", "RUN:", TOOL_RESULT):
        assert run_item not in text, f"the compact brief holds the run item {run_item!r}"


def test_compact_render_fills_human_asked_and_keeps_human_after_stop(tmp_path):
    brief = stop_brief(tmp_path, ask=ASK, final="Done.", after=[("human", HUMAN_AFTER)])
    text = compact_text(brief, make_digest())
    assert ASK in section_of(text, "HUMAN ASKED:"), "HUMAN ASKED: does not show the human ask"
    human_line = f"[human] {HUMAN_AFTER}"
    assert human_line in text, "the compact brief drops the human line after the stop"
    assert text.index(human_line) > text.index("FINAL REPLY:"), "the human line after the stop is not after FINAL REPLY"


def test_compact_render_shows_every_digest_field_in_run_digest(tmp_path):
    digest = make_digest(open_items=("Ask about the cents rule?",),
                         decisions=("Money fields use integer cents",))
    brief = stop_brief(tmp_path, ask=ASK, final="Done.")
    run_digest = section_of(compact_text(brief, digest), "RUN DIGEST:")
    for value in (digest.ran, digest.result, *digest.open_items, *digest.decisions):
        assert value in run_digest, f"RUN DIGEST: does not show {value!r}"


def test_eval_accepts_brief_compact_and_exits_zero(monkeypatch, tmp_path):
    run = run_compact(monkeypatch, tmp_path)
    assert run.code == 0, (f"priority eval --brief compact gave the exit code {run.code}; "
                           f"the flag is missing or the run failed:\n{run.printed}")


def test_eval_compact_makes_one_digest_per_stop_and_caches_it_by_session_and_stop(monkeypatch, tmp_path):
    run = run_compact(monkeypatch, tmp_path)
    train = set(run.parts["train"])
    cached = sorted(run.digest_dir.glob("*.json")) if run.digest_dir.exists() else []
    assert run.digest_calls, "no digest call was made for any train stop"
    assert len(cached) == len(run.digest_calls), (
        f"{len(run.digest_calls)} digest calls but {len(cached)} cached files in {run.digest_dir}")
    stop_type = require("priority.brief").StopBrief
    for brief in run.digest_calls:
        assert isinstance(brief, stop_type), "the digest call did not read a StopBrief"
        assert "RUN:" in brief.for_model(), "the digest call did not read the full brief"
    digest_type = require("priority.interpreter").RunDigest
    for path in cached:
        assert any(path.name.startswith(session + "-") for session in train), f"{path.name} is not a train session file"
        digest_type.model_validate_json(path.read_text())
    for session in train:
        assert any(path.name.startswith(session + "-") for path in cached), f"no cached digest for session {session}"


def test_eval_compact_gives_task_model_the_compact_text_not_the_full_brief(monkeypatch, tmp_path):
    run = run_compact(monkeypatch, tmp_path)
    assert run.task_calls, "the task model was never called"
    ran = make_digest().ran
    for call in run.task_calls:
        text = call["brief_text"]
        assert "RUN DIGEST:" in text, "the task model did not get the compact brief"
        assert "RUN:" not in text, "the task model got the full run, not the compact brief"
        assert ran in text, "the task model did not get the digest of the run"


def test_eval_compact_reuses_cached_digests_on_a_second_run(monkeypatch, tmp_path):
    first = run_compact(monkeypatch, tmp_path)
    assert first.digest_calls, "no digest call on the first run, so the cache has nothing to reuse"
    second = run_compact(monkeypatch, tmp_path, work_dir=tmp_path / "second", digest_dir=first.digest_dir)
    assert second.code == 0, f"the second run failed:\n{second.printed}"
    assert second.digest_calls == [], (
        f"the second run made {len(second.digest_calls)} digest calls; the cache was not reused")


def test_default_eval_without_brief_keeps_the_full_brief_and_makes_no_digest_call(monkeypatch, tmp_path):
    run = run_compact(monkeypatch, tmp_path, compact=False)
    assert run.code == 0, f"the default priority eval failed:\n{run.printed}"
    assert run.digest_calls == [], f"the default eval made {len(run.digest_calls)} digest calls"
    assert run.task_calls, "the task model was never called"
    texts = [call["brief_text"] for call in run.task_calls]
    assert any("RUN:" in text for text in texts), "the default eval did not give the task model the full brief"
    assert not any("RUN DIGEST:" in text for text in texts), "the default eval gave the task model the compact brief"


def test_eval_compact_falls_back_to_full_brief_for_one_abstaining_stop(monkeypatch, tmp_path):
    models = require("priority.interpreter.models")
    seen: list = []

    def abstain_on_first_stop(brief):
        seen.append(brief)
        if len(seen) == 1:
            return models.Abstain(reason="invalid_output", detail="stub: the digest abstains for the first stop")
        return make_digest()

    run = run_compact(monkeypatch, tmp_path, digest_for=abstain_on_first_stop)
    assert run.code == 0, f"the run crashed on an abstaining digest:\n{run.printed}"
    assert "compact brief: 1 stops fell back to the full brief" in run.printed, (
        f"the run did not report the one fallback stop:\n{run.printed}")
    texts = [call["brief_text"] for call in run.task_calls]
    assert any("RUN DIGEST:" in text for text in texts), "no stop got the compact brief"
    assert any("RUN:" in text and "RUN DIGEST:" not in text for text in texts), (
        "the abstaining stop did not get the full brief")


def test_eval_compact_caches_an_abstain_and_skips_its_digest_on_a_second_run(monkeypatch, tmp_path):
    models = require("priority.interpreter.models")
    seen: list = []

    def abstain_on_first_stop(brief):
        seen.append(brief)
        if len(seen) == 1:
            return models.Abstain(reason="invalid_output", detail="stub: the digest abstains for the first stop")
        return make_digest()

    first = run_compact(monkeypatch, tmp_path, digest_for=abstain_on_first_stop)
    assert first.code == 0, f"the first run crashed on an abstaining digest:\n{first.printed}"
    assert "compact brief: 1 stops fell back to the full brief" in first.printed, (
        f"the first run did not report the one fallback stop:\n{first.printed}")
    second = run_compact(monkeypatch, tmp_path, work_dir=tmp_path / "second", digest_dir=first.digest_dir)
    assert second.code == 0, f"the second run failed:\n{second.printed}"
    assert second.digest_calls == [], (
        f"the second run made {len(second.digest_calls)} digest calls; the abstain was not cached")
    assert "compact brief: 1 stops fell back to the full brief" in second.printed, (
        f"the second run did not report the abstaining stop as a fallback:\n{second.printed}")
    texts = [call["brief_text"] for call in second.task_calls]
    assert any("RUN:" in text and "RUN DIGEST:" not in text for text in texts), (
        "the abstaining stop did not get the full brief on the second run")
    cached = sorted(first.digest_dir.glob("*.json"))
    assert len(cached) == len(first.digest_calls), (
        f"{len(first.digest_calls)} digest calls but {len(cached)} cached files in {first.digest_dir}")
    abstained = []
    for path in cached:
        try:
            models.Abstain.model_validate_json(path.read_text())
        except ValueError:
            continue
        abstained.append(path)
    assert len(abstained) == 1, f"expected one cached Abstain file in {first.digest_dir}, found {len(abstained)}"


def test_eval_compact_does_not_cache_a_model_error_abstain(monkeypatch, tmp_path):
    models = require("priority.interpreter.models")
    seen: list = []

    def model_error_on_first_stop(brief):
        seen.append(brief)
        if len(seen) == 1:
            return models.Abstain(reason="model_error", detail="stub: the provider failed for the first stop")
        return make_digest()

    first = run_compact(monkeypatch, tmp_path, digest_for=model_error_on_first_stop)
    assert first.code == 0, f"the first run crashed on a model error:\n{first.printed}"
    assert "compact brief: 1 stops fell back to the full brief" in first.printed, (
        f"the first run did not report the one fallback stop:\n{first.printed}")
    cached = sorted(first.digest_dir.glob("*.json"))
    assert len(cached) == len(first.digest_calls) - 1, (
        f"expected {len(first.digest_calls) - 1} cached files, every stop except the model_error stop; "
        f"found {len(cached)} in {first.digest_dir}")
    for path in cached:
        try:
            models.Abstain.model_validate_json(path.read_text())
        except ValueError:
            continue
        raise AssertionError(f"the model_error abstain was cached in {path}")
    second = run_compact(monkeypatch, tmp_path, work_dir=tmp_path / "second", digest_dir=first.digest_dir)
    assert second.code == 0, f"the second run failed:\n{second.printed}"
    assert len(second.digest_calls) == 1, (
        f"the second run made {len(second.digest_calls)} digest calls; expected 1, the model_error stop, "
        "because a transient failure must not be cached")
