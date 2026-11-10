---
title: "ADR-0048 — structure signals coach GREEN, and VALIDATE reports them beside the slice score"
status: active
type: architecture
last_verified: 2026-11-10
owner: bjornslib
id: ADR-0048
source_pr: null
name: "structure signals coach GREEN, and VALIDATE reports them beside the slice score"
state: decided
groups: [workflow, quality]
approved_by: ""
problem: "An agent adds each new file to the nearest folder, and no test rewards a better place. The coach reports smells inside one file only, and the VALIDATE rubric scores behaviour only. In some sessions the main agent writes the slice itself, so the coach and the blind score do not run."
decision: "One script, shared/structure_signals.py, reports three structure signals: a crowded folder, a name-stem cluster, and a generic file name. A signal fires only for a file that is new on the branch. The coach passes the signals to the GREEN agent as advice, and the GREEN filter of ADR-0025 stays. VALIDATE writes an advisory Structure block outside the slice score. The slice loop text makes the main agent spawn the three slice agents, and a script checks that. A replay evaluation decides what becomes a scored criterion. Review mode and maintenance mode read the signals in a later epic."
maps_to:
  context: implement
  modules: [shared/structure_signals.py, plugins/implement/scripts/habit_coach.py, plugins/implement/agents/validate.md, plugins/implement/skills/build/references/slice-loop.md, plugins/implement/skills/build/SKILL.md]
  rule: "A structure signal is advice. It never blocks a write, and it enters the slice score only after a replay evaluation and an engineer decision. shared/structure_signals.py is the one source of each signal. The coach stays silent for a file that habit-hooks does not scan, and it runs for the implement:green agent only."
forces:
  - "The research synthesis of 2026-11-10 found that guidance at the start lowers the first level of decay, not its rate. A coaching message at write time had the best direct evidence, from one small study that is not peer-reviewed."
  - "No study that the research found links the size of a folder to defects, so each limit must be advisory and the engineer must be able to change it."
  - "ADR-0025 lets the coach run for the implement:green agent only, and it never blocks a write. The hook fires on each Write or Edit in a session."
  - "The rubric has no weights. The slice score is a plain average, and the orchestrating session writes the rubric before the code exists."
  - "The rubric rule says to state behaviour, not implementation. A structure criterion states implementation."
  - "habit-hooks takes a project-local plugin with sensors and guides. Its documents show a sensor that gets a list of files, and they do not state that a sensor can report on a folder."
  - "The vocabulary agent already checks folder names and file names against the glossary, outside the score."
  - "The engineer saw sessions in which the main agent did not spawn the slice agents. The slice loop reference already names each agent type."
alternatives:
  - option: "Build a new /architect:refactor command with a graph engine, as the first research run proposed"
    rejected_because: "It runs after the damage. The evidence favours feedback at write time, and its thresholds have no source."
  - option: "Remove the GREEN filter, so the coach runs for each caller in each session"
    rejected_because: "ADR-0025 holds the filter as a rule. Each write in each session then waits on habit-hooks. The engineer kept the filter."
  - option: "Add weighted structure criteria S1 to S5 to the rubric at once"
    rejected_because: "The rubric has no weights, and a score is a plain average. An unproven threshold can then fail a slice."
  - option: "Keep a baseline file of old findings in .cobuilder/"
    rejected_because: "A git comparison with the branch base gives the same ratchet. It adds no state file to keep current."
  - option: "Add an import check with dependency-cruiser and import-linter in the first version"
    rejected_because: "It adds two tool dependencies and covers two languages only. The three signals work in each language."
  - option: "Add a PreToolUse speed bump that blocks the first write of a new file"
    rejected_because: "It is a fifth hook script and a new event under ADR-0025. No study shows that a block works better than advice."
delivers:
  capability: "The GREEN agent gets advice about the place and the name of a new file during the write, and the engineer reads structure findings beside each slice score."
  benefit: "A folder stops growing in silence. The engineer sees a structure decision when the agent makes it, not in a later audit."
  beneficiary: [developer, implement-worker, reviewer]
  enables: ["A scored structure criterion after the replay evaluation", "Structure signals in review mode and maintenance mode", "An import check against a boundary record"]
provenance: authored
history:
  - { state: decided, date: 2026-11-10, by: engineer, note: "Decided in a cloud session. The engineer kept the GREEN filter, accepted the two coach guards, asked for stronger slice loop text, and asked for a later epic for review mode and maintenance mode. The spike, the reviewer round, and the tracker program record are pending." }
related_decisions:
  - { type: is-related-to, target: ADR-0025 }
  - { type: is-related-to, target: ADR-0012 }
  - { type: is-related-to, target: ADR-0038 }
  - { type: is-related-to, target: ADR-0017 }
related:
  - "docs/architecture/designs/structure-coaching/intent.json"
  - "plugins/implement/scripts/habit_coach.py"
  - "plugins/implement/skills/build/references/rubric-authoring.md"
---

# ADR-0048 — structure signals coach GREEN, and VALIDATE reports them beside the slice score

## Context

Two research documents of 2026-11-10 are the base of this record: a synthesis on agent-written code and a source listing. Most of the agent studies in them are preprints. The synthesis states these points.

- In one benchmark, the structure of the code got worse in 77% of agent runs. Guidance at the start lowered the first level by up to a third, and it did not change the rate.
- In one small evaluation, a coaching message gave a real fix in 83.3% of trials. A bare metric gave 28.9% on one model and 5.6% on a second model.
- Complexity metrics did not explain the later maintenance cost. A silent change to inputs and to error handling did.
- No study measures how agents fill a folder, and no study supports a fixed limit for the number of files in a folder.

A read of this repository on the same day gave these facts.

- `habit_coach.py` runs on `PostToolUse` for `Write|Edit`. It filters on `agent_type == "implement:green"`, runs `habit-hooks --file <path>`, and always exits 0. It has no cap and no dedupe.
- For a file that habit-hooks does not scan, the coach sends a message that tells GREEN to report it.
- The slice score is a plain average of the criteria. A pass needs 0.90 and no CRITICAL criterion below 1.0. `verify_gate.py` checks that the rubric files exist, and it does not read them.
- The vocabulary agent adds a `### Vocabulary` block to the attempt file, and a failed attempt passes its findings to the next GREEN attempt.
- `slice-loop.md` tells the main agent to spawn `implement:red`, `implement:green`, and `implement:validate` by type. No script checks that it did.
- habit-hooks was not installed in the session, so no part of the plugin route was run.

## Decision

1. **One source.** `shared/structure_signals.py` holds the signals. It prints findings JSON in the habit-hooks format: one finding for each smell, and one issue for each place.
2. **Three signals.** A crowded folder has more files than both the 90th percentile of the repository and a limit that the engineer sets. A name-stem cluster is three or more sibling files that share a first name token, with no sub-folder of that name. A generic name is a file stem in a list that the engineer can change.
3. **Ratchet on git.** A signal fires only for a file that is new on the branch, by a comparison with the branch base. The script keeps no baseline file.
4. **Not analysed.** The output names each path that the script did not analyse, so a clean result is not a false pass.
5. **Coach.** The coach passes the signals to GREEN as advice that names the decision to make. It shows three structure findings at most, and it does not repeat a finding in one session.
6. **Filter and guards.** The coach still runs for `implement:green` only. It stays silent for a file that habit-hooks does not scan. Its messages do not depend on the name of the caller.
7. **Delivery route.** A spike picks the route. The first choice is a project-local habit-hooks plugin with a sensor and guides. The second choice is a second runner in `habit_coach.py` that calls the script.
8. **VALIDATE.** VALIDATE runs the script on the slice and judges contract drift on the diff. It adds a `### Structure` block to the attempt file, outside `overall_score`. A failed attempt passes the block to the next GREEN attempt.
9. **Agent use.** The slice loop text states that the main agent spawns the three agents and writes no slice code itself. One effect that a script reads shows which agent wrote the slice. The spike picks the effect, and the hook does not call the tracker.
10. **Evaluation.** A replay runs slice plans with the signals on and off, for five slices or more. It records the folder growth and the follow-on resolve rate. The engineer then decides on scored criteria.
11. **Later epic.** Review mode and maintenance mode report the signals and their trend after the work for GREEN and VALIDATE is complete.

## Obsolete after this ADR

- `DDD-VOCABULARY.md`: the Coach entry says that the coach passes habit-hooks findings back. After E2 it also passes structure signals.
- `slice-loop.md` and the build `SKILL.md`: the text that names the agents gains the rule that the main agent writes no slice code.
- `validate.md`: the evidence file format gains the Structure block.
- ADR-0025 stays as written. This record adds no hook, no agent, and no hook event.

## Consequences

- GREEN gets one more kind of advice in the coach message. The cap keeps it short, but it shares the space with the smell advice.
- Each limit is unproven. A wrong limit gives advice that GREEN ignores, so E5 must run before any limit enters the score.
- The Structure block has no effect on a slice that passes at the first attempt, apart from the report to the engineer.
- A scored structure criterion later needs a change to the rubric rule on behaviour, and a new decision record.
- An install must put the signals where the coach finds them. For the plugin route, that is `.habit-hooks/` in the target repository.
- An import check and a speed bump stay open as later decisions. Each needs its own record.
