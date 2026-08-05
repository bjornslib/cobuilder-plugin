# Assessment — PR #6 — Pr Odyssey Improvements 7Suouc

**Verdict:** Concerns  
**Risk tier:** Sensitive  
**Stage:** pre-merge  
**Author-flagged unknowns:** 1 (raises the tier by one step)

## Summary

A genuinely new capability — author interview plus bundle-grounded assessment — introduced cleanly, with no duplicate in adrs.json and no scattered env reads. The one real cost: the author cannot fully defend the authored-field preservation guard that now protects intent/assessment alongside every other hand-authored field, and that guard is the only thing standing between a future schema migration and silently destroyed narrative content.

## Question 1 — is this sensible?

Yes. intent.problem states the diff-based reconstruction is expensive and lossy, and decision-records-lite.md's own integrity rule 4 (the ADR §3 'alternatives must be real' rule) already carried an escape hatch for exactly the case this PR fixes at the source — a rejected alternative with no trace in the diff. The problem is real, worth solving, and solved at the right layer (an interview before merge, not a smarter diff reader after).

Evidence: `skills/odyssey/references/decision-records-lite.md` `skills/odyssey/references/interview-guide.md`

## Question 2 — maintainability and readability

Helps. The change establishes one invariant and enforces it in one place: intent and assessment are authored, guard-protected fields, declared once in AUTHORED_TIMELINE_FIELDS, and no migration may touch either without declaring it in `touches`. That closes off a whole class of future bug (a migration silently dropping review content) with a single tuple edit plus the existing run_guard comparison, rather than a rule that lives only in a docstring somewhere.

**Constraint introduced:** intent and assessment, once written to a timeline entry, cannot be altered by any script — including a future schema migration — unless that migration explicitly declares the field in its `touches` set.

Evidence: `scripts/migrate_bundle.py:73` `scripts/migrate_bundle.py:120-134`

## Question 3 — new pattern, duplicate, or reinvention?

**New pattern, and it earns its place**

No existing ADR or district covers author-interview or pre-merge assessment — the closest prior art is generate mode's post-hoc ADR retro-extraction, which this PR explicitly does not touch or duplicate (review-mode.md §9 states submit mode writes no ADR). The pattern earns its place: it is the only mode that captures information that literally cannot be recovered later.

Evidence: `.prodyssey/self/data/adrs.json` `skills/odyssey/references/review-mode.md`

## Will we regret this?

The safety property this PR leans on hardest — the authored-field guard that now also protects intent/assessment — is understood by its own author only at the level of "the tests pass," not "I can predict what happens when a future migration's shape disagrees with harvest_authored()'s assumptions." That's a tolerable regret today because the guard fails closed (no partial writes) rather than failing open, but it means the next schema bump that needs new authored-field coverage has no one who can defend the guard's behavior end-to-end without re-deriving it. The smaller regret: --require-review checks assessment shape, not substance, so a future submit-mode run under time pressure could satisfy the gate with empty-evidence answers and nothing mechanical would flag it.

## Findings

| Severity | Finding | Evidence |
|---|---|---|
| concern | The author cannot fully explain or defend the authored-field preservation guard (harvest_authored/run_guard) that this PR extends to cover intent/assessment — per the author's own answer during this interview. That guard is now the sole mechanism protecting all hand-authored narrative, ADR, and review content across every future schema migration. | `scripts/migrate_bundle.py:83-134` |
| note | verify_bundle.py's check_assessment validates assessment shape only — a known verdict plus a non-empty `answer` string per question — and its own docstring says so directly. --require-review can therefore pass an assessment whose `evidence` arrays are empty and whose `findings` is `[]`, with no mechanical distinction from a thorough one. | `scripts/verify_bundle.py:245-259` |

**Suggestions**

- **The author cannot fully explain or defend the authored-field preservation guard (harvest_authored/run_guard) that this PR extends to cover intent/assessment — per the author's own answer during this interview. That guard is now the sole mechanism protecting all hand-authored narrative, ADR, and review content across every future schema migration.** — Before the next schema migration is written, have the author (or a fresh review pass) trace run_guard() end-to-end against one deliberately-malformed migration, so the guard's failure mode is understood firsthand rather than trusted on the strength of passing tests.
- **verify_bundle.py's check_assessment validates assessment shape only — a known verdict plus a non-empty `answer` string per question — and its own docstring says so directly. --require-review can therefore pass an assessment whose `evidence` arrays are empty and whose `findings` is `[]`, with no mechanical distinction from a thorough one.** — No action needed now — review-mode.md is explicit that mechanical scripts never judge content quality, so this is working as designed. Worth remembering if --require-review is ever treated as a substitute for actually reading the assessment.

## Boundary checks

| Result | Rule | Source | Evidence |
|---|---|---|---|
| not-applicable | The dependency rule: inner layers never import outer layers (generic.md stack card, Boundary Rules #1) | `stacks/generic.md` | `This codebase has no domain/adapter layering to grep — it's an orchestration skill plus stdlib-only utility scripts, not a layered service.` |
| pass | Configuration crosses into code in one place, not scattered env reads (generic.md stack card, Boundary Rules #2) | `stacks/generic.md` | `grep -n "os.environ\|os.getenv\|load_dotenv" across all six scripts this PR touches (render_review.py, verify_bundle.py, migrate_bundle.py, extract_diffs.py, extract_story.py, _bundle_meta.py) returns zero matches — submit mode reads and writes only bundle files and git, consistent with SKILL.md's claim that it never calls Gemini.` |

## District delta

- `scripts`: 12 -> 13 files
- `skills`: 50 -> 53 files
- `commands`: 4 -> 5 files

---

_Generated by prodyssey submit mode on 2026-08-05._
