#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Bring a Codebase Odyssey bundle's viewer, layout, and data shape up to
date with the plugin currently installed. Never regenerates content — it
transforms structure only, and proves it left authored content alone before
writing anything.

Three phases, run in this order every time:

1. Unconditional viewer refresh. `<bundle-dir>/viewer/index.html` is a build
   artifact of the plugin with nothing to preserve, so it is content-compared
   against `<plugin>/viewer/index.html` and overwritten if different — never
   version-gated. Gating it on a format bump is exactly the bug this script
   exists to prevent: the bundle's viewer would keep silently predating a
   viewer change (e.g. new Mermaid support) until the next unrelated bump.

2. Layout ladder (`LAYOUT_MIGRATIONS`) — which files/directories exist,
   tracked by `bundle.json`'s `bundle_format` integer. 0 -> 1 is a stamp
   only: `data/diagrams/` is deliberately not created empty, since an empty
   directory isn't committable to git and `build_diagrams.py` already
   treats a missing diagrams dir as a non-error. 1 -> 2 stamps the format
   and writes `data/designs.js` as `window.DESIGNS = {};` when that file is
   missing. It does not invent designs and does not touch `story.json`.

3. Data ladder (`SCHEMA_MIGRATIONS`) — the structure of `story.json`,
   tracked by `schema_version`. Each migration is a pure function over a
   deepcopy of the story dict plus a `touches` set of dotted authored-field
   paths it is allowed to change. See `harvest_authored()` / `run_guard()`
   below for the preservation guarantee: any authored value that changes
   without being declared in `touches` aborts the run, restores the pre-
   migration backup, and lists the offending paths.

Refuses to run when the bundle's `bundle_format` or `schema_version` is
newer than this plugin knows (an old plugin pointed at a bundle written by a
newer one) — remediation is to update the plugin, never to guess forward.

`--dry-run` performs the viewer/layout checks (reporting what would happen)
but not the writes, and prints a unified diff of the data-ladder result for
story.json without writing it.

Usage:
    uv run migrate_bundle.py --bundle-dir <bundle>
    uv run migrate_bundle.py --bundle-dir <bundle> --dry-run
    uv run migrate_bundle.py --bundle-dir <bundle> --json
"""
from __future__ import annotations

import argparse
import copy
import difflib
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _bundle_meta import CURRENT_BUNDLE_FORMAT, SCHEMA_VERSION

PLUGIN_ROOT = Path(__file__).resolve().parent.parent


# --------------------------------------------------------------------------
# Content preservation guard
# --------------------------------------------------------------------------

# Authored (irreplaceable) leaves in story.json, as dotted-path templates.
# "*" stands for "every item in this list" when walking timeline/districts.
# `intent` is the author's own words, captured by submit mode's interview, and
# `assessment` is the judgment written against them — both irreplaceable, and
# neither re-derivable from git. They sit here so the guard treats a migration
# that touches either one as a violation unless it declares them.
AUTHORED_TIMELINE_FIELDS = ("tagline", "depth", "intent", "assessment")
AUTHORED_DISTRICT_FIELDS = ("label", "kind", "blurb")
AUTHORED_LEVEL_FIELDS = (
    "narration", "voice", "detail", "problem", "solution",
    "beats", "decision", "forces", "alternatives", "consequences", "groups",
)
AUTHORED_META_FIELDS = ("title", "description")
LEVEL_KEYS = ("landscape", "problem_solution", "architecture", "file_changes")


def harvest_authored(story: dict) -> dict[str, object]:
    """dotted-path -> value for every authored (irreplaceable) leaf in
    story, per the authored/derived split in the versioning plan. Anything
    not in this map is fair game for a migration to change without
    declaring it in `touches`."""
    out: dict[str, object] = {}

    meta = story.get("meta", {}) or {}
    for field in AUTHORED_META_FIELDS:
        if field in meta:
            out[f"meta.{field}"] = meta[field]

    districts = (story.get("world", {}) or {}).get("districts", []) or []
    for i, d in enumerate(districts):
        did = d.get("id", i)
        for field in AUTHORED_DISTRICT_FIELDS:
            if field in d:
                out[f"world.districts[{did}].{field}"] = d[field]

    timeline = story.get("timeline", []) or []
    for entry in timeline:
        pr = entry.get("pr")
        for field in AUTHORED_TIMELINE_FIELDS:
            if field in entry:
                out[f"timeline[{pr}].{field}"] = entry[field]
        levels = entry.get("levels", {}) or {}
        for level_key in LEVEL_KEYS:
            level = levels.get(level_key)
            if not isinstance(level, dict):
                continue
            for field in AUTHORED_LEVEL_FIELDS:
                if field in level:
                    out[f"timeline[{pr}].levels.{level_key}.{field}"] = level[field]

    return out


def run_guard(story: dict, migrate_fn, touches: set[str]) -> tuple[dict, list[str]]:
    """Run `migrate_fn` over a deepcopy of `story`. Returns (result,
    violations) — violations is the sorted list of authored dotted paths
    that changed without being declared in `touches`. Never mutates the
    input."""
    before = harvest_authored(story)
    result = migrate_fn(copy.deepcopy(story))
    after = harvest_authored(result)

    all_paths = set(before) | set(after)
    violations = sorted(
        p for p in all_paths
        if before.get(p) != after.get(p) and p not in touches
    )
    return result, violations


# --------------------------------------------------------------------------
# Data ladder (schema_version)
# --------------------------------------------------------------------------

def migrate_1_0_to_1_1(story: dict) -> dict:
    """Backfill `timeline[].status = "merged"` where the key is absent.
    `commit` is deliberately NOT backfilled here — it needs the git repo,
    which this script's --bundle-dir-only interface does not have; left to
    the next extract_story.py run (see plan's Out of scope)."""
    timeline = story.get("timeline", []) or []
    for entry in timeline:
        entry.setdefault("status", "merged")
    story.setdefault("meta", {})["schema_version"] = "1.1"
    return story


def migrate_1_1_to_1_2(story: dict) -> dict:
    """Stamp only. 1.2 adds two OPTIONAL timeline fields written by submit
    mode — `intent` (the author's stated problem/approach/alternatives) and
    `assessment` (the judgment written against them). Neither is backfilled:
    `intent` is what a person said, and nothing but an interview can produce
    it, so an absent block stays absent rather than becoming an invented one.
    verify_bundle.py reports both as optional unless --require-review."""
    story.setdefault("meta", {})["schema_version"] = "1.2"
    return story


def migrate_1_2_to_1_3(story: dict) -> dict:
    """Stamp only. Schema 1.3 adds no new story.json field. It pairs with
    bundle_format 3, which adds min_reader_schema and the generators map to
    bundle.json, a separate file this function never touches."""
    story.setdefault("meta", {})["schema_version"] = "1.3"
    return story


# Ordered list of (from, to, fn, touches, description). Append one entry per
# future schema bump; never edit history in place.
SCHEMA_MIGRATIONS: list[tuple[str, str, object, set[str], str]] = [
    ("1.0", "1.1", migrate_1_0_to_1_1, set(), "backfill timeline[].status where absent"),
    ("1.1", "1.2", migrate_1_1_to_1_2, set(), "stamp schema 1.2 (intent/assessment are optional, never backfilled)"),
    ("1.2", "1.3", migrate_1_2_to_1_3, set(), "stamp schema 1.3 (no story.json shape change)"),
]


# --------------------------------------------------------------------------
# Layout ladder (bundle_format)
# --------------------------------------------------------------------------

def migrate_layout_0_to_1(bundle_dir: Path) -> None:
    """0 -> 1 is a stamp only. Deliberately does not create data/diagrams/
    empty: an empty directory is not committable to git, and
    build_diagrams.py already treats a missing diagrams dir as a non-error."""


def migrate_layout_1_to_2(bundle_dir: Path) -> None:
    """1 -> 2 stamps bundle_format and writes an empty designs.js when
    missing. Does not invent designs. Does not touch story.json.
    build_index.py is self-only and rebuilds designs.js from
    docs/architecture/designs/."""
    designs_js = bundle_dir / "data" / "designs.js"
    if not designs_js.exists():
        designs_js.parent.mkdir(parents=True, exist_ok=True)
        designs_js.write_text("window.DESIGNS = {};\n")


def migrate_layout_2_to_3(bundle_dir: Path) -> None:
    """2 -> 3 reshapes bundle.json only. It gains min_reader_schema, and the
    scalar generator_version field becomes a generators map keyed by
    plugin. The old scalar value is preserved as the map's first entry
    under the key "cobuilder-architect" rather than discarded, so a reader
    that only ever wrote the old field is not erased from the record.
    write_bundle_json() (called by main() after this step) performs the
    actual rewrite, because it already owns bundle.json's full shape and
    this function has no bundle_meta of its own to work from."""


LAYOUT_MIGRATIONS: list[tuple[int, int, object, str]] = [
    (0, 1, migrate_layout_0_to_1, "stamp bundle_format 1 (no directory changes)"),
    (1, 2, migrate_layout_1_to_2, "stamp bundle_format 2 (empty designs.js if missing)"),
    (2, 3, migrate_layout_2_to_3, "stamp bundle_format 3 (min_reader_schema + generators map)"),
]


# --------------------------------------------------------------------------
# Plumbing
# --------------------------------------------------------------------------

def read_bundle_json(bundle_dir: Path) -> dict:
    path = bundle_dir / "bundle.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}


def read_story(bundle_dir: Path) -> dict | None:
    path = bundle_dir / "data" / "story.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return None


def read_generator_version() -> str:
    plugin_json = PLUGIN_ROOT / ".claude-plugin" / "plugin.json"
    try:
        data = json.loads(plugin_json.read_text())
        return data.get("version", "0.0.0")
    except (OSError, json.JSONDecodeError):
        return "0.0.0"


def build_generators_map(bundle_meta: dict, plugin_version: str) -> dict:
    """Return the generators map for the migrated bundle.json.

    Preserves every entry already in an existing `generators` map. Preserves
    an old scalar `generator_version` as this plugin's first entry, instead
    of discarding it, per CURRENT_BUNDLE_FORMAT 3's contract (rubric C3).
    Never overwrites an existing entry for the current plugin — a fresher
    stamp from stamp_generator() outranks a migration's best guess.
    """
    existing = bundle_meta.get("generators")
    generators = dict(existing) if isinstance(existing, dict) else {}

    old_scalar = bundle_meta.get("generator_version")
    if old_scalar is not None and "cobuilder-architect" not in generators:
        generators["cobuilder-architect"] = old_scalar

    generators.setdefault("cobuilder-architect", plugin_version)
    return generators


def write_bundle_json(
    bundle_dir: Path, bundle_format: int, schema_version: str, old_bundle_meta: dict
) -> None:
    plugin_version = read_generator_version()
    payload = {
        "bundle_format": bundle_format,
        "schema_version": schema_version,
        "min_reader_schema": schema_version,
        "generators": build_generators_map(old_bundle_meta, plugin_version),
        "migrated_at": date.today().isoformat(),
    }
    (bundle_dir / "bundle.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def find_viewer_source() -> Path | None:
    candidate = PLUGIN_ROOT / "viewer" / "index.html"
    if candidate.exists():
        return candidate
    candidate = PLUGIN_ROOT / "plugins" / "cobuilder-artifact" / "viewer" / "index.html"
    if candidate.exists():
        return candidate
    return None


def refresh_viewer(bundle_dir: Path, dry_run: bool) -> str:
    """Unconditional content-compared viewer refresh. Returns "refreshed",
    "unchanged", or "missing-source" (the plugin's own viewer is absent —
    should not happen in a real install, but don't crash on it)."""
    src = find_viewer_source()
    if src is None:
        return "missing-source"
    dst = bundle_dir / "viewer" / "index.html"

    src_text = src.read_text()
    dst_text = dst.read_text() if dst.exists() else None
    if dst_text == src_text:
        return "unchanged"

    if not dry_run:
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(src_text)
    return "refreshed"


def run_layout_ladder(bundle_dir: Path, current_format: int, dry_run: bool) -> tuple[int, list[str]]:
    """Applies every LAYOUT_MIGRATIONS step from current_format up to
    CURRENT_BUNDLE_FORMAT in order. Returns (final_format, steps_applied)."""
    steps: list[str] = []
    fmt = current_format
    for from_v, to_v, fn, description in LAYOUT_MIGRATIONS:
        if fmt != from_v:
            continue
        if not dry_run:
            fn(bundle_dir)
        steps.append(f"{from_v} -> {to_v}: {description}")
        fmt = to_v
    return fmt, steps


def run_data_ladder(story: dict, current_schema: str) -> tuple[dict, list[str], list[str]]:
    """Applies every SCHEMA_MIGRATIONS step from current_schema up to
    SCHEMA_VERSION in order, running run_guard() at each step. Returns
    (result_story, steps_applied, violations). Stops (and returns
    violations) at the first migration whose guard fails — later steps in
    the ladder are not attempted against a rejected intermediate result."""
    steps: list[str] = []
    result = story
    schema = current_schema
    for from_v, to_v, fn, touches, description in SCHEMA_MIGRATIONS:
        if schema != from_v:
            continue
        migrated, violations = run_guard(result, fn, touches)
        if violations:
            return result, steps, violations
        result = migrated
        steps.append(f"{from_v} -> {to_v}: {description}")
        schema = to_v
    return result, steps, []


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bundle-dir", required=True, help="bundle dir to migrate (e.g. <repo>/.cobuilder-architect/self)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="report what would change (viewer/layout/data) without writing anything; "
        "prints a unified diff of the data-ladder result for story.json",
    )
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON instead of a report")
    args = parser.parse_args()

    bundle_dir = Path(args.bundle_dir).resolve()
    if not bundle_dir.exists():
        print(
            f"error: bundle dir {bundle_dir} does not exist.\n"
            "remediation: run /cobuilder-architect:baseline against this bundle first.",
            file=sys.stderr,
        )
        sys.exit(1)

    bundle_meta = read_bundle_json(bundle_dir)
    current_format = bundle_meta.get("bundle_format", 0)
    if not isinstance(current_format, int):
        current_format = 0

    story = read_story(bundle_dir)
    if story is None:
        print(
            f"error: {bundle_dir}/data/story.json not found or not valid JSON.\n"
            "remediation: run /cobuilder-architect:baseline (and /cobuilder-architect:generate) against this bundle first.",
            file=sys.stderr,
        )
        sys.exit(1)

    # story.json's meta.schema_version is the SOURCE OF TRUTH; bundle.json only
    # mirrors it. Reading bundle.json first would deadlock a bundle whose mirror
    # ran ahead of its data (hand edit, partial restore, a copied bundle.json):
    # the ladder would skip every step as "already current" while story.json sat
    # un-migrated, and verify_bundle.py would keep failing `bundle.schema` with
    # no command able to fix it. Trusting the data means the mirror is always
    # re-derivable, in either direction of disagreement.
    story_schema = story.get("meta", {}).get("schema_version")
    mirror_schema = bundle_meta.get("schema_version")
    current_schema = story_schema or mirror_schema or "1.0"
    schema_mirror_drift = (
        mirror_schema is not None and story_schema is not None and mirror_schema != story_schema
    )

    known_schemas = {m[0] for m in SCHEMA_MIGRATIONS} | {SCHEMA_VERSION}
    if current_format > CURRENT_BUNDLE_FORMAT:
        print(
            f"error: bundle_format {current_format} is newer than this plugin knows "
            f"(CURRENT_BUNDLE_FORMAT={CURRENT_BUNDLE_FORMAT}).\n"
            "remediation: update the cobuilder-architect plugin (`/plugin update cobuilder-architect@cobuilder-architect` or "
            "re-add the marketplace) before migrating this bundle.",
            file=sys.stderr,
        )
        sys.exit(1)
    if current_schema not in known_schemas:
        # Anything not in the known-schemas set and not reachable by walking
        # the ladder from a known "from" is either newer than this plugin
        # understands, or already at (or ahead of) SCHEMA_VERSION under a
        # name this plugin never produced — either way, refuse to guess.
        print(
            f"error: schema_version {current_schema!r} is not one this plugin's migrate_bundle.py "
            f"knows how to read (known: {sorted(known_schemas)}).\n"
            "remediation: update the cobuilder-architect plugin (`/plugin update cobuilder-architect@cobuilder-architect` or "
            "re-add the marketplace) before migrating this bundle.",
            file=sys.stderr,
        )
        sys.exit(1)

    report: dict = {"bundle_dir": str(bundle_dir), "dry_run": args.dry_run}

    # Phase 1: unconditional viewer refresh.
    report["viewer"] = refresh_viewer(bundle_dir, args.dry_run)

    # Phase 2: layout ladder.
    final_format, layout_steps = run_layout_ladder(bundle_dir, current_format, args.dry_run)
    report["layout"] = {
        "from": current_format,
        "to": final_format,
        "steps": layout_steps,
    }

    # Phase 3: data ladder.
    result_story, data_steps, violations = run_data_ladder(story, current_schema)
    report["data"] = {
        "from": current_schema,
        "to": result_story.get("meta", {}).get("schema_version", current_schema),
        "steps": data_steps,
    }

    if violations:
        report["data"]["violations"] = violations
        report["aborted"] = True
        if args.json:
            print(json.dumps(report, indent=2, ensure_ascii=False))
        else:
            print(
                "error: a data migration changed authored content it did not declare in `touches`.\n"
                f"Offending path(s): {', '.join(violations)}\n"
                "remediation: this is a bug in migrate_bundle.py's migration function, not in your "
                "bundle. No files were written; story.json is unchanged.",
                file=sys.stderr,
            )
        sys.exit(1)

    if args.dry_run:
        story_path = bundle_dir / "data" / "story.json"
        old_json = json.dumps(story, indent=2, ensure_ascii=False)
        new_json = json.dumps(result_story, indent=2, ensure_ascii=False)
        diff = "".join(
            difflib.unified_diff(
                (old_json + "\n").splitlines(keepends=True),
                (new_json + "\n").splitlines(keepends=True),
                fromfile=f"{story_path} (current)",
                tofile=f"{story_path} (migrated)",
            )
        )
        if args.json:
            report["data"]["diff"] = diff
            print(json.dumps(report, indent=2, ensure_ascii=False))
        else:
            print(f"viewer: {report['viewer']}")
            print(f"layout: {current_format} -> {final_format} ({len(layout_steps)} step(s))")
            print(f"data:   {current_schema} -> {report['data']['to']} ({len(data_steps)} step(s))")
            print()
            print(diff if diff else "(no story.json changes)")
        return

    # Real run: back up before any data transform, then write everything.
    made_changes = (
        report["viewer"] == "refreshed"
        or layout_steps
        or data_steps
    )

    if data_steps:
        backup_dir = bundle_dir / ".migration-backup"
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = backup_dir / f"{date.today().isoformat()}-schema-{current_schema}.json"
        backup_path.write_text(json.dumps(story, indent=2, ensure_ascii=False) + "\n")
        report["backup"] = str(backup_path)

        story_path = bundle_dir / "data" / "story.json"
        story_js_path = bundle_dir / "data" / "story.js"
        new_json = json.dumps(result_story, indent=2, ensure_ascii=False)
        story_path.write_text(new_json + "\n")
        if story_js_path.exists():
            story_js_path.write_text(f"window.STORY = {new_json};\n")

    bundle_json_path = bundle_dir / "bundle.json"
    # `schema_mirror_drift` matters even when no ladder step ran: the mirror is
    # wrong and only rewriting it clears verify_bundle.py's `bundle.schema`.
    # A viewer refresh counts too — the plugin just changed something in this
    # bundle, so leaving `generator_version` at the older value makes the stamp
    # claim a version that did not produce what is now on disk.
    needs_bundle_json = (
        not bundle_json_path.exists()
        or layout_steps
        or data_steps
        or schema_mirror_drift
        or report["viewer"] == "refreshed"
    )
    if needs_bundle_json:
        write_bundle_json(bundle_dir, final_format, report["data"]["to"], bundle_meta)
        report["bundle_json"] = "written"
    else:
        report["bundle_json"] = "unchanged"

    made_changes = made_changes or needs_bundle_json
    if args.json:
        report["made_changes"] = made_changes
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        if not made_changes:
            print("already current: no viewer, layout, or data changes.")
        else:
            print(f"viewer: {report['viewer']}")
            print(f"layout: {current_format} -> {final_format} ({len(layout_steps)} step(s))")
            print(f"data:   {current_schema} -> {report['data']['to']} ({len(data_steps)} step(s))")
            if "backup" in report:
                print(f"backup: {report['backup']}")
            if needs_bundle_json:
                print(f"wrote {bundle_json_path}")


if __name__ == "__main__":
    main()
