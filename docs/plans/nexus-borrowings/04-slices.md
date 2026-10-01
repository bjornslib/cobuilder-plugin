# Slice plan: Nexus borrowings

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`nexus-borrowings/E1` — The runtime SVG diagram.** The SVG contract, the validator, the build_index projections, and the viewer tiles. | | | | |
| 1 | `nexus-borrowings/E1` | The SVG contract and its validator | `plugins/architect/skills/architecture/references/runtime-architecture-diagram.md` exists and `shared/skills/mermaid/references/architecture-diagram.md` is gone. `uv run plugins/architect/scripts/check_design_svg.py` passes this design's `runtime-architecture.svg` and fails each broken fixture for its own check; a long-text fixture only warns. `tests/test_design_svg.py` passes | — | accepted |
| 2 | `nexus-borrowings/E1` | build_index compiles the named slot and the contracts file | `compile_design_diagrams` reads `runtime-architecture.svg` → `record["diagrams"]["runtime"]` and `attach_authored_file` stamps `contracts`; a fixture design without either file omits both keys with no error. `tests/test_build_index.py` passes | — | accepted |
| 3 | `nexus-borrowings/E1` | Viewer renders the runtime tile and the contracts section | `architectureTileLevels` returns `["runtime","3"]` when the named key is present; the overview still leads the design. The `runtime` value renders as inline SVG, never through the mermaid renderer. `ContractsSection` hides on absence. Viewer tests pass | — | accepted |
| | **`nexus-borrowings/E2` — The draft reviewer.** Stage 6 spawn and the min_work flag. | | | | |
| 4 | `nexus-borrowings/E2` | Stage 6 spawns the validate-and-re-explore reviewer | `design-mode.md` §6 holds the spawn block: blind rubric derived from `goal.json` + `intent.json` before reading the draft, re-explore seeded with the final draft, findings are classified predictions the engineer adjudicates, endorsed survivors reach `intent.alternatives` only through the stage-4 record (ADR-0035), spawn model `glm-5.3-flash:cloud`, `min_work.draft_review_run` set on a returned round. `build/SKILL.md` Gate 2 grounding line untouched by E2 | — | accepted |
| | **`nexus-borrowings/E3` — The contracts doc.** Authoring rule and implement grounding. | | | | |
| 5 | `nexus-borrowings/E3` | contracts.md becomes a stage-5 artifact with a stated skip rule | `design-mode.md` §5 carries the authoring + show-before-write rule and the skip rule; the artifacts-before-write list includes it; the viewer's `ContractsSection` is grounded in slice 3. `build/SKILL.md` Gate 2/3 grounds in `contracts.md` when a design record exists | — | accepted |
| | **`nexus-borrowings/E4` — The vocabulary bootstrap.** The reference, the mode surfaces, and the implement guards. | | | | |
| 6 | `nexus-borrowings/E4` | The bootstrap reference and the design stage-1 fallback | `references/vocabulary-bootstrap.md` exists (districts → grill → write; corpus cites only principles/ddd + scenarios/architecture_ddd; scenarios/ddd is README-only and named as such). `design-mode.md` stage 1 carries the symmetric fallback and the consent flow. `DDD-VOCABULARY.md` keeps the new terms | — | accepted |
| 7 | `nexus-borrowings/E4` | Options and review surface the check | `options-mode.md` stage 1 checks the glossary and the report notes absence; the stage-6 hand-off offers the bootstrap. `SKILL.md` review section reports absence as a `P1` finding and offers the bootstrap at run end | — | accepted |
| 8 | `nexus-borrowings/E4` | Implement notices, the vocabulary agent guard, and the bumps | `implement:start`/`install`/`debug` surface the existence notice; `implement:vocabulary` step 0 returns `FINDINGS` with one `[UNDEFINED]` bootstrap item on a missing file, never a silent `CLEAN`. Marketplace bumps: architect 0.7.0, implement 0.4.0, artifact 0.7.0. Self-bundle rebuilt: `uv run shared/build_index.py` exits 0 and records `diagrams["runtime"]` + `contracts` for nexus-borrowings; full pytest green | — | accepted |

## Rubric note for slices 4, 6, and 7

These slices change agent procedure in skill/reference files. Most of the
result is behavior. Their rubrics are therefore behavioral, as a Gate 4c
special case: each checks a blind transcript against observable actions
(what the stage reads before the draft, what it asks, what it refuses to
write without consent), and prose checks cover the static text in the
files.

Test command for every slice: `uv run --with pytest pytest tests/ -q`.

## Deviations from the usual loop

The engineer directed a single-pass build across four epics on one branch
(`design/nexus-borrowings/runtime-arch-diagram`) and approved the round-2
reconciliation in chat on 2026-10-01. Gate approvals 1-3 carried over from
2026-09-29 (the round-2 churn re-opened stages 3/5, not Gate 1). E1-S1
ships the validator with its fixtures as the tracer bullet.