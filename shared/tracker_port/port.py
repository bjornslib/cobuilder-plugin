"""The tracker port: the operations every adapter implements, and its error classes."""

from __future__ import annotations

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
