# PR #6 — Pr Odyssey Improvements 7Suouc

## Problem

The plugin reconstructs a PR's author intent from its merged diff, long after the author who made the choices has forgotten them. That reconstruction is expensive and lossy — decision-records-lite.md already carried an escape hatch for the case where a rejected alternative leaves no trace in the diff, precisely because generate mode has no way to recover intent nobody wrote down.

The other four modes (baseline, generate, view, publish) all narrate history well, but none of them capture intent before it's forgotten. Submit mode closes that gap at the one point it can still be closed — before the history that later has to be narrated even exists.

## Why this approach

Interview the author before the PR opens, using only what the diff/districts/ADRs/stack card can't already answer; assess the change against the bundle's decision history; then end the pre stage by actually opening the PR (gh pr create) rather than staging it separately, so the flow's natural last step is the PR existing for real.

## Alternatives considered

- **Mint a synthetic PR key for the story.json timeline entry instead of ending the pre stage by opening the real PR** — rejected because It would have been hard to reliably connect what the author said in the interview back to the actual PR number once one existed. Opening the PR as the flow's last step keeps the interview answers and the real PR tied together from the start.

## Out of scope

- Deduplicating the three copies of rewrite_manifest() across extract_story.py/extract_diffs.py/generate_prompts.py
- Incorporating more of the architecture-review skill to further support the user in submitting a clean pull request

## Risks

- Whether the interview's question-budget and evidence-first discipline (never ask what the evidence already answers, target six questions) actually holds up across real PRs, or degrades toward a fixed questionnaire over time.

## How this was tested

Verified the required-failure set for .prodyssey/self is identical to master, and the cobuilder-harness fixture bundle reports the same result count as before. The 1.1-to-1.2 schema migration is a one-line diff on each of the three bundles with zero authored-field guard violations, and it's idempotent. Browser tests cover the assessment sheet, the one-sheet-at-a-time rule, the Escape/scrim paths, switching PRs, and a PR with no assessment.

## Where to focus

- The interview's question-budget and evidence-first discipline
- The authored-field preservation guard in migrate_bundle.py

The author flagged these parts as not fully understood:

- The migration guard in migrate_bundle.py — the authored-field preservation logic that compares story.json before and after a schema migration. The author cannot fully explain or defend this part line-by-line.

---

_Authorship: agent-assisted._
