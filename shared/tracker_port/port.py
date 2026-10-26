"""The tracker port: the operations every adapter implements, and its error classes."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Protocol

from .record import Capabilities, TrackerRecord


class NoAdapterError(Exception):
    """No adapter is configured, so the call refuses and writes no state (exit 2)."""


class AdapterError(Exception):
    """The adapter failed to read or write its tracker (exit 3)."""


class ArgumentError(Exception):
    """The caller passed a bad argument (exit 4)."""


class TrackerPort(Protocol):
    capabilities: Capabilities
    name: str

    def list_programs(self) -> list[TrackerRecord]: ...

    def list_epics(self, program: str | None = None) -> list[TrackerRecord]: ...

    def list_slices(self, epic: str | None = None) -> list[TrackerRecord]: ...

    def list_pull_requests(self) -> list[TrackerRecord]: ...

    def all_records(self) -> list[TrackerRecord]:
        """Every program, epic, slice, and pull request record, from one read."""

    def get_slice(self, id: str) -> TrackerRecord: ...

    def next_ready(self, kind: str = "slice", under: str | None = None) -> list[TrackerRecord]: ...

    def sync(self) -> None: ...

    def prepare(self) -> dict[str, bool]: ...

    def claim_slice(self, id: str, claimant: str) -> TrackerRecord: ...

    def claim_next(self, claimant: str, under: str | None = None) -> TrackerRecord | None: ...

    def set_program_stage(self, program: str, stage: str, plans_dir: Path | None = None) -> TrackerRecord: ...

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

    def skip_slice(self, id: str, reason: str, outcome: str = "skipped") -> TrackerRecord: ...

    def open_pull_request(self, ref: str, epic_ids: list[str]) -> TrackerRecord: ...

    def set_pull_request_state(self, ref: str, merged: bool) -> TrackerRecord: ...

    def seed_from_files(self, plans_dir: Path, dry_run: bool = False, refresh_envelope: bool = False) -> list[TrackerRecord]: ...

    def regenerate_status_files(self, program: str, plans_dir: Path) -> list[Path]: ...


class MappingMigrationPort(Protocol):
    """An optional operation. Only an adapter that once used an older mapping implements it.

    The fake and the files adapter keep a stub, so the CLI answers every adapter the same way.
    """

    def migrate_mapping(self, dry_run: bool = False, plans_dir: Path | None = None) -> dict[str, object]: ...


class StatusRepairPort(Protocol):
    def repair_status(
        self, dry_run: bool = False, plans_dir: Path | None = None, index: Path | None = None
    ) -> dict[str, Any]: ...
