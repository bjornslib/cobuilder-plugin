# Product: the cobuilder family

## Problem

A person who wants help with one part of building software has to take all
of it. Today one install carries the whole lifecycle: designing a change,
building it, opening and narrating the pull request, and rendering the
result. Somebody who only wants their pull requests explained also installs
the audit corpus, the picture generator, and the viewer.

The parts also stop short of each other. The design work records why a
change was chosen and what was rejected. Nothing then reads that record and
builds from it, so the person answers the same questions again when the code
starts. The half that turns an approved design into working code exists as
one person's private tool. It is not something anybody else can install.

The words have drifted too. The same short word means two things depending
on which half of the tool a person is in, and the project now keeps a table
to stop the confusion. A table that exists to stop confusion is a sign that
the product is shaped wrong, not that the words are.

## Success metric

**A person installs one part and uses it, without the other four.**

Measured as: the count of separately installable parts that a person can
install alone and complete a real task with, starting from zero. Today that
number is 1. The target is 5, and the fifth is the one that installs the
other four together for anybody who wants everything.

Two supporting numbers, both measured on a real change carried end to end:

- **Questions asked twice: 0.** A change that starts from a recorded design
  is never re-interviewed about what it is for.
- **Work accepted on its own word: 0.** Every unit of finished work is
  scored by something that did not build it.

## Announcement — the blog post before the feature

**Five tools, one family.**

Cobuilder is now five separate things you can install. Take the one you
need. **Architect** helps you design a change before you write it, and
records why. **Implement** takes that design and builds it, one small piece
at a time, and each piece is checked by something that did not write it.
**PR** opens your pull request, interviews you while you still remember why,
and later turns the whole history into a story you can read. **Artifact**
renders any of it as a page you can share. And **Full lifecycle** installs
all four at once, for anybody who wants the whole thing.

The parts are separate, but they are not strangers. A design you record in
Architect is the same design Implement builds from, and the same one that
shows up in your pull request. You answer the question once.

## Screens

No new screens. The existing viewer already renders both designs and pull
requests, and this work adds no page to it.

One thing a person sees that is not a screen: the install list. Five named
entries where there was one. That list is the product surface for this work,
and the names carry it, so they are a product decision rather than a
technical one.

## Prior art checked

**Hindsight: unavailable.** The recall tools are advertised in this session
but not registered, so checkpoint H1 could not run as specified. Two
substitutes were read instead, and both are recorded here so a later session
knows what was and was not consulted.

- **Ask the author, do not infer.** Recorded feedback from an earlier
  session: when the person who did the work is present, ask them rather than
  reconstructing intent from the diff. This is the whole reason the design
  record exists, and it is why "questions asked twice: 0" is a success
  metric rather than a nicety.
- **The viewer stays build-free.** An earlier session chose a framework for
  the viewer and then reversed it, because a published page blocks external
  requests and everything would have to be inlined under a size cap. This
  work adds no page and must not reopen that.

One stale note found and not trusted: a stored memory states that only one
skill ships and that the writing skill is deliberately excluded. Four skills
ship today. The memory records what was true when it was written.
