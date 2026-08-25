---
title: "Optional Prior-Art Recall (Hindsight)"
status: active
type: reference
---

# Prior-art recall

This procedure is optional. Run it only when the user chooses it and a
Hindsight memory is available in this harness. Record the answer once in
`00-status.md` (`Hindsight: yes | no | unavailable`). Do not ask again for this
feature.

The purpose is narrow. Past sessions in this repository already learned lessons.
A design written without checking those lessons repeats mistakes that are
already recorded. Run two short checkpoints.

---

## Checkpoint H1 — after intent, before Gate 1

The user states the feature intent. Find out if this repository explored this
area before you write the product document.

```
recall("<feature domain>, prior attempts, related initiatives, what was
        built before in this area")

reflect("What should a <feature domain> effort account for in this repo,
         given past sessions? What went wrong in similar prior work, and
         what was the root cause?")
```

Search for three items:

- **A prior attempt.** Did past work build and remove this feature? Why?
- **A constraint nobody wrote down.** Find rate limits, vendor quirks, or data
  shapes that broke past designs.
- **A decision already made.** If an architecture decision record or a past
  session settled a choice, do not reopen it in Gate 1.

## Checkpoint H2 — after Gate 1 approval, before Gate 2

The product shape is settled. Find out what the codebase taught past
contributors before you design against it.

```
recall("<the modules, services, and tables this will touch>, past design
        decisions, known constraints, prior refactors")

reflect("What has broken before in these modules? Which designs were tried
         and abandoned here, and why?")
```

Search for three items:

- **A module with history.** A module rewritten twice is a warning, not a
  clean slate.
- **An abandoned design.** Knowing why a past approach failed saves a full gate
  cycle.
- **A difficult integration.** Watch for authentication, migrations, and
  service boundaries.

---

## The three rules for effective recall

**1. Read the results.** When a query output writes to a file because it is
large, read that file. A query whose output nobody reads did not happen.

**2. Write findings into the gate document.** Prior art that stays in chat dies
at the next compaction. Put findings into `01-product.md` or
`02-architecture.md` in plain form:

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

**3. Skills and user instructions override memories.** A memory records what was
true when written. When a recalled pattern contradicts this skill or a user
instruction, follow the instruction. Audit each recalled item:

| The memory says | Resolution |
|---|---|
| Something this skill contradicts | Discard the memory. The workflow changed. |
| Detail this skill does not cover | Use the memory as context. |
| Something about an unrelated area | Use the memory freely. |
| A file, flag, or function exists | Verify the item exists before acting on it. |

---

## Closing the loop

Store a short reflection at the end of the feature if Hindsight is active. This
step makes future H1 checkpoints useful:

- State the feature name and the slice list.
- List which slices escalated, with the root cause of each escalation.
- Record any constraint discovered during the build that code does not show.
- Record any design that was tried and abandoned, with the reason.

Keep the reflection to one or two paragraphs. A reflection that is too long will
not be read.
