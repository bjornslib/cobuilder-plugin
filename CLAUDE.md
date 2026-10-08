# CLAUDE.md

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

# CODING AND THINKING GUIDELINES

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

# THIS REPOSITORY

## What this repo is

A Claude Code marketplace (`.claude-plugin/marketplace.json`) that ships five sibling plugins under `plugins/`. It is not an app. There is no deploy step and no CI.

| Plugin | Job |
|---|---|
| `architect` | Seven self-only modes: design, review, maintenance, decisions, describe, debug, options |
| `pr` | Odyssey: narrate merged PRs (`baseline`, `review`) and interview an author before a PR opens (`generate`) |
| `artifact` | Serve a bundle locally (`view`), publish a level as a Claude Artifact (`publish`), and draw a design as a tldraw canvas (`canvas`). Holds the viewer |
| `implement` | Build a design one vertical slice at a time (`start`, `debug`, `install`) |
| `cobuilder-full-lifecycle` | Umbrella. Depends on the other four |

The lifecycle has six steps. `options` explores the whole system. `design` decides one change. `implement` builds it. `pr:generate` assesses it and opens the PR. `pr:review` narrates it after the merge. `artifact` shows the result, and draws a design as a canvas.

## Layout

```
.claude-plugin/marketplace.json   the one marketplace manifest
shared/                           vendored into each plugin as plugins/<name>/shared (symlink)
plugins/<name>/{commands,skills,scripts}   auto-discovered, never declared in plugin.json
plugins/artifact/viewer/src/      viewer source: React, TypeScript, Vite, Tailwind, Vitest
plugins/artifact/viewer/index.html  the built viewer, committed
plugins/implement/{agents,hooks}  the only agents and hook in the family
docs/                             authored, git-visible: architecture/{adr,designs,contexts,review,options}, plans/, pull-requests/
.cobuilder-architect/             derived bundles and binary assets, committed (self/ plus two test fixtures)
DDD-VOCABULARY.md                 the one glossary
tests/                            pytest suite for packaging, scripts, and gates
```

- Commands are thin: each calls `Skill("<name>", args="<mode> $ARGUMENTS")`. The `SKILL.md` files hold the procedure.
- Judgment lives in `references/*.md`, loaded on demand. Never hardcode it in a script or a skill body.
- Decisions are in `docs/architecture/adr/`. Read the ADR before you change what it decided. ADR-0016 and ADR-0017 cover the plugin split and `shared/`. ADR-0025 covers the install surface.
- `.cobuilder-architect/cobuilder-harness-a103a550/` and `.cobuilder-architect/digital-curator-80f83abb/` are fixtures that the repo commits. Do not delete them as stale cache.

## Principles

1. **Authored source in `docs/`, derived output in the bundle.** `.cobuilder-architect/` is not a document store. Never write `data/adrs.json` or `data/index.json` by hand. Run `shared/build_index.py`.
2. **Claude writes judgment, scripts move data.** Narrative, ADRs, assessments, and diagram sources are Claude's work. Scripts fetch diffs, compile, convert, and verify. A script never authors content.
3. **A step with no mechanical consumer gets skipped.** Give every documented step a script, a test, or a gate that reads it. Gate 4b ran for zero of five epics until `verify_gate.py` enforced it.
4. **Plugins meet at the bundle.** A plugin names another plugin's mode and lets that plugin resolve its own path. It never names `plugins/<other>/...`. Shared code goes in `shared/`.
5. **Narrow install surface.** Only `implement` ships agents and a hook (ADR-0025). No plugin ships an MCP server.
6. **Never overwrite authored content.** `extract_story.py` keeps authored narrative fields. A data migration declares the fields it touches. The guard stops the run before any write if it changes another authored field.
7. **Outside the bundle, only two actions.** `pr:generate` may push and open a PR, after an explicit confirmation. Nothing else on GitHub is in scope.
8. **Verify before you trust.** An independent validator must score a slice 0.90 or higher against a blind rubric. Then the slice is done. A self-report is not evidence.
9. **Architecture modes are self-only.** They analyze the session's own repo. The five Odyssey commands take `--repo`.

## Key capabilities

- **Design** (`/architect:design`): interview, explore, challenge, then draft `goal.json`, `intent.json`, `narrative.json`, `assessment.json`, `pr-draft.md`, a runtime architecture diagram (inline SVG, checked by `check_design_svg.py`), and an optional `contracts.md`. A stage-6 reviewer checks the draft (ADR-0036).
- **Options** (`/architect:options`): one self-contained HTML report of inquiries and alternatives for the whole system. It proposes. Design decides (ADR-0035).
- **Review, maintenance, decisions, describe, debug**: scored audit against the corpus, ADR governance, bounded-context canvases, root-cause diagnosis.
- **Implement** (`/implement:start`): four approval gates (product, architecture, program design, slice plan with epic designs and blind rubrics), then a RED, GREEN, VALIDATE loop per slice. `verify_gate.py` checks the gates. A `PostToolUse` hook coaches GREEN through habit-hooks. `implement:vocabulary` checks each slice against the glossary.
- **Odyssey** (`pr`): a four-level story per merged PR with scene art, Mermaid diagrams, voice narration, and retro-extracted ADRs. `generate` interviews first and assesses the change before the PR opens.
- **Viewer** (`artifact`): one surface for designs, ADRs, builds, and PRs, that `data/index.json` joins. The Work board is a drawer over the shell (ADR-0034). `view_server.py` serves on fixed port 62583. Review links and an anchored-comments ledger are built in (ADR-0019, ADR-0032). A work item and a PR page the same way: a rail row is a paged level, and a section is one panel (ADR-0028). Each level opens with an In Short strip that holds its `narration`. The rail lists the three levels once, then an Also group. One text link in each section heading, "Read in PR 12 ›", moves to the other account on the section of the same name (ADR-0037). The viewer states no record gap. `build_index.py` warns about a design that lacks a problem, decision, or risk beat.
- **Publish** (`/artifact:publish`): flatten one PR into a single HTML file under the 16 MiB Artifact cap.
- **Canvas** (`/artifact:canvas`): draw one design folder as a `.tldraw` file with five zones (Why, Landscape, Flow, Structure, Contract) and the rendered level-2 and level-3 diagrams. `canvas_preflight.py` stops the mode when `goal.json`, the `tldraw-offline` skill, or the running tldraw Desktop app is missing. No plugin ships the skill. A missing `npx` or Chrome only turns off the diagram images.
- **Bundle migration** (`shared/migrate_bundle.py`): runs first in every bundle-touching mode. It refreshes the viewer unconditionally, steps the layout (`bundle_format`), then steps the data shape (`schema_version`).

## Commands

```
uv run pytest tests -q                         # Python suite, on uv's managed Python 3.11
cd plugins/artifact/viewer && npm run build    # tsc --noEmit, then vite build, writes the committed index.html
cd plugins/artifact/viewer && npm run test     # Vitest
uv run shared/build_index.py                   # rebuild the record index after any docs/ change
uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/<slug>
uv run shared/verify_bundle.py --bundle-dir .cobuilder-architect/self
scripts/export-agent-skills.sh --target <dir>  # copy skills to a non-Claude harness
```

Plugin scripts are PEP 723. `uv run <script>` resolves their own dependencies.

## Rules that break easily

- **Build the viewer, then commit it.** Edit `viewer/src/`, run `npm run build`, and commit the new `index.html`. `tests/test_viewer_build.py` fails if the build does not reproduce the committed bytes.
- **Run `migrate_bundle.py` from the repo, not from the installed plugin cache.** The cache copy refreshes `.cobuilder-architect/self/viewer/index.html` with its own older viewer. That reverts an uncommitted local build.
- **Count a mode number in every top-level document.** When a mode count changes, grep `README.md`, `CLAUDE.md`, `DDD-VOCABULARY.md`, and `plugins/` for the old number.
- **Do not root a server inside `viewer/`.** The viewer requests `../data/*`. Root at `.cobuilder-architect/`.
- **Bump the plugin version** in both `plugin.json` and `marketplace.json` for a change that must reach installed copies. A test checks that the two match.
- **`goal.stage` must be one of `_bundle_meta.DESIGN_STAGES`.** The Work board shows no design with another stage, and `build_index.py` rejects it. `design` is an `assessment.json` stage, not a design stage.
- **`goal.json` list fields must be lists.** `build_index.py` hard-fails when `done_when` or `abort_if` is not a list.
- **The PR number comes from opening the PR.** Content for a branch with no PR stays in `docs/pull-requests/branch-<slug>/`. Do not invent a branch key.
- **Add a migration, do not rebuild.** Bump `SCHEMA_VERSION` or `CURRENT_BUNDLE_FORMAT` in `shared/_bundle_meta.py` and append to the matching ladder. Never call `extract_story.py` from a migration.
- **Subagents may not run `git stash`.** `.claude/hooks/deny-git-stash.py` denies it. The hook is local tooling and ships to nobody.

## Known gaps

- `collect_pull_requests()` reads only `story.json`, so an open PR is not in the record index. `inflight-record-store` is the planned fix. Do not patch it in passing.
- `watch_feedback.py` sits in `cobuilder-full-lifecycle`, while the program design placed it in `artifact`. Do not move it without a decision.

## Vocabulary

The same short words name different things in this plugin's two skill
families. `DDD-VOCABULARY.md` at the repository root is the one glossary
for every such term. Use the exact name it assigns to a concept, not a
synonym, before reusing a word from one family in the other's context.
Code, districts, files, classes, methods, and prose all use its names.
Design mode reads and writes it, and the `implement:vocabulary` agent
checks each slice against it.

If a future term collides with one already in `DDD-VOCABULARY.md` across
the two skill families, resolve the collision there before it ships — do
not let two modes silently mean different things by the same word.

### A superseded gazetteer

`.cobuilder-architect/self/pages/cobuilder-vocabulary.html` is a historical
session gazetteer from 2026-08-20. Several of its proposals shipped
differently. Treat it as a record, not a specification. `DDD-VOCABULARY.md`
is the current source of truth. Do not edit the gazetteer.

## Writing standard

Prose and documentation in this repo follows plain-English rules distilled from ASD-STE100
Issue 9 Simplified Technical English (STE). It applies to every content
type produced here: `README.md`, this file, `plugins/pr/skills/odyssey/references/*.md`,
commit and PR bodies, code comments, error messages, ADRs, and the story
the plugin writes into `story.json`. `Skill("architect:ste-writing")`
holds the full rule set and its two modes (`strict` for procedures and
safety text, `flavored` for general prose). If that call gives `Unknown
skill`, read `${CLAUDE_PLUGIN_ROOT}/shared/skills/ste-writing/SKILL.md` directly
and obey that file instead. The condensed version below is what to hold in
mind without invoking it.

You must also use it in all of your responses interacting with the user.

**Words.** One name for one thing — do not call the same item by two
names. Pick the short common word: start, not begin or commence; use, not
utilize or leverage; help, not facilitate; show, not demonstrate; about,
not regarding. One meaning per word. Drop marketing adjectives — seamless,
robust, powerful, cutting-edge, effortless, world-class, next-generation,
revolutionary. Cap a noun cluster at three words; split a longer one with
"of" or a hyphen. Put an article (a, an, the) before every countable
singular noun.

**Verbs.** Active voice: "the script reads the file", not "the file is
read by the script". A verb for an action, not a noun for it: "verify the
bundle", not "perform verification of the bundle". Simple tenses: "the
migration found a stale field", not "the migration has found a stale
field".

**Sentences and structure.** One instruction per sentence, capped at
20-25 words. No contractions. No semicolons — write two sentences instead.
One topic per paragraph, six sentences or fewer. State a condition before
its command.

**Marketing and copy — reduced strictness, not exempt.** The `kleppmann`
narrative register, `story.json`'s default (`plugins/pr/skills/odyssey/references/story-mode.md`
§3), and README's own pitch language both need room for a voice that
controlled language strips out. They follow a lighter pass of the rules
above instead of the full set: active voice, plain verbs, no marketing
adjectives, one topic per paragraph. They are not held to the
sentence-length cap, the noun-cluster limit, or STE's restricted word
list. A passive sentence with a known actor, or a claim the diff does not
support, is still a defect there. The `--style ste` register
(`story-mode.md` §3) already opts a PR's narrative into the full,
unrelaxed rules, and this section changes nothing about that choice.

### Response structure

Label every part of a response to the reader, so the reader knows at a glance
which parts need them and which do not. Use these four labels, in this order, and
use only the ones that hold content. An empty label is worse than no label,
because it teaches the reader to skip it.

**FYI** — a fact the reader needs and does not need to act on. A finding, a
constraint, or a thing the code does that surprised you. FYI holds no question. A
fact that needs an answer belongs under Decisions and questions.

**Summary** — what happened. State what changed, what was verified, and the
evidence for each. Name the count, the reading, or the command. State a failure, a
skipped step, and a gap. No claim of success stands without its evidence.

**Next steps** — what you will do next without the reader. Name the work and the
actor. A step that waits on the reader is not a next step. It is a decision.

**Decisions and questions** — what needs the reader. Put each one on its own line.
Give the options and your recommendation, so a one-word answer settles it. State
what happens when the reader answers nothing.

A short response may carry one label or two. The rule is the label, not the length.
Do not pad a response to reach four labels. The reader must be able to stop after
FYI when nothing needs them.

Group the labels logically, and keep one topic to a paragraph. Use a bullet, a
numbered list, or a table where it carries the meaning better than a sentence.

**Run the skill on the draft.** Invoke `Skill("architect:ste-writing")` on the
response before you send it, and correct what it flags. If the call answers
`Unknown skill`, read `${CLAUDE_PLUGIN_ROOT}/shared/skills/ste-writing/SKILL.md`
and obey that file. This section's own rules above are what to hold in mind
without invoking it.

Judge a draft by rereading it against the rules above. `ste-writing` also
ships `shared/skills/ste-writing/ste-lint.py`, a rules-only linter that scores
violations per 100 words, for a quick optional check. The linter checks
rules only. It does not certify ASD-STE100 dictionary compliance.
