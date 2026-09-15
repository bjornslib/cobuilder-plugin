# Architecture: Gate state resolution

## Fit

Two renderers read the gate state. Neither gains a module, a service, or a
new file.

`plugins/artifact/scripts/build_builds_view.py` holds `GATE_DOCS`, `TITLES`,
and `ASK_NOTES`. It reads a plan, projects its gate lines, and writes the
static page. It owns the selection of the document the page opens on.

`.cobuilder-architect/self/pages/builds-view.html` is the static page. The
generator rewrites the lines between its two fence markers. Its `cls()`
function maps a gate state to one CSS class. Its `go()` function renders one
document, the rail state, and the approval prompt.

`plugins/artifact/viewer/index.html` is the viewer's gate rail. It reads the
projected data that `shared/build_index.py` writes, and it paints one card per
gate. `shared/build_index.py` needs no change, because it already resolves a
gate line to a state, a document, and a document kind.

The seam between the two renderers is the projected gate record. Its six
fields are `feature_slug`, `gate`, `state`, `title`, `source_path`, and
`body_md`. The rail reads `state`, `doc`, and `doc_kind`.

## Endpoints

No endpoint changes. No route, no payload, and no protocol moves.

## Data

`shared/build_index.py` projects a gate as a record. The rail reads these
fields:

| Field | Meaning | Value for a Gate 2b document |
|---|---|---|
| `gate` | the gate label from `00-status.md` | the string `"2b"` |
| `state` | the text after the colon | `n/a (no UI) — Screens: "..."` |
| `doc` | the lookup key for the gate document | the feature slug |
| `doc_kind` | the document type | `interaction` |

Two facts follow. The `gate` field is a string, so a comparison against the
integer `4` fails. The `state` field is free text, so a reader must test its
prefix and not its whole value.

No storage changes. No record gains a field. `00-status.md` keeps its shape,
and its gate line stays the one place that states a gate's meaning.

## Flow

1. The generator reads `00-status.md` and parses one gate record per gate
   line.
2. The generator reads the documents the plan holds.
3. `current_doc()` picks the gate the page opens on, and the document to show
   with it.
4. The generator writes the page. Each rewritten line carries a value the
   page reads at load.
5. The page builds the rail from the document map, then opens the chosen
   gate.
6. The viewer reads the projected records and paints one card per gate.

Step 3 is where the fault lives. Step 6 is where the label fault lives.

## External

No external system changes. The page holds markdown as text and renders it in
the browser, so no build step is added and no dependency is added.
