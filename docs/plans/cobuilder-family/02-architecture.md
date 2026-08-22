# Architecture: the cobuilder family

Gate 2. Written from three inputs, each of which stays readable on its own:

- `02a-artifact-map.md` — every artifact, its format, its reader, its
  transport, and whether that reader can answer.
- `02b-view-designs.md` — the surface designs and the reply channel.
- `02c-record-model.md` — the entities, their identity, and where records live.

Two further documents sit outside this plan and govern it. `CLAUDE.md`'s
Vocabulary table settles the words. `.lavish/cobuilder-vocabulary.html` records
the ten naming and structure decisions this work rests on.

Five decision records govern this architecture:

| Record | State | Covers |
|---|---|---|
| ADR-0016 | approved 2026-08-21 | five sibling plugins, the bundle as the only seam |
| ADR-0017 | approved 2026-08-21 | vendored shared code, the compatibility gate |
| ADR-0018 | approved 2026-08-21 | one lifecycle surface, the record index |
| ADR-0019 | approved 2026-08-21 | anchored comments, the durable ledger |
| ADR-0013 | approved | a branch may carry more than one design |

## Fit

This work touches every part of the repo except the corpus.

**Packaging.** One plugin becomes five in one marketplace repository:
`cobuilder-architect`, `cobuilder-pr`, `cobuilder-implement`,
`cobuilder-artifact`, and `cobuilder-full-lifecycle`. A `shared/` directory at
the marketplace root holds the four bundle-core modules and the two shared
skills, symlinked into each plugin and dereferenced into its own cache at
install.

**The seam.** No plugin reads or imports another plugin's files. They
integrate by reading and writing one bundle directory. In domain-driven
terms the bundle is a Published Language, not a shared kernel.

A plugin may still hand off to another plugin's mode by name, and the
lifecycle depends on that: a finished design hands off to
`cobuilder-implement`, and a finished implementation hands off to
`cobuilder-pr:generate`. The handoff names the mode and stops. The next mode
reads the design directory and the bundle for itself. A named mode is a
public interface. A file path into another plugin's root is not.

**The surface.** `viewer/index.html` grows from two modes to five: Designs,
Pull requests, Decisions, Contexts, Builds. It reads one new projection,
`data/index.json`, which subsumes `adrs.js` and `designs.js`.

**The reply channel.** The comments drawer at `viewer/index.html:705` is
upgraded rather than replaced. Its anchor widens from a whole level to a
computed selector plus a DOM range, and its clipboard hand-off gains a ledger
behind it.

**Untouched.** The corpus under `skills/architecture/references/corpus/`, the
Gemini art and audio pipeline, and the four-level narrative model.

## The one thing that is measured and must be planned

**33 cross-pillar path references would break under ADR-0016.**

Twenty-two point from `skills/architecture/` into `skills/odyssey/`. Eleven
point the other way. Counted on 2026-08-21.

Most are prose citations that would merely go stale. Several resolve at
runtime and would fail silently:

- `skills/architecture/SKILL.md:222` → `${CLAUDE_PLUGIN_ROOT}/skills/odyssey/references/diagram-mode.md`
- `skills/odyssey/references/decision-records-lite.md:21` → `${CLAUDE_PLUGIN_ROOT}/skills/architecture/SKILL.md`

After the split, `${CLAUDE_PLUGIN_ROOT}` resolves to the caller's own cache.
Each of these resolves to nothing.

**Five more references are safe**, and the difference is the point. They point
at `${CLAUDE_PLUGIN_ROOT}/skills/ste-writing/` and `/skills/mermaid/`, and
ADR-0017 vendors both into every plugin. So the rule is not "cross-skill
references break". It is **cross-pillar references break, vendored shared
skills survive**. That is the line ADR-0017 draws, now measured rather than
argued.

None of this breaks today, because everything ships in one plugin. It was
invisible until a boundary record forced the question. Several of these
references were created during this session, when the design-mode move
rewrote bare `references/x.md` paths into `skills/odyssey/references/x.md`.
That was the right fix for a one-plugin repo and it is the wrong shape for a
five-plugin one.

## Data

### The index

`<bundle-dir>/data/index.json` plus `index.js`. Derived, full rebuild, never
authored. Built by `build_index.py`, which replaces `build_adrs.py` and
`build_designs.py`.

Entities and their identity:

| Entity | Id | New |
|---|---|---|
| `adr` | `ADR-NNNN` | |
| `design` | directory name | |
| `context` | directory name | |
| `epic` | `<design>/<epic-id>` | scoping is new |
| `pull_request` | integer | |
| `slice` | `<feature>/<n>` | |
| `boundary_rule` | `<context>/<kind>/<n>` | yes |
| `comment` | ulid | yes |
| `publication` | page path | |

A boundary rule carries a `kind`: `forbidden-dependency`, `module-invariant`,
or `context-map`. Three shapes, one question — what may cross this boundary.

### Realisation is derived

The index holds `pull_request.state` as `open`, `merged`, or `closed`. An ADR
reaches its pull request through `source_pr`, or through the design and epic
that delivered it.

An ADR's state machine describes the lifecycle of the decision. Whether the
code matches it is a different axis and is read from git. No ADR state is
added for it. This makes an approved-but-unshipped decision visible, which
matters immediately: ADR-0016 describes a target state that 33 references
currently contradict.

### Freshness

The index records a content hash per `docs/` subtree plus the git head. Any
mode that reads it compares first and rebuilds on a mismatch, in the same
place `migrate_bundle.py` already runs.

### Comments

`<bundle-dir>/feedback/threads.ndjson`. Append-only. A read never deletes.

A comment is the first record that is neither authored in `docs/` nor
derivable from it, so it comes under the migration guard from the first
commit.

## Flow

**Design.** `architect:design` writes a design directory and an ADR. When the
design needs a verified region to anchor against and no context covers it,
design mode calls Describe for itself and writes the context bundle. A person
does not schedule that step and does not need to know it ran. The boundary
record declares `governed_by`, the reverse of the ADR's anchor, and
`verifies`, the districts it covers. Both halves of both joins are populated
for the first time.

**Build.** `implement` runs four gates and then slices, writing to
`docs/plans/<feature>/`. `00-status.md` drives the Builds view.

**Submit and narrate.** `pr:generate` interviews the author, assesses the
change against the bundle, writes the narrative, and opens the pull request.
`pr:review` narrates the merged history afterwards.

**Index.** `build_index.py` rebuilds `index.json` from all of the above plus
git.

**Present.** `artifact:view` serves it. `artifact:publish` exports it.
`collaborate-with-user` renders a gate or a decision as its own page.

**Answer.** A reader comments on any surface. The thread appends to the
ledger. A background command blocks until the ledger grows, then exits, and
the harness re-invokes the session. The agent answers into the same thread
with `author: agent`, so the reply sits beside the sentence that prompted it
rather than in a chat session the reader is not watching.

## External

No new external service. No account. No daemon beyond the `view` server that
already exists.

Env var names unchanged: `GEMINI_API_KEY` for art and audio, unused by every
part of this work.

Rejected, and worth recording as rejected: Postgres, because it is a service.
A local SQLite index, because the viewer cannot read it without a WASM build.
The lavish CLI, because it needs Node 22, `npx`, and a background Express
server.

## Epics

Seven, revised from `plugin-split/goal.json`, which is the source of record.
An epic is a body of work that maps to one pull request. `04-slices.md` breaks
each into vertical, testable slices.

| Epic | Work | Slices |
|---|---|---|
| E1 | One plugin becomes five: the renames, the deleted duplicate command, the 33 cross-pillar references, the five manifests, and the two ports. | 4, 5, 6, 7 |
| E2 | Shared code survives an install. A spike, because `abort_if` names its failure as a reason to stop. | 1 |
| E3 | The seam is version-safe: `require_compatible()`, `min_reader_schema`, the generators map, schema 1.3. | 2, 3 |
| E4 | The record index: `build_index.py`, every entity, every join. | 8, 9 |
| E5 | One lifecycle surface: the three new modes, the Backlog lane, and pages moved into the bundle. | 10, 11 |
| E6 | The reply channel: the ledger, the projection, the anchor, the endpoint, the wake command. | 12, 13, 14 |
| E7 | Threads read as conversations. Deferred past E6 on purpose, so it carries no slice. | none |

An epic with a null branch is a backlog item, so the backlog needs no file of
its own. The Builds view's Backlog lane is a query over that list.

## Least confident decisions

1. **The symlink dereference for a directory of Python.** Documented for a
   meta-plugin's `skills/` directory, not for code a skill later runs through
   `${CLAUDE_PLUGIN_ROOT}`. E2 exists to find out. The fallback is a copy step
   before publish.
2. **Five modes in one viewer.** The prototype at
   `.lavish/decisions-register.html` proves the data supports a Decisions
   view. It does not prove the mode switch stays navigable at five.
3. **A selector anchor surviving a regenerated page.** `quote` is the recovery
   path, and it is human-readable rather than automatic.
4. **The background poll as the wake path.** It is the only one the install
   surface allows. It has not been run here.

## Resolved since the first draft

**The write endpoint lands with the anchor, inside E6.** The draft left this
open. It is closed. The local viewer is where the reading happens, and a
comment held in `localStorage` before the ledger exists has no id and no
migration guard. Deferring the endpoint defers the only half that matters.
See ADR-0019.

**A district joins to a context.** A boundary record declares `verifies`,
naming the districts it covers. Without that edge the inferred layer carried
no weight, and the 15 ADRs anchored to a district resolved to nothing. With
it, an existing anchor starts resolving, and a district no context covers
becomes the describe backlog. See ADR-0018.

## Prior art

Hindsight was unavailable at H1 and again at H2 — the tools are advertised in
this session but not registered. Two substitutes were read and are cited in
`01-product.md`. Both shaped the work: *ask the author, do not infer* became a
success metric, and *the viewer stays build-free* is the constraint that ruled
out SQLite.
