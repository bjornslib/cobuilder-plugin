"""The result shapes of the structure signals: findings, reports, and references.

This module imports no other structure module, so each of them may use it.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Finding:
    """One fact about one new file. The signal names the rule that fired."""

    signal: str
    path: str
    folder: str
    facts: dict[str, object]


@dataclass(frozen=True)
class Report:
    """The findings for one file, and the lines that say what was not analysed."""

    findings: tuple[Finding, ...]
    not_analysed: tuple[str, ...]


@dataclass(frozen=True)
class Boundary:
    """One boundary record: its context id, its path, and its dependency rules.

    Each forbidden pair holds the target and the why text of one rule.
    """

    id: str
    path: str
    allowed: tuple[str, ...]
    forbidden: tuple[tuple[str, str], ...]


@dataclass(frozen=True)
class Reference:
    """One outgoing reference of a file. The kind is import or path."""

    line: int
    text: str
    target: str
    kind: str
    in_comment: bool


@dataclass(frozen=True)
class Scan:
    """The references of one file, and the line that says why the file was not read."""

    references: tuple[Reference, ...]
    problem: str | None
