# CoBuilder

CoBuilder is a family of Claude Code plugins that keeps engineers in charge of what their coding agents do. People design, review, and approve each change to the code. Agents work with them at every stage.

Everything runs in your own Claude Code session, against your own checkout. Your repo stays on your machine.

| Area | Command | What you get |
|---|---|---|
| Architecture | `/architect:design` | A design record: intent, challenge, draft PR, runtime diagram |
| Implementation | `/implement:start` | Four approval gates, then one tested slice at a time |
| Review | `/pr:generate` | An author interview, an assessment, and the pull request |
| Review | `/pr:review` | A four-level story of each merged PR, with art and voice |
| Review | `/artifact:view` | One viewer for designs, decisions, builds, and PRs |
| Maintenance | `/architect:review` | A scored audit of security, architecture, and quality |
| Maintenance | `/architect:maintenance` | The trend since the last audit, and a backlog |
| Maintenance | `/architect:options` | One HTML report of questions and alternatives for the whole system |
| Maintenance | `/architect:debug` | The root cause of a failure, and a recommended fix |
| Architecture | `/artifact:canvas` | One design as a tldraw canvas with its two diagrams |

---

## Quick start

1. Add the marketplace.

   ```
   /plugin marketplace add bjornslib/cobuilder-plugin
   ```

2. Install every plugin at once.

   ```
   /plugin install cobuilder-full-lifecycle@cobuilder-plugin
   ```

3. Restart the session, or enable the plugins from `/plugin`.
4. Open the repo you want to work on, and run a command from the table above.

To start with one job, install one plugin. For example, `/plugin install architect@cobuilder-plugin` gives you the design and review modes.

### Which plugin do I need?

| Plugin | Install it to | Commands |
|---|---|---|
| `architect` | Design changes, audit the repo, and diagnose failures | `/architect:design`, `review`, `maintenance`, `options`, `debug` |
| `implement` | Build a design one slice at a time | `/implement:start`, `debug`, `install` |
| `pr` | Open a pull request with intent before the merge, and narrate it after | `/pr:generate`, `review`, `baseline` |
| `artifact` | Read the results in the viewer, publish a PR as a Claude Artifact, or draw a design as a tldraw canvas | `/artifact:view`, `publish`, `canvas` |
| `cobuilder-full-lifecycle` | Get all four, plus a routing guide | none of its own |

`architect` and `pr` need `artifact`, so installing either one also installs `artifact`. `implement` needs `architect`, because `/implement:debug` hands off to it.

### Prerequisites

| Need | For | Notes |
|---|---|---|
| A git checkout | Every command | All analysis runs locally |
| `uv` and Python 3.10 or later | Every script | Scripts declare their own packages. No venv needed |
| `GEMINI_API_KEY` | `pr` narration: voice always, scene art unless `--art diagram` | Set it in your shell or in your own repo's `.env`. The tool never reads the target repo's `.env` |
| `habit-hooks` | `/implement:start` | Run `/implement:install` once. It asks before it installs |
| The `Artifact` tool | `/artifact:publish` | Needs a `/login` session on a paid plan |
| The `tldraw-offline` skill and the tldraw Desktop app | `/artifact:canvas` | Install the skill yourself. The command stops with a message if either is missing. The diagram images also need `npx` and Google Chrome |

The `architect`, `implement`, and `artifact view` commands need no API key. The prerequisite check runs first on every `pr` command, so a missing key stops the run before it spends anything.

---

## The CoBuilder method, by area

### Architecture: `/architect:design`

Run it before you write code. The mode reads your repo, interviews you, explores alternatives, and challenges the approach. It cites evidence for each challenge.

The result is a design directory at `docs/architecture/designs/<name>/`:

- `goal.json`, `intent.json`, `narrative.json`, and `assessment.json`
- `pr-draft.md`, the pull request you plan to open
- a runtime architecture diagram in SVG
- an optional `contracts.md` for a public interface

Before it challenges your approach, design mode checks the boundary records of the code the change touches. It describes any context whose record is missing or out of date. The reviewer round fails a design that cites an unchecked boundary.

A reviewer subagent checks the draft against a blind rubric before you read it. If `DDD-VOCABULARY.md` does not exist, design mode helps you create it.


### Implementation: `/implement:start`

Run `/implement:install` once. Then run `/implement:start` on a design.

Four gates come before any code. You approve each one.

1. Product.
2. Architecture, plus interaction design when the change has a screen.
3. Program design.
4. Slice plan, epic designs, and blind acceptance rubrics.

Each slice then runs a red, green, and validate loop. The `red` agent writes failing tests. The `green` agent writes the minimum code. The `validate` agent scores the result against a rubric that `green` never saw. A slice is done at a score of 0.90 or higher. A `vocabulary` agent also checks each slice against the glossary, and its notes never change the score.

Check a plan at any time:

```
uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/<slug>
```


### Review: `/pr:generate`, `/pr:review`, and the viewer

Review has two moments. `generate` runs before the pull request opens. `review` runs after the merge. Each is useful alone, and they work best together.

#### Before the merge: `/pr:generate`

Run it on a branch with no pull request. It reads the diff, the district map, and the recorded decisions. It then asks only what that evidence cannot answer, usually four to six questions.

The assessment asks four things a diff cannot show:

1. Is the change sensible?
2. Does it help or hurt maintainability?
3. Is it a new pattern, a duplicate, or a reinvention? A duplicate verdict cites the decision or district it duplicates.
4. Will the team regret it?

The verdict is `sound`, `concerns`, or `rework`. It never blocks a merge. The command also records whether the change is `human`, `agent-assisted`, or `agent-generated`, and which parts the author cannot explain.

Opening the pull request is the only GitHub action. The command shows you the description and asks first.

```
/pr:generate --no-create          # write the files, open nothing
/pr:generate --draft              # open a draft
/pr:generate --base develop       # choose the base branch
/pr:generate --prs 73             # assess an open PR
/pr:generate --prs 73 --stage post  # after the merge, compare what shipped to what you said
```

#### After the merge: `/pr:review`

Run it on merged PRs. Each PR becomes a story of four levels: Intent, Problem and Solution, Architecture, and File Changes. The story includes voice narration and architecture decisions that the command extracts in retrospect.

```
/pr:review --prs 73,75
/pr:review --latest
/pr:review --prs 12..18
```

If no baseline exists, the command runs `/pr:baseline` first. A killed run resumes where it stopped, and `--force` regenerates.

Levels 1 to 3 carry a visual. `--art` picks its form:

| Value | Result |
|---|---|
| `both` (default) | Scene art and a Mermaid diagram. The viewer shows the art and lets you toggle to the diagram |
| `diagram` | Mermaid only. No image cost |
| `image` | Scene art only |

If the author ran `/pr:generate` first, `/pr:review` reads the stated intent and rejected options, and it marks the extracted decision `provenance: authored`.

`/pr:baseline` maps the repo into districts and records an inventory. Run it again to refresh. For your own repo, it also writes a verified boundary record for each district. A repo you read with `--repo` gets the lighter map only. Both commands accept `--repo <path>` to target another local checkout. See [Multiple repos](#multiple-repos).

#### Read, share, and draw: `/artifact:view`, `/artifact:publish`, and `/artifact:canvas`

`/artifact:view` serves your bundles on `http://127.0.0.1:62583` and prints the URL. The port is fixed, so a saved review link works after a restart. `--list` shows the bundles, and `--stop` stops the server.

The viewer shows each design, decision, build, and PR on one surface. A Work drawer lists every design by state, with search. A comment ledger anchors review notes to the page. Each level opens with an In Short strip, the level's one-paragraph summary, with a Listen control when audio exists. A link in each section heading, "Read in PR 12 ›", moves between a work item and its PR on the section of the same name.

`/artifact:publish --prs 73` flattens one PR into a single HTML file under the 16 MiB Artifact limit. The command lowers compression, and drops audio if it must. It also publishes an index page that links every PR you published. An unchanged PR reports "already up to date". Use `--force` to publish anyway.

`/artifact:canvas --design <name>` draws one design as a tldraw canvas. It writes `<name>.tldraw` into the design folder. The canvas has five zones: Why (with a before/after picture), Landscape, Flow, Structure, and Contract. The rendered level-2 and level-3 diagrams sit beside them. A language review then shortens the card text. Use `--redraw` to replace an existing canvas, `--no-images` to skip the diagrams, and `--no-review` to skip the language review. Git ignores `.tldraw` files, so a canvas stays on your machine.

---

### Maintenance: `/architect:review`, `maintenance`, `options`, and `debug`

A system drifts after it ships. These four commands keep it honest. All four work on the repo you are in and refuse a `--repo` target.

#### Scan: `/architect:review`

Run it to audit the repo for security, architecture, code quality, scaling, maintainability, dependency health, and testing. It writes two linked HTML reports to `docs/architecture/review/`. The technical report lists findings as P0, P1, or P2, with file evidence and a remediation prompt for each. The founder report puts business impact first. Each report carries a 0-100 health score and a letter grade.

#### Track: `/architect:maintenance`

Run it on a schedule. It repeats the audit and compares the result with the last report. Each finding is `NEW`, `ESCALATED`, `STABLE`, or `RESOLVED`. It also keeps an incremental backlog. With no earlier report, the run sets the baseline.

#### Improve: `/architect:options`

Run it when you ask whether the whole system is still shaped right. It writes one self-contained HTML report to `docs/architecture/options/<name>/`. The report holds three diagrams, a list of inquiries, the alternatives for each, and a confidence tag on every claim.

The mode proposes and never decides. Paste the decisions text into `/architect:design`, which records the choice.

#### Diagnose: `/architect:debug`

Run it when a test, a build, or a feature fails and the cause is unclear. It reproduces the failure first. It then lists competing hypotheses and ranks them by the cheapest test that tells them apart. You get a root cause and a recommended fix. The mode never applies the fix. `/implement:debug` runs the same mode from inside a build.

---

## Where output goes

| Location | Holds | Written by |
|---|---|---|
| `docs/architecture/{adr,designs,contexts,review,options}/` | Authored records | Architect modes |
| `docs/plans/<slug>/` | Gates, slice plan, status, rubrics | `implement` |
| `docs/pull-requests/` | PR descriptions and assessments | `pr:generate` |
| `.cobuilder-architect/self/` | The bundle: derived data, art, audio, viewer copy | `pr` and `artifact` |
| `DDD-VOCABULARY.md` | The one glossary | Design mode |

The bundle holds `story.json`, the record index `data/index.json`, diagrams, scene art, audio, and a copy of the viewer. Commit it. A share link is then the raw GitHub URL.

Authored files live in `docs/`. The bundle holds only derived data. The scripts rebuild the bundle's index from `docs/` with `uv run shared/build_index.py`.

### Multiple repos

With no `--repo`, the bundle lands in `<repo>/.cobuilder-architect/self/`. With `--repo <path>`, the tool writes nothing into that repo. It caches the bundle in your current repo at `.cobuilder-architect/<repo-slug>/`.

Use `--store local` to write into the target repo. Use `--store central` to force the cache.

### Upgrading a bundle

A newer plugin upgrades an older bundle on first use. You do nothing. The upgrade refreshes the viewer, steps the folder layout, and steps the data shape. It never rewrites your authored text. If a step would change an authored field, it writes nothing and names the field. It also backs up `story.json` to `.migration-backup/`, which you should add to `.gitignore`.

Preview an upgrade:

```
uv run plugins/pr/shared/migrate_bundle.py --bundle-dir .cobuilder-architect/self --dry-run
```

An upgrade goes one way. An older plugin reports `unknown-schema-version` for a newer bundle, so update the plugin on every machine that reads it.

---

## Cost

Design, review, build, and the narrative text run on your Claude Code subscription. Voice narration and scene art run on your `GEMINI_API_KEY`. A typical PR makes three voice clips, and three images unless you pass `--art diagram`. The cost runs from a few cents to a few dollars, depending on your Gemini tier.

---

## Work on CoBuilder itself

```
uv run pytest tests -q                         # Python suite
cd plugins/artifact/viewer && npm run build    # compile the viewer into index.html
cd plugins/artifact/viewer && npm run test     # viewer tests
```

The viewer source lives in `plugins/artifact/viewer/src/`. It uses React, TypeScript, Vite, and Tailwind. The build writes the committed `plugins/artifact/viewer/index.html`, and a test fails if a build does not reproduce those bytes.

`CLAUDE.md` holds the repo layout and the rules for a coding agent. `DDD-VOCABULARY.md` defines every term. `docs/architecture/adr/` holds the decisions. Start with ADR-0016, ADR-0017, and ADR-0025.

### Plugin layout

```
.claude-plugin/marketplace.json    the one marketplace manifest
shared/                            code shared by every plugin, vendored as plugins/<name>/shared
plugins/
  architect/                       design, review, maintenance, options, debug, and the corpus
  pr/                              generate, review, baseline, and the story scripts
  artifact/                        view, publish, and the viewer
  implement/                       start, debug, install, and the slice agents and hook
  cobuilder-full-lifecycle/        the umbrella plugin
```

Only `implement` ships agents and a hook (ADR-0025). No plugin ships an MCP server. The commands in each plugin are thin. The skills hold the procedures.

### Use the skills in another harness

`scripts/export-agent-skills.sh` copies the plugins' skills into another tool's skill folder. It stamps each copy with its source version and commit, so you can see a stale copy. It refuses to overwrite a file that lacks the stamp.

```
scripts/export-agent-skills.sh --target /path/to/other-repo/.agents/skills --plugin architect
```

---

## Credits

**habit-hooks.** MIT license, copyright Ivett Ördög and contributors. https://github.com/habit-hooks/habit-hooks. The `PostToolUse` hook in `plugins/implement/hooks/hooks.json` calls its command-line tool after each file the `green` agent writes. We vendor none of its code. Its study, https://github.com/LiinaSuoniemi/prompt-vs-metric-eval by Liina Suoniemi, is the evidence for coaching an agent instead of showing it a bare metric.

**Matt Pocock's skills.** MIT license, copyright Matt Pocock. https://github.com/mattpocock/skills. We borrowed two ideas and no code. The glossary entry format of `domain-modeling` shaped `DDD-VOCABULARY.md`. The separate review axis of `code-review` shaped the `vocabulary` agent.

See `plugins/implement/NOTICE.md` for the full notice.
