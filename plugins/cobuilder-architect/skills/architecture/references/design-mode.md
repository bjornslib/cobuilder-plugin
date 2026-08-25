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
touches. Load the ADRs that cover those districts. Load the matching
stack card, and earlier timeline entries in the same districts.

If the bundle has no baseline, `SKILL.md` instructs you to run `baseline`
and continue. Say that it will run, then report the elapsed time. Do not
run it in silence. Draft a private hypothesis and a gap list. Keep both
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

1. Invoke `Skill("cobuilder-architect:architecture")` and tell it to run
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

Write five artifacts. Run each prose pass through
`Skill("cobuilder-architect:ste-writing")` in flavored mode. If that call
gives `Unknown skill`, read `${CLAUDE_PLUGIN_ROOT}/skills/ste-writing/SKILL.md`
directly and obey that file instead. Use strict mode for ADR procedural
text: the constraint introduced, and the boundary rules.

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

3. **Envisioned pull request.** Write
   `docs/architecture/designs/<name>/pr-draft.md` from
   the odyssey skill's `references/pr-description-template.md`.

4. **Narrative.** Write `narrative.json` into
   `docs/architecture/designs/<name>/`. The viewer renders it as the
   design's four levels: `landscape` (`tagline`, `narration`),
   `problem_solution` (`problem`, `solution`, `narration`, `beats[]`,
   `alternatives[]`), `architecture` (`narration`, `beats[]`), and
   `file_changes` (the envisioned change, not a diff, since no file has
   changed yet). Each `beats[]` entry carries a `kind` and a `text`.
   Ground every field in `intent` and the ADR draft. Do not invent
   content the interview and challenge stages did not produce.

5. **Intent and assessment.** Write `intent.json` and a
   `stage: "design"` assessment into `docs/architecture/designs/<name>/`.
   Show both to the engineer before you write them to disk.

## 10. Stage 6 — Review routing

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
names. **Do not decompose the work.** Decomposition is cobuilder-implement
G1 work.

Then confirm the first branch name with `AskUserQuestion`. Create the
**first local branch only**:

- One epic: `design/<name>`
- Several epics: `design/<name>/<first-epic-slug>`

Record it in `goal.json.epics[].branch`. No push. No `gh pr create`.
No other remote action. This stage is unreachable under
`--non-interactive`. There is nobody there to confirm.

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
    "challenge_stage_run": true
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
  "stage": "partially-delivered",
  "supersedes": null,
  "rounds": [
    { "n": 1, "changed": true, "feedback_class": "material" }
  ]
}
```

Derive `min_work` and `limits`. Do not ask for them. Derive `min_work`
from the districts the outcome touches, the ADRs it collides with, and
whether it crosses a boundary rule. Set `challenge_stage_run` only after
stage 4 ran and recorded its outcomes.

Design mode writes epic slugs at stage 7. It does not write testable
criteria. A later factory pass may fill `epics[].outcome`.

`goal.stage` values include at least:

| Value | Meaning |
|---|---|
| `design` | Stages 0 to 5 are in progress. |
| `review` | Stage 6 is in progress, or stage 7 just created the branch. |
| `partially-delivered` | At least one epic has a merged pull request, and at least one does not. |
| `delivered` | Every epic has a merged pull request. |
| `superseded` | Stage 0 replaced this design with a newer one. |

A design reaches `delivered` when every epic has a merged pull request.

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
