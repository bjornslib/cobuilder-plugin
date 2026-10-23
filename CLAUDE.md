# CLAUDE.md

## Writing standard

All prose in this repo follows plain-English rules from ASD-STE100 Issue 9
Simplified Technical English (STE). The rules cover `README.md`, this file,
skill references, commit and PR bodies, code comments, error messages, ADRs,
and the story in `story.json`. They also cover every response to the user.

`Skill("architect:ste-writing")` holds the full rule set and its two modes:
`strict` for procedures and safety text, and `flavored` for general prose. If
that call answers `Unknown skill`, read
`${CLAUDE_PLUGIN_ROOT}/shared/skills/ste-writing/SKILL.md` and obey that file.
Keep the short version below in mind.

- **Words.** Use one name for one thing, and one meaning for each word. Pick
  the short common word: start, use, help, show, about. Drop marketing
  adjectives, such as seamless, robust, powerful, and effortless. Cap a noun
  cluster at three words, and split a longer one with "of" or a hyphen. Put an
  article before every countable singular noun.
- **Verbs.** Use the active voice: "the script reads the file". Use a verb for
  an action, not a noun: "verify the bundle", not "perform verification of the
  bundle". Use simple tenses.
- **Sentences.** Write one instruction per sentence, in 25 words or fewer. Do
  not use contractions or semicolons. Keep one topic to a paragraph, in six
  sentences or fewer. State a condition before its command.

No prose is exempt, and no register is looser. The rules cover the story's
`narration`, `voice`, `problem`, and `solution`, the README pitch, and every
authored field of a design. Each authored field also has a word cap.
`shared/prose-budget.md` explains how to write inside the caps, and
`shared/prose_budget.py` holds them.

`shared/skills/ste-writing/ste-lint.py` scores rule violations per 100 words,
as a quick check. It checks rules only, not the ASD-STE100 dictionary.

## Response structure

Label each part of a response, so the reader sees at a glance which parts need
them. Use these four labels in this order, and only the labels that hold
content. An empty label teaches the reader to skip labels.

- **FYI**: a fact the reader needs and does not act on, such as a finding, a
  constraint, or a surprise in the code. It holds no question.
- **Summary**: what happened. State what changed, what you verified, and the
  evidence for each: the count, the reading, or the command. State each
  failure, skipped step, and gap. A claim of success needs its evidence.
- **Next steps**: what you do next without the reader. Name the work and the
  actor. A step that waits on the reader is a decision.
- **Decisions and questions**: what needs the reader, one item to a line. Give
  the options and your recommendation, so a one-word answer settles it. State
  what happens when the reader does not answer.

A short response may carry one or two labels. Do not pad a response to reach
four. The reader must be able to stop after FYI when nothing needs them. Use a
list or a table where it carries the meaning better than a sentence.

Before you send a response, run `Skill("architect:ste-writing")` on the draft
and correct what it flags. The fallback above applies.

## Working rules

These rules prefer caution to speed. For a trivial task, use judgment.

1. **Think before you code.** State your assumptions. If a request has more
   than one meaning, show the meanings, and do not pick one in silence. If a
   simpler approach exists, say so, and push back when you should. If
   something is unclear, stop, name it, and ask.
2. **Keep it simple.** Write the minimum code that solves the problem. Add no
   feature, abstraction, option, or error handling that the task does not
   need. If 200 lines can be 50, rewrite them.
3. **Change only what you must.** Do not improve, refactor, or reformat the
   code next to your change. Match the existing style. Mention unrelated dead
   code, but do not delete it. Remove the imports, variables, and functions
   that your own change left unused. Each changed line must trace to the
   request.
4. **Work toward a check.** Turn each task into a goal you can verify. For
   example, "fix the bug" becomes "write a test that shows the bug, then make
   it pass". For a task with several steps, state a short plan, with a check
   for each step.
5. **Finish what your work exposes.** Rules 1 and 3 still apply to the request
   itself. This rule covers what your own work leaves behind.
   - When your change leaves a gap, such as a dead line or a broken check,
     fix it in the same turn. Do not ask first.
   - Act on your own recommendation when the action is local, can be undone,
     and gives a clear gain. Examples: edit a file, run a test, or commit on a
     feature branch.
   - Ask first when the action leaves the machine, such as a push, a pull
     request, or a merge. Also ask first when the action changes behavior
     outside the request, or when two answers cost differently.
   - Only an ask-first question may end "With no answer, I do nothing". For a
     local action, do it and report it.
   - Give each action you took without being asked one line under Summary, so
     the reader can ask you to undo it.

# This repository

## What this repo is

A Claude Code marketplace (`.claude-plugin/marketplace.json`) with six plugins
under `plugins/`: five siblings and one opt-in mod. It is not an app. It has no
deploy step and no CI.

| Plugin | Job |
|---|---|
| `architect` | Seven self-only modes. Five have a command: design, review, maintenance, debug, options. `decisions` and `describe` are internal |
| `pr` | Odyssey: narrate merged PRs (`baseline`, `review`), and interview an author before a PR opens (`generate`) |
| `artifact` | Serve a bundle (`view`), publish a level as a Claude Artifact (`publish`), and draw a design as a tldraw canvas (`canvas`). Holds the viewer |
| `implement` | Build a design one vertical slice at a time (`start`, `debug`). Ships the tracker reminder hook (ADR-0041). Its `install` hands over to the umbrella's install |
| `cobuilder-full-lifecycle` | The umbrella. Depends on the other four, and holds the one install command, `/cobuilder-full-lifecycle:install` |
| `cobuilder-memory` | An opt-in mod, outside the umbrella. Gives the agent the `consult` tool, which asks Hindsight what the project decided before |

The lifecycle has six steps. `options` explores the whole system. `design`
decides one change. `implement` builds it. `pr:generate` assesses it and opens
the PR. `pr:review` narrates it after the merge. `artifact` shows the result.
Before the first build in a repo, run `/cobuilder-full-lifecycle:install`.

## Layout

```
.claude-plugin/marketplace.json   the one marketplace manifest
shared/                           vendored into each plugin as plugins/<name>/shared (symlink)
plugins/<name>/{commands,skills,scripts}   auto-discovered, never declared in plugin.json
plugins/artifact/viewer/src/      viewer source: React, TypeScript, Vite, Tailwind, Vitest
plugins/artifact/viewer/index.html  the built viewer, committed
plugins/implement/{agents,hooks}  the only agents in the family, and its four hooks: coach, tracker reminder, sync check, sync flush
plugins/cobuilder-memory/hooks/   the mod's TypeScript hooks module, with its tests in tests/
docs/                             authored: architecture/{adr,designs,contexts,review,options}, plans/, pull-requests/
.cobuilder-architect/             derived bundles and binary assets, committed (self/ plus two test fixtures)
shared/tracker.py                 the one command for workflow state
shared/tracker_port/              the tracker port and its adapters: beads, files, fake
shared/tracker-usage.md           the reference for each tracker operation
shared/tracker-backfill.md        how to load old plan state into the tracker
shared/tracker-adapter-beads.md   the beads notes, the one prose file that names bd
.beads/                           the repo's own tracker, and its data syncs under refs/dolt/data
.cobuilder/tracker.yaml           picks the adapter (adapter: beads)
DDD-VOCABULARY.md                 the one glossary
tests/                            pytest suite for packaging, scripts, and gates
```

- A command is thin. It calls `Skill("<name>", args="<mode> $ARGUMENTS")`, and
  the `SKILL.md` holds the procedure.
- Judgment lives in `references/*.md`, which a skill loads on demand. Never
  hardcode judgment in a script or a skill body.
- Decisions live in `docs/architecture/adr/`. Read the ADR before you change
  what it decided. ADR-0016 covers the plugin split, and ADR-0017 covers
  `shared/`. ADR-0025 covers the install surface, and ADR-0039 amends it for
  the `cobuilder-memory` mod.
- The repo commits two fixtures: `.cobuilder-architect/cobuilder-harness-a103a550/`
  and `.cobuilder-architect/digital-curator-80f83abb/`. Do not delete them as
  stale cache.

## Principles

1. **Authored source in `docs/`, derived output in the bundle.**
   `.cobuilder-architect/` is not a document store. Never write
   `data/adrs.json` or `data/index.json` by hand. Run `shared/build_index.py`.
2. **Claude writes judgment, scripts move data.** Claude writes the narrative,
   the ADRs, the assessments, and the diagram sources. Scripts fetch diffs,
   compile, convert, and verify. A script never writes content.
3. **A step with no observable effect gets skipped.** Give each documented
   step an effect that a script, a gate, or a blind pass can check. Test the
   effect, the structure that code reads, or the reference that must resolve.
   Never test the wording of the prose. Gate 4b ran for zero of five epics
   until `verify_gate.py` enforced it.
4. **Plugins meet at the bundle.** A plugin names another plugin's mode, and
   that plugin resolves its own path. A plugin never names
   `plugins/<other>/...`. Shared code goes in `shared/`.
5. **Narrow install surface.** Only `implement` ships agents. `implement` ships
   four hook scripts: the coach, the tracker reminder, the sync check, and the
   sync flush. The `cobuilder-memory` mod ships its hooks module (ADR-0025,
   ADR-0039, ADR-0041, ADR-0042). No plugin ships an MCP server.
6. **Never overwrite authored content.** `extract_story.py` keeps authored
   narrative fields. A data migration declares the fields it touches. Its guard
   stops the run before any write that changes another authored field.
7. **Outside the bundle, only two actions.** `pr:generate` may push and open a
   PR, after an explicit confirmation. Nothing else on GitHub is in scope.
8. **Verify before you trust.** A slice is done when an independent validator
   scores it 0.90 or higher against a blind rubric. A self-report is not
   evidence.
9. **Architecture modes are self-only.** They analyze the session's own repo.
   The five Odyssey commands take `--repo`.
10. **Workflow state goes through `tracker.py` only.** Never edit `00-status.md`,
    the state lines of `04-slices.md`, or the epic state in `goal.json` by hand.
    The tool generates the first two, and bundle format 5 retired the third.
    Only the beads adapter (`shared/tracker_port/beads*.py` and `bd_runner.py`)
    and `shared/tracker-adapter-beads.md` name `bd`.

## Key capabilities

`README.md` describes each capability in full. One line each:

- **Install** (`/cobuilder-full-lifecycle:install`): sets up habit-hooks, the coach check, the glossary check, and the Hindsight allow rules. It also writes `.cobuilder/tracker.yaml`, runs `tracker.py prepare`, and offers the backfill.
- **Design** (`/architect:design`): writes the design record and a runtime diagram, and a stage-6 reviewer checks it (ADR-0036).
- **Options** (`/architect:options`): one HTML report of alternatives for the whole system. Options proposes, and design decides (ADR-0035).
- **Review, maintenance, decisions, describe, debug**: audit, ADR governance, bounded-context canvases, and root-cause diagnosis.
- **Implement** (`/implement:start`): four approval gates, then RED, GREEN, and VALIDATE for each slice, checked by `verify_gate.py`.
- **Memory** (`cobuilder-memory`, opt-in): the `consult` tool asks Hindsight. Recall records are evidence, and reflect answers are leads.
- **Odyssey** (`pr`): a four-level story for each merged PR. `generate` assesses a change before its PR opens.
- **Viewer** (`artifact`): one surface for designs, ADRs, builds, and PRs. `view_server.py` serves on fixed port 62583.
- **Publish** (`/artifact:publish`): one PR as a single HTML file under the 16 MiB Artifact cap.
- **Canvas** (`/artifact:canvas`): one design as a `.tldraw` file. Git ignores `*.tldraw`.
- **Bundle migration** (`shared/migrate_bundle.py`): runs first in every bundle mode, and refreshes the viewer, the layout, and the data shape.
- **Tracker** (`shared/tracker.py`): one command for workflow state. The four main skills call it, and the beads adapter stores the state (ADR-0040, ADR-0031).

## Commands

```
uv run pytest tests -q                         # Python suite, on uv's managed Python 3.11
claude plugin test plugins/cobuilder-memory    # the mod's hook tests
npx tsc -p plugins/cobuilder-memory --noEmit   # the mod's type check, with the root tools package
cd plugins/artifact/viewer && npm run build    # tsc --noEmit, then vite build, writes the committed index.html
cd plugins/artifact/viewer && npm run test     # Vitest
uv run shared/build_index.py                   # rebuild the record index after any docs/ change
uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/<slug>
uv run shared/verify_bundle.py --bundle-dir .cobuilder-architect/self
scripts/export-agent-skills.sh --target <dir>  # copy skills to a non-Claude harness
uv run shared/tracker.py doctor                # check the tracker adapter and the bd binary
uv run shared/tracker.py --help                # list every tracker operation
```

Plugin scripts are PEP 723, so `uv run <script>` resolves their dependencies.

The repo keeps its own state in its beads tracker: programs, epics, and slices.
Use `tracker.py` to move that state. Do not edit the state by hand. Version
1.3.0 or later of `bd` is a dependency of the tests. The beads contract tests
run the real `bd` in temporary folders.

## Rules that break easily

- **Test effects, structure, and references, not wording.** A test may run
  code, parse a format that code reads, or check that a name in one file
  exists in another. A test must not assert that prose holds a phrase, a
  heading, or an order of sentences. For prose that steers an agent, score a
  blind pass, and keep the transcript in the slice evidence.
- **Build the viewer, then commit it.** Edit `viewer/src/`, run
  `npm run build`, and commit the new `index.html`. `tests/test_viewer_build.py`
  fails when the build does not give the committed bytes.
- **Run `migrate_bundle.py` from the repo, not from the plugin cache.** The
  cache copy writes its own older viewer into `.cobuilder-architect/self/viewer/index.html`,
  and that reverts an uncommitted local build.
- **Change a count in every top-level document.** When a mode count or a plugin
  count changes, grep `README.md`, `CLAUDE.md`, `DDD-VOCABULARY.md`, and
  `plugins/` for the old number.
- **Do not root a server inside `viewer/`.** The viewer requests `../data/*`,
  so root the server at `.cobuilder-architect/`.
- **Bump the plugin version** in both `plugin.json` and `marketplace.json` when
  a change must reach installed copies. A test checks that the two match.
- **Write authored prose inside the prose budget.** Use the ste-writing skill
  on every field, then run `uv run shared/prose_budget.py check <file>`. A cap
  is soft and warns. A field over twice its cap is a ceiling breach, and
  `verify_bundle.py` fails the bundle on it (`prose.budget`). A first draft of
  the thirty-second voice script helps, but it is optional.
- **`goal.stage` must be one of `_bundle_meta.DESIGN_STAGES`.** `build_index.py`
  rejects another stage, and the Work board does not show it. `design` is an
  `assessment.json` stage, not a design stage.
- **`goal.json` list fields must be lists.** `build_index.py` stops when
  `done_when` or `abort_if` is not a list.
- **The PR number comes from opening the PR.** Content for a branch with no PR
  stays in `docs/pull-requests/branch-<slug>/`. Do not invent a branch key.
- **Add a migration, do not rebuild.** Bump `SCHEMA_VERSION` or
  `CURRENT_BUNDLE_FORMAT` in `shared/_bundle_meta.py`, and add a step to the
  matching ladder. Never call `extract_story.py` from a migration.
- **Name each new Hindsight tool in the setup skill.** When a plugin calls a
  new `mcp__hindsight__` tool, add its allow rule to the `cobuilder-setup`
  skill. `tests/test_install_command.py` reads the names from `hindsight.ts`
  and `slice-loop.md`, and it fails until you do.
- **Install habit-hooks with every extra at once.** A second `uv tool install`
  with other extras replaces the first. This repo needs `python` and
  `typescript`.
- **Drive the hooks in a mod test.** In `claude plugin test`, the `$` of the
  test body makes no engine calls. Call a hook through the event it handles,
  such as a command or a tool call. Stub each engine call that it makes.
- **Slice evidence stays local.** Git ignores `.cobuilder/rubrics/*/evidence/`.
  The rubrics and `manifest.yaml` are committed.
- **Document each new `tracker.py` operation.** Add an entry for it in
  `shared/tracker-usage.md`. `tests/test_tracker_usage_doc.py` fails until you do.
- **Keep `bd` inside the beads adapter.** A new `bd` call outside
  `shared/tracker_port/beads*.py` and `bd_runner.py` fails
  `tests/test_tracker_docs.py`.
- **Score prose that steers an agent with a blind pass.** This covers each
  skill, reference, and command that calls the tracker. Keep the transcript.
- **Keep new code inside the habit-smell limits.** A file has about 200 lines
  or fewer. A function has about 50 lines or fewer, a complexity of 10 or less,
  and 5 parameters or fewer. Check with `uv run shared/habit_smells.py`.
- **Subagents may not run `git stash`.** `.claude/hooks/deny-git-stash.py`
  denies it. The hook is local tooling, and it ships to nobody.
- **Keep sync code in the beads adapter and the worker.** Only the beads
  adapter and `shared/tracker_port/sync_worker.py` may run a sync. A hook
  script never calls `bd`. The sync files sit in `.cobuilder/` as `sync-dirty`,
  `sync-lock`, `sync-status.json`, and `sync-worker.log`, and the install
  default is `sync: async` for beads. Tests that use a real `bd` are slow, so
  run one background run at a time.

## Known gaps

- `collect_pull_requests()` reads only `story.json`, so the record index has no
  open PR. `inflight-record-store` is the planned fix. Do not patch it in
  passing.
- `watch_feedback.py` sits in `cobuilder-full-lifecycle`, but the program design
  put it in `artifact`. Do not move it without a decision.

## Vocabulary

`DDD-VOCABULARY.md` at the repo root is the one glossary. The two skill families
use some of the same short words for different things. Use the exact name that
the glossary gives a concept, in code, districts, files, classes, methods,
and prose.
Design mode reads and writes the glossary, and the `implement:vocabulary` agent
checks each slice against it. When a new term collides with a term of the other
family, resolve the collision in the glossary before it ships.

`.cobuilder-architect/self/pages/cobuilder-vocabulary.html` is a session
gazetteer from 2026-08-20. Several of its proposals shipped differently. Treat
it as a record, not a specification, and do not edit it.
