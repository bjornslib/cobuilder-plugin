---
title: "Review Mode — pre-merge architecture assessment reference"
type: reference
status: active
last_verified: 2026-08-04
owner: bjoerns
---

# Review Mode — pre-merge architecture assessment reference

How to assess a change against the bundle, and how to write the result into
the PR's `assessment` block in `data/story.json`. Submit mode runs this after
the interview in `interview-guide.md`, and before it opens the pull request.

The assessment answers three questions about judgment. It does not hunt for
defects. A model already finds a missing null check, an unhandled error path,
or a naming inconsistency, and every repo has other tools for that work. What
no diff-reading tool can answer is whether the change belongs in this system.
That question needs the district map, the decision history, and the narrated
timeline that the bundle already holds. Use them.

## 1. What the assessment produces

One JSON object on this PR's timeline entry:

```json
"assessment": {
  "stage": "pre",
  "generated": "2026-08-04",
  "verdict": "concerns",
  "risk_tier": "architectural",
  "summary": "<two or three sentences a reviewer can read first>",
  "sensible": {
    "answer": "<...>", "evidence": ["<path:line or ADR id>"]
  },
  "maintainability": {
    "answer": "<...>",
    "constraint_introduced": "<the invariant this change establishes>",
    "evidence": ["<path:line>"]
  },
  "pattern": {
    "verdict": "duplicate",
    "answer": "<...>",
    "duplicates": ["ADR-0003"],
    "evidence": ["<path:line>"]
  },
  "findings": [
    {"severity": "concern", "claim": "<...>", "evidence": "scripts/foo.py:41",
     "district": "scripts", "suggestion": "<...>"}
  ],
  "boundary_checks": [
    {"rule": "<the rule text>", "source": "stacks/python-fastapi.md",
     "result": "violation", "evidence": "<the grep hit>"},
    {"rule": "<the rule text>", "source": "stacks/python-fastapi.md",
     "result": "not-checkable",
     "evidence": "<why the grep could not run, for example: path does not exist in this repo, or the pattern targets Python and this repo is Swift"}
  ],
  "delta": {
    "districts_added": [], "districts_changed": [],
    "edges_added": [], "edges_removed": []
  },
  "regret_risk": "<one paragraph>",
  "drift": []
}
```

`stage` is `pre` or `post`. `drift` stays empty until the post stage. See §7.

## 2. Evidence discipline

This rule comes from `baseline-derivation.md` §1, and it holds here without
change: **never write a claim you did not check.**

- Every entry in `findings` carries an `evidence` value. That value is a
  `path:line` reference, or an ADR id, or a district id from
  `inventory.yaml`. A finding with no evidence does not go in the array.

- Read the file before you write about it. A diff hunk shows you the change.
  It does not show you the surrounding code that the change has to live with.

- Report what you could not check. "I did not verify the callers of this
  function" is a useful sentence. A confident claim about callers you never
  read is not.

- Do not repeat the author's `intent` back as a finding. The interview already
  recorded it. The assessment adds your reading, or it adds nothing.

## 3. The three questions

Answer all three. Each answer needs evidence, or it does not get written.

### 3.1 Is this sensible?

Does the change solve the problem that `intent.problem` states? Is that
problem worth solving in this repo, at this layer, in this district?

Read the two halves separately. A change can solve its stated problem
correctly and still be the wrong change, because the problem belongs
somewhere else. Say which of the two halves fails when one does.

When `intent.source` is `inferred`, say so in the answer. You assess the
change against your own reading of the problem, not against the author's
statement, and a reviewer needs to know that.

### 3.2 Does this help or hurt maintainability and readability?

Name the invariant that the change establishes. `adr-template.md` already
carries this phrasing as **"Constraint introduced: the invariant this decision
establishes"**, and `constraint_introduced` holds it here.

A change helps when it removes a special case, moves a decision to one place,
or makes an illegal state harder to write. A change hurts when it adds a second place to change for one reason. It also
hurts when it widens a public interface without a caller that needs it, or
makes a rule that only its author knows.

Judge the code the repo will keep, not the diff. A large diff that deletes a
duplicated path improves maintainability. A small diff that adds a
config-driven branch to a hot function can hurt it.

### 3.3 New valuable pattern, duplicate, or reinvention?

This is the question the bundle exists to answer. Pick one verdict:

| Verdict | Meaning |
|---|---|
| `conforms` | The change uses a pattern the repo already has, the way the repo already uses it. This is the common, good case. |
| `new-valuable` | The change introduces a pattern the repo does not have, and the pattern earns its place. Say what it buys. |
| `duplicate` | The change implements, a second time, something a district or an ADR already provides. |
| `reinvention` | The change solves a problem the repo already solved, in a different way, and does not say why the existing way fails. |

**A `duplicate` or a `reinvention` verdict must cite what it duplicates.**
Put the ADR id or the district id in `duplicates`. Put the file evidence in
`evidence`. A verdict with no citation is an accusation, and it wastes the
reviewer's time. When you cannot cite it, the verdict is not `duplicate`.

Search three sources before you answer:

1. `data/adrs.json` — every structural decision the repo already made. Match
   on `problem` and on `decision`, not on the title.
2. `inventory.yaml` — does a district already own this capability?
3. The touched districts in the code, for a function or a module that already
   does this work.

**Degrade honestly.** A bundle with one or two PRs holds almost no decision
history. The honest answer is then "insufficient history to judge", and you
write that. Do not manufacture a verdict from a thin baseline. This follows
`baseline-derivation.md` §3.

### 3.4 Then answer the real question

Write `regret_risk`: one paragraph on what the team lives with if this change
merges as written. Not "does this work". "What do we regret in six months."

Name the cost in the terms the repo will feel it: a second place to change,
a dependency somebody has to maintain, a boundary that later work has to
route around, or a rule with no test to hold it.

## 4. Risk tier

`risk_tier` is `routine`, `architectural`, or `sensitive`. Compute it from
three inputs, and take the highest:

1. **District sensitivity.** Read the optional `sensitivity` field on each
   touched district in `inventory.yaml`. See `baseline-derivation.md` §3a.

2. **Diff heuristics**, for a bundle whose baseline carries no `sensitivity`
   values. Treat a change to authentication, authorization, billing, data
   deletion, a database migration, infrastructure, or a security boundary as
   `sensitive`. Treat a change to a module boundary, a dependency direction, a
   public interface, or a cross-cutting pattern as `architectural`.

3. **Author understanding.** A non-empty `intent.unknowns` array raises the
   result by one step, `routine` to `architectural`, or `architectural` to
   `sensitive`. Code that the author cannot explain costs the team more than
   the same code with an author who can.

The tier sets how deep the assessment goes, and submit mode reports it.
**It is not a gate.** Nothing in this mode blocks a merge. Nothing refuses
to open a pull request.

## 5. Boundary checks from the stack card

Detect the stack with `stacks/README.md`, then read the matching card. Two
sections drive this step:

- **`## Boundary Rules`** — each rule ships with a literal `grep` command. Run
  it against the touched paths. Write one entry in `boundary_checks` per rule,
  with `result` set to `pass`, `violation`, or `not-checkable`, and the grep
  hit or the reason as `evidence`.
- **`## Review Checks`** — the stack's named smells. Check each one against
  the diff. A hit becomes a `findings` entry, not a `boundary_checks` entry.

Read `## Reference Structure` and `## ADR Topics` for context.

A `result` takes one of three values. `pass` means the grep ran and found no
hit. `violation` means the grep ran and found a hit that breaks the rule.
`not-checkable` means the grep could not produce a signal in this repo,
because the path in the rule does not exist, or the pattern targets a
language the repo does not use. `not-checkable` is not `pass`. A rule that
could not run tells the reviewer nothing, and recording it as `pass` claims a
clean result that nobody verified. `not-checkable` is also the one supported
spelling for this case. Earlier bundles used `not-applicable`, a value this
reference never defined. Treat that value as the same thing, and write
`not-checkable` going forward.

When every grep from a card returns empty, do not report a clean result.
Record that fact in the assessment `summary`. An all-empty run across a whole
card is stronger evidence that the card does not match the repo than that the
code is clean. Name the mismatch in the summary, for example that the stack
card targets a language the repo does not use, and fall back to
`stacks/generic.md`'s Review Checks and Boundary Rules for this PR.

**Never read `## Corpus Load`.** Those sections point at
`corpus/principles/**/*.yaml`, which this plugin does not ship. The paths are
dead. `README.md`'s extraction manifest records why.

## 6. District delta

`delta` records the change to the world map, before against after:

- `districts_added` — a district that this change creates.
- `districts_changed` — `{"id": ..., "files_before": N, "files_after": N}`.
- `edges_added` and `edges_removed` — an import edge between districts that
  the change creates or deletes, as `"<from> -> <to>"`.

Derive the edges the way `baseline-derivation.md` §1 does, with a grep in both
directions. Do not claim an edge you did not check.

A new edge between two districts is the highest-value line in the whole
assessment. It is the moment a repo's shape changes, and it is nearly
invisible in a diff.

## 7. The post stage

The post stage runs after the PR merges. It reads the `intent` that the pre
stage captured, compares it against the merged diff, and writes `drift`.

Each entry is `{"kind": ..., "claim": ..., "evidence": ...}`. Four kinds:

| `kind` | What it reports |
|---|---|
| `out_of_scope` | The merged diff touches something `intent.out_of_scope` said it would not. |
| `unaddressed_risk` | An `intent.risks` entry with no test, no guard, and no follow-up in the merged code. |
| `adopted_alternative` | The merged code uses an option that `intent.alternatives` listed as rejected. |
| `delta_shift` | The district delta that landed differs from the delta the pre stage projected. |

**Never rewrite the pre-stage `intent`.** The value of the post stage comes
from comparing what shipped against what the author said before it shipped. An
`intent` block edited after the fact reports nothing. Write a new
`assessment` with `stage: "post"`, and leave `intent` alone.

When `intent.design` is set, measure drift per epic against that epic's slice
of the design (the epic's outcome, or the design intent as it applies to this
PR). Do not measure this PR against the whole ADR. No single PR was going to
satisfy all of a multi-epic design.

Drift is not blame. A change of plan during review is normal and often right.
The entry records that the plan changed, so that the narrative and the ADRs
built later describe the change that merged.

## 8. Verdict

`verdict` is one value:

| Verdict | Meaning |
|---|---|
| `sound` | The three questions all answer well. No blocker, and no unresolved concern. |
| `concerns` | The change works, and something in it costs the team. The `findings` array says what. |
| `rework` | A finding with `severity: blocker`, or a `duplicate` or `reinvention` verdict with a citation. |

`severity` on a finding is `blocker`, `concern`, or `note`.

A `rework` verdict does not stop submit mode from opening the pull request.
The author reads the verdict, and the author decides. See the Submit mode
section of `SKILL.md`.

## 9. What this mode does not do

- **No defect hunting.** No missing null check, no naming, no unhandled error
  path, no test-coverage gap. Other tools own that work, and a review that
  mixes commodity findings with judgment buries the judgment.

- **No score.** No number, no grade, no pass rate. The verdict and the
  findings carry the result.

- **No gate.** Nothing here blocks a merge or refuses to open a PR.

- **No corpus.** See §5.

- **No new ADR.** A pre-merge decision is a proposal. Generate mode writes the
  record after the PR merges. See `decision-records-lite.md` §3.2.

## 10. Workflow

1. Read the diff, `inventory.yaml`, `data/adrs.json`, the matching stack card,
   and the timeline entries for earlier PRs in the touched districts.

2. Read this PR's `intent` block, or run the interview first.

3. Answer §3.1, §3.2, and §3.3, with evidence for each.

4. Run the stack card's boundary greps (§5). Record the results.

5. Compute the district delta (§6).

6. Compute the risk tier (§4).

7. Write `regret_risk`, then pick the verdict (§8).

8. Write the block into this PR's timeline entry in `data/story.json`.

9. Render the deliverables:
   `uv run scripts/render_review.py --bundle-dir <bundle-dir> --prs <N>`.
