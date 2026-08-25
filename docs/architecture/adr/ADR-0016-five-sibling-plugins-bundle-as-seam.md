---
# --- doc-gardener required frontmatter ---
title: "ADR-0016 — Five sibling plugins, with the bundle as the only seam"
status: active
type: architecture
last_verified: 2026-08-21
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0016
source_pr: 11
name: "Five sibling plugins, with the bundle as the only seam"
state: approved
groups: [packaging, ddd-alignment]
approved_by: "bjornslib"
problem: "One plugin now carries the whole architecture lifecycle. Its four skills, thirteen commands, and twenty-two scripts serve four separate jobs, and a user who wants one job installs all four."
decision: "Split the plugin into five sibling plugins in one marketplace repository, and let them integrate only through the bundle directory on disk."
alternatives:
  - option: "Keep one plugin and organise inside it with directories and modes"
    rejected_because: "The install surface is the unit a user chooses. A directory is not installable, so a user who wants only pull-request narration still takes the whole corpus, the viewer, and the paid-art pipeline."
  - option: "Two plugins, one per pillar, with view and publish duplicated into both"
    rejected_because: "The viewer reads projections that both pillars write. Two copies of one viewer drift, and the Designs / Pull-requests toggle then renders differently depending on which plugin last refreshed it."
  - option: "Let plugins call each other's scripts directly through a shared path"
    rejected_because: "Not possible. A cached plugin cannot read outside its own directory, and ${CLAUDE_PLUGIN_ROOT} resolves only to that plugin's own cache."
  - option: "Abandon the plugin format and ship one cloned repository with entry-point scripts"
    rejected_because: "It removes version skew by removing the install surface, which is the product. `/plugin install` and nothing else is a deliberate constraint of this project."
forces:
  - "The install surface is fixed: no agents, no hooks, no MCP servers. A plugin installs with /plugin install and nothing else."
  - "A cached plugin cannot reference files outside its own directory. The dependencies field guarantees co-installation, not file access."
  - "A user can hold four different plugin versions on one machine at the same time."
  - "The bundle holds authored prose, paid images, and paid audio. A wrong write is not recoverable by regeneration."
  - "There is no CI, no test suite, and no package manager in this repository."
related_decisions:
  - { type: depends-on, target: ADR-0017 }
  - { type: is-related-to, target: ADR-0015 }
  - { type: is-related-to, target: ADR-0013 }
  - { type: is-related-to, target: ADR-0003 }
related_concerns: [C3, C6]
history:
  - { state: tentative, date: 2026-08-20 }
  - { state: decided, date: 2026-08-21 }
  - { state: approved, date: 2026-08-21 }
maps_to:
  context: cobuilder-packaging
  modules: [.claude-plugin/, commands/, skills/, scripts/, viewer/]
  rule: "No plugin reads or imports another plugin's files. A plugin may hand off to another plugin's mode by name, and the state that crosses the handoff travels in the bundle and in docs/, never through a file path into another plugin's root."
delivers:
  capability: "A user installs one stage of the architecture lifecycle without installing the other three."
  benefit: "Each pillar releases on its own cadence, and a team that wants only PR narration does not carry the review corpus, the viewer, and the paid-art pipeline."
  beneficiary: [operator, developer]
related:
  - "docs/architecture/adr/ADR-0017-vendored-shared-code-and-bundle-compatibility.md"
---

# ADR-0016 — Five sibling plugins, with the bundle as the only seam

## Context

The plugin ships as one unit. It holds 4 skills, 13 commands, 22 Python
scripts, and 1 HTML viewer. Those parts serve four separate jobs: design
a change, build it, submit and narrate the pull request, and render the
result. A user who wants one job installs all four.

The names have drifted with the scope. The same short words mean
different things in the two skill families, and `CLAUDE.md` now carries a
vocabulary table to keep them apart. A vocabulary table is a symptom. The
words collide because one install surface holds four bounded contexts.

Three facts constrain any split.

The install surface is fixed. No agents, no hooks, and no MCP servers.
This is deliberate, so the plugin never touches another session's
permission surface.

A cached plugin cannot read outside its own directory. The reference
documentation states that paths which traverse outside the plugin root do
not work after installation, because those files are not copied to the
cache. `${CLAUDE_PLUGIN_ROOT}` resolves to one plugin's own cache and
nothing above it. The `dependencies` field in `plugin.json` guarantees
co-installation. It does not grant file access.

The output directory holds content that a rerun cannot replace. It carries
authored narrative prose, paid image generation, and paid text-to-speech
audio. `migrate_bundle.py` already treats this as the primary risk. It
runs its whole ladder in memory over a deepcopy and refuses to write when
an authored field changes outside a declared `touches` set.

## Options considered

Five options came out of a divergent exploration across five frames,
followed by an isolated critic pass. `references/divergent-exploration.md`
governs the procedure.

1. **Abandon the plugin format.** Ship one cloned repository, invoke entry
   points by path, and let a normal Python import handle shared modules.
   Version skew becomes impossible by construction. Rejected: it removes
   skew by removing the install surface, and the install surface is the
   product.

2. **Keep one plugin, organise internally.** Rejected: a directory is not
   installable. This is the status quo, and it is what the split exists to
   change.

3. **Two plugins, one per pillar.** Duplicate the viewer into each.
   Rejected: both pillars write projections the one viewer reads. Two
   copies drift, and the Designs / Pull-requests toggle then depends on
   which plugin last refreshed the file.

4. **Four plugins plus a shared non-plugin directory.** Chosen, and
   extended to five. See the Decision below.

5. **Five plugins with a write-log ledger** that records which plugin
   wrote what, so a person can reconstruct the causal chain after a
   failure. Kept, but demoted. It is forensics, not a contract. It reports
   a mismatch after the mismatch has already been written. ADR-0017 folds
   the useful part of it into the compatibility record.

The critic flagged one trap. An option that shares code by symlink and
adds a single scalar version comparison scores well on fit, and it hides
the hard part. A scalar comparison cannot express a sequenced migration
ladder with per-step `touches` sets. It would give false confidence while
the ladder logic still diverges between two installed copies. ADR-0017
records what replaces it.

## Decision

Split into five sibling plugins in one marketplace repository. None is
nested inside another.

| Plugin | Owns |
|---|---|
| `cobuilder-architect` | design, describe, decisions, review, maintenance, debug, baseline |
| `cobuilder-pr` | generate, assess, review |
| `cobuilder-artifact` | view, publish, and the viewer |
| `cobuilder-implement` | builds an epic from a design |
| `cobuilder-full-lifecycle` | one orientation skill, and the other four as dependencies |

Every plugin name carries the `cobuilder-` prefix. Duplicate-name
validation in `marketplace.json` is scoped to one marketplace file, so two
marketplaces can each publish a plugin named `architect`. Skill namespacing
runs off the bare `name` field, so that collision would be real.

**The bundle is the only seam.** No plugin reads or imports another
plugin's files. `cobuilder-architect` writes `designs.js` and
`adrs.js`. `cobuilder-pr` writes `story.json`, the diffs, the diagrams, and
the audio. `cobuilder-artifact` reads all of it and renders.
`cobuilder-implement` hands off through a git branch and a real pull
request, which is a file-and-state seam, not a call.

**A handoff is allowed. A file reference is not.** The lifecycle does hand
work across pillars. A finished design hands off to `cobuilder-implement`,
and a finished implementation hands off to `cobuilder-pr:generate`. That
handoff names the next mode and stops. The mode reads the design directory
and the bundle for itself. The plugin that handed off never resolves a path
into the other plugin's root, so the handoff survives a version skew that a
path reference would not. This is the line the split enforces: a named mode
is a public interface, and a file path is an internal one.

In domain-driven terms the bundle is a Published Language, not a shared
kernel. Its shape is documented, versioned, and the contract between
contexts. `corpus/principles/ddd/bounded_context_integration.yaml` names
the anti-pattern this avoids: one shared domain package that erases the
boundaries. The shape belongs to the bundle. It does not belong to any
plugin that writes into it.

**Out of scope for this record.** How the plugins share Python and shared
skills, and how they stay compatible across versions, is ADR-0017. That
separation is deliberate. This record establishes that the seam is the
bundle. ADR-0017 makes the seam safe.

## Consequences

- **Positive:** A user installs one stage without the other three.
  `cobuilder-full-lifecycle` still installs the whole family in one
  command.
- **Positive:** The vocabulary collision resolves structurally. The
  architect pillar's `review` and the pull-request pillar's `review` are
  different commands in different namespaces, not two meanings of one
  word.
- **Constraint introduced:** No plugin reads or imports another plugin's
  files. A plugin may hand off to another plugin's mode by name, and the
  state that crosses the handoff travels in the bundle and in `docs/`.
- **Negative / accepted:** Four plugins can be four different versions on
  one machine. Today one plugin writes the bundle, so this failure mode
  does not exist. The split creates it. ADR-0017 answers it, and this
  record does not stand without that one.
- **Negative / accepted:** Shared code must be duplicated into each
  plugin's cache. There is no shared runtime copy, and there cannot be
  one.

## Value delivered

- **New capability:** A user installs one stage of the architecture
  lifecycle without installing the other three.
- **Benefit:** Each pillar releases on its own cadence. A team that wants
  only pull-request narration does not carry the review corpus, the
  viewer, and the paid-art pipeline.
- **Beneficiary:** operator, developer.

## Maps to

Context `cobuilder-packaging`, modules `.claude-plugin/`, `commands/`,
`skills/`, `scripts/`, `viewer/`.

**Flagged:** `docs/architecture/contexts/` does not exist yet, so this
record has no `boundary.yaml` to anchor against. Run
`/cobuilder-architect:describe` for the `cobuilder-packaging` context and
write the boundary record before this ADR moves to `approved`. The
invariant above is the rule that record must carry.
