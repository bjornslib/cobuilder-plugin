# Rubric: Slice 15 — the duplicated prose

Feature: mechanical-smells
Epic: E2
Slice goal: `habit-sensors` reports no `duplicated-code` finding for the 14 prose files (the stack references of the architect and pr plugins, and the tracker guide). Each rule keeps one copy that readers can reach through a link, or the copies differ on purpose. Each reader of each plugin still finds each rule. The choice is recorded in the catalog.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. **The slice's files** are the Markdown files that report `duplicated-code` at S. Get the list with `habit-sensors --all` in `/tmp/before-15`, made by `git worktree add --detach /tmp/before-15 S`. Expect 14 files and 44 findings. If the count differs, use the real count. **A rule** is one instruction or one fact in a duplicated block. **The catalog** is `docs/architecture/designs/mechanical-smells/findings-catalog.md`. ADR-0017 covers `shared/`, and the repo vendors it into each plugin as a symlink.

## Criteria

### C1 — no duplicated-code finding remains [CRITICAL]
**Must be true:** Every slice file, and every new Markdown file the slice adds, reports no `duplicated-code` finding. The slice adds no other smell. The number of Python and TypeScript findings did not rise.
**Evidence to check:** run the sensor command for each slice file and each new `.md` file (`git diff --name-status S..HEAD -- '*.md'`, status `A`). Run `uv run pytest tests/test_repo_habit_clean.py -q`, which holds the slice 15 entry. Run `habit-sensors --all` and count `duplicated-code` in `.md` files.
**Scoring:**
- 1.0 — zero findings in `.md` files that were in scope, and no other smell rose.
- 0.5 — one or two files still report a finding.
- 0.0 — more than two files report a finding.

### C2 — every rule is still reachable [CRITICAL]
**Must be true:** Each rule in a duplicated block at S still exists in the working tree, and a reader of each plugin that held a copy can reach it. Reach means one of two things: the text stays in the plugin's own file, or the plugin's file holds a working link or a named reference to the one copy. No rule vanished, and no link points at a missing file or at a heading that does not exist.
**Evidence to check:** for each cluster in the findings at S, read the block at S and write its rules as a list in the evidence file. For each rule, find it now with `git grep -nF "<distinctive phrase>"`. For each plugin that lost a copy, read the file that remained and confirm it links to the kept copy. Check each link with a script: extract `](...)` targets from the changed `.md` files and test that each relative path exists, and that each `#anchor` matches a heading (`grep -nE '^#+ '`). Read at least ten rules, or all if fewer. A skill or command that loaded the old file by name (`git grep -n "<old file name>"`) must still resolve.
**Scoring:**
- 1.0 — all sampled rules are found, every link resolves, and every old name resolves.
- 0.5 — one rule is reachable only through a weak mention, with no link, or one anchor is stale.
- 0.0 — any rule is gone, or any link or load name is broken.

### C3 — the plugin boundaries and ADR-0017 hold [CRITICAL]
**Must be true:** If one copy moved into `shared/`, the file lives in `shared/`, each plugin reaches it through its `plugins/<name>/shared` symlink, and no file names `plugins/<other>/...` (CLAUDE.md principle 4). The packaging and symlink tests pass. If the copies stay, they differ on purpose, and the difference is real, not a reworded copy that the detector cannot match. If a plugin must ship alone, its text does not depend on a file that the plugin does not ship.
**Evidence to check:** run `uv run pytest tests -q -k "package or packaging or symlink or vendored or shared"` and the full test command. Run `git diff --name-status S..HEAD` and list moved or new files. Run `git grep -nE "plugins/[a-z-]+/" -- <changed .md files>` and confirm no link names another plugin's path. Run `ls -l plugins/*/shared` and confirm each is still a symlink to `../shared`. Read ADR-0017 and the changed text and check that they agree. For copies that stay, read the pairs and confirm the difference is a real one (a different reader, a different example, a different rule), not a synonym swap.
**Scoring:**
- 1.0 — tests pass, no cross-plugin path, the symlinks are intact, and any kept copies differ for a real reason.
- 0.5 — tests pass, but one kept pair differs only in wording.
- 0.0 — a packaging or symlink test fails, a cross-plugin path appears, or ADR-0017 is broken.

### C4 — the decision is recorded
**Must be true:** The catalog records, for each cluster group, which choice the slice made (move to `shared/`, keep with a real difference, or merge inside one plugin), who owns the text, and the reason. The catalog's count for the 14 files matches the sensor. The open question of the epic design (which reader owns the text) has an answer.
**Evidence to check:** `git diff S..HEAD -- docs/architecture/designs/mechanical-smells/findings-catalog.md` and read it. Run `uv run shared/build_index.py` only if the diff touches indexed records, and then confirm the derived files match.
**Scoring:**
- 1.0 — each cluster group has a recorded choice, an owner, and a reason.
- 0.5 — the choice is recorded but the owner or the reason is missing.
- 0.0 — no record.

### C5 — only the files in scope changed, and the prose stays plain
**Must be true:** The slice changes slice files, a new `shared/` file when chosen, the sensor check files, the catalog, and links that point to the moved text. It changes no code file except the sensor check. The edited prose keeps the ASD-STE100 style of CLAUDE.md. `uv run shared/prose_budget.py check <file>` reports no new ceiling breach for an edited authored file.
**Evidence to check:** `git diff --name-status S..HEAD`. Run `uv run shared/skills/ste-writing/ste-lint.py` (or the path that `ls shared/skills/ste-writing` shows) on each added text and compare its score per 100 words with the file at S. Run the prose budget check on each changed file that it covers.
**Scoring:**
- 1.0 — only files in scope, and the style score did not worsen.
- 0.5 — the style score worsened a little in one file, or one stray file changed with a reason.
- 0.0 — a code file changed in behavior, or a ceiling breach was added.

### C6 — no suppression and no dodge
**Must be true:** The slice adds no jscpd ignore, no exclusion in `.habit-hooks/config.toml`, no `noqa`, no `habit-snooze`. A clone is not hidden by a cosmetic change, such as swapping words, adding a blank line, or changing list markers, solely to defeat the detector.
**Evidence to check:** `git diff S..HEAD | grep '^+' | grep -E 'noqa|snooze|jscpd|eslint-disable|@ts-ignore|as any'` must print nothing. `git diff S..HEAD -- .habit-hooks` must show no new exclusion. Compare five old clusters with their new text and decide whether the change is real.
**Scoring:**
- 1.0 — nothing found, and no cosmetic dodge.
- 0.5 — one cosmetic dodge.
- 0.0 — any suppression, or two or more dodges.

## Regression check
- All tests that passed before this slice must still pass, including the packaging, symlink, and install tests.
- The viewer suite still reports 260 passing tests. The viewer's built `index.html` is unchanged unless the slice touched a file that the build reads.

## Out of scope — do not penalise
- `non-essential-comment` findings. Slice 16 owns them.
- Duplicated code in Python files. Slice 14 owns it.
- Prose in the README and the ADRs that carried no finding at S.
