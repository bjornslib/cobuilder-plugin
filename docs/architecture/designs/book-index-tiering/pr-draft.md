## Problem

`book-index.md`'s escalation goes straight from the Tier 1 corpus heuristic
to one full vendored book, 300-1000 lines. Upstream
`ciembor/agent-rules-books` has since published `nano` (about 20-40 lines)
and `mini` (about 80-150 lines) tiers for the same 14 books, and
`books/README.md`'s manifest still only vendors `full`. Nothing in this
plugin uses the smaller tiers. Separately, `books/README.md` documents a
`scripts/sync-books.sh` drift-check script that does not exist anywhere in
the repository.

The escalation ladder is missing two rungs that upstream already provides
for free. Every task that reaches Tier 2 today pays the full-book cost with
no cheaper option available first.

## Why this approach

Vendor `nano.md` and `mini.md` alongside the existing `full.md` for each of
the 14 books, as separate files (42 total). Change `book-index.md`'s
escalation rule: after Tier 1 narrows candidates, load a minimum of three
nano-tier excerpts, then escalate any one of those books to mini or full
only when its principles are judged to matter for the task at hand.
Full-tier loading is never unconditional. Rewrite the existing "one primary
book plus one optional companion" cap to state this new ceiling explicitly.
Applies to Design mode's Stage 1 (Ground) and Stage 3 (Explore) grounding,
and to Review/Maintenance mode's corpus-to-book escalation.

**Addendum.** Review/Maintenance's mandatory 14-file security corpus load
gets the same cheap-signal-before-expensive-read shape, with no vendoring:
each YAML already separates its metadata-plus-summary block (~17-24 lines)
from its worked examples. Read the first ~30 lines of all 14
unconditionally, every run, never skipping a category's summary; read a
file's remainder in full unless the summary clearly rules out
applicability, defaulting to full on ambiguity — the opposite bias from
book escalation, because a missed security finding costs more than a
wasted read.

## Alternatives considered

- **3 nanos, then always the full book, unconditionally (the engineer's
  original approach)** — rejected because making the full-book read
  unconditional defeats the reason a cheap tier exists, and it silently
  breaks the existing 1+1 cap with no stated replacement.
- **Signed evidence ledger gating the full-book read behind three
  committed nano entries** — rejected because it solves an auditability
  problem nobody named, and adds a new shim and file surface without
  reducing token cost or file count.
- **Content-addressed cold storage with per-session materialization and
  LRU eviction** — rejected because it is sized for a corpus of 140+
  books; this repo vendors 14. Conflicts with the plugin family's
  vendor-in-tree convention (ADR-0017).
- **Live-fetch the nano tier from upstream URLs at task time** — rejected
  because the frame that proposed this was blocked by a security
  classifier. Fetching remote content into prompt context at runtime is an
  injection and supply-chain risk this plugin family's self-only design
  avoids.
- **Pre-concatenated per-book ladder file with a stop-early marker** —
  rejected because its stop-early discipline has no mechanical consumer.
  This repo's own CLAUDE.md names exactly this failure mode from the
  Gate 4b history, even though this option scored highest with the critic.
- **Ad hoc subagent fan-out, one Task-tool call per book, verdict-only
  return** — rejected because ADR-0015 fixes the install surface at no
  agents, hooks, or MCP servers, and the pattern was declined even as an
  in-turn call to keep this design's scope to the vendored-file mechanism.
- **Panic-grep pre-filter** — rejected for this design's scope, though it
  is the critic's starred non-obvious survivor and the only option that
  stays inside the existing cap unmodified. Deferred, not disqualified.
- **Judgment-gate the security corpus the same symmetric way as book
  escalation (skip-on-ambiguity)** — rejected because a missed security
  finding in a compliance-weighted report is a worse failure than a design
  session under-reading one book. Security stays biased toward reading in
  full.

## Out of scope

- Fixing or creating `scripts/sync-books.sh`.
- Re-vendoring the existing `full/` books against upstream's current
  commit.
- The panic-grep pre-filter and the subagent fan-out pattern, both
  declined for this design.
- Vendoring separate nano/mini files for the security corpus — it uses a
  same-file partial read instead, since each YAML already separates
  metadata/summary from examples.

## Risks

- The judgment gate ("escalate to mini/full only when it matters") has no
  mechanical enforcement. This repo's own Gate 4b history shows an
  unenforced step tends to erode under time pressure.
- Vendoring surface triples from 14 files to 42, while the sync pipeline
  that would check them against upstream (`scripts/sync-books.sh`) is
  already missing.
- The security corpus applicability read also has no mechanical
  enforcement. Its default-to-full bias on ambiguity is meant to make a
  false "not applicable" verdict less likely, not impossible.

## How this was tested

No code changes; this design writes `docs/` artifacts only. Verification
is: `book-index.md`'s escalation rule reads unambiguously, and the new cap
language explicitly supersedes the old 1+1 cap rather than leaving both
stated at once.

## Where to focus

- Whether the judgment-gated escalation language in `book-index.md` is
  specific enough to actually change agent behavior, or vague enough to be
  silently ignored.
- Whether the rewritten cap conflicts with any other reference file that
  still assumes the old 1+1 cap.
- Whether the security corpus's opposite default bias (full-on-ambiguity)
  is stated clearly enough that a session doesn't quietly collapse it into
  the same skip-on-ambiguity behavior as book escalation.

The author flagged these parts as not fully understood:
- Whether upstream's nano/mini files exist for all 14 currently-vendored
  books at a syncable commit — not verified in this design.

---

Authorship: agent-generated.
