# Product: Interaction design gate

## Problem

The build skill records what a feature is for at Gate 1, how it fits at Gate 2,
and how it is built at Gate 3. All three documents describe the interface at
rest. A mockup is one picture of one screen.

Nothing records which state a control starts in. Nothing records which event
arms a timer. Nothing records which controls a connection reveals, or which
theme a first-time visitor receives. The person who asked for the feature never
sees those choices on paper, so nobody approves them.

Gate 4c then writes blind rubrics. Each criterion must cite an approved
document. A criterion about behaviour has no document to cite. The rubric
author drops it, or guesses at it.

The cost of the guess lands after the code exists. In a build of the hosted
canvas, three defects of this kind survived their slices and were found only in
a browser:

- An idle countdown armed on mount. Joining a room took longer than the
  countdown, so the control collapsed before anyone could see it.
- Two controls could not receive a real click. A synthetic click in a test
  passed. A pointer click in the browser did nothing.
- A status line did change, for about five milliseconds.

## Success metric

A feature that has a front end carries an approved interaction design before
Gate 3 begins.

- Every new plan directory holds `interaction-design.md` and `ui-spec.jsonc`.
  Its `00-status.md` records the 2b line.
- A rubric criterion about a state cites `interaction-design.md`.
- `verify_gate.py` exits non-zero while the 2b line reads pending.
- A feature with no front end records one line and loses no time.

## Announcement — the blog post before the feature

A drawing of a screen is not a design. It shows one moment, and it hides every
other moment.

The build now asks for the moments as well. Before the program design starts,
the person who owns the feature answers one question: where is the design?

The build then records what each control does at rest. It records what the
control does while it loads, what it does when it fails, and what happens when
a pointer leaves it. It records what a first-time visitor sees.

If a feature has no screen, the build writes one line and moves on.

## Screens

none — no new screen. The gate's document reuses the gate-doc sheet that
ADR-0022 already added to the Builds view (Epic E3). No mockup is required, and
no design needs to be supplied. The 2b line above quotes this line.
