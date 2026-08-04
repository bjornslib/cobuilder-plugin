#!/usr/bin/env python3
"""Single source of truth for bundle version constants.

Imported (never executed) by the scripts that read or write bundle data:
extract_story.py, extract_diffs.py, export_artifact.py, generate_prompts.py,
verify_bundle.py, migrate_bundle.py. Keeping these three constants in one
stdlib-only module means bumping a schema or layout version is one edit
instead of five copy-pasted literals drifting apart.

SCHEMA_VERSION       - current data shape of story.json / adrs.json
                       (mirrors <bundle-dir>/bundle.json's "schema_version"
                       and story.json's meta.schema_version).
SCHEMA_VERSION_KNOWN - every schema_version this version of the plugin
                       understands (needed to migrate old bundles forward).
CURRENT_BUNDLE_FORMAT - current directory-layout version
                       (<bundle-dir>/bundle.json's "bundle_format").
"""
from __future__ import annotations

SCHEMA_VERSION = "1.2"
SCHEMA_VERSION_KNOWN = {"1.0", "1.1", "1.2"}
CURRENT_BUNDLE_FORMAT = 1
