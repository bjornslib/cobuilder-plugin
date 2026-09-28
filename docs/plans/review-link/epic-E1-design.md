# Epic Technical Solution Design: E1 — A viewer link for each document under review

Design: `review-link`. Decision record: ADR-0032. Branch: `design/review-link/E1`.

## Scope and Intent

A workflow that asks the user to approve a document prints a checked viewer
link to that document first. The epic adds the script that makes the link,
the page that the link opens, and the procedure that uses both. It also adds
the check that fails a gate line with no link.

Out of scope: a Claude Artifact publish, the Vite dev server, and a viewer
page for the interaction design document.

## Files Touched

- Slice 1: `plugins/artifact/scripts/review_link.py` (new),
  `plugins/artifact/skills/cobuilder-artifacts/SKILL.md` (View mode `--route`),
  `tests/test_review_link.py` (new).
- Slice 2: `shared/build_index.py`, `plugins/artifact/viewer/src/shell/model.ts`,
  `plugins/artifact/viewer/src/data/types.ts`, `plugins/artifact/viewer/src/data/works.ts`,
  `plugins/artifact/viewer/src/shell/panels/Plan.tsx` (new), its test (new),
  the rail and section wiring, `plugins/artifact/viewer/index.html` (rebuilt),
  `tests/test_build_index_plan_docs.py` (new).
- Slice 3: `plugins/artifact/skills/cobuilder-artifacts/SKILL.md` (Present for
  review), `plugins/implement/skills/build/SKILL.md`,
  `plugins/implement/skills/build/references/validation-scoring.md`,
  `plugins/architect/skills/architecture/SKILL.md`,
  `plugins/architect/skills/architecture/references/design-mode.md`,
  `plugins/implement/scripts/verify_gate.py`, `tests/test_verify_gate_links.py`
  (new), `docs/plans/review-link/00-status.md`.

## Types & Signatures

See `03-program-design.md`, Types & signatures. The key contracts:

- `review_link.py --hub <path> --route '#/<work>/<rest>'` prints one line, the
  link, on stdout and exits 0. On any failure it prints the reason on stderr
  and exits 1. It never prints a link it did not check.
- The port comes from the last `port <N>` in `.view-server.log`, and the pid
  in `.view-server.pid` must name a live `http.server` process.
- `data/index.json` gains `product_doc` and `architecture_doc` lists, with the
  same fields as `program_design`.
- A gate line takes the form `- Gate N — <name>: APPROVED <date> — view: <url>`.
  `verify_gate.py` reports `links.gate.<n>` as `ok`, `n/a`, or `missing`.

## Slice Decomposition

1. **Tracer bullet.** The script and View mode's `--route`. It links to an
   existing page, `#/<work>/build/epics`, so it needs no viewer change. This
   proves the whole path from server to printed link.
2. **The page.** The projection and the plan page. After this slice, Gates 1,
   2, and 3 have a page to link to.
3. **The procedure.** The Present for review section, every presentation
   point, and the check. It lands last, because it needs the page and the
   script to exist.

## Test Plan

- Slice 1: pytest with a real `http.server` on port 0 in a temporary hub. The
  cases are a good route, an unknown work id, no pid file, a dead pid, and a
  404 from the viewer file.
- Slice 2: pytest for the projection and the gate joins, and vitest for the
  plan page, present and absent states. A browser demo through the running
  View server opens `#/review-link/build/plan`.
- Slice 3: pytest for the link check, with the date boundary on both sides. A
  behavioral rubric checks the procedure text at each named point.

## Risks & Open Questions

- The decisions mode and describe mode records may have no viewer page. The
  fallback is the work's Intent page. A reviewer then needs one more click.
- A committed link names a port that goes stale after a restart. The link
  records what the reviewer opened, and the check tests its presence only.
- This plan's own gate lines are dated 2026-09-28 and carry no link. Slice 3
  must add them, or `verify_gate.py` fails this plan.
- The rebuilt `viewer/index.html` must also reach each bundle. The existing
  `migrate_bundle.py` refresh covers that.
