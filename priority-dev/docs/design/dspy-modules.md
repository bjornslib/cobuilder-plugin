# DSPy modules for the first spikes

Status: design, round 10. The sketch is `schemas/dspy_modules.py`. It runs with `uv run`, with a dummy model, and prints `ok`. It makes no network call. I have no OpenRouter key on this machine, so no real model has answered. Every claim about model behaviour below is therefore untested.

## 1. Models

| Job | Model | Why | Adapter |
|---|---|---|---|
| Triage, Pick, Fill, Card | `openrouter/mistralai/mistral-nemo` | You chose it. Its OpenRouter entry lists `structured_outputs` and `response_format`. The window is 131,072 tokens. The price is USD 0.029 for a million input tokens and USD 0.03 for a million output tokens (from the list) | `JSONAdapter` is the first try. `ChatAdapter` is the fallback |
| Digest, Shrink | `openrouter/thinkingmachines/inkling:free` | You chose it. It is free, and the window is 1,048,576 tokens. Its entry lists `reasoning` but no `response_format` | `ChatAdapter`, which parses text fields |

Mistral Nemo is a small model, from my memory and not checked. A small model handles a short schema better than a large one. This drives the design in section 3.

## 2. What the two skills said, and what I did with it

I read `dspy-signature-designer` and `dspy-custom-module-design`. I did not read the others. The rules below are from those two skills.

| Rule | Where it shows |
|---|---|
| The class docstring is the task instruction | Each signature has one plain sentence |
| `desc=` on each field guides the model | Each output field has a `desc=` |
| Use `Literal` for a category | `status`, `risk`, `priority_hint`, `kind` |
| Use a Pydantic model for a structure | `Question`, `RunDigest`, and the payload of each action |
| Default values work only on input fields | No output field has a default |
| A module composes small predictors in `forward` | `Interpreter` holds a triage, a pick, a card, and 13 fill predictors |
| A module returns a safe value when a call fails, and it logs | The interpreter returns an `Abstain`, never an exception |

## 3. The main decision: split the Advise call

The old design made one call for stage 2. Its output type was `Advice`, which holds a union of 13 action kinds. The prompt for that call is 16,903 characters, which I measured in the sketch. A small model is likely to fail on a schema that large. I could not test that. I split the call into small ones, because the risk is cheap to remove.

| Call | Model | Output | Prompt, in characters |
|---|---|---|---|
| Triage | Nemo | five `Literal` values and a list of fields it is unsure about | 2,710 |
| Pick | Nemo | the action `kind`, an exact quote, a confidence | 1,925 |
| Fill | Nemo | the fields of one action kind | 927 to 1,743, and 3,781 for `ask_human` |
| Card | Nemo | a `Question` card, when a human must answer | 2,056 |
| Digest | Inkling | a `RunDigest` | 1,288 |

The sizes are for an empty slice. The slice text comes on top. The old single call was 16,903 characters. A chain of Triage, Pick, Fill, and Card is about 7,700 characters for a common kind. It has four calls where the old design had two. The chain is not cheaper in calls. It is shorter in each prompt, and each call has one job. The spike measures whether it is more reliable.

Rules for the split:

1. The model writes only the payload of an action. Code sets `session_id`, `author`, `evidence_quote`, and `confidence`. The model cannot forge an id.
2. Code checks the quote. If the quote is not in the slice text, the result is an `Abstain` with the reason `quote_not_in_slice`. The kind `ask_human` needs no quote.
3. Code checks the kind against `allowed_kinds`. A kind that is not allowed gives an `Abstain` with `kind_not_allowed`.
4. Triage gives no confidence number, because a language model has no calibrated one. It lists the fields it is unsure about. Stage 2 runs when the status needs an answer or when the list is not empty. This replaces the confidence rule of `schemas.md` section 1 for the spikes. The `Facts` type is unchanged. The sketch sets 0.5 for an unsure field and 0.9 for the others, and these numbers are stand-ins and not measurements.
5. A proposal has one step in the spikes. Multi-step plans come after the single step works.

## 4. The modules

| Module | Holds | Returns |
|---|---|---|
| `Interpreter` | `Predict(TriageLM)`, `Predict(PickStep)`, one `Predict(Fill)` for each kind, `Predict(WriteCard)` | `Interpretation`: facts, and either advice or an `Abstain` |
| `DigestRun` | `Predict(Digest)` | `RunDigest` |

The `Fill` signature changes its output type for each kind. The sketch builds the 13 variants with `Signature.with_updated_fields`, and the payload model of each variant comes from the action class with the shared fields removed. The sketch checks this with the dummy model.

I use `Predict`, not `ChainOfThought`. The first spike measures the plain call. If the quotes fail often, the next try is `ChainOfThought` on Pick only.

## 5. What the spike measures

No labels are needed. The replay report in slice 4 of the plan counts these:

| Measure | Meaning |
|---|---|
| Valid-output rate | The share of calls whose output parses into the type |
| Quote-found rate | The share of picks whose quote is in the slice |
| Abstain reasons | A count for each reason |
| Kinds picked | A count for each kind |
| Characters sent, seconds, and cost | For each stage |
| Stage 2 run rate | How often Triage sends a slice on |
| Digest size | Characters out against characters in, and whether `open_items` holds the last question of the run |

The skill `dspy-evaluation-suite` covers metrics and baselines. I did not read it, so the metric code is not designed yet. A metric that needs the right answer waits for labels, which are out of scope for now.

## 6. What stays open

1. Does Nemo follow `JSONAdapter` for the nested payloads? The spike runs both adapters on the same slices and compares the valid-output rate.
2. Does Inkling's free tier have a rate limit that a goal run with many stops will hit? The documentation I used does not say.
3. Does Digest keep the open question of a run? The replay report reads this on a few runs by hand.
4. Optimisers (`MIPROv2`, `GEPA`) and `Refine` are not in the spikes. They need a metric first.
