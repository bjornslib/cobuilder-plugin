"""Plan the status repair: a pure function from records and evidence to four lists."""

from __future__ import annotations

from _bundle_meta import DESIGN_STAGES

from .program_state import CLOSING_STAGES
from .record import TrackerRecord

LIVE_STAGES = frozenset({"approved", "review", "backlog", "decided"})
_KIND_ORDER = {"program": 0, "epic": 1, "slice": 2}


def _design_of(record_id: str) -> str:
    return record_id.split("/", 1)[0]


def _entry(rid: str, kind: str, action: str, rule: str, detail: str, stage: str | None = None) -> dict:
    entry = {"id": rid, "kind": kind, "action": action, "rule": rule, "detail": detail}
    if stage is not None:
        entry["stage"] = stage
    return entry


def _stage_of(program: TrackerRecord | None, legacy: str | None) -> tuple[str | None, str]:
    """The design stage and its source, tracker first."""
    held = program.envelope.get("stage") if program else None
    if held in DESIGN_STAGES:
        return held, "the tracker"
    if legacy in DESIGN_STAGES:
        return legacy, "goal.json"
    return None, ""


def _closes(records: list[TrackerRecord], design: str, stage: str, source: str) -> list[dict]:
    detail = f"design {design} is at {stage}, from {source}"
    epics = {r.id for r in records if r.kind == "epic" and _design_of(r.id) == design}
    out = []
    for r in records:
        if r.lifecycle == "closed":
            continue
        if (r.kind == "epic" and r.id in epics) or (r.kind == "slice" and r.parent in epics):
            out.append(_entry(r.id, r.kind, "close", "stage-closes", detail))
    return out


def _merged_rule(epic: TrackerRecord, merged: set[str], pr_tracked: set[str]) -> str | None:
    if epic.id in pr_tracked:
        return "pr-record-merged"
    return "index-merged-pr" if epic.id in merged else None


def _stageless(records, design, program, merged, pr_tracked, out) -> None:
    epics = [r for r in records if r.kind == "epic" and _design_of(r.id) == design and r.lifecycle != "closed"]
    for epic in epics:
        rule = _merged_rule(epic, merged, pr_tracked)
        if rule:
            out["changes"].append(_entry(epic.id, "epic", "close", rule, f"merged pull request for {epic.id}"))
        elif epic.envelope.get("branch"):
            out["unchecked"].append(_entry(epic.id, "epic", "unchecked", "no-pr-evidence",
                                           "branch set, no pull request evidence"))
    if program is not None:
        out["unresolved"].append(_entry(design, "program", "report", "no-design-no-stage",
                                        f"{len(epics)} open epics"))


def _plan_design(records, design, program, legacy, merged, pr_tracked, out) -> None:
    if program is None:
        out["changes"].append(_entry(design, "program", "create", "create-from-design",
                                     f"legacy goal stage {legacy}", legacy))
    elif program.envelope.get("stage") not in DESIGN_STAGES and legacy in DESIGN_STAGES:
        out["changes"].append(_entry(design, "program", "stamp", "stamp-from-goal",
                                     f"legacy goal stage {legacy}", legacy))
    stage, source = _stage_of(program, legacy)
    if stage is None:
        _stageless(records, design, program, merged, pr_tracked, out)
    elif stage in CLOSING_STAGES:
        out["changes"].extend(_closes(records, design, stage, source))
    elif stage in LIVE_STAGES:
        for r in records:
            if r.kind == "epic" and r.lifecycle != "closed" and _design_of(r.id) == design and r.id in merged:
                out["holds"].append(_entry(r.id, "epic", "hold", "live-stage-with-merged-pr",
                                           f"design {design} is at {stage}"))


def plan_repair(records: list[TrackerRecord], legacy_stages: dict[str, str], merged: set[str]) -> dict:
    """Return changes, holds, unresolved, and unchecked. Reads nothing and writes nothing."""
    programs = {r.id: r for r in records if r.kind == "program"}
    pr_tracked = {e for r in records if r.kind == "pr" and r.lifecycle == "closed" for e in r.tracks}
    out: dict[str, list[dict]] = {"changes": [], "holds": [], "unresolved": [], "unchecked": []}
    for design in sorted(set(programs) | set(legacy_stages)):
        _plan_design(records, design, programs.get(design), legacy_stages.get(design),
                     merged, pr_tracked, out)
    for items in out.values():
        items.sort(key=lambda e: (_KIND_ORDER[e["kind"]], e["id"]))
    return out
