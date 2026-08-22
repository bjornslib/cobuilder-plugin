#!/usr/bin/env python3
"""Single source of truth for bundle version constants.

Imported (never executed) by the scripts that read or write bundle data:
extract_story.py, extract_diffs.py, export_artifact.py, generate_prompts.py,
verify_bundle.py, migrate_bundle.py, build_index.py. Keeping these three constants in one
stdlib-only module means bumping a schema or layout version is one edit
instead of five copy-pasted literals drifting apart.

SCHEMA_VERSION       - current data shape of story.json / adrs.json
                       (mirrors <bundle-dir>/bundle.json's "schema_version"
                       and story.json's meta.schema_version).
SCHEMA_VERSION_KNOWN - every schema_version this version of the plugin
                       understands (needed to migrate old bundles forward).
CURRENT_BUNDLE_FORMAT - current directory-layout version
                       (<bundle-dir>/bundle.json's "bundle_format").

require_compatible() and stamp_generator() implement the compatibility gate
from ADR-0017. A script that writes into a bundle calls require_compatible()
first, and calls stamp_generator() to record its own version.
"""
from __future__ import annotations

import json
from pathlib import Path

SCHEMA_VERSION = "1.3"
SCHEMA_VERSION_KNOWN = {"1.0", "1.1", "1.2", "1.3"}
CURRENT_BUNDLE_FORMAT = 3

PLUGIN_ROOT = Path(__file__).resolve().parent.parent


def read_plugin_version() -> str:
    """Read this plugin's own version from its manifest.

    Returns "0.0.0" when the manifest is absent or malformed, so a writer
    can still stamp a generator entry instead of crashing.
    """
    plugin_json = PLUGIN_ROOT / ".claude-plugin" / "plugin.json"
    try:
        data = json.loads(plugin_json.read_text())
        return data.get("version", "0.0.0")
    except (OSError, json.JSONDecodeError):
        return "0.0.0"


def read_plugin_name() -> str:
    """Read the calling plugin's own name from its manifest.

    A script under shared/ runs from more than one plugin's cache.
    PLUGIN_ROOT resolves to whichever plugin vendored this copy, so this
    reads that plugin's own name instead of a hardcoded literal. Returns
    "unknown-plugin" when the manifest is absent or malformed, so a
    writer can still stamp a generator entry instead of crashing.
    """
    plugin_json = PLUGIN_ROOT / ".claude-plugin" / "plugin.json"
    try:
        data = json.loads(plugin_json.read_text())
        return data.get("name", "unknown-plugin")
    except (OSError, json.JSONDecodeError):
        return "unknown-plugin"


class BundleIncompatible(RuntimeError):
    """Raised when a bundle demands a reader this plugin cannot be."""


def _version_tuple(version: str) -> tuple[int, ...]:
    """Parse a dotted version string into a tuple of integers for comparison.

    Compare versions as tuples, not as strings. The string "1.10" sorts
    before "1.9", but the version 1.10 is newer than 1.9.
    """
    return tuple(int(part) for part in version.split("."))


def require_compatible(bundle_dir: Path, plugin: str) -> None:
    """Refuse to write into a bundle this plugin is too old to read.

    Reads <bundle_dir>/bundle.json. Raises BundleIncompatible when
    min_reader_schema exceeds SCHEMA_VERSION, or when bundle_format
    exceeds CURRENT_BUNDLE_FORMAT. Returns None and is silent otherwise.
    A missing bundle.json is a new bundle and is compatible.
    """
    bundle_json_path = Path(bundle_dir) / "bundle.json"
    if not bundle_json_path.exists():
        return

    try:
        bundle_meta = json.loads(bundle_json_path.read_text())
    except json.JSONDecodeError as exc:
        raise BundleIncompatible(
            f"Bundle at {bundle_dir} has a malformed {bundle_json_path}. "
            f"Plugin {plugin!r} cannot check compatibility against invalid "
            f"JSON. Fix or remove the file before writing into this bundle."
        ) from exc

    min_reader_schema = bundle_meta.get("min_reader_schema")
    if min_reader_schema is not None:
        try:
            incompatible = _version_tuple(min_reader_schema) > _version_tuple(SCHEMA_VERSION)
        except (AttributeError, TypeError, ValueError) as exc:
            raise BundleIncompatible(
                f"Bundle at {bundle_dir} has a malformed min_reader_schema "
                f"value {min_reader_schema!r} in {bundle_json_path}. A "
                f"version must be a dotted string, for example \"1.3\"."
            ) from exc
        if incompatible:
            raise BundleIncompatible(
                f"Bundle at {bundle_dir} requires a reader with schema "
                f"{min_reader_schema} or newer. Plugin {plugin!r} is at "
                f"schema {SCHEMA_VERSION}. Update {plugin!r} before it "
                f"writes into this bundle."
            )

    bundle_format = bundle_meta.get("bundle_format")
    if bundle_format is not None and bundle_format > CURRENT_BUNDLE_FORMAT:
        raise BundleIncompatible(
            f"Bundle at {bundle_dir} is at bundle_format {bundle_format}. "
            f"Plugin {plugin!r} only understands bundle_format "
            f"{CURRENT_BUNDLE_FORMAT} or older. Update {plugin!r} before "
            f"it writes into this bundle."
        )


def stamp_generator(bundle_dir: Path, plugin: str, version: str) -> None:
    """Record this plugin's version in bundle.json's generators map.

    Preserves every other plugin's entry already in the map. Preserves
    the old scalar generator_version field, if present, instead of
    discarding it.
    """
    bundle_json_path = Path(bundle_dir) / "bundle.json"
    if bundle_json_path.exists():
        bundle_meta = json.loads(bundle_json_path.read_text())
    else:
        bundle_meta = {}

    generators = bundle_meta.get("generators")
    if not isinstance(generators, dict):
        # A malformed `generators` value (a list, a string, a number) is
        # not silently discarded. It is kept under "_prior" so a human can
        # inspect it, and a warning names the file. This mirrors the rule
        # for the old scalar `generator_version` field: preserve, do not drop.
        if generators is not None:
            import sys as _sys

            print(
                f"warning: {bundle_json_path} had a malformed 'generators' "
                f"value ({generators!r}). Preserving it under '_prior' and "
                f"starting a fresh map.",
                file=_sys.stderr,
            )
            generators = {"_prior": generators}
        else:
            generators = {}

    generators[plugin] = version
    bundle_meta["generators"] = generators

    bundle_json_path.write_text(json.dumps(bundle_meta, indent=2) + "\n")
