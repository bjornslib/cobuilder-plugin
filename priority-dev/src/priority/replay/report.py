"""The Markdown report of a replay. Every figure comes from the stored rows and the results."""
from __future__ import annotations

from collections import Counter

from priority.replay import figures, gate
from priority.replay.store import Measured


def _counts(title: str, counted: Counter, none: str = "- none") -> list[str]:
    return ["", f"### {title}", *([f"- {key}: {count}" for key, count in counted.items()] or [none])]


def run_section(measured: Measured) -> list[str]:
    (in_i, out_i), (in_d, out_d) = figures.PRICES["interpreter"], figures.PRICES["digest"]
    method = (f"tokens are estimated as characters divided by {figures.CHARS_PER_TOKEN}, with the input as "
              f"len(rendered_input) and the output as len(raw_reply). USD for a million tokens: the interpreter "
              f"model costs {in_i:.2f} in and {out_i:.2f} out, and the digest model costs {in_d:.2f} in and "
              f"{out_d:.2f} out")
    return ["## Run", "", f"- sessions: {measured.sessions}", f"- adapters: {', '.join(measured.adapters)}",
            f"- concurrency: {measured.concurrency}", f"- cost method: {method}"]


def adapter_section(measured: Measured, name: str) -> list[str]:
    rows = measured.rows[name]
    mine = [line for line in measured.results if line["adapter"] == name]
    found, total = figures.quote_found(rows, measured.texts)
    reasons = Counter(line["abstain_reason"] for line in mine if line["abstain_reason"])
    steps = Counter(line["steps"] for line in mine)
    by_steps = Counter({f"{n} step{'s' if n > 1 else ''}": steps[n] for n in (1, 2, 3)})
    return ["", f"## Adapter: {name}", "", f"- valid-output rate: {figures.valid_rate(rows)}",
            f"- quote-found rate: {figures.share(found, total)}",
            f"- rate-limit errors: {figures.rate_limit_errors(rows)}",
            *_counts("Abstain reasons", reasons), *_counts("Kinds picked", figures.kinds_picked(rows)),
            *_counts("Proposals by step count", by_steps), "", "### Stages",
            *figures.stage_table(rows, figures.INTERPRETER_STAGES, "interpreter")]


def digest_section(measured: Measured) -> list[str]:
    rows = measured.rows["digest"]
    return ["", "## Digest model", "", f"- valid-output rate: {figures.valid_rate(rows)}",
            f"- rate-limit errors: {figures.rate_limit_errors(rows)}", "", "### Stages",
            *figures.stage_table(rows, figures.DIGEST_STAGES, "digest")]


def drills_section(measured: Measured) -> list[str]:
    return ["", "## Failure drills", "",
            "Each drill runs on its own scripted model, and its rows are in the drills folder of the log folder.", "",
            *[f"- {name}: {reason}" for name, reason in measured.drills.items()]]


def build(measured: Measured) -> str:
    """The whole report. The go or no-go section is the last one."""
    lines = ["# Replay report", "", *run_section(measured)]
    for name in measured.adapters:
        lines += adapter_section(measured, name)
    lines += [*digest_section(measured), *drills_section(measured), "", *gate.section(measured)]
    return "\n".join(lines) + "\n"
