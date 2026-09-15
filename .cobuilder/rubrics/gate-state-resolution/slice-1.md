# Rubric: Slice 1 — Tracer bullet: the static page resolves the state and the document

Feature: `gate-state-resolution`
Epic: E1 — Two renderers read one gate state
Slice goal: The static builds page opens only a document that the plan holds, labels every document it names, and reads an `n/a` gate as closed.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — The page opens no document the plan does not hold [CRITICAL]

**Must be true:** The document the page opens on is either `null` or a
document that the plan holds. When the plan holds no document for the open
gate, the page states that in place of an empty body, and it prints no
approval prompt above nothing.

**Evidence to check:** Call `current_doc()` in a Python session over four
shapes and print the result:

1. an open gate whose document is present
2. an open gate whose document is absent
3. every gate resolved, the last gate holding a document
4. every gate resolved, the last gate holding none

Shapes 2 and 4 must return `None` for the document, and shapes 1 and 3 must
return a member of the second argument. Then generate the page for this
repository's `skill-collision-fix` plan, which holds only `00-status.md`, and
read the emitted lines. The `cur` line must carry `null` for the document, and
the `go(` call must pass `null`. Then open that page in Chrome and read it: no
document body, a statement that the gate holds no document, and no approval
prompt. A unit test alone does not satisfy this criterion.

**Scoring:** 1.0 = every shape returns a held document or `null`, and the
opened page states the missing document. 0.5 = the function is correct but the
page shows an empty body or the prompt above nothing. 0.0 = the page still
opens an absent document.

### C2 — The static page names the Gate 2b document [CRITICAL]

**Must be true:** A plan that holds `interaction-design.md` draws a rail button
labelled with a real title. The text `undefined` appears nowhere in a rendered
page. A pending Gate 2b draws an approval note that is not empty.

**Evidence to check:** Generate the page for a plan holding
`interaction-design.md`, read the emitted `var TITLE=` line, and confirm it
carries a non-empty string for that file name. Open the page in Chrome and
read the rail: the sub-document button under Gate 2b reads a human title, and
the page text holds no `undefined`. Separately read `ASK_NOTES` and confirm it
names Gate 2b.

**Scoring:** 1.0 = the emitted title map covers the Gate 2b document, the
rendered rail shows the title, and the ask note exists. 0.5 = the title is
present but the ask note is empty, or the reverse. 0.0 = a rendered page still
contains the text `undefined`, or the rail button carries no label.

### C3 — An `n/a` gate reads as closed in the static page

**Must be true:** A gate whose state starts with `n/a` draws a treatment apart
from a gate that is not started, and apart from an approved gate. Its status
text does not read "In progress", and its pill does not carry the waiting
class.

**Evidence to check:** Read `cls()` and confirm the state prefix `n/a` returns
its own class, and that a CSS rule exists for that class. Open a page for a
plan with an `n/a` gate in Chrome and read the class list and the pill class
of that gate's rail entry. Confirm no entry for that gate reads "In progress"
and none carries the `wait` pill class.

**Scoring:** 1.0 = the class, the CSS rule, and the rendered reading are all
present and distinct. 0.5 = the class and the CSS rule exist but the page
still prints a waiting label. 0.0 = an `n/a` gate still renders as a gate that
is not started.

## Regression check

- `uv run --with pytest pytest tests/ -v` reports no failure beyond the four
  pre-existing `PIL` WebP failures. A fifth failure fails this slice.
- The generator writes the tracked page for `cobuilder-family` and for
  `gate-doc-surfacing` and prints "5 gates" for `interaction-design-gate`.
- An approved gate still draws the approved treatment, and a gate that waits
  still draws the waiting treatment.
- Every plan in `docs/plans/` opens on a document it holds.

## Out of scope

- The viewer rail. Slice 2 owns `plugins/artifact/viewer/index.html`.
- The rule that decides which gate counts as current. The viewer marks the
  last gate and the static page opens the first gate that waits. Both rules
  stay as they are.
- The length of an `n/a` state line. The reason text is long for a pill, and
  shortening it is a separate question.
- `shared/build_index.py`. It already projects the state, the document, and
  the document kind.
- A gate line that writes `not applicable` instead of `n/a`. The prefix `n/a`
  is the contract, and `verify_gate.py` already requires it.
