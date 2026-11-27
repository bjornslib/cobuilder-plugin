"""Load and validate the confirmed stop labels of the fixture set.

Each stop label holds the fields the engineer confirmed: the fact fields,
the ordered steps (0 to 3 kinds, where a list at one position accepts any
one of those kinds), and the confirmation stamp. A label may also hold the
reference payload `payloads` and its `priority` (P1, P2, or P3), which the
loader keeps. An unconfirmed stop never counts, so a missing stamp is an
error, not a default.
"""
from __future__ import annotations

import json
from pathlib import Path

LABEL_FIELDS = ("status", "needs_human", "answer_class", "risk",
                "priority_hint", "steps", "ambiguous", "why",
                "confirmed_by", "confirmed_on")

# The step kinds a label may name: ACTION_KINDS in
# priority/interpreter/models.py, plus set_priority_hint, which labels
# confirmed before slice 21 may name. The list stays local so that loading
# labels needs no model dependency.
STEP_KINDS = ("reply", "continue", "continue_until", "approve_permission",
              "deny_permission", "pick_option", "approve_gate",
              "send_feedback", "interrupt", "ask_human", "snooze",
              "dismiss", "set_priority_hint", "notify")

MAX_STEPS = 3
PRIORITIES = ("P1", "P2", "P3")


def _fail(session_id: str, key: str, reason: str) -> ValueError:
    """Build the label error, always naming the session and the stop."""
    return ValueError(f"bad label for session {session_id} stop {key}: {reason}")


def _check_kind(kind: object, session_id: str, key: str) -> None:
    """Reject one step kind name when it is not a known action kind."""
    if not isinstance(kind, str) or kind not in STEP_KINDS:
        raise _fail(session_id, key, f"unknown step kind {kind!r}")


def _check_steps(steps: object, session_id: str, key: str) -> None:
    """Reject a steps list that is not 0 to 3 known kinds."""
    if not isinstance(steps, list) or len(steps) > MAX_STEPS:
        raise _fail(session_id, key,
                    f"steps must hold 0 to {MAX_STEPS} kinds, got {steps!r}")
    for entry in steps:
        if isinstance(entry, list):
            if not entry:
                raise _fail(session_id, key, "steps holds an empty kind list")
            for kind in entry:
                _check_kind(kind, session_id, key)
        else:
            _check_kind(entry, session_id, key)


def _check_label(session_id: str, key: str, label: object) -> dict:
    """Validate one stop label and return it with exactly the label fields,
    plus the reference payload `payloads` and its `priority` when the label holds them."""
    if not isinstance(label, dict):
        raise _fail(session_id, key, f"label must be an object, got {label!r}")
    for field in LABEL_FIELDS:
        if field not in label or label[field] in (None, ""):
            raise _fail(session_id, key, f"missing {field}")
    _check_steps(label["steps"], session_id, key)
    kept = {field: label[field] for field in LABEL_FIELDS}
    for field in ("payloads", "priority"):
        if field in label:
            kept[field] = label[field]
    if "priority" in kept and kept["priority"] not in PRIORITIES:
        raise _fail(session_id, key, f"priority must be one of {', '.join(PRIORITIES)}, got {kept['priority']!r}")
    return kept


def load_labels(path: str | Path) -> dict[str, dict[str, dict]]:
    """Read the confirmed labels file. Return session id to stop key to label."""
    doc = json.loads(Path(path).read_text())
    sessions = doc.get("sessions", {})
    out: dict[str, dict[str, dict]] = {}
    for session_id, per_session in sessions.items():
        stops = per_session.get("stops", {}) if isinstance(per_session, dict) else {}
        out[session_id] = {
            key: _check_label(session_id, key, label)
            for key, label in stops.items()
        }
    return out


def match_session_key(labels_by_session: dict, session_id: str) -> str | None:
    """Match one manifest session to its labels key, by full id or short prefix.

    The manifest keys sessions by full id while the confirmed labels may
    key them by short prefix, or the reverse. An exact key wins; else the
    one labels key sharing a prefix with the session wins. Several sharing
    keys raise naming the session, so each caller reports it the same way.
    Return None when no key matches, so the caller reports missing labels.
    """
    if session_id in labels_by_session:
        return session_id
    matches = [key for key in labels_by_session
               if key.startswith(session_id) or session_id.startswith(key)]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        raise ValueError(f"session {session_id} matches several "
                         f"labels keys: {', '.join(sorted(matches))}")
    return None
