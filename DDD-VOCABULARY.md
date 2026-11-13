# DDD Vocabulary

This file is the one glossary for this repository. Code, districts, files, classes, methods, and prose must use the names defined here.

This glossary follows the format of Matt Pocock's `domain-modeling` skill (https://github.com/mattpocock/skills). It also includes the bounded-context canvases under `docs/architecture/contexts/`.

How to use this glossary:

- Use one name for one concept. Do not make a second name for a term that this file defines.
- A term belongs to exactly one bounded context or district. Find the right section before you add an entry.
- Add a term when an interview or a design settles it. Do not add it earlier.
- List a rejected synonym under `_Avoid_` in the entry that keeps the name.
- A homonym gets one entry for each context. Each entry names the other context.

## cobuilder-packaging

<a id="plugin"></a>
**Plugin** (`cobuilder-packaging`):
The single installable unit, declared in a `.claude-plugin/plugin.json` manifest. Six plugins exist today under `plugins/`.

They are `architect`, `pr`, `artifact`, `implement`, the umbrella `cobuilder-full-lifecycle`, and the opt-in mod `cobuilder-memory`.

<a id="command"></a>
**Command** (`cobuilder-packaging`):
A thin dispatcher file under a plugin's `commands/*.md`. Its only job is one `Skill(...)` call into the same plugin.

<a id="skill"></a>
**Skill** (`cobuilder-packaging`):
An auto-discovered directory under a plugin's `skills/`. The shared skills `mermaid` and `ste-writing` reach each plugin that needs them through a symlink.

<a id="script"></a>
**Script** (`cobuilder-packaging`):
A standalone PEP-723 `uv run` Python file. It sits under a plugin's `scripts/` or under the marketplace-root `shared/` directory.

It runs with no `venv` and no `requirements.txt`.

<a id="bundle"></a>
**Bundle** (`cobuilder-packaging`):
The derived output directory tree for one target repo. Scripts write the bundle, and the viewer reads it.
_Avoid_: docs/ (authored source, never derived), story.json (one file inside the bundle, not the bundle itself)

Its path is either `<target>/.cobuilder-architect/self/` or `<hub>/.cobuilder-architect/<repo-slug>/`.

<a id="vendoring"></a>
**Vendoring** (`cobuilder-packaging`):
The mechanism that shares code between the six plugins. ADR-0017 decides it.

A `shared/` directory at the marketplace root links into each plugin root. The install cache stores the real files, not the links.

<a id="envelope"></a>
**Envelope** (`cobuilder-packaging`):
The `envelope` map of a tracker record. It has version `v` and sorts by `kind`: `program`, `epic`, `slice`, or `pr`.
_Avoid_: metadata blob (the envelope is one named, versioned key, and it holds no prose)

It holds scalars, paths, and lists of paths only. The beads adapter stores it as `metadata.cb` on an issue (ADR-0031).

<a id="pull-request-issue"></a>
**Pull request issue** (`cobuilder-packaging`):
In the beads adapter, an issue of type `task` with `cb.kind` set to `pr` and `external_ref` set to `gh-<n>`. It blocks each epic that it holds.
_Avoid_: merge gate (the pull request issue replaces it), gate issue (no `gate` type exists), slice (also a `task`, told apart by `cb.kind`)

It closes on merge. GitHub stays the source of every other pull request fact (ADR-0029).

<a id="gate-field"></a>
**Gate field** (`cobuilder-packaging`):
A flat scalar in the envelope of a program record: `gate1`, `gate2`, `gate2b`, `gate3`, `gate4`, `gate4a`, `gate4b`, or `gate4c`.
_Avoid_: gate issue (the approval is a field on the program issue, and no gate issue exists)

It holds an approval date or `n/a`. A `gate<n>_view` field holds the view route.

<a id="tracker-port"></a>
**Tracker port** (`cobuilder-packaging`):
The interface in `shared/tracker_port/` that every reader and writer of workflow state uses to reach the task system (ADR-0040). It reports `capabilities()`, and no caller names a tracker.
_Avoid_: storage layer (ADR-0031 used it for beads, now one adapter), bridge (a `bd jira sync` command does not push the envelope)

<a id="tracker-record"></a>
**Tracker record** (`cobuilder-packaging`):
The neutral record of the port. It holds `id`, `kind`, `parent`, `blocked_by`, `lifecycle`, `assignee` (a GitHub login), `envelope`, and `external_ref`.
_Avoid_: issue (an issue is a beads, Linear, or Jira record, and the tracker record is not tied to one tracker)

An adapter maps the tracker record to the record of its own tracker.

<a id="tracker-adapter"></a>
**Tracker adapter** (`cobuilder-packaging`):
One implementation of the tracker port for one tracker. The `beads` adapter comes first, and `fake` keeps records in memory.
_Avoid_: connector (a loose word for any tool that moves data, and an adapter must pass the contract test)

`files` reads today's files. The `linear` and `jira` adapters are later programs.

<a id="projector"></a>
**Projector** (`cobuilder-packaging`):
The one shared function that turns a list of tracker records into the entities, the joins, and `data/index.json`. It replaces the state parsing that the readers spread out.
_Avoid_: reader (a reader gets records from the port and feeds the projector, and the projector holds the projection only)

<a id="tracker-cli"></a>
**Tracker CLI** (`cobuilder-packaging`):
The one command, `shared/tracker.py`, that an agent calls to read or write workflow state (ADR-0040). It has one subcommand for each port operation.
_Avoid_: bd, gh (the native CLI of a tracker, which only an adapter calls), the `bd` bridges (a different tool with its own sync)

It prints JSON on stdout. It exits 2 when the config names no adapter.

## architect

<a id="design"></a>
**Design** (`architect`):
`/architect:design`, the pre-code mode that interviews, challenges, and records one change. It produces an ADR and `intent.json`.

See "a design" for the artifact directory that it produces. That entry is a different entry.

<a id="a-design"></a>
**a design** (`architect`):
One `docs/architecture/designs/<name>/` directory. It holds `goal.json`, `intent.json`, `narrative.json`, `assessment.json`, and `pr-draft.md`.
_Avoid_: ADR (a design also produces one, but the ADR outlives it under docs/architecture/adr/)

See "Design" for the mode that produces a design. That entry is a different entry.

<a id="runtime-architecture-diagram"></a>
**Runtime architecture diagram** (`architect`):
The named diagram slot `designs/<name>/diagrams/runtime-architecture.svg`. It holds authored inline SVG, and `check_design_svg` validates it.
_Avoid_: level-4 diagram (that slot belongs to the per-PR contract), architecture-diagram contract in the mermaid skill (the pre-rebase draft, deleted)

The contract is `runtime-architecture-diagram.md` in the architect plugin. ADR-0035 accepted this format as the exception to the shared mermaid pipeline. The diagram is a prediction-grounded picture of services, libraries, data stores, and external systems. It shows clustered boundaries and boundary edges with protocol labels.

The renderer places the diagram as the lead tile of the design's architecture level, ahead of the class level. It is never a numbered level.

<a id="contracts-doc"></a>
**contracts doc** (`architect`):
The optional `contracts.md` in a design directory. It holds the envisioned API endpoints and data models.
_Avoid_: data-types (the class diagram's members are types, not envisioned contracts)

The design writes this file only when it touches a public interface or durable state. When the design skips the file, it says so.

<a id="vocabulary-bootstrap"></a>
**Vocabulary bootstrap** (`architect`):
The step that creates `DDD-VOCABULARY.md` in a repo that has none. Design stage 1 proposes terms from baseline-verified districts and real code symbols.
_Avoid_: glossary update (stage 5 adds to an existing file, and the bootstrap creates the first one)

Design stage 1 also interviews the engineer with the ubiquitous-language scenario bank. Then the bootstrap writes the glossary at the target root or the bundle directory.

Options mode offers the bootstrap at hand-off. Review reports its absence as a P1 finding. Implement modes only show a notice. Only design, or an offer that the engineer consents to, writes the glossary.

<a id="draft-review"></a>
**Draft review** (`architect`):
Design stage 6's pre-review. A subagent that the session spawns validates the draft against a blind rubric from `goal.json` and `intent.json`.
_Avoid_: options run (whole-system, once, before design, and it never re-explores a draft), VALIDATE (the implement slice scorer)

The subagent then re-explores alternatives, seeded with the final draft. Its findings are predictions, and the engineer adjudicates each one. Endorsed survivors reach `intent.alternatives` only through the stage-4 record (ADR-0035).

<a id="backlog-design"></a>
**backlog design** (`architect`):
A design at `stage: "backlog"`, with only a `goal.json` of planned epics.

`inflight-record-store` is a backlog design today. `maintainable-viewer` was one, and it now reads `stage: "superseded"`. The state is deliberate and sparse. It comes before the later stages of Design mode, so it is not an abandoned design.

<a id="review"></a>
**Review** (`architect`):
`/architect:review`, the self-only audit of security, architecture, and quality. It produces paired Technical and Founder HTML reports under `docs/architecture/review/`.
_Avoid_: code review

See "Review mode" for the Odyssey per-PR sweep. That entry is a different entry.

<a id="bounded-context"></a>
**Bounded context** (`architect`):
A `docs/architecture/contexts/<context-id>/` bundle of `canvas.md` and `boundary.yaml`. The self-only Describe mode produces it.

The bundle verifies each claim with grep against real import edges. See "District" for the lightweight, unverified version that a foreign repo uses.

<a id="stale-boundary"></a>
**Stale boundary** (`architect`):
A bounded context whose `boundary.yaml` has no resolvable `verified_at` commit, or whose `path` has a later commit.

`shared/boundary_check.py` lists it. `verify_bundle.py` reports it as the optional `boundary.stale` key.

<a id="inquiry"></a>
**Inquiry** (`architect`):
One question that `/architect:options` raises about the flow, the technology, or a gap in the whole system. It has evidence, a confidence tag, and alternatives (IDs F1, T1, G1).
_Avoid_: finding (an `assessment.json` entry), question (one of the three PR-assessment questions)

It is not a finding in `assessment.json`. It is also not one of the three questions of the PR assessment.

<a id="mechanical-smell"></a>
**Mechanical smell** (`architect`):
A problem pattern that habit-sensors counts mechanically.
_Avoid_: finding (an `assessment.json` entry, judged by a curator)

The report shows the count next to the judged findings. See "Findings source" for how a report row names its origin.

<a id="smell-group"></a>
**Smell group** (`architect`):
All findings of one smell kind in one scan.
_Avoid_: mechanical smell (one kind's pattern, not the collected group)

A large group counts once. It caps at the top 10 files.

<a id="findings-source"></a>
**Findings source** (`architect`):
The named provenance of a review-report row: either tool output or curator judgment.
_Avoid_: finding (an `assessment.json` entry with a different provenance)

Every row states which side produced it.

<a id="habit-smells-record"></a>
**Habit-smells record** (`architect`):
The JSON file that `habit_smells.py` writes beside the review reports.
_Avoid_: habit-sensors (the external tool the script calls, not the file)

`verify_bundle.py` reads the file as the optional `habit.smells` key.

<a id="recorded-residual"></a>
**Recorded residual** (`architect`):
One `oversized-function` sensor finding of 13 to 30 lines. It is one render unit, one test case, or one setup unit.
_Avoid_: exemption, waiver

A row in section 7 of the findings catalog lets the finding stay. A test matches the row to the finding.

<a id="kept-why-comment"></a>
**Kept why-comment** (`architect`):
One `non-essential-comment` sensor finding. The comment explains why, and it stays in viewer code.
_Avoid_: recorded residual (the `oversized-function` exception in section 7 of the catalog, a different record and test), exemption, waiver

A row of a `kept-comments/` table (File, Kept, Original) records the kept count for each file. A test fails when a file holds more findings than its Kept value.

## pr

<a id="district"></a>
**District** (`pr`):
A `world.districts` entry in `story.json` or `inventory.yaml`. Odyssey's describe-lite procedure infers it for any repo, including a foreign `--repo` target.

See "Bounded context" for the verified version. That version never covers a foreign repo.

<a id="review-mode"></a>
**Review mode** (`pr`):
The per-PR narration sweep, `/pr:review`. It narrates merged history into the bundle.
_Avoid_: Review (a different corpus, a different output shape, and no HTML report), review-mode.md (a same-named but unrelated reference file)

<a id="review-mode-md"></a>
**review-mode.md** (`pr`):
The PR-assessment reference for the `--stage post` step of `/pr:generate`. It holds three questions with evidence, verdicts, and drift detection.

See "Review mode" for the narration sweep. That mode has a different job, despite the shared word.

<a id="assessment-stage"></a>
**Assessment stage** (`pr`):
The `stage` field of `assessment.json`. The value `"design"` marks an assessment written before the code exists.
_Avoid_: verdict (proceed/concerns/rework, a separate field)

Such an assessment carries `prediction` findings. The value `"retrospective"` marks an assessment written after the design ships. It carries `observation` or `drift` findings.

`plugin-split` and `cobuilder-implement` use `"design"`. `design-mode` uses `"retrospective"`. Nothing enforces this field today. `build_index.py` projects only `verdict` and `findings`, and `verify_bundle.py` never checks the field.

<a id="drift"></a>
**Drift** (`pr`):
An `assessment.json` finding with `kind: "drift"`. It reports that a shipped record no longer matches the tree.
_Avoid_: bug

Sometimes a drift should stay unfixed, as a true account of what the team believed at the time. See `intent.drift`, a different array for each PR. The `--stage post` step of `/pr:generate` fills it by comparing a PR's stated intent with its merged diff.

## implement

<a id="epic"></a>
**Epic** (`implement`):
One unit in a design's `goal.json.epics[]`. `implement` owns and decomposes it.

It is the join key between a design and a PR. A pull request issue blocks each epic that it holds, until a person closes that issue.

<a id="slice"></a>
**Slice** (`implement`):
One vertical unit of an epic's build in `implement`. It is a row in `04-slices.md`.
_Avoid_: epic (a slice belongs to an epic), task (a slice ends in a state a reader can see, and a task need not)

It runs through the RED, GREEN, and VALIDATE loop. The slice is complete when VALIDATE scores it 0.90 or higher against its blind rubric.

<a id="coach"></a>
**Coach** (`implement`):
The `PostToolUse` hook, `plugins/implement/scripts/habit_coach.py`. It runs habit-hooks from the git root after each file that the GREEN agent writes, and it passes the findings back as advice.
_Avoid_: linter (a linter fails a build, and the coach only advises), reviewer (the draft review judges a design, not a written file)

It never blocks a write. `habit_coach.py --check` proves that the coach works. The check runs one tracked source file through the same path.

<a id="gate-4a-4b-4c"></a>
**Gate 4a / 4b / 4c** (`implement`):
The three sub-steps of Gate 4 in `implement`. Each one has its own line in `00-status.md`.
_Avoid_: Gate 4 as a whole (00-status.md tracks three lines, and the whole gate cannot read APPROVED while any sub-step still reads pending)

4a is the slice plan. 4b is a technical solution design that a multi-slice epic requires. A single-slice epic marks 4b `n/a`, not pending. 4c is the blind rubrics. `verify_gate.py` checks all three.

<a id="gate-2b"></a>
**Gate 2b** (`implement`):
The conditional interaction-design gate in `implement`. It runs only when the feature has a front end.
_Avoid_: Gate 2 (Gate 2b is not a sub-step of Gate 2. It has its own status line), Gate 4c (Gate 4c reads interaction-design.md for its eight required headings, after the document exists)

It has its own line in `docs/plans/<feature-slug>/00-status.md`. It writes `interaction-design.md` and `ui-spec.jsonc`. A feature with no front end writes one `n/a (no UI)` line instead. Gate 3 must not start until this gate reads APPROVED or n/a.

<a id="red"></a>
**RED** (`implement`):
The first role of the slice loop in `implement`. The `implement:red` agent writes failing tests that pin the slice contract, and it never edits the code under test.
_Avoid_: tester (the generic word, and RED is the named role that owns the immutable contract)

RED is done when every new test fails on an assertion.

<a id="green"></a>
**GREEN** (`implement`):
The second role of the slice loop in `implement`. The `implement:green` agent writes the minimal code that makes RED's failing tests pass.
_Avoid_: implementer (the generic word, and GREEN is the named role with its own scope contract)

GREEN never reads the blind rubric. The `PostToolUse` hook coaches GREEN with habit-hooks after each file that it writes.

<a id="validate"></a>
**VALIDATE** (`implement`):
The third role of the slice loop in `implement`. The `implement:validate` agent is a fresh subagent that saw neither RED nor GREEN.
_Avoid_: draft review (the architect stage 6 pre-review, which proposes survivors and never scores a slice), auditor (the generic word)

VALIDATE scores the slice against the blind rubric. It is the only role that reads the rubric. A score of 0.90 or higher accepts the slice.

<a id="structure-signal"></a>
**Structure signal** (`implement`):
A kind of structure fact that a script reports. Examples are a crowded folder, a name-stem cluster, a generic file name, a boundary edge, contract drift, and duplicated code.
_Avoid_: mechanical smell (a pattern inside one file that habit-sensors counts), finding without the word structure (an `assessment.json` entry, judged by a curator)

A signal is advice, and it stays outside the slice score. The new-code rule limits it in the change view (ADR-0048).

<a id="structure-finding"></a>
**Structure finding** (`implement`):
One result of a structure signal for one path, with its facts. Code names it `structure_signals.Finding`, and JSON holds it under `findings`.
_Avoid_: issue, smell

VALIDATE labels a finding confirmed, accepted, or dismissed. Review mode labels a finding debt, accepted, or false.

<a id="name-family"></a>
**Name family** (`implement`):
A group of two or more non-test files in one folder that share a first name token.
_Avoid_: cluster for a group of two

A crowded-folder finding lists the family in its `families` fact. A name family of `cluster_min` files or more, with no sub-folder of that name, is also a name-stem cluster.

<a id="import-group"></a>
**Import group** (`implement`):
A connected set of two or more sibling files in one folder. Each file in the set imports another file of the set, or another file of the set imports it.
_Avoid_: component (a part of the viewer or of a C4 diagram)

A crowded-folder finding lists the import groups of its folder in its `components` fact. It names the group or family that a new file joins, in its `nearest_group` fact.

<a id="boundary-edge-finding"></a>
**Boundary-edge finding** (`implement`):
A structure finding for a reference from a file. The reference is an import or a path string, and it points to a bounded context that the context's `boundary.yaml` does not allow.
_Avoid_: boundary edge alone (a protocol-labeled line in a runtime diagram)

The reference can also point to a path that a `forbidden_dependencies` glob names. In code, the signal is `boundary-edge`, which `shared/structure/boundary.py` reports.

<a id="structure-block"></a>
**Structure block** (`implement`):
The `### Structure` section that VALIDATE writes after the score. It has one labeled item for each structure finding.
_Avoid_: structure score

The block also has one item each for the contract-drift, cohesion, and dependency judgments. It stays outside `overall_score`. A failed attempt passes the block to the next GREEN attempt (ADR-0048 decision 8).

<a id="evidence-packet"></a>
**Evidence packet** (`implement`):
The JSON output of `shared/structure_evidence.py` for one slice diff. It holds the structure findings, the evidence for the agents, and the paths that the run did not analyze.
_Avoid_: report (the habit-hooks findings JSON)

VALIDATE and the vocabulary agent read the packet. It holds facts, never a verdict.

<a id="session-record"></a>
**Session record** (`implement`):
The file `cobuilder-coach-<session_id>.json` in the system temp folder. `structure_runner.py` keeps in it the finding key of each structure finding that one session showed.
_Avoid_: habit-smells record (the `habit-smells.json` file of review mode)

A finding key is one string for each structure finding, such as `name-stem-cluster|<folder>|<stem>`. A later write in the same session does not repeat a key.

<a id="structure-config"></a>
**Structure config** (`implement`):
The JSON file `.cobuilder/structure-signals.json`. It holds the structure signal settings, such as `folder_limit`, `generic_names`, and `excluded_paths`.
_Avoid_: structure settings, signals file

The install writes the file after the engineer approves it. `structure_signals.py --defaults` prints the default. The coach reads the file on each GREEN write.

<a id="attempt-file"></a>
**Attempt file** (`implement`):
The file `.cobuilder/rubrics/<slug>/evidence/slice-<N>-attempt-<M>.md`. VALIDATE writes it for attempt M of slice N.
_Avoid_: evidence file for the whole folder

It holds the score, the verdict, and each criterion score. The vocabulary agent appends its block to the file.

<a id="agent-use-check"></a>
**Agent-use check** (`implement`):
The check in `agent_use.py` that `verify_gate.py --slice <N>` runs before a slice closes. It passes when the newest attempt file of the slice holds a PASS at or above the accept threshold, or an escalation.
_Avoid_: agent check, spawn check

It shows that VALIDATE scored the slice. It cannot see a main agent that wrote the code and then spawned only VALIDATE (ADR-0048 decision 9).

<a id="new-code-rule"></a>
**New-code rule** (`implement`):
A structure signal reports only on code that the change adds. For the coach, that code is an untracked file or a file added since the merge-base.
_Avoid_: ratchet

For VALIDATE, that code is the slice diff. The whole-repository view does not use this rule (ADR-0048 decisions 3 and 16).

<a id="structure-coaching"></a>
**Structure coaching** (`implement`):
The second runner of the coach. `structure_runner.py` turns the structure findings for one GREEN write into text.
_Avoid_: structure check (it never blocks a write)

The coach joins that text to the habit-hooks text.

<a id="slice-base"></a>
**Slice base** (`implement`):
The full commit sha from `git rev-parse HEAD`. The main agent records it before RED starts.
_Avoid_: merge-base (the fallback when no slice base exists)

`structure_evidence.py --base` diffs from the slice base to the work tree. The slice diff therefore holds no earlier slice.

<a id="contract-drift"></a>
**Contract drift** (`implement`):
A structure finding with the signal `contract-drift`. It reports a change in the public surface of a modified Python file.
_Avoid_: drift alone (the `pr` term)

The change can be a parameter, a default, a return, a raise, or a removed symbol. Its facts list `callers_untouched` and `callers_total`. It differs from Drift (`pr`), an `assessment.json` finding.

<a id="duplicate-block"></a>
**Duplicate block** (`implement`):
A structure finding of the signal `duplicate-block`: a run of normalised code lines in an added range of the slice that another product file also holds. Its facts are `lines`, `other`, `other_lines`, and `size`, and `shared/structure/duplicates.py` finds it.
_Avoid_: block alone (the Structure block is a section of a VALIDATE report)

<a id="consumer-locality"></a>
**Consumer locality** (`implement`):
A fact in `evidence.consumer_locality` of the evidence packet: every importer of an added file sits in one other folder. VALIDATE uses it in the cohesion judgment, and it never becomes a structure finding.
_Avoid_: locality finding

<a id="layer-rule"></a>
**Layer rule** (`implement`):
The rule of consumer locality that drops an entry when the consumer folder imports three or more files of the folder of the added file. That folder is then a layer above it, not the one home of the file.

<a id="modular-mirage"></a>
**Modular Mirage** (`implement`):
A split of code into more files that keeps one reason to change spread across them. Teams often make such a split only to pass a size limit.
_Avoid_: modularization (a split that gives each file its own reason to change)

VALIDATE names the mirage in the cohesion line of the Structure block.

## cobuilder-memory

These terms come from the `cobuilder-memory` design (ADR-0039). The plugin lives in `plugins/cobuilder-memory/`.

<a id="consult-tool"></a>
**Consult tool** (`cobuilder-memory`):
The tool `consult`. The main agent calls it with no input to ask Hindsight about the work at hand.
_Avoid_: memory tool, recall_memory (earlier names), moment tool (the superseded 2026-10-13 design's tool)

Claude Code lists it as `mcp__cobuilder-memory__consult`. The person runs the same memory run with `/memory-recall`.

<a id="memory-run"></a>
**Memory run** (`cobuilder-memory`):
One call of the consult tool. Haiku writes a recall query, and the recall and the knowledge-page search run.
_Avoid_: quick run, deep run (both named runs of the superseded design)

Then Haiku picks at most one page and writes reflect questions from the records. The page read and the reflects follow. The result opens with the judging rules.

<a id="knowledge-page"></a>
**Knowledge page** (`cobuilder-memory`):
A page that the Hindsight server builds from many records. It has a name, an update date, and a markdown body.
_Avoid_: mental model (the server's name for the question behind a page)

A memory run searches the pages. Haiku picks at most one page to read. The result shows the page body without the frontmatter.

<a id="prompt-store"></a>
**Prompt store** (`cobuilder-memory`):
The list of the person's own prompts, typed in the terminal or sent through Remote Control.

The plugin keeps the list per session in `$.store`, newest 100. Haiku reads it to write the recall query.

<a id="judging-rules"></a>
**Judging rules** (`cobuilder-memory`):
The fixed text at the top of a memory run's result. It tells the main agent to treat recall records as evidence, a knowledge page as a dated summary, and reflect answers as leads.

It also states that a later chat that restates a record is not a newer source.

<a id="memory-pane"></a>
**Memory pane** (`cobuilder-memory`):
The side pane with id `memory-run` and title `🧠 CoBuilder Memory: Hindsight Run`. It shows the steps of the newest memory run while the run works, and its result when the run ends.

It adds no fact that the result lacks.

## Cross-cutting

<a id="self"></a>
**Self** (`cross-cutting`):
The session's own checkout. The Architecture modes accept only this target.

See "foreign" for a `--repo`-targeted checkout. Only Odyssey reaches a foreign checkout.

<a id="foreign"></a>
**foreign** (`cross-cutting`):
A `--repo`-targeted checkout. Only Odyssey reaches it.
_Avoid_: hub

Its bundle always lands under the session's own repo, as `<hub>`. The bundle never lands inside the foreign repo.

<a id="prose-budget"></a>
**Prose budget** (`cross-cutting`):
The word cap on each authored field. `shared/prose_budget.py` holds the caps, and `shared/prose-budget.md` explains them.
_Avoid_: length limit, style guide (ste-writing is the style rule, and the budget bounds the total length that STE does not)

A field that retells what the ADR, the plan, or the diff already holds hides the high-level view. `build_index.py` warns on a design over a cap. `verify_bundle.py` fails the bundle (`prose.budget`).
