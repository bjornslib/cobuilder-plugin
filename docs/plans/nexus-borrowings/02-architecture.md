# Architecture: Nexus borrowings — runtime diagram, draft reviewer, contracts doc

Read before authoring: `docs/architecture/designs/nexus-borrowings/` (goal,
intent, narrative, assessment, contracts) and ADR-0036. This document grounds
Gate 2 in that design's `intent.json` per the design-mode join (ADR-0013).

## Fit

- `plugins/architect/skills/architecture/references/design-mode.md` — stage 5
  gains two artifacts and their rules; stage 6 gains the reviewer spawn and the
  `min_work.draft_review_run` derivation. Its role: the procedural home of the
  design lifecycle.
- `plugins/architect/skills/architecture/SKILL.md` — Design Mode run order gains
  the stage-5 additions and the stage-6 spawn with the dual-path guard.
- `plugins/architect/skills/architecture/references/runtime-architecture-diagram.md` — new SVG contract
  (architect-owned; ADR-0035 accepted inline SVG as the exception to the shared
  mermaid pipeline). Its
  role: the runtime rules Nexus's `_ARCH_SYSTEM` translated.
- `shared/build_index.py` — projections: one named read for the runtime slot,
  the contracts attach beside pr_draft. Its role: the only writer of the
  self bundle's record index (ADR-0018).
- `plugins/artifact/viewer/src/` — the design route's architecture level tile
  order and a contracts section. Its role: the only rendering surface;
  build-free-authoring stays under ADR-0020 (parts compiled by the engineer's
  build step only).
- `.claude-plugin/marketplace.json` — version fields for architect, implement,
  and artifact. Its role: the co-installation surface users resolve on update.

## Endpoints

- No new routes. The record index endpoint (`.cobuilder-architect/self/data/index.json`,
  served by the artifact View server) gains additive per-design fields:
  `diagrams["runtime"]` and `contracts`. Viewer routes unchanged;
  `#/work/<name>/intent` gains content. No MCP servers anywhere (ADR-0025).

## Data

- `designs` entity in `index.json`: gains optional `diagrams["runtime"]`
  (string, compiled from the authored SVG file) and optional `contracts` (string).
  Both additive; absence stays an omission, not an error.
- `goal.json`: `min_work` gains `draft_review_run: bool`, derived.
- `.claude-plugin/marketplace.json`: `architect` 0.6.0 → 0.7.0,
  `implement` 0.3.0 → 0.4.0, `artifact` 0.6.0 → 0.7.0. This is the auto-update
  mechanism for installed users.

## Flow

Primary path: design-mode session reaches stage 5 → drafts the two new
artifacts alongside the five → shows them before write → stage 6 spawns the
reviewer once per round before the engineer reads → findings classified into
stage 3/5 feedback or approval → stage 7 first-epic branch → `uv run
shared/build_index.py` compiles the record index → artifact View server serves
`index.json` → viewer design route reads the design entity and renders the
runtime tile ahead of the class tile → implement gates (when the engineer runs
`/implement:start`) ground Gate 2 and Gate 3 in `contracts.md` alongside
`intent.json`.

## External

- No external APIs. No new environment variables.
- One session subagent spawn per stage-6 round (Reviewer) — not an external
  service; runs in-session on `glm-5.3-flash:cloud` per the standing directive.
- `verify_gate.py` gains no new gate lines (2b and 4c remain page-free).