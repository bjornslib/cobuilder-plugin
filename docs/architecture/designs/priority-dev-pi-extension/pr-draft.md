# The priority reader runs in Pi and OMP on a shared core and priority transcripts

## Problem

Many coding agents run in parallel, and nothing ranks or filters what they need. The priority reader works only in Claude Code. priority-dev reads only Claude Code transcripts, and the plugin runs on the Claude Code mod engine.

The engineer now runs agents in Pi and OMP, and Pi Durable makes a durable orchestrator possible.

## Why this approach

priority-dev reads each harness through one transcript adapter for each dialect. `priority read` prints one Reading as JSON for any agent. A shared TypeScript core holds the reading contract and a pure `evaluate`. The Claude Code plugin and a new Pi package for Pi and OMP use the core. The Pi Durable orchestrator stays planned. ADR-0051 holds the decision, and it amends ADR-0049, ADR-0050, and ADR-0016.

## Alternatives considered

See `intent.alternatives` and ADR-0051. In short: a separate extension with no shared code, flattening Pi into Claude Code JSONL, a TypeScript port of D1, a hosted reader service, an orchestrator LLM that decides alone, and three other homes for the Pi package.

## Out of scope

- The build of the Pi Durable orchestrator (epics E8 to E10 stay planned)
- A change to D1, eval, replay, or the optimiser
- A hosted reader service and a mobile client
- Subagent stops, and permission prompts in Pi and OMP

## Risks

- A changed Claude Code brief voids the 0.654 score of D1
- The stop events, the pane, and the question hold differ between Pi and OMP
- The move onto the core can break the approved Claude Code plugin
- Pi Durable is experimental and runs no Python

## How this was tested

- `uv run pytest` in `priority-dev`, with byte-identical briefs on the 56 scored stops
- `claude plugin test plugins/cobuilder-priority`, with no test file changed
- The Pi package tests over the golden readings
- The probe record of E1 for Pi and OMP

## Where to focus

- The Claude Code transcript adapter and the 56 scored briefs
- The move of `plugins/cobuilder-priority` onto `shared/priority-core`
- Only the host adapter branches on the host

The author flagged these parts as not fully understood:

- Whether exactly one stop event fires for each stop in Pi and in OMP
- Whether a plain-object component draws the pane in both hosts
- Whether OMP's `ask` call can be held and answered from the pane
- How a PiHarness child reaches its orchestrator
- How D1 scores on Pi and OMP stops

---

Authorship: agent-assisted.
