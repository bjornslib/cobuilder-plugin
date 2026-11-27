# Epic Technical Solution Design: E2 — Interpreter

Feature: priority-dev-spike
Epic ID: E2

## Scope and Intent

The interpreter turns a recorded transcript into a stop brief, an Interpretation or an Abstain, and a RunDigest. The source is `schemas.md`, `dspy-modules.md`, and the two running sketches.

## Files Touched

- `src/priority/brief/` (builder, redactor), `src/priority/interpreter/` (signatures, modules, checks), `src/priority/cli.py`
- `fixtures/` (real ones ignored by Git), `tests/`, `reports/replay.md`

## Types & Signatures

- `build_brief(transcript, stop, previous) -> StopBrief`
- `Interpreter.forward(brief) -> Interpretation`; `DigestRun.forward(brief) -> RunDigest`
- Types as in `interpreter_schemas.py`, with `brief_id` for the id.

## Slice Decomposition

1. Slice 4: the stop brief and its snapshots. The brief picks the last non-`<synthetic>` assistant message as the stop. A client message after it goes in a `CLIENT MESSAGE:` section, and the stop source is `client_error`. A transcript with only synthetic assistant records is an Abstain `no_agent_reply`. The RUN section shows every item of the run in order, with no line limit, and it counts across ask boundaries, so a bare `continue` still shows the work before it. Human asks inside the run show as `[human]` lines. Slice 4 is plain code. It never cuts text and never shrinks it. The size budget is 160,000 characters of brief text, which excludes the instruction block. Over the budget, it returns an Abstain `brief_too_large` and lists the tool inputs and tool results of older exchanges by size, largest first. The parts that never shrink are the human ask, the final reply, the last three exchanges with their inputs and results, the `CLIENT MESSAGE:` section, and the human lines after the last agent message. When those parts alone exceed the budget, the Abstain is final. There is no model call and no cut. The budget is a guess from the design.
2. Slice 5: Interpret, with call records. Pick returns one to three steps. Fill runs once for each step. Code checks the kind and the quote of each step. A fault in any step gives one Abstain that names the step. `Proposal` holds the steps in order (`schemas.md` section 4.2).
3. Slice 6: Digest and `previous`, and the Shrink call. Over the budget, the digest model turns the largest older tool inputs and tool results into shorter texts, one at a time, until the brief fits. The brief records each item that shrank. If the brief is still over the budget after every older input and result shrank, the Abstain `brief_too_large` stands. Until slice 6 exists, an over-budget brief is an Abstain.
4. Slice 7: the replay report with failure drills, then the go or no-go.

## Test Plan

Snapshots for the brief. `DummyLM` for the valid, quote-not-in-brief, kind-not-allowed, and done paths. Real calls only in the replay. Failure drills inject 429, malformed JSON, an empty quote, and a timeout.

## Risks & Open Questions

- The interpreter model is `deepseek/deepseek-v4.1-flash-1017` and the digest model is `thinkingmachines/inkling-small`. Validity on the 13 payloads is unknown. The split into small calls is a bet.
- `JSONAdapter` against `ChatAdapter` on the interpreter model is open. The replay compares both.
- Slice 1 found that `inkling:free` refuses direct calls. The replay counts the rate-limit errors of the paid models instead.
- The slice 1 probe cut each RUN line at 300 characters and kept only the last 40 lines. This is against the design ("Nothing in a stop brief is clipped"). The report of slice 1 measured the effect with raised limits in a throwaway copy. Slice 4 replaces both limits with the policy above (rubric C7).
