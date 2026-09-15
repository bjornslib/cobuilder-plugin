# Product: Gate state resolution

## Problem

A gate line in `00-status.md` carries one of three meanings. It reads
`APPROVED`, it reads `n/a`, or it still waits for an answer. Two Builds views
read those lines. Neither view resolves the three meanings.

**Fault 1 — an `n/a` gate reads as unfinished.** The static builds page maps
an `n/a` gate to its `todo` class, which draws the gate as not started. The
viewer's gate rail maps an `n/a` gate to its `is-planned` class, and it prints
the words "In progress" beside the gate. Both readings are wrong. An `n/a`
gate is closed, and no work follows it.

`skill-collision-fix` shows this fault today. Its Gate 1 line reads
`n/a, superseded by direct conversation record`, and the rail describes that
gate as in progress.

**Fault 2 — the page opens a document that is not there.** A gate can hold no
document. Gate 2b became a real gate on 2026-09-14, and it is the first gate
that can read `n/a` and still name a document.

`current_doc()` in `plugins/artifact/scripts/build_builds_view.py` chooses the
document the page opens on. When every gate reads resolved, the function names
the last gate and its first expected document. That document need not exist.
The page then opens on an empty body and prints the approval prompt above it.

`skill-collision-fix` shows this fault today. Its page opens on
`04-slices.md`, and the plan holds only `00-status.md`. A plan that waits at
Gate 2 shows the same fault when `02-architecture.md` is not written yet.

**Fault 3 — an unknown document reads as `undefined`.** The generator writes a
title map from `TITLES`. That map holds no entry for `interaction-design.md`,
which Gate 2b names. The rail then prints the text `undefined` as the label of
that document.

**Fault 4 — the rail header counts every gate.** The viewer's rail header
reads "5 Gates Approved" over a rail that holds one approved gate. The count
gathers every card, and the label names approval.

## Success metric

A person reads one plan and answers three questions without opening a second
file. Which gates are closed? Which gate still waits? Which document belongs
to this gate?

Measured this way:

1. `skill-collision-fix` opens on a document it holds, or on no document and
   a stated reason. No empty body, and no approval prompt over nothing.
2. A plan that holds `interaction-design.md` draws a rail button labelled
   "Interaction design". The text `undefined` appears nowhere in a rendered
   page.
3. Every `n/a` gate carries a closed treatment. No line of either view prints
   "In progress" or "not started" beside it.
4. The viewer header reads the number of approved gates out of the total.

Each of the four is a browser reading on a seeded fixture, not a unit test
alone.

## Announcement — the blog post before the feature

Two views of one plan disagreed with the plan. One printed a gate as in
progress that was closed, and one opened a document that did not exist. Both
read the same three-word status line. The fix is one predicate that names the
three meanings of a gate state, and one rule that a view shows only the
documents a plan holds.

## Screens

No new screen. One existing screen changes its gate labels and its document
selection: the Builds view, which ships twice. The viewer edition lives at
`plugins/artifact/viewer/index.html`. The static edition is written by
`plugins/artifact/scripts/build_builds_view.py`.

No new control, no new flow, and no new state. The three gate meanings already
exist in the `00-status.md` line, and `verify_gate.py` already reads them.
