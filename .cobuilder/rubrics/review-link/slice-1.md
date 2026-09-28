# Rubric: Slice 1 — Tracer bullet: review_link.py prints a checked deep link

Feature: review-link
Epic: review-link/E1
Slice goal: `uv run plugins/artifact/scripts/review_link.py --hub <hub> --route '#/<work>/build/epics'` prints the link after an HTTP 200, and exits 1 for an unknown work id or a dead server. View mode takes `--route`. `tests/test_review_link.py` passes against a real temporary server.
Test command: `uv run --with pytest pytest tests/ -v`

Sources: `04-slices.md` row 1, `epic-E1-design.md` (Types & Signatures, Test Plan), `03-program-design.md` (Types & signatures, Test plan), `02-architecture.md` (Endpoints, Flow).

## Criteria

### C1 — A good route prints one checked link [CRITICAL]
**Must be true:** With a live View server over a hub whose index holds work id `<work>`, the script prints exactly one line on stdout, `http://127.0.0.1:<port>/active/viewer/index.html#/<work>/build/epics`, and exits 0. The port is the one the server listens on.
**Evidence to check:**
- `uv run --with pytest pytest tests/test_review_link.py -v` passes, and a case asserts the printed link for a known work id.
- Read the test: it starts a real `http.server` on port 0 and writes `.view-server.pid` and `.view-server.log` the way View mode does. A mocked `urlopen` does not count.
**Scoring:**
- 1.0 — the test passes, uses a real server, and asserts the exact link and exit 0.
- 0.5 — the test passes, but the link assertion is partial (for example, a substring only).
- 0.0 — no such case, a mocked server, or the test fails.

### C2 — An unknown work id is rejected [CRITICAL]
**Must be true:** A route whose work id is not in `data/index.json` prints no link on stdout, prints a reason on stderr, and exits 1.
**Evidence to check:**
- A test case in `tests/test_review_link.py` runs `--route '#/no-such-work/build/epics'` and asserts exit 1 and empty stdout.
- Run the same command by hand against the live View server (see C4). Expect exit status 1 (`echo $?` prints `1`) and nothing on stdout.
**Scoring:**
- 1.0 — the test and the manual run both show exit 1, empty stdout, and a stderr reason.
- 0.5 — exit 1, but a link or partial output still reaches stdout.
- 0.0 — exit 0, or a link printed for an unknown work id.

### C3 — A non-200 page or a dead server exits non-zero [CRITICAL]
**Must be true:** The script never prints a link it did not check. It exits 1 with a stderr reason when the viewer file returns 404, when no pid file exists, and when the pid names a dead process.
**Evidence to check:**
- `tests/test_review_link.py` holds three cases: a 404 from `/active/viewer/index.html`, no pid file, and a dead pid. Each asserts exit 1 and empty stdout.
- Run `uv run --with pytest pytest tests/test_review_link.py -v` and count the passing cases for these three conditions.
**Scoring:**
- 1.0 — all three cases exist and pass.
- 0.5 — two of the three exist and pass.
- 0.0 — the 404 case is missing, or any case exits 0.

### C4 — The real View server gives a link that opens (not satisfiable by contract alone)
**Must be true:** Against this repository's own View server, the printed link opens the Epics page of a real work item.
**Evidence to check:**
- Start View mode for this repo (`/artifact:view`, or View mode steps from `plugins/artifact/skills/cobuilder-artifacts/SKILL.md`).
- Run `uv run plugins/artifact/scripts/review_link.py --hub . --route '#/review-link/build/epics'`. Expect exit 0 and one URL.
- `curl -s -o /dev/null -w '%{http_code}' <printed URL without the fragment>` prints `200`.
- Open the URL in a browser (ChromeDevTools MCP). The snapshot shows the Epics page for `review-link`, and the console shows no error.
- Stop the server, run the same command again, and expect exit 1.
**Scoring:**
- 1.0 — the link prints, returns 200, opens the right page, and a stopped server gives exit 1.
- 0.5 — the link prints and returns 200, but no browser check or no stopped-server check was recorded.
- 0.0 — no live run recorded, or the link does not open.

### C5 — View mode takes `--route`
**Must be true:** View mode in `plugins/artifact/skills/cobuilder-artifacts/SKILL.md` accepts `--route <route>`, starts or reuses the server, then runs `review_link.py` and reports its link. It names the script through `${CLAUDE_PLUGIN_ROOT}`, never through another plugin's path.
**Evidence to check:**
- `grep -n -- '--route' plugins/artifact/skills/cobuilder-artifacts/SKILL.md` shows the flag in View mode.
- `grep -n 'review_link.py' plugins/artifact/skills/cobuilder-artifacts/SKILL.md` shows the call after the server start or reuse step.
**Scoring:**
- 1.0 — both greps hit, and the order is server first, then the link.
- 0.5 — the flag exists, but the order or the path is unclear.
- 0.0 — no `--route` in View mode.

### C6 — Standard library only, and no server start
**Must be true:** `review_link.py` imports only the Python standard library and does not start a server. It reads the port from the last `port <N>` line of `.view-server.log`.
**Evidence to check:**
- Read the imports and any PEP 723 header of `plugins/artifact/scripts/review_link.py`. No third-party dependency.
- `grep -n 'http.server\|subprocess\|Popen' plugins/artifact/scripts/review_link.py` finds no server start.
- A test writes two `port` lines to the log and asserts that the link uses the last one.
**Scoring:**
- 1.0 — all three hold.
- 0.5 — standard library only, but no test for the last `port` line.
- 0.0 — a third-party import, or the script starts a server.

## Regression check
- All tests that passed before this slice still pass: `uv run --with pytest pytest tests/ -v`.
- Files outside the slice scope remain unchanged. Scope: `plugins/artifact/scripts/review_link.py`, `plugins/artifact/skills/cobuilder-artifacts/SKILL.md` (View mode only), `tests/test_review_link.py`.

## Out of scope — do not penalise
- The plan page, `#/<work>/build/plan`, and the `product_doc` and `architecture_doc` entities (slice 2).
- The Present for review section and the link text at each presentation point (slice 3).
- The link check in `verify_gate.py`, and links on gate lines in `00-status.md` (slice 3).
- A Claude Artifact publish, the Vite dev server, and a page for the interaction design (out of the epic).
