"""Helpers for the slice 7 tests, the replay report with failure drills (RED role). No test makes a live call.

The contract that these tests pin. Slices 4 to 6 hold the brief, the interpreter, and the digest.

Interpreter adapter
- `Interpreter(lm=None, *, allowed_kinds=ACTION_KINDS, log_dir=None, session_id="", adapter="chat")`.
  `adapter` is `"chat"` or `"json"`. `"chat"` is the default and runs as today: `dspy.ChatAdapter` with
  `use_json_adapter_fallback=False`. `"json"` runs `dspy.JSONAdapter`. Any other value raises `ValueError` at
  construction, and the message names the value. The Digest and Shrink calls stay on the chat adapter.

Call rows. Every row of `calls.jsonl` keeps the keys of slice 5, and it gains three keys:
- `adapter`: `"chat"` or `"json"`, the adapter of the call. A Digest or Shrink call has `"chat"`.
- `seconds`: a float, the wall time of the model call, from its start to its end or its error.
- `valid`: true when the reply parsed into the type of the stage. It is false when the call raised, and when
  the reply did not parse or validate. A reply that parses but fails a code check (an empty quote) is valid.

The command `priority replay <fixtures-dir> [--out DIR] [--log-dir DIR] [--adapters json,chat]
[--concurrency N] [--goal FILE]`
- It replays the last stop of every `*.jsonl` file under the fixtures folder, at any depth. A file that does
  not end in `.jsonl` is ignored. The session id is the file stem. `--out` defaults to `reports`, and
  `--log-dir` defaults to the value of `--out`. `--adapters` defaults to `json,chat`, and the report lists the
  adapters in the given order. A name other than `json` and `chat` is an argument error (exit code not 0).
  `--concurrency` defaults to 5. `--goal` defaults to the `goal.json` of the program, and it names the file
  that holds the `abort_if` list.
- The command reads the models through the module attributes `priority.interpreter.interpreter_lm()` and
  `priority.interpreter.digest_lm()`, which the tests patch. A run never reads the key itself.
- For each session the command builds the brief once, with `build_brief(path, shrink_lm=<digest model>,
  log_dir=<log-dir>/digest)` and no `previous`. A brief that is an Abstain makes no model call. Otherwise the
  command runs the Digest call on the digest model once, and the Interpreter once for each adapter, on the
  interpreter model. `Interpreter(adapter=<name>, log_dir=<log-dir>/<name>, session_id=<stem>)` makes the
  rows. The adapters run one after the other. Within one adapter, `--concurrency` sets how many stops are in
  flight at the same time on the interpreter model, and no more than that number ever is. A successful
  digest is stored with `save_digest(<log-dir>, <stem>, digest)`.
- The command starts clean. A second run into the same folders replaces the files of the first, and rows
  never add up across runs. It exits with 0 when every session ends as an Interpretation or an Abstain. No
  exception escapes for a model error, and each Abstain is logged: one log record at level INFO or above
  for each Abstain, that holds the session id and the reason (also for an Abstain of the brief).
- Files. `<log-dir>/json/calls.jsonl` and `<log-dir>/chat/calls.jsonl` hold the rows of Triage, Pick, Fill,
  and Card for that adapter. `<log-dir>/digest/calls.jsonl` holds the rows of Digest and Shrink.
  `<out>/results.jsonl` holds one JSON object for each (adapter, session) with the keys `adapter`,
  `session`, `real` (true when a folder named `real` is on the path under the fixtures folder),
  `abstain_reason` (a str, or null), `abstain_detail` (a str, or null), and `steps` (the number of steps in
  the Proposal, 0 for an Abstain or an Interpretation with no Proposal). A brief Abstain also has a line, with
  the reason of the brief. `<out>/report.md` is the report.

The report is Markdown. Each `## ` heading below is one section. Each figure comes from the stored rows.
- `## Run`: the bullets `- sessions: N` and `- cost method: TEXT`. The cost method line holds the four list
  prices (0.15, 0.60, 0.45, 1.20, in USD for a million tokens). The estimate is characters divided by 4
  for the tokens. Input is `len(rendered_input)`, output is `len(raw_reply)`. The interpreter model price
  applies to the stages triage, pick, fill, and card. The digest model price applies to digest and shrink.
- `## Adapter: json` and `## Adapter: chat`, one for each adapter of the run, with these bullets:
  `- valid-output rate: 0.833 (10/12)`: the rows with `valid` true over all rows of the adapter.
  `- quote-found rate: 0.857 (6/7)`: over the steps of each Pick row with `valid` true, whose kind is not
  `ask_human`: how many have a quote that is in the stop brief. `n/a (0/0)` when there is no such step.
  `- rate-limit errors: N`: the rows whose `error` holds `RateLimitError` or `429`.
  and these subsections: `### Abstain reasons` (`- reason: count`, only counts above 0),
  `### Kinds picked` (`- kind: count` over the steps of each Pick row with `valid` true),
  `### Proposals by step count` (`- 1 step: n`, `- 2 steps: n`, `- 3 steps: n`, from `results.jsonl`),
  and `### Stages`, a table with the columns `stage`, `calls`, `chars sent`, `seconds`, and `cost USD`
  and one row for each of triage, pick, fill, and card. `calls` and `chars sent` are plain integers, with
  no separator. `chars sent` is the sum of `len(rendered_input)`,
  `seconds` is the sum of `seconds` with 3 decimals, and `cost USD` has 6 decimals.
- `## Digest model`: `- valid-output rate: ...`, `- rate-limit errors: N`, and a `### Stages` table with the
  rows digest and shrink.
- `## Failure drills`: the replay runs four drills on the first session that has a stop brief. It uses its own
  scripted models, never the patched factories, and it stores the rows in `<log-dir>/drills/calls.jsonl`.
  One bullet for each drill, `- <drill>: <reason>`: `rate_limit: model_error`, `malformed_json:
  invalid_output`, `empty_quote: quote_not_in_brief`, and `timeout: model_error`. Each ends as an Abstain, and
  each logs one record at level INFO or above with its reason.
- `## Go or no-go`: for the abort_if list of the goal file, one subsection `### abort_if N` (N from 1) with
  the bullets `- condition: <the text of the goal file>`, `- verdict: held|refuted|not measured`, and
  `- basis: TEXT`. `held` means that the abort condition is true. `refuted` means that it is false. Position
  N of the list picks the rule. Condition 1 uses only the sessions with `real` true. With none, it is
  `not measured`. Otherwise it is `held` when, for each adapter, fewer than half of the real sessions end with
  no Abstain, and no real session has a stored digest. Otherwise it is `refuted`. Its basis holds the tokens
  `json G/T`, `chat G/T` (for the adapters of the run), and `digest V/T`: G is the number of real sessions
  with no Abstain, V is the number with a stored digest, and T is the number of real sessions. Condition 2
  (the hook) and any condition after it is `not measured`, because the replay makes no hook call.
  Each basis is not empty.
"""
from __future__ import annotations

import json
import logging
import re
import threading
import time
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import pytest

from brief_support import FIXTURES, PRIORITY_DEV, require, simple
from digest_support import digest_reply
from interpret_support import PAYLOADS, card, dspy, fill, pick, triage
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
STAGES = ("triage", "pick", "fill", "card")
PRICES = {"interpreter": (0.15, 0.60), "digest": (0.45, 1.20)}
QUOTE_B = "Should I retry with a fixed delay or use backoff?"
DRILLS = {"rate_limit": "model_error", "malformed_json": "invalid_output", "empty_quote": "quote_not_in_brief",
          "timeout": "model_error"}


def quote_a(name: str) -> str:
    return f"Reply with fixed or backoff for {name}"


# ---- the sessions ------------------------------------------------------------

@dataclass(frozen=True)
class Plan:
    """What the stub model does for one session."""
    kinds: tuple[str, ...] = ("reply",)
    status: str = "waiting_answer"
    needs_human: bool = True
    fault: str | None = None  # at Pick: 429, malformed, empty_quote, or timeout
    digest_fault: str | None = None  # at Digest: 429 or malformed


PLANS = {
    "alpha": Plan(),  # one step and a card
    "bravo": Plan(kinds=("reply", "send_feedback"), needs_human=False),  # two steps
    "charlie": Plan(kinds=("reply", "send_feedback", "approve_gate")),  # three steps and a card
    "delta": Plan(fault="429", digest_fault="429"),
    "echo": Plan(fault="malformed", digest_fault="malformed"),
    "foxtrot": Plan(fault="empty_quote"),
    "golf": Plan(fault="timeout"),
    "hotel": Plan(status="done", needs_human=False),  # Triage alone ends the run
    "india": Plan(fault="429"),
    "zulu": Plan(),  # the file holds no agent reply, so the brief is an Abstain
}
# (abstain reason, steps) of each session of PLANS, the same for both adapters
OUTCOMES = {"alpha": (None, 1), "bravo": (None, 2), "charlie": (None, 3), "delta": ("model_error", 0),
            "echo": ("invalid_output", 0), "foxtrot": ("quote_not_in_brief", 0), "golf": ("model_error", 0),
            "hotel": (None, 0), "india": ("model_error", 0), "zulu": ("no_agent_reply", 0)}
CALLS_PER_STAGE = {"triage": 9, "pick": 8, "fill": 6, "card": 2}  # for each adapter, from PLANS


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
    """A model that answers by stage and by session, in the format of the adapter that is active.

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
        for stage, marker in (("fill", "`payload`"), ("pick", "`steps`"), ("shrink", "`short`"),
                              ("digest", "`digest`"), ("triage", "`needs_human`"), ("card", "`card`")):
            if marker in system:
                return stage
        raise AssertionError(f"the stub cannot tell the stage of this prompt: {system[:300]!r}")

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
            self.local.reply = self.reply(stage, name, last)
            return super().forward(prompt=prompt, messages=messages, **kwargs)
        finally:
            with self.lock:
                self.inflight -= 1

    def reply(self, stage: str, name: str, last: str) -> dict:
        plan = self.plans.get(name, Plan())
        fault = {"pick": plan.fault, "digest": plan.digest_fault}.get(stage)  # a fault hits one stage only
        if fault == "429":
            raise litellm.RateLimitError("429 Too Many Requests", llm_provider="openrouter", model=self.model)
        if fault == "timeout":
            raise TimeoutError("the model timed out")
        if fault == "malformed" and stage in ("pick", "digest"):
            return {"steps": "this is not JSON"} if stage == "pick" else {"digest": "this is not JSON"}
        if stage == "triage":
            return triage(status=plan.status, needs_human=plan.needs_human,
                          answer_class="none" if plan.status == "done" else "decide")
        if stage == "pick":
            quote = lambda kind: "" if fault == "empty_quote" else (quote_a(name) if kind == "reply" else QUOTE_B)  # noqa: E731
            return pick(*[(kind, quote(kind)) for kind in plan.kinds])
        if stage == "fill":
            return fill(**PAYLOADS[re.search(r"\[\[ ## kind ## \]\]\n(\w+)", last).group(1)])
        if stage == "card":
            return card()
        return digest_reply() if stage == "digest" else {"short": "tiny"}


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


def picked_steps(row: dict) -> list[dict]:
    """The steps of a valid Pick row, read from its raw reply in either adapter format."""
    reply = row["raw_reply"]
    try:
        value = json.loads(reply)["steps"]
    except (ValueError, KeyError, TypeError):
        match = re.search(r"\[\[ ## steps ## \]\]\s*(.*?)\s*(?:\[\[ ## completed|$)", reply, re.S)
        assert match, f"the Pick reply has no steps: {reply[:200]!r}"
        value = match.group(1)
    return json.loads(value) if isinstance(value, str) else value


def kinds_picked(rows: list[dict]) -> Counter:
    return Counter(step["kind"] for r in rows if r["stage"] == "pick" and r.get("valid") for step in picked_steps(r))


def brief_texts(root: Path) -> list[str]:
    brief = require("priority.brief")
    found = [brief.build_brief(path) for path in sorted(root.rglob("*.jsonl"))]
    return [b.for_model() for b in found if hasattr(b, "for_model")]


def quote_counts(rows: list[dict], texts: list[str]) -> tuple[int, int]:
    """(found, total) over the steps of the valid Pick rows whose kind is not ask_human."""
    steps = [s for r in rows if r["stage"] == "pick" and r.get("valid") for s in picked_steps(r)
             if s["kind"] != "ask_human"]
    return sum(1 for s in steps if s["evidence_quote"] and any(s["evidence_quote"] in t for t in texts)), len(steps)
