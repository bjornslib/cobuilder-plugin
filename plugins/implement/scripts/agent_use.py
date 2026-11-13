"""The agent-use check for one slice of an implement plan.

A slice closes only after VALIDATE scores it. The check reads the newest
VALIDATE attempt file of the slice and the accept threshold in the rubrics
manifest. It returns "ok", or one line with the reason. It reads no session
content, and it writes nothing.

The attempt file has the format of plugins/implement/agents/validate.md.
Only the header line holds the overall score. The criterion lines have their
own scores, so the check does not read them.

verify_gate.py --plan <dir> --slice <N> prints the result of this check.
"""
from __future__ import annotations

import re
from pathlib import Path

import yaml

MANIFEST = "manifest.yaml"
# VALIDATE writes one verdict heading in each attempt file.
VERDICT_RE = re.compile(r"^## Validation Result\b.*?\b(PASS|FAIL|ESCALATION)\b", re.MULTILINE)
# The overall score is in the header line, which starts with "Slice:".
SCORE_RE = re.compile(r"^Slice:[^\n]*\bScore:\s*(\d+(?:\.\d+)?)", re.MULTILINE)


def newest_attempt(evidence: Path, slice_id: int) -> Path | None:
    """Return the attempt file with the highest attempt number, or None."""
    pattern = re.compile(rf"slice-{slice_id}-attempt-(\d+)\.md")
    found: list[tuple[int, Path]] = []
    for path in evidence.glob(f"slice-{slice_id}-attempt-*.md"):
        match = pattern.fullmatch(path.name)
        if match:
            found.append((int(match.group(1)), path))
    return max(found, key=lambda pair: pair[0])[1] if found else None


def accept_threshold(rubrics_dir: Path) -> float | None:
    """Return thresholds.accept from the manifest, or None when it has no value."""
    try:
        data = yaml.safe_load((rubrics_dir / MANIFEST).read_text(encoding="utf-8"))
        return float(data["thresholds"]["accept"])
    except (OSError, yaml.YAMLError, KeyError, TypeError, ValueError):
        return None


def check_slice(plan_dir: Path, rubrics_dir: Path, slice_id: int) -> str:
    """Return "ok" when the newest VALIDATE attempt passes, or one line with the reason.

    plan_dir names the plan folder. The check reads only rubrics_dir.
    """
    evidence = rubrics_dir / "evidence"
    attempt = newest_attempt(evidence, slice_id)
    if attempt is None:
        return f"slice {slice_id} has no VALIDATE attempt file in {evidence}"
    text = attempt.read_text(encoding="utf-8")
    verdict = VERDICT_RE.search(text)
    if verdict is None:
        return f"{attempt.name} has no validation verdict"
    if verdict.group(1) == "ESCALATION":
        return "ok"
    if verdict.group(1) != "PASS":
        return f"{attempt.name} has verdict {verdict.group(1)}, not PASS or ESCALATION"
    score = SCORE_RE.search(text)
    if score is None:
        return f"{attempt.name} has no overall score"
    threshold = accept_threshold(rubrics_dir)
    if threshold is None:
        return f"{rubrics_dir / MANIFEST} gives no thresholds.accept"
    if float(score.group(1)) < threshold:
        return f"{attempt.name} scores {score.group(1)}, below the accept threshold {threshold:g}"
    return "ok"
