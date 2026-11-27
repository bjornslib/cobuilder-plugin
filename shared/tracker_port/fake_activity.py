"""Slice attempt and note operations for FakeAdapter."""

from __future__ import annotations

from .fake_support import now
from .record import TrackerRecord


class _FakeActivityMixin:
    def record_attempt(self, id: str, score: float, note: str | None = None) -> TrackerRecord:
        attempts = self._record_of(id, "slice").envelope.get("attempts", 0)
        if note is not None:
            self.add_note(id, note)
        return self._update(id, "slice", envelope={"score": score, "attempts": attempts + 1})

    def add_note(self, id: str, text: str) -> None:
        self._record_of(id)
        self._notes.setdefault(id, []).append((now(), text))
        self._commit()

    def escalate(self, id: str, score: float, reason: str) -> TrackerRecord:
        record = self._update(id, "slice", envelope={"escalated": True, "score": score})
        self.add_note(id, f"escalated at score {score}: {reason}")
        return record
