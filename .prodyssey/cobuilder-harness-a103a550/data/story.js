window.STORY = {
  "meta": {
    "repo": "cobuilder-harness",
    "generated": "2026-07-21",
    "schema_version": "1.1",
    "title": "cobuilder-harness — Codebase Odyssey",
    "description": "CoBuilder: a pipeline execution engine that turns product requirements into working software through autonomous multi-agent workflows. The runner has zero LLM intelligence — it reads a DOT graph, dispatches project-owned agents, and transitions node states mechanically.",
    "levels": [
      "PR Landscape",
      "Problem & Solution",
      "Architecture",
      "File Changes"
    ]
  },
  "world": {
    "districts": [
      {
        "id": ".agents",
        "label": "Agent Skill Library",
        "kind": "knowledge",
        "files": 228,
        "blurb": "Project-owned agent definitions (SKILL.md + references/examples per skill) that the pipeline runner dispatches — the 'smarts' the zero-intelligence runner has none of.",
        "root_paths": [
          ".agents"
        ]
      },
      {
        "id": ".beads",
        "label": "Beads Issue Tracker",
        "kind": "governance",
        "files": 14,
        "blurb": "In-repo AI-native issue tracking (steveyegge/beads): config.yaml plus lifecycle/TDD/validated workflow formulas kept next to the code.",
        "root_paths": [
          ".beads"
        ]
      },
      {
        "id": ".claude",
        "label": "Claude Code Harness",
        "kind": "tooling",
        "files": 767,
        "blurb": "The Claude Code configuration surface — 592 skill files, plus hooks, sub-agents, scripts and its own hook test suite.",
        "root_paths": [
          ".claude"
        ]
      },
      {
        "id": ".cobuilder",
        "label": "Pipeline Templates & Examples",
        "kind": "core",
        "files": 42,
        "blurb": "Runtime configuration for the pipeline engine: 30 manifest/prompt templates, 9 example DOT graphs, and tool-sets.yaml declaring per-role tool grants.",
        "root_paths": [
          ".cobuilder"
        ]
      },
      {
        "id": ".github",
        "label": "CI & Repo Policy",
        "kind": "governance",
        "files": 4,
        "blurb": "GitHub-side policy only: CI workflow, CODEOWNERS, dependabot, and the PR template.",
        "root_paths": [
          ".github"
        ]
      },
      {
        "id": ".pi",
        "label": "Pi Editor Extensions",
        "kind": "tooling",
        "files": 8,
        "blurb": "TypeScript/JS extensions for the Pi editor — pipeline launcher, event parser and overlay — that surface pipeline runs inside the IDE.",
        "root_paths": [
          ".pi"
        ]
      },
      {
        "id": ".pipelines",
        "label": "Spike Pipeline Evidence",
        "kind": "knowledge",
        "files": 4,
        "blurb": "Archived evidence for the GASCITY-INT-001 spike: its DOT graph alongside the research notes the pipeline's agents produced.",
        "root_paths": [
          ".pipelines"
        ]
      },
      {
        "id": ".repomap",
        "label": "Repomap Config",
        "kind": "tooling",
        "files": 6,
        "blurb": "Configuration and per-project manifests driving the repomap codebase-intelligence subsystem; baselines/ is a tracked-empty output directory.",
        "root_paths": [
          ".repomap"
        ]
      },
      {
        "id": ".taskmaster",
        "label": "Product Requirements",
        "kind": "product",
        "files": 32,
        "blurb": "PRD documents (PRD-CLEANUP-001, PRD-EXECBDD-001, PRD-HARNESS-RELIABILITY-001, …) plus taskmaster config — the intake side of the pipeline.",
        "root_paths": [
          ".taskmaster"
        ]
      },
      {
        "id": "acceptance-tests",
        "label": "Blind Acceptance Tests",
        "kind": "quality",
        "files": 16,
        "blurb": "Gherkin .feature files and manifests written before implementation and deliberately withheld from builder agents, for the Guardian to verify against.",
        "root_paths": [
          "acceptance-tests"
        ]
      },
      {
        "id": "cobuilder",
        "label": "CoBuilder Engine",
        "kind": "core",
        "files": 360,
        "blurb": "The Python package itself: execution_engine (runner, handlers, adapters, events, middleware), repomap, pipeline_definition, and the CLI entrypoints.",
        "root_paths": [
          "cobuilder"
        ]
      },
      {
        "id": "cobuilder-frontend",
        "label": "Pipeline Web UI",
        "kind": "product",
        "files": 37,
        "blurb": "Next.js app-router frontend with API routes for pipeline listing, DOT rendering, live state and SSE event streaming.",
        "root_paths": [
          "cobuilder-frontend"
        ]
      },
      {
        "id": "docs",
        "label": "Documentation Corpus",
        "kind": "knowledge",
        "files": 276,
        "blurb": "The written record: solution designs, SDS/PRD documents, prototypes, research notes and design references accumulated across the project.",
        "root_paths": [
          "docs"
        ]
      },
      {
        "id": "examples",
        "label": "Spikes & Worked Examples",
        "kind": "knowledge",
        "files": 18,
        "blurb": "Runnable spike code and findings — the activegraph_shared_state experiment plus a checkpointed hello-tdd pipeline run with its signal files.",
        "root_paths": [
          "examples"
        ]
      },
      {
        "id": "reports",
        "label": "Architecture Review Reports",
        "kind": "governance",
        "files": 4,
        "blurb": "Generated architecture-review deliverables (founder and technical cuts, HTML + PDF) from the 2026-06-12 review.",
        "root_paths": [
          "reports"
        ]
      },
      {
        "id": "stagehand-crawl-cli",
        "label": "Stagehand Crawler",
        "kind": "tooling",
        "files": 17,
        "blurb": "A standalone Node/ESM browser-crawling CLI (Stagehand-based) with cookie capture — independent of the Python engine.",
        "root_paths": [
          "stagehand-crawl-cli"
        ]
      },
      {
        "id": "state",
        "label": "Run State & Audits",
        "kind": "governance",
        "files": 12,
        "blurb": "Per-PRD progress, routing and plan JSON plus audit findings/scores — the bookkeeping trail of what the pipeline has executed.",
        "root_paths": [
          "state"
        ]
      },
      {
        "id": "tests",
        "label": "Test Suite",
        "kind": "quality",
        "files": 358,
        "blurb": "Pytest suites mirroring the engine: unit, execution_engine, hooks, attractor, functional, e2e and regression tiers.",
        "root_paths": [
          "tests"
        ]
      },
      {
        "id": "tools",
        "label": "Operator Tooling",
        "kind": "tooling",
        "files": 14,
        "blurb": "Go-based operator tools — a pipeline-watch TUI with its own go.mod, and tmux-nav for driving multi-pane agent sessions.",
        "root_paths": [
          "tools"
        ]
      },
      {
        "id": "utils",
        "label": "Shell Utilities",
        "kind": "tooling",
        "files": 25,
        "blurb": "Ad-hoc shell and Python helpers: advisory reports, commit-range and doc-lifecycle scripts, audio generation, and a pipeline watcher.",
        "root_paths": [
          "utils"
        ]
      }
    ]
  },
  "timeline": [
    {
      "pr": 60,
      "date": "2026-04-25",
      "title": "Review Cobuilder Architecture Su6Vt",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 2,
        "adds": 25,
        "dels": 6
      },
      "touched": {
        ".claude": 2
      },
      "levels": {},
      "status": "merged"
    },
    {
      "pr": 61,
      "date": "2026-05-21",
      "title": "Epic A Refactor",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 6,
        "adds": 2337,
        "dels": 2459
      },
      "touched": {
        "cobuilder": 4,
        "tests": 2
      },
      "levels": {},
      "status": "merged"
    },
    {
      "pr": 62,
      "date": "2026-05-21",
      "title": "Gastown Migration",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 101,
        "adds": 25372,
        "dels": 1486
      },
      "touched": {
        ".agents": 7,
        ".beads": 13,
        ".claude": 9,
        "(root)": 9,
        ".pi": 1,
        ".pipelines": 4,
        "acceptance-tests": 10,
        "agents": 3,
        "cobuilder": 6,
        "daemon": 1,
        "docs": 25,
        "formulas": 6,
        "state": 3,
        "tests": 4
      },
      "levels": {},
      "status": "merged"
    },
    {
      "pr": 63,
      "date": "2026-05-21",
      "title": "Gastown Migration",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 265,
        "adds": 28238,
        "dels": 23435
      },
      "touched": {
        ".agents": 31,
        ".beads": 2,
        ".claude": 196,
        ".pi": 1,
        "acceptance-tests": 2,
        "agents": 3,
        "(root)": 2,
        "cobuilder": 11,
        "daemon": 1,
        "docs": 3,
        "formulas": 6,
        "tests": 7
      },
      "levels": {},
      "status": "merged"
    },
    {
      "pr": 64,
      "date": "2026-05-29",
      "title": "Cobuilder Refactoring May 26",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 488,
        "adds": 23749,
        "dels": 14184
      },
      "touched": {
        ".agents": 1,
        ".beads": 2,
        ".claude-plugin": 1,
        ".claude": 42,
        ".cobuilder": 12,
        ".pipelines": 3,
        ".taskmaster": 1,
        "(root)": 13,
        "acceptance-tests": 4,
        "cobuilder": 190,
        "docs": 50,
        "examples": 8,
        "stagehand-crawl-cli": 17,
        "state": 1,
        "tests": 142,
        "tools": 1
      },
      "levels": {},
      "status": "merged"
    },
    {
      "pr": 65,
      "date": "2026-06-02",
      "title": "Pensive Goldberg Reqia",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 7,
        "adds": 388,
        "dels": 19
      },
      "touched": {
        ".claude": 6,
        "docs": 1
      },
      "levels": {},
      "status": "merged"
    },
    {
      "pr": 66,
      "date": "2026-06-08",
      "title": "Pipeline Watch P3",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 33,
        "adds": 11117,
        "dels": 52
      },
      "touched": {
        ".cobuilder": 2,
        "cobuilder": 17,
        "docs": 12,
        "tests": 2
      },
      "levels": {},
      "status": "merged"
    },
    {
      "pr": 68,
      "date": "2026-06-16",
      "title": "Guardian Pi Phase3",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 93,
        "adds": 14623,
        "dels": 3038
      },
      "touched": {
        ".beads": 1,
        ".claude": 10,
        ".pi": 5,
        "(root)": 4,
        "cobuilder": 37,
        "docs": 21,
        "tests": 15
      },
      "levels": {},
      "status": "merged"
    },
    {
      "pr": 70,
      "date": "2026-06-23",
      "title": "Cobuilder Frontend Epic1 Registry",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 12796,
        "adds": 7168,
        "dels": 4407061
      },
      "touched": {
        ".beads": 1,
        "(root)": 1,
        "acceptance-tests": 4,
        "cobuilder-frontend": 37,
        "cobuilder": 10,
        "docs": 9,
        "tests": 6
      },
      "levels": {},
      "status": "merged"
    },
    {
      "pr": 71,
      "date": "2026-06-30",
      "title": "Frontend Step Outcome Linebreaks List Hover Light",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 3,
        "adds": 42,
        "dels": 20
      },
      "touched": {
        "cobuilder-frontend": 3
      },
      "levels": {},
      "status": "merged"
    },
    {
      "pr": 79,
      "date": "2026-07-25",
      "title": "ActiveGraph shared-agent-state: spikes 1-3 (event sink, AgRunner + real pi-SDK dispatch, planner path)",
      "tagline": "Three trials show how one graph can replace four record systems.",
      "depth": "full",
      "size": {
        "files": 90,
        "adds": 22654,
        "dels": 60
      },
      "touched": {
        ".claude": 63,
        "cobuilder": 9,
        "docs": 6,
        "examples": 10,
        "tests": 2
      },
      "levels": {
        "landscape": {
          "narration": "The pipeline keeps its records in four systems. This change gives it one record that all agents use. The change is not complete. It contains three trials.",
          "detail": "This pull request is open. It changes 90 files, adds 22,654 lines, and removes 60 lines. The change to the engine is small. `cobuilder/` gets 1,396 new lines and `tests/` gets 1,321 new lines. The other 17,439 new lines are book text in `.claude/skills/architecture-review-design-maintenance/references/books/`. The same branch holds this book text, but it is not part of the ActiveGraph work.",
          "voice": "Pull request seventy nine is not a complete feature. It examines one idea. The pipeline can use one shared record for all of its agents. Today the pipeline keeps its records in four different systems. Each system holds only one part of the history.\n\nThe work comes as three trials. The number of new lines looks very large, more than twenty two thousand. But most of those lines are book text on the same branch. The engine itself gets about fourteen hundred new lines. All new functions stay off until you start them."
        },
        "problem_solution": {
          "problem": "The pipeline keeps its state in four places: the DOT file, the checkpoint files, the signal files, and `beads`. No component holds the full history. A restart is correct only if the checkpoint files agree with the DOT file. The guardian examines what an agent says about itself, not an independent record. `PiSDKAdapter` sends four message types for the full length of a session. But only the final signal file stays, and it holds only `status` and `files_changed`.",
          "solution": "This change adds three trials, and each trial is off by default. Trial 1 adds `ActiveGraphEmitter`, a fourth backend that copies all 19 event types into an `activegraph` run. Trial 2 adds `AgRunner`, a host of approximately 730 lines that controls one `Runtime` and starts real pi-SDK sessions. Trial 3 adds the `plan_create` tool. A planner session uses this tool to record its own milestones and tasks. `AgRunner` then makes graph objects from that record and starts the tasks.",
          "narration": "The pipeline records what happens in four different places. No place holds the full history. When a worker stops, the system keeps only a short report and discards the rest. This change makes one record that holds all of the data.",
          "alternatives": [
            {
              "option": "Keep the DOT files as the source of truth and copy into ActiveGraph",
              "rejected": "Two sources that you can write to will disagree. Replay and fork give no value if the copy is not the source of truth."
            },
            {
              "option": "Make beads the shared store for the run",
              "rejected": "beads is an issue tracker, not a run-time system. It has no subscriptions, no replay, no fork, and no scoped views."
            },
            {
              "option": "Write a new event log in the execution engine",
              "rejected": "This work makes again what activegraph 1.x already supplies, and it loses the related packs."
            }
          ],
          "beats": [
            {
              "kind": "background",
              "text": "The execution engine already has an event bus. `EventBuilder` makes `PipelineEvent` objects, and `build_emitter()` sends them to three backends: JSONL, Logfire, and SignalBridge. The `EventEmitter` protocol is structural, and its full surface is only `emit` and `aclose`. Because of this shape, a fourth backend needs no change at the call sites."
            },
            {
              "kind": "background",
              "text": "The same directory is a controlled boundary. ADR-0007 made the events JSONL a published contract, and `cobuilder-frontend` and the sidecar read it across a language boundary. ADR-0008 put the gate on the path `cobuilder/execution_engine/events/`. Thus any change under that path needs a decision record that gives the names of its consumers. This rule applies also to a change that adds no fields."
            },
            {
              "kind": "background",
              "text": "The runner is above the bus. `pipeline_runner.py` reads a DOT graph, starts agents through `DispatchConfig`, and waits for signal files. `guardian.py` gives a score to the results. Both components get the task tree from a template before the run starts. No agent can add to the tree while the run continues."
            },
            {
              "kind": "intuition",
              "text": "Look at one worker session that makes 40 tool calls. Today this session leaves one file: a signal file with `{\"status\": \"success\", \"files_changed\": [...]}`. Set `activegraph_enabled` to `True` and `activegraph_store` to `\"sqlite:///run.db\"` on `EventBusConfig`. The same session then leaves one `action` object and 40 `session_event` objects, each with a `part_of_action` relation. `Runtime.load` reads this log and makes the run again, exactly. If the two fields keep their default values, the system does not make the backend, and the run does not change."
            },
            {
              "kind": "intuition",
              "text": "Trial 3 uses the same idea in the other direction. `submit_goal()` starts one planner session. The planner reads the repository and calls `plan_create` with its milestones and tasks. `AgRunner` makes `milestone` and `task` objects from that data and starts the ready tasks as tracked `asyncio.Task` objects. The tasks run at the same time, not one after the other. The pull request gives the evidence: the two task sessions start approximately 20 ms apart against a local model."
            }
          ],
          "voice": "Here is the real problem. Today the pipeline keeps its memory in four different places. The graph file holds the shape of the work, and the pipeline changes it while the nodes run. Checkpoint files hold enough data for a restart. Signal files hold what each worker says at the end. A separate tracker holds the view for people.\n\nNo one of these holds the full story. When a worker session stops, the system throws away everything inside it and keeps only the final note. The only job of the guardian is an independent check. But the guardian must give a score from the summary that the worker writes about itself. The new plan is one shared log that every agent writes to.\n\nThink about a worker that makes forty tool calls. Today it leaves one small file. With the new sink on, it leaves forty one linked records. These are the session, and every message, thought, call and result inside it, in order. From this log alone the system can make the whole run again, exactly. The new backend stays off unless you set two configuration fields."
        },
        "architecture": {
          "forces": [
            "The events directory is a published contract, and any change under it needs a record that gives the names of the consumers.",
            "The guardian must have a history that it can read again and check, and this history must not come from the agent itself.",
            "The tools pipeline-watch, tmux-nav and cli.py watch read the DOT files and the signal files, and they must continue to operate.",
            "Every side effect, which includes the pi-SDK dispatch and the tool calls, must go through a recorded tool, or the replay gives different results.",
            "The runs that exist today must not change, thus the new backend is off by default.",
            "The depth of the decomposition must change with the problem, because a template cannot set it correctly before the run."
          ],
          "decision": "The team makes an event-sourced `activegraph` run the one source of truth for the state of the agent work. The DOT file becomes a read-only view that a tool compiles from the graph. The work vocabulary is the containment spine `project`, `milestone` and `task`. The objects `action`, `artifact` and `evaluation` connect to that spine with typed relations. Phase A comes as an additive backend that is off by default and does not change the published JSONL format.",
          "consequences": "The agents write the state of the work only as events, and the DOT and signal files become views that no person edits. A new consumer of the event stream must come as an `EventEmitter` backend, and it must not change the JSONL schema. The team accepts three costs. `activegraph` is a new 1.x dependency, and the team must pin its version. Phase B owes a view adapter to the DOT tools. Every side effect needs a recorded tool.",
          "narration": "This change records three decisions. The largest decision makes the shared log the authority on the work. The second decision sets the names and the shape of the work objects. The third decision keeps the first step small and safe.",
          "beats": [
            {
              "kind": "forces",
              "text": "The change goes under `cobuilder/execution_engine/events/`. ADR-0008 made this path a gated boundary, because ADR-0007 published the events JSONL as a contract for two languages. The gate operates on the path, not on the size of the change. Thus an additive backend needs a record that names the consumers, exactly like a change that breaks the contract."
            },
            {
              "kind": "forces",
              "text": "The value of the guardian comes from its independence. A score from the `status` and `files_changed` values in `worker_done` shows only what the worker chose to report. Therefore the new state must record the full trajectory, not the summary."
            },
            {
              "kind": "forces",
              "text": "The migration must not stop the operators. `tools/pipeline-watch`, `tmux-nav` and `cli.py watch` read the DOT files and the signal files today. For this reason the plan keeps the DOT file as a compiled view and does not remove it."
            },
            {
              "kind": "forces",
              "text": "A replay is correct only if the system records the side effects. The determinism contract of `activegraph` gives this rule. A pi-SDK dispatch that is not a recorded tool makes the replay give different results. This is why Phase B, and not Phase A, holds most of the work."
            },
            {
              "kind": "contract",
              "text": "ADR-0014 makes the `activegraph` run the authority for the state of the agent work. The DOT file becomes a compiled view. The migration has three phases. Phase A copies the events into the graph. Phase B moves the dispatch to a behavior that reacts to `task.ready` events. Phase C removes the checkpoint files and the DOT files that people write."
            },
            {
              "kind": "contract",
              "text": "ADR-0015 sets the shape of the work. A `project` contains a `milestone`, and a `milestone` contains a `task`. A task can contain another task through `parent_of`. The objects `action`, `artifact` and `evaluation` connect only with typed relations. ADR-0016 sets how Phase A lands. It adds an `EventEmitter` backend behind two fields, and it does not change the JSONL schema."
            },
            {
              "kind": "boundary",
              "text": "The three records make one rule. The agents write the state of the work only as `activegraph` events. The DOT files and the signal files are compiled views, and no person edits them as sources. The rule has a result at the events boundary. A new consumer of the `PipelineEvent` stream comes as a backend. A real change to the format still needs its own ADR-0007 record."
            },
            {
              "kind": "boundary",
              "text": "The later phases give three results. A restart uses `Runtime.load` and does not reconcile the checkpoints. A counterfactual run uses fork and diff on the log. The fixed pipeline template becomes a task graph that the planner makes, and trial 3 shows this end to end. The records also give the costs. `activegraph` is a young 1.x dependency and needs a pinned version, and Phase B owes a view adapter to the DOT tools."
            }
          ],
          "voice": "This change records three decisions. The largest decision makes the shared log the authority on what the work is. The old graph file becomes a picture that a tool compiles from the log. The plan has three phases, and this pull request delivers only the first one.\n\nThe second decision sets the vocabulary. This sounds like a small point, and it is not. A project contains milestones, a milestone contains tasks, and a task can contain more tasks. So the tree fits the problem, and no one must pad it to a fixed depth. The record of an attempt, the files it makes, and the score it gets all connect to that spine by a named relation.\n\nThe third decision is the narrow one, and it makes this work safe to land today. The events directory is a published contract, and other systems read it across a language boundary. So the first step is only one more listener on a broadcast that already happens. It stays off unless you ask for it, and the published format does not change. The records also give the costs. Activegraph is a young dependency and needs a pinned version, and the harder phase is still ahead."
        },
        "file_changes": {
          "narration": "The changes make seven groups. They are the three trials, the decisions, the evidence, the tests, and one large set of book text.",
          "groups": [
            {
              "title": "Trial 1: the event bus sink",
              "note": "A fourth backend on the event bus, and the two fields that control it. The backend does nothing without the fields, and the fields keep the runs that exist today unchanged.",
              "files": [
                "cobuilder/execution_engine/events/activegraph_backend.py",
                "cobuilder/execution_engine/events/emitter.py"
              ]
            },
            {
              "title": "Trial 2: the AgRunner host",
              "note": "The host that controls one activegraph Runtime, and the provider profiles that its dispatch needs. Before this change, AgRunner did not set the model field or the pi_* fields of DispatchConfig. Therefore every dispatch failed with an empty model name.",
              "files": [
                "cobuilder/execution_engine/agrunner.py",
                "cobuilder/execution_engine/providers.yaml"
              ]
            },
            {
              "title": "Trial 3: planner tools across the Python and TypeScript boundary",
              "note": "The tools that a session calls, and the bridge that must show them. plan_create records a decomposition and does not stop the session. task_update patches a task over HTTP in two directions. pi-bridge.js adds the two new tool names to its list, and it keeps the compat field when it registers a custom provider.",
              "files": [
                "cobuilder/execution_engine/adapters/pi-bridge/cobuilder/plan-create.ts",
                "cobuilder/execution_engine/adapters/pi-bridge/cobuilder/task-update.ts",
                "cobuilder/execution_engine/adapters/pi-bridge/cobuilder/index.ts",
                "cobuilder/execution_engine/adapters/pi-bridge/cobuilder-extension/index.js",
                "cobuilder/execution_engine/adapters/pi-bridge/pi-bridge.js",
                ".claude/agents/planner.md"
              ]
            },
            {
              "title": "Decision records",
              "note": "The three ADRs that permit this work, with the viewpoint indexes. ADR-0016 exists only because the gate on the events path needs a record, even for a change that adds fields.",
              "files": [
                "docs/cobuilder-documentation/adr/ADR-0014-activegraph-shared-agent-state.md",
                "docs/cobuilder-documentation/adr/ADR-0015-work-hierarchy-shape.md",
                "docs/cobuilder-documentation/adr/ADR-0016-activegraph-eventsink-backend.md",
                "docs/cobuilder-documentation/decisions/capabilities.md",
                "docs/cobuilder-documentation/decisions/chronology.md",
                "docs/cobuilder-documentation/decisions/relationship.md"
              ]
            },
            {
              "title": "Trial evidence and demonstrations",
              "note": "The exploration that the ADRs give as evidence. It contains the first experiment, the seam analysis, the result report of each trial, and the launchers. The launchers use real local models, not stubs.",
              "files": [
                "examples/activegraph_shared_state/FINDINGS.md",
                "examples/activegraph_shared_state/pi-sdk-seams.md",
                "examples/activegraph_shared_state/experiment.py",
                "examples/activegraph_shared_state/dogfood/SPIKE1-RESULT.md",
                "examples/activegraph_shared_state/dogfood/SPIKE2-RESULT.md",
                "examples/activegraph_shared_state/dogfood/launch_pi_session.py",
                "examples/activegraph_shared_state/dogfood/launch_planner_session.py"
              ]
            },
            {
              "title": "Tests",
              "note": "1,321 new lines in two test files. test_agrunner.py has 16 tests that use a scripted StubAdapter, thus they need no live model. test_activegraph_backend.py has 13 contract tests.",
              "files": [
                "tests/execution_engine/test_agrunner.py",
                "tests/unit/test_engine_events/test_activegraph_backend.py"
              ]
            },
            {
              "title": "Not related: book text",
              "note": "17,439 of the 22,654 new lines in this pull request. They add four book collections to the architecture review skill. The same branch holds them, but they have a different subject. Read the engine change without them.",
              "files": [
                ".claude/skills/architecture-review-design-maintenance/SKILL.md",
                ".claude/skills/architecture-review-design-maintenance/references/book-index.md",
                ".claude/skills/architecture-review-design-maintenance/references/books/clean-code/",
                ".claude/skills/architecture-review-design-maintenance/references/books/refactoring/",
                ".claude/skills/architecture-review-design-maintenance/references/books/pragmatic-programmer/",
                ".claude/skills/architecture-review-design-maintenance/references/books/philosophy-of-software-design/"
              ]
            }
          ]
        }
      },
      "status": "open",
      "commit": "e620ba80e028385e37a3c1734839309e6f9296bb",
      "adrs": [
        "ADR-0014",
        "ADR-0015",
        "ADR-0016"
      ]
    }
  ]
};
