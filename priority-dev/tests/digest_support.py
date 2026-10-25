"""Helpers for the slice 6 tests, digest a run (RED role). The tests never make a live model call.

The contract that these tests pin. Slice 4 holds the brief, and slice 5 holds the call store.

- `priority.interpreter` exports `RunDigest`, `DigestRun`, and `digest_lm`.
  `RunDigest` follows `schemas.md` section 2.3: `ran` (up to 600 characters), `result` (up to 300),
  `open_items` (up to 5 texts), and `decisions` (up to 5 texts). A value over a limit does not validate.
  `digest_lm()` builds the digest model `openrouter/thinkingmachines/inkling-small` from
  `priority.config.load_key()`. Only the CLI calls it.
- `DigestRun(lm=None, *, log_dir=None)` is a `dspy.Module`. `forward(brief)` takes the `StopBrief` and
  returns a `RunDigest`, or an `priority.interpreter.Abstain`. A model call that raises gives the reason
  `model_error`. A reply that does not parse, or does not validate, gives the reason `invalid_output`.
  Both write a log record at level INFO or above that holds the reason and the error text. No exception
  escapes. The run makes one model call, so a bad reply never leads to a second call.
- The DummyLM reply of Digest has the output field `digest`, the JSON of a RunDigest. The reply of Shrink
  has the output field `short`, the shorter text.
- `log_dir/calls.jsonl` is the call store of slice 5. A Digest call has the stage `digest`, and a Shrink call
  has the stage `shrink`. Each record has `model_id`, `prompt_hash` (the SHA-256 of `rendered_input`),
  `rendered_input`, and `raw_reply`. A call that raised also has `error`.
- `build_brief(transcript, stop=None, previous=None, *, shrink_lm=None, log_dir=None)`.
  `previous` is a RunDigest or None. `StopBrief.previous` holds it, and `for_model()` shows its `ran`,
  `result`, `open_items`, and `decisions`. A brief with no `previous` renders as in slice 4.
- `shrink_lm` is the digest model. With no `shrink_lm`, an over-budget brief is an Abstain, as in slice 4.
  With one, the builder runs the Shrink call while the model text is over `BUDGET_CHARS`. Each call takes one
  older tool input or result. It takes the largest one that is not shrunk yet. The last three tool items
  are never older. The reply `short` replaces the text of that input or result. The builder checks the size
  after each call and stops at the first size that fits. The builder never shrinks the human ask, the
  final reply, the last three tool items, the CLIENT MESSAGE section, or the human lines after the stop.
- `StopBrief.shrunk` is a tuple with one entry for each text that shrank, in the order of the calls. Each
  entry has `item` (the index in `StopBrief.items`), `part` (`input` or `result`), `before` (the characters
  before), and `after` (the characters after). A brief that did not shrink has `shrunk == ()`.
- Over the budget after every older input and result shrank, `build_brief` returns the Abstain
  `brief_too_large`. A Shrink call that raises gives the Abstain `model_error`. A Shrink reply that does
  not parse gives `invalid_output`. Both write a log record. No exception escapes `build_brief`.
- `priority digest <transcript> [--stop N] [--log-dir DIR]` builds the brief with the digest model as
  `shrink_lm`, runs `DigestRun`, and prints one JSON object. The model comes from
  `priority.interpreter.digest_lm()` (called through the module attribute). A RunDigest prints with the keys
  `ran`, `result`, `open_items`, and `decisions`. An Abstain prints with the keys `reason` and `detail`.
  The command exits 0 for both. A brief that is an Abstain never reaches the Digest call.
"""
from __future__ import annotations

import inspect
import json
from pathlib import Path

from brief_support import BUDGET, Transcript, brief_api, filler, simple  # noqa: F401  (re-exported)
from interpret_support import (FailingLM, RateLimited, dspy, dummy, interpreter_api, log_reasons,  # noqa: F401
                               make_brief, no_live_call, read_calls, stages)
from probe_support import DIGEST_MODEL  # noqa: F401

DIGEST = {"ran": "Built the export model and its 9 tests.", "result": "Stop brief 1 done, tests pass.",
          "open_items": ["Should money fields use cents?"], "decisions": ["Money fields use integer cents"]}


def digest_api():
    api = interpreter_api()
    for name in ("RunDigest", "DigestRun", "digest_lm"):
        assert hasattr(api, name), f"priority.interpreter has no {name} yet"
    return api


def make_digest(**changes):
    return digest_api().RunDigest(**{**DIGEST, **changes})


def digest_reply(**changes) -> dict:
    return {"digest": json.dumps({**DIGEST, **changes})}


def short_reply(text: str) -> dict:
    return {"short": text}


def run_digest(lm, brief=None, **kwargs):
    return digest_api().DigestRun(lm=lm, **kwargs)(brief if brief is not None else make_brief())


# ---- build_brief with the slice 6 parameters ----------------------------------

def build_with(path: Path, stop: int | None = None, **kwargs):
    """Call build_brief with the new keyword parameters. A missing parameter fails on an assertion."""
    build = brief_api().build_brief
    missing = [k for k in kwargs if k not in inspect.signature(build).parameters]
    assert not missing, f"build_brief has no parameter {missing}"
    return build(path, stop, **kwargs)


def expect_brief(result):
    assert isinstance(result, brief_api().StopBrief), f"expected a StopBrief, got {result!r}"
    return result


def shrunk_entries(brief) -> list[tuple]:
    """(item, part, before, after) for each entry of brief.shrunk."""
    assert hasattr(brief, "shrunk"), "StopBrief has no field shrunk"
    found = []
    for entry in brief.shrunk:
        for name in ("item", "part", "before", "after"):
            assert hasattr(entry, name), f"a shrunk entry has no field {name}"
        found.append((entry.item, entry.part, entry.before, entry.after))
    return found


# ---- over-budget transcripts --------------------------------------------------

def older(sizes, tag: str = "zq"):
    """One exchange for each size. The result of exchange i holds the word `{tag}{i} lorem`."""
    return [(f"OldTool{i}", {"idx": i}, filler(n, f"{tag}{i}")) for i, n in enumerate(sizes)]


def recent(size: int = 100, count: int = 3):
    return [(f"NewTool{i}", {"idx": i}, filler(size, f"nw{i}")) for i in range(count)]


def over_budget(tmp_path: Path, sizes, *, recent_size: int = 100, name: str = "run.jsonl", **kwargs) -> Path:
    """A transcript with older results of the given sizes, then three recent ones."""
    return simple(tmp_path / name, exchanges=[*older(sizes), *recent(recent_size)], **kwargs)


ONE_SHRINK = [31_000, 38_000, 33_000, 35_000, 32_000]  # 169,000 characters. Shrinking the 38,000 one fits
THREE_SHRINKS = [41_000, 45_000, 40_000, 44_000, 42_000, 43_000]  # shrinking 45, 44, and 43 thousand fits


def rendered_inputs(log_dir: Path, stage: str) -> list[str]:
    return [c["rendered_input"] for c in read_calls(log_dir) if c["stage"] == stage]
