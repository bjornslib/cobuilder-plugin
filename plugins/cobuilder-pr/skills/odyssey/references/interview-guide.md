---
title: "Interview Guide — author intent capture reference"
type: reference
status: active
last_verified: 2026-08-04
owner: bjoerns
---

# Interview Guide — author intent capture reference

How to interview the author of a change, and how to write the result into the
PR's `intent` block in `data/story.json`. Generate mode runs this before it
assesses the change, and before it opens the pull request.

A diff shows what changed. It does not show which problem the author solved,
which options the author rejected, or which parts the author does not
understand. Review mode infers those three things from merged code, long
after the fact. The interview collects them while the author still knows them.

## 1. What the interview collects

One JSON object on this PR's timeline entry:

```json
"intent": {
  "captured": "2026-08-04",
  "source": "author",
  "authorship": "agent-assisted",
  "problem": "<the problem this change solves>",
  "why_now": "<why the problem is worth solving here, and now>",
  "approach": "<the chosen solution, and why this one>",
  "alternatives": [
    {"option": "<considered and rejected>", "rejected_because": "<why>"}
  ],
  "out_of_scope": ["<deliberately not done in this change>"],
  "risks": ["<what the author expects to be risky>"],
  "testing": "<how the author checked the change>",
  "reviewer_focus": ["<where the author wants a reviewer to look>"],
  "unknowns": ["<what the author cannot explain>"]
}
```

`source` is `author` after a real interview. It is `inferred` after the
fallback in §6. `authorship` is `human`, `agent-assisted`, or
`agent-generated`.

`alternatives` uses the same `{option, rejected_because}` shape as a record in
`data/adrs.json`. This is deliberate. An alternative that the author states
here moves into an ADR with no rewrite, and it answers
`decision-records-lite.md` §3.4 without archaeology.

## 2. Read the evidence before you ask anything

**Never ask a question that the evidence already answers.** An author who
answers three questions you could answer yourself changes behavior. They
stop giving you real answers to the fourth. Read the diff and the touched
districts in
`inventory.yaml`. Read the ADRs that cover those districts, the matching
stack card, and the timeline entries for earlier PRs in the same districts.
Then draft your own hypothesis of the author's intent. Ask only about the
gaps.

Keep this hypothesis to yourself until §3a runs. You ask two of the questions
below — the problem and the approach — before you show it, on purpose.

The gaps are usually the same four things, because a diff cannot carry them:

1. **Why this problem, and why now.** Code shows the solution. It does not
   show the pressure that produced it.
2. **Which options the author rejected.** A rejected option leaves no trace in
   the diff. This is the field the retro-extraction path most often loses.
3. **What the author left out on purpose.** An absence looks the same as an
   oversight from the outside.
4. **Which parts worry the author.** A reviewer cannot read confidence off a
   diff.

When generate mode has already loaded `intent` from a design directory
(`intent.design` is set), that block is the hypothesis. Ask what changed
since the design. Do not re-interview the five design topics. The six-topic
cap in §3 still holds. Still run the self-consistency check in §3a against
the diff. The design can have drifted.

## 3. Question budget

**Target six questions. Stop at eight.** A long interview trains the author to
answer fast and short, which is the opposite of the goal. Rank the gaps by
what the assessment cannot proceed without, and drop the rest.

This budget counts topics, not turns. A single topic can take more than one
turn to close — most often the self-consistency check in §3a, when it finds
something to resolve. That is still one topic against the count above, not
several. Bound it anyway: after a few exchanges with no resolution, stop and
log it per §3a, rather than keep pressing.

Use the `AskUserQuestion` tool for a closed question, where you can offer real
options. Examples:

- Which authorship mode applies (§4).
- Which of the alternatives found in the code the author actually
  considered.
- Which areas the author wants a reviewer to look at.

Use an ordinary conversational turn for an open question, where an option
list would put words in the author's mouth. Open questions cover the
problem, the reason for the timing, and the approach.

Ask about the problem first. Every later question reads better once you know
what the author tried to do.

Ask the approach question immediately next, before any other question, and
before showing the hypothesis from §2. This blind pair is what §3a compares.
The remaining open and closed questions come after that comparison resolves.

## 3a. Self-consistency: compare before you reveal your own reading

Ask the problem question and the approach question back to back, blind,
before you show the hypothesis you drafted in §2. The two accounts should
describe the same change. Whether they do is something you check, not
assume.

Read both answers the way you read the diff: for meaning, not for words.
A keyword or regex comparison cannot separate a register difference from a
real disagreement. Only reading both accounts against each other, and
against the diff, can.

Two outcomes look similar but mean something different:

- **Same understanding, different altitude.** Both accounts name the same
  subsystem, the same behavior, and the same reason. One uses `narration`
  register, and the other uses `detail` register (`story-mode.md` §4).
  Example: high level: "the viewer stopped showing diagrams for
  diagram-only PRs." Detail level: "`build_diagrams.py` skipped compiling
  `.mmd` files into `diagrams.js` when `--art diagram` ran with no scene
  art, so `window.DIAGRAMS` stayed undefined." Nothing to raise.

- **A material mismatch.** The two accounts name a different subsystem, a
  different behavior, or a different reason. Or one of them does not match
  what the diff in §2 showed you. Example: high level: "fixed narration
  audio not playing for some PRs." Detail level: "consolidated three
  duplicate `rewrite_manifest()` functions into one shared module."
  Neither account leads to the other. They describe two different changes.

**Before you raise a material mismatch, check which side is wrong.** Both
accounts may agree with each other while neither matches your hypothesis.
If so, re-read the diff first. Your hypothesis is the newer, less-tested
reading.
The author lived with the change longer than you read about it. Only raise
the mismatch with the author once your own re-reading still holds.

**When the mismatch survives that check, say what you noticed and ask how
to proceed.** Do not pick a side yourself. Do not drop the discrepancy into
`unknowns` without asking first. Offer two paths with `AskUserQuestion`:

1. Work through it now.
2. Record it as an open question and move on.

If the author resolves it, write the reconciled account into `problem` and
`approach`. The mismatch leaves no separate trace. If the author cannot
resolve it, or chooses to move on, write it into `unknowns`, in the
author's own words, exactly as §4 already does. The field holds a gap the
author reported and a gap this check found. Downstream, a reader needs
only that a gap exists, not how it surfaced.

This check serves two ends at once. It catches an author's own unsettled
understanding of a change, and it catches a stated claim the diff does not
support. Both belong in front of the PR, not after it.

## 4. Authorship and unknowns

These two fields carry the reason generate mode exists. Do not skip them.

**Ask who wrote the code.** `human`, `agent-assisted`, or `agent-generated`.
This is not a judgment about the author. Agent-written code holds less human
intent than its diff suggests, and the assessment needs to know that before it
reads confidence into a clean-looking change.

**Record what the author cannot explain, in the author's own words.** "The
agent wrote that part, and I am not sure why" is a result. It is not a
failed interview. Write it into `unknowns` verbatim. Do not paraphrase it
into something more confident, and do not fill the gap with your own
reading of the code.

A non-empty `unknowns` array raises the risk tier by one step. See
`review-mode.md` §4.

## 5. Play the draft back

**Show the drafted `intent` to the author before you write it to disk.** You
are about to attribute statements to a person. That happens in a file the
repo commits, and that file later drives narrative and ADR text. Show the
full block, ask for corrections, and apply them.

Correct the author's words only for length. Do not improve the argument. If
the stated reason for the approach is thin, that is a finding for the
assessment, not a thing to fix in the quote.

## 6. Non-interactive fallback

Generate mode runs with `--non-interactive`, or reaches a session with no author
present. Harvest what you can from the PR body, the commit messages, the
branch name, and any linked issue. Then set `source: "inferred"`.

The `inferred` value mirrors the `provenance: inferred` convention that
`decision-records-lite.md` §5 already uses. It marks the block as your reading
of the evidence, not the author's statement.

Two rules hold in this mode:

1. **Leave a field empty rather than guess it.** An empty `alternatives` array
   is honest. An invented alternative corrupts every ADR that later reads it.
2. **`unknowns` stays empty.** Only an author can report what an author does
   not understand. Never infer it.

## 7. Anti-patterns

- **A fixed questionnaire.** The same seven questions on every PR produce the
  same seven shallow answers. Select questions from the diff. The blind
  problem/approach pair in §3a is not this. Its two questions already sit
  inside §3's budget. Every PR asks them because every account needs a
  stated problem and approach, not because a script drives the whole
  interview.

- **Asking for a summary of the change.** You have the diff. Summarizing it
  is your job, not the author's. §3a's blind pair is not a summary request
  either. Claude already has its own reading from §2. The pair compares two
  independent author statements against each other and against that
  reading. It does not extract the diff's content from the author.

- **Writing intent the author did not state.** The `intent` block is a record
  of what a person said. Your reading of the change belongs in `assessment`.

- **Treating a short answer as a failed interview.** "I do not know" and "no
  alternatives, this was the obvious fix" are both real data. Record them.

- **Interviewing before reading the diff.** The whole method in §2 depends on
  this order. §3a does not relax this. The diff still gets read, and the
  hypothesis still gets drafted in §2, before you ask anything. Only the
  *showing* of that hypothesis waits on §3a, not the forming of it.
