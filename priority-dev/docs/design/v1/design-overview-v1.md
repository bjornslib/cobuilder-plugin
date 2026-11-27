> Superseded in part on 2026-10-22. The engineer rejected a plain-code status reducer, a web-only inbox, a desktop-only notification, and a service that runs outside Docker. Read `../design-overview.md` for the current high-level design. Sections from "Hard part 1" onward are kept for the stage 5 review and are not yet revised.

# priority.dev design overview

Status: draft. Stages 0 to 4 of `/architect:design` have run in the session. Stage 5 has not run, so no design record, no ADR, and no glossary change exists yet. This file is the source of record for the page `.lavish/priority-dev-design.html`. Date: 2026-10-21.

## Outcome

A developer runs up to 20 coding agents across several projects. Only the sessions that need a human reach the developer, ranked by the developer's own priorities. An advisor answers the rest under a policy that the developer sets and can audit.

Done when:

- The developer sees one ranked list of the items that wait for a human.
- A session that needs no human never interrupts the developer.
- Every automatic action has a ledger entry that names the policy rule and the evidence.
- A high-priority item interrupts at once. A low-priority item waits for a batch.
- The tmux adapter works first. A second adapter can replace it with no change to the interpreter or the actuator.

Not goals now: an evaluation target, a cloud host, and any dependency on herdr.

## Problem

Today the developer runs 4 or 5 agents. Each agent interrupts the developer in the order of arrival. The interruption ignores the developer's priorities. Many interruptions need no human, such as a routine permission or a question that the task record already answers. At 20 agents the developer cannot keep focus.

## Decisions the engineer made in the session

- The name is priority.dev.
- The system has three parts. Adapters read events and send input. An interpreter decides what the events mean. An actuator takes actions.
- The tmux adapter comes first. No part may depend on herdr.
- The system runs locally first. A cloud host with resumable sessions comes later.
- The advisor may approve gates and make decisions.
- The engineer configures the allowed actions. Only insecure and destructive actions are off limits.
- No evaluation target is set yet. The design must get three things right: status from transcripts, respond versus escalate, and immediate versus batched delivery.

## What the design takes from the research

| Source | Taken | Not taken |
|---|---|---|
| petekp/inbox | The split of an event into decide, do, and skip. A typed item with options and a recommendation. The rule that an option the agent picked is never the human's answer. | One session at a time. Silent drop of a malformed reply. No audit log. |
| agentbox | Ranking by project, then priority, then age. Only the top level interrupts. An append-only ledger with epoch fencing. A lease for a live claim. A risk tier of low, look, and risky. | No rule for auto-reply. Status changes that no code enforces. A 15 minute auto-deny. |
| Plannotator | One adapter for each harness. A non-blocking reply that arrives as a later message. The decision of Send Feedback, Approve with Notes, or Approve. | No rule for what reaches the human. Remote mode with no authentication. |
| herdr | The status vocabulary and the event stream. The finding that a screen detector shows idle for a question in prose. | Any dependency on the tool. |
| pi Durable | The idea of a resumable session record. | Any dependency now. It is experimental and its API changes without notice. |

## Approach

### Six parts

1. **Session adapter.** A plugin with two halves. The signal source reads events. The transport sends input and manages the session. The first adapter is `tmux`. Its signal source uses Claude Code hooks and the transcript file. It reads the pane screen only as a fallback.
2. **Event log.** An append-only file for each project. Each line holds a session id, a cursor, a time, a kind, and a reference to the payload. The cursor is a transcript byte offset, or a counter for a source with no file. Every other part reads from the last cursor it acknowledged.
3. **Interpreter.** A status reducer and the advisor. The reducer turns events into a coarse status with plain code. The advisor is a short Claude call. It reads the end of a turn and returns a verdict and a decision. Each verdict is keyed to a session, a cursor, and a policy version, so no turn is judged twice.
4. **Policy.** A file that holds project rank, priority classes, allowed action classes, and delivery rules. It also holds the fixed deny list. The deny list is code. No setting and no prompt can remove it.
5. **Actuator.** The only part that sends input or records a gate approval. It checks the policy and the deny list, writes an intent to the log, sends the command, and then records the effect. A mismatch between intent and effect escalates.
6. **Attention queue and web inbox.** The queue ranks items and plans delivery. The inbox shows the ranked list, the fleet board, the ledger, and the policy editor. A resident local service hosts the queue, the interpreter, the actuator, and the inbox API.

### Contracts (predictions, not checks)

- `SessionEvent`: `session_id`, `cursor`, `ts`, `kind`, `ref`. The kinds are `session_started`, `prompt_submitted`, `tool_requested`, `permission_requested`, `turn_ended`, `notification`, `session_ended`, and `liveness`.
- `Command`: `kind`, `session_id`, `intent_id`. The kinds are `send_text`, `send_keys`, `answer_permission`, `interrupt`, `start`, and `stop`.
- `Verdict`: `session_id`, `cursor`, `policy_version`, `status`, `attention_kind`, `question`, `evidence`, `confidence`. The attention kinds are `skip`, `answer`, `decide`, and `do`.
- `Decision`: `action` (`answer`, `escalate`, or `wait`), `reply`, `rule_id`, `risk_tier`, `rationale`.
- `Intent` and `Effect`: written to the log before and after each command. The ledger joins them.

### Hard part 1: status from transcripts

- Layer one is plain code. It reduces hook events and pane liveness to `working`, `waiting_permission`, `turn_ended`, `ended`, and `lost`.
- Layer two runs only at `turn_ended`. The advisor reads the last turn and sets the status to `done`, `waiting_answer`, `blocked`, or `failed`. It quotes the line that supports the status.
- A session with no events for a set time while `working` becomes `stuck`. The time is not set yet. Shadow mode will supply it.
- The advisor treats the transcript as untrusted data. A command in the transcript is text, never an instruction.

### Hard part 2: respond or escalate

1. The advisor classifies the item as `skip`, `answer`, `decide`, or `do`. Only the human can answer a `decide` or a `do` item.
2. For an `answer` item, the advisor drafts a reply with evidence from the task record, the policy, and earlier decisions.
3. The actuator sends the reply only if all four checks pass. The policy allows the action class. The deny list passes. The decision has the right shape. The confidence meets the tier of the action.
4. In every other case the item escalates. A malformed reply escalates. The system never drops an item in silence.
5. An escalation carries a recommended answer, the options, the evidence, and what happens if the human does not answer.
6. Shadow mode comes first. The advisor writes decisions and the actuator sends nothing. The log records what the developer did instead. The record shows where the advisor is right.
7. The system suggests a rule when the developer answers the same prompt the same way three times. The developer accepts or refuses the rule.

### Hard part 3: immediate or batched

- The developer sets priority. The advisor may suggest a class and never sets one.
- Order: project rank, then priority class, then age.
- Urgent items interrupt at once with a notification. High items wait for the next batch window. Medium and Low items wait for a longer window or for the next time the developer opens the inbox.
- An item that waits past its limit moves up one class. It is never answered by default.
- The window lengths are proposals: 15 minutes for High, and 60 minutes for Medium and Low. No data supports them yet.
- The inbox shows the wait time of each item, because a parked agent costs time.

### Fixed deny list (draft for review)

- Destructive: deleting outside the project folder, force push, deleting a remote branch, dropping a database, `git reset --hard` on unpushed work.
- Insecure: sending a secret to a network host, writing a credential to a file or a log, turning off a permission or sandbox check, putting an API key in a worker environment, running a downloaded script that no one reviewed.
- The check runs in the actuator and, for hook events, at the hook. The hook event holds the tool input in a structured form, so the check does not parse a screen.

## Challenge (stage 4)

| Challenge | Citation | Result |
|---|---|---|
| A screen-reading adapter cannot see a question in prose and cannot parse a command for the deny list. Hooks and the transcript can. | ADR-0041 (implement already ships a hook), ADR-0040 (port and adapters), herdr finding | The approach changes. The tmux adapter keeps tmux as the transport and takes its signal from hooks. |
| Removing the daemon, as one frame proposed, breaks the web inbox and the batch timers. | district `viewer`, ADR-0034 | Rejected. A resident local service stays. |
| Rewinding an agent to an earlier transcript position cannot undo file or git effects. | district `scripts` | Rejected as a feature. The verdict journal and the counterexample idea stay. |
| A policy built only from observed answers cannot cover a new prompt. | CLAUDE.md principle 2 | Reduced to rule suggestions. The developer's configured policy stays the authority. |
| Agent output is untrusted input to the advisor. A forged transcript could ask for an approval. | harness security, CLAUDE.md principle 8 | The deny list is code. The advisor never holds the power to remove it. |

## Rules of the repo that the design touches

1. Principle 2: Claude writes judgment and scripts move data. The advisor prompt lives in a reference file, Claude writes each reply, and the service only validates and sends.
2. Principle 5: only `implement` ships agents and no plugin ships an MCP server. The advisor is a headless Claude call, not an agent file. A new plugin that ships hooks needs an ADR that amends principle 5.
3. Principle 7: outside the bundle only `pr:generate` may push. If the advisor approves a push that an agent asks for, the agent acts under a delegated approval. The engineer must rule on this.
4. Principle 10: gate state goes through `tracker.py`. A gate holds a date and no approver. Until the port holds an approver, a note carries the ledger id.
5. The repo has no deploy step. A resident local service is new. `view_server.py` is the nearest precedent.
6. The viewer is static and reads `../data/*`. A live inbox needs an API. A server must not root inside `viewer/`.
7. The word adapter already names a tracker adapter. The glossary needs the full names session adapter and tracker adapter.

## Open questions

1. Placement: a new plugin `priority`, or inside `artifact`. A new plugin changes the plugin count in `README.md`, `CLAUDE.md`, and `DDD-VOCABULARY.md`.
2. Advisor shape: a short call for each event. The engineer has not confirmed it.
3. One model call for status and decision, or two.
4. Whether principle 7 allows the advisor to approve a push or a pull request.
5. The content of the fixed deny list.
6. The default delivery windows.
7. How a gate approval shows the approver.
8. Whether the product name priority.dev is also the plugin name.

## Unverified claims

- The fields of the Claude Code hook input, the stability of the transcript format, and the return values that a hook can give (allow, deny, and a reply from a stop hook). I believe each of these and have not verified them in this session.
- agentbox and petekp/inbox facts come from WebFetch summaries of the source. The cost figure of about 0.5 cents for each reply comes from the petekp/inbox README and is not measured.
- herdr facts come from a read of `/home/user/herdr_fork` by a subagent that built and ran nothing.
- The pi Durable facts come from web pages. The API is experimental.
- `inventory.yaml` in the self bundle dates from 2026-08-19. Several district summaries are out of date. I did not rebuild it.

## Deviations from the `/architect:design` procedure

1. The skill is not registered in this session. I read `SKILL.md` and `design-mode.md` and followed them.
2. Stage 0: the engineer gave the name after I had read the skill files and searched 25 existing designs. The search found no duplicate.
3. Stage 1: I read the inventory, the tracker port, and the viewer layout. I did not run the baseline, load the corpus files, or match a stack card.
4. Stage 2: the interview ran in chat across several messages. The stop condition was replaced by the engineer's decision to set no evaluation target.
5. Stage 3: six isolated Haiku calls each returned one short option. A separate critic agent did not run. I ran the critic pass inline.
6. Stage 4: no ADR draft exists, so the citations point to existing ADRs and districts.
7. Diagrams: the workflow names three Mermaid levels and a runtime diagram that is not a numbered level. The page shows the runtime diagram as level 4 at the engineer's request.
8. The files sit in `.lavish/priority-dev/` and not in `docs/architecture/designs/`. No `goal.json` exists, and I did not check how `build_index.py` treats a folder with no `goal.json`.
9. Level 1 went back to the diagram subagent once, because the first layout crossed lines and overlapped labels. The rewrite drops the boundary box and 6 arrows. Two flaws remain: the labels "tracker.py" and "append, cursor" touch their boxes, and "answers" brushes the Developer icon. Reads of the event log and writes of intent and effect appear in the descriptions, not as arrows.
