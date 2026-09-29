# Five sibling plugins, with the bundle as the only seam

The design mode's record for this split, carried into the tree by PR 11
("Design cobuilder-architect and cobuilder-implement, split repo into five
plugins and skills") and amended by PR 17. This draft is the written form of
what those PRs landed: one plugin doing four jobs became five, each doing
one.

## What this changes

`cobuilder-plugin` used to be one install surface holding four bounded
contexts: the architecture skill, the odyssey review corpus, the artifact
viewer, and the implement pipeline. A user who wanted pull-request
narration installed the review corpus, the viewer, and the paid-art
pipeline as well. The names collided because nothing in the packaging kept
the contexts apart — it took a vocabulary table in CLAUDE.md to stop the
same short words meaning two things, and a vocabulary table is a symptom.
So the design splits the install surface along the seam the words were
already drawing.

Five sibling plugins now share one marketplace repository, none nested
inside another:

| Plugin | The one job it does |
|---|---|
| `cobuilder-architect` | Design, review, maintenance, decisions, describe, debug — the architecture skill, self-only |
| `cobuilder-pr` | Baseline, review, generate — five history modes plus generate |
| `cobuilder-artifact` | View and publish the bundle |
| `cobuilder-implement` | Builds a design's epics, runs `verify_gate.py` |
| `cobuilder-full-lifecycle` | The umbrella: one orientation skill, depends on the other four |

No plugin reads or imports another plugin's files, though a plugin may hand
off to another plugin's mode by name. They integrate only by reading and
writing the bundle directory — which becomes a Published Language rather
than a shared kernel: its shape is documented and versioned, and it belongs
to no plugin that writes into it.

## Why the bundle is the seam, and how it holds

A cached plugin cannot read outside its own directory, and
`CLAUDE_PLUGIN_ROOT` resolves only to that plugin's own cache — so
plugins cannot reach each other's scripts, by design. Shared Python and
shared skills travel instead by a marketplace-level `shared/` directory,
symlinked into each plugin and dereferenced into its own cache at install.

Splitting the writer means the bundle can now meet four different versions
of itself on one machine. Two gates answer that without a write-log ledger
recording mismatches after the fact:

- `require_compatible()`, in the module every plugin vendors, runs at every
  entry point that writes into a bundle.
- `bundle.json` carries `min_reader_schema` and a generators map — the
  floor and the writers — instead of one scalar, so the gate can express a
  sequenced ladder with per-step touch sets.

The rename inside PR 11 was a rotation, not a split: `odyssey submit`
becomes `cobuilder-pr:generate`, and the old generate, which narrates
merged history, becomes `cobuilder-pr:review`. PR 17 later dropped the
`cobuilder-` prefix from the four non-umbrella plugins, since it duplicated
the marketplace repo's own name — and caught the second-order bug that two
plugins already shipped a skill folder named after themselves, fixed by
renaming the colliding skill folders.

## The cost, stated plainly

Four independently-installed plugins can now disagree about the bundle's
shape, which one writer could never do. That cost is paid for, deliberately,
in the compatibility gate and the schema floor rather than in prose.
Install-time symlink dereference of a `shared/` directory of Python that a
skill later runs remains the design's named doubt: the marketplace
documents the mechanism for a skills directory, and the worked example is a
meta-plugin's `skills/`, not a directory of scripts. The fallback — copy
before publish — stays as the abort-tolerant answer if the dereference
proves worse than staying one plugin.

## How it lands

| Epic | Outcome |
|---|---|
| E1 | One plugin becomes five. The mode renames, the deleted duplicate explore-design command, the 33 cross-pillar references, the five manifests, the two ports. PR 11, four slices. |
| E2 | Shared code survives an install: the marketplace symlink dereference is proven, then the four bundle modules and the two shared skills are vendored. PR 11, one slice — a spike whose result decides whether the rest of the design stands. |
| E3 | The seam is version-safe: `require_compatible()`, `min_reader_schema`, the generators map, bundle format 3, schema 1.3. PR 11, two slices. |
| E4 | The record index: `build_index.py` replaces the two projection scripts, emits every entity with a stable id, resolves every join including an ADR to its pull request. PR 11, two slices. |
| E5 | One lifecycle surface: Decisions, Contexts, and Builds modes, the Backlog lane, and generated pages moved out of the foreign directory into the bundle. PR 11, two slices. |
| E6 | The reply channel: the append-only ledger and its projection, the anchor computed from the live DOM, the write endpoint, the background wake command. PR 11, three slices. |
| E7 | Threads read as conversations; the drawer renders a reply under the comment it answers. Deferred past E6 on purpose — E6 ships the record shape, so this epic adds no migration and carries no slice yet. |
| E8 | The `cobuilder-` prefix drops from the four non-umbrella plugins. PR 17, with the skill-folder collision it exposed fixed in the same epic. |

E2 is first after the packaging split on purpose: it is the spike that
decides whether the split stands at all, and `goal.json`'s `abort_if` names
its failure. E7 stays unplanned until E6's shape has a reader.

## What reviewers should look at

1. The five manifests against the marketplace root's one list (level 1,
   the container drawing).
2. The design-mode → implement handoff: intent captured before code
   exists, gates checked by script rather than prose (level 2, the build
   sequence).
3. The vendored-seam classes: `_bundle_meta.py`, `build_index.py`,
   `migrate_bundle.py`, `verify_gate.py`, and what each resolves through
   the `shared/` symlink (level 3, the data model).
4. `ADR-0016`'s install-surface rule and its addendum on the rename
   collision; `ADR-0015`, `ADR-0017`, and `ADR-0006` for the record index,
   the ledger, and the lifecycle decisions behind E4–E6.

## Not in scope

No change to what each plugin's commands do once installed — the split is
packaging, not behavior, and the 558-file move carried most files
unchanged. No new viewer surface; the viewer split is recorded as a plan in
its own design (`maintainable-viewer`). The one-tag release discipline is
policy, not mechanism. And the reply channel's conversations-in-a-drawer is
E7, which this design defers rather than builds.