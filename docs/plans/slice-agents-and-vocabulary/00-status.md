# Status: Slice agents, coding habits, and a DDD vocabulary

- Gate 1 — Product: in progress
- Gate 2 — Architecture: in progress
- Gate 2b — Interaction design: n/a (no UI) — Screens: "no UI"
- Gate 3 — Program Design: in progress
- Gate 4 — Slice plan, epic designs, and rubrics: in progress
  - 4a Slice plan: pending
  - 4b Epic technical solution designs: pending
  - 4c Blind rubrics: pending

Design mode: declined
Hindsight: unavailable

## Slices
- [ ] Slice 1 — E1 whole epic: ADR-0025, packaging test, CLAUDE.md rule   score: —
- [ ] Slice 2 — E2 tracer bullet: three agent files that parse            score: —
- [ ] Slice 3 — E2 real content: prompts move, loops spawn by name        score: —
- [ ] Slice 4 — E3 tracer bullet: the hook fires for GREEN only           score: —
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
- Design mode did not run. The design record was written by hand, like
  `interaction-design-gate`.
