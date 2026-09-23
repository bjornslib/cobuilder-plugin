# Branch design-cobuilder-viewer-work-prototype

## Problem

The bundle viewer is one committed HTML file with no landing surface. A reader arriving at a bundle meets a route that names a work item, and a route that names none falls through to the error the shell keeps for an unknown id. Nothing lists the bundle's designs, so a reader cannot survey what the bundle holds before choosing one. The typed data layer a board needs does not exist either. The committed file resolves its own joins in the browser, and ADR-0018 already put that work into one derived index.

The viewer is being rebuilt as TypeScript and React under ADR-0023, so the landing surface arrives while the surface is new rather than being retrofitted onto a 4,747-line file. The engineer also cut the program to two surfaces on 2026-09-22, which makes the Work surface the first thing a reader meets and the surface the rest of the narrowed program sits beside.

## Why this approach

The viewer becomes a TypeScript and React program under plugins/artifact/viewer/src/, mounted from src/main.tsx, with the reviewed prototype at src/variations/sections-e/ ported into src/shell/. The shell owns the route. The bare route renders a board of every design, and a route that names a work item renders that item's Work surface. A row is an anchor whose address names a level the design can fill, so a design whose only record is goal.json still opens. The board reads the index through src/data/ and derives no join. Beside the surface, the branch carries the plan that governs the rest of the program: the Gate 3 program design, the Gate 4a slice ladder, four Gate 4b epic designs, and sixteen Gate 4c rubrics.

## Alternatives considered

- **Ship react-viewer and review-flight-deck as two designs, sequenced** — rejected because That order would build the ordering UI against the viewer E5 is about to replace, then rebuild it in React. Someone would also resolve the name collision twice, once informally now and once for real later.
- **Keep ADR-0020 as decided: ordered parts under viewer/src/, concatenated by build_viewer.py, in plain JavaScript** — rejected because Carried from react-viewer's own record unchanged. It fixes file size and fixes nothing about state, and it cannot type the joins that ADR-0018 already computes.
- **Two artefacts: a React application served locally, and a reduced single file for publishing** — rejected because Carried from react-viewer's own record unchanged. It splits the truth. ADR-0001 exists because the served file and the published file are the same file.
- **Build single-pull-request and multi-pull-request mode as one epic** — rejected because Multi-pull-request mode needs the typed data layer and the open-pull-request entity that single-pull-request mode does not. One epic means neither reaches parity before the other's risk lands on top of it.

## Out of scope

- the Reference surface and its prototype
- the describe-on-arrival path
- the whole multi-pull-request mode, and its merge-order simulation and path runner
- the ledger's three state subtypes and its audit
- publish parity
- the workflow-polish carryover and the feedback path
- any change to what the generation scripts write into the bundle
- a new record type, a new join, or a schema version bump beyond OpenPullRequest
- the diff view's own rendering, which the team ports as it stands
- publishing a Notion target, which stays a reserved flag value

## Risks

- a contributor now needs Node and npm to change the viewer, which the repository has never required
- a committed build artifact goes stale the moment somebody edits the output instead of the source, and the committed index.html is absent from this diff while 131 source files are in it
- a byte-equal rebuild depends on a pinned toolchain, and a version drift makes the guard test fail for the wrong reason
- the React runtime is inlined into every published Artifact, which spends part of the 16 MiB budget
- the viewer no longer reaches its data at a relative path, because the built file requests an absolute one

## How this was tested

The viewer suite runs under vitest in plugins/artifact/viewer/: 61 tests across 7 files, all passing, with tsc --noEmit clean. Two slices were validated in a real browser through the ChromeDevTools MCP tools. Slice 6, the board, scored 1.00 across nine criteria, and slice 7, a row opening the Work surface, scored 1.00 across five. The browser checks measured the document never scrolling, the board's pane owning the scroll, one box on screen per paged level, no console message at any level, and no failed request. Two defects were found by those checks and fixed: the board's pane had no definite height on any route, and a diagram tile rendered a raw Mermaid comment as its title.

## Where to focus

- the committed viewer and the React source can drift today, because E2 has not landed and no test compares the two
- the board's address rule repeats levelsOf's Intent rule and gatesOf's Build rule, in two files
- a slice's score has two sources, and only the status checklist has a reader
- the rubrics generator holds its slice count as the constant 14 and defaults to the wrong rubrics directory, so this plan's sixteen rubrics reach no page
- E1's exporter seam must land before any bundled output, or publishing breaks silently

---

_Intent inferred from the PR body, the commit messages, and the branch name. Not stated by the author._
_Authorship: agent-assisted._
