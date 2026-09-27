# Status: Slice agents, coding habits, and a DDD vocabulary

- Gate 1 — Product: APPROVED 2026-09-27
- Gate 2 — Architecture: APPROVED 2026-09-27
- Gate 2b — Interaction design: n/a (no UI) — Screens: "no UI"
- Gate 3 — Program Design: APPROVED 2026-09-27
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-09-27
  - 4a Slice plan: APPROVED 2026-09-27
  - 4b Epic technical solution designs: APPROVED 2026-09-27
  - 4c Blind rubrics: APPROVED 2026-09-27

Design mode: declined
Hindsight: unavailable

## Slices
- [x] Slice 1 — E1 whole epic: ADR-0025, packaging test, CLAUDE.md rule   score: 1.00
- [x] Slice 2 — E2 tracer bullet: three agent files that parse            score: 1.00
- [x] Slice 3 — E2 real content: prompts move, loops spawn by name        score: 1.00
- [x] Slice 4 — E3 tracer bullet: the hook fires for GREEN only           score: 1.00
- [ ] Slice 5 — E3 edge cases, requirement, and credit                    score: —
- [ ] Slice 6 — E4 tracer bullet: the glossary file and its format        score: —
- [ ] Slice 7 — E4 real content: vocabulary agent and design mode         score: —
- [ ] Slice 8 — E4 move: the CLAUDE.md table goes to the glossary         score: —

## Escalated
none yet

## Notes for a fresh session
- The engineer asked for no interview. Gates 1 to 4b were drafted in one
  pass from the chat on 2026-09-27 and presented together for approval.
- Dropped by the engineer: Matt Pocock's `improve-codebase-architecture`,
  `wayfinder`, and `to-spec`, a Standards review axis, and a vocabulary
  linter. Do not add them back.
- habit-hooks is required, not optional, and lives in the implement plugin.
- RED, GREEN, and every implementation subagent run on Sonnet 5, at the
  engineer's request. VALIDATE and the vocabulary agent inherit the session
  model.
- Plugin agents ignore a `hooks` frontmatter key, per the Claude Code plugin
  docs. The hook therefore lives in `hooks/hooks.json` and filters on
  `agent_type`.
- **Gate 4c approval is delegated.** The engineer approved Gates 1 to 4b in
  chat and asked for the build to run without an interview. The orchestrator
  wrote the rubrics after that approval and did not present them, to keep
  them blind. Reopen 4c if the engineer wants to read them.
- **Agent names are `implement:<role>`,** confirmed by the engineer on
  2026-09-27. The engineer also stated that the Workflow tool's `agent()`
  accepts a named agent. The option is `agentType` (secondary sources:
  alexop.dev and claude-world.com. The official workflows page does not list
  the options).
- **Test command** needs extra packages in this container:
  `uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q`.
  Baseline: 365 passed, 1 pre-existing failure (missing `google-genai`).
- Design mode did not run. The design record was written by hand, like
  `interaction-design-gate`.
