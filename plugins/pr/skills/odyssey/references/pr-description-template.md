<!-- PR body skeleton. Fields come from the `intent` block:
     references/interview-guide.md §1. scripts/render_review.py emits this
     shape. Keep the two in step when you change either one.
     Omit a section when its field is empty. Do not write a placeholder. -->

## Problem

<intent.problem — what this change solves. One paragraph.>

<intent.why_now — why the problem is worth solving here, and now.>

## Why this approach

<intent.approach — the chosen solution, and the reason for choosing it.>

## Alternatives considered

<one line per intent.alternatives entry:>
- **<option>** — rejected because <rejected_because>.

<When the array is empty and intent.source is "author", write:
 "None. The author reports no alternative was considered.">

## Out of scope

<one line per intent.out_of_scope entry. This section says what the diff
 deliberately does not do, which a reader cannot tell from an absence.>

## Risks

<one line per intent.risks entry.>

## How this was tested

<intent.testing.>

## Where to focus

<one line per intent.reviewer_focus entry. Put the reviewer's time where the
 author thinks it pays.>

<When intent.unknowns is non-empty, add the entries here under the lead-in
 "The author flagged these parts as not fully understood:". This is the most
 useful line in the description, and it belongs where a reviewer reads it.>

---

<Footer, written by scripts/render_review.py, not by hand:>

<`intent.source == "inferred"` → "Intent inferred from the PR body, the commit
 messages, and the branch name. Not stated by the author.">

<`intent.authorship != "human"` → "Authorship: <value>.">
