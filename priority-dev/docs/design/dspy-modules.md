# DSPy modules

Status: slice 21, one typed call. The design is `probes/program-flow-v2.svg`, and code that disagrees with it is wrong. The engineer chose this design on 31 October 2026. Until slice 21 the interpreter was a chain of Triage, Pick, Fill, and Card calls. The chain lost payloads between the calls, hid references behind its routing by status, and spread GEPA over 18 predictors. The saved chain programs in `probes/programs/` stay as records, and no code loads them.

## 1. Models

| Job | Model | Why | Adapter |
|---|---|---|---|
| ProposeStop | `openai/mercury-3` on `https://api.inceptionlabs.ai/v1` | The engineer switched to it on 27 October 2026, after NVIDIA rate limits blocked the GEPA run. The provider, endpoint, model, and key are in `.env` (`LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`), with an `.env.example` template. Mercury needs temperature 0.5 or higher, so the code floors it there | `ChatAdapter` with the JSON fallback off is the default. `JSONAdapter` is the other option |
| Digest, Shrink | Same model and endpoint | Same switch. The digest keeps the text adapter | `ChatAdapter`, which parses text fields |

## 2. The interpreter

| Module | Holds | Returns |
|---|---|---|
| `Interpreter` | `propose = Predict(ProposeStop)`, the one predictor | `dspy.Prediction(status, needs_human, priority, steps, abstain)` |
| `DigestRun` | `Predict(Digest)` | `RunDigest` |

`ProposeStop` takes `brief_text`, the stop brief, which ends with the final reply of the agent. It returns four fields:

- `status`: one of done, waiting_answer, waiting_permission, blocked, failed, continuing.
- `needs_human`: true only when no rule or agent can give the answer.
- `steps`: 0 to 3 steps, in run order. Each step is one of the payload models of the 13 action kinds, discriminated on `kind`. One `ask_human` step holds all the questions of a stop.
- `priority`: P1 disturbs the human now with an alert, P2 shows in the inbox now, and P3 goes into the next digest. A proposal with no notify or ask_human step takes P3.

The docstring of `ProposeStop` is the instruction that GEPA rewrites. The step limit is part of the `Steps` type, because dspy validates only the annotation of a signature field.

Rules:

1. The model writes only the payload of each step. Code sets `session_id` and `author`. The model cannot forge them, because each payload model forbids extra fields.
2. The adapter parse and the pydantic validation of the reply are the only gate. A fault gives an abstain `invalid_output`, with the error text in `detail` and the model reply in `raw`. Any other call error gives `model_error`. No exception leaves `forward`.
3. The model writes no `confidence` and no `evidence_quote`. The question card and `set_priority_hint` are gone. The `priority` field replaces `answer_class`, `risk`, and `priority_hint`.

## 3. Scoring and optimising

The reference of a stop is the label fields `priority` and `payloads`. `status` and `needs_human` are report diagnostics, and no score uses them. The judge sees every stop, also an abstain, for which it gets the raw reply and the error text. Code pins the score in four cases: an abstain scores 0, a reference with steps against no predicted steps scores 0, a reference `[]` against predicted steps scores 0, and two empty lists score 1. In every other case the judge score is final. The eval path and the GEPA path score the same Prediction.

GEPA tunes one component, `propose`, with no component selector. `priority optimise --optimiser labeled` gives the program up to 4 demos, which `pick_demos` chooses from the train stops: the shortest brief of each reference shape. A stop whose brief is a demo of the program leaves the GEPA train set, the valset, and every score of that program, and the command prints the count.

## 4. What the replay measures

| Measure | Meaning |
|---|---|
| Valid-output rate | The share of calls whose reply parses and validates |
| Abstain reasons | A count for each reason |
| Proposals by step count | A count for each step count from 1 to 3 |
| Characters sent, seconds, and cost | For the propose stage, and for the digest and shrink stages |
| Failure drills | A 429, malformed output, an unknown kind, and a timeout, each on its own scripted model |
