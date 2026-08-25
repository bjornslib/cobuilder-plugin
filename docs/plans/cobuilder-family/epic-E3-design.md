# Epic Technical Solution Design: E3 — The seam is version-safe

Feature: cobuilder-family
Epic ID: plugin-split/E3

This design was written on 2026-08-25, after this epic's two slices were
built and accepted. Gate 4b did not run before implementation, so this
document records the design as built. It did not constrain the work. The
rubrics for this epic in `.cobuilder/rubrics/cobuilder-family/` were
derived without a written 4b design in hand.

## Scope and Intent

E3 makes the bundle safe to write from five independently versioned
plugins. It adds `require_compatible()` and `stamp_generator()`, raises
`bundle_format` to 3 and `schema_version` to 1.3, replaces the scalar
`generator_version` with a `generators` map keyed by plugin name, and gates
every bundle-writing script behind the compatibility check. ADR-0017 governs
this epic.

## Files Touched

- `shared/_bundle_meta.py` — `SCHEMA_VERSION = "1.3"`,
  `SCHEMA_VERSION_KNOWN = {"1.0", "1.1", "1.2", "1.3"}`,
  `CURRENT_BUNDLE_FORMAT = 3`, the `BundleIncompatible` exception, and both
  new functions.
- `shared/migrate_bundle.py` — the layout and schema ladders that carry a
  bundle from format 2 to format 3, and the scalar-to-map migration for
  `generators`.
- Every script that writes into a bundle now calls `require_compatible()`
  first: `shared/build_index.py`, `plugins/cobuilder-artifact/scripts/
  export_artifact.py`, `plugins/cobuilder-artifact/scripts/serve_bundle.py`
  (through `shared/ledger.py`), and `plugins/cobuilder-pr/scripts/
  extract_story.py`.
- `shared/ledger.py` — the append-only comment ledger this epic's gate
  gets wired in front of, in the sense that every write path funnels
  through `LedgerPaths` and the compatibility check runs before it.

## Types & Signatures

Read directly from `shared/_bundle_meta.py`:

```python
def read_plugin_version() -> str: ...
def read_plugin_name() -> str: ...

class BundleIncompatible(RuntimeError): ...

def _version_tuple(version: str) -> tuple[int, ...]: ...

def require_compatible(bundle_dir: Path, plugin: str) -> None:
    """Raise BundleIncompatible when the bundle's min_reader_schema exceeds
    this plugin's SCHEMA_VERSION, or when bundle_format exceeds
    CURRENT_BUNDLE_FORMAT. Silent otherwise. A missing bundle.json is a new
    bundle and passes."""

def stamp_generator(bundle_dir: Path, plugin: str, version: str) -> None:
    """Write this plugin's version into bundle.json's generators map,
    without touching another plugin's existing entry."""
```

`bundle.json` at format 3 carries `generators` as a map, for example
`{"cobuilder-pr": "0.5.0", "cobuilder-artifact": "0.5.0"}`, replacing the
single `generator_version` scalar the program design's Types and
signatures section shows as the format-2 shape.

## Slice Decomposition

Per `04-slices.md`:

1. **Slice 2 — the compatibility gate exists.** No dependency on E1 or E4.
   `require_compatible()` and `stamp_generator()` pass their own tests,
   called by nothing yet. Completed, score 1.00.
2. **Slice 3 — the gate is wired and the bundle migrates.** Depends on
   slice 2. Format 3, `min_reader_schema`, the `generators` map, and every
   writer gated. Completed, score 1.00.

Both slices land before E1's slice 6 splits the tree into five plugins, per
`04-slices.md`'s stated build order: "Slices 2 through 5 stay inside
today's single plugin," so the compatibility gate is proven before the
directory move that would make debugging both changes at once harder.

## Test Plan

- `tests/test_bundle_meta.py` — eleven tests, including
  `test_newer_min_reader_schema_raises`, `test_equal_min_reader_schema_
  passes`, `test_version_comparison_is_numeric_not_string`,
  `test_version_comparison_older_dotted_passes`, `test_newer_bundle_format_
  raises`, `test_missing_bundle_json_passes_silently`, `test_stamp_
  generator_preserves_other_plugin`, `test_stamp_generator_overwrites_own_
  prior_entry`, `test_stamp_generator_keeps_old_scalar_field`, and
  `test_stamp_generator_creates_bundle_json_when_missing`.
- `tests/test_migrate_bundle.py` — `test_build_generators_map_preserves_
  old_scalar`, `test_build_generators_map_keeps_existing_map_entries`,
  `test_full_migration_turns_scalar_into_map`, `test_guard_rejects_
  undeclared_authored_field_change`, `test_data_ladder_stops_before_later_
  steps_on_violation`, `test_main_writes_nothing_on_guard_violation`,
  `test_backup_written_before_new_story`, `test_viewer_refreshes_even_at_
  current_version`, and `test_viewer_refresh_is_not_version_gated_in_
  source` — this last pair is the regression test for the exact bug
  `CLAUDE.md`'s Bundle versioning section names: a version gate on the
  viewer refresh that once let a stale viewer silently drop diagram
  support.
- `tests/test_build_index.py` — `test_calls_compatibility_gate_before_
  first_write` confirms `build_index.py` itself calls `require_compatible()`
  before it writes, closing the loop between E3's gate and E4's index.

## Risks & Open Questions

- **The program design lists three specific call sites as ungated before
  this epic** — `extract_story.py:599`, `export_artifact.py:428`, and
  `_manifest.py:76`. This design did not re-verify each of the three by
  line number against the tree as built. `test_write_scripts_call_require_
  compatible_first`, named in `03-program-design.md`'s test plan, is the
  test that would settle this, and its presence or absence under those
  exact names was not confirmed while writing this document.
- **`min_reader_schema` has never been raised in anger.** Every migration
  shipped so far adds an optional field, so the floor has stayed at 1.3
  since it was introduced. Whether a future migration correctly raises it,
  rather than leaving it stale the way an old ADR's `maps_to.modules` block
  went stale (see `docs/architecture/designs/design-mode/assessment.json`,
  finding F3), is untested because no such migration exists yet.
