# Assessment — PR #16 — book-index.md gains a nano tier, and the security corpus stops reading unconditionally in full

**Verdict:** Concerns  
**Risk tier:** Architectural  
**Stage:** pre-merge

## Summary

Vendors 26 book files and rewrites two escalation rules that govern how Design/Review/Maintenance mode consult reference material. Both new rules verified behaviorally with a blind subagent pass each (5/5 criteria, both CRITICAL, on the first attempt). The stack card's boundary rules and review checks are not-checkable here — this diff touches no application source, only prose that governs agent behavior, which generic.md's checks were not written to evaluate.

## Question 1 — is this sensible?

Yes. The diff solves the stated problem on both halves: book-index.md now uses the nano/mini tiers upstream publishes instead of jumping straight to full, and the security corpus load now discriminates instead of reading 2179 lines unconditionally every run. The problem belongs in the skills district, at the reference-file layer, consistent with ADR-0011 and ADR-0015, which already live there.

Evidence: `ADR-0011` `ADR-0015` `docs/architecture/adr/ADR-0021-book-index-nano-mini-full-tiering.md`

## Question 2 — maintainability and readability

Helps: consolidates two previously-unstated or under-specified loading behaviors (full-book-only escalation, unconditional-full security load) into explicit, stated rules with an explicit ceiling, replacing a cap that the original approach would have silently violated. Hurts modestly: the vendored surface for books triples (14 to 42 files) with no working sync script to keep them current, and both new rules are judgment-gated with no mechanical enforcement at merge time — only a one-time behavioral verification.

**Constraint introduced:** A design or review-mode session must load a minimum of three nano-tier book excerpts before escalating any one book to mini or full; full-tier loading is judgment-gated, never unconditional. A review or maintenance session must read the first ~30 lines of all 14 security corpus files unconditionally, and may read a file's remainder in full only when the summary shows applicability or ambiguity, never when judgment alone says to skip.

Evidence: `plugins/cobuilder-architect/skills/architecture/references/book-index.md` `plugins/cobuilder-architect/skills/architecture/SKILL.md`

## Question 3 — new pattern, duplicate, or reinvention?

**New pattern, and it earns its place**

No ADR or district in this repo previously covered tiered escalation for reference material an agent reads mid-task. This buys a stated, checkable ceiling on a previously-unbounded read (books) and a large unconditional read (security corpus), in both cases without adding infrastructure ADR-0015/ADR-0017 would forbid.

Evidence: `district:skills`

## Will we regret this?

If the judgment gates in both new rules erode under time pressure the way this repo's Gate 4b history shows unenforced steps tend to, the team is left with the worst of both worlds: the vendoring cost (42 book files instead of 14, still no sync script) and the unconditional-read cost this change was meant to remove, because sessions quietly revert to reading full every time. The one mitigation in place is that Gate 4c's new behavioral-rubric case gives a cheap, repeatable way to re-check this specific risk — but that check has to actually get re-run periodically for the mitigation to hold. Nothing currently schedules that re-run.

## Findings

| Severity | Finding | Evidence |
|---|---|---|
| concern | Both new escalation rules are enforced by prose alone, with no mechanical consumer. This repo's own CLAUDE.md documents this exact failure mode from the Gate 4b history: an unenforced step erodes under time pressure. | `plugins/cobuilder-architect/skills/architecture/references/book-index.md` |
| note | books/README.md's scripts/sync-books.sh drift-check script still does not exist, and this diff triples the number of files that script would need to check (14 to 42). | `plugins/cobuilder-architect/skills/architecture/references/books/README.md` |
| note | Both behavioral rubrics passed on the first blind attempt, which is a positive signal but a single data point, not a statistical guarantee of the rule's robustness across many future sessions. | `.cobuilder/rubrics/book-index-tiering/slice-1.md` |

**Suggestions**

- **Both new escalation rules are enforced by prose alone, with no mechanical consumer. This repo's own CLAUDE.md documents this exact failure mode from the Gate 4b history: an unenforced step erodes under time pressure.** — The new Gate 4c behavioral-rubric case (cobuilder-implement's SKILL.md) gives future changes to this prose a repeatable way to re-verify it. Consider re-running a blind pass periodically, not only at merge time, since a rule that was followable once is not a guarantee it stays followable as the surrounding prose grows.
- **books/README.md's scripts/sync-books.sh drift-check script still does not exist, and this diff triples the number of files that script would need to check (14 to 42).** — Explicitly out of scope for this change, per intent.out_of_scope, but the gap grows with this diff and is worth a follow-up design.
- **Both behavioral rubrics passed on the first blind attempt, which is a positive signal but a single data point, not a statistical guarantee of the rule's robustness across many future sessions.** — No action needed now; noted so a reviewer does not over-read one passing attempt as proof the rule can never be followed incorrectly.

## Boundary checks

| Result | Rule | Source | Evidence |
|---|---|---|---|
| not-checkable | The dependency rule: inner layers never import outer layers. | `stacks/generic.md` | `This diff changes zero application source files (no .py, no import statements). generic.md's boundary rules target code dependency direction, which this diff has none of — only markdown reference files, JSON design/index documents, and one Python-skill's own SKILL.md prose.` |
| not-checkable | Configuration crosses into code in one place, not scattered env reads. | `stacks/generic.md` | `No config or environment-variable-reading code changed in this diff.` |

## District delta

- `skills`: 233 -> 259 files

---

_Generated by cobuilder-architect submit mode on 2026-08-26._
