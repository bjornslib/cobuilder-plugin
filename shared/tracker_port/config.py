"""Load the tracker adapter that .cobuilder/tracker.yaml names."""

from __future__ import annotations

from pathlib import Path

from .port import AdapterError, NoAdapterError, TrackerPort


def load_adapter(config_path: Path, repo_root: Path) -> TrackerPort | None:
    """Return the configured adapter, or None when the repo has no tracker config."""
    if not config_path.is_file():
        return None
    raise AdapterError(f"tracker config found but not readable yet: {config_path} (repo {repo_root})")


def require_adapter(config_path: Path, repo_root: Path) -> TrackerPort:
    """Return the configured adapter, or raise NoAdapterError when the repo has none."""
    adapter = load_adapter(config_path, repo_root)
    if adapter is None:
        raise NoAdapterError(f"no tracker adapter configured: {config_path} does not exist")
    return adapter
