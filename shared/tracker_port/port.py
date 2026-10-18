"""The tracker port: the operations every adapter implements, and its error classes."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

from .record import Capabilities, TrackerRecord


class NoAdapterError(Exception):
    """No adapter is configured, so the call refuses and writes no state (exit 2)."""


class AdapterError(Exception):
    """The adapter failed to read or write its tracker (exit 3)."""


class ArgumentError(Exception):
    """The caller passed a bad argument (exit 4)."""


class TrackerPort(Protocol):
    capabilities: Capabilities

    def list_programs(self) -> list[TrackerRecord]: ...

    def list_epics(self, program: str | None = None) -> list[TrackerRecord]: ...

    def list_slices(self, epic: str | None = None) -> list[TrackerRecord]: ...

    def list_pull_requests(self) -> list[TrackerRecord]: ...

    def get_slice(self, id: str) -> TrackerRecord: ...

    def next_ready(self, kind: str = "slice", under: str | None = None) -> list[TrackerRecord]: ...

    def sync(self) -> None: ...

    def claim_slice(self, id: str, claimant: str) -> TrackerRecord: ...

    def set_program_stage(self, program: str, stage: str) -> TrackerRecord: ...

    def set_gate_value(self, program: str, gate: str, value: str) -> TrackerRecord: ...

    def set_epic_state(self, epic: str, state: str, branch: str | None = None) -> TrackerRecord: ...

    def set_slice_state(
        self,
        id: str,
        state: str,
        score: float | None = None,
        attempts: int | None = None,
    ) -> TrackerRecord: ...

    def record_attempt(self, id: str, score: float, note: str | None = None) -> TrackerRecord: ...

    def add_note(self, id: str, text: str) -> None: ...

    def escalate(self, id: str, score: float, reason: str) -> TrackerRecord: ...

    def open_pull_request(self, ref: str, epic_ids: list[str]) -> TrackerRecord: ...

    def set_pull_request_state(self, ref: str, merged: bool) -> TrackerRecord: ...

    def seed_from_files(self, plans_dir: Path) -> list[TrackerRecord]: ...
