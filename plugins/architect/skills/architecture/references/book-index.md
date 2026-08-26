---
title: Book Reference Index
description: Fast-scan catalog for picking the right software-engineering book per task without preloading all of them.
status: active
---

# Book Reference Index

Read this file **first** to pick a book. Do not Read any `books/<name>.md` (or its `.nano.md`/`.mini.md` sibling) until a row below clearly fits the task — except when a Self-load default fires (see next section).

Per ADR-0021, each book below is vendored in three tiers: `<name>.nano.md`
(about 20-40 lines), `<name>.mini.md` (about 80-150 lines), and `<name>.md`
(the full 300-1000 line reference). `unified-software-engineering.md` has
no nano/mini tier — it stays load-alone regardless (see below).

## When to Escalate to Books (Tier 2)

Books are loaded ONLY after the corpus (Tier 1) has been consulted and found insufficient for the needed depth. The `corpus-index.md` Section 4 ("Corpus-to-Book Escalation Map") tells you which book to pick for each corpus category.

### Escalation triggers
- The corpus YAML covers the topic but at a level too shallow for the specific question (e.g., corpus has DDD intro but you need strategic context mapping).
- The question spans multiple corpus categories and needs a synthesized treatment.
- A full architecture audit requires cross-cutting canonical depth (use `unified-software-engineering.md`).

### Tier 2 escalation: nano first, mini or full only when it matters

Once Tier 1 has narrowed the candidate books for the task:

1. **Load a minimum of three `nano`-tier excerpts** for the candidate books — never fewer, and never zero. This is the mandatory first read of Tier 2, cheap enough to happen even when the topic turns out not to matter.
2. **Escalate any one of those three books to `mini` or `full` only when you judge that book's principles matter for the specific problem at hand.** A book that does not clear that judgment stays at the nano tier for the rest of the task. Do not escalate all three. Do not escalate none when one clearly matters.
3. **Full-tier loading is never automatic.** Reading `<name>.md` in full is the expensive step in this ladder, and it is conditional on what the nano (and, where escalated, mini) tier already showed — not a default that follows the nano read on every task.
4. `unified-software-engineering.md` never enters this ladder. It has no nano/mini tier upstream, and it stays load-alone per the existing rule below (a full architecture audit still loads it directly, with nothing else).

### Anti-match: when NOT to escalate
- If a corpus YAML file already covers the pattern with before/after examples and heuristics, use it instead of a book.
- For DDD questions, try `corpus/principles/ddd/` before loading `domain-driven-design-distilled.md`.
- For refactoring questions, try `corpus/refactorings/` before loading `refactoring.md`.
- For resilience questions, try `corpus/principles/resilience/` before loading `release-it.md`.

## Catalog

| File (under `books/`) | Tags | Lines | When to pick |
|---|---|---|---|
| `clean-code.md` | naming, small-functions, readability, daily-default | 246 | Daily readability — naming, function size, code review etiquette. |
| `code-complete.md` | routines, variables, classes, defensive-programming | 288 | Variable/routine craft, defensive programming, broad construction practice. |
| `a-philosophy-of-software-design.md` | deep-modules, complexity, info-hiding | 320 | Fighting accidental complexity; deep vs shallow modules; API surface design. |
| `the-pragmatic-programmer.md` | DRY, orthogonality, automation, feedback | 303 | General engineering hygiene — DRY, automation, fast feedback loops. |
| `clean-architecture.md` | boundaries, dependency-rule, policy-vs-frameworks | 471 | Layered architecture, the dependency rule, separating policy from frameworks/UI/DB. |
| `patterns-of-enterprise-application-architecture.md` | layers, repository, unit-of-work, data-mapper | 354 | Persistence patterns, ORM choices, transaction-script vs domain-model. |
| `domain-driven-design-distilled.md` | DDD-intro, bounded-contexts, ubiquitous-language | 283 | First-pass DDD — context maps, basic tactical patterns. Start here for DDD. |
| `domain-driven-design.md` | DDD-strategic, blue-book, ubiquitous-language | 986 | Strategic DDD depth (Evans). Escalate from Distilled when context-mapping or modelling depth is required. |
| `implementing-domain-driven-design.md` | DDD-tactical, aggregates, domain-events, IDDD | 316 | Tactical DDD (Vernon) — aggregates, domain events, app architecture, integrations. |
| `refactoring.md` | smells, behavior-preserving, small-steps | 366 | Cleanup of working, tested code — smell catalogue, behavior-preserving transforms. |
| `working-effectively-with-legacy-code.md` | seams, characterization-tests, legacy | 331 | Untested or fragile legacy — seams, characterization tests, dependency breaking. |
| `release-it.md` | resilience, circuit-breakers, bulkheads, retries | 343 | Production-resilience patterns — timeouts, retries, bulkheads, observability. |
| `designing-data-intensive-applications.md` | replication, partitioning, streams, schema | 307 | Data systems — replication, partitioning, transactions, streams, schema evolution. |
| `unified-software-engineering.md` | synthesis, defaults, **load-alone** | 1023 | Cross-cutting tasks spanning 3+ rows above. **Load alone — never alongside another book.** |
| `unified-software-engineering.md` (audit default) | full-audit, multi-seam, architecture-review | 1023 | **Full architecture audit / cross-cutting codebase review** — the default for any review that touches multiple seams (engine + observability + boundaries, etc.). **Load alone.** |

## Anti-match: when NOT to load a book

- Pure naming, function-size, or readability nits → `../agent-legible-principles.md`, not a book.
- Adding/checking grep antipatterns (bare `except`, in-function imports, missing types, manual singletons) → `../mechanical-enforcement.md`, not a book.
- SaaS security checks (tenant isolation, rate limiting, webhook validation) → `../saas-checklist.md`, not a book.
- LLM-harness security (prompt injection, MCP trust, hook shell, signal atomicity) → `../harness-security.md`, not a book.
- **Per-method assignment** for a god-class decomposition (deciding which method belongs in which extracted collaborator) → SKILL.md's Domain-Driven Design Assessment guidance, not `clean-architecture.md`. NOTE: this anti-match is narrow. A *full architecture audit* that includes the runner is broader and does NOT trigger this row — use the audit default in *Self-load defaults* above.
- Trivial edits (typos, single-line tweaks, doc comments) → no book.
- Already loaded one book this task → only consider the *one* companion the SKILL.md decision table whitelists.
- If a corpus YAML file already covers the pattern with examples, use it instead of a book.
- For DDD questions, try `corpus/principles/ddd/` before loading `domain-driven-design-distilled.md`.
- For refactoring questions, try `corpus/refactorings/` before loading `refactoring.md`.
- For resilience questions, try `corpus/principles/resilience/` before loading `release-it.md`.

## Combination rules (load-bearing)

**This section is superseded by ADR-0021 for book loading.** The prior cap
read "at most one primary book, plus one optional companion." The current
rule is: **a minimum of three `nano`-tier loads**, from the candidate books
Tier 1 narrows the task to, plus **judgment-gated escalation to `mini` or
`full`, per book**, never automatic and never applied to all three
candidates at once. See *Tier 2 escalation* above for the full rule.

The prior guidance below still governs which books are legitimate
candidates to narrow to, and still applies once a book is escalated past
nano: **never** load `unified-software-engineering.md` alongside any other
book; it is a pre-resolved synthesis intended to be loaded standalone for
cross-cutting work, and it never enters the nano/mini/full ladder at all.
For DDD, follow the progression: Distilled → Blue Book (Evans) for
strategic depth → IDDD (Vernon) for tactical/implementation depth.
