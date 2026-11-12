# Slice plan: Structure signals coach GREEN, and VALIDATE reports them beside the slice score (structure-coaching)

E6 and E7 are later epics. They carry no slices in this PR. A later design cuts their slices.

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`structure-coaching/E1` — Structure signals.** The script finds three signals for new files only. | | | | |
| 1 | `structure-coaching/E1` | **Tracer bullet: a crowded folder reaches GREEN.** The new-file rule, the crowded-folder signal, and a plain second runner in the coach. | A GREEN write of a new file into a crowded folder gives a coach message that names the folder, its file count, and the limit. A write of an old file gives no structure text. The spike transcript is kept. | — | pending |
| 2 | `structure-coaching/E1` | The name-stem cluster and the generic name, with the token split, the config file, and the list of paths not analysed. | The script reports each of the three signals on synthetic trees, reads its limits from `.cobuilder/structure-signals.json`, skips test-name prefixes, and names each excluded path. | — | pending |
| | **`structure-coaching/E2` — Coach delivery.** The engineer approves the wording, and the coach carries it to GREEN with no repeat. | | | | |
| 3 | `structure-coaching/E2` | The coaching language: one message for each signal and the format of the Structure block. | The engineer approves `shared/structure-messages.json` and the block format. A blind GREEN agent that gets one message makes the decision that the message names. | — | pending |
| 4 | `structure-coaching/E2` | The coach uses the approved wording, repeats no finding in a session, and gives no smell output for an unscanned extension. | A `.go` write gives a structure message and no habit-hooks call. A second write in the same session gives no repeat. The coach always exits 0. | — | pending |
| 5 | `structure-coaching/E2` | The install writes the default config. | The setup step writes `.cobuilder/structure-signals.json` in a temp repo after approval, and the coach reads it on the next write. | — | pending |
| | **`structure-coaching/E3` — The loop uses the agents.** A script reads one effect that shows the three agents ran the slice. | | | | |
| 6 | `structure-coaching/E3` | The agent-use check: the effect is chosen from the spike, and `verify_gate.py --slice` reads it. | The check passes for a pass at attempt 1 and for a workflow-mode slice, and it fails for no attempt file and for a slice that the main agent wrote. | — | pending |
| 7 | `structure-coaching/E3` | The slice loop text makes the main agent spawn RED, GREEN, and VALIDATE, and run the check before it closes a slice. | A blind main agent with a small design spawns the three agents in order and runs the check. One real slice runs from RED to a VALIDATE score, and the transcript is kept. | — | pending |
| | **`structure-coaching/E4` — The Structure block.** VALIDATE reports structure beside the score. | | | | |
| 8 | `structure-coaching/E4` | VALIDATE writes the Structure block: contract drift, cohesion, and each new dependency against `boundary.yaml`. | A blind VALIDATE on a fixture slice writes the block with the three judgments outside `overall_score`, and a FAIL puts the block in the feedback file. | — | pending |
| | **`structure-coaching/E5` — Replay evaluation.** The data decides what enters the score. | | | | |
| 9 | `structure-coaching/E5` | The replay with the signals on and off, and the hand label of the findings. | `evaluation.md` holds, for each condition, three runs or more of five slices, the follow-on success rate, the four secondary measures, and the precision of each signal, with a decision on the abort rule and on scored criteria. | — | pending |
| | **`structure-coaching/E6` — Review and maintenance.** Review mode and maintenance mode report the signals and their trend. Later, after E1 to E5. | | | | |
| | **`structure-coaching/E7` — Import graph.** A parser checks each import against `boundary.yaml` and draws the dependency diagram. Backlog, after E5. | | | | |
