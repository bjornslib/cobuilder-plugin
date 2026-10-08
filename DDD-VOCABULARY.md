# DDD Vocabulary

This file is the one glossary for this repository. Code, districts, files,
classes, methods, and prose must use the names defined here.

This glossary follows the format of Matt Pocock's `domain-modeling` skill
(https://github.com/mattpocock/skills), merged with this repository's
bounded-context canvases under `docs/architecture/contexts/`.

How to use this glossary:

- Use one name for one concept. Do not invent a second name for a term
  already defined here.
- A term belongs to exactly one bounded context or district. Find its
  section before you add a new one.
- Add a term when an interview or a design resolves it, not before.
- List a rejected synonym under `_Avoid_` on the entry it lost to.
- A homonym gets one entry per context. Each entry names the other context.

## cobuilder-packaging

<a id="plugin"></a>
**Plugin** (`cobuilder-packaging`):
The single installable unit declared in a `.claude-plugin/plugin.json` manifest. Five plugins exist today under `plugins/`: `architect`, `pr`, `artifact`, `implement`, and the umbrella `cobuilder-full-lifecycle`.

<a id="command"></a>
**Command** (`cobuilder-packaging`):
A thin dispatcher file under a plugin's `commands/*.md`. Its only job is one `Skill(...)` call into that same plugin.

<a id="skill"></a>
**Skill** (`cobuilder-packaging`):
An auto-discovered directory under a plugin's `skills/`. `mermaid` and `ste-writing` are shared skills, vendored by symlink into every plugin that needs them.

<a id="script"></a>
**Script** (`cobuilder-packaging`):
A standalone PEP-723 `uv run` Python file under a plugin's `scripts/`, or under the marketplace-root `shared/` directory. It runs with no `venv` and no `requirements.txt`.

<a id="bundle"></a>
**Bundle** (`cobuilder-packaging`):
The derived output directory tree for one target repo, either `<target>/.cobuilder-architect/self/` or `<hub>/.cobuilder-architect/<repo-slug>/`. Scripts write it and the viewer reads it.
_Avoid_: docs/ (authored source, never derived), story.json (one file inside the bundle, not the bundle itself)

<a id="vendoring"></a>
**Vendoring** (`cobuilder-packaging`):
The mechanism, decided in ADR-0017, that shares code between the five plugins: a `shared/` directory at the marketplace root, symlinked into each plugin's own root and dereferenced into that plugin's install cache.

## architect

<a id="design"></a>
**Design** (`architect`):
`/architect:design`, the pre-code interview-and-challenge mode that produces an ADR plus `intent.json`. See "a design" for the artifact directory it produces, a different entry.

<a id="a-design"></a>
**a design** (`architect`):
One `docs/architecture/designs/<name>/` directory holding `goal.json`, `intent.json`, `narrative.json`, `assessment.json`, and `pr-draft.md`. See "Design" for the mode that produces it, a different entry.
_Avoid_: ADR (a design also produces one, but the ADR outlives it under docs/architecture/adr/)

<a id="runtime-architecture-diagram"></a>
**Runtime architecture diagram** (`architect`):
The named diagram slot `designs/<name>/diagrams/runtime-architecture.svg`, authored inline SVG per the runtime-architecture-diagram.md contract in the architect plugin and validated by check_design_svg (ADR-0035 accepted the format as the exception to the shared mermaid pipeline): a prediction-grounded picture of services, libraries, data stores, and external systems with clustered boundaries and protocol-labeled boundary edges.
Rendered as the lead tile of the design's architecture level, ahead of the class level; never a numbered level.
_Avoid_: level-4 diagram (that slot belongs to the per-PR contract and has no diagram there), architecture-diagram contract in the mermaid skill (the pre-rebase draft's mermaid contract, deleted)

<a id="contracts-doc"></a>
**contracts doc** (`architect`):
Optional `contracts.md` in a design directory carrying the envisioned API endpoints and data models. Written only when the design touches a public interface or durable state; the skip is stated, never silent.
_Avoid_: data-types (the class diagram's members are types, not envisioned contracts)

<a id="vocabulary-bootstrap"></a>
**Vocabulary bootstrap** (`architect`):
The step that creates `DDD-VOCABULARY.md` in a repo that never made one: design stage 1 proposes terms from baseline-verified districts and real code symbols, grills the engineer with the ubiquitous-language scenario bank, and writes the glossary at the target root or the bundle dir.
Options mode offers it at hand-off and review reports its absence as a P1 finding; implement modes only surface a notice — only design and a consented offer write the glossary.
_Avoid_: glossary update (stage 5 adds to an existing file; the bootstrap creates the first one)

<a id="draft-review"></a>
**Draft review** (`architect`):
Design stage 6's pre-review: a session-spawned subagent validates the draft against a blind rubric from goal.json and intent.json, then re-explores alternatives seeded with the final draft. Findings are predictions the engineer adjudicates; endorsed survivors reach intent.alternatives only through the stage-4 record (ADR-0035).
_Avoid_: options run (whole-system, once, before design; never re-explores a draft), VALIDATE (the implement slice scorer)

<a id="backlog-design"></a>
**backlog design** (`architect`):
A design at `stage: "backlog"`, with only a `goal.json` of planned epics, and `inflight-record-store` is a backlog design today. `maintainable-viewer` was one, and now reads `stage: "superseded"`. This is a deliberate, sparse state before Design mode's later stages run, not an abandoned design.

<a id="review"></a>
**Review** (`architect`):
`/architect:review`, the self-only security, architecture, and quality audit that produces paired Technical and Founder HTML reports under `docs/architecture/review/`. See "Review mode" for the Odyssey per-PR sweep, a different entry.
_Avoid_: code review

<a id="bounded-context"></a>
**Bounded context** (`architect`):
A `docs/architecture/contexts/<context-id>/` bundle of `canvas.md` and `boundary.yaml`, produced by the self-only Describe mode, with every claim grep-verified against real import edges. See "District" for the lightweight, unverified version used for a foreign repo.

<a id="stale-boundary"></a>
**Stale boundary** (`architect`):
A bounded context whose `boundary.yaml` has no resolvable `verified_at` commit, or whose `path` has a later commit. `shared/boundary_check.py` lists it, and `verify_bundle.py` reports it as the optional `boundary.stale` key.

<a id="inquiry"></a>
**Inquiry** (`architect`):
One question that `/architect:options` raises about the flow, the technology, or a gap of the whole system, with evidence, a confidence tag, and alternatives (IDs F1, T1, G1). It is not a finding in `assessment.json` and not a question in the three-question PR assessment.
_Avoid_: finding (an `assessment.json` entry), question (one of the three PR-assessment questions)

## pr

<a id="district"></a>
**District** (`pr`):
A `world.districts` entry in `story.json` or `inventory.yaml`, inferred by Odyssey's describe-lite procedure for any repo, including a foreign `--repo` target. See "Bounded context" for the verified version, which never covers a foreign repo.

<a id="review-mode"></a>
**Review mode** (`pr`):
The per-PR narration sweep, `/pr:review`, that narrates already-merged history into the bundle.
_Avoid_: Review (a different corpus, a different output shape, and no HTML report), review-mode.md (a same-named but unrelated reference file)

<a id="review-mode-md"></a>
**review-mode.md** (`pr`):
The PR-assessment reference for `/pr:generate`'s `--stage post` step: three questions with evidence, verdicts, and drift detection. See "Review mode" for the narration sweep, a different mode with a different job despite the shared word.

<a id="assessment-stage"></a>
**Assessment stage** (`pr`):
The `stage` field on `assessment.json`: `"design"` (`plugin-split` and `cobuilder-implement` are `"design"`) is for an assessment written before the code exists, carrying `prediction` findings, and `"retrospective"` (`design-mode`) is for one written after the design shipped, carrying `observation` or `drift` findings. Nothing enforces this field today: `build_index.py` projects only `verdict` and `findings`, and `verify_bundle.py` never checks it.
_Avoid_: verdict (proceed/concerns/rework, a separate field)

<a id="drift"></a>
**Drift** (`pr`):
An `assessment.json` finding of `kind: "drift"`: a report that a shipped record no longer matches the tree, which sometimes should stay unfixed as a true account of what was believed at the time. See `intent.drift`, a different, per-PR array that `/pr:generate --stage post` populates by comparing a PR's stated intent against its merged diff.
_Avoid_: bug

## implement

<a id="epic"></a>
**Epic** (`implement`):
One unit inside a design's `goal.json.epics[]`, owned and decomposed by `implement`, mapped to zero or one pull request through `epics[].branch`. It is the join key between a design and a PR, not an ADR, a design, or a PR itself.

<a id="slice"></a>
**Slice** (`implement`):
One vertical unit of an epic's build in `implement`. It is a row in `04-slices.md`, it runs through the RED, GREEN, and VALIDATE loop, and it is complete when VALIDATE scores it 0.90 or higher against its blind rubric.
_Avoid_: epic (a slice belongs to an epic, and an epic that carries one slice needs no Gate 4b design), task (a slice ends in a state a reader can see, and a task need not)

<a id="gate-4a-4b-4c"></a>
**Gate 4a / 4b / 4c** (`implement`):
The three sub-steps of Gate 4 in `implement`, each with its own line in `00-status.md`: 4a is the slice plan, 4b is a technical solution design required only for a multi-slice epic and marked `n/a`, not pending, for a single-slice epic, and 4c is the blind rubrics. `verify_gate.py` checks all three.
_Avoid_: Gate 4 as a whole (00-status.md tracks three lines, and the whole gate cannot read APPROVED while any sub-step still reads pending)

<a id="gate-2b"></a>
**Gate 2b** (`implement`):
The conditional interaction-design gate in `implement`, running only when the feature has a front end, with its own line in `docs/plans/<feature-slug>/00-status.md`. It writes `interaction-design.md` and `ui-spec.jsonc`, a feature with no front end writes one `n/a (no UI)` line instead, and Gate 3 must not start until this gate reads APPROVED or n/a.
_Avoid_: Gate 2 (Gate 2b is not a sub-step of Gate 2. It has its own status line), Gate 4c (Gate 4c reads interaction-design.md for its eight required headings, after the document exists)

<a id="red"></a>
**RED** (`implement`):
The first role of the slice loop in `implement`: the `implement:red` agent writes failing tests that pin the slice contract, and it never edits the code under test. It is done when every new test fails on an assertion.
_Avoid_: tester (the generic word, and RED is the named role that owns the immutable contract)

<a id="green"></a>
**GREEN** (`implement`):
The second role of the slice loop in `implement`: the `implement:green` agent writes the minimal code that makes RED's failing tests pass, and it never reads the blind rubric. The `PostToolUse` hook coaches it with habit-hooks after each file it writes.
_Avoid_: implementer (the generic word, and GREEN is the named role with its own scope contract)

<a id="validate"></a>
**VALIDATE** (`implement`):
The third role of the slice loop in `implement`: the `implement:validate` agent, a fresh subagent that saw neither RED nor GREEN, scores the slice against the blind rubric. It is the only role that reads the rubric, and a score of 0.90 or higher accepts the slice.
_Avoid_: draft review (the architect stage 6 pre-review, which proposes survivors and never scores a slice), auditor (the generic word)

## Cross-cutting

<a id="self"></a>
**Self** (`cross-cutting`):
The session's own checkout, the only target the Architecture modes accept. See "foreign" for a `--repo`-targeted checkout, reachable only through Odyssey.

<a id="foreign"></a>
**foreign** (`cross-cutting`):
A `--repo`-targeted checkout, reachable only through Odyssey. Its bundle always lands under the session's own repo as `<hub>`, never inside the foreign repo itself.
_Avoid_: hub

<a id="prose-budget"></a>
**Prose budget** (`cross-cutting`):
The word cap on each authored field, held in `shared/prose_budget.py` and explained in `shared/prose-budget.md`: a field that retells what the ADR, the plan, or the diff already holds hides the high-level view. `build_index.py` warns on a design over a cap, and `verify_bundle.py` fails the bundle (`prose.budget`).
_Avoid_: length limit, style guide (ste-writing is the style rule, and the budget bounds the total length that STE does not)
