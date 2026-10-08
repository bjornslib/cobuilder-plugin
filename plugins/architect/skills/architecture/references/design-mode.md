---
title: "Design Mode — pre-code architecture design reference"
type: reference
status: active
last_verified: 2026-08-19
owner: bjoerns
---

# Design Mode — pre-code architecture design reference

How to design a change before any code exists, and how to write the result
into `docs/architecture/designs/<name>/`. Design mode runs seven stages.
It interviews the engineer, explores options, challenges the approach, and
drafts an ADR. Generate mode later joins the design to the pull request that
implements it.

A design never enters `data/story.json`. That file keys on an integer `pr`.
The design enters the timeline only when generate mode files it under the
real number that `gh pr create` returns.

## 1. What this mode produces

A named directory:

```
docs/architecture/designs/<name>/
  goal.json
  intent.json
  narrative.json
  assessment.json
  pr-draft.md
  diagrams/level-{1,2,3}.mmd
```

Plus one ADR at `docs/architecture/adr/ADR-NNNN-<slug>.md`, with
`state: decided`. Then run `build_index.py`. See
the odyssey skill's `references/decision-records-lite.md`.

`intent` uses the same fields as the odyssey skill's `references/interview-guide.md` §1, with
`source: "design"` and `design_name` set. `alternatives` stays empty after
the interview. Stages 3 and 4 fill it. Each entry uses
`{option, rejected_because}`.

## 2. Self-only

This mode writes `docs/`. It does not take `--repo`. If the user asks to
design against a foreign checkout, refuse.

The plugin ships no hooks. When this file says a step runs, it means
`SKILL.md` will instruct the session to run it. The plugin does not
invoke anything on its own. Do not write the design under an exports
tree. That old path is a historical mistake.

## 3. Stage 0 — Name and outcome

The engineer states the outcome and names the design **before** the agent
reads a file. The outcome names a state, not an activity. Write it into
`goal.outcome` and `goal.done_when`.

Then search existing designs for a duplicate. The match is semantic, not
a keyword grep. For each candidate under `docs/architecture/designs/*/`,
read `goal.outcome`, `intent.problem`, and the ADR draft. Judge whether
the candidate addresses the same problem. Two designs can share every
word and solve different things, or share no words and collide.

**Report what you searched and how many designs exist.** Never a bare
"none found". If the tree is empty, say so and say this is the first
design. If you searched N designs and none match, say that. On a hit,
show the match and its `goal.stage`. Let the engineer choose with
`AskUserQuestion`: resume it, supersede it, or proceed because it is
genuinely different. A superseded design gets `stage: "superseded"` and
a pointer to the new name.

## 4. Stage 1 — Ground

Read only now. Load the districts in `inventory.yaml` that the outcome
touches. Load `DDD-VOCABULARY.md` next to the districts, so every term you
use later matches an existing entry or a gap you already know about. Load
the ADRs that cover those districts. Load the matching stack card, and
earlier timeline entries in the same districts.

If the bundle has no baseline, `SKILL.md` instructs you to run `baseline`
and continue. Say that it will run, then report the elapsed time. Do not
run it in silence. If `DDD-VOCABULARY.md` is absent, at the target repo root
or in the bundle dir for a foreign target, run the vocabulary bootstrap per
`references/vocabulary-bootstrap.md` before you draft the hypothesis. Declare
that run to the engineer the same way the baseline run is declared: say that
it will run, then report what it wrote. The grill and its write happen with
the engineer's answers. A refusal ends the bootstrap without writing.

After you load the districts and ADRs, list the paths the change touches.
Keep the list in the session. Stage 6 uses it again. Run
`uv run "${CLAUDE_PLUGIN_ROOT}/shared/boundary_check.py" --paths <paths>`.
For each context the check reports as stale, missing, or uncovered, invoke
`Skill("architect:architecture", args="describe <context-or-path>")`. Run
describe only for stale, missing, or uncovered areas. Never run it for an ok
context. Say to the engineer that describe will run, then report what it
wrote, the same way the baseline run is declared. Rerun the check until the
result is clean.

If the corpus leaves the topic under-covered, escalate to
`references/book-index.md`'s Tier 2 rule (ADR-0021): load a minimum of
three nano-tier book excerpts for the candidate books, then escalate any
one of them to mini or full only when its principles are judged to matter
for this design. Full-tier loading is never automatic.

Draft a private hypothesis and a gap list. Keep both
hidden until §5 asks the problem and the approach. See
the odyssey skill's `references/interview-guide.md` §2.

## 5. Stage 2 — Interview

Five topics only. They fit the six-topic cap in the odyssey skill's `references/interview-guide.md` §3.
This file does not amend that cap.

| Topic | Fills |
|---|---|
| Problem | `intent.problem`, `intent.why_now` |
| Approach | `intent.approach` |
| Boundaries | `intent.out_of_scope` |
| Assumptions and unknowns | `intent.risks`, `intent.unknowns` |
| Stop condition | `goal.abort_if` |

**Do not ask the engineer to name rejected options.** A rejected option
is an outcome of stages 3 and 4, not an input.

**Never ask a question that the evidence already answers.** See
the odyssey skill's `references/interview-guide.md` §2. Rank the gaps. Drop a topic the ground step
already closed.

Use `AskUserQuestion` for a closed question, where you can offer real
options. Use an ordinary turn for an open question. Problem, approach,
boundaries, assumptions, and the stop condition are open questions. Ask
the problem first, then the approach, before you show the hypothesis
from stage 1. Compare the two accounts the way the odyssey skill's `references/interview-guide.md` §3a
describes. Do not invent a second questionnaire.

Ask authorship as a closed question: `human`, `agent-assisted`, or
`agent-generated`. It is metadata, not a sixth topic. Play the interview
draft back before you move on. Alternatives are still empty. That is
correct.

## 6. Stage 3 — Explore

Invoke divergent exploration from the architecture skill, with the design
frame set in `divergent-exploration.md` §3. Use the same dual-path guard
as mermaid authoring:

1. Invoke `Skill("architect:architecture")` and tell it to run
   divergent exploration with the design frame set. Return survivors and
   risks. Do not write the ADR here.
2. If that call gives `Unknown skill`, read
   `${CLAUDE_PLUGIN_ROOT}/skills/architecture/SKILL.md` and
   `${CLAUDE_PLUGIN_ROOT}/skills/architecture/references/divergent-exploration.md`
   and obey those files instead.

State the pre-flight gate result before you proceed either way. The
approach the engineer stated is one candidate, not the given. Seed the
frames with the interview answers. Survivors and the risk list feed
stage 4.

## 7. Stage 4 — Challenge gate

This stage is the product. It is the only producer of
`intent.alternatives`. A skipped or toothless challenge leaves an ADR
that records one choice instead of a decision. That is a defect.
`goal.min_work.challenge_stage_run` must be true before the design can
complete.

### 7.1 Confront unconsidered risks

Exploration will surface risks. Compare them to `intent.risks`. Put every
risk that the list omits to the engineer, with its evidence. Offer
accept, mitigate, or dispute through `AskUserQuestion`. Record the
answer.

### 7.2 Contest the approach

Where a survivor option beats `intent.approach` on a stated criterion,
say so and argue for it. The engineer may overrule. Record that overrule
as a rejected option with the reason the engineer gives. That reason is
the field the retro-extraction path always loses. A survivor the
engineer accepts replaces `intent.approach`. The old approach becomes a
rejected option with the reason the survivor won.

### 7.3 Evidence rule

Invert the odyssey skill's `references/review-mode.md` §2. There is no diff yet, so there is no line to
cite. A challenge must cite an ADR id, a district id from
`inventory.yaml`, or a stack-card boundary rule. Do not raise a
challenge that has no citation. Never cite a `path:line` location. No
line exists yet.

### 7.4 Empty result and bounds

State an empty result in plain words. Write the sentence the engineer
should read: exploration surfaced no risk outside what they already
named, and no survivor beat the stated approach. That sentence proves
the stage ran.

Cap each challenge at a few exchanges. If it does not resolve, record
both positions and move on. Name what you could not check. An open
question belongs on the record. A silent gap does not.

## 8. Assessment and findings

Write `assessment` with `stage: "design"`. Every finding carries
`kind: "prediction"`. A guess must never look like a check.

Answer the same three questions as the odyssey skill's `references/review-mode.md` §3, against the
envisioned change, not a diff.

1. Is this sensible? Does the approach solve `intent.problem`? Does that
   problem belong in this repo, at this layer, in this district?
2. Does this help or hurt maintainability? Name the invariant the design
   would establish. Put it in `constraint_introduced`.
3. New valuable pattern, duplicate, or reinvention? Search
   `data/adrs.json` and `inventory.yaml`. A `duplicate` or `reinvention`
   verdict must cite the ADR id or district id.

Every finding cites an ADR id, a district id, or a boundary rule. A
finding with no citation does not go in the array. Write `regret_risk`:
one paragraph on what the team lives with if this design ships as
written. `verdict` uses the same values as the odyssey skill's `references/review-mode.md` §8: `sound`,
`concerns`, `rework`. It is not a gate.

## 9. Stage 5 — Draft

Write five artifacts. Every prose field obeys `${CLAUDE_PLUGIN_ROOT}/shared/prose-budget.md`. You may
draft the thirty-second voice script first. Then write each field by the writing rules there. Run
`prose_budget.py check` on `goal.json`, `intent.json`, and `assessment.json`, and fix every ceiling
line. A cap is soft, so keep a point rather than cut it. STE is not optional, and a cap does not
replace it. Run each
prose pass through `Skill("architect:ste-writing")` in flavored mode. If that call
gives `Unknown skill`, read `${CLAUDE_PLUGIN_ROOT}/shared/skills/ste-writing/SKILL.md`
directly and obey that file instead. Use strict mode for ADR procedural
text: the constraint introduced, and the boundary rules.

This applies in full to `intent.json`'s prose fields: `problem`,
`approach`, `alternatives[].rejected_because`, and `stop_condition`. A
prior design in a sibling repo wrote `problem` as one 180-word sentence,
strung together with dashes and parenthetical citations instead of
periods. That is the failure mode this rule exists to stop. Draft each
field as ordinary flavored-mode prose: a 25-word sentence cap, one topic
per paragraph, no semicolons, no dash-joined clause chains standing in
for periods. A file-and-line citation belongs in a short clause of its
own sentence, not stacked three deep inside one. Before you show
`intent.json` to the engineer, run:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/shared/skills/ste-writing/ste-lint.py" --mode flavored <file>
```

against each prose field (write it to a temp file first if the linter
needs a file argument). Revise any field the linter flags, then show the
result to the engineer per step 5 below.

1. **ADR.** Write `docs/architecture/adr/ADR-NNNN-<slug>.md` from
   `skills/architecture/references/templates/adr-template.md`. Set
   `state: decided` and `source_pr: null`. Copy `alternatives` from
   `intent`. Then run:

   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/build_index.py"
   ```

   Never write `data/adrs.json` by hand.

2. **Diagrams.** Reuse the diagram contract in the mermaid skill's `references/diagram-mode.md` for
   levels 1 to 3. Ground each diagram in the proposal, not a diff. There
   is no PR number yet. Write:

   - `docs/architecture/designs/<name>/diagrams/level-1.mmd` (`C4Container`)
   - `docs/architecture/designs/<name>/diagrams/level-2.mmd` (`sequenceDiagram`)
   - `docs/architecture/designs/<name>/diagrams/level-3.mmd` (`classDiagram`)

   Do not write under `data/diagrams/pr{N}-`. Do not run
   `build_diagrams.py`. That script keys on a PR number. The subagent
   uses the same mermaid dual-path guard as §6.

   The diagrams also include the named slot
   `diagrams/runtime-architecture.svg`: an authored inline SVG per
   `references/runtime-architecture-diagram.md`, validated by
   `uv run plugins/architect/scripts/check_design_svg.py`, and compiled by
   `build_index.py` to `record["diagrams"]["runtime"]`. The viewer renders
   it as the lead tile inside the architecture level, ahead of the level-3
   class diagram. The level-1 overview stays the design's leading diagram.
   The runtime diagram is never a numbered level. It never enters the shared
   mermaid pipeline: `build_diagrams.py` does not see it, and `--strict`
   mermaid-cli testing does not apply. Show it with the other artifacts,
   and narrate it as a prediction, never a check.

3. **Envisioned pull request.** Write
   `docs/architecture/designs/<name>/pr-draft.md` from
   the odyssey skill's `references/pr-description-template.md`.

4. **Narrative.** Write `narrative.json` into
   `docs/architecture/designs/<name>/`. The viewer renders it as the
   design's three levels: `intent` (`tagline`, `narration`),
   `problem_solution` (`problem`, `solution`, `narration`, `beats[]`,
   `alternatives[]`), and `architecture` (`narration`, `beats[]`). Each
   `beats[]` entry carries a `kind` and a `text`. Ground every field in
   `intent` and the ADR draft. Do not invent content the interview and
   challenge stages did not produce. A design carries no `file_changes`
   level. The viewer's `DESIGN_N_LEVELS` caps a design at three levels,
   because a design has no diff yet — only a pull request does.

5. **Intent and assessment.** Write `intent.json` and a
   `stage: "design"` assessment into `docs/architecture/designs/<name>/`.
   Show both to the engineer before you write them to disk.

`contracts.md` is an optional artifact beside those five. Write it when and
only when the design touches a public interface or durable state. It carries
`## Endpoints` and `## Data models`, one section each. Every entry is a
prediction grounded in the ADR draft, not a check. Show the file with the
other artifacts before you write it to disk. When the design touches neither,
skip the file and state the skip with its reason, out loud, the way a Gate 2b
n/a line states a gate does not apply. A silent skip is a defect.

After the five artifacts above are written, update the glossary. This is a
separate step, not a sixth artifact: it updates an existing repository-wide
file, `DDD-VOCABULARY.md`, rather than writing a new file under this
design's own directory.

**Vocabulary.** For each term the interview resolved, add or sharpen its
entry in `DDD-VOCABULARY.md`, in the glossary's own format: an anchor
line, the bold term with its context id, at most two sentences on what
the term is, and an `_Avoid_` line for any rejected synonym. If a term
the engineer used in this design conflicts with an existing entry, that
is a conflict, not a silent overwrite. Ask the engineer which meaning
holds before you write anything, and record the losing usage under
`_Avoid_` on the entry that wins.

## 10. Stage 6 — Review routing

Before the engineer reads the draft, follow Present for review in
`Skill("cobuilder-artifacts")` with the route `#/<work>/intent`. Give the
engineer the link.

Before the reviewer round, restate the touched paths from stage 1 for the
design. Run
`uv run "${CLAUDE_PLUGIN_ROOT}/shared/boundary_check.py" --paths <paths> --require`.
A non-zero exit is a FAIL finding. The finding cites the context id or the
path that failed. Pass it to the reviewer round. The reviewer stays advisory,
but the FAIL finding goes to the engineer with the other findings.

Before the engineer reads, the session also spawns a draft review. Use the
ADR-0005 dual-path pattern: invoke the reviewer as a named agent where the
harness resolves one, and when that call errors, paste the instructions of
this block into a session-spawned subagent on `glm-5.3-flash:cloud`. They
are the reviewer's own brief. No new agent file ships. The reviewer reads
`goal.json` and `intent.json` and derives a blind rubric from those two
files only, before it opens the ADR draft, the diagrams, or the runtime SVG.
It runs two passes. First, validation: score the draft against that rubric,
and cite every finding, either an ADR id, a district id, or a boundary rule,
with every finding kind set to `"prediction"`. Second, re-exploration: seed
exploration with the final draft and return survivor options that beat
`intent.approach` on the goal's criteria, each with a reason, or an argued
`none-found`. The findings enter this stage as classified challenges the
engineer adjudicates, under the citation rule of §7.3. The reviewer never
writes `intent.json`. An endorsed survivor reaches `intent.alternatives` only
through the stage-4 record, because stage 4 alone fills that field (ADR-0035).
The session records the round by setting `goal.min_work.draft_review_run` to
true only after a reviewer round returns. The reviewer is advisory. It cannot
block approval on its own. The churn detection below and the round limits
govern any retry.

The engineer reads the draft and answers in the session. Material
feedback returns to stage 3. A real objection usually invalidates an
option or surfaces a constraint. Cosmetic feedback returns to stage 5.
Wording, diagram layout, and ADR order are cosmetic.

State the classification. Let the engineer overrule it.

Detect churn. Each round, hash the ADR draft plus the option set. Two
consecutive rounds with no material change mean the loop circles. Say
so, name the unresolved disagreement, and ask the engineer to decide.
Do not run a third unchanged round.

Re-read `goal.json` at the top of every round and restate the outcome.
The file is the memory. The conversation is not.

`goal.limits` defaults to warn after three rounds and cut off at six.
Do not ask for a budget. An engineer who wants different limits says so.

## 11. Stage 7 — Branch

Ask **one question only**, with `AskUserQuestion`: is this one pull
request or several? If several, capture the epic slugs the engineer
names. **Do not decompose the work.** Decomposition is implement
G1 work.

Then confirm the first branch name with `AskUserQuestion`. Create the
**first local branch only**:

- One epic: `design/<name>`
- Several epics: `design/<name>/<first-epic-slug>`

Record it in `goal.json.epics[].branch`. No push. No `gh pr create`.
No other remote action. This stage is unreachable under
`--non-interactive`. There is nobody there to confirm.

Design mode's own workflow ends here. To build this design's epics, run
`/implement:start`.

Generate mode strips `design/`, takes the first segment
as the design name, and takes the rest as the epic slug. If that parse
fails, it scans every `goal.json` for a matching `epics[].branch`.

## 12. `goal.json` schema

Do not keep `branch` as a scalar. The join lives on `epics`.

```json
{
  "name": "checkout",
  "title": "Checkout",
  "created": "2026-08-19",
  "outcome": "<stage 0, before any file is read>",
  "done_when": ["<observable state, not activity>"],
  "abort_if": ["<what would kill this design>"],
  "min_work": {
    "derived_from": "3 districts, 2 colliding ADRs, 1 boundary rule",
    "alternatives_explored": 3,
    "boundary_rules_checked": true,
    "challenge_stage_run": true,
    "draft_review_run": true
  },
  "limits": { "warn_after_rounds": 3, "cutoff_rounds": 6 },
  "epics": [
    {"id": "E1", "slug": "guest-checkout",
     "outcome": "<testable criterion>",
     "branch": "design/checkout/guest-checkout",
     "pr": 42, "state": "merged"},
    {"id": "E2", "slug": "saved-cards",
     "outcome": "<...>", "branch": null, "pr": null, "state": "planned"}
  ],
  "stage": "approved",
  "supersedes": null,
  "rounds": [
    { "n": 1, "changed": true, "feedback_class": "material" }
  ]
}
```

Derive `min_work` and `limits`. Do not ask for them. Derive `min_work`
from the districts the outcome touches, the ADRs it collides with, and
whether it crosses a boundary rule. Set `challenge_stage_run` only after
stage 4 ran and recorded its outcomes. Set `draft_review_run` beside it only
after a stage-6 reviewer round returned, not when the spawn was skipped.

Design mode writes epic slugs at stage 7. It does not write testable
criteria. A later factory pass may fill `epics[].outcome`.

`goal.stage` takes one of six values. The Work board reads exactly these
(`_bundle_meta.DESIGN_STAGES`). `build_index.py` rejects a goal with any other
value or none, because a design with another stage shows in no lane.

| Value | Meaning |
|---|---|
| `backlog` | Stages 0 to 5 are in progress, or design mode stopped before the engineer approved the draft. |
| `decided` | A decision record exists, and no approved design follows it. |
| `review` | Stage 6 is in progress, or stage 7 just created the branch. |
| `approved` | The reviewed design is approved, and at least one epic has no merged pull request. |
| `implemented` | Every epic has a merged pull request. |
| `superseded` | Stage 0 replaced this design with a newer one. |

`design` is a stage of `assessment.json`, not of `goal.json`. Do not write it
into `goal.stage`. A design reaches `implemented` when every epic has a merged
pull request.

## 13. What this mode does not do

- **No foreign target.** No `--repo`. Refuse a design against another
  checkout.
- **No remote action.** No push, no pull request, no GitHub write.
- **No epic split.** Capture slugs. Do not break the work into ordered
  epics, acceptance tests, or cross-epic contracts.
- **No timeline key.** Do not mint a synthetic `pr` so a design can
  enter `story.json`.
- **No second questionnaire.** Select questions from the gaps. The five
  topics are a budget, not a script.
- **No observation dressed as a check.** Every design-stage finding is a
  prediction.
- **No completion without stage 4.** An empty `alternatives` array after
  a silent challenge is a failed run, not a simple design.
