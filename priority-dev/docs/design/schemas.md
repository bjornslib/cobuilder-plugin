# Typed schemas: what the interpreter receives and produces

Status: design, round 8. The code sketch is `schemas/interpreter_schemas.py`. It runs with `uv run`. It checks every example, one hash rule, and one plan rule. It is not the code layout.

The sketch uses `dspy[typesafe]==3.4.1`. `Choice`, `Noul`, and `Score` import from `dspy.experimental`. `Score[...]` must be the field type itself. Each decision field needs `desc=` in its `OutputField`. No call to Jev or to the advisor has run yet. The one-day test makes the first call.

## 1. The two stages of the interpreter

The language model is required. Jev returns typed values only. It cannot write a reply or a question card. The interpreter therefore has two stages, and stage 1 feeds stage 2.

| Stage | Model | Input | Output | Calls for each slice |
|---|---|---|---|---|
| 1. Triage | Jev (`typesafe:jev-latest`) | the slice | `Facts`: five typed values with confidence | one |
| 2. Advise | the language model (`openrouter/anthropic/claude-haiku-5.5`) | the slice and the facts | `Advice`: a question card and a proposal | one, when an answer is due |

One Jev call carries all five questions. A DSPy signature with five decision fields builds one request, `client.system_one(state=..., questions=...)`. The source is `dspy/adapters/decision.py` and `dspy/clients/typesafe.py` in version 3.4.1. I do not know whether Jev prices each question or each call.

Stage 2 runs when the facts say that an answer is due. The rule is plain Python:

1. Run stage 2 when `status` is `waiting_answer`, `waiting_permission`, `blocked`, or `failed`.
2. Run stage 2 when any confidence is below its threshold.
3. Otherwise store the facts and stop. The slice needs no answer.

Stage 2 runs even when `needs_human` is true. The human then sees a card with a recommended answer and does not start from nothing.

The stage 2 system prompt holds the JSON schema of `Advice`. That schema is 15,445 characters, because the `Action` type has 13 kinds. Every call sends it. Prompt caching at the provider may lower the cost. I did not check that.

## 2. Input: the turn slice

A slice is the exact input of the interpreter. Code builds it from the transcript when an agent stops and waits. No model builds it. The system stores each slice once and never edits it. The raw transcript stays in `~/.claude`, and the slice holds a cursor that points to it.

### 2.1 What a run holds in a real transcript

I measured the largest transcript of this repo (7526c296, 18,729 records, 408 human prompts) and one goal run (36752881). The numbers below are from those two files only.

1. **One reply is many records.** The API returns each content block (thinking, text, tool call) as its own `assistant` record. All records of one reply share a `message.id`. A record with `stop_reason: end_turn` can hold only a thinking block, and the text sits in the next record. Code must group by `message.id` and then read the text. The last record alone is wrong.
2. **A run has many stops.** The biggest human-started turn has 10 `end_turn` replies. A reply with no tool call ends the run when nothing else wakes the agent. A wake-up record starts the run again: a task notification, a queued message, or a stop hook that refuses the stop.
3. **A goal shows as a user record.** A refused stop in a goal run arrives as a user record with `origin` null and text that starts `Stop hook feedback: [<goal text>]: <reason>`. The goal run 36752881 has 3 such records. Between the second and the third there are 1,933 records, 81 Bash calls, 24 sub-agent calls, and 104 `end_turn` replies. The last reply before the refusal was "I am waiting for the foreign-run agent". That is a stop that no human needs to see.
4. **Stops have a marker.** A `system` record with `subtype: stop_hook_summary` follows each stop. A `turn_duration` record follows a real end. I did not check that every stop has one. A Stop hook of our own, installed by the adapter host, gives the exact moment, and I did not test it.
5. **Thinking is small and often absent.** In the biggest turns it is 0 to 10,000 characters, against 2,000 to 22,000 of text. The transcript also holds `thinking_drop` records.
6. **Tool results are large and mostly noise.** The median is 643 characters, the 90th percentile 4,600, and the maximum 660,963.
7. **The final reply is long enough to clip.** Across 736 final replies the median is 2,036 characters, the 90th percentile 6,576, and the maximum 45,353.
8. **Structured questions exist.** The 53,298 records hold 41 `AskUserQuestion` calls. The call input holds the options, so a `pending` prompt with source `transcript` is exact. A permission prompt is not in the transcript until a decision exists. It needs a hook or a pane read.

### 2.2 What code can build, and what it cannot

Code reads structured JSON. It can say which tool ran, on which path or command, and whether the result had an error. It can group replies, find the last text, count steps, and read the `origin` of a record. It can clip and redact. It cannot say whether the work was right, or what a question means. The slice therefore holds facts and no meaning. The models give the meaning.

### 2.3 The fields

| Field | Meaning | Source |
|---|---|---|
| `slice_id`, `cursor` | digest of the session id and the stop record, and the place of the stop in the transcript | code |
| `trigger` | `end_turn`, `goal_stop_attempt`, `question_tool`, or `permission_wait` | code |
| `context` | session, project, branch, workflow stage, our answers in the last hour | code and the tracker |
| `ask` | what woke the agent: its `origin` (human, goal_hook, task_notification, peer) and the text, at most 1,500 characters | the record that opened the run |
| `goal` | the goal text, the count of refused stops, and the last reason | the goal feedback records |
| `notes` | the assistant text that came before a tool call in this run, up to 6, each clipped | text blocks that are not the last reply |
| `steps` | a count, a count for each tool, the last 8 calls in full, and the first 5 errors in full | tool call and result records |
| `agent_reports` | up to 4 sub-agent calls with the first 800 characters of each result | `Agent` call and result records |
| `last_thinking` | the last thinking block. Off by default | thinking blocks |
| `final` | the last reply, redacted. For a reply over 7,500 characters: the first 1,500 and the last 6,000 | grouped assistant records |
| `previous` | the run before this one, compact: its ask (400 characters), a step count, and its final reply (800 characters) | the earlier run |
| `pending` | the prompt that waits: source, kind, options, tool, command | hook, pane, or an `AskUserQuestion` call |
| `redactions`, `allowed_kinds` | secrets removed, and the action kinds that the advisor may name | code |

Rules that follow:

1. Tool results are not in the slice, with two exceptions: the first line of an error, and the start of a sub-agent result. The cursor still reaches the full text.
2. The `final` text keeps its tail, because a question comes at the end of a reply.
3. The model reads `slice.for_model()`. That text leaves out `slice_id`, `cursor`, `redactions`, `allowed_kinds`, and `final_chars`.
4. A prose question has no `pending`. The facts say `waiting_answer`, and `final` holds the question.
5. A goal run gives one slice for each stop attempt. The `goal` field lets the models see that the agent only waits.
6. A model summary of older turns stays off in v0.1. The `previous` field gives the one older run that you asked for, built by code.

### 2.4 What the lab must settle

The slice stores every section, and the renderer chooses what the model reads. The lab can therefore drop one section at a time and measure the effect, with no rebuild. The first ablations are `notes`, `steps`, `previous`, and `last_thinking`. I do not know which sections help. The sizes above are a guess from one repo, and a different repo may differ.

Every model call is stored as an `InterpreterCall`. The row holds the exact text that the model received, how many characters the clip removed, the model name, the output, and the time. A `Recommendation` links to its call rows. Section 11 shows both requests in full.

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

This action runs a harness in a loop until code proves that it reached the stated outcome. It differs from `continue`, which sends one nudge.

- `goal`: the stated outcome, in words.
- `proof`: how code checks it. The kinds are `command_exit_zero` (a command returns 0), `file_exists`, and `human_confirms`. The agent saying that it is done is never proof (CLAUDE.md principle 8).
- `max_turns` and `max_minutes`: the budget. When the budget ends, the actuator opens an `ask_human` item.

Three parties touch the proof. The interpreter proposes it and never runs it. The policy decides it before the loop starts, and a `command_exit_zero` command must pass the same shell deny list as any command. The actuator runs it through the adapter host after each stop, in the project folder, and records the exit code and the tail of the output as a `fact.proof_result` event. The agent never checks its own proof. A proof command runs with your rights, so a command with side effects (for example a test that writes files) is a risk. I recommend that the policy asks you to approve the proof command when the loop starts. The policy decides the loop once, as one action with a budget. It still decides each send inside the loop, and it evaluates the proof command against the shell deny list. I propose the name `continue_until`. The name `goal` sounds like only a note on the session. The human can also start this action from the client, as a human-authored action.

### 4.2 A proposal with more than one step

A `Proposal` holds one to three steps. The answer to "can one proposal hold more than one action" is yes, with these rules:

1. The policy decides each step on its own, in order, with fresh state.
2. If a step is denied, asked, or fails, the later steps do not run. The inbox gets one `ask_human` item for the rest.
3. All session steps must target one session. If the pending prompt changes between two steps, the plan stops.
4. An inbox step (`ask_human`, `snooze`, `dismiss`, `set_priority_hint`) may follow a session step.
5. The hash covers each step, not the proposal.
6. A proposal that approves a gate and returns the same gate is invalid. `approve_gate` with `notes` already means Approve with Notes. `send_feedback` means the opposite.

Example: `reply` with "1", then `continue_until` with the goal "Slices 3 to 5 pass their tests". Section 11 shows it.

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

The system stores every proposal, shown to the human or not. It also stores the input of the proposal. A `Recommendation` holds the proposal, the facts, a flag `shown_to_human`, and the ids of its `InterpreterCall` rows. Each call row holds the exact text that the model received. The slice row holds the redacted transcript input. The human's reply is an `Outcome`: accepted, edited, replaced, rejected, snoozed, or dismissed.

- The triple (slice, proposal, outcome) is the data for tuning the interpreter and for the lab metrics.
- A proposal that the human never saw has no outcome. It trains nothing until the human reviews a sample of it.
- The raw transcript is never copied. The stored text is already redacted. The redaction is lossy, so a stored slice cannot give back a secret.
- `approve_gate` stays at ASK. No rule moves it to ALLOW by itself. The human edits the policy file by hand when the stored outcomes justify it.

## 9. When the interpreter abstains

An `Abstain` event says that the interpreter proposes nothing. The inbox then gets an `ask_human` item, and the item carries the reason. The reasons are:

| Reason | Cause |
|---|---|
| `quote_not_in_slice` | the `evidence_quote` is not an exact substring of the slice |
| `invalid_output` | the model reply does not parse as `Advice` |
| `kind_not_allowed` | the proposal names a kind that is not in `allowed_kinds` |
| `model_timeout` | a model call did not return in time |
| `model_error` | a model call returned an error |
| `slice_empty` | the turn has no response text |

Section 11 shows an example.

## 10. Checks that this design needs

1. The sketch imports and validates (done: `uv run schemas/interpreter_schemas.py` prints `ok`).
2. The request to Jev builds from the signature (done: section 11 shows the output of `DecisionAdapter._prepare`).
3. A real Jev call returns the five typed fields for one slice (not done, one-day test).
4. The advisor returns a valid `Advice` for 20 recorded slices (not done). The `Action` union as a DSPy output field is untested against a real model.
5. The evidence quote check rejects a proposal whose quote is not in the slice (not done, a unit test).
6. The 15,445-character schema in the stage 2 prompt does not lower the advisor's accuracy (not done).

## 11. Examples of the data

The data is synthetic. The sketch builds each example and checks a JSON round trip. Run `uv run schemas/interpreter_schemas.py dump` to print them. Empty fields are cut here.

**The turn slice (what is stored)**

```json
{
 "slice_id": "c096cea9b4f73d72",
 "cursor": "~/.claude/projects/-work-exporter/7c1e.jsonl@184220",
 "trigger": "end_turn",
 "context": {
  "session_id": "sess-7c1",
  "project": "exporter",
  "branch": "slice-2-csv",
  "workflow_stage": "implement: slice 2 of 5",
  "answered_by_us_last_hour": 1
 },
 "ask": {
  "origin": "human",
  "text": "Build slice 2: the CSV export endpoint. Run the tests before you stop."
 },
 "notes": [
  "I will read the routes first, then add the writer.",
  "Tests pass. I check the timestamp format."
 ],
 "steps": {
  "total": 9,
  "by_tool": {
   "Read": 4,
   "Edit": 3,
   "Bash": 2
  },
  "last": [
   {
    "tool": "Edit",
    "target": "src/export/csv_writer.py",
    "outcome": "ok"
   },
   {
    "tool": "Bash",
    "target": "pytest tests/export -q",
    "outcome": "ok"
   }
  ],
  "errors": [
   {
    "tool": "Bash",
    "target": "pytest tests/export -q",
    "outcome": "error",
    "note": "1 failed: test_header_order"
   }
  ]
 },
 "final": "Slice 2 is done. 14 tests pass.\n\nBefore I start slice 3, one question. Should the CSV timestamps use UTC or the project timezone?\n1. UTC (I recommend this: it matches the API)\n2. The project timezone\nReply 1 or 2.",
 "final_chars": 288,
 "previous": {
  "ask": "Build slice 1: the export model.",
  "steps_total": 14,
  "by_tool": {
   "Read": 6,
   "Edit": 5,
   "Bash": 3
  },
  "final": "Slice 1 is done. 9 tests pass. Starting slice 2 next."
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
  "slice_id": "c096cea9b4f73d72",
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

**A proposal with two steps**

```json
{"proposal_id": "p-2", "slice_id": "c096cea9b4f73d72", "steps": [{"session_id": "sess-7c1", "evidence_quote": "1. UTC (I recommend this", "confidence": 0.9, "kind": "reply", "text": "1"}, {"session_id": "sess-7c1", "evidence_quote": "Before I start slice 3", "confidence": 0.0, "kind": "continue_until", "goal": "Slices 3 to 5 pass their tests", "proof": {"kind": "command_exit_zero", "value": "pytest -q"}, "max_turns": 20, "max_minutes": 120}], "rationale": "Answer the question, then run to the end of the plan."}
```

**continue_until**

```json
{"session_id": "sess-7c1", "evidence_quote": "Reply 1 or 2.", "confidence": 0.7, "kind": "continue_until", "goal": "All 5 slices pass their tests", "proof": {"kind": "command_exit_zero", "value": "pytest -q"}, "max_turns": 20, "max_minutes": 120}
```

**Abstain**

```json
{"slice_id": "c096cea9b4f73d72", "reason": "quote_not_in_slice", "detail": "The quote 'Use UTC, as agreed' is not in the slice"}
```

**ask_human (do)**

```json
{"session_id": "sess-7c1", "confidence": 0.0, "kind": "ask_human", "detail": {"role": "do", "steps": ["Open the console", "Create the bucket"], "where": "aws console", "done_check": "The bucket name appears in the next prompt"}, "why_escalated": "Needs the AWS console"}
```

**ask_human (review)**

```json
{"session_id": "sess-7c1", "confidence": 0.0, "kind": "ask_human", "detail": {"role": "review", "artifact": "docs/plans/x/04-slices.md", "check_items": ["Slice order"]}, "why_escalated": "The gate needs a person"}
```

**InterpreterCall (the stored row)**

```json
{"call_id": "c-1", "slice_id": "c096cea9b4f73d72", "stage": "triage", "model": "typesafe:jev-latest", "rendered_input": "(the state and the five questions, see schemas.md section 10)", "clipped_chars": 0, "output_json": "{\"status\":\"waiting_answer\",\"needs_human\":false,\"answer_class\":\"pick_default\",\"risk\":0.2,\"priority_hint\":0.3,\"confidence\":{\"status\":0.93,\"needs_human\":0.81,\"answer_class\":0.88,\"risk\":0.74,\"priority_hint\":0.6}}", "latency_ms": 410}
```

**Recommendation**

```json
{"proposal": {"proposal_id": "p-1", "slice_id": "c096cea9b4f73d72", "steps": [{"session_id": "sess-7c1", "evidence_quote": "1. UTC (I recommend this", "confidence": 0.9, "kind": "reply", "text": "1"}], "rationale": "The agent recommends UTC."}, "facts": {"status": "waiting_answer", "needs_human": false, "answer_class": "pick_default", "risk": 0.2, "priority_hint": 0.3, "confidence": {"status": 0.93, "needs_human": 0.81, "answer_class": 0.88, "risk": 0.74, "priority_hint": 0.6}}, "shown_to_human": false, "call_ids": ["c-1", "c-2"]}
```

**Outcome**

```json
{"proposal_id": "p-1", "result": "accepted", "final": {"proposal_id": "p-1", "slice_id": "c096cea9b4f73d72", "steps": [{"session_id": "sess-7c1", "evidence_quote": "1. UTC (I recommend this", "confidence": 0.9, "kind": "reply", "text": "1"}], "rationale": "The agent recommends UTC."}, "seconds_to_answer": 41.0}
```

**Notification settings**

```json
{"batch_window_minutes": 30, "quiet_hours": ["22:00", "07:00"], "timezone": "Australia/Sydney"}
```

### 11.1 The exact request to Jev (stage 1)

DSPy builds this request. One call carries all five questions. The inputs hold `slice.for_model()`.

```json
{
 "state": {
  "instructions": "Read the end of a turn. Report the state of the session.",
  "input_fields": "1. `slice_json` (str):",
  "inputs": {
   "slice_json": {
    "trigger": "end_turn",
    "context": {
     "session_id": "sess-7c1",
     "project": "exporter",
     "branch": "slice-2-csv",
     "workflow_stage": "implement: slice 2 of 5",
     "answered_by_us_last_hour": 1
    },
    "ask": {
     "origin": "human",
     "text": "Build slice 2: the CSV export endpoint. Run the tests before you stop."
    },
    "notes": [
     "I will read the routes first, then add the writer.",
     "Tests pass. I check the timestamp format."
    ],
    "steps": {
     "total": 9,
     "by_tool": {
      "Read": 4,
      "Edit": 3,
      "Bash": 2
     },
     "last": [
      {
       "tool": "Edit",
       "target": "src/export/csv_writer.py",
       "outcome": "ok",
       "note": ""
      },
      {
       "tool": "Bash",
       "target": "pytest tests/export -q",
       "outcome": "ok",
       "note": ""
      }
     ],
     "errors": [
      {
       "tool": "Bash",
       "target": "pytest tests/export -q",
       "outcome": "error",
       "note": "1 failed: test_header_order"
      }
     ]
    },
    "agent_reports": [],
    "final": "Slice 2 is done. 14 tests pass.\n\nBefore I start slice 3, one question. Should the CSV timestamps use UTC or the project timezone?\n1. UTC (I recommend this: it matches the API)\n2. The project timezone\nReply 1 or 2.",
    "previous": {
     "ask": "Build slice 1: the export model.",
     "steps_total": 14,
     "by_tool": {
      "Read": 6,
      "Edit": 5,
      "Bash": 3
     },
     "final": "Slice 1 is done. 9 tests pass. Starting slice 2 next."
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

The system message ends with the JSON schema of `Advice`. That schema has 15445 characters, and it is cut here. The user message is the exact text.

```
[system]
Your input fields are:
1. `slice_json` (str): 
2. `facts_json` (str): The five typed facts from the triage call
Your output fields are:
1. `advice` (Advice):
All interactions will be structured in the following way, with the appropriate values filled in.

[[ ## slice_json ## ]]
{slice_json}

[[ ## facts_json ## ]]
{facts_json}

[[ ## advice ## ]]
{advice}        # note: the value you produce must adhere to the JSON schema: {... JSON schema of Advice, cut ...}


[[ ## completed ## ]]
In adhering to this structure, your objective is: 
        Write the question card and propose the next steps for a waiting session.

[user]
[[ ## slice_json ## ]]
{"trigger":"end_turn","context":{"session_id":"sess-7c1","project":"exporter","branch":"slice-2-csv","workflow_stage":"implement: slice 2 of 5","answered_by_us_last_hour":1},"ask":{"origin":"human","text":"Build slice 2: the CSV export endpoint. Run the tests before you stop."},"notes":["I will read the routes first, then add the writer.","Tests pass. I check the timestamp format."],"steps":{"total":9,"by_tool":{"Read":4,"Edit":3,"Bash":2},"last":[{"tool":"Edit","target":"src/export/csv_writer.py","outcome":"ok","note":""},{"tool":"Bash","target":"pytest tests/export -q","outcome":"ok","note":""}],"errors":[{"tool":"Bash","target":"pytest tests/export -q","outcome":"error","note":"1 failed: test_header_order"}]},"agent_reports":[],"final":"Slice 2 is done. 14 tests pass.\n\nBefore I start slice 3, one question. Should the CSV timestamps use UTC or the project timezone?\n1. UTC (I recommend this: it matches the API)\n2. The project timezone\nReply 1 or 2.","previous":{"ask":"Build slice 1: the export model.","steps_total":14,"by_tool":{"Read":6,"Edit":5,"Bash":3},"final":"Slice 1 is done. 9 tests pass. Starting slice 2 next."}}

[[ ## facts_json ## ]]
{"status":"waiting_answer","needs_human":false,"answer_class":"pick_default","risk":0.2,"priority_hint":0.3,"confidence":{"status":0.93,"needs_human":0.81,"answer_class":0.88,"risk":0.74,"priority_hint":0.6}}

Respond with the corresponding output fields, starting with the field `[[ ## advice ## ]]` (must be formatted as a valid Python Advice), and then ending with the marker for `[[ ## completed ## ]]`.
```
