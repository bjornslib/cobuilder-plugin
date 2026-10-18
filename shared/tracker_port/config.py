"""Load the tracker adapter that .cobuilder/tracker.yaml names."""

from __future__ import annotations

from pathlib import Path

import yaml

from .fake import FakeAdapter
from .files import FilesAdapter
from .port import AdapterError, NoAdapterError, TrackerPort


def _path(config: dict, key: str, config_path: Path, repo_root: Path) -> Path:
    value = config.get(key)
    if not isinstance(value, str) or not value:
        raise AdapterError(f"tracker config {config_path} needs a {key} path")
    # An absolute path stays as given. A relative path resolves against the repo root.
    return repo_root / value


def load_adapter(config_path: Path, repo_root: Path, state_file: Path | None = None) -> TrackerPort | None:
    """Return the configured adapter, or None when the repo has no tracker config.

    A state_file argument (the CLI's --state-file) overrides the config's state_file key.
    """
    if not config_path.is_file():
        return None
    try:
        config = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as error:
        raise AdapterError(f"cannot read tracker config {config_path}: {error}") from error
    if not isinstance(config, dict):
        raise AdapterError(f"tracker config {config_path} must hold a mapping")
    kind = config.get("adapter")
    if kind == "fake":
        if state_file is None and "state_file" in config:
            state_file = _path(config, "state_file", config_path, repo_root)
        return FakeAdapter(_path(config, "corpus", config_path, repo_root), state_file=state_file)
    if kind == "files":
        return FilesAdapter(_path(config, "plans_dir", config_path, repo_root))
    raise AdapterError(f"tracker config {config_path} names an unknown adapter: {kind!r}")


def require_adapter(config_path: Path, repo_root: Path, state_file: Path | None = None) -> TrackerPort:
    """Return the configured adapter, or raise NoAdapterError when the repo has none."""
    adapter = load_adapter(config_path, repo_root, state_file)
    if adapter is None:
        raise NoAdapterError(f"no tracker adapter configured: {config_path} does not exist")
    return adapter
