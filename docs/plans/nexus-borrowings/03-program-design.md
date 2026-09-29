# Program Design: Nexus borrowings — runtime diagram, draft reviewer, contracts doc

Epic grouping (from `goal.json`): E1 `runtime-arch-diagram`, E2
`draft-reviewer`, E3 `contracts-doc`. Gate 4 splits the slices; the contract
surfaces below are feature-level, from this Gate 3.

## Files

Created / modified, with rationale:

1. `shared/skills/mermaid/references/architecture-diagram.md` — **created**
   (already authored in this design's draft; reviewed as the E1 anchor).
   Runtime contract translated from Nexus `_ARCH_SYSTEM`.
2. `plugins/architect/skills/architecture/references/design-mode.md` — **modify**.
   §5 gains the runtime slot + contracts artifacts (with skip rule);
   §6 gains the reviewer spawn, the blind-rubric derivation rule, and the
   advisory classification; §12's goal schema gains `min_work.draft_review_run`.
3. `plugins/architect/skills/architecture/SKILL.md` — **modify**. Design Mode
   run order: stage 5 artifact list, stage 6 spawn with the ADR-0005 dual-path
   guard, `--non-interactive` note unchanged (reviewer runs at stage 6, before
   the stage-7 stop).
4. `shared/build_index.py` — **modify**. The design-record compiler reads
   `diagrams/runtime-architecture.mmd` → `record["diagrams"]["runtime"]`; reads
   `contracts.md` → `record["contracts"]` beside the `pr_draft` block.
5. `plugins/artifact/viewer/src/` (design record surface:
   `shell/change/levels.ts` consumers, the record tiles, and the design route
   section that renders `pr_draft`) — **modify**. Render `diagrams["runtime"]`
   as the lead tile inside the architecture level ahead of the `"3"` tile;
   render the `contracts` section beside the envisioned pull request. No levels
   list changes; the readiness check is untouched for the new keys.
6. `plugins/implement/skills/build/SKILL.md` — **modify**. Gate 2 and Gate 3
   grounding line: when a design record exists, ground `02-architecture.md` in
   its `contracts.md` as well as `intent.json`. No gate lines change shape.
7. `DDD-VOCABULARY.md` — **created already on this branch** (Runtime
   architecture diagram, contracts doc). Complete; listed for conformance.
8. `docs/architecture/designs/nexus-borrowings/` — **created on this branch**
   (the design itself). Listed for conformance, not rebuilt.
9. `.claude-plugin/marketplace.json` — **modify** (E1 first slice):
   `architect` 0.6.0 → **0.7.0**, `implement` 0.3.0 → **0.4.0**, `artifact`
   0.6.0 → **0.7.0**. Executed in the first build slice after Gate 4 approval —
   this is how installed users auto-update.
10. Tests — **modify**: `tests/test_build_index.py` (runtime + contracts
    projections, absence semantics), `tests/test_plugin_manifests.py`
    (unchanged shape expected), viewer tests for tile order and the contracts
    section (`test_viewer_modes.py`, `LevelSections.test.tsx` equivalents),
    `tests/test_sparse_design_corpus.py` (nexus-borrowings fixture).

## Types & signatures

`shared/build_index.py` (Python 3.10+, PEP-723):

- `def compile_design_diagrams(diagrams_dir: Path) -> dict[str, str]` —
  replaces the inline loop: numeric keys `1..3` from `level-{n}.mmd`; the named
  key `runtime` from `runtime-architecture.mmd` when non-empty and present.
  Called from the existing design-record block; no other callers.
- `def attach_authored_file(record: dict, path: Path, key: str) -> None` —
  generalize the `pr_draft` block: read, check non-empty, stamp
  `record[key] = text` (used for `contracts`; `pr_draft` refactored onto it).

Viewer (TypeScript, React 19):

- `type DesignDiagrams = { "1"?: string; "2"?: string; "3"?: string; runtime?: string }`
  replacing the implicit index type where declared in `shell/change/levels.ts`.
- `function architectureTileLevels(record: DesignRecord): string[]` — returns
  `["runtime", "3"]` when `runtime` present, `["3"]` otherwise; single source
  of the tile order; no call site hard-codes the runtime key afterward.
- `props: ContractsSectionProps = { contracts: string | null }` — renders a
  contracts section; hidden when `null` (absence, not an error). Rendered next
  to the envisioned-pull-request section.

design-mode prose additions (not code): `min_work.draft_review_run: bool` — set
true only after a stage-6 reviewer round returns; the reviewer reads
`goal.json` + `intent.json` and the blind rubric before reading the draft.

## Call stack

Compile: design-mode session → `uv run shared/build_index.py` →
`compile_design_diagrams(diagrams_dir)` → design-record assembly →
`attach_authored_file(record, path.parent/"contracts.md", "contracts")` →
`data/index.json` write.

Render: artifact View server → `index.json` → viewer design route →
`architectureTileLevels(record)` → `MermaidView` tiles in order (runtime, class)
→ `ContractsSection` beside the envisioned-PR section.

Review: session at stage 6 → spawn Reviewer (`glm-5.3-flash:cloud`) with rubric
derived from `goal.json` + `intent.json` → findings returned in-message →
classification → material → stage 3/5, otherwise approval → `min_work.draft_review_run = true`.

## Test plan

- `tests/test_build_index.py::test_design_runtime_diagram_compiles` — fixture
  design with `runtime-architecture.mmd` → `record["diagrams"]["runtime"]`;
  fixture without → key absent, no error.
- `tests/test_build_index.py::test_design_contracts_projection` — same two-way
  absence semantics, matching the `pr_draft` block's behavior.
- viewer pytest (`tests/test_viewer_modes.py`, `LevelSections.test.tsx`) — tile
  order: runtime renders inside the architecture level, before `"3"`; overview
  (`"1"`) still leads the design; readiness unchanged when runtime is absent.
- `tests/test_sparse_design_corpus.py` — nexus-borrowings fixture listed.
- `uv run shared/build_index.py` over the self bundle — exits 0; entity counts
  gain one design; `diagrams["runtime"]` present for nexus-borrowings only.
- `tests/test_design_to_code_skill.py`, `test_verify_gate_2b.py` — untouched,
  must stay green (2b resolution is prose-level n/a, no script behavior change).

## Least confident decisions

1. Mermaid C4 cluster rendering (`System_Boundary`) across the viewer's themes
   may under-perform Graphviz clusters; the mitigation is the contract's
   flowchart-subgraph fallback, but the visual bar will be settled on the first
   real design (the think-with-ai run).
2. One reviewer spawn per round may be under-provisioned; making `k` a `goal.json`
   field is cheap if E2's dogfood run shows thin findings.
3. Gate 2b as n/a rests on "no new interaction" — if the contracts section needs
   a viewer interaction (expand/collapse), 2b should re-open with Path 2 and the
   design-to-code skill before Gate 4 rubrics are authored.
4. The blind rule at stage 6 (reviewer must not read the ADR/draft before
   scoring) is enforced only by prose; enforcement stays in the spawn brief, not
   in code, until E2 proves otherwise.