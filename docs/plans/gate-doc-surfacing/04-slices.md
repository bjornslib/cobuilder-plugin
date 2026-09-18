# Slice plan: Gate doc surfacing

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`gate-doc-surfacing/E1` — Index gate docs into data/index.json.** shared/build_index.py projects docs/plans/<slug>/03-program-design.md and epic-<id>-design.md into new program_design and epic_design entities. | | | | |
| 1 | `gate-doc-surfacing/E1` | Tracer bullet: constants and empty entity lists | `data/index.json` carries `program_design` and `epic_design` keys (empty lists when no gate docs exist yet) | — | pending |
| 2 | `gate-doc-surfacing/E1` | Real parsing: project Gate 3 and Gate 4b docs | A repo with a `03-program-design.md` and an `epic-*-design.md` produces populated `program_design`/`epic_design` entities, and `joins.feature_gates[slug][3].doc` points at the projected id | — | pending |
| 3 | `gate-doc-surfacing/E1` | Edge cases: missing files, malformed epic id, no plans dir | A plan directory with no gate docs, and a repo with no `docs/plans/` at all, both still produce a clean index build with empty (not missing) entity keys | — | pending |
| | **`gate-doc-surfacing/E2` — Surface gate docs in the Builds view.** plugins/artifact/viewer/index.html gets a read-only sheet, wired to the Gate Rail and epic cards. | | | | |
| 4 | `gate-doc-surfacing/E2` | Tracer bullet: clickable Gate Rail card opens an empty sheet | Clicking a Gate Rail card with a `doc` opens a sheet showing the gate's title and an empty body; a card with no `doc` stays non-interactive | — | pending |
| 5 | `gate-doc-surfacing/E2` | Real content: render the gate doc body, add the epic chip | The sheet renders `body_md` through the existing `renderMarkdown()`; an epic card with a `design_doc` shows a chip that opens the same sheet scoped to that epic | — | pending |
| 6 | `gate-doc-surfacing/E2` | Edge cases: no entity, mutual exclusivity with other sheets | A Gate Rail card whose gate has no matching doc opens nothing; opening the gate-doc sheet closes any open ADR/assessment/comments sheet, and vice versa | — | pending |
