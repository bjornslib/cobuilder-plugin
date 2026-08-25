---
# --- doc-gardener required frontmatter ---
title: "ADR-0010 — Interview self-consistency check compares blind author accounts by LLM judgment, not keyword matching"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0010
name: "Interview self-consistency check compares blind author accounts by LLM judgment, not keyword matching"
state: approved
groups: []
approved_by: "merge of PR #9"
problem: "Submit mode's interview had no way to catch an author's own account of a change being internally incoherent, or diverging from what the diff shows, before intent was written to disk."
decision: "Ask the problem and approach questions blind, before showing Claude's diff-derived hypothesis, then compare all three accounts by LLM judgment; raise a surviving material mismatch to the author with a resolve-now-or-log choice."
alternatives:
- option: "Keyword/regex comparison of the two author answers"
  rejected_because: "Cannot separate a register difference (same understanding at two altitudes) from a real material disagreement — interview-guide.md §3a states this explicitly as the reason LLM judgment is required instead."
- option: "Silently write any mismatch into intent.unknowns without asking the author"
  rejected_because: "Treats a possible misunderstanding as settled without giving the author a chance to resolve it in the moment; §3a instead offers a choice between working through it now or logging it."
- option: "Add a new intent schema field or a new interview stage for this check"
  rejected_because: "The check reorders two questions §3 already budgets (problem, approach) rather than growing the schema or the stage count."
forces:
- "Submit mode's intent block feeds ADRs and narrative downstream (story-mode.md), so an unreconciled misunderstanding written to disk propagates."
- "The question budget in §3 caps interviews at 6-8 topics; a new stage would compete with that budget."
- "The interviewing Claude already drafts a hypothesis from the diff before asking anything (§2); showing it early would anchor the author's answers instead of testing them independently."
related_decisions: []
related_concerns: []
history:
- state: decided
  date: unrecorded
  source: .cobuilder-architect/self/data/adrs.json
  note: "Retro-extracted from the self-bundle as proposed while PR #9 was still open."
- state: approved
  date: "2026-08-06"
  by: "merge of PR #9"
  note: "PR #9 has since merged. Recorded as approved on export."
maps_to:
  district: skills
  unanchored: true
  modules:
  - skills/odyssey
  rule: "Interview problem and approach answers are compared by judgment, not by keyword match."
delivers:
  capability: "The interview can detect, before a PR opens, when the author's own account of a change disagrees with itself or with the diff."
  benefit: "Catches an unsettled mental model or a factually incorrect claim before it is committed to intent, assessment, and later narrative/ADR text."
  beneficiary:
  - developer
  - operator
source_pr: 9
provenance: inferred
---

## Context

Submit mode's interview drafts a private hypothesis from the diff, then asks
the author a budget of questions and plays the draft back for confirmation.
Nothing in that flow checked whether the author's own account of a change
was internally coherent, or whether it matched what the diff actually
showed. This surfaced live, during a real PR interview, when the author's
own answer materially diverged from the diff (retroactively extracted from
PR #9, still open at extraction time).

## Options considered

1. **Keyword/regex comparison of the two author answers.** Rejected —
   cannot separate a register difference (the same understanding stated at
   two altitudes) from a real material disagreement.
2. **Silently write any mismatch into `intent.unknowns` without asking the
   author.** Rejected — treats a possible misunderstanding as settled
   without giving the author a chance to resolve it in the moment.
3. **Add a new `intent` schema field, or a new interview stage, for this
   check (chosen: neither).** Rejected as unnecessary — the check reorders
   two questions §3 already budgets (`problem`, `approach`) instead of
   growing the schema or the stage count.
4. **Ask the problem and approach questions blind, before showing the
   diff-derived hypothesis, then compare all three accounts by LLM
   judgment (chosen).** Read for meaning, not for words, so a register
   difference does not read as a disagreement.

## Decision

Ask the problem and approach questions back to back, blind, before showing
the hypothesis drafted from the diff. Compare all three accounts —
problem answer, approach answer, and the hypothesis — by judgment. A
surviving material mismatch (checked against the diff first, since the
hypothesis is the newer, less-tested reading) is raised to the author
directly, with a choice: work through it now, or log it. An unresolved
mismatch lands in the existing `unknowns` field, in the author's own
words, the same way an author-reported gap already does.

## Consequences

- **Positive:** Catches an author's own unsettled understanding of a
  change, or a stated claim the diff does not support, before the PR
  opens — not after.
- **Constraint introduced:** The interviewing Claude must not show its
  drafted hypothesis until both the problem and approach questions are
  answered. Showing it earlier would anchor the author's answers instead
  of testing them independently.
- **Negative / accepted:** The check is a judgment call with no mechanical
  backstop. Its accuracy depends on how carefully the interviewing session
  compares the three accounts; a careless comparison can miss a real
  mismatch or over-flag a harmless register difference.

## Value delivered

- **New capability:** The interview can detect, before a PR opens, when
  the author's own account of a change disagrees with itself or with the
  diff.
- **Benefit:** An unsettled mental model or a factually incorrect claim
  gets caught before it is committed to `intent`, `assessment`, and later
  narrative/ADR text that downstream readers trust.
- **Beneficiary:** developer, operator.

## Maps to

District `skills` from `.prodyssey/self/inventory.yaml`.
