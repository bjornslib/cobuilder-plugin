# Epic Technical Solution Design: E2 — Coach delivery

Feature: structure-coaching
Epic ID: E2

## Scope and Intent

E2 turns the signals into coaching that GREEN acts on. Slice 3 writes the wording, and the engineer approves it before any code uses it. Slice 4 applies the wording in the coach, with no repeat in a session and no smell output for an unscanned extension. Slice 5 makes the install write the default config. The coach has no cap on structure findings, as ADR-0048 decision 5 says.

## Files Touched

- `shared/structure-messages.json` (new, slice 3)
- `plugins/implement/agents/validate.md` (the Structure block format only, slice 3)
- `plugins/implement/scripts/structure_runner.py` (slice 4)
- `plugins/implement/scripts/habit_coach.py` (`scanned`, slice 4)
- `plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/SKILL.md` (slice 5)
- `tests/test_structure_runner.py` (new), `tests/test_habit_coach.py`, `tests/test_install_command.py`
- The version fields of `implement` and `cobuilder-full-lifecycle` in `plugin.json` and `marketplace.json`

## Types & Signatures

`shared/structure-messages.json`:

```json
{
  "crowded-folder": "<template with {folder}, {count}, {limit}, and the decision to make>",
  "name-stem-cluster": "<template with {folder}, {stem}, {count}>",
  "generic-name": "<template with {path}>"
}
```

Each template names one decision, as the research found that a message that names the decision works better than a bare number. Each template gives two choices: move the files now, or keep the layout and give the reason in one line of the GREEN report.

The session record is a JSON list of finding keys at `<tempfile.gettempdir()>/cobuilder-coach-<session_id>.json`. A missing or bad file counts as empty. With no `session_id`, the runner keeps no record.

## Slice Decomposition

3. **Slice 3, the coaching language.** Depends on slice 2. Ends with the engineer approval and one blind GREEN pass.
4. **Slice 4.** Depends on slice 3. Ends with the coach tests.
5. **Slice 5.** Depends on slice 4. Ends with the install test.

## Test Plan

- Slice 3: a blind pass. A fresh GREEN agent gets a small task and one rendered message. The evidence is its transcript: does it move the files or give a reason? A structure test checks that each signal of `structure_signals.py` has a key in the JSON file.
- Slice 4: `test_structure_runner.py` and the new `test_habit_coach.py` cases from `03-program-design.md`.
- Slice 5: a temp-repo test that the setup step writes a config that `load_config` reads. `test_install_command.py` stays green.

## Risks & Open Questions

- The wording may need two rounds of engineer review.
- The no-repeat key may hide a second problem in the same folder.
- No cap on findings may give long messages on an old, flat repo. The ratchet limits this to new files.
