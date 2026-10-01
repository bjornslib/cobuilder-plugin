# Product: architect options mode

## Problem

An engineer who wants to ask whether the flow and the technology choices of a whole system are still right has no command for it. Review mode finds defects and scores them. Design mode starts from an outcome that the engineer already named. Nobody finds the inquiries worth designing, or compares the alternatives before a choice. A manual run of this work already produced a useful report. A user of CoBuilder asked for it as a command.

## Success metric

One run of `/architect:options` in a repo produces one report that passes the validator with exit code 0. The report holds at least three inquiries, each with a cited evidence item and a confidence tag. Measure it by running the mode once and running the validator on the result.

## Announcement — the blog post before the feature

Today you can ask `/architect:options` a plain question: is the design of this system still right? The mode reads your code, your decision records, and the architecture corpus. It writes one report that opens with a double click. The report lists inquiries about the flow, the technology, and the gaps. Each inquiry shows the evidence, a confidence tag, and two to four alternatives with their cost. You answer in the report, copy your answers, and paste them into `/architect:design` to start designing the one you chose.

## Screens

No UI app. The deliverable is one generated HTML report. The reference report at `/Users/theb/Documents/Windsurf/think-with-ai/.claude/worktrees/think-with-ai-architecture-review/docs/prompts/options-mode/reference-options-report.html` is the visual specification.
