---
title: "ADR-0048 — structure signals coach GREEN, and VALIDATE reports them beside the slice score"
status: active
type: architecture
last_verified: 2026-11-12
owner: bjornslib
id: ADR-0048
source_pr: null
name: "structure signals coach GREEN, and VALIDATE reports them beside the slice score"
state: decided
groups: [workflow, quality]
approved_by: ""
problem: "An agent adds each new file to the nearest folder, and no test rewards a better place. The coach reports smells inside one file only, and the VALIDATE rubric scores behaviour only. In some sessions the main agent writes the slice itself, so the coach and the blind score do not run."
decision: "Two scripts report structure signals as evidence, and agents judge them. A stdlib script gives GREEN a crowded folder with its groups, a name family, a generic name, and a boundary edge for each new file. A VALIDATE script reads the slice diff for contract drift, boundary edges, and the signals that a spike on a second repository keeps. A signal reports only on code that the change adds. VALIDATE writes an advisory Structure block outside the slice score. The vocabulary agent judges names, with leads from the glossary. A replay decides what enters the score. Review mode and maintenance mode run the same signals on the whole repository later."
maps_to:
  context: implement
  modules: [shared/structure_signals.py, shared/structure_boundary.py, shared/structure_evidence.py, plugins/implement/scripts/habit_coach.py, plugins/implement/agents/validate.md, plugins/implement/skills/build/references/slice-loop.md, plugins/implement/skills/build/workflows/slice-loop.js, plugins/implement/skills/build/SKILL.md]
  rule: "A structure signal is advice. It never blocks a write, and it enters the slice score only after a replay evaluation and an engineer decision. shared/structure_signals.py is the one source of each signal. The coach gives structure signals for each file extension. It stays silent about smells for an extension that habit-hooks does not scan, and it runs for the implement:green agent only."
forces:
  - "The research synthesis of 2026-11-10 found that guidance at the start lowers the first level of decay, not its rate. A coaching message at write time had the best direct evidence, from one small study that is not peer-reviewed."
  - "No study that the research found links the size of a folder to defects, so each limit must be advisory and the engineer must be able to change it."
  - "ADR-0025 lets the coach run for the implement:green agent only, and it never blocks a write. The hook fires on each Write or Edit in a session."
  - "The rubric has no weights. The slice score is a plain average, and the orchestrating session writes the rubric before the code exists."
  - "The rubric rule says to state behaviour, not implementation. A structure criterion states implementation."
  - "habit-hooks finds smells inside one file. The structure signals judge folders and names, and the engineer keeps the two jobs apart."
  - "The vocabulary agent already checks folder names and file names against the glossary, outside the score."
  - "The engineer saw sessions in which the main agent did not spawn the slice agents. The slice loop reference already names each agent type."
alternatives:
  - option: "Deliver the signals as a sensor in a project-local habit-hooks plugin"
    rejected_because: "habit-hooks finds smells inside one file, and the signals judge folders and names. The engineer keeps the two jobs apart. A sensor also runs for six extensions only."
  - option: "Build a new /architect:refactor command with a graph engine, as the first research run proposed"
    rejected_because: "It runs after the damage. The evidence favours feedback at write time, and its thresholds have no source."
  - option: "Remove the GREEN filter, so the coach runs for each caller in each session"
    rejected_because: "ADR-0025 holds the filter as a rule. Each write in each session then waits on habit-hooks. The engineer kept the filter."
  - option: "Add weighted structure criteria S1 to S5 to the rubric at once"
    rejected_because: "The rubric has no weights, and a score is a plain average. An unproven threshold can then fail a slice."
  - option: "Keep a baseline file of old findings in .cobuilder/"
    rejected_because: "A git comparison with the merge-base, with untracked files included, gives the same new-code rule. It adds no state file to keep current."
  - option: "Add an import check with dependency-cruiser and import-linter in the first version"
    rejected_because: "It adds two tool dependencies and covers two languages only. The three signals work in each language."
  - option: "Add a PreToolUse speed bump that blocks the first write of a new file"
    rejected_because: "It is a fifth hook script and a new event under ADR-0025. No study shows that a block works better than advice."
  - option: "Make slice-loop.js the default way to run each slice, so code enforces the agent order"
    rejected_because: "It is too heavy for a small build, and each run needs the engineer to opt in. Code cannot enforce agent use in each session."
  - option: "Show agent use with a marker that the coach hook writes"
    rejected_because: "The coach ignores each caller except GREEN. A missing marker then means a main-agent slice or a silent coach, and the check cannot tell them apart."
  - option: "Silence the coach on the habit-hooks markers for an unscanned file"
    rejected_because: "For a scanned extension, those markers show a misconfiguration that GREEN must report. The guard keys on the file extension instead."
  - option: "Start the generic-name list from the _Avoid_ terms of DDD-VOCABULARY.md"
    rejected_because: "The _Avoid_ terms are rejected synonyms for one concept, not generic names. A match on file and folder names gave 25 hits on this repository, and none was real."
  - option: "A placement score that names the best folder for a new file"
    rejected_because: "On this repository, the own folder of a file was the best match for 47% of files by imports and for 35% by name tokens."
  - option: "A Cluster Factor limit of 0.25 that makes a folder a finding"
    rejected_because: "4 of the 7 folders that it flagged on this repository were false. Review mode shows the value in a table with no limit."
  - option: "Run the script from the coach with uv run, and read a YAML config"
    rejected_because: "The coach is stdlib only, and two coach tests fail when it runs uv. A uv start on each write also adds delay."
delivers:
  capability: "The GREEN agent gets advice about the place and the name of a new file during the write, and the engineer reads structure findings beside each slice score."
  benefit: "A folder stops growing in silence. The engineer sees a structure decision when the agent makes it, not in a later audit."
  beneficiary: [developer, implement-worker, reviewer]
  enables: ["A scored structure criterion after the replay evaluation", "Structure signals in review mode and maintenance mode", "An import check against a boundary record"]
provenance: authored
history:
  - { state: decided, date: 2026-11-10, by: engineer, note: "Decided in a cloud session. The engineer kept the GREEN filter, accepted the two coach guards, asked for stronger slice loop text, and asked for a later epic for review mode and maintenance mode. The spike, the reviewer round, and the tracker program record are pending." }
  - { state: decided, date: 2026-11-10, by: engineer, note: "Round 1 of the draft review scored 0.63. The engineer rated it material, kept the agent-use effect open for the spike, and rejected slice-loop.js as the default run mode. The implement and shared boundary records were refreshed." }
  - { state: decided, date: 2026-11-10, by: engineer, note: "Round 2 of the draft review scored 0.75. The session applied its findings: a stdlib script, a JSON config, a session store for the coach, the verify_gate.py host, and the install owner." }
  - { state: decided, date: 2026-11-12, by: engineer, note: "Amended after the algorithm research. The engineer approved a boundary check now, a VALIDATE script with libraries, _Avoid_ words as leads for the vocabulary agent, two views of each signal, a spike on a second repository, and a backlog epic for /architect:refactor. Decisions 2, 3, and 12 changed, and decisions 13 to 17 are new." }
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

1. **One source.** `shared/structure_signals.py` holds the signals. It uses the standard library only, because the coach is stdlib only and must not run `uv`. The coach imports it through the `shared` symlink, or runs it with `sys.executable`. It prints findings JSON in the habit-hooks format: one finding for each smell, and one issue for each place.
2. **Coach signals.** A crowded folder has more files than both the 90th percentile of the repository and a limit that the engineer sets, 20 by default. Every file that is not excluded counts, test files too. The finding names the groups in the folder: the name families and the sets of files that import each other. A name family is three or more sibling files that share a first name token, with no sub-folder of that name. The script splits a file stem on `_`, `-`, `.`, and each camelCase boundary, and it compares the first token in lower case. Test names do not count as a family. A generic name is a file stem in the `generic_names` list of the config. Amended 2026-11-12: the list does not start from the `_Avoid_` terms of `DDD-VOCABULARY.md`. Decision 15 gives those terms to the vocabulary agent.
2a. **Config.** `.cobuilder/structure-signals.json` holds the folder limit, the percentile, the generic names, the excluded stems, and the excluded paths. JSON keeps the script stdlib only. Each value has a default, and the engineer can change it.
3. **The new-code rule on git.** A signal reports only on code that the change adds, so old debt stays silent. For the coach, that is a file that is untracked, or added since the merge-base with the default branch. The working tree counts, so a file that GREEN has not committed counts. On a branch with no merge-base, only untracked and staged files count. For VALIDATE, it is the slice diff: each added file, the added lines of each changed file, and each public symbol that the slice changed. The whole-repository view of decision 16 does not use the rule. The script keeps no baseline file. Amended 2026-11-12: the earlier text called this rule the ratchet.
4. **Not analysed.** The output names each path that the script did not analyse, so a clean result is not a false pass.
5. **Coach.** The coach passes the signals to GREEN as advice that names the decision to make. It has no cap on structure findings at first. A cap comes only if the replay or the engineer finds noise. It does not repeat a finding in one session. Each hook call is a new process, so the coach keeps the findings it showed in a file in the system temp folder, keyed by the `session_id` of the payload.
6. **Filter and guards.** The coach still runs for `implement:green` only. It gives structure signals for each file extension. It stays silent about smells for an extension outside the habit-hooks set, which is `.py`, `.ts`, `.tsx`, `.php`, `.java`, and `.rb` today. For an extension in that set, a habit-hooks failure still reaches GREEN as a report. Its messages do not depend on the name of the caller.
7. **Delivery route.** `habit_coach.py` gets a second runner that calls `shared/structure_signals.py` after habit-hooks and joins the two outputs. The two checks stay apart. The design uses no habit-hooks plugin.
7a. **Coaching language.** The first slice of E2 writes the message for each signal and the format of the Structure block. The engineer reviews and approves it before the coach and VALIDATE use it.
8. **VALIDATE.** VALIDATE runs the script on the slice. On the diff, it judges contract drift, cohesion, and each new dependency against the `forbidden_dependencies` of `boundary.yaml` and the glossary. These are judgments, not checks. It adds a `### Structure` block to the attempt file, outside `overall_score`. A failed attempt passes the block to the next GREEN attempt.
9. **Agent use.** The slice loop text states that the main agent spawns the three agents and writes no slice code itself. One effect that a script reads shows that the agents ran the slice. The effect must hold in manual mode and in workflow mode. The spike picks it from two candidates: the VALIDATE attempt file and the tracker attempt record. A marker from the coach cannot work, and the hook does not call the tracker. `verify_gate.py` runs the check before the slice loop closes a slice. Its tests cover no attempt file, a pass at attempt 1, and workflow mode. A partial skip, where the main agent writes the code and spawns only VALIDATE, is an open question for the spike. Neither text nor the check forces agent use, and the check finds a skipped agent only after the slice.
10. **Evaluation.** A replay runs slice plans with the signals on and off, three runs or more for each condition, five slices each. It records the folder growth and the follow-on resolve rate. The engineer then decides on scored criteria.
11. **Later epic.** Review mode and maintenance mode report the signals and their trend after the work for GREEN and VALIDATE is complete.
12. **Import parser.** A backlog epic, E7, draws the dependency diagram and adds more languages. Amended 2026-11-12: the boundary check of decision 13 moves forward, so E7 reuses its reader and the import graph of E4.
13. **Boundary edge now.** `shared/structure_boundary.py` reads each `docs/architecture/contexts/*/boundary.yaml` with the standard library. A reference in a new file, an import or a path string, that names another context outside `allowed_dependencies` is a finding. A match on a path glob of `forbidden_dependencies` is also a finding. The coach shows it to GREEN, and VALIDATE reads it on the slice diff. A forbidden target that is prose goes to VALIDATE as a rule to judge. In this repository the plugins couple through path strings and skill names, not imports.
14. **VALIDATE evidence script.** `shared/structure_evidence.py` writes one evidence packet for the slice diff. VALIDATE runs it with `uv run`, so it may use tree-sitter for TypeScript and PyYAML. Python contract drift uses `ast`: a change to the parameters, the defaults, the return annotation, the raised errors, or the caught errors of a public symbol. Each event lists the files outside the diff that name the symbol. The coach and `structure_signals.py` stay on the standard library.
15. **Vocabulary leads.** The script reads `DDD-VOCABULARY.md` and lists each `_Avoid_` word in a new name as a lead, with the reason from the glossary entry. The vocabulary agent reads the whole glossary and judges each lead. It tags a name AVOID only when the name means the concept that the avoided word lost to. VALIDATE does not judge names, and the coach does not show `_Avoid_` leads.
16. **Two views.** Each signal uses one algorithm in two views, and only the input set changes. The change view serves GREEN and VALIDATE. The whole-repository view serves review mode and maintenance mode (E6). It reads every file that is not excluded, ranks the findings by the change count of the last 90 days, and writes one findings file with a fixed schema. A later `/architect:refactor` skill (backlog epic E8) plans refactor work from that file.
17. **Spike on a second repository.** Five signals are uncertain: TypeScript contract drift, a missing co-change partner, duplicated code, a twin name, and consumer locality. A spike runs each one on `zenagent/agencheck`, read only. A signal stays when an agent label gives a precision of 50% or more and one finding or more that needs a change. The engineer checks 10 labels for each signal.

## Obsolete after this ADR

- `DDD-VOCABULARY.md`: the Coach entry says that the coach passes habit-hooks findings back. After E2 it also passes structure signals.
- `slice-loop.md` and the build `SKILL.md`: the text that names the agents gains the rule that the main agent writes no slice code.
- `validate.md`: the evidence file format gains the Structure block.
- `habit_coach.py`: for an extension outside the habit-hooks set, the coach no longer asks GREEN to report a failure. The tests in `test_habit_coach.py` that use a `.py` path keep their failure reports.
- ADR-0025 stays as written. This record adds no hook, no agent, and no hook event.

## Consequences

- GREEN gets one more kind of advice in the coach message. With no cap, it can hide the smell advice. A cap comes if the replay or the engineer finds noise.
- Each limit is unproven. A wrong limit gives advice that GREEN ignores, so E5 must run before any limit enters the score.
- The Structure block has no effect on a slice that passes at the first attempt, apart from the report to the engineer.
- A scored structure criterion later needs a change to the rubric rule on behaviour, and a new decision record.
- An install must put the signals where the coach finds them. E2 owns it: the `cobuilder-setup` skill writes the default `.cobuilder/structure-signals.json`.
- The Java, PHP, and Ruby suffix convention, as in `UserService` and `UserRepository`, can give name-stem clusters. E5 hand-labels them, and the excluded stems in the config can silence them.
- The diagram and more languages are backlog epic E7. A speed bump stays open as a later decision. Each needs its own record.
- `structure_evidence.py` needs a network on its first run, to download its wheels. When `uv run` fails, VALIDATE writes the Structure block from the diff alone and names the failure.
- The boundary check reads the six `boundary.yaml` files of this repository. A repository with no boundary record gets no boundary finding, and `not_analysed` says so.
