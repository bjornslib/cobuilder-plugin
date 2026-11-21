# Product: Structure signals coach GREEN, and VALIDATE reports them beside the slice score (structure-coaching)

## Problem

An engineer who builds a feature with the slice loop gets code that works, but
each change makes the code harder to maintain. The research of 2026-11-10 shows
this decay in several forms:

- The code grows more verbose, and functions and files grow too large.
- The agent writes new code instead of reusing code, so duplication grows.
- The agent splits code into files that still depend on each other, so a
  module hides no single decision.
- Dependencies cross the boundaries that the project set.
- Names move away from the language of the domain, and generic names appear.
- New files pile up in the nearest folder.
- Inputs and error handling change in silence. This form predicted the failure
  of the next task better than any size or complexity measure.

Rules at the start of a session lower the first level of this decay, but not
its rate, and reviewers miss much of it. Today the coach reports only problems
inside one file, and the slice score checks only behaviour. In some sessions
the main agent writes a slice itself, so the coach and the blind score do not
run at all. The engineer finds the damage later, when each change costs more.

## Success metric

The engineer replays the same slice plans with the new advice on and off,
three runs or more for each condition and five slices each. The main measure
is the rate at which a second agent completes a follow-on task on the result.
The other measures are the growth of the largest folder, new duplication,
silent contract changes, and new dependencies across a boundary. Each slice in
the replay must also show evidence that the RED, GREEN, and VALIDATE agents ran
it.

## Announcement — the blog post before the feature

A codebase that agents build does not break in one day. It erodes slowly
and steadily. Each change passes its tests, but files pile into one folder,
names drift from the glossary, modules lose their single job, and inputs and
error handling change in silence. After many changes, the code is hard to
read, hard to change, and hard for the next agent to build on. CoBuilder now
helps engineers stop this erosion of quality and cohesion while the work
happens, not after the damage.

When the building agent writes a file, it gets advice on the structure next to
the advice on large functions and duplication. The advice never stops the
write. After each slice, the score report shows a structure section. It names
silent changes to inputs and error handling, new dependencies that cross a
boundary, and modules that hide no single decision. The engineer sees these
beside the score and decides what to do. The loop also checks that its three
agents ran each slice.

## Screens

no UI: the advice appears in agent messages and in the slice evidence files
