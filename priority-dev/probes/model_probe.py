"""Model probe: model calls on the end of one transcript.

The probe builds a complete stop brief from a Claude Code transcript, then calls one model.
The model returns five facts, one action kind, and an exact evidence quote.
The probe checks the reply and quote, then stores the call. A failed call or reply becomes an abstain.

    uv run python priority-dev/probes/model_probe.py <transcript.jsonl> [--model interpreter|digest]
        [--repeat N] [--log-dir DIR]
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
import logging
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import NamedTuple

if __name__ == "__main__":  # the root env has no priority or dspy, so re-run under the priority-dev project
    try:
        import priority, dspy  # noqa: E401,F401
    except ImportError:
        import os
        import sys
        here = Path(__file__).resolve()
        os.execvp("uv", ["uv", "run", "--project", str(here.parents[1]), "python", str(here), *sys.argv[1:]])

from priority.brief import Abstain, build_brief
from priority.config import load_nvidia_key

INTERPRETER_MODEL = "nvidia_nim/minimaxai/minimax-m3.1-flash"
DIGEST_MODEL = "nvidia_nim/minimaxai/minimax-m3.1-flash"
MODELS = {"interpreter": INTERPRETER_MODEL, "digest": DIGEST_MODEL}
JSON_MODE = {INTERPRETER_MODEL}  # verified against the NVIDIA endpoint on 2026-10-26
MAX_TOKENS = 3000  # a reasoning model spends tokens on its reasoning first, so a low cap cuts the reply text
PROBES = Path(__file__).resolve().parent
LOG_DIR = PROBES / "logs"
log = logging.getLogger("model_probe")

STATUS = ("done", "waiting_answer", "waiting_permission", "blocked", "failed", "continuing")
ANSWER_CLASS = ("none", "approve_continue", "pick_default", "provide_fact", "decide", "external_action")
RISK = ("low", "medium", "high")
PRIORITY = ("can wait", "soon", "now")
KINDS = ("reply", "continue", "continue_until", "approve_permission", "deny_permission", "pick_option",
         "approve_gate", "send_feedback", "interrupt", "ask_human", "snooze", "dismiss", "set_priority_hint")

INSTRUCTIONS = f"""You advise a developer who runs several coding agents at the same time. One agent has stopped.
Read the complete stop brief below, including the human ask, all run items, and the final reply.
Use tool inputs and results as evidence. Do not infer a result that the brief does not show.
Reply with one JSON object and nothing else.
Use these field definitions:
  "status": one of {list(STATUS)}. done means the work ended; continuing means more work is due; waiting_answer means a human answer is due; waiting_permission means permission is due; blocked means an external dependency stops work; failed means the work failed.
  "needs_human": true only when the next decision requires the developer; otherwise false.
  "answer_class": one of {list(ANSWER_CLASS)}. none means no answer is due; approve_continue means approve more work; pick_default means choose the proposed default; provide_fact means give missing information; decide means choose between alternatives; external_action means act outside the session.
  "risk": one of {list(RISK)}. low means a wrong action has a small, reversible effect; medium means it has a costly or wider effect; high means it can cause major or irreversible harm.
  "priority_hint": one of {list(PRIORITY)}. can wait means no prompt action is needed; soon means act in the current work period; now means act before the session continues.
  "kind": the one next step, one of {list(KINDS)}. reply sends text; continue sends one nudge; continue_until repeats nudges to a goal; approve_permission accepts a tool request; deny_permission rejects it; pick_option selects an offered option; approve_gate approves a CoBuilder gate; send_feedback returns a gate with notes; interrupt stops the turn; ask_human queues a human task; snooze hides the item temporarily; dismiss closes the item; set_priority_hint changes its proposed rank.
  "evidence_quote": exact words from the stop brief that support the action. Use "" for ask_human.
This probe accepts one action only. If a safe response needs a sequence, choose its first action.

STOP BRIEF
"""


def brief_text(transcript: Path) -> str:
    """Return the complete redacted stop brief, or raise when the brief must abstain."""
    brief = build_brief(transcript)
    if isinstance(brief, Abstain):
        raise ValueError(f"cannot build stop brief: {brief.reason}: {brief.detail}")
    return brief.for_model()


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



# ---- the model ------------------------------------------------------------------

def call_model(prompt: str, model: str = INTERPRETER_MODEL) -> dict:
    """Make one model call and return its text, reasoning, usage, and cost.

    DSPy can return the target JSON as a dict, so serialize it unless it is a text envelope.
    """
    import dspy

    options = {"response_format": {"type": "json_object"}} if model in JSON_MODE else {}
    lm = dspy.LM(model, api_key=load_nvidia_key(), temperature=0, max_tokens=MAX_TOKENS, timeout=120,
                 num_retries=0, cache=False, **options)
    out = lm(prompt)[0]
    if isinstance(out, dict) and "text" in out:
        text, reasoning = out["text"], out.get("reasoning_content")
    elif isinstance(out, dict):
        text, reasoning = json.dumps(out), None
    else:
        text, reasoning = out, None
    entry = lm.history[-1] if lm.history else {}
    return {"text": text, "reasoning_content": reasoning,
            "usage": entry.get("usage"), "cost": entry.get("cost")}


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
AGREEMENT_FIELDS = ("status", "needs_human", "answer_class", "risk", "priority_hint", "kind")


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


def _unpack(reply) -> tuple[str | None, str | None, dict]:
    """The text, the reasoning, and the extras of a model reply. The text is None for a shape that is not allowed."""
    if isinstance(reply, str):
        return reply, None, {}
    if isinstance(reply, dict) and isinstance(reply.get("text"), str):
        reasoning = reply.get("reasoning_content")
        extras = {key: reply.get(key) for key in ("usage", "cost")}
        return reply["text"], reasoning if isinstance(reasoning, str) else None, extras
    return None, None, {}


def _store(log_dir: Path, transcript: Path, model: str, prompt: str, started: float, **outcome) -> None:
    """Append one call record. The outcome holds raw_reply, reasoning, error, usage, and cost."""
    log_dir.mkdir(parents=True, exist_ok=True)
    clean = {key: None if value is None else redact(value) for key, value in outcome.items()
             if key in ("raw_reply", "reasoning", "error")}
    record = {"ts": datetime.now(timezone.utc).isoformat(), "transcript": transcript.name, "model_id": model,
              "prompt_hash": hashlib.sha256(prompt.encode()).hexdigest(), "prompt_chars": len(prompt),
              "latency_ms": round((time.monotonic() - started) * 1000), "prompt": prompt,
              "raw_reply": None, "reasoning": None, "error": None, **clean,
              "usage": outcome.get("usage"), "cost": outcome.get("cost")}
    with (log_dir / "calls.jsonl").open("a") as handle:
        handle.write(json.dumps(record, default=str) + "\n")


def _describe(exc: Exception) -> str:
    status = getattr(exc, "status_code", None)
    where = f" status={status}" if status else ""
    return redact(f"{type(exc).__name__}{where}: {exc}")


def run(transcript: Path, *, model: str = INTERPRETER_MODEL, log_dir: Path | None = None) -> ProbeResult:
    """One model call. Any failure ends as a ProbeResult with an abstain reason."""
    transcript, log_dir = Path(transcript), Path(log_dir) if log_dir else LOG_DIR
    built = build_brief(transcript)
    if isinstance(built, Abstain):
        return ProbeResult(abstain_reason=built.reason, abstain_detail=built.detail)
    brief = built.for_model()
    prompt = INSTRUCTIONS + brief
    started = time.monotonic()
    try:
        reply = call_model(prompt, model)
    except Exception as exc:  # any failure of the call is an abstain, never a crash
        reason = "model_timeout" if isinstance(exc, TimeoutError) or "Timeout" in type(exc).__name__ else "model_error"
        detail = _describe(exc)
        log.warning("%s: %s", reason, detail)
        _store(log_dir, transcript, model, prompt, started, error=detail)
        return ProbeResult(abstain_reason=reason, abstain_detail=detail)
    text, reasoning, extras = _unpack(reply)
    _store(log_dir, transcript, model, prompt, started, raw_reply=text, reasoning=reasoning, **extras)
    if text is None:
        detail = f"the model reply is {type(reply).__name__}, not text or a dict with text"
        log.info("invalid_output: %s", detail)
        return ProbeResult(abstain_reason="invalid_output", abstain_detail=detail)
    result = check(text, brief)
    if result.abstain_reason:
        log.info("%s: %s", result.abstain_reason, result.abstain_detail)
    return result


def repeat(transcript: Path, n: int, *, model: str = INTERPRETER_MODEL, log_dir: Path | None = None) -> list[ProbeResult]:
    """n calls on one transcript. A failed call stays in the list as an abstain."""
    return [run(transcript, model=model, log_dir=log_dir) for _ in range(n)]


def agreement(results: list[ProbeResult]) -> dict[str, float]:
    """For the five facts and the kind, the share of results that hold the most common value."""
    shares = {}
    for field in AGREEMENT_FIELDS:
        values = [("abstain" if r.abstain_reason else getattr(r, field)) for r in results]
        shares[field] = Counter(values).most_common(1)[0][1] / len(values)
    return shares


def _print_result(result: ProbeResult) -> None:
    for name in PRINTED:
        print(f"{name}: {getattr(result, name)}")
    if result.abstain_reason:
        print(f"abstain_reason: {result.abstain_reason}")
        print(f"abstain_detail: {result.abstain_detail}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("transcript", type=Path)
    parser.add_argument("--model", choices=sorted(MODELS), default="interpreter")
    parser.add_argument("--repeat", type=int, default=1, metavar="N")
    parser.add_argument("--log-dir", type=Path, default=None)
    args = parser.parse_args(argv)
    if args.repeat < 1:
        parser.error("--repeat must be 1 or more")
    logging.basicConfig(level=logging.INFO)
    results = repeat(args.transcript, args.repeat, model=MODELS[args.model], log_dir=args.log_dir)
    for number, result in enumerate(results, 1):
        if args.repeat > 1:
            print(f"run {number} of {args.repeat}")
        _print_result(result)
    if args.repeat > 1:
        for field, share in agreement(results).items():
            print(f"agreement: {field}={share:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
