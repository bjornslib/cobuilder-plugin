"""Structure coaching text for habit_coach.py.

The runner reads the structure findings of one written file. It fills the approved
templates in shared/structure-messages.json. A session record keeps the finding keys
that a session showed. A second write in the same session then gives no repeat.
The runner uses the standard library only, so the coach can run it without uv.
"""
from __future__ import annotations

import contextlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))
import structure_signals  # noqa: E402

MESSAGES_PATH = Path(__file__).resolve().parent.parent / "shared" / "structure-messages.json"
RECORD_PREFIX = "cobuilder-coach-"
RECORD_NAME_MAX = 100
NONE_TEXT = "none"


class _Names(dict):
    """The names of one template. A name with no value reads as none."""

    def __missing__(self, key: str) -> str:
        return NONE_TEXT


def _shown(value: object) -> object:
    """Return a fact as the text shows it. A None or empty fact reads as none."""
    return NONE_TEXT if value is None or value == "" else value


def _fill(template: str, names: dict[str, object]) -> str:
    """Return the template with each name filled in."""
    return template.format_map(_Names({name: _shown(value) for name, value in names.items()}))


def load_messages(path: Path) -> dict[str, str]:
    """Return the message templates of the JSON file at path."""
    return json.loads(Path(path).read_text(encoding="utf-8"))


def render(finding: structure_signals.Finding, messages: dict[str, str]) -> str:
    """Return the text of one finding, filled from the template of its signal."""
    names = {**finding.facts, "path": finding.path, "folder": finding.folder}
    return _fill(messages[finding.signal], names)


def _finding_key(finding: structure_signals.Finding) -> str:
    """Return the key of one finding in the session record. The keys follow epic E2, step B3."""
    if finding.signal == "crowded-folder":
        return f"crowded-folder|{finding.folder}"
    if finding.signal == "name-stem-cluster":
        return f"name-stem-cluster|{finding.folder}|{finding.facts['stem']}"
    if finding.signal == "boundary-edge":
        return f"boundary-edge|{finding.path}|{_shown(finding.facts.get('to_context'))}"
    # A generic name keys by its path.
    return f"{finding.signal}|{finding.path}"


def _record_path(session_id: str | None) -> Path | None:
    """Return the session record file, or None when the session has no id.

    A session id that is not a string counts as no id. Each character outside letters,
    digits, underscore, and hyphen becomes an underscore. The record then stays in the
    temp folder, whatever the id holds.
    """
    if not isinstance(session_id, str) or not session_id:
        return None
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", session_id)[:RECORD_NAME_MAX]
    return Path(tempfile.gettempdir()) / f"{RECORD_PREFIX}{safe}.json"


def seen_keys(session_id: str | None) -> set[str]:
    """Return the finding keys in the session record. An absent or bad record gives none."""
    record = _record_path(session_id)
    if record is None:
        return set()
    try:
        data = json.loads(record.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return set()
    if not isinstance(data, list) or not all(isinstance(key, str) for key in data):
        return set()
    return set(data)


def remember(session_id: str | None, keys: set[str]) -> None:
    """Replace the session record with the finding keys.

    The keys go to a temp file in the same folder first. Then os.replace moves that file
    onto the record. A write error does not raise, so the text still goes out.
    """
    record = _record_path(session_id)
    if record is None:
        return
    try:
        handle, temp = tempfile.mkstemp(
            dir=str(record.parent), prefix=RECORD_PREFIX, suffix=".tmp"
        )
    except OSError:
        return
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            json.dump(sorted(keys), stream)
        os.replace(temp, record)
    except OSError:
        with contextlib.suppress(OSError):
            os.unlink(temp)


def _findings(path: str) -> list[structure_signals.Finding]:
    """Return the structure findings of one written file, with the config of its repo."""
    folder = Path(os.path.dirname(os.path.abspath(path)))
    config = structure_signals.load_config(folder)
    return list(structure_signals.signals_for(path, folder, config).findings)


def _text_for(path: str, session_id: str | None) -> tuple[int, str]:
    """Return (1, text) for the findings that the session did not show, or (0, "").

    A signal with no template gives no text.
    """
    messages = load_messages(MESSAGES_PATH)
    seen = seen_keys(session_id)
    unseen = [
        item for item in _findings(path)
        if item.signal in messages and _finding_key(item) not in seen
    ]
    if not unseen:
        return 0, ""
    parts = [_fill(messages["header"], {"path": unseen[0].path})]
    parts.extend(render(item, messages) for item in unseen)
    remember(session_id, seen | {_finding_key(item) for item in unseen})
    return 1, "\n\n".join(parts)


def run(path: str, session_id: str | None) -> tuple[int, str]:
    """Return (1, text) for the findings of one write that the session did not show.

    Return (0, "") when none is left, and also after any error.
    The coach never blocks a write.
    """
    try:
        return _text_for(path, session_id)
    except Exception:  # noqa: BLE001 - the hook must never block a write
        return 0, ""
