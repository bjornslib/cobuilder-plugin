"""The stored digest of a session: one RunDigest file for each transcript stem, in `<log-dir>/digests/`."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from priority.interpreter import RunDigest

log = logging.getLogger("priority.digest_store")


def digest_path(log_dir: Path | str, session_id: str) -> Path:
    return Path(log_dir) / "digests" / f"{session_id}.json"


def save_digest(log_dir: Path | str, session_id: str, digest: RunDigest) -> Path:
    """Write the digest in place of an earlier one. A failed write leaves the earlier file as it was."""
    path = digest_path(log_dir, session_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(digest.model_dump_json(indent=2))
    os.replace(temporary, path)
    return path


def load_digest(log_dir: Path | str | None, session_id: str) -> RunDigest | None:
    """Return the stored digest of the session, or None. A file that cannot be used is logged and dropped."""
    if log_dir is None:
        return None
    path = digest_path(log_dir, session_id)
    if not path.exists():
        log.info("no stored digest for session %s at %s", session_id, path)
        return None
    try:
        return RunDigest.model_validate_json(path.read_text())
    except (OSError, ValueError) as error:  # a pydantic ValidationError is a ValueError
        log.warning("the stored digest %s cannot be used, so there is no previous run: %s", path, error)
        return None
