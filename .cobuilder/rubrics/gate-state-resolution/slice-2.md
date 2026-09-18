# Rubric: Slice 2 — Real content and edge cases: the viewer rail resolves the state and the count

Feature: `gate-state-resolution`
Epic: E1 — Two renderers read one gate state
Slice goal: The viewer gate rail reads an `n/a` gate as closed and states the number of approved gates out of the total.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — The viewer rail describes an `n/a` gate as closed [CRITICAL]

**Must be true:** A gate whose state starts with `n/a` draws a card class apart
from a gate that is not started and apart from an approved gate. Its card text
does not read "In progress". Its status pill does not carry the waiting class.
The pill keeps the state text that `00-status.md` holds.

**Evidence to check:** Read the rail template in
`plugins/artifact/viewer/index.html` and confirm the state prefix `n/a`
selects its own card class, its own pill class, and the words "Not
applicable". Open the viewer's Builds mode in Chrome on a fixture that holds
an `n/a` gate, and read every `.gate-card`: the `n/a` card's class list, its
descriptive text, and its pill class. Confirm the class list is not the
planned class, the text is not "In progress", and the pill class is not the
waiting class. A real click or a real read of the rendered page is required.
A synthetic element click is not evidence.

**Scoring:** 1.0 = the card class, the pill class, and the descriptive text
all read as closed, and the pill keeps the state text. 0.5 = one of the three
still reads as open or as waiting. 0.0 = an `n/a` gate still renders as a gate
that is not started.

### C2 — The rail header states the approved count out of the total [CRITICAL]

**Must be true:** The header of the gate rail states the number of approved
gates and the total number of gates. The first number counts only gates whose
state starts with `APPROVED`.

**Evidence to check:** Read the rail header expression in
`plugins/artifact/viewer/index.html`, and confirm it counts approved gates
rather than every card. Open the viewer's Builds mode in Chrome on a fixture
with at least one non-approved gate, and read the header text against the
cards: the first number matches the count of cards whose state starts with
`APPROVED`, and the second number matches every card.

**Scoring:** 1.0 = the header states both numbers and the first number counts
approved gates only. 0.5 = the header states both numbers and the first is
still the total. 0.0 = the header still claims that every gate is approved.

## Regression check

- `uv run --with pytest pytest tests/ -v` reports no failure beyond the four
  pre-existing `PIL` WebP failures. A fifth failure fails this slice.
- An approved gate keeps its card class, its pill class, and its approved
  date.
- A gate that waits keeps its card class and its waiting pill.
- `tests/test_viewer_modes.py` still passes for the five mode buttons and for
  the decisions and contexts modes.

## Out of scope

- The static builds page and its generator. Slice 1 owns
  `plugins/artifact/scripts/build_builds_view.py` and
  `.cobuilder-architect/self/pages/builds-view.html`.
- `shared/build_index.py`. This slice reads the projected records and changes
  no projection.
- The rule that decides which gate counts as current. This slice adds no rule
  and removes none.
- The length of an `n/a` state line in the pill.
- The gate-doc sheet. Slice 6 of `interaction-design-gate` owns it.
