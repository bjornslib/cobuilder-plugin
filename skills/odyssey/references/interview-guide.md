---
title: "Interview Guide — author intent capture reference"
type: reference
status: active
last_verified: 2026-08-04
owner: bjoerns
---

# Interview Guide — author intent capture reference

How to interview the author of a change, and how to write the result into the
PR's `intent` block in `data/story.json`. Submit mode runs this before it
assesses the change, and before it opens the pull request.

A diff shows what changed. It does not show which problem the author solved,
which options the author rejected, or which parts the author does not
understand. Generate mode infers those three things from merged code, long
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
answers three questions you could have answered yourself stops giving you real
answers to the fourth. Read the diff, the touched districts in
`inventory.yaml`, the ADRs that cover those districts, the matching stack
card, and the timeline entries for earlier PRs in the same districts. Then
draft your own hypothesis of the author's intent. Ask only about the gaps.

The gaps are usually the same four things, because a diff cannot carry them:

1. **Why this problem, and why now.** Code shows the solution. It does not
   show the pressure that produced it.
2. **Which options the author rejected.** A rejected option leaves no trace in
   the diff. This is the field the retro-extraction path most often loses.
3. **What the author left out on purpose.** An absence looks the same as an
   oversight from the outside.
4. **Which parts worry the author.** A reviewer cannot read confidence off a
   diff.

## 3. Question budget

**Target six questions. Stop at eight.** A long interview trains the author to
answer fast and short, which is the opposite of the goal. Rank the gaps by
what the assessment cannot proceed without, and drop the rest.

Use the `AskUserQuestion` tool for a closed question, where you can offer real
options:

- which authorship mode applies (§4);
- which of the alternatives you found in the code the author actually
  considered;
- which areas the author wants a reviewer to look at.

Use an ordinary conversational turn for an open question, where an option list
would put words in the author's mouth: the problem, the reason for the timing,
and the approach.

Ask about the problem first. Every later question reads better once you know
what the author was trying to do.

## 4. Authorship and unknowns

These two fields carry the reason submit mode exists. Do not skip them.

**Ask who wrote the code.** `human`, `agent-assisted`, or `agent-generated`.
This is not a judgment about the author. Agent-written code holds less human
intent than its diff suggests, and the assessment needs to know that before it
reads confidence into a clean-looking change.

**Record what the author cannot explain, in the author's own words.** "The
agent wrote that part, and I am not sure why" is a result, not a failed
interview. Write it into `unknowns` verbatim. Do not paraphrase it into
something more confident, and do not fill the gap with your own reading of the
code.

A non-empty `unknowns` array raises the risk tier by one step. See
`review-mode.md` §4.

## 5. Play the draft back

**Show the drafted `intent` to the author before you write it to disk.** You
are about to attribute statements to a person, in a file that the repo
commits, and that later drives narrative and ADR text. Show the full block,
ask for corrections, and apply them.

Correct the author's words only for length. Do not improve the argument. If
the stated reason for the approach is thin, that is a finding for the
assessment, not a thing to fix in the quote.

## 6. Non-interactive fallback

Submit mode runs with `--non-interactive`, or reaches a session with no author
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
  same seven shallow answers. Select questions from the diff.
- **Asking for a summary of the change.** You have the diff. Summarizing it is
  your job, not the author's.
- **Writing intent the author did not state.** The `intent` block is a record
  of what a person said. Your reading of the change belongs in `assessment`.
- **Treating a short answer as a failed interview.** "I do not know" and "no
  alternatives, this was the obvious fix" are both real data. Record them.
- **Interviewing before reading the diff.** The whole method in §2 depends on
  this order.
