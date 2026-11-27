"""Helpers for the replay tests: the replay report with failure drills. No test makes a live call.

The contract that these tests pin. Slices 4 to 6 hold the brief and the digest. Slice 21 holds the
interpreter: one ProposeStop call for each stop, and an Abstain with `abstain["reason"]`.

Interpreter adapter
- `Interpreter(lm=None, *, log_dir=None, session_id="", adapter="chat")`. `adapter` is `"chat"` or `"json"`.
  `"chat"` is the default: `dspy.ChatAdapter` with `use_json_adapter_fallback=False`. `"json"` runs
  `dspy.JSONAdapter`. Any other value raises `ValueError` at construction, and the message names the value.
  The Digest and Shrink calls stay on the chat adapter.

Call rows. Every row of `calls.jsonl` holds `stage`, `model_id`, `prompt_hash`, `rendered_input`, `raw_reply`,
and these three keys: `adapter` (`"chat"` or `"json"`), `seconds` (the wall time of the call), and `valid`
(true when the reply parsed and validated, false when the call raised or the reply did not parse or validate).

The command `priority replay <fixtures-dir> [--out DIR] [--log-dir DIR] [--adapters json,chat]
[--concurrency N] [--goal FILE]`
- It replays the last stop of every `*.jsonl` file under the fixtures folder, at any depth. The session id is
  the file stem. `--out` defaults to `reports`, and `--log-dir` defaults to the value of `--out`. `--adapters`
  defaults to `json,chat`, and the report lists the adapters in the given order. Another name is an argument
  error. `--concurrency` defaults to 5. `--goal` names the file that holds the `abort_if` list.
- The command reads the models through `priority.interpreter.interpreter_lm()` and
  `priority.interpreter.digest_lm()`, which the tests patch. A run never reads the key itself.
- For each session the command builds the brief once. A brief that is an Abstain makes no model call.
  Otherwise the command runs the Digest call once, and the Interpreter once for each adapter, with
  `Interpreter(adapter=<name>, log_dir=<log-dir>/<name>, session_id=<stem>)`. Within one adapter,
  `--concurrency` sets how many stops are in flight at the same time, and no more than that number ever is.
- The command starts clean, exits 0 when every session ends as a Prediction or an Abstain, and logs each
  Abstain with the session id and the reason.
- `<out>/results.jsonl` holds one JSON object for each (adapter, session) with the keys `adapter`, `session`,
  `real`, `abstain_reason`, `abstain_detail`, and `steps` (the number of steps of the Prediction, 0 for an
  Abstain). A brief Abstain also has a line, with the reason of the brief.

The report is Markdown, with the sections Run, one Adapter section for each adapter (valid-output rate,
rate-limit errors, Abstain reasons, Proposals by step count, and a Stages table), Digest model, Failure
drills, and Go or no-go. The failure drills run on their own scripted models and store their rows in
`<log-dir>/drills/calls.jsonl`. Each drill ends as an Abstain whose reason is one that the interpreter
still gives: `rate_limit: model_error`, `malformed_json: invalid_output`, and `timeout: model_error`.
"""
from __future__ import annotations

import json
import logging
import re
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

import pytest

from brief_support import FIXTURES, PRIORITY_DEV, require, simple
from digest_support import digest_reply
from interpret_support import dspy, propose, step
from probe_support import DIGEST_MODEL, INTERPRETER_MODEL, read_calls  # noqa: F401

try:
    import litellm
    from dspy.adapters.chat_adapter import FieldInfoWithName
    from dspy.signatures.field import OutputField
    from dspy.utils import DummyLM
except ImportError:  # interpret_support makes each test fail with a clear message
    litellm = FieldInfoWithName = OutputField = None
    DummyLM = object

GOAL = PRIORITY_DEV.parent / "docs" / "architecture" / "designs" / "priority-dev-spike" / "goal.json"
PRICES = {"interpreter": (0.15, 0.60), "digest": (0.45, 1.20)}
QUOTE_B = "Should I retry with a fixed delay or use backoff?"
DRILLS = {"rate_limit": "model_error", "malformed_json": "invalid_output", "timeout": "model_error"}
INTERPRETER_REASONS = {"model_error", "invalid_output"}


def quote_a(name: str) -> str:
    return f"Reply with fixed or backoff for {name}"


# ---- the sessions ------------------------------------------------------------

@dataclass(frozen=True)
class Plan:
    """What the stub model does for one session."""
    kinds: tuple[str, ...] = ("reply",)
    status: str = "waiting_answer"
    needs_human: bool = True
    fault: str | None = None  # at the propose call: 429, malformed, unknown_kind, or timeout
    digest_fault: str | None = None  # at Digest: 429 or malformed


PLANS = {
    "alpha": Plan(),  # one step
    "bravo": Plan(kinds=("reply", "send_feedback"), needs_human=False),  # two steps
    "charlie": Plan(kinds=("reply", "send_feedback", "approve_gate")),  # three steps
    "delta": Plan(fault="429", digest_fault="429"),
    "echo": Plan(fault="malformed", digest_fault="malformed"),
    "foxtrot": Plan(fault="unknown_kind"),
    "golf": Plan(fault="timeout"),
    "hotel": Plan(kinds=("notify",), status="done", needs_human=False),  # one notify step from the model
    "india": Plan(fault="429"),
    "zulu": Plan(),  # the file holds no agent reply, so the brief is an Abstain
}
# (abstain reason, steps) of each session of PLANS, the same for both adapters
OUTCOMES = {"alpha": (None, 1), "bravo": (None, 2), "charlie": (None, 3), "delta": ("model_error", 0),
            "echo": ("invalid_output", 0), "foxtrot": ("invalid_output", 0), "golf": ("model_error", 0),
            "hotel": (None, 1), "india": ("model_error", 0), "zulu": ("no_agent_reply", 0)}
CALLS_PER_ADAPTER = 9  # one propose call for each session of PLANS that has a stop brief


def write_world(root: Path, plans: dict[str, Plan] = PLANS, subdir: str = "made-up") -> Path:
    """One transcript for each plan, under root/subdir. The plan `zulu` copies a transcript with no agent reply."""
    folder = root / subdir
    folder.mkdir(parents=True, exist_ok=True)
    for name in plans:
        if name == "zulu":
            (folder / "zulu.jsonl").write_text((FIXTURES / "brief-only-synthetic.jsonl").read_text())
            continue
        final = f"Session {name} is waiting. {QUOTE_B} {quote_a(name)}."
        target = folder / "nested" if name == "bravo" else folder
        target.mkdir(exist_ok=True)
        simple(target / f"{name}.jsonl", ask=f"Fix the retry loop for {name}.", final=final)
    (folder / "notes.txt").write_text("Not a transcript.")
    return root


# ---- the stub model ----------------------------------------------------------

class _Next:
    """The scripted answer of this thread. DummyLM reads it with next()."""

    def __init__(self, local: threading.local):
        self.local = local

    def __iter__(self):
        return self

    def __next__(self):
        return self.local.reply


class StubModel(DummyLM):
    """A model that answers by call and by session, in the format of the adapter that is active.

    It is safe to call from many threads. `kind` says which model it plays, `interpreter` or `digest`.
    It counts the calls that are in flight, and it sleeps `delay` seconds inside each call.
    """

    def __init__(self, kind: str, plans: dict[str, Plan] = PLANS, *, delay: float = 0.0):
        super().__init__([])
        self.kind, self.plans, self.delay = kind, plans, delay
        self.model = INTERPRETER_MODEL if kind == "interpreter" else DIGEST_MODEL
        self.local, self.lock = threading.local(), threading.Lock()
        self.answers = _Next(self.local)
        self.inflight = self.max_inflight = 0
        self.seen: list[tuple[str, str, str]] = []  # (adapter class, stage, session)

    def _format_answer_fields(self, values):
        adapter = dspy.settings.adapter
        fields = {FieldInfoWithName(name=n, info=OutputField()): v for n, v in values.items()}
        try:
            return adapter.format_field_with_value(fields, role="assistant")
        except TypeError:
            return adapter.format_field_with_value(fields)

    @staticmethod
    def stage_of(system: str) -> str:
        for stage, marker in (("propose", "`priority`"), ("shrink", "`short`"), ("digest", "`digest`")):
            if marker in system:
                return stage
        raise AssertionError(f"the stub cannot tell the call of this prompt: {system[:300]!r}")

    def forward(self, prompt=None, messages=None, **kwargs):
        system, last = messages[0]["content"], messages[-1]["content"]
        stage = self.stage_of(system)
        name = (re.search(r"Session (\w+) is waiting", last) or re.search(r"(zulu)", last) or [None, ""])[1]
        with self.lock:
            self.inflight += 1
            self.max_inflight = max(self.max_inflight, self.inflight)
            self.seen.append((type(dspy.settings.adapter).__name__, stage, name))
        try:
            time.sleep(self.delay)
            self.local.reply = self.reply(stage, name)
            return super().forward(prompt=prompt, messages=messages, **kwargs)
        finally:
            with self.lock:
                self.inflight -= 1

    def reply(self, stage: str, name: str) -> dict:
        plan = self.plans.get(name, Plan())
        fault = {"propose": plan.fault, "digest": plan.digest_fault}.get(stage)  # a fault hits one call only
        if fault == "429":
            raise litellm.RateLimitError("429 Too Many Requests", llm_provider="openrouter", model=self.model)
        if fault == "timeout":
            raise TimeoutError("the model timed out")
        if stage == "propose":
            if fault == "malformed":
                return propose(steps="this is not JSON")
            if fault == "unknown_kind":
                return propose([{"kind": "launch_missile"}])
            return propose([step(kind) for kind in plan.kinds], status=plan.status, needs_human=plan.needs_human)
        if stage == "digest":
            return {"digest": "this is not JSON"} if fault == "malformed" else digest_reply()
        return {"short": "tiny"}


# ---- running the command -----------------------------------------------------

class Collect(logging.Handler):
    def __init__(self):
        super().__init__(logging.INFO)
        self.records: list[logging.LogRecord] = []

    def emit(self, record):
        self.records.append(record)

    def text(self) -> str:
        return "\n".join(r.getMessage() for r in self.records)


@dataclass
class Replayed:
    root: Path
    out: Path
    log_dir: Path
    code: object
    interp: StubModel
    digest: StubModel
    logs: Collect = field(default_factory=Collect)

    @property
    def report(self) -> str:
        path = self.out / "report.md"
        assert path.is_file(), f"priority replay wrote no report at {path} (exit code {self.code!r})"
        return path.read_text()

    def rows(self, folder: str) -> list[dict]:
        return read_calls(self.log_dir / folder)

    def results(self) -> list[dict]:
        path = self.out / "results.jsonl"
        assert path.is_file(), f"priority replay wrote no results.jsonl at {path}"
        return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def replay(root: Path, out: Path, *args: str, interp: StubModel | None = None, digest: StubModel | None = None,
           log_dir: Path | None = None, goal: Path | None = GOAL) -> Replayed:
    """Run `priority replay` with the stub models in place of the two factories. It never reads the key."""
    interpreter, cli, config = require("priority.interpreter"), require("priority.cli"), require("priority.config")
    interp, digest = interp or StubModel("interpreter"), digest or StubModel("digest")
    monkeypatch = pytest.MonkeyPatch()
    handler, root_logger = Collect(), logging.getLogger()
    root_logger.addHandler(handler)
    level = root_logger.level
    root_logger.setLevel(logging.INFO)
    try:
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
        monkeypatch.setattr(config, "load_key", lambda: (_ for _ in ()).throw(AssertionError("the key was read")))
        for module in (interpreter, cli):
            monkeypatch.setattr(module, "interpreter_lm", lambda *a, **k: interp, raising=False)
            monkeypatch.setattr(module, "digest_lm", lambda *a, **k: digest, raising=False)
        argv = ["replay", str(root), "--out", str(out), *args]
        if log_dir is not None:
            argv += ["--log-dir", str(log_dir)]
        if goal is not None:
            argv += ["--goal", str(goal)]
        try:
            code = cli.main(argv)
        except SystemExit as exc:
            code = exc.code
    finally:
        root_logger.setLevel(level)
        root_logger.removeHandler(handler)
        monkeypatch.undo()
    return Replayed(root, out, log_dir or out, code, interp, digest, handler)


# ---- reading the report ------------------------------------------------------

def split(lines: list[str], marker: str) -> dict[str, list[str]]:
    """The lines of each heading of the level of the marker (`## ` or `### `), by heading text.

    A deeper heading and its lines stay in the section. A heading of a higher level ends it.
    """
    level = len(marker) - 1
    found: dict[str, list[str]] = {}
    current = None
    for line in lines:
        match = re.match(r"(#+) (.*)", line)
        if match and len(match.group(1)) == level:
            current = match.group(2).strip()
            found[current] = []
        elif match and len(match.group(1)) < level:
            current = None
        elif current is not None:
            found[current].append(line)
    return found


def sections(report: str) -> dict[str, list[str]]:
    return split(report.splitlines(), "## ")


def bullet(lines: list[str], key: str) -> str:
    for line in lines:
        if line.startswith(f"- {key}:"):
            return line.split(":", 1)[1].strip()
    raise AssertionError(f"no bullet '- {key}:' in {lines[:12]}")


def rate(text: str) -> tuple[float | None, int, int]:
    """(share or None, count, total) from a text like `0.833 (10/12)` or `n/a (0/0)`."""
    match = re.search(r"\((\d+)/(\d+)\)", text)
    assert match, f"no (count/total) in {text!r}"
    count, total = int(match.group(1)), int(match.group(2))
    if total:
        assert abs(float(text.split()[0]) - count / total) < 0.001, f"the share does not match {text!r}"
    return (count / total if total else None), count, total


def counts(lines: list[str], pattern: str = r"- ([\w ]+?): (\d+)$") -> dict[str, int]:
    return {m.group(1): int(m.group(2)) for m in (re.match(pattern, line) for line in lines) if m}


def table(lines: list[str]) -> dict[str, dict[str, str]]:
    """A Markdown table as {stage: {header: cell}}."""
    rows = [[c.strip() for c in line.strip().strip("|").split("|")] for line in lines if line.strip().startswith("|")]
    assert rows, "no table"
    header = rows[0]
    assert "stage" in header, f"the table has no stage column: {header}"
    return {row[header.index("stage")]: dict(zip(header, row)) for row in rows[2:]}


# ---- what the rows say -------------------------------------------------------

def is_rate_limit(row: dict) -> bool:
    return "RateLimitError" in row.get("error", "") or "429" in row.get("error", "")


def stage_figures(rows: list[dict], stage: str, kind: str) -> dict:
    """The figures that the report must show for one stage, from the rows alone."""
    mine = [r for r in rows if r["stage"] == stage]
    chars_in = sum(len(r["rendered_input"]) for r in mine)
    chars_out = sum(len(r["raw_reply"]) for r in mine)
    price_in, price_out = PRICES[kind]
    return {"calls": len(mine), "chars": chars_in, "seconds": sum(r["seconds"] for r in mine),
            "cost": chars_in / 4 * price_in / 1e6 + chars_out / 4 * price_out / 1e6}
