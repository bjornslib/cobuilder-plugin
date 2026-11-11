# Coach GREEN on structure, and report structure beside the slice score

## What

One script, `shared/structure_signals.py`, reports three structure signals: a
crowded folder, a name-stem cluster, and a generic file name. The coach passes
them to GREEN as advice when GREEN adds a file. VALIDATE writes an advisory
Structure block into the attempt file. The slice loop text makes the main agent
spawn the three slice agents, and a script checks that.

## Why

The research synthesis of 2026-11-10 found that guidance at the start lowers the
first level of decay, not its rate. Feedback at write time had the best
evidence. The coach reports smells inside one file only, and the rubric scores
behaviour only. In some sessions the main agent wrote the slice itself.

## Scope

- Step 0, the spike: prove that the second runner in `habit_coach.py` carries a
  folder signal to the coach message, pick the agent-use effect, and run one
  real slice.
- E1 structure-signals: the script and its tests.
- E2 coach-delivery: first a coaching-language slice that the engineer reviews
  and approves. Then the second runner, no repeat in a session, and no smell
  output for an unscanned extension. No cap at first. The install writes the
  default config. The GREEN filter stays.
- E3 loop-uses-agents: the loop text, and a check in `verify_gate.py` that reads
  one effect.
- E4 validate-structure-block: the advisory block, and the judgments of
  contract drift, cohesion, and dependencies across a boundary.
- E5 replay-evaluation: signals on and off, and the decision on scored
  criteria.
- E6 review-and-maintenance-signals: a later epic, after E1 to E5.
- E7 import-graph: a backlog epic for an import parser and a dependency
  diagram.

## Done when

- The spike transcript shows one coach message with a structure signal.
- The stdlib script reports each signal on synthetic folder trees, only for
  files that are untracked or added since the merge-base.
- The script names each path that it did not analyse.
- The coach gives structure signals for each extension, no smell output for an
  unscanned extension, and no repeat in a session.
- The engineer approves the coaching language before the coach uses it.
- A blind pass of the loop text spawns all three agents, and the effect check
  fails for a slice that the main agent wrote.
- The attempt file holds a Structure block outside the overall score.
- The replay records the folder growth and the follow-on resolve rate.

## Guard

A structure signal never blocks a write. It enters the slice score only after
the replay evaluation and an engineer decision.

See `docs/architecture/adr/ADR-0048` and
`docs/architecture/designs/structure-coaching/intent.json`.
