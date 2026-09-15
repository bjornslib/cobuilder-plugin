# Epic E1 design: Two renderers read one gate state

## Scope and Intent

This epic repairs the two Builds views. Both read the same gate line, and both
resolve it wrongly.

The Builds view ships twice. The viewer edition is one page in the artifact
plugin. The static edition is generated from a plan and served on its own. A
person who opens either page must read the same three answers: which gates are
closed, which gate waits, and which document belongs to a gate.

One predicate carries the meaning of a gate state. `is_resolved(state)` holds
the test, so one place decides that an `n/a` gate is closed. The static page
calls it through `current_doc()`. The viewer rail tests the state prefix in
its own template.

The epic adds no gate, no document type, and no schema field. It changes what
two renderers print.

## Files Touched

| File | Change |
|---|---|
| `plugins/artifact/scripts/build_builds_view.py` | Add `is_resolved()`. Give `current_doc()` the filtered document map, and let it return no document. Name a title and an ask note for the Gate 2b document. Rename the summary clause. |
| `.cobuilder-architect/self/pages/builds-view.html` | Add the `na` gate treatment, guard the crumb, key the prompt on the gate, and state when a gate holds no document. |
| `plugins/artifact/viewer/index.html` | Add the `is-na` card class, the `na` pill class, and the words "Not applicable". Count approved gates in the header. |
| `tests/test_build_builds_view.py` | Cover the four shapes of `current_doc()`, the predicate, and the summary clause. |
| `tests/test_viewer_modes.py` | Cover the `n/a` treatment and the header count. |

No file outside those five changes. `shared/build_index.py` already projects a
gate state, a document, and a document kind.

## Types & Signatures

```python
def is_resolved(state: str) -> bool
def current_doc(
    gates: list[dict], present: dict[str, list[str]]
) -> tuple[str, str | None, bool]
```

```javascript
// .cobuilder-architect/self/pages/builds-view.html
function cls(g)                        // g.state gains the 'na' branch
function go(gate, doc)                 // doc may be null
function buildRail()                   // TITLE[f] may fall back to the file name
```

```javascript
// plugins/artifact/viewer/index.html
const isNa = /^n\/a/i.test((g.state || '').trim());
const statusClass = ...
const pillClass = ...
const approvedGates = ...
```

## Slice Decomposition

Slice 1 is the tracer bullet. It walks one document from the generator to the
screen. It proves the whole path: the parser, the filter, the fence rewrite,
and the render. It ends on the static page for a plan that holds only
`00-status.md` and `interaction-design.md`.

Slice 2 repeats the shape in the second renderer. The viewer reads the
projected records and not the generator, so the work is a template change and
a count.

The two slices share no file, so one agent holds each of them. Slice 2 does
not wait for slice 1.

## Test Plan

| Level | What it proves |
|---|---|
| Unit | `current_doc()` returns a document the plan holds, or `None`. `is_resolved()` accepts `APPROVED` and `n/a` and rejects `pending`. |
| Unit | The summary clause reads "no gate awaiting an answer", and not "all gates approved". |
| Page | The generator writes `null` for a missing document, and never the text `None`. |
| Browser | The static page for `skill-collision-fix` opens no absent document. The static page for a plan holding `interaction-design.md` labels the rail button "Interaction design". |
| Browser | The viewer rail describes an `n/a` gate as "Not applicable", and its header reads the approved count out of the total. |

Every browser reading runs on a seeded fixture under `/tmp`. No test writes
the tracked bundle.

## Risks & Open Questions

**The rail and the page disagree about "current".** The viewer marks the last
gate as current. The static page opens the first gate that waits. This epic
changes neither rule. The difference is recorded for a later decision.

**An `n/a` state is free text.** `00-status.md` allows `n/a` followed by any
reason. Both renderers test the prefix `n/a` and nothing more. A plan that
writes `not applicable` reads as open. The status template asks for the prefix
`n/a`, and `verify_gate.py` already requires it.

**The `n/a` pill quotes the whole state line.** A reason such as
`n/a (no UI) — Screens: "..."` is long for a pill. This epic keeps the text
and changes only the treatment. Shortening the text is a separate question.

**Gate 2b for this plan reads `n/a`.** The feature adds no screen, no control,
and no flow. It changes the labels on an existing screen. A reader who wants a
full interaction design for a label change should say so, and the 2b line
should then move to `pending`.
