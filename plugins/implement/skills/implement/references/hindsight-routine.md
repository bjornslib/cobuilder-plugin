---
title: "Hindsight Memory Routine"
status: active
type: reference
---

# Hindsight memory routine

Read this file only when Hindsight is available. SKILL.md decides
availability and records the answer once. Do not read this file, and do not
run any step below, when Hindsight is unavailable.

The purpose is narrow. Past sessions in this repository already learned
lessons: what was tried, what broke, what a slicing plan cost when it went
wrong. A gate or a slice that skips memory repeats a mistake that is already
recorded.

Five gates ask five different questions. Each checkpoint below queries
memory for the one thing only that gate needs. Running the same generic
query five times is ceremony, not value, so do not reuse a checkpoint's
query at a different gate.

---

## Checkpoint H1 — after intent, before Gate 1 Product

Find out if this repository attempted this feature before, and what users
actually needed versus what got built.

```
recall("<feature domain>, prior attempts, related initiatives, what was
        built before in this area, why it was removed")

reflect("Has <feature domain> been attempted here before? What did people
         actually need, and how did that differ from what was built?")
```

Search for:

- **A prior attempt.** Did past work build and remove this feature? Why?
- **A gap between ask and build.** Did an earlier version solve the wrong
  problem?

## Checkpoint H2 — before Gate 2 Architecture

The product shape is settled. Find out what broke in the modules this
design will touch, before committing to a shape.

```
recall("<the modules, services, and tables this will touch>, past design
        decisions, known constraints, prior refactors, abandoned designs")

reflect("What has broken before in these modules? Which architectural
         shapes were tried and abandoned here, and why? What constraint
         did nobody write down?")
```

Search for:

- **A module with history.** A module rewritten twice is a warning, not a
  clean slate.
- **An abandoned design.** Knowing why a past shape failed saves a full
  gate cycle.
- **An unwritten constraint.** Rate limits, vendor quirks, or data shapes
  that broke a past design and appear nowhere in the code.

## Checkpoint H3 — before Gate 3 Program Design

The architecture is settled. This checkpoint works at file and signature
grain, not shape grain. Find out how these exact files were refactored
before, and what integration pain past sessions hit.

```
recall("<the specific files this program design will create or modify>,
        past refactors of these files, signature changes, placement
        decisions, integration pain, test setup problems")

reflect("What signature or placement decisions were already settled for
         these files? What integration or test pain has this area caused
         before?")
```

Search for:

- **A settled signature.** A function signature changed twice already
  points to a shape the team converged on. Do not reopen it without reason.
- **Integration pain.** Authentication, migrations, or service boundaries
  that cost past sessions retries.
- **Test setup cost.** Fixtures or mocks that took several attempts to get
  right in this area.

## Checkpoint H4 — before Gate 4a Slice plan

This checkpoint is about decomposition, not the feature. Find out how
slicing itself has failed in this repository before committing to a slice
order and size.

```
recall("slice planning in this repository, slices that escalated or needed
        retries, slice sizing, ordering mistakes, tracer bullet failures")

reflect("How has slice decomposition failed here before? Which slices
         escalated, how were they sized, and what ordering mistake cost a
         cycle?")
```

Search for:

- **An oversized slice.** A slice that needed three attempts was probably
  too large, not badly implemented.
- **A wrong order.** A later slice that had to unwind an earlier one's
  assumption.
- **A missing tracer bullet.** A first slice that skipped the end-to-end
  wire and paid for it in slice two.

## Checkpoint H5 — before each Gate 4b epic technical solution design

This checkpoint fires once per multi-slice epic, not once per feature. Scope
the query to that epic's own modules, not the whole feature.

```
recall("<this epic's modules only>, technical history, past bugs, prior
        implementations of similar epics, files this epic will touch")

reflect("What does memory say about <this epic's modules>, specifically?
         What broke here before, at the technical level this epic works
         at?")
```

Search for:

- **A module-local bug history.** A defect class that recurred in exactly
  these files.
- **A prior similar epic.** How a comparable epic was implemented last
  time, and what its retrospective (see Retain, below) says about it.

---

## The three rules for effective recall

**1. Read the results.** When a query output writes to a file because it is
large, read that file. A query whose output nobody reads did not happen.

**2. Write findings into the gate document.** Prior art that stays in chat
dies at the next compaction. Put findings into the gate's own document
(`01-product.md`, `02-architecture.md`, `03-program-design.md`,
`04-slices.md`, or `epic-<epic-id>-design.md`) in plain form:

```markdown
## Prior art
- Hindsight: a webhook retry queue was built in March and removed. It double
  delivered under a partial outage because the deduplication key was the
  payload hash. This design responds by keying deduplication on the event id
  from the provider instead.
```

If a recall turns up no relevant items, write that result: `Prior art: none
found for <domain>.` This note prevents a future session from repeating the
same query.

**3. A skill or a user instruction overrides a memory.** A memory records
what was true when written. When a recalled pattern contradicts this skill
or a user instruction, follow the instruction. Audit each recalled item:

| The memory says | Resolution |
|---|---|
| Something this skill contradicts | Discard the memory. The workflow changed. |
| Detail this skill does not cover | Use the memory as context. |
| Something about an unrelated area | Use the memory freely. |
| A file, flag, or function exists | Verify the item exists before acting on it. |

---

## Retain after every accepted slice

Store one retain each time a slice reaches **PASS**, not only at the end of
the feature. An end-of-feature reflection is written when the details have
already compacted away. It records conclusions and loses the causes behind
them. A retain written the moment a slice is accepted still has the cause
in view.

Keep each retain short enough to actually be written:

```
retain("Slice <N> (<slice name>), epic <epic-id>, feature <feature-slug>.
        Score: <overall_score>. Attempts: <attempt count>.
        Root cause of retry, if any: <cause, or 'none, passed first attempt'>.
        Constraint the build revealed that the code does not show:
          <constraint, or 'none'>.
        Approach tried and abandoned during this slice: <approach and
          reason, or 'none'>.")
```

Write this immediately after the PASS verdict, in the same step where
`00-status.md` gets the score (see `slice-loop.md`'s "Handling the verdict"
table, PASS row, and `goal-sync.md`'s "Integration point").

### End-of-feature reflection

Keep the end-of-feature reflection, but treat it as a summary over the
per-slice retains, not the only record of the feature.

```
reflect("Across the retains for feature <feature-slug>, what pattern
         connects the escalations and the abandoned approaches? What single
         lesson should a future H1 or H2 checkpoint on this domain surface
         first?")
```

State the feature name and the slice list. List which slices escalated,
with the root cause of each. Record any constraint discovered during the
build that code does not show. Record any design tried and abandoned, with
the reason. Keep the reflection to one or two paragraphs. A reflection that
is too long will not be read.
