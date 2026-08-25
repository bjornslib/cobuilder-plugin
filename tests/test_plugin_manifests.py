"""Slice-6 tests: every plugin manifest parses and declares the platform's
required fields, and no plugin ships an agent, a hook, or an MCP server.
See rubric slice-6 C1 and C3.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
PLUGINS_DIR = REPO_ROOT / "plugins"

REQUIRED_FIELDS = {"name", "version", "description"}

FORBIDDEN_DIR_NAMES = {"agents", "hooks"}
FORBIDDEN_MANIFEST_KEYS = {"agents", "hooks", "mcpServers", "mcp"}


def plugin_dirs() -> list[Path]:
    return sorted(p for p in PLUGINS_DIR.iterdir() if p.is_dir())


def manifest_path(plugin_dir: Path) -> Path:
    return plugin_dir / ".claude-plugin" / "plugin.json"


@pytest.mark.parametrize("plugin_dir", plugin_dirs(), ids=lambda p: p.name)
def test_manifest_parses_and_has_required_fields(plugin_dir: Path) -> None:
    manifest = manifest_path(plugin_dir)
    assert manifest.exists(), f"{plugin_dir.name} has no .claude-plugin/plugin.json"
    data = json.loads(manifest.read_text())
    missing = REQUIRED_FIELDS - set(data)
    assert not missing, f"{plugin_dir.name}'s manifest is missing fields: {missing}"
    assert data["name"] == plugin_dir.name, (
        f"{plugin_dir.name}'s manifest declares name={data['name']!r}, "
        "which must match its directory name"
    )


@pytest.mark.parametrize("plugin_dir", plugin_dirs(), ids=lambda p: p.name)
def test_no_agent_hook_or_mcp_server(plugin_dir: Path) -> None:
    for forbidden in FORBIDDEN_DIR_NAMES:
        assert not (plugin_dir / forbidden).exists(), (
            f"{plugin_dir.name} ships a {forbidden}/ directory, which is "
            "outside the install surface this plugin family promises"
        )
    for mcp_name in (".mcp.json", "mcp.json"):
        assert not (plugin_dir / mcp_name).exists(), (
            f"{plugin_dir.name} ships {mcp_name}, an MCP server declaration"
        )
    data = json.loads(manifest_path(plugin_dir).read_text())
    present = FORBIDDEN_MANIFEST_KEYS & set(data)
    assert not present, (
        f"{plugin_dir.name}'s manifest declares forbidden keys: {present}"
    )


def test_marketplace_lists_all_five_plugins() -> None:
    marketplace = json.loads((REPO_ROOT / ".claude-plugin" / "marketplace.json").read_text())
    names = {p["name"] for p in marketplace["plugins"]}
    assert names == {
        "cobuilder-architect",
        "cobuilder-pr",
        "cobuilder-artifact",
        "cobuilder-implement",
        "cobuilder-full-lifecycle",
    }


def test_umbrella_plugin_depends_on_the_other_four() -> None:
    data = json.loads(manifest_path(PLUGINS_DIR / "cobuilder-full-lifecycle").read_text())
    deps = {d.split("@")[0] for d in data.get("dependencies", [])}
    assert deps == {
        "cobuilder-architect",
        "cobuilder-pr",
        "cobuilder-artifact",
        "cobuilder-implement",
    }


def test_shared_is_a_symlink_in_the_source_tree() -> None:
    """The marketplace source vendors shared/ into each plugin via symlink.
    The install copy dereferences it (checked outside pytest, against a
    real installed cache — see the slice-6 report)."""
    for plugin_dir in plugin_dirs():
        link = plugin_dir / "shared"
        assert link.is_symlink(), f"{plugin_dir.name}/shared must be a symlink in source"
        assert link.resolve() == (REPO_ROOT / "shared").resolve()
