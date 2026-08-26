# Rubric: Slice 1 — book-index.md Tier 2 escalation (ADR-0021)

Feature: book-index-tiering
Epic: E1
Slice goal: book-index.md's rewritten escalation rule is actually followed
by a fresh agent doing a realistic grounding task, not just readable prose.
Test command: none — this slice edits a file that governs another mode's
own procedure (see SKILL.md's Gate-selection exception). Evidence is a
blind agent's transcript, not a test suite.

Written before the blind pass ran. Not shown to the blind agent.

## Criteria

### C1 — Loads a minimum of three nano excerpts before any mini/full [CRITICAL]
**Must be true:** the agent's Read tool calls include at least 3 distinct
`*.nano.md` files under `references/books/` before it reads any `*.mini.md`
or full `*.md` book file (a book file with neither `.nano.` nor `.mini.` in
its name).
**Evidence:** the ordered list of Read calls against `references/books/*`.
**Score:** 1.0 if >=3 distinct nano files precede any mini/full book read.
0.5 if 1-2 nano files were read before a mini/full escalation. 0.0 if zero
nano files were read, or a mini/full book was read with no prior nano read
at all.

### C2 — Does not escalate every candidate to mini/full [CRITICAL]
**Must be true:** of the nano-tier books read, at most one is escalated to
mini or full tier in the same task.
**Evidence:** count of distinct books whose mini or full tier was read.
**Score:** 1.0 if 0 or 1 book escalated. 0.0 if 2 or more books escalated.

### C3 — full-tier read only follows nano for that same book
**Must be true:** any full `*.md` book file read is for a book whose
`*.nano.md` was also read earlier in the same task (no direct-to-full read).
**Evidence:** cross-reference nano reads against full reads by book name.
**Score:** 1.0 if every full read has a matching prior nano read for the
same book. 0.0 if any full read has no matching prior nano read.

### C4 — unified-software-engineering.md stays outside the ladder
**Must be true:** if `unified-software-engineering.md` is read at all, it
is not preceded by loading a nano/mini tier for it (it has none) and is not
combined with any other book in the same task.
**Evidence:** presence/absence of this file in the Read list, and what else
was read alongside it.
**Score:** 1.0 if either not read, or read alone with no other book file in
the same task. 0.0 if combined with another book's file.

### C5 — the agent states its escalation reasoning
**Must be true:** the agent's final answer states, in its own words, which
book (if any) it escalated past nano and why — not just a silent file list.
**Evidence:** presence of an explicit statement naming the escalated book
and a reason tied to the task.
**Score:** 1.0 if stated. 0.0 if the escalation (or non-escalation) is
unexplained.

**Pass threshold:** C1 and C2 are CRITICAL. A 0.0 on either means the rule
as written is not followable, and `book-index.md`'s wording needs sharper
language, not that the blind agent is at fault.

## Scores — attempt 1

| Criterion | Score | Note |
|---|---|---|
| C1 | 1.0 | Read `release-it.nano.md`, `clean-architecture.nano.md`, `designing-data-intensive-applications.nano.md` (3 distinct nanos) before the one full read. |
| C2 | 1.0 | Only `release-it` escalated; the other two stayed at nano. |
| C3 | 1.0 | `release-it.md` (full) followed `release-it.nano.md` for the same book. |
| C4 | 1.0 | `unified-software-engineering.md` not read at all this task. |
| C5 | 1.0 | Stated explicitly: escalated only `release-it` "since [the other two books'] principles ... aren't what this design decision turns on." |

**Result: 5/5, both CRITICAL criteria pass on attempt 1.** No re-run needed.
See `evidence/slice-1-attempt-1.md` for the full transcript this was scored
against.
