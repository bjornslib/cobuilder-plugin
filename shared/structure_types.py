"""The result shapes of the structure signals: a finding and a report.

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
    facts: dict[str, int | str]


@dataclass(frozen=True)
class Report:
    """The findings for one file, and the lines that say what was not analysed."""

    findings: tuple[Finding, ...]
    not_analysed: tuple[str, ...]
