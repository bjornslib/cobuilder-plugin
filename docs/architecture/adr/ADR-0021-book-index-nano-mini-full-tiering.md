---
# --- doc-gardener required frontmatter ---
title: "ADR-0021 — book-index.md gains a nano tier, and full-book loading stops being unconditional"
status: active
type: architecture
last_verified: "2026-08-25"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0021
name: "book-index.md gains a nano tier, and full-book loading stops being unconditional"
state: decided
groups: [book-corpus]
approved_by: ""
problem: "book-index.md escalates straight from the Tier 1 corpus heuristic to one full vendored book (300-1000 lines). Upstream ciembor/agent-rules-books has since published nano (~20-40 line) and mini (~80-150 line) tiers for the same 14 books, and books/README.md's manifest still only vendors full. Nothing in this plugin uses the smaller tiers."
decision: "Vendor nano.md and mini.md alongside the existing full.md for each of the 14 books. book-index.md's escalation rule changes: after Tier 1 narrows the candidate set, load a minimum of three nano-tier excerpts, then escalate any one of those books to mini or full only when its principles are judged to matter for the task at hand. Full-tier loading is never unconditional. The existing 'one primary + one optional companion' cap is rewritten to state this new ceiling explicitly. This applies to Design mode's Stage 1 (Ground) and Stage 3 (Explore) grounding, and to Review/Maintenance mode's corpus-to-book escalation."
alternatives:
  - option: "Ship the engineer's original approach unmodified: load 3 nanos, then always load the full book, unconditionally"
    rejected_because: "Making the full-book read unconditional defeats the point of a cheap tier — nano/mini exist to let a session skip the expensive read, not precede it. It also leaves the existing 1-primary+1-companion cap silently violated with no stated replacement ceiling."
  - option: "Signed evidence ledger: an append-only book-loads.jsonl entry, hash-pinned, gating the full-book read behind three committed nano entries"
    rejected_because: "Solves auditability, a problem nobody named. Adds a new shim and a new file surface on top of the 42-file vendoring cost already at issue, without reducing token cost or file count."
  - option: "Content-addressed cold storage: ship only a book-id-to-hash index, materialize nano/mini/full into a per-session scratch path on first read, evict by LRU"
    rejected_because: "Sized for a corpus of 140+ books; this repo vendors 14. Conflicts with the plugin family's vendor-in-tree convention — no plugin ships infrastructure beyond the files it carries itself (ADR-0017)."
  - option: "Live-fetch the nano tier from upstream raw.githubusercontent.com URLs at task time instead of vendoring it"
    rejected_because: "The divergent-exploration frame that proposed this was blocked by a security classifier. Fetching remote content into prompt context at runtime is an injection and supply-chain risk this plugin family's self-only, no-network-dependency design deliberately avoids."
  - option: "Pre-concatenated per-book ladder file: nano, then mini, then a <!-- FULL:path --> marker, in one file with a shared stop-early instruction"
    rejected_because: "Collapses the vendored surface back to 14 files and scored highest with the critic, but its 'stop reading early' discipline has no mechanical consumer. This repo's own CLAUDE.md names exactly this failure mode from the Gate 4b history: a documented process step with no mechanical consumer gets skipped, however well it is documented. Rejected in favor of keeping separate tier files, at the cost of accepting the same unenforced-step risk in the chosen design instead."
  - option: "Ad hoc subagent fan-out: spawn one short-lived Task-tool call per candidate book, each reads that book's full text and returns only a verdict, keeping full text out of the orchestrating context entirely"
    rejected_because: "Scored well on isolating context growth, but ADR-0015's rule is that this plugin ships skills and no agents, hooks, or MCP servers. The pattern could only ever be an ad hoc in-turn Task-tool call, never installed infrastructure, and was declined even in that ad hoc form to keep this design's scope to the vendored-file mechanism."
  - option: "Panic-grep pre-filter: one hand-written 'panic:' frontmatter line per nano file, grepped across all 14 before any tier loads"
    rejected_because: "The critic's starred non-obvious survivor — cheap, and the only candidate that stays fully inside the existing 1+1 cap. Deferred rather than bundled into this design; it does not conflict with the chosen mechanism and can be proposed separately if the 3-nano step proves too slow in practice."
forces:
  - "All loading happens through an LLM agent's own Read tool calls, directly into the same context window the rest of the task uses. There is no retrieval index or RAG layer today."
  - "book-index.md already caps loading at one primary book plus one optional companion, and the stated 3-nano-plus-full approach exceeds that cap as written."
  - "The plugin ships no agents, hooks, or MCP servers (ADR-0015), which rules out shipping the subagent-fan-out alternative as installed infrastructure."
  - "books/README.md documents a scripts/sync-books.sh drift-check script that does not exist anywhere in the repo — the vendoring pipeline was already incomplete before this decision, though fixing it is out of scope here."
  - "CLAUDE.md's own Gate 4b history: a process step with no mechanical consumer gets skipped, however well it is documented."
related_decisions:
  - {type: is-related-to, target: ADR-0015}
  - {type: is-related-to, target: ADR-0017}
  - {type: is-related-to, target: ADR-0011}
related_concerns: []
history:
  - {state: decided, date: "2026-08-25", note: "Chosen on this branch; not approved until a human merges."}
maps_to:
  district: skills
  unanchored: true
  modules:
  - plugins/cobuilder-architect/skills/architecture/references/book-index.md
  - plugins/cobuilder-architect/skills/architecture/references/books
  - plugins/cobuilder-architect/skills/architecture/references/design-mode.md
  rule: "A design or review-mode session must load a minimum of three nano-tier book excerpts before it may escalate any one book to mini or full tier. Full-tier loading is judgment-gated per book, never unconditional, and the total load per task is bounded by the ceiling this ADR states — not by the prior one-primary-plus-one-companion cap, which this ADR supersedes for book loading."
delivers:
  capability: "A design or review session can ground itself against three books' worth of signal for close to the token cost of one, and escalate to deeper tiers only for the book that actually turns out to matter."
  benefit: "The vendored nano/mini tiers upstream already publishes stop sitting unused, and the escalation ladder starts trading cost for depth instead of jumping straight to the most expensive read available."
  beneficiary: [developer, validator-agent]
related:
  - "docs/architecture/designs/book-index-tiering/goal.json"
---

# ADR-0021 — book-index.md gains a nano tier, and full-book loading stops being unconditional

## Context

`book-index.md` is Tier 2 of a two-tier escalation: a cheap corpus heuristic
(Tier 1) picks a symptom, and Tier 2 loads one full vendored book, a
300-1000 line markdown file distilled from a canonical software-engineering
book. `books/README.md` vendors these full-length files from
`ciembor/agent-rules-books`, at a pinned commit that predates that upstream
repo's own addition of `nano` (about 20-40 lines) and `mini` (about
80-150 lines) tiers per book. Fourteen books are vendored today. None of
them have a nano or mini counterpart in this repo, and nothing in
`book-index.md`'s escalation rule accounts for them.

Separately, `books/README.md` documents `scripts/sync-books.sh` as the way
to check for upstream drift. That script does not exist anywhere in this
repository. The vendoring pipeline was already incomplete before this
decision. Fixing it is explicitly out of scope here.

## Options considered

1. **3 nanos, then always the full book, unconditionally (the engineer's
   original approach).** Rejected. Making the full-book read unconditional
   defeats the reason a cheap tier exists — nano and mini are supposed to
   let a session skip the expensive read when the topic turns out not to
   matter, not run ahead of it every time. It also silently breaks the
   existing "one primary plus one optional companion" cap with no stated
   replacement.
2. **Signed evidence ledger.** Rejected. Solves an auditability problem
   nobody raised, and adds its own file and shim surface on top of the
   vendoring cost already under discussion.
3. **Content-addressed cold storage.** Rejected. Solves for a corpus two
   orders of magnitude larger than the 14 books this repo actually vendors,
   and conflicts with the vendor-in-tree convention ADR-0017 already
   established for shared code.
4. **Live-fetch nano tier from upstream at task time.** Rejected outright —
   the divergent-exploration branch that proposed it was blocked by a
   security classifier. Fetching remote content into prompt context at
   runtime is exactly the risk this plugin family's self-only design avoids.
5. **Pre-concatenated per-book ladder file.** Scored highest with the
   critic pass — it collapses the vendored surface back to 14 files and
   makes the full-book section physically follow the mini section in the
   same document. Rejected anyway, because its "stop reading before the
   FULL marker" discipline is enforced by nothing but instructional prose,
   and this repo's own CLAUDE.md names that exact failure mode from the
   Gate 4b history.
6. **Ad hoc subagent fan-out.** Rejected as out of scope. ADR-0015 fixes
   the install surface at no agents, hooks, or MCP servers. The pattern
   could only ever run as an in-turn `Agent` tool call, never as shipped
   infrastructure, and the engineer declined to add even that much for
   this design.
7. **Panic-grep pre-filter (chosen: deferred, not rejected on merit).** The
   critic's starred non-obvious survivor. Cheap, and the only candidate
   that stays inside the existing cap unmodified. Left out of this design's
   scope rather than bundled in, because it is orthogonal to the chosen
   mechanism and can be proposed on its own later.
8. **3 nanos, then judgment-gated escalation to mini or full (chosen).**
   See Decision.

## Decision

Vendor `nano.md` and `mini.md` alongside the existing `full.md` for each of
the 14 books already listed in `books/README.md`'s manifest — 42 files
total, in the same `references/books/` layout used today. Re-vendoring the
existing `full/` files against upstream's current commit, and fixing
`scripts/sync-books.sh`, are both explicitly out of scope for this design.

Change `book-index.md`'s escalation rule: once Tier 1's corpus heuristic
narrows the candidate books for a task, a design or review-mode session
loads a minimum of three `nano` excerpts. It may then escalate any one of
those three to `mini` or `full` only when that book's principles are
judged to matter for the specific problem at hand. A book that does not
clear that judgment stays at the nano tier for the rest of the task.
Full-tier loading is never automatic.

This changes book-index.md's own combination rule. The prior "at most one
primary book, plus one optional companion" cap is rewritten to state the
new ceiling directly: a minimum of three nano loads, plus judgment-gated
mini or full escalation per book, replacing the old 1+1 count entirely for
book loading specifically.

Applies to Design mode's Stage 1 (Ground) and Stage 3 (Explore) grounding,
and to Review and Maintenance mode's existing corpus-to-book escalation
path. Does not change Review/Maintenance's separate, mandatory 14-file
security corpus load — that corpus is unconditional by a different rule
and is untouched here.

## Consequences

- **Positive:** The nano and mini tiers upstream already publishes get
  used. A session can ground itself against three books' worth of signal
  for close to the cost of reading one, and only pays the full-book cost
  for the book that turns out to matter.
- **Constraint introduced:** A design or review-mode session must load a
  minimum of three nano-tier excerpts before it may escalate any one book
  to mini or full tier. Full-tier loading is judgment-gated per book,
  never unconditional.
- **Negative / accepted:** The judgment gate has no mechanical enforcement.
  The engineer explicitly chose this over the mechanically-stronger
  ladder-file alternative (option 5), accepting the risk that, under time
  pressure, a session quietly reverts to reading only `full`, the way this
  repo's own Gate 4b history shows an unenforced step tends to erode. The
  vendored surface also triples, from 14 files to 42, with the sync
  pipeline that would check them against upstream still broken.

## Value delivered

- **New capability:** A design or review session can ground itself
  against three books' worth of signal for close to the token cost of
  one, and escalate to deeper tiers only for the book that actually turns
  out to matter.
- **Benefit:** The vendored nano/mini tiers upstream already publishes
  stop sitting unused, and the escalation ladder starts trading cost for
  depth instead of jumping straight to the most expensive read available.
- **Beneficiary:** developer, validator-agent.

## Maps to

District `skills` (unanchored — no formal bounded context exists for this
area yet). Modules `plugins/cobuilder-architect/skills/architecture/references/book-index.md`,
`.../references/books`, `.../references/design-mode.md`. See this ADR's
`maps_to.rule` for the invariant.
