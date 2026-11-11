"""The --digest flag of priority interpret (design priority-dev-cc-plugin, ADR-0049). Every test uses DummyLM.

The contract that these tests pin:
- `priority interpret ... --digest current` labels the stored digest `CURRENT RUN:` in the brief that the model reads.
- With no flag, or with `--digest previous`, the label stays `PREVIOUS RUN:`.
- The compact brief of eval keeps its own `RUN DIGEST:` label.
"""
from __future__ import annotations

import pytest

from brief_support import FIXTURES, require
from digest_support import DIGEST, dummy, make_digest, read_calls  # noqa: F401
from interpret_support import DONE
from test_digest_link import run_cli, store

WAITING = FIXTURES / "waiting-question.jsonl"


def sent_to_interpreter(log_dir) -> str:
    return [c["rendered_input"] for c in read_calls(log_dir) if c["stage"] != "digest"][0]


def test_digest_current_labels_the_stored_digest_current_run(monkeypatch, capsys, tmp_path):
    store(tmp_path, WAITING.stem)
    code, _ = run_cli(monkeypatch, capsys, "interpret", dummy([DONE]), WAITING, "--log-dir", str(tmp_path),
                      "--digest", "current")
    assert code == 0
    sent = sent_to_interpreter(tmp_path)
    assert "CURRENT RUN:" in sent and "PREVIOUS RUN:" not in sent
    assert DIGEST["ran"] in sent


@pytest.mark.parametrize("flag", [(), ("--digest", "previous")])
def test_the_default_label_stays_previous_run(monkeypatch, capsys, tmp_path, flag):
    store(tmp_path, WAITING.stem)
    code, _ = run_cli(monkeypatch, capsys, "interpret", dummy([DONE]), WAITING, "--log-dir", str(tmp_path), *flag)
    assert code == 0
    sent = sent_to_interpreter(tmp_path)
    assert "PREVIOUS RUN:" in sent and "CURRENT RUN:" not in sent


def test_an_unknown_digest_value_is_refused(monkeypatch, capsys, tmp_path):
    code, _ = run_cli(monkeypatch, capsys, "interpret", dummy([DONE]), WAITING, "--log-dir", str(tmp_path),
                      "--digest", "next")
    assert code != 0


def test_the_compact_brief_keeps_its_own_label():
    builder = require("priority.brief")
    brief = builder.build_brief(WAITING, previous=make_digest())
    assert "RUN DIGEST:" in brief.for_model_compact(make_digest())
