# Program Design: Nexus borrowings — runtime SVG diagram, draft reviewer, contracts doc, vocabulary bootstrap

Epic grouping (from `goal.json`, round 2): E1 `runtime-arch-diagram`, E2
`draft-reviewer`, E3 `contracts-doc`, E4 `vocabulary-bootstrap`. Gate 4
splits the slices; the contract surfaces below are feature-level, from this
Gate 3. Round 2 reconciled this program with the merged options mode
(ADR-0035): the runtime slot moved from mermaid to authored inline SVG, the
ADR renumbered 0035 → 0036, and the vocabulary bootstrap leg joined.

## Files

Created / modified, with rationale:

1. `plugins/architect/skills/architecture/references/runtime-architecture-diagram.md` —
   **created**. The SVG runtime contract translated from Nexus
   `_ARCH_SYSTEM`: clustered boundaries, cylinder/dashed/rounded shape
   semantics, protocol-labeled boundary edges, 8-30 nodes, one page,
   `viewBox`, no external references. Cites ADR-0035's SVG exception and the
   options-report SVG conventions. Replaces the pre-merge mermaid contract,
   `shared/skills/mermaid/references/architecture-diagram.md` (deleted).
2. `plugins/architect/scripts/check_design_svg.py` — **created**. Structural
   validator for the new slot, in the `check_options_report.py` pattern:
   root is `<svg>` with a `viewBox`, every `<g id>` holds a `<title>`, no
   `<script>`, no external reference, long text warns.
3. `plugins/architect/skills/architecture/references/vocabulary-bootstrap.md` —
   **created**. The glossary-bootstrap procedure: propose terms from
   baseline-verified districts and real code symbols, annotate DDD kind from
   kind-matched `corpus/principles/ddd` cards, grill the engineer with
   `corpus/scenarios/architecture_ddd/004_ubiquitous_language_naming.yaml`
   as the question bank and `003_bounded_context_splitting.yaml` for
   scoping, write the glossary at the target root (self repos) or
   `<bundle-dir>/` (foreign targets). `corpus/scenarios/ddd/` holds only a
   README today and is not cited as content.
4. `plugins/architect/skills/architecture/references/design-mode.md` —
   **modify**. §stage 1 gains the vocabulary fallback (bootstrap when the
   glossary is absent, symmetric to the baseline fallback); §stage 5 gains
   the runtime `runtime-architecture.svg` slot + `contracts.md` artifact
   (with skip rule); §stage 6 gains the reviewer spawn, the blind-rubric
   derivation rule, the advisory classification, and the ADR-0035 routing
   line (endorsed survivors reach `intent.alternatives` only through the
   stage-4 record); goal schema gains `min_work.draft_review_run`.
5. `plugins/architect/skills/architecture/SKILL.md` — **modify**. Design Mode
   run order: stage 1 fallback, stage 5 artifact list, stage 6 spawn with the
   ADR-0005 dual-path guard; review mode line: glossary absence is a `P1`
   finding and the bootstrap is offered at run end. Mode count prose stays at
   seven (options mode is merged).
6. `plugins/architect/skills/architecture/references/options-mode.md` —
   **modify**. Stage 1 gains the glossary existence check and the
   report inquiry that notes it; stage 6 hand-off gains the bootstrap offer.
   ADR-0035's "writes nothing else" gets one declared exception recorded in
   ADR-0036: a consented glossary write from the hand-off.
7. `shared/build_index.py` — **modify**. The design-record compiler reads
   `diagrams/runtime-architecture.svg` → `record["diagrams"]["runtime"]`
   (non-empty or absent; no numeric key, no readiness effect); reads
   `contracts.md` → `record["contracts"]` beside the `pr_draft` block.
8. `plugins/artifact/viewer/src/` (the record tiles and the design route
   section that renders `pr_draft`) — **modify**. Render
   `diagrams["runtime"]` — an inline-SVG string — as the lead tile inside
   the architecture level ahead of the `"3"` tile; render the `contracts`
   section beside the envisioned pull request. No levels list changes; the
   readiness check is untouched for the new keys; the SVG renders inline
   with the `runtime` key never passed to the mermaid renderer.
9. `plugins/implement/skills/build/SKILL.md` — **modify**. Gate 2 and Gate 3
   grounding line: when a design record exists, ground `02-architecture.md`
   in its `contracts.md` as well as `intent.json`. No gate lines change shape.
10. `plugins/implement/commands/start.md` + `plugins/implement/commands/install.md`
    (+ `debug.md` notice line) — **modify**. One existence notice: state
    whether `DDD-VOCABULARY.md` exists, point at design stage 1 for the
    bootstrap. No behavior beyond the notice.
11. `plugins/implement/agents/vocabulary.md` — **modify**. Step 0: when the
    glossary is absent, return `FINDINGS` with one `[UNDEFINED]` item that
    names the bootstrap — never a silent `CLEAN`.
12. `DDD-VOCABULARY.md` — **note**: the file already carries the three new
    terms (`Runtime architecture diagram` updated to SVG, `contracts doc`,
    `vocabulary bootstrap`, `draft review`); done, listed for conformance.
13. `docs/architecture/designs/nexus-borrowings/` — **created earlier on this
    branch**, amended by round 2 (SVG slot, ADR-0036, vocabulary leg). The
    design's own `contracts.md` and `runtime-architecture.svg` dogfood the
    new formats.
14. `.claude-plugin/marketplace.json` — **modify** (final slice):
    `architect` 0.6.0 → **0.7.0**, `implement` 0.3.0 → **0.4.0**,
    `artifact` 0.6.0 → **0.7.0**. Executed last, after all slices land —
    this is how installed users auto-update.
15. Tests — **modify**: `tests/test_build_index.py` (runtime + contracts
    projections, absence semantics), new `tests/test_design_svg.py` (good
    fixture exits 0; one broken fixture per error check exits 1 with its
    check number; long text warns), viewer tests for tile order and the
    contracts section, `tests/test_sparse_design_corpus.py`
    (nexus-borrowings fixture listed), `tests/test_commands.py` and
    `tests/test_plugin_manifests.py` stay green with no new shipped agents.

## Types & signatures

`shared/build_index.py` (Python 3.10+, PEP-723):

- `def compile_design_diagrams(diagrams_dir: Path) -> dict[str, str]` —
  replaces the inline loop: numeric keys `1..3` from `level-{n}.mmd`; the
  named key `runtime` from `runtime-architecture.svg` when non-empty and
  present. Called from the existing design-record block; no other callers.
- `def attach_authored_file(record: dict, path: Path, key: str) -> None` —
  generalize the `pr_draft` block: read, check non-empty, stamp
  `record[key] = text` (used for `contracts`; `pr_draft` refactored onto it).

`plugins/architect/scripts/check_design_svg.py` (PEP-723, no dependencies):

```
def check_design_svg(svg_text: str) -> list[Result]:
    # checks 1..5, mirroring check_options_report.py's SVG checks:
    #  1 root element is <svg>
    #  2 root carries a viewBox
    #  3 every <g id> holds a <title>
    #  4 no <script> and no external href/style anywhere
    #  5 long single-line <text> warns (warning, never an error)
@dataclass(frozen=True)
class Result: check: int; severity: str; message: str
def main(argv) -> int:  # 0 when no error result, else 1
```

Viewer (TypeScript, React 19):

- `type DesignDiagrams = { "1"?: string; "2"?: string; "3"?: string;
  runtime?: string }` replacing the implicit index type where declared.
- `function architectureTileLevels(record: DesignRecord): string[]` —
  returns `["runtime", "3"]` when `runtime` present, `["3"]` otherwise;
  single source of the tile order; no call site hard-codes the runtime key
  afterward.
- `props: ContractsSectionProps = { contracts: string | null }` — renders a
  contracts section; hidden when `null` (absence, not an error). Rendered
  next to the envisioned-pull-request section. The `runtime` value renders
  via inline SVG markup, never through the mermaid renderer.

design-mode prose additions (not code): `min_work.draft_review_run: bool` —
set true only after a stage-6 reviewer round returns; the reviewer reads
`goal.json` + `intent.json` and the blind rubric before reading the draft.

## Call stack

Compile: design-mode session → `uv run shared/build_index.py` →
`compile_design_diagrams(diagrams_dir)` → design-record assembly →
`attach_authored_file(record, path.parent/"contracts.md", "contracts")` →
`data/index.json` write.

Validate: design-mode session at stage 5 → `uv run
plugins/architect/scripts/check_design_svg.py <svg>` → exit 0 / printed
checks. Review: session at stage 6 → spawn Reviewer (`glm-5.3-flash:cloud`)
with rubric derived from `goal.json` + `intent.json` → findings returned
in-message → classification → material → stage 3/5 (survivors later to
stage 4), otherwise approval → `min_work.draft_review_run = true`.

Render: artifact View server → `index.json` → viewer design route →
`architectureTileLevels(record)` → runtime SVG tile then `"3"` class tile →
`ContractsSection` beside the envisioned-PR section.

## Test plan

- `tests/test_design_svg.py`: author a good fixture (this design's
  runtime-architecture.svg) → exit 0. One broken fixture per error check →
  exit 1 with the check number in the output. Long text warns and exits 0.
- `tests/test_build_index.py::test_design_runtime_diagram_compiles` — fixture
  design with `runtime-architecture.svg` → `record["diagrams"]["runtime"]`;
  fixture without → key absent, no error.
- `tests/test_build_index.py::test_design_contracts_projection` — same
  two-way absence semantics, matching the `pr_draft` block's behavior.
- viewer pytest (`tests/test_viewer_modes.py`, `LevelSections.test.tsx`) —
  tile order: runtime renders inside the architecture level, before `"3"`;
  overview (`"1"`) still leads the design; readiness unchanged when runtime
  is absent; contracts section hidden when the key is absent.
- `tests/test_sparse_design_corpus.py` — nexus-borrowings fixture listed.
- `uv run shared/build_index.py` over the self bundle — exits 0; entity
  counts gain one design; `diagrams["runtime"]` present for
  nexus-borrowings only.
- `tests/test_design_to_code_skill.py`, `test_verify_gate_2b.py` —
  untouched, must stay green (2b resolution is prose-level n/a, no script
  behavior change).
- `tests/test_commands.py`, `tests/test_plugin_manifests.py` — no new
  shipped agents; seven modes unchanged.

## Least confident decisions

1. Inline SVG in the viewer's design tiles renders via raw markup; the
   mitigation is the validator's no-script, no-external-reference checks and
   the viewer never passing `runtime` through the mermaid renderer. The
   visual bar settles on the first real design run (this design's own SVG).
2. One reviewer spawn per round may be under-provisioned; making `k` a
   `goal.json` field is cheap if E2's dogfood run shows thin findings.
3. Gate 2b as n/a rests on "no new interaction" — the runtime tile and
   contracts section render through existing tile/section components; if a
   viewer interaction is needed (expand/collapse), 2b re-opens with Path 2
   and the design-to-code skill before the affected rubrics pass.
4. The blind rule at stage 6 (reviewer must not read the ADR/draft before
   scoring) is enforced only by prose; enforcement stays in the spawn brief,
   not in code, until E2 proves otherwise.
5. The vocabulary bootstrap's consent flow in options and review modes is a
   prose rule; the only mechanical guard is implement's vocabulary agent
   step 0. If the consented-write exception drifts in practice, the followup
   is one line in each mode's own reference, not new code.