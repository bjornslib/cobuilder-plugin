---
# --- doc-gardener required frontmatter ---
title: "ADR-0017 — Vendored shared code, and a compatibility gate the bundle owns"
status: active
type: architecture
last_verified: 2026-08-21
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0017
name: "Vendored shared code, and a compatibility gate the bundle owns"
state: approved
groups: [packaging, data-integrity]
approved_by: "bjornslib"
problem: "The split of ADR-0016 gives four plugins their own vendored copy of the bundle-writing code, and a user can hold four different versions at once. Three writers already stamp a schema version into the bundle with no check at all."
decision: "Vendor shared code from one marketplace-level shared/ directory by symlink, and move the compatibility gate out of skill prose into a single required function that every writer calls before it writes."
alternatives:
  - option: "Copy-paste the shared modules into each plugin and keep them in step by hand"
    rejected_because: "Nothing keeps them in step. A stale ladder meeting a newer bundle is the exact path that discards paid art and authored prose."
  - option: "One scalar version comparison in each entry point"
    rejected_because: "A scalar cannot express a sequenced ladder with per-step touches sets. Two copies can agree on the number and still disagree on what a step is allowed to change."
  - option: "A write-log ledger as the compatibility mechanism"
    rejected_because: "It records a mismatch after the mismatch is written. It is forensics, not a contract. The useful half is kept as the generators map below."
  - option: "Rely on the skill prose that already says migrate_bundle.py runs first"
    rejected_because: "Prose in one plugin's SKILL.md cannot bind another plugin. Across a plugin boundary the invariant has to be code."
forces:
  - "A cached plugin cannot read a sibling plugin's files. Vendoring is the only way to share code."
  - "A symlink elsewhere within the same marketplace is dereferenced at install, and the target content is copied into the cache in its place."
  - "The bundle holds authored prose, paid images, and paid audio. A wrong write is not recoverable."
  - "There is no CI and no test suite, so the gate must be runtime code, not a build check."
  - "migrate_bundle.py already refuses on an unknown schema or a newer bundle_format, so the posture exists and needs extending, not inventing."
related_decisions:
  - { type: depends-on, target: ADR-0016 }
  - { type: is-related-to, target: ADR-0006 }
  - { type: is-related-to, target: ADR-0003 }
related_concerns: [C3, C6]
history:
  - { state: tentative, date: 2026-08-20 }
  - { state: decided, date: 2026-08-21 }
  - { state: approved, date: 2026-08-21 }
maps_to:
  context: cobuilder-packaging
  modules: [scripts/_bundle_meta.py, scripts/migrate_bundle.py, scripts/verify_bundle.py, scripts/extract_story.py, scripts/export_artifact.py, scripts/_manifest.py]
  rule: "A script that writes into a bundle calls require_compatible() first and refuses to write when the bundle's min_reader_schema exceeds its own compiled SCHEMA_VERSION."
delivers:
  capability: "Four independently-installed plugins write into one bundle without a stale copy silently destroying authored or paid content."
  benefit: "The failure mode the split introduces becomes a loud refusal that names the plugin needing an update, instead of a quiet overwrite discovered weeks later."
  beneficiary: [operator, developer, validator-agent]
related:
  - "docs/architecture/adr/ADR-0016-five-sibling-plugins-bundle-as-seam.md"
---

# ADR-0017 — Vendored shared code, and a compatibility gate the bundle owns

## Context

ADR-0016 splits one plugin into five. Three of them write into one bundle
directory. Four Python modules and two skills are needed by more than one
plugin.

| Shared item | Needed by |
|---|---|
| `_bundle_meta.py` — `SCHEMA_VERSION`, `SCHEMA_VERSION_KNOWN`, `CURRENT_BUNDLE_FORMAT` | architect, pr, artifact |
| `_manifest.py`, `migrate_bundle.py`, `verify_bundle.py` | architect, pr, artifact |
| `ste-writing` skill | all five |
| `mermaid` skill | pr |

A cached plugin cannot read a sibling plugin's files, so a shared runtime
copy is not available. Every plugin that needs a module gets its own copy
of it. A user can then hold four different versions of that copy on one
machine at the same time.

Three facts about the current code decide the shape of the answer.

**The refusal posture already exists.** `migrate_bundle.py` lines 351 to
372 exit with status 1 when `bundle_format` is newer than
`CURRENT_BUNDLE_FORMAT`, and again when `schema_version` is not one the
ladder knows how to read. Both messages name the remediation.
`verify_bundle.py` computes a `too-new` status for the same two fields.

**Three writers bypass that posture.** `extract_story.py` line 599 sets
`meta.schema_version` to its own compiled constant with no check.
`export_artifact.py` line 428 and `_manifest.py` line 76 stamp the same
constant. None of the three reads `bundle.json` first. Today this is safe
only because the skill prose runs `migrate_bundle.py` before anything
else. After the split, that invariant would live as prose in four
`SKILL.md` files owned by four plugins. Prose in one plugin cannot bind
another.

**`generator_version` becomes wrong on the day of the split.**
`migrate_bundle.py` line 238 writes one scalar, read from the running
plugin's own `plugin.json`. With one writer that is accurate. With four
writers it records whichever plugin migrated last and silently misreports
the other three.

## Options considered

1. **Copy-paste the shared modules into each plugin.** Rejected. Nothing
   keeps them in step. The inversion frame produced the failure recipe
   directly: an old `cobuilder-pr` with `SCHEMA_VERSION_KNOWN` frozen at
   `{1.0, 1.1}` runs its stale ladder against a bundle a newer
   `cobuilder-architect` already advanced, and drops the fields it does
   not recognise.

2. **Symlink the shared modules, and add one scalar version comparison to
   each entry point.** Rejected as a trap. It scores well because the
   symlink half is right and the check sounds like defence in depth. A
   scalar cannot express a sequenced ladder with per-step `touches` sets.
   Two copies can agree on the version number and still disagree on what a
   step may change. Its correct half is absorbed into option 4.

3. **A write-log ledger.** Each script appends what it wrote, and a person
   reconstructs the causal chain afterwards. Kept in part, demoted as a
   mechanism. It reports the mismatch after the mismatch is on disk. Its
   useful half is the plugin identity, which option 4 keeps as a map.

4. **Vendor by symlink, and let the bundle own the gate.** Chosen. See
   below.

5. **Cut all five plugins from one marketplace tag.** Kept as the release
   discipline underneath option 4. It makes skew within a tag impossible,
   which narrows what the gate has to catch. It is a policy and not
   enforceable by the install mechanism, so it supports the gate and does
   not replace it.

## Decision

**Vendor shared code from one place.** A `shared/` directory at the
marketplace repository root holds `bundle-core/` (the four modules) and
the two shared skills. It is not itself a plugin. Each plugin symlinks
what it needs. The documented dereference copies the target content into
that plugin's cache at install, so every plugin ships byte-identical code
and no plugin reads outside itself at runtime.

**Move the gate from prose into code.** `_bundle_meta.py` gains one
function:

```python
def require_compatible(bundle_dir: Path, plugin: str) -> None:
    """Refuse to write when this copy is older than the bundle requires."""
```

Every script that writes into a bundle calls it before its first write.
That is `extract_story.py`, `export_artifact.py`, `_manifest.py`,
`build_adrs.py`, `build_designs.py`, and both existing gate holders. The
invariant stops being a sentence in a `SKILL.md` that one plugin cannot
enforce on another, and becomes a call in the module every plugin
vendors.

**The bundle carries the floor, not the plugin.** `bundle.json` gains
`min_reader_schema`: the schema version of the newest migration that has
ever touched this bundle. `require_compatible()` refuses when that floor
exceeds the caller's own compiled `SCHEMA_VERSION`, before any ladder step
runs. This inverts who decides compatibility. A plugin no longer asks
whether its own number looks recent. It asks the bundle what the bundle
demands. That is the same posture as a wire format, and it is the only
version of the check that keeps working when nobody can enumerate the
readers.

**`generator_version` becomes `generators`, a map.** Keyed by plugin name,
valued by version. Each writer updates only its own key. The scalar is
kept as a mirror of the last writer for one migration cycle, then dropped.
This is the surviving half of the ledger option, at the cost of one field
instead of a second log file.

These changes are a `story.json` and `bundle.json` shape change, so they
step `SCHEMA_VERSION` to `1.3` and take a `SCHEMA_MIGRATIONS` entry with a
`touches` set, per ADR-0006. `min_reader_schema` defaults to the bundle's
current `schema_version` for a bundle that predates the field, so no
existing bundle is locked out by its own new floor.

**Out of scope.** Signing, checksums, or any attempt to verify that a
vendored copy was not edited after install. The threat model here is
version skew between honest copies, not tampering.

## Consequences

- **Positive:** A stale plugin meeting a newer bundle stops before it
  writes, and the error names the plugin that needs updating.
- **Positive:** The gate holds for a plugin this repository does not ship
  and did not review, because the floor lives in the data and the check
  lives in the module that plugin vendored.
- **Constraint introduced:** A script that writes into a bundle calls
  `require_compatible()` first and refuses to write when the bundle's
  `min_reader_schema` exceeds its own compiled `SCHEMA_VERSION`.
- **Negative / accepted:** Every plugin ships its own copy of the same
  four modules. There is no single running copy and there cannot be one.
- **Negative / accepted:** A vendored copy goes stale the moment its
  plugin is not reinstalled. The gate turns that into a refusal rather
  than a corruption, and it does not prevent it.
- **Negative / accepted:** The one-tag release discipline is policy.
  Nothing in the install mechanism enforces it.

## Value delivered

- **New capability:** Four independently-installed plugins write into one
  bundle without a stale copy silently destroying authored or paid
  content.
- **Benefit:** The failure mode the split introduces becomes a loud
  refusal that names the plugin needing an update, instead of a quiet
  overwrite found weeks later, after the paid art and the authored
  narrative are already gone.
- **Beneficiary:** operator, developer, validator-agent.

## Maps to

Context `cobuilder-packaging`, modules `scripts/_bundle_meta.py`,
`scripts/migrate_bundle.py`, `scripts/verify_bundle.py`,
`scripts/extract_story.py`, `scripts/export_artifact.py`,
`scripts/_manifest.py`.

**Flagged:** as with ADR-0016, `docs/architecture/contexts/` does not
exist. The `cobuilder-packaging` boundary record must carry the invariant
above before this record moves to `approved`.

## Unverified before implementation

The symlink dereference is documented for sharing files within a
marketplace, and the example given is a meta-plugin's `skills/` directory.
It is not stated for a directory of Python that a skill later runs through
`${CLAUDE_PLUGIN_ROOT}`. Install a two-plugin draft from a local
marketplace and read what lands in the cache before this decision leaves
`tentative`. If the dereference does not cover it, the fallback is a copy
step before publish. That changes the mechanism and none of the
compatibility reasoning above.
