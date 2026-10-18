"""Load the tracker adapter that .cobuilder/tracker.yaml names."""

from __future__ import annotations

from pathlib import Path

from .port import AdapterError, TrackerPort


def load_adapter(config_path: Path, repo_root: Path) -> TrackerPort | None:
    """Return the configured adapter, or None when the repo has no tracker config."""
    if not config_path.is_file():
        return None
    raise AdapterError(f"tracker config found but not readable yet: {config_path} (repo {repo_root})")
