# Open questions

For the `cobuilder-viewer` design. Opened 2026-09-21.

This file lists what the design does not yet decide, and what the engineer
raised while reading the first build of the shell.

## 1. The design prompts write looser prose than the narrative does

The engineer raised this on 2026-09-19 and asked for a note. No note existed,
which is why this file does.

**The observation.** A design's `narrative.json` reads far tighter than its
`intent.json`. The narrative follows the beats structure in
`plugins/pr/skills/odyssey/references/story-mode.md`, which forces one idea per
beat. The intent follows Design mode's own prompts, and those ask for `problem`
and `approach` as single fields with no shape.

**The evidence.** `cobuilder-viewer`'s `narrative.problem_solution.beats[]`
carries seven beats, each one sentence and each one idea. Its
`intent.problem` runs six sentences and restates the same ground. One session
wrote both, from the same facts.

**The change this implies.** Design mode's prompts, in
`plugins/architect/skills/architecture/references/design-mode.md`, should ask
for `intent.problem` and `intent.approach` in the shape the narrative already
uses. Two shapes are open:

- **(a) A beat list.** `intent.problem` becomes a list of one-idea beats, like
  `narrative.problem_solution.beats[]`. The two records then read alike, and
  the shell can render either without a special case.
- **(b) One idea per sentence, with a cap.** `intent.problem` stays one field,
  and the prompt caps it at three sentences of one idea each.

Option (a) changes the record shape and needs a schema migration. Option (b)
changes only the prompt.

**Why it is worth doing.** The shell now renders both records side by side in
the same column. The difference in register is visible on one screen, and it
reads as two authors rather than one design.

**Not yet decided.** Which shape, and whether the change belongs in this design
or in a separate one that owns the design-mode prompts.
