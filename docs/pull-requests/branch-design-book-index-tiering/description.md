# Branch design-book-index-tiering

## Problem

book-index.md's Tier 2 escalation jumps straight from a cheap corpus heuristic to one full vendored book (300-1000 lines), skipping the nano (~20-40 line) and mini (~80-150 line) tiers upstream ciembor/agent-rules-books now publishes. Review/Maintenance mode's mandatory 14-file security corpus load has the same shape: 2179 lines read unconditionally, in full, every run.

The escalation ladder was missing rungs upstream already provides for free, and the security corpus load had never been scrutinized on cost the way the book ladder now has been.

## Why this approach

Vendor nano.md and mini.md alongside each book's existing full.md (26 new files, 13 books). Rewrite book-index.md's escalation rule: load a minimum of three nano excerpts, then escalate any one book to mini or full only when judged to matter — full-tier loading is never automatic, and the old 1-primary-plus-1-companion cap is explicitly superseded. For the security corpus, no vendoring was needed: each YAML already separates a metadata-plus-summary block (17-24 lines) from its worked examples, so the same shape applies as a same-file partial read — read the first ~30 lines of all 14 unconditionally, then read a file's remainder in full unless the summary clearly rules out applicability, defaulting to full on ambiguity (the opposite bias from book escalation, because a missed security finding costs more than a wasted read). Also added a behavioral-rubric case to cobuilder-implement's Gate 4c, since neither the 'skip the gates for small tasks' exemption nor the existing test-suite rubric model could verify whether prose that governs another mode's own procedure is actually followed — then applied that new gate to this change itself, twice, with two independent blind subagent runs.

## Alternatives considered

- **3 nanos, then always the full book, unconditionally (the original approach)** — rejected because Making the full-book read unconditional defeats the reason a cheap tier exists, and silently breaks the existing 1+1 cap with no stated replacement.
- **Signed evidence ledger gating the full-book read behind three committed nano entries** — rejected because Solves an auditability problem nobody named, at the cost of a new file surface.
- **Content-addressed cold storage with per-session materialization and LRU eviction** — rejected because Sized for a corpus of 140+ books; this repo vendors 14. Conflicts with the plugin family's vendor-in-tree convention (ADR-0017).
- **Live-fetch the nano tier from upstream URLs at task time** — rejected because Blocked by a security classifier during divergent exploration — an injection and supply-chain risk this plugin family's self-only design avoids.
- **Pre-concatenated per-book ladder file with a stop-early marker** — rejected because Scored highest with the critic, but its stop-early discipline has no mechanical consumer — the same Gate 4b failure mode this repo's own history already lived through.
- **Ad hoc subagent fan-out, one Task-tool call per book, verdict-only return** — rejected because ADR-0015 fixes the install surface at no agents, hooks, or MCP servers.
- **Panic-grep pre-filter: one hand-written line per nano file, grepped before any tier loads** — rejected because The critic's starred non-obvious survivor, deferred rather than bundled in — orthogonal to the chosen mechanism.
- **Judgment-gate the security corpus the same symmetric way as book escalation (skip-on-ambiguity)** — rejected because A missed finding in a compliance-weighted report is a worse failure than a design session under-reading one book. Security stays biased toward reading in full.

## Out of scope

- Fixing or creating scripts/sync-books.sh
- Re-vendoring the existing full/ books against upstream's current commit
- Vendoring separate nano/mini files for the security corpus
- Extending this pattern to Decisions, Describe, or Debug mode, none of which consult book-index.md or the security corpus today

## Risks

- Both new escalation rules (book tiering, security applicability read) have no mechanical enforcement. This repo's own Gate 4b history shows an unenforced step tends to erode under time pressure.
- Vendoring surface for books triples from 14 files to 42, while the sync pipeline that would check them against upstream (scripts/sync-books.sh) is already missing.
- The behavioral-rubric verification is one blind pass per rule, not repeated or adversarial. A rule that happens to be followed correctly once is evidence, not a guarantee.

## How this was tested

No application code changed. Two blind behavioral rubric passes verify the two new escalation rules: a fresh subagent given only the new book-index.md correctly loaded 3 distinct nanos and escalated exactly one book to full for a resilience-design task; a fresh subagent given only the new SKILL.md security section correctly read all 14 summaries, escalated 7 to full with evidence-backed reasoning, and escalated its one self-described ambiguous case to full rather than skipping it. Both rubrics and their evidence are committed at .cobuilder/rubrics/book-index-tiering/. Full test suite run: 304 passed, 1 pre-existing unrelated failure (an untracked agent-browser skill directory from this session's marketplace sync, not part of this diff).

## Where to focus

- Whether the judgment-gated book escalation language is specific enough to actually change agent behavior long-term, not just on the one blind pass that already confirmed it once
- Whether the security corpus's opposite default bias (full-on-ambiguity) is stated clearly enough that a session doesn't quietly collapse it into the same skip-on-ambiguity behavior as book escalation
- Whether Gate 4c's new behavioral-rubric case is itself specific enough for a future engineer to apply to a different prose-governs-agent-behavior change without re-deriving the pattern from scratch

---

_Authorship: agent-generated._
