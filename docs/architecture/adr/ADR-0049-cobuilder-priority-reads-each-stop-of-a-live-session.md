---
# --- doc-gardener required frontmatter ---
title: "ADR-0049 — cobuilder-priority reads each stop of a live session"
status: active
type: architecture
last_verified: 2026-11-11
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0049
name: "cobuilder-priority reads each stop of a live session"
state: decided
groups: [workflow, packaging]
problem: "The priority-dev interpreter improves only on recorded transcripts. The optimiser runs on old sessions no longer give useful feedback. The engineer needs readings of recent sessions that they remember, so they can judge which part of the prompt to improve next."
decision: "Ship a seventh plugin, cobuilder-priority, as an opt-in mod outside the umbrella. One hooks module reads each main-loop Stop of a session that the person switched on. It runs priority digest, then priority interpret with the D1 program, as a separate process. It stores the reading, and a pane shows it with right, wrong, and note marks. The plugin carries out no step of the reading. This amends ADR-0025 and ADR-0039: implement, cobuilder-memory, and cobuilder-priority may ship hooks/."
alternatives:
  - option: "A Stop command hook with async true, plus a mod pane that reads its files"
    rejected_because: "Two mechanisms meet through a data folder. One hooks module can start the process and draw the pane, so no file hand-off is necessary."
  - option: "Interpret only, one model call per stop"
    rejected_because: "The engineer wants the digest of the run in the brief. The brief labels it CURRENT RUN on the live path."
  - option: "Interpret first, then digest"
    rejected_because: "Interpret would read the digest of the stop before, not of this stop. The engineer chose digest first."
  - option: "Change the PREVIOUS RUN label in every command"
    rejected_because: "Eval, replay, and the optimiser would see a new brief, and earlier compact-brief scores would no longer compare."
  - option: "Read every session in every repo"
    rejected_because: "Each transcript goes to an outside model service. The engineer chose a per-session switch that is off by default."
  - option: "A repo allowlist in userConfig"
    rejected_because: "The engineer chose a per-session switch, so each read is a choice made in that session."
  - option: "Ship the D1 program inside the plugin"
    rejected_because: "priority-dev/probes/programs/ is Git-ignored. The person names the program file in userConfig."
  - option: "API keys only in userConfig"
    rejected_because: "The priority CLI already reads priority-dev/.env. A secret userConfig key is an optional override that the module passes in env."
  - option: "Write each mark into the confirmed label files"
    rejected_because: "The engineer keeps the labels local. The confirmed set holds labels that the engineer confirmed, and live marks are a separate record."
  - option: "Add cobuilder-priority to the umbrella"
    rejected_because: "Each turn costs two model calls on an outside service. A person must choose that."
  - option: "A Claude Artifact page instead of a pane"
    rejected_because: "A page does not sit beside the session and update at each stop."
forces:
  - "A Stop fires at the end of each turn, and turn.complete also fires for each subagent turn."
  - "$.process.run times out after 30 seconds by default and after 10 minutes at most."
  - "A hot reload runs register again, and the module's own variables start over. $.state and $.store stay."
  - "ADR-0045 keeps priority-dev apart: it never imports from plugins/ or shared/, and nothing imports it."
  - "The interpret command loads the saved digest of the session as PREVIOUS RUN."
  - "D1 was scored on briefs with no digest (0.654 on 56 stops, probes/limit64k-report.md)."
related_decisions:
  - { type: is-related-to, target: ADR-0025 }
  - { type: is-related-to, target: ADR-0039 }
  - { type: is-related-to, target: ADR-0045 }
related_concerns: []
history:
  - { state: decided, date: 2026-11-11, note: "Drafted by design mode for the priority-dev-cc-plugin design. The engineer chose the name, the digest-first order with a CURRENT RUN label on the live path only, the per-session switch, opt-in, and local labels." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/cobuilder-priority, priority-dev/src/priority/cli.py, priority-dev/src/priority/brief, tests/test_plugin_manifests.py, .claude-plugin/marketplace.json]
  rule: "implement, cobuilder-memory, and cobuilder-priority may ship hooks/. Only implement may ship agents/. No plugin ships an MCP server."
delivers:
  capability: "Each stop of a live session that the person switched on gets a D1 reading in a pane, and the person marks it right or wrong."
  benefit: "The engineer judges the interpreter on sessions they remember, and the marks show which part of the prompt to improve next."
  beneficiary: [developer]
  enables: ["An export of the live marks into the labelled set", "A comparison of D1 and later programs on live stops"]
  addresses_problem: P1
source_pr: null
related:
  - "docs/architecture/designs/priority-dev-cc-plugin/contracts.md"
  - "docs/architecture/contexts/priority-dev/boundary.yaml"
---

# ADR-0049 — cobuilder-priority reads each stop of a live session

## Context

The priority-dev interpreter reads one stop of a coding session. It gives a
status, a priority, and the steps that a person might take next. The
optimiser improves its prompt on recorded transcripts. The recent runs on
old sessions no longer give useful feedback, because the engineer does not
remember those sessions well enough to judge a reading.

D1 is the best saved program. It scored 0.654 on 56 test stops, against
0.469 for the base prompt. D1 saw no digest in those runs.

ADR-0025 and ADR-0039 let only `implement` and `cobuilder-memory` ship
hooks. A reader at each stop needs a hook.

## Options considered

The frontmatter lists each option with its reason. Three shaped the
decision most:

- **A command hook plus a mod pane.** The mod API can start a process
  and draw a pane from one module, so a second mechanism adds only a
  file hand-off.
- **Interpret only.** It matches the brief that D1 was scored on. The
  engineer wants the digest in the brief, and accepts the risk.
- **Every session.** Each transcript goes to an outside service. The
  engineer chose a switch for each session.

## Decision

Ship a seventh plugin, `cobuilder-priority`, as an opt-in install from
this marketplace, outside the umbrella.

**Install surface.** The plugin is a mod. `hooks/hooks.json` names one
hooks module. It ships the module's tests, the manifest, a type contract,
and the `shared` symlink. It ships no `agents/` and no MCP server. This
amends ADR-0025 and ADR-0039: `implement`, `cobuilder-memory`, and
`cobuilder-priority` may ship `hooks/`. Only `implement` may ship
`agents/`. No plugin ships an MCP server.

**The switch.** The reader is off in each new session. The command
`/priority-on` turns it on for this session, and
`/priority-off` turns it off. The module keeps the switch in
`$.state`.

**The reading.** A `classic.Stop` hook runs on the main loop only. When the
switch is on and no reading runs, it starts one reading and returns at
once. A reading runs two commands in the priority-dev checkout:
`priority digest`, then `priority interpret --program <D1> --digest current`.
Each command has a timeout. A stop that comes while a reading runs waits,
and only the newest waiting stop runs next.

**The CURRENT RUN label.** The new `--digest current` flag of
`priority interpret` labels the saved digest `CURRENT RUN`. Without the
flag, the brief keeps `PREVIOUS RUN`. Eval, replay, and the optimiser do
not change.

**The store.** The module keeps each reading and each mark in `$.store`,
keyed by session and stop. The marks stay on this machine.

**The pane.** The pane shows one card for each stop: status, priority,
needs-human, each step with its content, or the abstain reason. Each card
holds `right`, `wrong`, and a note. `/priority-pane` opens the
pane. The plugin carries out no step.

**Settings.** `userConfig` holds the priority-dev folder, the program file,
the timeout, and an optional secret API key. The module passes the key to
the process in `env`. Without the key, the CLI reads `priority-dev/.env`.

`contracts.md` in the design folder holds each command, field, and format.

## Consequences

- The build adds this ADR to the history of ADR-0025 and ADR-0039. It
  updates CLAUDE.md principle 5, the plugin table, and the plugin count in
  CLAUDE.md, README.md, and DDD-VOCABULARY.md.
- The packaging test reads the amended rule in the slice that adds the
  plugin folder.
- Each stop with the switch on costs two model calls on an outside service.
- D1 was not scored on a brief with a CURRENT RUN digest. The marks are the
  first measure of that brief.
- A hot reload or the end of the session can stop a reading. The store
  keeps no partial reading.

## Value delivered

The engineer sees a D1 reading of each stop of a session they remember,
beside that session. They mark each reading, and the marks show which part
of the prompt to improve next.
