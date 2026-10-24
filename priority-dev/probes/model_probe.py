"""Model probe: one Nemo call on the end of one transcript.

The probe reads a Claude Code transcript, redacts it, and builds a short stop brief. It makes one
model call. The model returns the five facts, a kind, and an exact quote. Code checks the reply and
the quote, and it stores the call. A failed call or a bad reply ends as an abstain, not as an error.

    uv run --project priority-dev python priority-dev/probes/model_probe.py <transcript.jsonl> [--log-dir DIR]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import logging
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import NamedTuple

from priority.config import load_key

MODEL_ID = "openrouter/mistralai/mistral-nemo"
PROBES = Path(__file__).resolve().parent
LOG_DIR = PROBES / "logs"
MAX_LINES, CLIP_CHARS = 40, 300  # the run in the brief: the last 40 lines, each clipped
log = logging.getLogger("model_probe")

STATUS = ("done", "waiting_answer", "waiting_permission", "blocked", "failed", "continuing")
ANSWER_CLASS = ("none", "approve_continue", "pick_default", "provide_fact", "decide", "external_action")
RISK = ("low", "medium", "high")
PRIORITY = ("can wait", "soon", "now")
KINDS = ("reply", "continue", "continue_until", "approve_permission", "deny_permission", "pick_option",
         "approve_gate", "send_feedback", "interrupt", "ask_human", "snooze", "dismiss", "set_priority_hint")

INSTRUCTIONS = f"""A coding agent stopped. Read the stop brief below. Reply with one JSON object and nothing else.
The object has these keys:
  "status": one of {list(STATUS)}
  "needs_human": true when only the human can give the answer, else false
  "answer_class": one of {list(ANSWER_CLASS)}
  "risk": one of {list(RISK)}, the cost of a wrong answer
  "priority_hint": one of {list(PRIORITY)}, how soon the human should look
  "kind": the next step, one of {list(KINDS)}
  "evidence_quote": words copied exactly from the stop brief that support the kind. Use "" for ask_human.

STOP BRIEF
"""

# ---- redaction ------------------------------------------------------------------

_SECRET = re.compile("|".join((
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----",
    r"sk-[A-Za-z0-9_-]{20,}", r"gh[pousr]_[A-Za-z0-9]{20,}", r"github_pat_[A-Za-z0-9_]{20,}",
    r"AKIA[0-9A-Z]{16}", r"xox[abprs]-[A-Za-z0-9-]{10,}", r"AIza[0-9A-Za-z_-]{35}",
    r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}",
    r"(?i:Bearer)\s+[A-Za-z0-9._~+/=-]{20,}", r"(?<=://)[^/\s:@\"'\\]+:[^/\s@\"'\\]+@",
)), re.DOTALL)
_ASSIGNED = re.compile(r"""(?i)(\b[A-Za-z0-9_]*(?:api[_-]?key|secret|token|passw(?:or)?d|credential)[A-Za-z0-9_]*"?\s*[=:]\s*["']?)"""
                       r"""([^\s"'\\,;]{12,})""")


def redact(text: str) -> str:
    """Replace each secret in the text with [REDACTED]."""
    return _ASSIGNED.sub(r"\1[REDACTED]", _SECRET.sub("[REDACTED]", text))


# ---- the stop brief -------------------------------------------------------------

def _records(path: Path) -> list[dict]:
    out = []
    for line in path.read_text(errors="replace").splitlines():
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        if rec.get("type") in ("user", "assistant") and not rec.get("isSidechain"):
            out.append(rec)
    return out


def _blocks(rec: dict) -> list[dict]:
    content = rec.get("message", {}).get("content")
    if isinstance(content, str):
        return [{"type": "text", "text": content}]
    return [b for b in content if isinstance(b, dict)] if isinstance(content, list) else []


def _is_ask(rec: dict) -> bool:
    blocks = _blocks(rec)
    return (rec["type"] == "user" and not rec.get("isMeta") and bool(blocks)
            and all(b.get("type") == "text" for b in blocks) and any(b.get("text", "").strip() for b in blocks))


def _flat(value) -> str:
    if isinstance(value, list):
        value = " ".join(b.get("text", "") for b in value if isinstance(b, dict))
    return " ".join(str(value).split())


def _clip(text: str) -> str:
    return text if len(text) <= CLIP_CHARS else text[:CLIP_CHARS] + "..."


def _line(block: dict) -> str | None:
    kind = block.get("type")
    if kind == "text":
        return f"[agent] {_clip(_flat(block['text']))}"
    if kind == "tool_use":
        return f"[tool {block.get('name')}] {_clip(_flat(json.dumps(block.get('input'))))}"
    if kind == "tool_result":
        return f"[result] {_clip(_flat(block.get('content', '')))}"
    return None


def brief_text(transcript: Path) -> str:
    """The redacted stop brief: the ask, the end of the run, and the whole final reply."""
    recs = _records(transcript)
    ends = [i for i, r in enumerate(recs) if r["type"] == "assistant"]
    if not ends:
        raise ValueError(f"no assistant turn in {transcript}")
    msg_id = recs[ends[-1]].get("message", {}).get("id")
    start = ends[-1]
    while start > 0 and recs[start - 1]["type"] == "assistant" and recs[start - 1].get("message", {}).get("id") == msg_id:
        start -= 1
    final = "\n".join(b["text"] for r in recs[start:] if r["type"] == "assistant" for b in _blocks(r)
                      if b.get("type") == "text")
    asks = [i for i in range(start) if _is_ask(recs[i])]
    first = asks[-1] if asks else -1
    ask = "\n".join(b["text"] for b in _blocks(recs[first])) if asks else ""
    run = [t for r in recs[first + 1:start] for b in _blocks(r) if (t := _line(b))]
    parts = ["ASK:", ask, "RUN (the last lines, clipped):", *run[-MAX_LINES:], "FINAL REPLY:", final]
    return redact("\n".join(parts))


# ---- the model ------------------------------------------------------------------

def call_model(prompt: str) -> str:
    """The one function that reaches the model. It makes no retry, so a 429 shows in the call log."""
    import dspy

    lm = dspy.LM(MODEL_ID, api_key=load_key(), temperature=0, max_tokens=500, timeout=60, num_retries=0,
                 cache=False, response_format={"type": "json_object"})
    return lm(prompt)[0]


# ---- the check ------------------------------------------------------------------

class ProbeResult(NamedTuple):
    status: str | None = None
    needs_human: bool | None = None
    answer_class: str | None = None
    risk: str | None = None
    priority_hint: str | None = None
    kind: str | None = None
    quote: str = ""
    quote_in_text: bool = False
    abstain_reason: str | None = None
    abstain_detail: str = ""


FACT_VALUES = {"status": STATUS, "answer_class": ANSWER_CLASS, "risk": RISK, "priority_hint": PRIORITY}
PRINTED = ("status", "needs_human", "answer_class", "risk", "priority_hint", "kind", "quote", "quote_in_text")


def _problem(data) -> str | None:
    """The first reason that the reply does not parse into the type, or None."""
    if not isinstance(data, dict):
        return "the reply is not a JSON object"
    for key in (*FACT_VALUES, "needs_human", "kind", "evidence_quote"):
        if key not in data:
            return f"the key {key} is missing"
    for key, allowed in FACT_VALUES.items():
        if data[key] not in allowed:
            return f"{key} is {data[key]!r}, not one of {list(allowed)}"
    if not isinstance(data["needs_human"], bool):
        return "needs_human is not true or false"
    if not isinstance(data["kind"], str) or not isinstance(data["evidence_quote"], str):
        return "kind and evidence_quote must be text"
    return None


def check(raw: str, brief: str) -> ProbeResult:
    """Parse the reply, check the kind, and check the quote against the brief."""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        return ProbeResult(abstain_reason="invalid_output", abstain_detail=f"the reply is not JSON: {exc}")
    if (problem := _problem(data)) is not None:
        return ProbeResult(abstain_reason="invalid_output", abstain_detail=problem)
    quote = redact(data["evidence_quote"])
    found = bool(data["evidence_quote"]) and data["evidence_quote"] in brief
    facts = {key: data[key] for key in (*FACT_VALUES, "needs_human", "kind")}
    result = ProbeResult(**facts, quote=quote, quote_in_text=found)
    if data["kind"] not in KINDS:
        return result._replace(abstain_reason="kind_not_allowed", abstain_detail=data["kind"])
    if data["kind"] != "ask_human" and not found:
        detail = f"the quote is not in the stop brief: {quote[:80]}"
        return result._replace(abstain_reason="quote_not_in_brief", abstain_detail=detail)
    return result


def _store(log_dir: Path, transcript: Path, prompt: str, raw: str | None, error: str | None, started: float) -> None:
    log_dir.mkdir(parents=True, exist_ok=True)
    record = {"ts": datetime.now(timezone.utc).isoformat(), "transcript": transcript.name, "model_id": MODEL_ID,
              "prompt_hash": hashlib.sha256(prompt.encode()).hexdigest(), "prompt_chars": len(prompt),
              "latency_ms": round((time.monotonic() - started) * 1000),
              "raw_reply": None if raw is None else redact(raw), "error": error}
    with (log_dir / "calls.jsonl").open("a") as handle:
        handle.write(json.dumps(record) + "\n")


def _describe(exc: Exception) -> str:
    status = getattr(exc, "status_code", None)
    where = f" status={status}" if status else ""
    return redact(f"{type(exc).__name__}{where}: {exc}")


def run(transcript: Path, *, log_dir: Path | None = None) -> ProbeResult:
    """One model call. Any failure ends as a ProbeResult with an abstain reason."""
    transcript, log_dir = Path(transcript), Path(log_dir) if log_dir else LOG_DIR
    brief = brief_text(transcript)
    prompt = INSTRUCTIONS + brief
    started = time.monotonic()
    try:
        raw = call_model(prompt)
    except Exception as exc:  # any failure of the call is an abstain, never a crash
        reason = "model_timeout" if isinstance(exc, TimeoutError) or "Timeout" in type(exc).__name__ else "model_error"
        detail = _describe(exc)
        log.warning("%s: %s", reason, detail)
        _store(log_dir, transcript, prompt, None, detail, started)
        return ProbeResult(abstain_reason=reason, abstain_detail=detail)
    _store(log_dir, transcript, prompt, raw, None, started)
    result = check(raw, brief)
    if result.abstain_reason:
        log.info("%s: %s", result.abstain_reason, result.abstain_detail)
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("transcript", type=Path)
    parser.add_argument("--log-dir", type=Path, default=None)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO)
    result = run(args.transcript, log_dir=args.log_dir)
    for name in PRINTED:
        print(f"{name}: {getattr(result, name)}")
    if result.abstain_reason:
        print(f"abstain_reason: {result.abstain_reason}")
        print(f"abstain_detail: {result.abstain_detail}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
