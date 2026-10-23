# Typed schemas: what the interpreter receives and produces

Status: design, round 10. The code sketch is `schemas/interpreter_schemas.py`. It runs with `uv run`. It checks every example, one hash rule, and one plan rule. It is not the code layout.

The first spikes do not use Jev (section 1). The sketch still shows the Jev types, so a later swap is cheap. The sketch uses `dspy[typesafe]==3.4.1`. `Choice`, `Noul`, and `Score` import from `dspy.experimental`. `Score[...]` must be the field type itself. Each decision field needs `desc=` in its `OutputField`. No call to Jev or to the advisor has run yet. The one-day test makes the first call.

## 1. The two stages of the interpreter

The language model is required. Jev returns typed values only. It cannot write a reply or a question card. The interpreter therefore has two stages, and stage 1 feeds stage 2.

| Stage | Model | Input | Output | Calls for each stop brief |
|---|---|---|---|---|
| 1. Triage | spikes: `openrouter/mistralai/mistral-nemo`. Later: Jev (`typesafe:jev-latest`) | the stop brief | `Facts`: five typed values | one |
| 2. Advise | `openrouter/mistralai/mistral-nemo` | the stop brief and the facts | `Advice`: a question card and a proposal | one, when an answer is due |
| Digest | `openrouter/thinkingmachines/inkling:free` | the stop brief | `RunDigest`: a short summary of the run | one for each finished run, always |
| Shrink | the Digest model | one oversized tool result | a shorter text | none, unless the stop brief is over the budget (section 2.3) |

The first spikes do not call Jev. You asked for this so that a poor classifier cannot make the design look wrong. The `Facts` type stays the same. Only the stage 1 module changes, so a Jev module can replace it later. `dspy-modules.md` shows the modules.

I checked both models on the OpenRouter model list on 24 October 2026. Mistral Nemo has a 131,072-token window, and it lists `structured_outputs` and `response_format`. Inkling free has a 1,048,576-token window, and it lists `reasoning` but neither of those two. Inkling therefore needs the DSPy text adapter, not a JSON schema. I did not make a call, because no OpenRouter key is set on this machine.

One Jev call carries all five questions. A DSPy signature with five decision fields builds one request, `client.system_one(state=..., questions=...)`. The source is `dspy/adapters/decision.py` and `dspy/clients/typesafe.py` in version 3.4.1. I do not know whether Jev prices each question or each call.

Stage 2 runs when the facts say that an answer is due. The rule is plain Python:

1. Run stage 2 when `status` is `waiting_answer`, `waiting_permission`, `blocked`, or `failed`.
2. Run stage 2 when any confidence is below its threshold.
3. Otherwise store the facts and stop. The stop brief needs no answer.

Stage 2 runs even when `needs_human` is true. The human then sees a card with a recommended answer and does not start from nothing.

The stage 2 system prompt holds the JSON schema of `Advice`. That schema is 16,071 characters, because the `Action` type has 13 kinds. Every call sends it. Prompt caching at the provider may lower the cost. I did not check that.

## 2. Input: the stop brief

A stop brief is the exact input of the interpreter. Code builds it from the transcript when an agent stops and waits. No model builds it. The system stores each stop brief once and never edits it. The raw transcript stays in `~/.claude`, and the stop brief holds a cursor that points to it.

### 2.1 What a run holds in a real transcript

I measured the two largest transcripts of this repo (7526c296 with 18,729 records and 408 human prompts, and 48546f32) and one goal run (36752881). The numbers below come from those files only.

1. **One reply is many records.** The API returns each content block (thinking, text, tool call) as its own `assistant` record. All records of one reply share a `message.id`. A record with `stop_reason: end_turn` can hold only a thinking block, and the text sits in the next record. Code must group by `message.id` and then read the text. The last record alone is wrong.
2. **A run has many stops.** The biggest human-started turn has 10 `end_turn` replies. A reply with no tool call ends the run when nothing else wakes the agent. A wake-up record starts the run again: a task notification, a queued message, or a stop hook that refuses the stop.
3. **A goal shows as a user record.** A refused stop in a goal run arrives as a user record with `origin` null and text that starts `Stop hook feedback: [<goal text>]: <reason>`. The goal run 36752881 has 3 such records. Between the second and the third there are 1,933 records, 81 Bash calls, 24 sub-agent calls, and 104 `end_turn` replies. The last reply before the refusal was "I am waiting for the foreign-run agent". That is a stop that no human needs to see.
4. **Not every stop has a marker.** A `system` record with `subtype: stop_hook_summary` follows some stops. The two largest transcripts hold 764 of them against 1,034 `end_turn` replies. Code cannot use the marker alone. A Stop hook of our own, installed by the adapter host, gives the exact moment. I did not test that hook.
5. **Thinking is small and often absent.** In the biggest turns it is 0 to 10,000 characters, against 2,000 to 22,000 of text. The transcript also holds `thinking_drop` records.
6. **A call and its result pair by id.** The two transcripts hold 2,514 tool results, and each one matches a tool call by `tool_use_id`. None is unpaired. A failed Bash call has `is_error: true` and text that starts `Exit code N`. A passing call has `is_error: false`.
7. **A whole run is small, even with every result.** One result has a median of 643 characters and a maximum of 660,963. A whole run, with the text, the calls, and the full results, has a median of 4,286 characters across 1,117 runs. The 90th percentile is 25,058, the 99th is 99,442, and the maximum is 381,179. Eleven runs pass 100,000 characters and three pass 250,000. A run here starts at any user record that is not only tool results, so the split is approximate.
8. **The final reply is long.** Across 736 final replies the median is 2,036 characters, the 90th percentile 6,576, and the maximum 45,353.
9. **Structured questions exist.** The 53,298 records hold 41 `AskUserQuestion` calls. The call input holds the options, so a `pending` prompt with source `transcript` is exact. A permission prompt is not in the transcript until a decision exists. It needs a hook or a pane read.

### 2.2 What code can build, and what it cannot

Code reads structured JSON. It can group replies, pair each tool call with its result, read whether the result is an error, find the last text, and read the `origin` of a record. It can redact secrets. It cannot say whether the work was right, or what a question means. The stop brief therefore holds facts and no meaning. The models give the meaning.

### 2.3 The fields

| Field | Meaning | Source |
|---|---|---|
| `brief_id`, `cursor` | digest of the session id and the stop record, and the place of the stop in the transcript | code |
| `trigger` | `end_turn`, `goal_stop_attempt`, `question_tool`, or `permission_wait` | code |
| `context` | session, project, branch, workflow stage, our answers in the last hour | code and the tracker |
| `ask` | what woke the agent: its `origin` (human, goal_hook, task_notification, peer) and the full text | the record that opened the run |
| `goal` | the goal text, the count of refused stops, the last reason, and the `proof` that the loop asked for | the goal feedback records and the `continue_until` action |
| `items` | the run in order, nothing clipped. Each item is the agent's text before a call, or a tool call with its full result and its `is_error` flag | assistant and user records |
| `last_thinking` | the last thinking block. Off by default | thinking blocks |
| `final` | the full last reply of the run, redacted | grouped assistant records |
| `previous` | the `RunDigest` of the run before this one | the Digest call |
| `pending` | the prompt that waits: source, kind, options, tool, command | hook, pane, or an `AskUserQuestion` call |
| `redactions`, `allowed_kinds` | secrets removed, and the action kinds that the advisor may name | code |

Rules that follow:

1. Nothing in a stop brief is clipped. The stop brief keeps the assistant text, each tool call, and each full result. Only the redaction changes the text.
2. The renderer sets a budget of 160,000 characters for the text that a model reads. This is a guess: about 40,000 tokens, against a 131,072-token window for Mistral Nemo. I did not measure the characters for each token. Over the budget, the Shrink call replaces the largest tool results first. It never touches `ask`, `final`, or the last three exchanges. The stored `InterpreterCall` records how many results it replaced. By the measure in 2.1, about 1 run in 100 passes 100,000 characters.
3. The model reads `stop brief.for_model()`. That text leaves out `brief_id`, `cursor`, `redactions`, and `allowed_kinds`. The option `agent_reports_first` copies each sub-agent exchange into a block at the top. It is a lab option, and the lab tests whether it helps.
4. A prose question has no `pending`. The facts say `waiting_answer`, and `final` holds the question.
5. A goal run gives one stop brief for each stop attempt. The `goal` field lets the models see that the agent only waits.
6. A model summary of older turns stays off in v0.1. The `previous` field is the one exception that you asked for, the digest of the run before.

How the digest works. The Digest call reads the stop brief of a run that has just ended. It returns a `RunDigest`: what the agent did (up to 600 characters), how the run ended (up to 300), up to five open items, and up to five decisions. The system stores it as a `fact.run_digest` event. The next stop brief of the same session carries it as `previous`. It costs one model call for each finished run, and the call always runs. This includes each stop of a goal run, so the next stop brief always has a `previous`. The lab checks whether the digest helps and whether it loses facts.

### 2.4 What the lab must settle

The stop brief stores every section, and the renderer chooses what the model reads. The lab can therefore drop one section at a time and measure the effect, with no rebuild. The first ablations are the tool results in `items` (keep the calls, drop the results), `previous`, `last_thinking`, and `agent_reports_first`. I do not know which sections help. The sizes above come from one repo, and a different repo may differ.

Every model call is stored as an `InterpreterCall`. The row holds the stage, the exact text that the model received, how many tool results the Shrink call replaced, the model name, the output, and the time. A `Recommendation` links to its call rows. Section 11 shows both requests in full.

## 3. Output: the facts and the question card

| Field | DSPy type | Values |
|---|---|---|
| `status` | `Choice` | done, waiting_answer, waiting_permission, blocked, failed, continuing |
| `needs_human` | `Noul` | true or false |
| `answer_class` | `Choice` | none, approve_continue, pick_default, provide_fact, decide, external_action |
| `risk` | `Score` | low, medium, high |
| `priority_hint` | `Score` | can wait, soon, now |

DSPy confidence is the distance from the threshold. It is not a calibrated probability.

The `Question` card comes from the advisor, not from Jev:

- `ask`: the question, in 300 characters or fewer.
- `options`: a list of `Option`, each with a `label` and a `detail`.
- `multi_select`: true when the human may choose more than one option.
- `free_text`: true when the human may type an answer that is not an option. The default is true.
- `agent_recommendation`: the option that the agent picked. It is never the human's answer (petekp/inbox).
- `helps`: up to three buttons that help the human answer.

A `Help` button has a `kind`, a `label`, and a `value`. The kinds are `copy_command`, `open_file`, `open_url`, and `explain`. Example: `{"kind": "open_file", "label": "Open the API spec", "value": "docs/api.md"}`.

The petekp/inbox README does not show a field called `helps`. It says that a task comes with buttons for its steps, such as copying a command or opening a file. An earlier agent summary gave "up to three help steps". I did not verify that number. The four kinds and the limit of three are our own design.

## 4. All the proposed actions

Thirteen kinds. Nine touch the session, and four change only the inbox. The policy file owns the starting verdict. The column shows the proposed default and the reason.

| Kind | Effect | Payload | Borrowed from | Starting verdict |
|---|---|---|---|---|
| `reply` | sends text as the user | `text` | petekp/inbox answer, our addition | ASK, ALLOW for a fact already in the transcript |
| `continue` | sends a nudge to go on | none | agentbox (finished vs waiting) | ALLOW |
| `continue_until` | sends `continue` after each turn until code proves the goal | `goal`, `proof`, `max_turns`, `max_minutes` | our addition | ASK |
| `approve_permission` | answers yes to a tool prompt | `scope` once or session | Omnigent ALLOW, DENY, ASK | ALLOW for a read-only tool, else ASK. DENY on the shell deny list |
| `deny_permission` | answers no | `reason` | Omnigent | ALLOW |
| `pick_option` | picks an option by index | `index` | petekp/inbox options | ALLOW when it is the agent's own recommendation and risk is low |
| `approve_gate` | approves a CoBuilder gate (design, implement, and the others) | `gate`, `notes` | Plannotator Approve, Approve with Notes | ASK. The human changes the rule by hand |
| `send_feedback` | returns a CoBuilder gate with notes | `gate`, `notes` | Plannotator Send Feedback | ASK |
| `interrupt` | stops a running turn | none | Omnigent PTY wrapper | ASK |
| `ask_human` | puts an item in the queue | `detail`: decide, do, or review, and `why_escalated` | petekp/inbox decide and do | ALLOW, always |
| `snooze` | hides an item until a time or an event | `until`, `until_event` | agentbox away gating | ALLOW |
| `dismiss` | closes an item | `reason` | petekp/inbox skip | ALLOW |
| `set_priority_hint` | proposes a new hint after the advisor reads the full text | `hint` | agentbox: an agent cannot change its own priority | ALLOW. A rule still sets the rank |

The name `approve_gate` stays. A gate is a CoBuilder gate, not a generic approval stage. `approve_permission` answers a tool prompt of the harness, and it is a different thing.

Common fields on every action: `session_id`, `prompt_id`, `author` (interpreter, human, or rule), `evidence_quote`, and `confidence`.

The action hash is the idempotency key. It covers the kind and the payload. It does not cover `author`, `evidence_quote`, or `confidence`. A human approval and an advisor approval of the same prompt have the same hash, and the actuator sends one of them.

### 4.1 `continue_until`

This action runs a harness in a loop until the session shows evidence that it reached the stated outcome. It differs from `continue`, which sends one nudge.

**What the evidence check is.** It is a check that code runs on the transcript. It runs when the agent says that the goal is met. The goal names a command, for example `pytest -q`. The check looks in the transcript for a real Bash call that ran that command. It needs the call to have no error flag. It needs the text that the agent quoted to appear in the real result of that call. If all three hold, the check passes. The check does not run anything, and it does not judge whether the command was a good test. It only stops the agent from claiming a result that the transcript does not show.

- `goal`: the stated outcome, in words.
- `proof`: what the session must show. The kinds are `agent_shows` (the agent runs a named command and reports the result) and `human_confirms`. The field has a `command` and a `show` text, for example "the exit code and the last 5 lines".
- `max_turns` and `max_minutes`: the budget. When the budget ends, the actuator opens an `ask_human` item.

**Who checks the proof.** No part of priority.dev runs the proof. We do not have an orchestrator agent with the same access as the coding session, so nothing here can run the command and read the exit code. The session shows the evidence, and code checks that the transcript supports what the session says. This is evidence. It is not proof.

**How it works, step by step.**

1. The human, or the interpreter, writes the goal and a `proof` of kind `agent_shows`, with a command and a `show` text. The policy decides the loop once, as one action with a budget.
2. The actuator sends one message to the session: the goal, and the line "Before you stop, run `<command>` and report `<show>`".
3. The agent works. At each stop, code builds a stop brief. The stop brief holds the agent's tool calls with their full results, in order (section 2).
4. Stage 2 reads the stop brief. In a goal run it also returns an `EvidenceCheck`: `claimed_met`, a `command_quote`, and a `result_quote`. The quotes must be exact text from the stop brief.
5. Code, with no model, runs `check_evidence`. It looks for a Bash call in this run whose input contains the proof command. It needs `is_error` false for that call. It needs the `result_quote` to appear in that call's result. The data comes from the real tool result record.
6. If the check passes, the actuator stops sending `continue`. The inbox gets a class 2 item, "Goal claimed met", with the command, the result, and a button to reopen the loop. The human decides whether the evidence is enough.
7. If the check fails, the actuator sends `continue` with the reason, for example "You did not run `pytest -q` in this run". The send counts against `max_turns`.
8. If the budget ends before step 6, the actuator opens an `ask_human` item.

**What the check cannot see.** The agent can run a weaker command than the goal needs, or change the tests, or end the command with `|| true`. The transcript then shows a pass, and the check passes. The check does not judge whether the command is a good proof. It stops one failure: the agent claims a result that it never produced. Because the check reads the tool result record and not the agent's words, the agent cannot invent the result. The human stays the judge of the proof itself. A later orchestrator agent could run the command itself, and that needs its own design.

**Claude Code already has `/goal`.** I found this in the Claude Code documentation (`goal.md`) while I read the hooks. The command `/goal <condition>` keeps the session running. After each turn, a small model judges the condition from the conversation. It does not run commands. The condition may name a check and a turn limit, and it may hold 4,000 characters. This is the "Stop hook feedback" record that I measured in the goal run. Claude Code writes it, not a user.

This changes `continue_until`. Two ways exist to build it:

| | A. Our own loop (this section) | B. Send `/goal` (recommended) |
|---|---|---|
| Who sends the nudge | the actuator, after each stop | Claude Code, by its own Stop hook |
| Who judges "met" | our advisor and the evidence check | the built-in small model |
| Our evidence check | decides when the loop ends | runs after the goal clears, as a second opinion |
| What we build | the loop, the budget, the stop rules | one `reply` that holds the `/goal` text, and the check |
| Known limit | none found yet | the built-in judge reads only what the agent shows; a Stop hook may block at most 8 times in a row, and the count resets when a tool runs (`hooks.md`) |

I did not check how the transcript marks a goal that cleared. The first spike for B must read that record. Under B the action keeps its name and its fields. The `goal` and `proof` fields become the text of one `/goal` message. The `max_turns` and `max_minutes` fields become the "stop after N turns" clause that the documentation describes.

The policy decides each send inside the loop, as for any `continue`. The human can also start this action from the client, as a human-authored action. I propose the name `continue_until`. The name `goal` sounds like only a note on the session.

### 4.2 A proposal with more than one step

A `Proposal` holds one to three steps. The answer to "can one proposal hold more than one action" is yes, with these rules:

1. The policy decides each step on its own, in order, with fresh state.
2. If a step is denied, asked, or fails, the later steps do not run. The inbox gets one `ask_human` item for the rest.
3. All session steps must target one session. If the pending prompt changes between two steps, the plan stops.
4. An inbox step (`ask_human`, `snooze`, `dismiss`, `set_priority_hint`) may follow a session step.
5. The hash covers each step, not the proposal.
6. A proposal that approves a gate and returns the same gate is invalid. `approve_gate` with `notes` already means Approve with Notes. `send_feedback` means the opposite.

Example: `reply` with "1", then `continue_until` with the goal "Stop briefs 3 to 5 pass their tests". Section 11 shows it.

Not in the list, on purpose:

- **Kill a session**, **launch a session**, **change the permission mode**. These are not proposals in v0.3. A launch comes later, and it needs its own design.
- **A free shell command to the pane.** `reply` sends text to a prompt. It does not run a command. The deny list and the five unparseable-to-ASK rules still read every `reply` that looks like a command.
- **Auto-deny on a timeout** (agentbox). We do not take it. An unanswered item rises in rank and never answers itself.

## 5. Questions, actions, and responses

| Step | Who | What |
|---|---|---|
| Question | the agent | a pending prompt or a prose question in the transcript |
| Facts | Jev | one call: `status`, `needs_human`, `answer_class`, `risk`, `priority_hint` |
| Advice | the language model | a `Question` card and a `Proposal` of one to three steps |
| Verdict | the policy | ALLOW, DENY, or ASK for each step, with `rule_id` and `policy_hash` |
| Effect | the actuator | the send, after a fresh `evaluate` |
| Response | the human | one of the answers below, as a human-authored action |

The human response is an action with `author = "human"`. It goes through the same policy and the same actuator. A rule can allow it by default, because the human decided.

| Client response | Becomes |
|---|---|
| Accept the proposal | the proposed steps, `author = "human"` |
| Edit the text, then send | `reply` with the edited text |
| Choose an option | `pick_option`, or `reply` for a prose list |
| Type another answer | `reply` (when `free_text` is true) |
| Approve | `approve_permission` or `approve_gate` |
| Approve with notes | `approve_gate` with `notes` |
| Send feedback | `send_feedback` |
| Run until done | `continue_until` |
| Not now | `snooze` |
| Close | `dismiss` |

Two rules from Plannotator apply. A reply never blocks the client, and the answer arrives in the session as a message. The client warns before it drops notes that the human did not send.

Two rules from petekp/inbox apply. An option that the agent picked is never recorded as the human's answer. A malformed model reply is never dropped silently. It becomes an `Abstain` and an `ask_human` item.

## 6. Who sets the priority

Four components each set one part. The interpreter sets none of the rank.

| Part | Set by | How |
|---|---|---|
| Class 0 to 3 | the attention queue, a pure function of the policy verdict and the facts | class 0: policy ASK on a destructive action. Class 1: `status` is blocked or failed. Class 2: a question or a permission prompt. Class 3: done, FYI |
| Project rank | the human | a setting, one number for each project |
| Hint | Jev, in `priority_hint`. The advisor may change it with `set_priority_hint` | it orders items inside one class and one project. It never moves an item to another class |
| Wait time | the clock | the oldest item first |

The sort key is (class, project rank, hint, wait time). The agentbox order is project, then priority, then age. Ours puts the class first, because a destructive ASK must outrank a project rank. I did not test this order with real items.

## 7. Notification levels

The goal is to sort notifications into priority levels. A level has no upper limit. Anything that does not need immediate attention goes into a batch, and one batch counts as one notification.

| Level | Source in the attention queue | Delivery |
|---|---|---|
| N0 | class 0 | at once, ignores quiet hours |
| N1 | class 1 | at once |
| N2 | class 2 and class 3 | one batch in each window. Questions come before FYI items |

N2 and N3 of the earlier draft had the same delivery, so they are one level now. The inbox still ranks class 2 above class 3.

The batch window and the quiet hours are settings. The `NotifyConfig` type holds them. The starting window is 30 minutes. Quiet hours start at 22:00 and end at 07:00, and only N0 passes. The batch rule is a timer. The timer starts at the first item in an empty batch. When the 30 minutes end, one notification lists every item in the batch, and the next item starts a new timer. This is your round 7 answer.

## 8. Stored recommendations

The system stores every proposal, shown to the human or not. It also stores the input of the proposal. A `Recommendation` holds the proposal, the facts, a flag `shown_to_human`, and the ids of its `InterpreterCall` rows. Each call row holds the exact text that the model received. The stop brief row holds the redacted transcript input. The human's reply is an `Outcome`: accepted, edited, replaced, rejected, snoozed, or dismissed.

- The triple (stop brief, proposal, outcome) is the data for tuning the interpreter and for the lab metrics.
- A proposal that the human never saw has no outcome. It trains nothing until the human reviews a sample of it.
- The raw transcript is never copied. The stored text is already redacted. The redaction is lossy, so a stored stop brief cannot give back a secret.
- `approve_gate` stays at ASK. No rule moves it to ALLOW by itself. The human edits the policy file by hand when the stored outcomes justify it.

## 9. When the interpreter abstains

An `Abstain` event says that the interpreter proposes nothing. The inbox then gets an `ask_human` item, and the item carries the reason. The reasons are:

| Reason | Cause |
|---|---|
| `quote_not_in_brief` | the `evidence_quote` is not an exact substring of the stop brief |
| `invalid_output` | the model reply does not parse as `Advice` |
| `kind_not_allowed` | the proposal names a kind that is not in `allowed_kinds` |
| `model_timeout` | a model call did not return in time |
| `model_error` | a model call returned an error |
| `brief_empty` | the turn has no response text |

Section 11 shows an example.

## 10. Checks that this design needs

1. The sketch imports and validates (done: `uv run schemas/interpreter_schemas.py` prints `ok`).
2. The request to Jev builds from the signature (done: section 11 shows the output of `DecisionAdapter._prepare`).
3. A real Jev call returns the five typed fields for one stop brief (not done, one-day test).
4. The advisor returns a valid `Advice` for 20 recorded stop briefs (not done). The `Action` union as a DSPy output field is untested against a real model.
5. The evidence quote check rejects a proposal whose quote is not in the stop brief (not done, a unit test).
6. The 16,071-character schema in the stage 2 prompt does not lower the advisor's accuracy (not done).
7. `check_evidence` accepts a real pass and rejects four wrong cases: a wrong quote, a failed call, no call, and no goal (done: the sketch asserts all five).
8. The Digest call keeps the open questions of a run, and the Shrink call keeps the errors (not done, lab checks).
9. The adapter host Stop hook fires at every stop, including in a goal run (not done, one-day test).

## 11. Examples of the data

The data is synthetic. The sketch builds each example and checks a JSON round trip. Run `uv run schemas/interpreter_schemas.py dump` to print them. Empty fields are cut here.

**The stop brief (what is stored)**

```json
{
 "brief_id": "c096cea9b4f73d72",
 "cursor": "~/.claude/projects/-work-exporter/7c1e.jsonl@184220",
 "trigger": "end_turn",
 "context": {
  "session_id": "sess-7c1",
  "project": "exporter",
  "branch": "stop brief-2-csv",
  "workflow_stage": "implement: @@stop brief@@ 2 of 5",
  "answered_by_us_last_hour": 1
 },
 "ask": {
  "origin": "human",
  "text": "Build @@stop brief@@ 2: the CSV export endpoint. Run the tests before you stop."
 },
 "items": [
  {
   "type": "text",
   "text": "I will read the routes first, then add the writer."
  },
  {
   "type": "tool",
   "tool": "Read",
   "input": "src/export/routes.py",
   "result": "def export_routes(app):\n    ...",
   "is_error": false
  },
  {
   "type": "tool",
   "tool": "Edit",
   "input": "src/export/csv_writer.py",
   "result": "File updated.",
   "is_error": false
  },
  {
   "type": "tool",
   "tool": "Bash",
   "input": "pytest tests/export -q",
   "result": "Exit code 1\nFAILED tests/export/test_csv.py::test_header_order\n1 failed, 13 passed",
   "is_error": true
  },
  {
   "type": "text",
   "text": "One test fails on the header order. I fix the column list and run the tests again."
  },
  {
   "type": "tool",
   "tool": "Edit",
   "input": "src/export/csv_writer.py",
   "result": "File updated.",
   "is_error": false
  },
  {
   "type": "tool",
   "tool": "Bash",
   "input": "pytest tests/export -q",
   "result": "14 passed in 0.9s",
   "is_error": false
  }
 ],
 "final": "Stop brief 2 is done. 14 tests pass.\n\nBefore I start @@stop brief@@ 3, one question. Should the CSV timestamps use UTC or the project timezone?\n1. UTC (I recommend this: it matches the API)\n2. The project timezone\nReply 1 or 2.",
 "previous": {
  "ran": "Built the export model and its 9 tests.",
  "result": "Stop brief 1 done, tests pass.",
  "decisions": [
   "Money fields use integer cents"
  ]
 },
 "allowed_kinds": [
  "approve_gate",
  "approve_permission",
  "ask_human",
  "continue",
  "continue_until",
  "deny_permission",
  "dismiss",
  "interrupt",
  "pick_option",
  "reply",
  "send_feedback",
  "snooze"
 ]
}
```

**RunDigest (the Digest call, carried as previous)**

```json
{"ran": "Built the export model and its 9 tests.", "result": "Stop brief 1 done, tests pass.", "decisions": ["Money fields use integer cents"]}
```

**Facts from the Jev call**

```json
{"status": "waiting_answer", "needs_human": false, "answer_class": "pick_default", "risk": 0.2, "priority_hint": 0.3, "confidence": {"status": 0.93, "needs_human": 0.81, "answer_class": 0.88, "risk": 0.74, "priority_hint": 0.6}}
```

**Advice from the language model, with a question card**

```json
{
 "question": {
  "ask": "Use UTC or the project timezone for the CSV timestamps?",
  "options": [
   {
    "label": "UTC",
    "detail": "Matches the API"
   },
   {
    "label": "Project timezone"
   }
  ],
  "multi_select": false,
  "free_text": true,
  "agent_recommendation": "UTC",
  "helps": [
   {
    "kind": "open_file",
    "label": "Open the API spec",
    "value": "docs/api.md"
   },
   {
    "kind": "copy_command",
    "label": "Show the timestamp column",
    "value": "head -3 out/export.csv"
   }
  ]
 },
 "proposal": {
  "proposal_id": "p-1",
  "brief_id": "c096cea9b4f73d72",
  "steps": [
   {
    "session_id": "sess-7c1",
    "evidence_quote": "1. UTC (I recommend this",
    "confidence": 0.9,
    "kind": "reply",
    "text": "1"
   }
  ],
  "rationale": "The agent recommends UTC."
 }
}
```

**A goal run at a stop attempt**

```json
{
 "brief_id": "c096cea9b4f73d72",
 "cursor": "~/.claude/projects/-work-exporter/7c1e.jsonl@184220",
 "trigger": "goal_stop_attempt",
 "context": {
  "session_id": "sess-7c1",
  "project": "exporter",
  "branch": "stop brief-2-csv",
  "workflow_stage": "implement: @@stop brief@@ 2 of 5",
  "answered_by_us_last_hour": 1
 },
 "ask": {
  "origin": "goal_hook",
  "text": "Stop hook feedback: [All 5 stop briefs pass their tests]: not yet shown"
 },
 "goal": {
  "text": "All 5 stop briefs pass their tests",
  "stop_attempts": 2,
  "last_reason": "no test output shown",
  "proof": {
   "kind": "agent_shows",
   "command": "pytest -q",
   "show": "the exit code and the last 5 lines of output"
  }
 },
 "items": [
  {
   "type": "tool",
   "tool": "Bash",
   "input": "pytest -q",
   "result": "68 passed in 4.1s",
   "is_error": false
  }
 ],
 "final": "All 5 stop briefs are built. I ran pytest -q: 68 passed in 4.1s.",
 "previous": {
  "ran": "Built the export model and its 9 tests.",
  "result": "Stop brief 1 done, tests pass.",
  "decisions": [
   "Money fields use integer cents"
  ]
 },
 "allowed_kinds": [
  "approve_gate",
  "approve_permission",
  "ask_human",
  "continue",
  "continue_until",
  "deny_permission",
  "dismiss",
  "interrupt",
  "pick_option",
  "reply",
  "send_feedback",
  "snooze"
 ]
}
```

**EvidenceCheck (checked by code against the stop brief)**

```json
{"claimed_met": true, "command_quote": "pytest -q", "result_quote": "68 passed in 4.1s"}
```

**A proposal with two steps**

```json
{"proposal_id": "p-2", "brief_id": "c096cea9b4f73d72", "steps": [{"session_id": "sess-7c1", "evidence_quote": "1. UTC (I recommend this", "confidence": 0.9, "kind": "reply", "text": "1"}, {"session_id": "sess-7c1", "evidence_quote": "Before I start @@stop brief@@ 3", "confidence": 0.0, "kind": "continue_until", "goal": "Stop briefs 3 to 5 pass their tests", "proof": {"kind": "agent_shows", "command": "pytest -q", "show": "the exit code and the last 5 lines"}, "max_turns": 20, "max_minutes": 120}], "rationale": "Answer the question, then run to the end of the plan."}
```

**continue_until**

```json
{"session_id": "sess-7c1", "evidence_quote": "Reply 1 or 2.", "confidence": 0.7, "kind": "continue_until", "goal": "All 5 stop briefs pass their tests", "proof": {"kind": "agent_shows", "command": "pytest -q", "show": "the exit code and the last 5 lines"}, "max_turns": 20, "max_minutes": 120}
```

**Abstain**

```json
{"brief_id": "c096cea9b4f73d72", "reason": "quote_not_in_brief", "detail": "The quote 'Use UTC, as agreed' is not in the stop brief"}
```

**ask_human (do)**

```json
{"session_id": "sess-7c1", "confidence": 0.0, "kind": "ask_human", "detail": {"role": "do", "steps": ["Open the console", "Create the bucket"], "where": "aws console", "done_check": "The bucket name appears in the next prompt"}, "why_escalated": "Needs the AWS console"}
```

**ask_human (review)**

```json
{"session_id": "sess-7c1", "confidence": 0.0, "kind": "ask_human", "detail": {"role": "review", "artifact": "docs/plans/x/04-stop briefs.md", "check_items": ["Stop brief order"]}, "why_escalated": "The gate needs a person"}
```

**InterpreterCall (the stored row)**

```json
{"call_id": "c-1", "brief_id": "c096cea9b4f73d72", "stage": "triage", "model": "typesafe:jev-latest", "rendered_input": "(the state and the five questions, see schemas.md section 10)", "shrunk_items": 0, "output_json": "{\"status\":\"waiting_answer\",\"needs_human\":false,\"answer_class\":\"pick_default\",\"risk\":0.2,\"priority_hint\":0.3,\"confidence\":{\"status\":0.93,\"needs_human\":0.81,\"answer_class\":0.88,\"risk\":0.74,\"priority_hint\":0.6}}", "latency_ms": 410}
```

**Recommendation**

```json
{"proposal": {"proposal_id": "p-1", "brief_id": "c096cea9b4f73d72", "steps": [{"session_id": "sess-7c1", "evidence_quote": "1. UTC (I recommend this", "confidence": 0.9, "kind": "reply", "text": "1"}], "rationale": "The agent recommends UTC."}, "facts": {"status": "waiting_answer", "needs_human": false, "answer_class": "pick_default", "risk": 0.2, "priority_hint": 0.3, "confidence": {"status": 0.93, "needs_human": 0.81, "answer_class": 0.88, "risk": 0.74, "priority_hint": 0.6}}, "shown_to_human": false, "call_ids": ["c-1", "c-2"]}
```

**Outcome**

```json
{"proposal_id": "p-1", "result": "accepted", "final": {"proposal_id": "p-1", "brief_id": "c096cea9b4f73d72", "steps": [{"session_id": "sess-7c1", "evidence_quote": "1. UTC (I recommend this", "confidence": 0.9, "kind": "reply", "text": "1"}], "rationale": "The agent recommends UTC."}, "seconds_to_answer": 41.0}
```

**Notification settings**

```json
{"batch_window_minutes": 30, "quiet_hours": ["22:00", "07:00"], "timezone": "Australia/Sydney"}
```

### 11.1 The exact request to Jev (stage 1, later)

DSPy builds this request. One call carries all five questions. The inputs hold `stop brief.for_model()`.

```json
{
 "state": {
  "instructions": "Read the end of a turn. Report the state of the session.",
  "input_fields": "1. `brief_json` (str):",
  "inputs": {
   "brief_json": {
    "trigger": "end_turn",
    "context": {
     "session_id": "sess-7c1",
     "project": "exporter",
     "branch": "stop brief-2-csv",
     "workflow_stage": "implement: @@stop brief@@ 2 of 5",
     "answered_by_us_last_hour": 1
    },
    "ask": {
     "origin": "human",
     "text": "Build @@stop brief@@ 2: the CSV export endpoint. Run the tests before you stop."
    },
    "items": [
     {
      "type": "text",
      "text": "I will read the routes first, then add the writer."
     },
     {
      "type": "tool",
      "tool": "Read",
      "input": "src/export/routes.py",
      "result": "def export_routes(app):\n    ...",
      "is_error": false
     },
     {
      "type": "tool",
      "tool": "Edit",
      "input": "src/export/csv_writer.py",
      "result": "File updated.",
      "is_error": false
     },
     {
      "type": "tool",
      "tool": "Bash",
      "input": "pytest tests/export -q",
      "result": "Exit code 1\nFAILED tests/export/test_csv.py::test_header_order\n1 failed, 13 passed",
      "is_error": true
     },
     {
      "type": "text",
      "text": "One test fails on the header order. I fix the column list and run the tests again."
     },
     {
      "type": "tool",
      "tool": "Edit",
      "input": "src/export/csv_writer.py",
      "result": "File updated.",
      "is_error": false
     },
     {
      "type": "tool",
      "tool": "Bash",
      "input": "pytest tests/export -q",
      "result": "14 passed in 0.9s",
      "is_error": false
     }
    ],
    "final": "Stop brief 2 is done. 14 tests pass.\n\nBefore I start @@stop brief@@ 3, one question. Should the CSV timestamps use UTC or the project timezone?\n1. UTC (I recommend this: it matches the API)\n2. The project timezone\nReply 1 or 2.",
    "previous": {
     "ran": "Built the export model and its 9 tests.",
     "result": "Stop brief 1 done, tests pass.",
     "open_items": [],
     "decisions": [
      "Money fields use integer cents"
     ]
    }
   }
  }
 },
 "questions": {
  "status": {
   "instructions": "What the session does now",
   "type": "choice",
   "criteria": {
    "done": "The agent finished and asks for nothing",
    "waiting_answer": "The agent asks a question",
    "waiting_permission": "A tool prompt waits for yes or no",
    "blocked": "The agent cannot go on without outside help",
    "failed": "The agent stopped on an error",
    "continuing": "The agent still works"
   }
  },
  "needs_human": {
   "instructions": "Whether only the human can give the answer",
   "type": "noul",
   "criteria": {
    "true": "Only the human can answer",
    "false": "An advisor may answer"
   }
  },
  "answer_class": {
   "instructions": "The kind of answer that is due",
   "type": "choice",
   "criteria": {
    "none": "No answer is due",
    "approve_continue": "Yes or go on",
    "pick_default": "Pick the option the agent recommends",
    "provide_fact": "A fact the human holds",
    "decide": "A choice with a cost the human owns",
    "external_action": "The human must act outside the session"
   }
  },
  "risk": {
   "instructions": "The cost of a wrong answer",
   "type": "score",
   "criteria": [
    "low: reversible and local",
    "medium: costly to undo",
    "high: destructive or outside"
   ]
  },
  "priority_hint": {
   "instructions": "How soon the human should look",
   "type": "score",
   "criteria": [
    "can wait",
    "soon",
    "now"
   ]
  }
 }
}
```

### 11.2 The exact request to the language model (stage 2)

The system message ends with the JSON schema of `Advice`. That schema has 16071 characters, and it is cut here. The user message is the exact text.

```
[system]
Your input fields are:
1. `brief_json` (str): 
2. `facts_json` (str): The five typed facts from the triage call
Your output fields are:
1. `advice` (Advice):
All interactions will be structured in the following way, with the appropriate values filled in.

[[ ## brief_json ## ]]
{brief_json}

[[ ## facts_json ## ]]
{facts_json}

[[ ## advice ## ]]
{advice}        # note: the value you produce must adhere to the JSON schema: {... JSON schema of Advice, cut ...}


[[ ## completed ## ]]
In adhering to this structure, your objective is: 
        Write the question card and propose the next steps for a waiting session.

[user]
[[ ## brief_json ## ]]
{"trigger": "end_turn", "context": {"session_id": "sess-7c1", "project": "exporter", "branch": "stop brief-2-csv", "workflow_stage": "implement: @@stop brief@@ 2 of 5", "answered_by_us_last_hour": 1}, "ask": {"origin": "human", "text": "Build @@stop brief@@ 2: the CSV export endpoint. Run the tests before you stop."}, "items": [{"type": "text", "text": "I will read the routes first, then add the writer."}, {"type": "tool", "tool": "Read", "input": "src/export/routes.py", "result": "def export_routes(app):\n    ...", "is_error": false}, {"type": "tool", "tool": "Edit", "input": "src/export/csv_writer.py", "result": "File updated.", "is_error": false}, {"type": "tool", "tool": "Bash", "input": "pytest tests/export -q", "result": "Exit code 1\nFAILED tests/export/test_csv.py::test_header_order\n1 failed, 13 passed", "is_error": true}, {"type": "text", "text": "One test fails on the header order. I fix the column list and run the tests again."}, {"type": "tool", "tool": "Edit", "input": "src/export/csv_writer.py", "result": "File updated.", "is_error": false}, {"type": "tool", "tool": "Bash", "input": "pytest tests/export -q", "result": "14 passed in 0.9s", "is_error": false}], "final": "Stop brief 2 is done. 14 tests pass.\n\nBefore I start @@stop brief@@ 3, one question. Should the CSV timestamps use UTC or the project timezone?\n1. UTC (I recommend this: it matches the API)\n2. The project timezone\nReply 1 or 2.", "previous": {"ran": "Built the export model and its 9 tests.", "result": "Stop brief 1 done, tests pass.", "open_items": [], "decisions": ["Money fields use integer cents"]}}

[[ ## facts_json ## ]]
{"status":"waiting_answer","needs_human":false,"answer_class":"pick_default","risk":0.2,"priority_hint":0.3,"confidence":{"status":0.93,"needs_human":0.81,"answer_class":0.88,"risk":0.74,"priority_hint":0.6}}

Respond with the corresponding output fields, starting with the field `[[ ## advice ## ]]` (must be formatted as a valid Python Advice), and then ending with the marker for `[[ ## completed ## ]]`.
```
