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
decision: "Vendor nano.md and mini.md alongside the existing full.md for each of the 14 books. book-index.md's escalation rule changes: after Tier 1 narrows the candidate set, load a minimum of three nano-tier excerpts, then escalate any one of those books to mini or full only when its principles are judged to matter for the task at hand. Full-tier loading is never unconditional. The existing 'one primary + one optional companion' cap is rewritten to state this new ceiling explicitly. This applies to Design mode's Stage 1 (Ground) and Stage 3 (Explore) grounding, and to Review/Maintenance mode's corpus-to-book escalation. Addendum (2026-08-26): Review/Maintenance's mandatory 14-file security corpus load gets the same cheap-signal-before-expensive-read shape, but with the opposite default bias and no vendoring — read each security corpus file's first ~30 lines (id/name/tags/summary, already structurally separate from its worked examples) unconditionally for all 14, never skipping a category's summary, then read the rest in full unless the summary clearly shows the category has no applicable surface area in the codebase under review. Ambiguous cases default to reading the full file, not to skipping it."
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
  - {state: decided, date: "2026-08-26", note: "Addendum: extended to Review/Maintenance's mandatory 14-file security corpus load, using a same-file partial-read gate instead of separate vendored tiers."}
maps_to:
  district: skills
  unanchored: true
  modules:
  - plugins/cobuilder-architect/skills/architecture/references/book-index.md
  - plugins/cobuilder-architect/skills/architecture/references/books
  - plugins/cobuilder-architect/skills/architecture/references/design-mode.md
  - plugins/cobuilder-architect/skills/architecture/SKILL.md
  - plugins/cobuilder-architect/skills/architecture/references/corpus/principles/security
  rule: "A design or review-mode session must load a minimum of three nano-tier book excerpts before it may escalate any one book to mini or full tier. Full-tier loading is judgment-gated per book, never unconditional, and the total load per task is bounded by the ceiling this ADR states — not by the prior one-primary-plus-one-companion cap, which this ADR supersedes for book loading. A review or maintenance session must read the first ~30 lines of all 14 security corpus files unconditionally, never skipping a category's summary, and may read a file's remainder in full only when the summary shows the category applies or the applicability is ambiguous — never when judgment alone says to skip."
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
path. See the Addendum below for Review/Maintenance's separate, mandatory
14-file security corpus load, which was originally out of scope for this
ADR and was folded in on 2026-08-26.

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

## Addendum (2026-08-26) — security corpus applicability read

### Context

Review and Maintenance mode load all 14 `references/corpus/principles/security/*.yaml`
files unconditionally, in full, on every run — 2179 lines total, larger
than a single vendored full book. Each file front-loads its checkable
signal (`id`, `name`, `category`, `canonical_tags`, `sources`, `summary`)
before its worked before/after code examples; across all 14 files, that
metadata-plus-summary block ends between line 17 and line 24. The examples
that follow account for most of each file's length.

Judgment-gating whether to read a security category at all — the same
mechanism this ADR gives books — was considered and rejected for security
specifically. A missed vulnerability in a report that carries compliance
weight (GDPR, SOC2, per this skill's own Impact Taxonomy) is a worse
failure than a design session that under-read one book. Security is
already the highest-weighted category in the scoring rubric (25%). The
existing "load all 14, mandatory, no toggle" rule is correct in its
"never silently skip a category" half. It has never been scrutinized on
its "always read the full 150-180 lines regardless of relevance" half.

### Decision

Read the first ~30 lines of all 14 security corpus files unconditionally,
every review or maintenance run — this covers the metadata-plus-summary
block for every file with margin, and costs about 420 lines total instead
of 2179. A category's summary is never skipped; this is what preserves the
existing audit-completeness guarantee.

For each file, read the remainder in full — the worked examples — unless
the summary clearly shows the category has no applicable surface area in
the codebase under review (for example, `file_upload_api_hardening.yaml`'s
summary describes upload-endpoint risk, and the codebase has no upload
endpoints). **Ambiguous cases default to reading the full file, not to
skipping it.** This is the opposite default from book escalation on
purpose: a book's cost of being wrong is worse engineering advice, and a
security category's cost of being wrong is a missed finding in a
compliance-weighted report.

This is a same-file partial read, not a separate vendored tier. No new
files are created, and `books/README.md`'s manifest is untouched — this
addendum applies only to `references/corpus/principles/security/`, never
to `references/books/`.

### Consequences

- **Positive:** Unconditional cost drops from 2179 lines to about 420 for
  the categories that turn out not to apply, while every category's
  summary is still read on every run, so the "never silently skip" audit
  guarantee is unchanged.
- **Constraint introduced:** A review or maintenance session must read the
  first ~30 lines of all 14 security corpus files before it may skip any
  one file's remainder. Skipping a file's remainder requires the summary
  to clearly rule out applicability. Ambiguity defaults to reading in
  full.
- **Negative / accepted:** Like the book-escalation rule above, this gate
  has no mechanical enforcement — nothing stops a session from reading all
  14 in full regardless (safe, if wasteful) or, worse, judging a category
  inapplicable when it was actually ambiguous (the failure mode the
  default-to-full bias exists to make less likely, not impossible).

## Maps to

District `skills` (unanchored — no formal bounded context exists for this
area yet). Modules `plugins/cobuilder-architect/skills/architecture/references/book-index.md`,
`.../references/books`, `.../references/design-mode.md`,
`.../SKILL.md`, `.../references/corpus/principles/security`. See this
ADR's `maps_to.rule` for both invariants.
