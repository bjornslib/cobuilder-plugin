Kind: test-suite

# Rubric: Slice 5 — Usage reference matches the command

Feature: beads-storage
Epic: E1
Slice goal: A reader runs each example in `shared/tracker-usage.md` and gets the output that the reference shows.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — Every example runs and matches its shown output [CRITICAL]
**Must be true:** each command example in `shared/tracker-usage.md` runs on the fixture config. Its output and exit code match the output and exit code that the reference shows.
**Evidence to check:**
- Extract each fenced command block from `shared/tracker-usage.md`. Run each command in a shell with the fixture config.
- Compare the stdout and the exit code with the shown output. Keep the transcript as evidence.
**Scoring:**
- 1.0 — every example matches its shown output and exit code.
- 0.5 — most examples match, and each mismatch is named in the transcript.
- 0.0 — any example fails to run, or a mismatch is not named.

### C2 — The reference covers the read subcommands and the exit codes [CRITICAL]
**Must be true:** the reference names the read subcommands `list-programs`, `list-epics`, `list-slices`, `list-pull-requests`, `get-slice`, and `capabilities`, and it names exit codes 0, 2, 3, and 4 with their meaning.
**Evidence to check:**
- Read `shared/tracker-usage.md`. Check each subcommand name and each exit code.
- Run `uv run shared/tracker.py --help`. Each read subcommand that the reference names also appears in the help output.
**Scoring:**
- 1.0 — every named subcommand and exit code is present, and the help output names every read subcommand.
- 0.5 — one name or code is missing.
- 0.0 — two or more names or codes are missing.

### C3 — The reference names no write subcommand that E1 does not ship [CRITICAL]
**Must be true:** the reference marks each write subcommand as "exits 2 with no adapter" in E1. It does not show a write result as a success.
**Evidence to check:**
- Read `shared/tracker-usage.md`. List each write example.
- Each write example shows exit code 2 and a message about the missing adapter.
**Scoring:**
- 1.0 — every write example shows exit 2.
- 0.0 — any write example shows success.

### C4 — The reference uses the STE writing rules
**Must be true:** the reference uses one instruction per sentence, at most 25 words per sentence, active voice, no semicolons, and no contractions.
**Evidence to check:**
- Run `uv run shared/skills/ste-writing/ste-lint.py --mode flavored shared/tracker-usage.md`. Its violations per 100 words are at or below the level that CLAUDE.md allows for flavored prose.
- Search the file for `;` and for contractions such as `n't` and `'s` in prose lines. None appears.
**Scoring:**
- 1.0 — the lint score is within the allowed level, and no semicolon or contraction appears in prose.
- 0.5 — the lint score is high, but no semicolon or contraction appears.
- 0.0 — a semicolon or a contraction appears in prose.

### C5 — No other file changes in this slice
**Must be true:** the only new file in this slice is `shared/tracker-usage.md`. No plugin file, no test file, and no `docs/` file changes.
**Evidence to check:**
- `git status --porcelain` after the slice lists `shared/tracker-usage.md` and nothing else from this slice.
**Scoring:**
- 1.0 — only `shared/tracker-usage.md` is new from this slice.
- 0.0 — any other file from this slice changed.

## Regression check
- All tests from slices 1 to 4 still pass (`uv run pytest tests -q`).
- `tests/test_script_references.py` passes with the new reference file present.

## Out of scope — do not penalise
- The write subcommands beyond their no-adapter refusal (E2, E3, and E4).
- The beads adapter and the projector parity (E2 and E3).
- The plugin version bump. E1 does not bump a version.
