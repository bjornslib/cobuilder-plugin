"""The shape of the evidence packet, which shared/structure_evidence.py writes for VALIDATE.

The packet holds facts and no verdict. The functions here build its keys, so the entry script
and its analysis give one shape. The keys are schema, base, files, findings, evidence, and
not_analysed.
"""
from __future__ import annotations

from typing import Any

from .vocabulary import empty_leads


def _packet(
    base: str | None,
    files: dict[str, list[str]],
    findings: list[dict[str, Any]],
    evidence: dict[str, Any],
    notes: list[str],
) -> dict[str, Any]:
    """Return the packet with the keys of the packet contract. Each line of not_analysed is once."""
    return {
        "schema": 1,
        "base": base,
        "files": files,
        "findings": findings,
        "evidence": evidence,
        "not_analysed": list(dict.fromkeys(notes)),
    }


def _files(added: list[str], modified: list[str]) -> dict[str, list[str]]:
    """Return the file lists of the packet."""
    return {"added": list(added), "modified": list(modified)}


def _evidence(
    rules: list[dict[str, str]],
    moves: list[dict[str, str]],
    locality: list[dict[str, Any]] | None = None,
    vocabulary: dict[str, list[dict[str, Any]]] | None = None,
) -> dict[str, Any]:
    """Return the evidence block. Each list of leads is empty when no lead is analysed."""
    return {
        "boundary_rules_for_agent": list(rules),
        "vocabulary": vocabulary or empty_leads(),
        "moves": list(moves),
        "consumer_locality": list(locality or []),
    }
