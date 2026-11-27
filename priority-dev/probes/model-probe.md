# Model probe report

Slice 1 of the program `priority-dev-spike`. This report states what the probe measured. The call log is `priority-dev/probes/logs/calls.jsonl`. It holds 22 lines: 4 from the first measurement (Nemo) and 18 from the run in this report (9 for each model). Every count below comes from that log, grouped by `model_id`. The calls ran on 2026-10-24.

This report records calls that used the earlier clipped brief. The probe now uses the tested stop brief from `priority.brief`. The logged prompts above remain unchanged.

## First measurement (Nemo, naive brief)

This was the first run. Its input was near empty, and its brief picked a client error as the stop. The result says little about the models in this report.

- Model: `openrouter/mistralai/mistral-nemo`. One call for each of the three transcripts, and one repeat call on `173ae36f`. There was no retry.
- The brief held the last human ask, the last 40 lines of the run, and the final reply, under the label `ASK:`. For `173ae36f` the prompt was 1,129 characters, instructions included. The stop that the brief chose was a message of the Claude Code client, not a reply of the agent: "There's an issue with the selected model (glm-5.3-flash:cloud)". For `5d2114e3`, the run lines were empty.
- Nemo gave valid JSON on 3 of 3 calls, with 0 errors, and the quote was in the brief on 3 of 3. Latency was 9,752 ms to 13,533 ms for these three calls.
- On `173ae36f`, Nemo gave `waiting_answer`, `needs_human` true, `provide_fact`, and priority `now`, although the agent asked nothing. The repeat call on the same prompt hash gave priority `soon`. The same input at `temperature=0` did not give the same output.
- The log of these four calls holds no prompt text, no reasoning text, and no token count. The log format changed after them.

## The models and why

| Role | Model id | Why |
|---|---|---|
| Interpreter | `openrouter/deepseek/deepseek-v4.1-flash-1017` | Named by the program design. It accepts `response_format` with `json_object`, and the probe sends it. |
| Digest (intended role, not yet called for it) | `openrouter/thinkingmachines/inkling-small` | Named by the program design. The free `inkling:free` refused a direct API call with a 403 ("only available on agentic harnesses"). I did not repeat that call. `inkling-small` costs money. The OpenRouter model list gives no `response_format` for it, so the probe does not send one. This report ran it on the classification prompt only. |

Both models return reasoning text. The probe sets `temperature=0`, `max_tokens=3000`, `num_retries=0`, `cache=False`, and a 120-second timeout. The high token limit is there because reasoning uses tokens first, and a low limit cuts the reply text. The longest completion in the log is 2,562 tokens, so no reply reached the limit. The log has no field for the finish reason, so I cannot show this for each call.

## Measured counts

| Measure | Interpreter (9 calls) | `inkling-small` (9 calls, classification prompt) |
|---|---|---|
| Valid JSON, and it passed the type check | 9 of 9 | 9 of 9 |
| Errors, timeouts, or rate limits (429) | 0 | 0 |
| Quote found in the stop brief (exact match) | 9 of 9 | 9 of 9 |
| Latency | 1,284 ms to 7,740 ms | 3,728 ms to 19,782 ms |
| Input tokens, total | 5,592 | 5,214 |
| Output tokens, total (completion tokens as reported) | 7,620 | 7,398 |

The probe printed no abstain line in any of the 18 runs. A reply that is valid and has a quote in the brief is not the same as a correct reply. The section "Correctness" scores the replies against labels.

**What the `inkling-small` runs did not test.** The probe sent the same classification prompt to both models. That prompt asks for the five facts, a kind and a quote. It is the interpreter task. Digest is a different task: it asks for a `RunDigest`, a short summary of a run. No call in this report asked for a `RunDigest`. The 9 valid replies of `inkling-small` show that it can answer the classification prompt. They say nothing about whether it can digest a run.

## Agreement

Each cell is the share of the 3 calls that hold the most common value. The figures are the `agreement:` lines of the program, copied from its output. The command for each row was `uv run python priority-dev/probes/model_probe.py <transcript> --model <interpreter|digest> --repeat 3`, run from the repo root.

| Model | Transcript | status | needs_human | answer_class | risk | priority_hint | kind |
|---|---|---|---|---|---|---|---|
| interpreter | `173ae36f` | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| interpreter | `36752881` | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| interpreter | `5d2114e3` | 1.00 | 1.00 | 1.00 | 1.00 | 0.67 | 1.00 |
| inkling-small | `173ae36f` | 0.67 | 0.67 | 0.67 | 1.00 | 1.00 | 0.33 |
| inkling-small | `36752881` | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| inkling-small | `5d2114e3` | 1.00 | 1.00 | 1.00 | 0.67 | 0.67 | 1.00 |

What each model gave, from the same log:

| Transcript | Interpreter, 3 calls | `inkling-small`, 3 calls |
|---|---|---|
| `173ae36f` | `continuing`, `continue`, risk `low`, hint `can wait` (3 of 3) | `waiting_answer` + `ask_human`, `continuing` + `continue`, `waiting_answer` + `reply` (three different kinds) |
| `36752881` | `done`, `dismiss` (3 of 3) | `done`, `dismiss` (3 of 3) |
| `5d2114e3` | `waiting_answer`, `decide`, `reply`. Hint: `can wait`, `can wait`, `soon` | `waiting_answer`, `decide`, `reply`. Hint: `now`, `soon`, `now`. Risk: `low`, `medium`, `low` |

The two models agreed with themselves on `36752881` and on most fields of `5d2114e3`. They differed on `173ae36f`, where the brief had no final reply (see the defects below). The two models also gave different `priority_hint` values on `5d2114e3`: the interpreter gave `can wait` or `soon`, and `inkling-small` gave `now` or `soon`.

## One complete prompt, and the replies

This is the first call of each model on transcript `173ae36f`. The prompt is the `prompt` field of the log, unchanged. Both calls have the prompt hash `46fa99b4e3198e283e234a28725f3b9334297b56c9df3c7845a5219695d49c13`, so both models received the same text.

````text
You advise a developer who runs several coding agents at the same time. One agent has stopped.
Read the stop brief below. Reply with one JSON object and nothing else.
The object has these keys:
  "status": one of ['done', 'waiting_answer', 'waiting_permission', 'blocked', 'failed', 'continuing']
  "needs_human": true when only the developer can give the answer, else false
  "answer_class": one of ['none', 'approve_continue', 'pick_default', 'provide_fact', 'decide', 'external_action']
  "risk": one of ['low', 'medium', 'high'], the cost of a wrong answer
  "priority_hint": one of ['can wait', 'soon', 'now'], how soon the developer should look
  "kind": the step the developer should take, one of ['reply', 'continue', 'continue_until', 'approve_permission', 'deny_permission', 'pick_option', 'approve_gate', 'send_feedback', 'interrupt', 'ask_human', 'snooze', 'dismiss', 'set_priority_hint']
  "evidence_quote": words copied exactly from the stop brief that support the kind. Use "" for ask_human.

STOP BRIEF
HUMAN ASKED:
<a short request from the engineer, removed: real session text>
RUN (the last lines, clipped):
[agent] <one agent sentence about checking a version mismatch, removed: real session text>
FINAL REPLY:
````

Interpreter reply (`deepseek-v4.1-flash-1017`, 3,653 ms). The reasoning text is 3,791 characters long. It is in the log.

```json
{"status":"continuing","needs_human":false,"answer_class":"none","risk":"low","priority_hint":"can wait","kind":"continue","evidence_quote":"<the first clause of the agent sentence>"}
```

`inkling-small` reply (6,676 ms), to the same classification prompt:

```json
{"status":"waiting_answer","needs_human":true,"answer_class":"provide_fact","risk":"medium","priority_hint":"soon","kind":"ask_human","evidence_quote":"<the last clause of the agent sentence>"}
```

`inkling-small` reasoning text, 2,470 characters in 25 lines. It is in the log and not quoted here, because it repeats the real session text. In short: it noted the empty final reply, read the agent sentence as an implicit question that only the engineer can answer, chose `provide_fact` and `ask_human`, and was unsure between risk `low` and `medium`.

## Defects of the brief

I checked each item below against the fixture file and the prompts in the log. A record number is the 0-based position of a line in the fixture file. Slice 4 owns the fixes. Slice 1 reports them.

1. **`173ae36f`: the brief does not show a stop.** The end of the file is: an assistant message that holds a tool call (record 887) and its result (888), a client message "You've hit your session limit" (890), the human text "continue" (897), a client message about the model `glm-5.3-flash:cloud` (918), and the human text "continue" again (928, the last record). The probe skips the client records. So the last agent message is the tool call, and the brief shows an empty `FINAL REPLY:`. The brief does not show the tool call, its result, the session limit, or either "continue". The probe read nothing after the last agent message. No model could name the real cause of the stop from this brief.
2. **An empty `FINAL REPLY:` has no explanation.** The label shows with no text. The interpreter noted in its reasoning that the final reply was empty, and it gave `continuing` three times. `inkling-small` gave three different kinds on the same text.
3. **`5d2114e3`: the human line has no referent.** `HUMAN ASKED:` shows "Yes, trim the script so that it fits into 60 seconds...". The word "Yes" answers the two questions at the end of the earlier agent message (record 175). The brief does not hold that message. The final reply also says "You did not answer that earlier question", and the earlier question is not in the brief either.
4. **Empty `RUN` section.** In `5d2114e3` the final reply follows the ask with no tool call between them (records 178 to 182), so the empty `RUN` section is correct. The label still shows with no lines, and the model cannot tell "no work" from "work not shown".
5. **Clipped tool lines.** In `36752881` the `git push` command is cut at 300 characters with `...`, in the middle of the PR body. Line breaks in tool results are flattened into spaces.
6. **The instruction block does not define its words.** It lists 13 kinds, such as `continue_until`, `snooze`, `set_priority_hint`, `pick_option`, and `approve_gate`, with no meaning for any of them. It gives no scale for `risk` or for `priority_hint`. The two models gave `priority_hint` values that differ on `5d2114e3` (see the agreement table). I did not test whether a definition would remove the difference.

## Clipping and the design

I checked the probe and the design. The probe cuts each `RUN` line (a tool call, a tool result, or intermediate agent text) at 300 characters. It keeps only the last 40 `RUN` lines (`MAX_LINES, CLIP_CHARS = 40, 300` in `model_probe.py`). The probe does not cut the final reply. The design says the opposite: rule 1 of the stop brief in `priority-dev/docs/design/schemas.md` states "Nothing in a stop brief is clipped". The clip was a shortcut that the build session added. It was not a design decision.

I ran the probe's own functions on the three redacted transcripts in `priority-dev/fixtures/real/`. I set `CLIP_CHARS` and `MAX_LINES` to 1,000,000,000 in the loaded module, and I did not edit the probe file. The brief length is the text before the instruction block.

| Transcript | `RUN` lines | Lines cut at 300 characters | Lines dropped by the 40-line limit | Brief length with the limits | Brief length without the limits |
|---|---|---|---|---|---|
| `173ae36f` | 1 | 0 | 0 | 274 | 274 |
| `36752881` | 5 | 1 (a tool call of 2,558 characters) | 0 | 1,559 | 3,802 |
| `5d2114e3` | 0 | 0 | 0 | 1,937 | 1,937 |

The 40-line limit dropped no line on these three transcripts. The 300-character clip cut one line, the `git push` command of `36752881`. That brief is 2,243 characters longer without the clip.

Slice 4 now removes both fixed clipping limits. It sends full tool inputs and results below budget. Above budget, it returns `brief_too_large` without a model call.

Every reply in this report came from a clipped brief. The clip changed only one of the three briefs. So the report shows little about how a model reads a full brief with long tool results. It cannot show whether the clip changed any reply.

## Correctness

The labels are in `priority-dev/fixtures/labels.json`. The engineer confirmed them on 2026-10-24. Each stop has two scores. A label value that is a list accepts any member.

- **Score A** is the right answer for the true end of the session.
- **Score B** is the right answer for a careful reader who sees only the logged prompt. A blind reader drafted it from the three prompts, and the engineer confirmed it.

For each call I counted the six fields (`status`, `needs_human`, `answer_class`, `risk`, `priority_hint`, `kind`) that match the label. The 18 calls are the log records that hold `prompt`.

| Model | Transcript | A: calls with all six right | A: mean share of fields right | B: calls with all six right | B: mean share of fields right |
|---|---|---|---|---|---|
| interpreter | `173ae36f` | 0 of 3 | 0.167 | 3 of 3 | 1.000 |
| interpreter | `36752881` | 3 of 3 | 1.000 | 3 of 3 | 1.000 |
| interpreter | `5d2114e3` | 2 of 3 | 0.944 | 2 of 3 | 0.944 |
| inkling-small | `173ae36f` | 0 of 3 | 0.333 | 0 of 3 | 0.167 |
| inkling-small | `36752881` | 3 of 3 | 1.000 | 3 of 3 | 1.000 |
| inkling-small | `5d2114e3` | 0 of 3 | 0.778 | 0 of 3 | 0.778 |

Three stops are too few for a rate. These figures describe 18 calls. They do not estimate how often a model is right. Score B for `173ae36f` says the prompt itself was ambiguous: a careful reader of that prompt could not find the true stop, and the interpreter matched Score B on 3 of 3 calls.

**Rule for the cause of a miss.** A fact the prompt never held is the brief builder. A field whose meaning or scale the prompt never gave (`risk`, `priority_hint`, and the choice between kinds) is the prompt definitions. Only a miss on a field that the prompt held and defined is the model. The prompt defines `needs_human`. It lists the values of `status` and `answer_class` with no meaning for them, so I counted those two as prompt definitions under Score B. The cause of each miss is my judgement under this rule.

**Misses, by cause.**

- **Brief builder.** Score A on `173ae36f` needs facts that the prompt never held (defect 1: the session limit, the two "continue" lines, the model error).
  - The interpreter missed `status`, `needs_human`, `answer_class`, `priority_hint` and `kind` on 3 of 3 calls (15 field misses).
  - `inkling-small` missed `status` on 3 calls, `answer_class` on 3, `needs_human` on 1, and `kind` on 2 (9 field misses).
- **Prompt definitions.**
  - `risk` on `173ae36f`: `inkling-small` gave `medium` against `low` on 3 of 3 calls, under both scores.
  - `priority_hint` on `5d2114e3`: the interpreter gave `soon` against `can wait` on 1 call. `inkling-small` gave `now`, `soon`, `now` on its 3 calls. These misses count under both scores.
  - `risk` on `5d2114e3`: `inkling-small` gave `medium` against `low` on 1 call.
  - `173ae36f`, Score B, `inkling-small`: `status` on 2 calls, `answer_class` on 3, `priority_hint` on 3 (`soon` against `can wait`), and `kind` on 2.
- **Model.** `needs_human` on `173ae36f`, Score B, `inkling-small`: it gave `true` on 2 of 3 calls. The prompt held the brief and defined the field, and the label is `false`.

The counts come from my script `/tmp/pdprobe/score.py`. It is outside the repo.

## Cost

DSPy gave the token counts for each call, and the probe stored them in the `usage` field of the log. DSPy gave no price: the `cost` field is null for all 18 calls. I took the prices from the public OpenRouter model list, read on 2026-10-24. The calls ran on a Saturday, and the interpreter price on a Saturday equals its base price. The calculation ignores the cache discount, so it is a ceiling for the input side. I used the completion tokens as reported. For the digest, the reported reasoning tokens (7,887) are more than the completion tokens (7,398), so I cannot say that the completion count is complete.

| Model | Price for 1M tokens, input / output | 9 calls | One call, mean |
|---|---|---|---|
| Interpreter | $0.15 / $0.60 | $0.0054 (5,592 in, 7,620 out) | $0.0006 |
| `inkling-small` | $0.45 / $1.20 | $0.0112 (5,214 in, 7,398 out) | $0.00125 |

The price is my calculation. I did not read a bill.

## Abort condition informed

The first `abort_if` condition of `goal.json` is: "the interpreter model returns valid, grounded output on too few real stops to build on, and the digest model cannot digest either". The condition has two parts, and it applies only when both fail.

Verdict: **not measured**.

- Interpreter part: valid JSON with a quote in the brief on 9 of 9 calls, on 3 of 3 stops. That shows validity and a matching quote only. It does not show that the output is correct. One of the three stops had no real stop in the brief (defect 1). The section "Correctness" scores the replies.
- Digest part: not measured. No call asked for a `RunDigest` (see above). The 9 replies of `inkling-small` cannot support this part.
- Because one part is not measured, the condition as a whole is not measured. Slice 6 tests the digest part.

## Targeted retries after dict reply handling

`call_model` now serializes a direct JSON object as text. It keeps a dictionary with a `text` key as a DSPy envelope. A regression test covers both shapes.

I reran only the two DeepSeek calls that failed for `173ae36f`. Each prompt held 16,932 characters. Both prompts used hash `0a379103302e43bd4c158f750b28884f163cb27296649af66f0c69dad710cf3f`.

The retry records are in `/tmp/priority-dev-deepseek-dict-retry-20261027/calls.jsonl`. I did not add them to the repository call log.

| Retry | Result |
|---|---|
| 1 | DSPy returned an envelope with `text: null` after 3,000 completion tokens. The probe rejected the reply because it lacked the target JSON. |
| 2 | DSPy returned the target JSON as a dictionary. The probe parsed it. |

The second reply chose `done` and `reply`. Its quote matched the human request in the brief. Label A expects a human action for the session limit and model error.

```json
{"status":"done","needs_human":false,"answer_class":"none","risk":"low","priority_hint":"soon","kind":"reply","evidence_quote":"<the human request>"}
```

The direct-dict fix works. The retry did not match label A.

## Fresh full-brief run

On 24 October 2026, I ran the interpreter on all three real fixtures. I used the scratch tmux session `priority-dev-slice1-attempt5`. The digest model did not run.

The command used `temperature=0`, `max_tokens=3000`, `num_retries=0`, `cache=False`, and a 120-second timeout. The interpreter used JSON response mode. The call log is `priority-dev/probes/logs/slice-1-attempt-5-20261024/calls.jsonl`.

Each log record holds the full prompt, its SHA-256 hash, the model id, the raw reply, reasoning text, and usage data. I recomputed every prompt hash. Each set of three calls used one identical prompt, and each recomputed hash matches the log.

| Transcript | Prompt characters | Prompt SHA-256 | Valid replies | Agreement: status, human, class, risk, priority, kind | Score A: all six | Score A: mean fields | Score B: all six | Score B: mean fields |
|---|---:|---|---:|---|---:|---:|---:|---:|
| `173ae36f` | 16,932 | `0a379103302e43bd4c158f750b28884f163cb27296649af66f0c69dad710cf3f` | 2 of 3 | 0.33, 0.67, 0.67, 0.67, 0.33, 0.33 | 0 of 3 | 0.222 | 0 of 3 | 0.444 |
| `36752881` | 6,214 | `6d73ee43e2f7b9295c83a5317e8c410f253f7fcdb6171e10cb104a7b8d88c72c` | 3 of 3 | 1.00 for all six | 3 of 3 | 1.000 | 3 of 3 | 1.000 |
| `5d2114e3` | 4,328 | `d09472466e8ea0df6ba66598de8afeb8e295d9f0c0afa5df569b79a0940a7b72` | 3 of 3 | 1.00 for all six | 0 of 3 | 0.833 | 0 of 3 | 0.667 |

The scores compare each reply with the confirmed labels. Score A uses the true end of the session. Score B uses only facts in the prompt. A list-valued label accepts any listed value. An invalid reply scores zero fields.

### Exact replies

For `173ae36f`, call 1 returned:

```json
{"status":"blocked","needs_human":false,"answer_class":"none","risk":"low","priority_hint":"can wait","kind":"snooze","evidence_quote":"<the session-limit client message, with its reset time>"}
```

Call 2 returned:

```json
{"status":"continuing","needs_human":false,"answer_class":"none","risk":"low","priority_hint":"soon","kind":"reply","evidence_quote":"<the human request>"}
```

Call 3 returned no text to the probe. DSPy warned that the reply was truncated at the 3,000-token limit. The call log has `raw_reply: null`, and the probe returned `invalid_output`.

For `36752881`, call 1 returned:

```json
{"status":"done","needs_human":false,"answer_class":"none","risk":"low","priority_hint":"can wait","kind":"dismiss","evidence_quote":"<the final-reply sentence that names the opened PR>"}
```

Call 2 returned:

```json
{"status":"done","needs_human":false,"answer_class":"none","risk":"low","priority_hint":"can wait","kind":"dismiss","evidence_quote":"<the same sentence, plus the next sentence about the pushed branch>"}
```

Call 3 returned the same reply as call 1. All three calls chose `dismiss`.

For `5d2114e3`, all three calls returned the same reply:

```json
{"status":"waiting_answer","needs_human":true,"answer_class":"decide","risk":"low","priority_hint":"soon","kind":"ask_human","evidence_quote":""}
```

The log also holds the model's reasoning text for calls that returned it. The three call groups have no rate-limit or call-error records. One output was invalid because it was truncated.

### Independent blind answers

Two fresh readers saw one exact prompt each. They did not see labels, reports, or model replies.

For `173ae36f`, the reader returned:

```json
{"status":"done","needs_human":false,"answer_class":"none","risk":"low","priority_hint":"can wait","kind":"reply","evidence_quote":"<a git log line from a tool result>"}
```

For `5d2114e3`, the reader returned:

```json
{"status":"done","needs_human":false,"answer_class":"none","risk":"low","priority_hint":"can wait","kind":"dismiss","evidence_quote":"<the last sentence of the final reply>"}
```

### Synthetic-tail brief

I ran `priority brief` on `fixtures/made-up/synthetic-tail.jsonl`. The output was:

```text
HUMAN ASKED:
Rename the config key timeout to timeout_seconds.
RUN:
FINAL REPLY:
I renamed the key in three files. Should I also update the sample config in the docs folder?
CLIENT MESSAGE:
No response requested.
```

### Outcome

The `36752881` replies match both labels on all six fields. They are stable and sensible. The `5d2114e3` replies are stable. They identify a human decision, and their `ask_human` kind matches Score A. Their `priority_hint` is `soon`, while both labels say `can wait`.

The `173ae36f` replies are not stable. One call chose `blocked` and `snooze`. One chose `continuing` and `reply`. The third returned no text. The brief includes a version check with matching commit ids, then later client messages, including `continue`. The two blind readers chose `done`, but one chose `reply` and the other chose `dismiss`. These outputs do not settle the correct next step.

The prompt says, `This probe accepts one action only.` The schema also accepts one `kind` value. This run cannot show whether the model would propose several actions if the prompt allowed them.

The synthetic-tail brief keeps the actual final reply and places `No response requested.` under `CLIENT MESSAGE:`. It does not treat that message as a new final reply.
