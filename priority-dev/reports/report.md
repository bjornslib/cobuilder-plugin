# Replay report

## Run

- sessions: 14
- adapters: json, chat
- concurrency: 5
- cost method: tokens are estimated as characters divided by 4, with the input as len(rendered_input) and the output as len(raw_reply). USD for a million tokens: the interpreter model costs 0.15 in and 0.60 out, and the digest model costs 0.45 in and 1.20 out

## Adapter: json

- valid-output rate: 0.960 (24/25)
- quote-found rate: 1.000 (1/1)
- rate-limit errors: 0

### Abstain reasons
- no_agent_reply: 1
- invalid_output: 1

### Kinds picked
- ask_human: 3
- snooze: 1

### Proposals by step count
- 1 step: 4
- 2 steps: 0
- 3 steps: 0

### Stages
| stage | calls | chars sent | seconds | cost USD |
|---|---|---|---|---|
| triage | 13 | 57546 | 45.313 | 0.004834 |
| pick | 5 | 13455 | 53.470 | 0.003877 |
| fill | 4 | 17706 | 24.836 | 0.002321 |
| card | 3 | 9313 | 31.076 | 0.001624 |

## Adapter: chat

- valid-output rate: 0.966 (28/29)
- quote-found rate: 1.000 (5/5)
- rate-limit errors: 0

### Abstain reasons
- no_agent_reply: 1
- invalid_output: 1

### Kinds picked
- pick_option: 1
- snooze: 1
- continue: 1
- ask_human: 2
- reply: 1
- send_feedback: 1

### Proposals by step count
- 1 step: 4
- 2 steps: 1
- 3 steps: 0

### Stages
| stage | calls | chars sent | seconds | cost USD |
|---|---|---|---|---|
| triage | 13 | 58586 | 40.366 | 0.004304 |
| pick | 6 | 15485 | 58.455 | 0.004132 |
| fill | 7 | 18038 | 54.895 | 0.004958 |
| card | 3 | 8630 | 18.204 | 0.001830 |

## Digest model

- valid-output rate: 1.000 (13/13)
- rate-limit errors: 0

### Stages
| stage | calls | chars sent | seconds | cost USD |
|---|---|---|---|---|
| digest | 13 | 40815 | 46.807 | 0.014781 |
| shrink | 0 | 0 | 0.000 | 0.000000 |

## Failure drills

Each drill runs on its own scripted model, and its rows are in the drills folder of the log folder.

- rate_limit: model_error
- malformed_json: invalid_output
- empty_quote: quote_not_in_brief
- timeout: model_error

## Go or no-go

### abort_if 1

- condition: the interpreter model returns valid, grounded output on too few real stops to build on, and the digest model cannot digest either
- verdict: refuted
- basis: real sessions with no Abstain: json 3/3, chat 3/3. Real sessions with a stored digest: digest 3/3. The condition holds when fewer than half of the real sessions end with no Abstain for each adapter and no real session has a stored digest

### abort_if 2

- condition: a hook in a live session cannot be made safe: it blocks the session and the bypass file does not release it
- verdict: not measured
- basis: the replay makes no hook call, so it cannot show whether a hook blocks a session
