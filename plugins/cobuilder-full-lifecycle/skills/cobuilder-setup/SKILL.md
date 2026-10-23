---
name: cobuilder-setup
user-invocable: false
title: "CoBuilder Setup"
version: 1.0.0
status: active
last_verified: 2026-10-16
description: >
  Set up the CoBuilder family in one repo. Installs habit-hooks and its
  detectors, proves the coach, checks the glossary, and adds the Hindsight
  allow rules after the engineer approves each change.
---

# CoBuilder Setup

This skill sets up the CoBuilder family for the target repo. It asks before it installs a tool or changes a file.

## Install mode

This mode runs the five parts below in order: habit-hooks setup, glossary check, Hindsight allow rules, tracker backfill, and report. Run it once per repo, and again when the repo gains a language.

## Habit-hooks setup

This part installs habit-hooks and its per-project detectors, then proves the coach. For a python-only repo, the install command is `uv tool install "habit-hooks[python]"`.

1. **Detect languages from marker files.** Check the repo root for these
   markers and build the list of detected languages:
   - `pyproject.toml`, `requirements*.txt`, or `setup.py` → python.
   - `package.json` with a `typescript` dependency, or `tsconfig.json` →
     typescript.
   - `composer.json` → php.
   - `pom.xml` or `build.gradle` → java.
   - `Gemfile` → ruby.

2. **Show the plan and ask for confirmation.** List the detected languages.
   Show the one combined install command,
   `uv tool install "habit-hooks[<extras>]"`, with every detected language
   as an extra in that single command. Explain that a later
   `uv tool install` with different extras rebuilds the tool environment and
   silently replaces this one, so every needed language must appear in one
   command. Ask the user to confirm before running it.

3. **Run the confirmed install command.** Then verify it with
   `habit-hooks --version`.

4. **Install the per-project detectors, after confirmation.** Each detected
   language needs its own detector package in the target repo, not in
   habit-hooks itself:
   - generic (always) → `npm install --save-dev jscpd`.
   - python → `pip install ruff deptry`, or `uv add --dev ruff deptry`.
   - typescript → `npm install --save-dev eslint knip ts-morph`, plus
     `node`. Add `@typescript-eslint/parser @typescript-eslint/eslint-plugin`
     too when the repo has no eslint config of its own.
   - php → a PHP runtime.
   - java → `pmd`.
   - ruby → `rubocop`.

   habit-hooks looks for a detector in `node_modules/.bin` of the repo root,
   and then on `PATH`. Run every `npm install` at the repo root. When the root
   has no `package.json`, as in a repo whose only `package.json` sits in a
   sub-folder, show the user a tools-only `package.json` first: a `private`
   package with a name and a one-line description, and no code. Create it
   only after the user confirms. Check that `node_modules/` is in
   `.gitignore`, and tell the user to commit `package.json` and
   `package-lock.json`.

   `jscpd` reads `src` by default. When the repo has no `src` folder, show the
   user a root `.jscpd.json` that lists the real source folders. Make it ignore
   symlinked folders, lock files, generated files, and `node_modules`. Create
   it after the user confirms.

   When the repo has both python and typescript, habit-hooks hands every
   TypeScript file to ruff, and ruff reports each one as a parse error. Show
   the user a `[tool.ruff]` table in `pyproject.toml` with
   `force-exclude = true` and `extend-exclude` for `**/*.ts` and `**/*.tsx`.
   Add it after the user confirms.

5. **Run `habit-hooks init`.** It detects languages on its own, writes
   `.habit-hooks/config.toml`, and lists any detector it still cannot find.
   Running it again is safe. Run it again after step 4 until it reports
   `Nothing missing`. Then run `habit-hooks --branch <base>` once, where
   `<base>` is the default branch. An `incomplete-run` group in the output
   means a tool broke. Fix that tool before you report success, because a
   clean result cannot be trusted until then.

6. **Offer the backlog snooze. Never run it without explicit approval.**
   Explain that `habit-sensors --all | habit-snooze --snooze` snoozes every
   existing finding, so new code is coached but old debt is not flagged.
   Only run it if the user says yes. Remind the user to commit both
   `.habit-hooks/config.toml` and `.habit-hooks/snooze.json` after this mode
   finishes.

7. **Report the result.** State which languages have both habit-hooks and
   their detector installed, and which detector is still missing for which
   language.

8. **Prove the coach.** Call `Skill("build", args="coach-check")` after every install. The `implement` plugin runs the check, because only that plugin can resolve its own script path. Report success only when that mode reports "coaching works". When it reports "coaching check failed", show the reason to the user, fix it, and call the check again. Do not report success until it reports "coaching works".

`ste-writing` needs no install step. It ships in every plugin through
`shared/`, so it is already present once the plugin is installed.

## Glossary check

During the setup-and-verify pass, check whether `DDD-VOCABULARY.md` exists
at the repository root, and state the result. When it is absent, say that
vocabulary checking will run against no glossary, and that one is created
with the vocabulary bootstrap in `/architect:design` stage 1 (ADR-0036).
Install never runs the bootstrap itself, and it never interviews the
engineer about terms.

## Hindsight allow rules

This part adds the allow rules that the Hindsight tools need under auto mode. Follow these steps in order.

a. If the session lists `mcp__cobuilder-memory__consult`, the needed rules are `mcp__hindsight__recall`, `mcp__hindsight__search_knowledge_base`, `mcp__hindsight__get_knowledge_page`, and `mcp__hindsight__reflect`. The consult tool calls these four.

b. If the session lists `mcp__hindsight__retain`, add `mcp__hindsight__retain` to the needed rules. The slice note of the build loop calls it.

c. Always add `Bash(uv run *shared/tracker.py*)` to the needed rules. The build loop calls the tracker script with this form. If the session lists neither `mcp__cobuilder-memory__consult` nor `mcp__hindsight__retain`, state that no Hindsight rule is needed, and go on to step d.

d. Read `permissions.allow` in the user file `~/.claude/settings.json`. List each needed rule that the file does not hold. If no needed rule is missing, say so. Then skip to the Report section.

e. Show the missing rules. Ask once for permission to add all of them. Do not write to the file before the answer.

f. After a yes, add only the missing rules to `permissions.allow`. Keep every other key and rule as it is, and do not reorder them. If the file has no `permissions.allow` list, create it. Then parse the file as JSON to check it. If the parse fails, tell the user and stop.

   If the harness refuses the write, do not retry through another tool. The refusal is a guard, such as the auto mode check on a settings file. Tell the user about the refusal, then go on as step g says.

g. After a no, change nothing. List the missing rules as a manual step for the user.

h. State the reason to the user. A plugin cannot ship allow rules, so this skill edits the user file itself, and only after approval.

## Tracker backfill

This part runs after the engineer configures the tracker adapter. It follows `shared/tracker-backfill.md`. It writes nothing until the engineer agrees.

0. **Create the tracker config.** If `.cobuilder/tracker.yaml` is missing, ask the engineer which adapter to use: `beads` or `files`. Do not offer any other adapter. After the answer, write the file. For beads, the file holds `adapter: beads`. For files, it holds `adapter: files` and `plans_dir: docs/plans`. If the file exists, keep it.

   For beads, write `sync: async` in the file without a question. It makes each write return at once, and a short-lived worker runs the sync. To change it, the engineer sets `sync: write` or `sync: off` in `.cobuilder/tracker.yaml`. For files, write no `sync` key. If the file exists, keep its `sync` key.
1. **Check the adapter.** When the adapter is beads and the repo has no `.beads` folder, read `shared/tracker-adapter-beads.md`. It holds the approval step for the beads setup. Do not run any beads command from this skill.
2. **Check the beads tool.** When the adapter is beads, run `tracker.py doctor`. If it exits 3 and reports that the beads binary is not found, stop this part. Tell the engineer to install the beads tool as the Prerequisites section of the README says, and to run install again. Do not install it from this skill.
3. **Prepare beads.** When the adapter is beads, tell the engineer that this step sets the issue type list of the repo to include `program`, and that the types already in the list stay. Ask the engineer to agree. After the engineer agrees, run `tracker.py prepare`. If the engineer declines, stop this part.
4. **Run the dry run.** Run `tracker.py seed-from-files <plans-dir> --dry-run`. Show the engineer the list of planned creates.
5. **Ask for consent.** Ask the engineer for explicit consent to write. Do not write on silence or on a vague answer.

If the engineer declines, stop this part and report that nothing was written.

After the tracker is ready, the build loop closes a stuck slice with `tracker.py skip-slice <id> --reason <text>`.

## Report

Report one list with one item for each part:

- **Languages and detectors:** the languages that habit-hooks setup detected, and the detectors that it installed or still lacks.
- **Coach check:** the line that the coach-check mode printed.
- **Glossary:** whether `DDD-VOCABULARY.md` exists at the repository root.
- **Allow rules:** each rule that the user file received, already held, or left for the user.
