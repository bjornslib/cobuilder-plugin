---
# --- doc-gardener required frontmatter ---
title: "ADR-0009 — Submit mode ends the pre stage by opening the real PR, never a synthetic key"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0009
name: "Submit mode ends the pre stage by opening the real PR, never a synthetic key"
state: approved
groups: []
approved_by: "merge of PR #6"
problem: "story.json's timeline keys every entry on an integer `pr` field, and verify_bundle.py, record_publish.py, manifest.js, and the viewer all depend on that being the change's real, permanent PR number. Submit mode interviews the author and assesses the change before the PR exists, so at that point there is no such number to key on yet."
decision: "Submit mode's pre stage stages its output — description, intent, and assessment — under exports/branch-<slug>/, keyed by branch name, and only writes the real story.json timeline entry after `gh pr create` returns an actual PR number, ending the pre stage by opening the PR for real rather than by staging a placeholder."
alternatives:
- option: "Mint a synthetic PR key for the story.json timeline entry instead of ending the pre stage by opening the real PR"
  rejected_because: "It would have been hard to reliably connect what the author said in the interview back to the actual PR number once one existed. Opening the PR as the flow's last step keeps the interview answers and the real PR tied together from the start."
forces:
- "story.json's schema keys the timeline on an integer `pr`, with four consumers (verify_bundle.py, record_publish.py, manifest.js, the viewer) that all assume it is real and stable."
- "The interview and assessment both have to happen before the PR exists, since that is the only point intent is still recoverable — but nothing before `gh pr create` returns has a real PR number to attach them to."
- "Pushing a branch and opening a PR are the only actions submit mode takes outside .prodyssey/, and they only run after an explicit confirmation — so the design has to tolerate a run that stages content and stops without ever creating a PR."
related_decisions: []
related_concerns: []
history:
- state: decided
  date: unrecorded
  source: .cobuilder-architect/self/data/adrs.json
  note: "Retro-extracted from the self-bundle."
- state: approved
  date: "2026-08-04"
  by: "merge of PR #6"
  note: "Approved by the merge that shipped the decision."
maps_to:
  district: commands
  unanchored: true
  modules:
  - commands
  rule: "Submit mode never writes a synthetic PR key. The pre stage ends by opening the real PR."
delivers:
  capability: "An author's stated intent and a bundle-grounded assessment attach to a PR from the moment that PR exists, with no reconciliation step and no synthetic key ever entering story.json."
  benefit: "Every timeline consumer keeps its existing assumption that `pr` is the real, permanent number, so nothing downstream needs to learn a second, temporary key scheme."
  beneficiary:
  - developer
  - operator
source_pr: 6
provenance: inferred
---

## Context

Submit mode is the one Odyssey mode that runs before the history it would narrate exists. It interviews the author and assesses the change against the bundle's decision history while the change is still an uncommitted branch, but story.json's timeline schema was designed around merged PRs that already have a permanent, real `pr` number.

## Options considered

1. **Mint a synthetic PR key for the timeline entry.** Rejected — a placeholder key created before the PR exists would need to be reliably reconciled with the real PR number once `gh pr create` returned one, and the author's own interview answers could drift from the PR they end up describing.
2. **Chosen: stage pre-PR output under exports/branch-<slug>/, and end the pre stage by actually opening the PR.** description.json, intent.json, and assessment.json live under a branch-keyed staging directory until `gh pr create` returns a number; only then does the real story.json timeline entry get written, with `intent` and `assessment` attached to it directly.

## Decision

Submit mode's pre stage never writes a placeholder or synthetic key into story.json. It stages everything it can produce before the PR exists under exports/branch-<slug>/, and treats `gh pr create` succeeding as the point the flow's real timeline entry can be written. Pushing and opening the PR are gated on an explicit confirmation; `--non-interactive` cannot reach this step at all.

## Consequences

- **Positive:** No reconciliation step exists between a staged interview and the PR it describes — they are the same object from the moment the PR is real.
- **Constraint introduced:** A branch that never becomes a PR can never enter the timeline; its staged content stays under exports/branch-<slug>/ indefinitely.
- **Negative / accepted:** A run that stops before confirmation produces no timeline entry at all, even though the interview and assessment work already happened — that work is not wasted (render_review.py can still render it from the staging directory), but it is not yet part of the bundle's narrated history.

## Value delivered

- **New capability:** An author's stated intent and a structured assessment attach to a PR from the moment it exists, with no separate keying scheme to maintain.
- **Benefit:** verify_bundle.py, record_publish.py, manifest.js, and the viewer keep their existing assumption that `pr` is real and permanent, so none of them needed to change to support submit mode.
- **Beneficiary:** developer, operator.

## Maps to

District `commands` from .prodyssey/self/inventory.yaml.
