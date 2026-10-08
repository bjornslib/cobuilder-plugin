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

# Only this plugin may ship agents/ and hooks/ (ADR-0025). MCP servers stay
# forbidden for every plugin, including this one.
PLUGIN_ALLOWED_AGENTS_AND_HOOKS = "implement"


def plugin_dirs() -> list[Path]:
    return sorted(p for p in PLUGINS_DIR.iterdir() if p.is_dir())


def manifest_path(plugin_dir: Path) -> Path:
    return plugin_dir / ".claude-plugin" / "plugin.json"


def check_install_surface(plugin_dir: Path, manifest_data: dict) -> list[str]:
    """Return a list of install-surface violations for one plugin directory.

    An empty list means the plugin's install surface is compliant. Only
    ``implement`` may ship ``agents/`` or ``hooks/``. No plugin, including
    ``implement``, may ship an MCP server declaration or manifest key.
    """
    violations: list[str] = []
    allowed_dirs = (
        set() if plugin_dir.name != PLUGIN_ALLOWED_AGENTS_AND_HOOKS else FORBIDDEN_DIR_NAMES
    )
    for forbidden in FORBIDDEN_DIR_NAMES:
        if forbidden in allowed_dirs:
            continue
        if (plugin_dir / forbidden).exists():
            violations.append(
                f"{plugin_dir.name} ships a {forbidden}/ directory, which is "
                "outside the install surface this plugin family promises"
            )
    for mcp_name in (".mcp.json", "mcp.json"):
        if (plugin_dir / mcp_name).exists():
            violations.append(
                f"{plugin_dir.name} ships {mcp_name}, an MCP server declaration"
            )
    manifest_forbidden_keys = {"mcpServers", "mcp"}
    if plugin_dir.name != PLUGIN_ALLOWED_AGENTS_AND_HOOKS:
        manifest_forbidden_keys |= {"agents", "hooks"}
    present = manifest_forbidden_keys & set(manifest_data)
    if present:
        violations.append(
            f"{plugin_dir.name}'s manifest declares forbidden keys: {present}"
        )
    return violations


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
    """Only ``implement`` may ship agents/ or hooks/ (ADR-0025). No plugin,
    including ``implement``, may ship an MCP server."""
    data = json.loads(manifest_path(plugin_dir).read_text())
    violations = check_install_surface(plugin_dir, data)
    assert not violations, "; ".join(violations)


def test_check_install_surface_rejects_agents_dir_for_non_implement_plugin(
    tmp_path: Path,
) -> None:
    fake_plugin = tmp_path / "architect"
    (fake_plugin / "agents").mkdir(parents=True)
    violations = check_install_surface(fake_plugin, {"name": "architect"})
    assert violations, "a non-implement plugin with agents/ must be flagged"
    assert any("agents/" in v for v in violations)


def test_check_install_surface_rejects_hooks_dir_for_non_implement_plugin(
    tmp_path: Path,
) -> None:
    fake_plugin = tmp_path / "pr"
    (fake_plugin / "hooks").mkdir(parents=True)
    violations = check_install_surface(fake_plugin, {"name": "pr"})
    assert violations, "a non-implement plugin with hooks/ must be flagged"
    assert any("hooks/" in v for v in violations)


def test_check_install_surface_allows_agents_and_hooks_for_implement(
    tmp_path: Path,
) -> None:
    fake_plugin = tmp_path / "implement"
    (fake_plugin / "agents").mkdir(parents=True)
    (fake_plugin / "hooks").mkdir(parents=True)
    violations = check_install_surface(fake_plugin, {"name": "implement"})
    assert not violations, (
        f"implement should be allowed to ship agents/ and hooks/, got: {violations}"
    )


def test_check_install_surface_still_rejects_mcp_server_for_implement(
    tmp_path: Path,
) -> None:
    fake_plugin = tmp_path / "implement"
    fake_plugin.mkdir(parents=True)
    (fake_plugin / ".mcp.json").write_text("{}")
    violations = check_install_surface(fake_plugin, {"name": "implement"})
    assert violations, "implement must still be refused an MCP server declaration"
    assert any("MCP server" in v for v in violations)


def test_marketplace_lists_all_five_plugins() -> None:
    marketplace = json.loads((REPO_ROOT / ".claude-plugin" / "marketplace.json").read_text())
    listed = [p["name"] for p in marketplace["plugins"]]
    assert len(listed) == len(set(listed)), f"a plugin is listed twice: {listed}"
    names = set(listed)
    assert names == {
        "architect",
        "pr",
        "artifact",
        "implement",
        "cobuilder-full-lifecycle",
    }


@pytest.mark.parametrize("plugin_dir", plugin_dirs(), ids=lambda p: p.name)
def test_plugin_version_matches_marketplace_entry(plugin_dir: Path) -> None:
    """A version bump must land in plugin.json and marketplace.json together.
    A mismatch leaves installed copies on the old version, or lists a version
    the plugin does not declare."""
    marketplace = json.loads((REPO_ROOT / ".claude-plugin" / "marketplace.json").read_text())
    entries = {p["name"]: p for p in marketplace["plugins"]}
    assert plugin_dir.name in entries, f"marketplace.json has no entry for {plugin_dir.name}"
    declared = json.loads(manifest_path(plugin_dir).read_text())["version"]
    listed = entries[plugin_dir.name]["version"]
    assert declared == listed, (
        f"{plugin_dir.name}: plugin.json says {declared}, marketplace.json says {listed}"
    )


def test_umbrella_plugin_depends_on_the_other_four() -> None:
    data = json.loads(manifest_path(PLUGINS_DIR / "cobuilder-full-lifecycle").read_text())
    deps = {d.split("@")[0] for d in data.get("dependencies", [])}
    assert deps == {
        "architect",
        "pr",
        "artifact",
        "implement",
    }


def test_shared_is_a_symlink_in_the_source_tree() -> None:
    """The marketplace source vendors shared/ into each plugin via symlink.
    The install copy dereferences it (checked outside pytest, against a
    real installed cache — see the slice-6 report)."""
    for plugin_dir in plugin_dirs():
        link = plugin_dir / "shared"
        assert link.is_symlink(), f"{plugin_dir.name}/shared must be a symlink in source"
        assert link.resolve() == (REPO_ROOT / "shared").resolve()
