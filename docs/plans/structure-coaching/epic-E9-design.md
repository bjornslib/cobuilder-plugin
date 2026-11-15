# Epic Technical Solution Design: E9 — Follow-ups

Feature: structure-coaching
Epic ID: E9

## Scope and Intent

The replay stopped the work on E7 and E8. Five gaps stayed open. The engineer chose all five on 2026-11-15.

Review mode labels a structure finding `debt`, but nothing turns that debt into work. Slice 15 closes that gap. Review mode proposes a backlog design, and design mode decides (ADR-0035). `/implement:start` then builds the design with the normal gates. This is a small form of the stopped E8, and it adds no command.

Slices 16 to 19 close four smaller gaps that the build found.

## Files Touched

| Slice | Files |
|---|---|
| 15 | `plugins/architect/skills/architecture/references/structure-review.md`, `plugins/architect/skills/architecture/SKILL.md` (Review Mode step 12) |
| 16 | `DDD-VOCABULARY.md`, `plugins/architect/skills/architecture/SKILL.md`, `plugins/architect/skills/architecture/references/structure-review.md` |
| 17 | `plugins/implement/skills/build/workflows/slice-loop.js`, `plugins/implement/skills/build/references/slice-loop.md` (scripted mode paragraph) |
| 18 | `shared/structure/vocabulary.py` or `shared/structure/slice_vocab.py`, a test file |
| 19 | `shared/structure_evidence.py`, one new module under `shared/structure/` |

## Types & Signatures

- **Slice 15.** No code. The review step writes `docs/architecture/designs/<name>/goal.json` with `stage: "backlog"` and one epic for each group of `debt` findings. Each epic has `id`, `slug`, `title`, `outcome`, and `findings`, a list of finding keys. The step writes the file only after the engineer confirms the labels and the groups.
- **Slice 16.** Two glossary entries with qualified names: one for `/architect:review` and one for `/pr:review`. The architect prose uses the architect name.
- **Slice 17.** `RED_SCHEMA` gains `sliceBase`, the output of `git rev-parse HEAD` before RED writes a file. The GREEN prompt in `slice-loop.js` ends each attempt with a commit of the slice files on the feature branch. The VALIDATE and vocabulary prompts get the evidence script path, `--base <sliceBase>`, and `--out <evidence>/slice-<N>-packet.json`.
- **Slice 18.** `vocabulary_leads` returns one entry for each name, path, and word in each list.
- **Slice 19.** No signature changes. Code moves out of the entry script.

## Slice Decomposition

| # | Slice | Depends on |
|---|---|---|
| 15 | Review mode proposes a backlog design from the confirmed debt findings | none |
| 16 | One name for each review mode | 15 |
| 17 | The scripted loop gives VALIDATE a slice base and a packet path | 16 |
| 18 | No duplicate vocabulary leads | 17 |
| 19 | `structure_evidence.py` keeps to the size guide | 18 |

The order follows the tracker blockers. Slices 18 and 19 touch the same code, so 19 comes last.

## Test Plan

- **15.** A reference test checks that `structure-review.md` names `stage`, `epics`, and `findings` as `goal.json` keys. A blind review agent with a fixture record writes the backlog `goal.json`. `build_index.py` accepts the file.
- **16.** The glossary tests pass. VALIDATE reads the changed prose. No test asserts wording.
- **17.** A test runs the workflow script with a fake `agent()` and checks the VALIDATE prompt for `--base` and the base that RED returned. A test checks that the GREEN prompt holds a commit step. A scratch run of two slices gives a packet for slice 2 with no slice 1 file.
- **18.** A test with a file `issue_invoice.py` and a function `issue_invoice` gives one lead in each list.
- **19.** A line count test of the entry script, and the existing evidence tests.

## Risks & Open Questions

- **Commits in scripted mode.** A GREEN commit lands before VALIDATE scores the attempt. A failed attempt therefore leaves a commit on the feature branch. Git can roll it back, and a later attempt commits on top. The diff from `sliceBase` still covers every attempt.
- **A dirty work tree at the start.** Files that the engineer changed outside the slice enter the diff from `sliceBase`. RED reports the dirty files, and the script names them in the run log.
- **Backlog quality.** Slice 15 depends on the labels. A wrong `debt` label gives a wrong epic. The engineer confirms the groups before the file is written.
