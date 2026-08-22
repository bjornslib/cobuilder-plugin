# Slices: the cobuilder family

Gate 4a. One line per slice in build order. Every slice ends in a working,
testable state. Every slice declares the epic it advances, which is the join
Gate 3 found missing.

Test command: `uv run --with pytest pytest tests/ -v`

Rubrics: `.cobuilder/rubrics/cobuilder-family/slice-N.md`, written before any
implementation exists.

## The ladder

Six epics carry fourteen slices. A seventh epic is deferred and carries none.
An epic is a body of work that maps to one pull request. A slice is one
vertical, testable step inside it. This table groups slices under the epic
that owns them. Build order does not match table order — see the note below
the table.

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`plugin-split/E1` — One plugin becomes five.** The mode renames, the deleted duplicate `explore-design` command, the 33 cross-pillar references, the five manifests, and the two ports. The rename is a rotation, not a split. | | | | |
| 4 | `plugin-split/E1` | Renames inside today's single plugin | Six architecture modes, `explore-design` deleted, `submit` renamed to `generate`, and the old `generate` renamed to `review` | 1.00 | completed |
| 5 | `plugin-split/E1` | The 33 cross-pillar references are fixed | The grep regression test passes while the repo is still one plugin | 1.00 | completed |
| 6 | `plugin-split/E1` | Five plugins, five manifests | `claude plugin validate` passes on each, and the family installs | 1.00 | completed |
| 7 | `plugin-split/E1` | The two ports land | `cobuilder-implement` renamed and shipped, `collaborate-with-user` folded in, the orientation skill written | 1.00 | completed |
| | **`plugin-split/E2` — Shared code survives an install.** Prove the marketplace symlink dereference, then vendor the four bundle modules and the two shared skills. | | | | |
| 1 | `plugin-split/E2` | **Tracer bullet: two plugins, one shared module** | Two throwaway plugins install from a local marketplace and both resolve the shared module from their own cache | 1.00 | completed |
| | **`plugin-split/E3` — The seam is version-safe.** `require_compatible()`, `min_reader_schema`, the generators map, bundle format 3, and schema 1.3. | | | | |
| 2 | `plugin-split/E3` | The compatibility gate exists | `require_compatible()` and `stamp_generator()` pass their tests, called by nothing yet | 1.00 | completed |
| 3 | `plugin-split/E3` | The gate is wired and the bundle migrates | Format 3, `min_reader_schema`, the generators map, every writer gated | 1.00 | completed |
| | **`plugin-split/E4` — The record index.** `build_index.py` replaces the two projection scripts and resolves every join, including an ADR to its pull request. | | | | |
| 8 | `plugin-split/E4` | The index holds the entities | `build_index.py` emits every entity, and the two scripts it replaces are gone | 1.00 | completed |
| 9 | `plugin-split/E4` | The index resolves the joins | `adr_to_pull_request`, `slice_to_epic`, `district_uncovered`, and freshness | 1.00 | completed |
| | **`plugin-split/E5` — One lifecycle surface.** The Decisions, Contexts, and Builds modes, the Backlog lane, and generated pages moved into the bundle. | | | | |
| 10 | `plugin-split/E5` | The Decisions and Contexts modes | A person browses every decision and every context, with the anchor distinction visible | 1.00 | completed |
| 11 | `plugin-split/E5` | The Builds mode and the Backlog lane | Gates driven by the status document, the Backlog lane computed from the index, pages moved into the bundle | 0.92 | completed |
| | **`plugin-split/E6` — The reply channel.** The append-only ledger and its projection, the anchor computed from the live DOM, the write endpoint, and the background wake command. | | | | |
| 12 | `plugin-split/E6` | The ledger and its projection | Append, fold, and project, with no server involved | 0.92 | completed |
| 13 | `plugin-split/E6` | The anchor and the write endpoint | Click to anchor a sentence, `POST /feedback` appends, the drawer keeps the text in view | 1.00 | completed |
| 14 | `plugin-split/E6` | The wake command and the whole loop | The background command blocks and returns new threads, and the loop runs once end to end | 1.00 | completed |
| | **`plugin-split/E7` — Threads read as conversations.** The drawer renders a reply under the comment it answers. Deferred, and carries no slice yet. | | | | |

Every epic header row carries the scoped id `<design>/<epic-id>`, not the
bare `E1`. Three designs in this repository each name an epic `E1`, so a bare
id does not identify one. A reader and a script must both resolve it without
guessing.

Build order is slice 1 first, then 2 and 3, then 4 through 7, then 8 through
14. This is not the table order above. The table groups slices by the epic
they advance, and the build runs slices 2 and 3 (`E3`) before slices 4
through 7 (`E1`).

**E2 carries one slice on purpose.** It is a spike, not a feature. Its whole
job is to answer a question that `goal.json.abort_if` says can stop the
build, and a spike that needs a second slice is no longer a spike.

## Why this order

**Slice 1 is the tracer bullet and it is also the riskiest thing in the
build.** ADR-0017 rests on a symlink dereference that nobody has run, and
`goal.json.abort_if` names that failure as a reason to stop. Two throwaway
plugins that print a constant prove the mechanism in an afternoon. Everything
after slice 1 assumes it works, so it goes first and alone.

**Slices 2 through 5 stay inside today's single plugin.** The compatibility
gate, the renames, and the 33 references are all changes that can land, be
tested, and be merged before the directory split makes every path move.
Doing them after the split would mean debugging a rename and a packaging
change in the same diff.

**Slice 5 before slice 6, deliberately.** The regression test that proves no
cross-pillar reference survives is written and passing while the repo is
still one plugin. It then guards the split rather than reporting on it.

**Slices 8 through 11 are vertical, not horizontal.** Slice 8 ships entities
with no joins and a viewer that reads them, so there is something to look at.
Slice 9 adds the joins. Slice 10 adds the two modes that read them, and slice
11 adds the mode that needs the joins most. Building all of the index, then
all of the viewer, is the banned shape.

**The Backlog lane is a required part of slice 11, not polish.** It is the
one place a person sees what is planned and not started, and it is a query
rather than a file: every epic with a null branch, plus every slice not yet
scored. A Builds view without it shows only what is finished, which is the
half a person does not need to plan from. This slice also proves the epic to
slice join, because the lane cannot be built without it.

**Slice 12 has no server in it.** The ledger, the fold, and the projection
are file operations and they are testable without HTTP. Slice 13 adds the
server and the anchor, and slice 14 adds the wake command. Splitting here
keeps the one slice that changes what `view` mode *is* as small as it can be,
and it keeps the end-to-end run as its own acceptance step.

## Out of scope for every slice

- Rendering a thread as a conversation. That is E7.
- Merging viewer threads with the Artifact platform's threads into one inbox.
  Gate 3 records that this would need its own ADR.
- Any change to the corpus, the Gemini art pipeline, or the audio pipeline.
- `--format notion`. It stays a reserved flag value with nothing behind it.

## Escalation

`max_attempts: 3` per slice, then escalate rather than loop. An escalated
slice is recorded in `00-status.md` with the reason and the follow-up, and it
is never silently accepted below threshold.
