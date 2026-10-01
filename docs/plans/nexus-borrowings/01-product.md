# Product: Nexus borrowings — runtime diagram, draft reviewer, contracts doc

## Problem

Engineers who install the Cobuilder plugins to run a design lifecycle get a
drafted ADR, a narrative, and three diagrams — but no picture of how the
designed system will hold together at runtime, no contract surface for what it
will expose, and no independent review of the draft before the human reads it.
The comparison against Nexus's architecture pipeline made all three gaps
measurable at once.

## Success metric

One measurable metric with its measurement: **time-to-informed-review** — after
this feature ships, a design's architecture review has three inputs it cannot
lose (the runtime tile, the contracts file, the reviewer's challenges), measured
by design-mode run logs where `goal.min_work.draft_review_run` is true and the
runtime + contracts artifacts are present in 100% of new designs that touch a
public interface. Adopted designs are counted in `build_index.py`'s design
entities at each bundle rebuild.

## Announcement — the blog post before the feature

Design mode now drafts how your system will hold together, not just how work
will flow. Every new design carries a runtime architecture diagram — clustered
boundaries, data stores, external systems, every boundary edge labeled with its
protocol — rendered first inside the architecture view, before the class
inventory. When a design touches an interface, it carries its envisioned
endpoints and data models in one reviewable place. And before you ever read the
draft, an independent reviewer subagent has validated it against your goal and
re-explored the alternatives, so what reaches you is already challenged once.

## Screens

No new screens. The design route (#/work/<name>/intent) and the plan pages gain
content only: a runtime tile inside the existing architecture level, a contracts
section beside the envisioned pull request, and a reviewer-findings line in the
design surface's stage-6 rendering when present.