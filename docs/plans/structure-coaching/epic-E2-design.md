# Epic Technical Solution Design: E2 — Coach delivery

Feature: structure-coaching
Epic ID: E2

## Scope and Intent

E2 turns the signals into coaching that GREEN acts on. Slice 3 writes the wording, and the engineer approves it before any code uses it. Slice 4 applies the wording in the coach, with no repeat in a session and no smell output for an unscanned extension. Slice 5 makes the install write the default config. The coach has no cap on structure findings, as ADR-0048 decision 5 says.

## Files Touched

- `shared/structure-messages.json` (new, slice 3)
- `plugins/implement/agents/validate.md` (the Structure block format only, slice 3)
- `plugins/implement/scripts/structure_runner.py` (slice 4)
- `plugins/implement/scripts/habit_coach.py` (`scanned` and the join, slice 4)
- `plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/SKILL.md` (slice 5)
- `tests/test_structure_runner.py` (new), `tests/test_habit_coach.py`, `tests/test_install_command.py`
- The version fields of `implement` and `cobuilder-full-lifecycle` in `plugin.json` and `marketplace.json`

## Types & Signatures

`shared/structure-messages.json`:

```json
{
  "header": "<one line with {path}>",
  "crowded-folder": "<template with {folder}, {count}, {limit}, {families}, {components}, {nearest_group}>",
  "name-stem-cluster": "<template with {folder}, {stem}, {count}, {examples}>",
  "generic-name": "<template with {path}, {stem}>",
  "boundary-edge": "<template with {path}, {line}, {from_context}, {to_context}, {rule}>",
  "twin-name": "<template with {path}, {stem}, {twins}>, only when the spike keeps the signal"
}
```

The session record is a JSON list of finding keys at `<tempfile.gettempdir()>/cobuilder-coach-<id>.json`.

## Algorithms

### B1. The parts of each message (slice 3)

Slice 3 writes the words. This design fixes the parts, so a test can check the structure and not the words. Each signal template has four parts, in this order:

1. **The fact.** The numbers from `Finding.facts`, such as the folder, its count, and the limit.
2. **The reason.** One sentence on the cost to the next reader.
3. **The decision.** One question for GREEN, such as where the new file belongs.
4. **The two choices.** Move the file or files now, or keep the layout and give the reason in one line of the GREEN report.

A template uses only the placeholders that its signal puts in `facts`, plus `path` and `folder`. The research found that a message that names the decision gave real fixes in 83.3% of trials, against 28.9% and 5.6% for bare metrics.

Slice 3 also writes the format of the Structure block for VALIDATE (E4). The block lists each script finding for the new files of the slice. Each finding gets a judgment, confirmed or dismissed, and one line of reason. It then gives the three judgments of ADR-0048 decision 8: contract drift, cohesion, and each new dependency.

### B2. The extension guard (slice 4)

`scanned(path)` is true when the lower-case suffix of the path is in `SOURCE_EXTENSIONS`: `.py`, `.ts`, `.tsx`, `.php`, `.java`, and `.rb`. For another suffix, the coach does not call habit-hooks, and the habit-hooks result is `(0, "")`. The structure runner runs for each suffix. The rendered value of a list fact, such as `families`, is a comma list of `name (size)`.

### B3. The finding key and the session record (slice 4)

| Signal | Key |
|---|---|
| Crowded folder | `crowded-folder|<folder>` |
| Name-stem cluster | `name-stem-cluster|<folder>|<stem>` |
| Generic name | `generic-name|<path>` |
| Boundary edge | `boundary-edge|<path>|<to_context>` |
| Twin name | `twin-name|<stem>` |

The crowded-folder key has no count, so GREEN sees one message for each folder in a session. A second new file in the same folder gives no repeat.

`structure_runner.run(path, session_id)` runs these steps:

1. Get the report from `signals_for`. Any error gives `(0, "")`.
2. When `session_id` is absent, keep no record, and show each finding.
3. Make the record name safe. Replace each character outside `A-Z`, `a-z`, `0-9`, `_`, and `-` with `_`, and cut the name to 100 characters. This stops a path outside the temp folder.
4. Read the record. A missing file, bad JSON, or a value that is not a list of strings counts as an empty record.
5. Drop each finding whose key is in the record.
6. When findings remain, write the old and new keys to a temp file in the same folder, then `os.replace` it onto the record. A write error does not stop the message.
7. Render the header and one template for each remaining finding, with `str.format_map`. Return `(1, text)`, or `(0, "")` when no finding remains.

### B4. The join (slice 4)

`habit_coach.main` builds the habit-hooks message as it does today. Then it joins the two texts:

| Habit-hooks result | Structure result | Output |
|---|---|---|
| 0 | 0 | No output |
| 0 | 1 | The structure text |
| 1, 2, or 127 | 0 | The habit-hooks message, as today |
| 1, 2, or 127 | 1 | The habit-hooks message, a blank line, then the structure text |

`render` gets the habit-hooks code when it is not 0, and 1 otherwise. `main` returns 0 in every case, so the write always goes ahead.

### B5. The install step (slice 5)

The `cobuilder-setup` skill gets one step after the coach check:

1. When `.cobuilder/structure-signals.json` exists, leave it, and say so.
2. Otherwise, run `structure_signals.py --defaults` and `--survey`. Show the default config and each folder over the limit.
3. Ask the engineer to approve the config. The engineer can add an excluded path for a folder that is flat by design, such as a reference collection.
4. On approval, write the file. With no approval, write nothing. The script then uses its defaults.

The defaults come from the script, so the skill holds no second copy of them.

## Slice Decomposition

3. **Slice 3, the coaching language.** Depends on slice 10, the last E1 slice. Ends with the engineer approval and one blind GREEN pass.
4. **Slice 4.** Depends on slice 3. Ends with the coach tests.
5. **Slice 5.** Depends on slice 4. Ends with the install test.

## Test Plan

- Slice 3: a blind pass. A fresh GREEN agent gets a small task and one rendered message. The evidence is its transcript: does it move the files or give a reason? A structure test checks that each signal of `structure_signals.py` has a key in the JSON file. It also checks that each template placeholder is a fact of its signal.
- Slice 4: `test_structure_runner.py` and the new `test_habit_coach.py` cases from `03-program-design.md`. Add a case for a `session_id` with `../` in it, and one case for each row of the B4 table.
- Slice 5: a temp-repo test that the output of `--defaults` is a config that `load_config` reads with no `not_analysed` line. `test_install_command.py` stays green.

## Risks & Open Questions

- The wording may need two rounds of engineer review.
- The crowded-folder key may hide a second real problem in the same folder.
- No cap on findings may give long messages on an old, flat repo. The new-code rule limits this to new files.
- Two GREEN agents in one session can race on the record. One slice has one GREEN, so the risk is a repeat message, not a lost one.
