# Whole-repository check: agencheck

Date: 2026-11-14. The engineer asked for this run as a further check of the whole-repository view (E6).

## The run

- **Input.** The `agencheck/` folder of `zenagent` at `origin/main` commit `1a3cc7177` (2026-07-29). A `git subtree split` in a scratch clone made it a repository of its own, with 3,218 commits and 5,006 files. The local `zenagent` checkout stayed untouched.
- **Command.** `structure_evidence.py --repo --since 0fef1aa --out ...`, with this branch's script. The base commit is the last one before 2026-04-30.
- **Time.** 7 seconds. The window is 365 days, because 90 days hold fewer than 20 commits.
- **Output.** 288 findings and 112 folder rows. The record is `replay/agencheck-structure-findings.json`.

| Signal | Findings | Sample | Real (act or keep) | Note |
|---|---|---|---|---|
| name-stem-cluster | 150 | 150 | 16 | 134 families hold no code file: PRDs, screenshots, README notes |
| duplicate-group | 78 | 3 | 3 | Largest: a 46-line database singleton in 17 files, a Prefect import shim in 12 flow files, LiveKit token checks in 7 routes |
| twin-name | 33 | 8 | 4 | False: `agent.py`, `app.py`, `config.py` in separate apps, and a router and a model of one entity |
| crowded-folder | 14 | 8 | 8 | `tests` holds 139 files, `communication-agent/helpers` holds 36 |
| consumer-locality | 7 | 7 | 7 | `useAGUIContactAgent.ts` has its only importers in `components/university` |
| co-change | 5 | 5 | 4 | False: two version files of a vendored plugin |
| generic-name | 1 | 1 | 1 | `lib/utils.ts`, the usual helper file of a shadcn project |
| contract-drift | 0 | | | See below |
| boundary-edge | 0 | | | The repository has no `boundary.yaml` |

These labels are agent labels. The engineer has not checked them.

## What the run shows

1. **The name-stem cluster counts non-code files.** 134 of 150 families hold only documents or images. The crowded-folder signal needs a code file, but the name-stem cluster does not. This repository keeps its documents in `documentation/`, which the default `**/docs/**` glob does not match. With the code-file rule, 16 families stay.
2. **Duplicated code is the strongest signal here.** Each of the three largest groups is a copy that one shared module would remove.
3. **Contract drift reads only modified files.** The reader counts a renamed file as one added and one deleted file. Since the base commit, 13 Python files changed in place and 17 were renamed. The 13 kept their public surface, so the zero is true. A renamed file with a changed surface is not compared.
4. **Twin names in separate apps are noise.** Each app of this repository has its own entry point, such as `agent.py` or `app.py`. A router and a model of one entity also share a name by design.
5. **The parse cap skips large test folders.** `agencheck-support-agent/tests` holds 135 code files, over the cap of 60, so its import groups are not read.

## Follow-ups

- Apply the code-file rule to the name-stem cluster.
- Compare a renamed Python file with its old path in contract drift.
- Consider a twin-name filter for separate apps and for layer pairs, after more labels.

## After the documentation exclusion

The default `excluded_paths` now holds `**/documentation/**`. A second run gave 166 findings: 33 name families instead of 150. 19 of the 33 families still hold no code file, such as Dockerfiles, `.env` files, data files, and email templates.
