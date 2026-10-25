# Digest probe report (slice 6)

Date: 26 October 2026. Digest model: `openrouter/thinkingmachines/inkling-small`, `ChatAdapter`. Fixture: the real transcript `5d2114e3` (local, Git ignores it). One run for each check.

| Check | Command or path | Result |
|---|---|---|
| Digest of a real run | `priority digest <fixture> --log-dir D` | A RunDigest that validates. The stored run had `ran` 397 characters, `result` 204, 2 open items, and 4 decisions. An earlier run on the same fixture gave 3 open items and 5 decisions, so the output varies. One call stored with model id, prompt hash, raw reply, rendered input |
| The next brief carries it | `priority interpret <fixture> --log-dir D` after the digest | The stored file `D/digests/<session>.json` was loaded. The rendered input of triage, pick, and fill held `PREVIOUS RUN:` |
| Shrink on an over-budget brief | `build_brief` with the digest model as `shrink_lm`, on a made-up run of 169,000 characters | One Shrink call. The 38,000-character result became 52 characters. The brief fits and records one entry |

## Findings

- The Shrink reply was 52 characters for a 38,000-character result. The text keeps little of the original. The spike does not test whether that loses facts a decision needs.
- I read the first digest once and did not compare it to the transcript line by line. The two runs differ in item counts, so stability is not measured.
- A failed digest stores nothing, and the next interpretation runs with no `previous`. Tests with an injected failure cover this. I did not make a real call fail.

## Abort condition

This report informs the first condition in `goal.json`: the interpreter model fails on too many stops, "and the digest model cannot digest either". Result: **not measured**. The digest model produced a valid digest on real runs and one valid Shrink. This is too small a sample for a rate. Slice 7 measures it.
