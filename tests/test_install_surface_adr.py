"""Slice 1 (E1) tests: ADR-0025 exists and documents the narrowed
install-surface rule, and CLAUDE.md cites it and drops the old blanket
"no plugin ships a hook" claim.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ADR_DIR = REPO_ROOT / "docs" / "architecture" / "adr"
CLAUDE_MD = REPO_ROOT / "CLAUDE.md"


def _find_adr_0025() -> Path | None:
    matches = sorted(ADR_DIR.glob("ADR-0025-*.md"))
    return matches[0] if matches else None


def test_adr_0025_exists() -> None:
    adr = _find_adr_0025()
    assert adr is not None, (
        "expected a docs/architecture/adr/ADR-0025-*.md file recording the "
        "narrowed install-surface rule, found none"
    )


def test_adr_0025_mentions_the_required_terms() -> None:
    adr = _find_adr_0025()
    assert adr is not None, "ADR-0025 must exist before its content can be checked"
    text = adr.read_text().lower()
    required_terms = ["implement", "agents", "hooks", "habit-hooks", "mcp"]
    missing = [term for term in required_terms if term not in text]
    assert not missing, (
        f"ADR-0025 ({adr.name}) is missing required terms: {missing}"
    )


def test_claude_md_cites_adr_0025() -> None:
    text = CLAUDE_MD.read_text()
    assert "ADR-0025" in text, (
        "CLAUDE.md must cite ADR-0025 where it states the install-surface rule"
    )


def test_claude_md_no_longer_claims_no_plugin_ships_a_hook() -> None:
    text = CLAUDE_MD.read_text()
    forbidden_claims = [
        "no agents, no hooks, no mcp servers",
        "agent, a hook, or an mcp server",
        "no agents, no hooks, and no mcp servers",
    ]
    lowered = text.lower()
    hits = [claim for claim in forbidden_claims if claim in lowered]
    assert not hits, (
        "CLAUDE.md still contains a blanket claim that no plugin ships a "
        f"hook, which is no longer true now that implement does: {hits}"
    )
