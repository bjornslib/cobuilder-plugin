# Architecture: Review link

## Fit

Four layers change. Each one keeps its current owner.

- **Server.** View mode in `plugins/artifact/skills/cobuilder-artifacts/`
  owns the python `http.server`, its pid file, and its log file. A new script,
  `plugins/artifact/scripts/review_link.py`, reads those two files. It does not
  start a server. View mode starts it, as it does today.
- **Index.** `shared/build_index.py` gains two plan document kinds, for
  `01-product.md` and `02-architecture.md`, beside the existing
  `program_design` kind.
- **Viewer.** The React viewer under `plugins/artifact/viewer/src/` gains one
  page, the plan page, at `#/<work>/build/plan`. The build step recompiles the
  committed `viewer/index.html`.
- **Procedure.** A Present for review section in the cobuilder-artifacts
  skill holds the procedure. The build skill and the architecture skill name
  it by mode. `plugins/implement/scripts/verify_gate.py` checks the result.

No plugin names a file path in another plugin (ADR-0016). The build skill and
the architecture skill call `Skill("cobuilder-artifacts", args="view --route
<route>")`.

## Endpoints

No new endpoint. The viewer is a static page. The link is
`http://127.0.0.1:<port>/active/viewer/index.html#/<work>/<section>/<tail>`.
The script requests `/active/viewer/index.html` and the index file, and
expects HTTP 200 from both.

## Data

`data/index.json` gains two entity lists, `product_doc` and
`architecture_doc`. Each entity carries the same fields as a `program_design`
entity: an id, the feature slug, a title, a source path, and `body_md`.
`joins.feature_gates[slug]` points gates 1 and 2 at the new ids, in the same
way it points gate 3 at the program design today.

`00-status.md` gate lines gain an optional trailing ` — view: <url>` part.
`verify_gate.py` reads it.

## Flow

1. A workflow writes a gate document to disk.
2. The workflow runs `build_index.py`.
3. The workflow calls View mode with a route for the document.
4. View mode starts or reuses the server, then runs `review_link.py`.
5. `review_link.py` checks the work id and the page, and prints the link.
6. The workflow shows the summary, the file path, and the link.
7. The workflow asks "Approve Gate N, or what should change?".
8. On approval, the workflow writes the gate line with the link.
9. `verify_gate.py` fails a line dated on or after 2026-09-28 with no link.

## External

None. The script uses the Python standard library only. No CDN, no Vite dev
server, and no Claude Artifact publish.
