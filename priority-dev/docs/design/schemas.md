# Typed schemas: what the interpreter receives and produces

Status: design, round 6. The code sketch is `schemas/interpreter_schemas.py`. It runs with `uv run`, and it checks one round trip and one hash rule. It is not the code layout.

The sketch uses `dspy[typesafe]==3.4.1`. `Choice`, `Noul`, and `Score` import from `dspy.experimental`. `Score[...]` must be the field type itself. `Annotated[float, Score[...]]` raises an error. Nobody has yet sent a call to Jev or to the advisor through these signatures. The one-day test does that.

## 1. The parts of the contract

| Part | Type | Direction | Event kind |
|---|---|---|---|
| Slice | `TurnSlice` | in | built from `session.*` events |
| Facts | `Facts` (five typed decisions) | out | `fact.status`, `fact.risk`, and so on |
| Question card | `Question` | out | `fact.question` |
| Action | `Action` (12 kinds) | out | `proposal.action` |
| Abstain | a reason string | out | `proposal.abstain` |

The interpreter host builds the slice. A model never builds it. The host redacts secrets and clips each record before the call. The slice carries `allowed_kinds`, so the advisor can only name a kind that exists.

## 2. Input: `TurnSlice`

| Field | Meaning |
|---|---|
| `slice_id` | hash of the session id and the last record uuid |
| `cursor` | transcript path and byte offset, for replay |
| `context` | session id, project, branch, workflow stage, last human reply, count of our answers in the last hour |
| `records` | the last records of the turn, each with `uuid`, `role`, clipped `text`, and the tool name |
| `pending` | the prompt that waits: `prompt_id`, `source` (hook, pane, transcript), `kind`, options, tool, command |
| `redactions` | how many secrets the host removed |
| `allowed_kinds` | the action kinds the advisor may name |

Rules:

1. A record `role` comes from the transcript `origin` field, so a task notification never counts as a human reply.
2. `pending.source` tells the policy how much to trust the prompt. A hook is exact. A pane read is a guess.
3. A prose question has no `pending`. The facts say `waiting_answer`, and the slice text holds the question.

## 3. Output: facts and question

The five typed decisions come from the lab plan. Jev decides all five on a clipped slice.

| Field | DSPy type | Values |
|---|---|---|
| `status` | `Choice` | done, waiting_answer, waiting_permission, blocked, failed, continuing |
| `needs_human` | `Noul` | true or false |
| `answer_class` | `Choice` | none, approve_continue, pick_default, provide_fact, decide, external_action |
| `risk` | `Score` | low, medium, high |
| `priority_hint` | `Score` | can wait, soon, now |

DSPy confidence is the distance from the threshold. It is not a calibrated probability. A plain-Python rule forwards the slice to the advisor when `status` is `waiting_answer` or when any confidence is below its threshold.

The `Question` card comes from the petekp/inbox typed item:

- `ask`: the question, in 300 characters or fewer.
- `options`: the choices, if any.
- `agent_recommendation`: the option the agent picked. It is never the human's answer (petekp/inbox).
- `helps`: up to three steps that help the human answer.

## 4. All the proposed actions

Twelve kinds. Eight touch the session, and four change only the inbox. The policy file owns the starting verdict. The column shows the proposed default and the reason.

| Kind | Effect | Payload | Borrowed from | Starting verdict |
|---|---|---|---|---|
| `reply` | sends text as the user | `text` | petekp/inbox answer, our addition | ASK, ALLOW for a fact already in the transcript |
| `continue` | sends a nudge to go on | none | agentbox (finished vs waiting) | ALLOW |
| `approve_permission` | answers yes to a tool prompt | `scope` once or session | Omnigent ALLOW, DENY, ASK | ALLOW for a read-only tool, else ASK. DENY on the shell deny list |
| `deny_permission` | answers no | `reason` | Omnigent | ALLOW |
| `pick_option` | picks an option by index | `index` | petekp/inbox options | ALLOW when it is the agent's own recommendation and risk is low |
| `approve` | approves a CoBuilder gate | `gate`, `notes` | Plannotator Approve, Approve with Notes | ASK in v0.3. ALLOW later by gate, only on stored evidence (section 7) |
| `send_feedback` | returns a gate with notes | `gate`, `notes` | Plannotator Send Feedback | ASK |
| `interrupt` | stops a running turn | none | Omnigent PTY wrapper | ASK |
| `ask_human` | puts an item in the queue | `detail` (nested: decide, do, or review), `why_escalated` | petekp/inbox decide and do | ALLOW, always |
| `snooze` | hides an item until a time or an event | `until`, `until_event` | agentbox away gating | ALLOW |
| `dismiss` | closes an item | `reason` | petekp/inbox skip | ALLOW |
| `set_priority_hint` | proposes a hint | `hint` | agentbox: an agent cannot change its own priority | ALLOW, and rules still set the rank |

Common fields on every action: `session_id`, `prompt_id`, `author` (interpreter, human, or rule), `evidence_quote`, and `confidence`.

The action hash is the idempotency key. It covers the kind and the payload. It does not cover `author`, `evidence_quote`, or `confidence`. A human approval and an advisor approval of the same prompt therefore have the same hash, and the actuator sends one of them.

Not in the list, on purpose:

- **Kill a session**, **launch a session**, **change the permission mode**. These are not proposals in v0.3. A launch comes later, and it needs its own design.
- **A free shell command to the pane.** `reply` sends text to a prompt. It does not run a command. The deny list and the five unparseable-to-ASK rules still read every `reply` that looks like a command.
- **Auto-deny on a timeout** (agentbox). We do not take it. An unanswered item rises in rank and never answers itself.

## 5. Questions, actions, and responses

| Step | Who | What |
|---|---|---|
| Question | the agent | a pending prompt or a prose question in the transcript |
| Fact | the interpreter | `status`, `needs_human`, `answer_class`, `risk`, `priority_hint`, and a `Question` card |
| Proposal | the interpreter | one `Action`, or `ask_human` |
| Verdict | the policy | ALLOW, DENY, or ASK, with `rule_id` and `policy_hash` |
| Effect | the actuator | the send, after a fresh `evaluate` |
| Response | the human | one of the answers below, as a human-authored action |

The human response is an action with `author = "human"`. It goes through the same policy and the same actuator. A rule can allow it by default, because the human decided.

| Client response | Becomes |
|---|---|
| Accept the proposal | the proposed action, `author = "human"` |
| Edit the text, then send | `reply` with the edited text |
| Choose an option | `pick_option` |
| Approve | `approve_permission` or `approve` |
| Approve with notes | `approve` with `notes` |
| Send feedback | `send_feedback` |
| Not now | `snooze` |
| Close | `dismiss` |

Two rules from Plannotator apply. A reply never blocks the client, and the answer arrives in the session as a message. The client warns before it drops notes that the human did not send.

Two rules from petekp/inbox apply. An option that the agent picked is never recorded as the human's answer. A malformed model reply is never dropped silently. It becomes `proposal.abstain` and an `ask_human`.

## 6. Notification levels

The goal is to sort notifications into priority levels. A level has no upper limit. Anything that does not need immediate attention goes into a batch, and one batch counts as one notification.

| Level | Source in the attention queue | Delivery |
|---|---|---|
| N0 | class 0: policy ASK on a destructive action | at once, ignores quiet hours |
| N1 | class 1: a blocked session | at once |
| N2 | class 2: a question | batch |
| N3 | class 3: FYI | batch |

The batch window and the quiet hours are settings, not constants. The starting value of each batch window is 30 minutes, for N2 and for N3 alike. Quiet hours start at 22:00 and end at 07:00, and only N0 passes. The `NotifyConfig` type in the sketch holds these values.

## 7. Stored recommendations

The system stores each proposal that reaches the human, and the human's reply to it. The pair is a `Recommendation` and an `Outcome`. The outcome is one of accepted, edited, replaced, rejected, snoozed, or dismissed.

- The pairs are the data for fine-tuning the interpreter and for the lab metrics, with the same slice as the input.
- `approve` stays at ASK until stored outcomes support a change. The human sees the proposal, and the proposal is stored with the reply.
- I propose to move one gate to ALLOW when the human accepted the proposal for that gate without an edit in a set share of the cases. I do not know the share. See the decision below.

## 8. Checks that this design needs

1. The sketch imports and validates (done: `uv run schemas/interpreter_schemas.py` prints `ok`).
2. A real Jev call returns the five typed fields for one slice (not done, one-day test).
3. The advisor returns a valid `Action` through `Advise` for 20 recorded slices (not done). The `Action` union as a DSPy output field is untested against a real model.
4. The evidence quote check rejects a proposal whose quote is not in the slice (not done, a unit test).

## 9. Examples of the data

The sketch builds each example and checks a JSON round trip. Run `uv run schemas/interpreter_schemas.py dump` to print them. Empty and default fields are in the real output, and they are cut here.

**reply**

```json
{"session_id": "s1", "prompt_id": "p1", "evidence_quote": "Which database should I use?", "confidence": 0.91, "kind": "reply", "text": "Use Postgres 17."}
```

**continue**

```json
{"session_id": "s1", "evidence_quote": "Shall I continue?", "confidence": 0.97, "kind": "continue"}
```

**approve_permission**

```json
{"session_id": "s1", "prompt_id": "p2", "evidence_quote": "Allow Bash(ls -la)?", "confidence": 0.99, "kind": "approve_permission", "scope": "once"}
```

**deny_permission**

```json
{"session_id": "s1", "prompt_id": "p3", "confidence": 0.0, "kind": "deny_permission", "reason": "Writes outside the repo"}
```

**pick_option**

```json
{"session_id": "s1", "prompt_id": "p4", "evidence_quote": "1. Existing table (recommended)", "confidence": 0.88, "kind": "pick_option", "index": 0}
```

**approve**

```json
{"session_id": "s1", "prompt_id": "p5", "evidence_quote": "Approve the design?", "confidence": 0.8, "kind": "approve", "gate": "design-review", "notes": "Check the retry limit."}
```

**send_feedback**

```json
{"session_id": "s1", "confidence": 0.0, "kind": "send_feedback", "gate": "design-review", "notes": "Split slice 2 in two."}
```

**interrupt**

```json
{"session_id": "s1", "evidence_quote": "rm -rf build/ running", "confidence": 0.7, "kind": "interrupt"}
```

**ask_human (decide)**

```json
{"session_id": "s1", "confidence": 0.0, "kind": "ask_human", "detail": {"role": "decide", "question": {"ask": "Use the existing table or add a new one?", "options": ["existing", "new"], "agent_recommendation": "existing", "helps": ["The table has 3 columns"]}}, "why_escalated": "Cost of a new table is not in the transcript"}
```

**ask_human (do)**

```json
{"session_id": "s1", "confidence": 0.0, "kind": "ask_human", "detail": {"role": "do", "steps": ["Open the console", "Create the bucket"], "where": "aws console", "done_check": "Bucket name appears in the next prompt"}, "why_escalated": "Needs the AWS console"}
```

**ask_human (review)**

```json
{"session_id": "s1", "confidence": 0.0, "kind": "ask_human", "detail": {"role": "review", "artifact": "docs/plans/x/04-slices.md", "check_items": ["Slice order"]}, "why_escalated": "Gate needs a person"}
```

**snooze**

```json
{"session_id": "s1", "confidence": 0.0, "kind": "snooze", "until_event": "turn_end"}
```

**dismiss**

```json
{"session_id": "s1", "confidence": 0.0, "kind": "dismiss", "reason": "fyi_read"}
```

**set_priority_hint**

```json
{"session_id": "s1", "confidence": 0.0, "kind": "set_priority_hint", "hint": 0.8}
```

**notification settings**

```json
{"batch_window_minutes": {"N2": 30, "N3": 30}, "quiet_hours": ["22:00", "07:00"], "timezone": "Australia/Sydney"}
```
