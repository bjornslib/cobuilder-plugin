"""Compact stop briefs: one digest per stop, cached on disk, read by the task model in place of the brief."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from priority.brief import StopBrief

if TYPE_CHECKING:
    from priority.interpreter import RunDigest


@dataclass(frozen=True)
class CompactBrief:
    """The compact text of one stop. The task model reads this text in place of the full brief."""

    text: str

    def for_model(self) -> str:
        return self.text


class CompactDigests:
    """Digest each stop once, cache the digest by session and stop, and build compact briefs."""

    def __init__(self, digest_dir: Path | str, log_dir: Path | str | None = None) -> None:
        self.digest_dir = Path(digest_dir)
        self.log_dir = log_dir
        self.fallbacks = 0
        self._run = None

    def brief_for(self, brief: StopBrief, session_id: str, stop: str) -> CompactBrief | StopBrief:
        """The compact brief of a stop, or the full brief when the digest model abstains."""
        digest = self._cached(session_id, stop)
        if digest is None:
            digest = self._digest(brief, session_id, stop)
        if digest is None:
            self.fallbacks += 1
            return brief
        return CompactBrief(brief.for_model_compact(digest))

    def _path(self, session_id: str, stop: str) -> Path:
        return self.digest_dir / f"{session_id}-{stop}.json"

    def _cached(self, session_id: str, stop: str) -> RunDigest | None:
        from priority.interpreter import RunDigest  # lazy: only a compact run needs dspy

        path = self._path(session_id, stop)
        if not path.exists():
            return None
        try:
            return RunDigest.model_validate_json(path.read_text())
        except ValueError:  # an unusable file is digested again, and the new digest overwrites it
            return None

    def _digest(self, brief: StopBrief, session_id: str, stop: str) -> RunDigest | None:
        from priority import interpreter  # lazy: only a compact run needs dspy and the key

        if self._run is None:
            self._run = interpreter.DigestRun(interpreter.digest_lm(), log_dir=self.log_dir)
        result = self._run(brief)
        if not isinstance(result, interpreter.RunDigest):
            return None
        self.digest_dir.mkdir(parents=True, exist_ok=True)
        self._path(session_id, stop).write_text(result.model_dump_json(indent=2))
        return result
