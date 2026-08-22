"""Tests for Slice 10: Decisions and Contexts viewer modes (plugin-split/E5).

Run with: uv run --with pytest pytest tests/test_viewer_modes.py -v
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "plugins" / "cobuilder-artifact" / "scripts"))
sys.path.insert(0, str(REPO_ROOT / "shared"))

import export_artifact as ea  # noqa: E402
import migrate_bundle as mb  # noqa: E402


VIEWER_PATH = REPO_ROOT / "plugins" / "cobuilder-artifact" / "viewer" / "index.html"


def test_viewer_contains_all_four_mode_buttons():
    """C5: Topbar must contain mode buttons for prs, designs, decisions, contexts."""
    content = VIEWER_PATH.read_text()
    assert 'data-mode="designs"' in content
    assert 'data-mode="prs"' in content
    assert 'data-mode="decisions"' in content
    assert 'data-mode="contexts"' in content
    assert 'id="mode-btn-decisions"' in content
    assert 'id="mode-btn-contexts"' in content


def test_decisions_mode_lists_all_records_and_anchor_distinction():
    """C1 & C2: Decisions mode contains anchor distinction logic and unreferenced record handling."""
    content = VIEWER_PATH.read_text()
    assert "getAllAdrRecords" in content
    assert "renderDecisionsMainContent" in content
    # C2: Anchor distinction verified vs inferred
    assert "anchor-verified" in content
    assert "anchor-inferred" in content
    assert "anchor-unanchored" in content
    assert "verified" in content
    assert "inferred" in content
    # C1: unreferenced records present
    assert "unreferenced" in content


def test_contexts_mode_leads_with_violations_and_uncovered_districts():
    """C3: Contexts mode leads with boundary violations first, marked as decision candidates."""
    content = VIEWER_PATH.read_text()
    assert "renderContextsMainContent" in content
    # Violations first
    assert "Boundary Violations" in content
    assert "Decision candidate" in content
    # Uncovered districts backlog second
    assert "Uncovered Districts Backlog" in content or "Uncovered Districts" in content
    assert "district_uncovered" in content


def test_contexts_mode_renders_boundary_record_as_readable_rules():
    """C4: Boundary records render as readable module invariants and context maps."""
    content = VIEWER_PATH.read_text()
    assert "module-invariant" in content or "module-rule-card" in content
    assert "Allowed Inbound" in content
    assert "Allowed Outbound" in content
    assert "Context Map Integrations" in content or "context-map" in content


def test_export_artifact_parses_updated_viewer(tmp_path):
    """Regression: export_artifact.py parses the updated viewer and inlines index without error."""
    viewer_html = VIEWER_PATH.read_text()
    story_obj = {
        "meta": {"repo": "prodyssey", "schema_version": "1.3"},
        "world": {"districts": []},
        "timeline": [{"pr": 1, "title": "Initial", "levels": {}}],
    }
    manifest_obj = {"schema_version": "1.3", "excluded_prs": [], "hero": [], "diff_prs": []}
    adrs_obj = {"ADR-0016": {"id": "ADR-0016", "title": "Sample ADR", "state": "approved"}}
    diagrams_obj = {}
    designs_obj = {}
    index_obj = {
        "schema_version": "1.3",
        "entities": {"adr": [{"id": "ADR-0016", "title": "Sample ADR", "state": "approved"}]},
        "joins": {"adr_to_context": {"ADR-0016": "cobuilder-packaging"}},
    }
    assets_map = {}
    audio_map = {}

    out = ea.build_html(
        viewer_html=viewer_html,
        story_obj=story_obj,
        manifest_obj=manifest_obj,
        diffs_js=None,
        adrs_obj=adrs_obj,
        diagrams_obj=diagrams_obj,
        designs_obj=designs_obj,
        assets_map=assets_map,
        audio_map=audio_map,
        page_title="Test Page",
        inline_mermaid_js=None,
        index_obj=index_obj,
    )

    assert "window.STORY =" in out
    assert "window.INDEX =" in out
    assert "cobuilder-packaging" in out
    assert "window.INDEX = window.INDEX || {};" not in out
