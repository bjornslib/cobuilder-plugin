# priority.dev: the roles and the technology for each component

Status: draft for decision (round 4). This file is the source of record for the page "priority.dev component choices". The scope and the lab are in `v0.1-scope.md`. Earlier research is in `options-research.md`. Date: 2026-10-23.

Evidence marks: **read** means an agent or I saw the primary source. **ran** means an agent ran it. **inferred** means reasoning or memory. **claim** means a vendor or a secondary source states it.

Four Sonnet agents explored the options. They share one fact sheet that I wrote, so they share my framing. Two of them checked few external claims. Where a claim is not verified, this file says so.

## 1. Your answers from round 3

| Point | Answer | Effect |
|---|---|---|
| v0.1 scope | Approve the transcript lab | The lab is v0.1. |
| Thresholds | Accept: false auto-answer at most 1%, interruption reduction at least 50%, status accuracy at least 90%, needs_human recall at least 95% | Used by the lab report. |
| Transcripts | All projects, last 4 weeks, read-only | The lab reads `~/.claude/projects`. |
| Labels | Model-assisted, with your spot-check | Needs safeguards. See section 5. |
| Storage | Postgres from v0.2, plain files in the lab | As planned. |
| Attaching | Attach to all running sessions by default | As planned. |
| Event log | Postgres, no RabbitMQ or Redis | As planned. |
| OpenRouter model | `anthropic/claude-haiku-5.5` | **Verified.** The public OpenRouter list shows it at $0.10 per million input tokens and $0.50 per million output tokens, with a 1,000,000-token context. A `:batch` variant costs half. |
| Action loop | Your note describes a relay (see section 2) | Settled in section 2. |

## 2. Interpreter, policy, and actuator: the roles

You asked whether the interpreter has the smarts and proposes, the policy enforces the configured allowed actions, and the actuator takes the accepted action in a programmatic way. **Yes. That is the design.** The standard names are a policy decision point (the policy) and a policy enforcement point (the actuator).

Your two descriptions are not quite the same design:

- **Description A:** the actuator attempts to send, and the policy sits in the path as a relay that forwards or rejects. The actuator holds the power to send and asks for permission. If any code path skips the relay, the send still works.
- **Description B:** the interpreter proposes, the policy decides, and the actuator takes only an accepted action.

**Recommendation: B, with the check of A kept.** The actuator is the enforcement point. It asks the same policy function again just before it acts. This keeps your word "attempt": the actuator attempts, and the attempt succeeds only when the policy says yes at that moment.

| Role | Verb | Uses a model | Has side effects | Holds |
|---|---|---|---|---|
| Interpreter | Proposes | Yes, the only part that does | No | Model keys (TypeSafe, OpenRouter). No power to send. |
| Policy | Decides | No | No | The rules and the deny list. A pure function `evaluate(action, state)`. |
| Actuator | Executes | No | Yes, the only part | The signing key and the power to send through the adapter host. |

**The flow.**

1. The interpreter writes a proposal event: a reply, an approval, or "ask a human".
2. The policy stage runs `evaluate` and writes a decision event: ALLOW, DENY, or ASK, with a rule id, a policy hash, and the hash of the exact action.
3. For ALLOW, the actuator checks that the decision matches the action hash. It runs `evaluate` again with fresh state, because the state may have changed. If it still says ALLOW, the actuator writes an intent, sends, and writes the effect.
4. For DENY or ASK, or when the re-check fails, the actuator opens an attention item with the reason.
5. Your answer becomes a human-authored proposal. A policy rule allows it, and it follows the same path.

**What must be true so that no path sends input without an accepted decision** (inferred, not tested):

1. Only one module, `actuator/tmux.py`, calls tmux. A test searches the repository for other uses.
2. The send function accepts only a `Decision` object that only `evaluate` can build. A raw string is a type error.
3. The send function checks the action hash and runs `evaluate` again.
4. The adapter host on your Mac accepts a command only if it carries a signature (HMAC) that it can verify. The interpreter does not hold the key.
5. Every send writes the intent first. A test asserts that no effect exists without an intent and an ALLOW decision.

**A conflict between two reports.** One report says the interpreter must not hold the signing key. Another recommends one Python process with one task for each stage. In one process, the interpreter code can reach the key in memory. The fix is to split by credential in v0.3. See section 3, process split.

## 3. Technology choices

Marks: v0.1 is the lab. v0.2 and later is the service.

### 3.1 The lab and the interpreter

| Part | Choice | Why, and what loses | Main risk |
|---|---|---|---|
| DSPy | `dspy[typesafe]==3.4.1` | **Read in the PyPI wheels:** 3.3.1 has only an empty `experimental` module. 3.4.0 (2026-09-25) and 3.4.1 (2026-10-12) add `decision.py` and `typesafe.py`. Loses: raw LiteLLM and Pydantic (no `Noul`, no `Evaluate`), Instructor or PydanticAI (no calibrated confidence from Jev). | `dspy.experimental` has no stability promise. A live call to Jev is untested. |
| Classifier stage | One `dspy.Module` with `dspy.Predict(Classify)` and `lm=TypeSafe("jev-latest")`. Outputs `needs_human` (`Noul`), `status` (`Choice`), `risk` (`Score`). | Clip the slice before the call because of the 64k limit. | The names come from the PR page, not a run. |
| Forwarding rule | Plain Python function, not a module. Forward when the confidence is below the threshold or the status is `waiting_answer`. It returns a reason for the log. | A model never decides this. | Threshold needs shadow data. |
| Advisor stage | `dspy.Predict(Advise)` with `dspy.LM("openrouter/anthropic/claude-haiku-5.5", temperature=0)`. Output is a Pydantic `Proposal` with `kind`, `text`, and `evidence_quote`. | A code check requires the quote to appear in the slice as an exact substring. If not, the proposal becomes `ask_human`. LiteLLM routes `openrouter/<id>` (read in its docs). | No live call yet. |
| Baseline | The same `Advise` signature on every slice, with no Jev. One `Interpreter` module with a `mode` flag (`cascade` or `llm_only`). | Both modes score the same way. | None. |
| Tooling | `program.save` and `load`, `dspy.Evaluate`, DSPy cache, `track_usage`, async calls | **Inferred** from DSPy 3.x. Verify the names against 3.4.1. | Names may differ. |
| Transcript parser | Plain dicts with small typed views. Count unknown records. Skip a truncated last line. | A strict Pydantic union breaks on a new record type. | Sources disagree on sidechain records. |
| Slicing | Cut at each `assistant` record with `stop_reason == "end_turn"`. Keep the last user message and the final assistant text whole. Fill backwards. Clip tool results first. Target about 56k tokens. | Jev's tokenizer is unknown, so use an estimate and test a real input above 64k. | Clipping loses context. |
| Redaction | `detect-secrets` plus a short regex list (home paths, emails, `.env` lines, URLs with credentials). `gitleaks` as a second pass later. | Presidio is heavy and aimed at personal data. | Split or encoded secrets slip through. |
| Lab storage | JSONL files, with DuckDB for analysis | SQLite adds nothing that JSONL lacks. | None. |
| Labelling tool | A `rich` command line tool. It hides the model labels and shows the history label after you answer. Keys `y`, `n`, `u`, `s`. | Textual is more than the lab needs. | None. |

### 3.2 Policy and actuator

| Part | Choice | Why, and what loses | Main risk |
|---|---|---|---|
| Policy engine | Typed Python rule functions plus one TOML file. `Rule = Callable[[Action, State], Verdict or None]`. Fixed order: the first DENY wins, then ASK, then ALLOW. No match gives ASK. | The rules need state (counts for each session, time since last human input, project opt-outs), and the deny list needs a parser. Both are code. Loses: **OPA/Rego** (a new language, poor state, a binary or sidecar), **Cedar** (`cedarpy` 4.12.2, read on PyPI: readable and has a validator, but no state by design). | A rule bug allows an action. A rule can raise or read the clock. |
| Policy mitigation | Wrap each rule so an exception becomes DENY with the rule id. Rules are pure functions of `(action, state)`. | | |
| Policy version | SHA-256 over the rule source files, the TOML, and the deny-list data. Each decision records `rule_id`, `policy_hash`, `action_hash`, and `state_digest`. | | |
| When to move | To Cedar, when someone other than you edits the policy, or when you need static checks. Keep it a pure `is_authorized` call. | CEL (`cel-python` 0.5.0, `common-expression-language` 0.10.0), Casbin (1.43.0, 17 months old), and decision-table libraries (dead) lose. | |
| Shell parser | `tree-sitter` 0.26.0 with `tree-sitter-bash` 0.25.1 | **Ran by an agent on 21 commands.** It parses `time`, `coproc`, `[[ ]]`, and quoted here-docs. `bashlex` 0.18 raises on all four. Neither stops `x=rm; $x -rf /`, so rule 3 below carries the weight. Go parsers were not tested. | Indirection passes the parse. |
| Unparseable rule | Any one of these gives ASK, or DENY for the deny-list category: (1) invalid UTF-8, over the size cap, or a NUL byte. (2) any `ERROR` or missing node. (3) the command name of any simple command is not a plain literal word (a variable, a substitution, an ANSI-C string, or a concatenation). (4) the command is `eval`, `source`, `.`, `exec`, `bash -c`, `sh -c`, `xargs`, `env` with a command, `sudo`, or a pipe into a shell. Recurse only into a single-quoted literal. (5) the parser raises, times out, or recurses too deep. | The verdict is the strictest over all simple commands. | |
| Corpus | About 200 commands in JSONL `{cmd, expected, why}`: about 80 from your transcripts (every Bash `tool_use` input, de-duplicated and labelled by hand), 60 hand-written evasions, 40 from public lists (check each licence), and 20 malformed inputs. A test asserts that no `must_not_allow` command is ALLOW, and a fuzzer mutates each command. | The honest claim is "zero allows on the corpus and its mutants". It does not prove the parser. | |
| Hook | A `PreToolUse` hook with `onFailure: "block"` (Claude Code 2.1.295 or later), a timeout of about 5 seconds, and exit code 2 on any error. It evaluates the same policy function in-process from the installed files. It needs no network. Stale counters fail toward ASK or DENY. | **Read in the hooks docs:** only exit 2 blocks, a timeout does not block, and the default timeout is 600 seconds. An HTTP hook to the service loses, because the service may be down. | Whether the hook runs in `-p` mode and in bypass mode is unknown. Test it. |
| Actuator | Intent, re-check, send, effect. The idempotency key is the action hash. A unique key stops a second try. If the process dies between intent and effect, the actuator never resends. It marks the action `unknown`, checks the pane, and a human decides. | At-most-once is the right default for text into a terminal. | A lost send needs a human. |
| Send method | `tmux load-buffer`, then `paste-buffer -p -r`, then a separate `send-keys Enter`. Prefer single-line replies. Check that the pane sits at an empty prompt first. | **Read:** `paste-buffer` turns a line feed into a carriage return unless `-r` is set. Reports from March and April 2026 say `send-keys -l` stopped working after an interrupted paste, and that multi-line input can lose newlines. | Newlines and paste behaviour. |
| Confirm a send | Tail the transcript for a user record that matches the text, within a timeout. `capture-pane` is the fallback. | The transcript may lag. | Lag unknown. |
| Layout | `policy/evaluate.py` (pure), `policy/rules/*.py`, `policy/denylist.py`, `policy/version.py`, `state/snapshot.py`, `actuator/attempt.py`, `actuator/tmux.py` | Both the policy stage and the actuator import `evaluate`. | |
| Process split (v0.3) | Two processes. The `interpreter` holds the model keys and no signing key. The `control` process holds the policy, the actuator, and the signing key, and no model key. | Least privilege by credential. A model call that follows a poisoned transcript then cannot reach the power to send. This also answers the conflict in section 2. | One more process to run. |

### 3.3 The service and the data

| Part | Choice | Why, and what loses | Main risk |
|---|---|---|---|
| Web framework | FastAPI 0.135.0 or later, with its own server-sent events | **Read:** `fastapi.sse` offers `EventSourceResponse` and `ServerSentEvent` with `id`, `event`, and `retry`. Loses: Litestar, bare Starlette. | The module is new. Pin the version. |
| Database driver | psycopg 3, async, with plain SQL | `AsyncConnection.notifies()` handles LISTEN, and 3.2 added a timeout (read). Loses: asyncpg (speed is not the limit), SQLAlchemy (too much for about six tables). | Hand-written SQL. |
| Migrations | A 40-line runner over `migrations/NNNN_name.sql` with a `schema_migrations` table, run at start inside a transaction | Alembic needs models to pay off. | Low. |
| Postgres image | `postgres:17` on a named volume | **Inferred.** Pin the major version, because version 18 images moved the data directory. | Version pin. |
| Event table | `events(seq identity, event_id, idem_key unique, kind, session_id, stream, payload jsonb, created_at)` and `cursors(consumer, last_seq)` | Idempotency key such as `transcript:<session>:<byte offset>` or `action:<action hash>`. | Untested. |
| Append | One function in one transaction: `pg_advisory_xact_lock(1)`, then `INSERT ... ON CONFLICT (idem_key) DO NOTHING RETURNING seq`, then `pg_notify('events', max_seq)` | The lock makes writers take turns, so `seq` order equals commit order and a reader at `seq > cursor` cannot skip a row. Cost: one writer at a time. | Writer throughput. Fine for one developer. |
| Readers | `LISTEN events`, then read from the cursor. Re-read on every notify and on a 30-second timer, because a notify is not stored. The SSE `id` is `seq`, and `Last-Event-ID` is the cursor. | | |
| Stages | One Python process with one asyncio task for each stage (v0.2). Each stage reads past its cursor, writes outputs, and advances the cursor in one transaction. A crash replays at most one batch, and the idempotency keys make that harmless. Model and Jev calls use async `httpx` with timeouts. | Loses: one container for each stage, and Celery (Postgres is the queue). | A blocking call stalls other stages. v0.3 splits the process (see 3.2). |
| Batching windows | A Postgres sweeper task every 5 seconds, with `FOR UPDATE SKIP LOCKED` | APScheduler adds a job store and a second source of truth (inferred). | Clock drift. |
| Configuration | `pydantic-settings` with the prefix `PRIORITY_`. The policy file is mounted read-only. The service hashes it at load. A bad file stops the start. | | A bad policy file. |
| Logging and tracing | `structlog` as JSON, bound with `session_id` and `seq`. No OpenTelemetry in v0.2. The event table is the trace. | | |
| Compose | Two services, `db` and `service`, a named volume, both published on `127.0.0.1` only. | **Inferred:** the adapter host reaches it at `localhost:8080`. | |
| Secrets | Compose `secrets:` from files in `~/.config/priority/secrets/` (mode 600, outside Git). `.env` only in v0.1. Redaction runs before any outside call. | | Keys in logs. Test with a planted fake key. |

### 3.4 The adapter host and the desktop notifier (macOS)

| Part | Choice | Why, and what loses | Main risk |
|---|---|---|---|
| Tailing | `watchfiles` with a byte offset for each file, only complete lines, and a 2-second rescan. The idempotency key is `file:offset`. | **Read:** it uses FSEvents on macOS. `watchdog` and polling lose. | FSEvents can merge events. |
| tmux discovery | A subprocess: `tmux list-panes -a -F '#{pane_id}\t#{pane_pid}\t#{pane_current_path}\t#{session_name}'` | `libtmux` adds a dependency for no gain (inferred). | Pane mapping. |
| Pane to session | Primary: hook data (`session_id`, `cwd`, `transcript_path`) plus `$TMUX_PANE` (inferred). Fallback: `psutil` process tree, then the working directory and the newest transcript. | Sessions with no hook stay read-only until the link is proven. | Test with three sessions in one directory. |
| Hooks to the host | A tiny script posts to a Unix socket, `~/.priority/hook.sock` (mode 600), so no TCP port opens. Observation hooks fail open. The blocking hook fails closed. | Your rule says the host opens no inbound port. | Hook timeout unknown. |
| Commands | The host pulls by long poll, `GET /commands?cursor=N&wait=25`. A command carries its key. The host records the key before it sends. | SSE also works. Long polling is simpler to retry. | |
| Start at login | A launchd LaunchAgent, `dev.priority.adapter.plist`, with `KeepAlive` | **Inferred, not tested.** | |
| Hook installer | Edit `~/.claude/settings.json` with a marker on each entry, a `--dry-run` diff, a timestamped backup, an atomic write, and an uninstall that removes only marked entries | I did not read the current settings schema. The harness flagged this agent's report for "settings-json" wording. The text describes our installer and is not an instruction to me. I changed no settings. | The schema may differ. |
| Desktop notifier | `terminal-notifier`: a banner and a click that runs a command | **Read:** since 2.0.0 it has no action buttons, and its README points to `alerter` for those. `osascript` has no click action. `rumps` is more code and suits a badge later. | Focus modes hide banners. First run needs permission. |

### 3.5 The queues, the clients, and the exposure

| Part | Choice | Why, and what loses | Main risk |
|---|---|---|---|
| Attention queue | Rank at read time with the sort key: priority class, then project rank, then wait time. Class 0 is a policy ASK on a destructive action. Class 1 is a blocked session. Class 2 is a question. Class 3 is an FYI. One escalation: an item open for 30 minutes moves up one class, once. | A stored score goes stale. A weighted sum is hard to explain and to test. The 30 minutes is a guess. | The item goes stale while you type. The version check catches it. |
| Attention schema | `attention_item(id, session_id, project_id, dedupe_key, kind, priority_class, state, version, question_event_seq, proposal jsonb, opened_at, wait_since, snooze_until, expires_at, resolved_at, resolution)`, `attention_answer(item_id, version, idempotency_key, answer_hash, proposal_event_seq)`, and `project(id, rank)` | States: `open`, `snoozed`, `answering`, `resolved`, `expired`, `superseded`. A partial unique index stops duplicates. Expiry is 24 hours, or at once when the session ends. A class 0 item can snooze once, for 15 minutes. | |
| Answer post | `POST /items/{id}/answer` with `If-Match: <version>` and an `Idempotency-Key`. A stale version returns 409. | | |
| Notification queue | A `notification` table with one row for each item version and channel. A planner function writes rows. Workers claim them with `FOR UPDATE SKIP LOCKED`. | | An away check that is wrong. |
| Notification plan | Class 0: at once, no limit, ignores quiet hours. Class 1: at once, with no upper limit. Class 2 and class 3: batched, and one batch counts as one notification (windows in `schemas.md` section 6). Quiet hours 22:00 to 07:00 allow only class 0. The desktop is the first channel. If the desktop is idle for more than 3 minutes, or no client has been seen for 3 minutes, the phone gets the push. | **Inferred.** Tune on lab data. The two-toast window is not closed. | |
| Notifier plugin | A Python `Protocol` with `deliver`, `ack`, and `caps` (push, actions, content_ok, ack_back, batch). A plugin gets content only if `content_ok`. A plugin never decides timing. | | |
| Web client | React, Vite, and TanStack Query, with `fetch` streaming for SSE | **Read:** `EventSource` cannot set headers. HTMX needs a query-string token or cookie and gives no path to mobile. SvelteKit reuses nothing from the repository viewer. | iOS push through a PWA. |
| Keys | `j` and `k` move, `a` approve, `r` reply, `s` snooze, `?` help | | |
| Command line client | Typer for commands and Textual for a live triage view: `pri` and `pri triage` | Click adds boilerplate. Rich alone has no input. | Two clients may drift. Both use one generated API client. |
| iPhone push | ntfy, self-hosted, with `upstream-base-url: https://ntfy.sh` | **Read in the ntfy docs:** a self-hosted server sends the upstream only a message id and a topic hash, and the real text stays on your server. The cost is time metadata. Use a dedicated write-only ntfy user. Pushover ($4.99 once for each platform, read) is the second plugin. Web push (VAPID) is the free third channel. | Late delivery if the upstream setting is wrong. |
| Authentication | Bind to `127.0.0.1`. One bearer token for each client, hashed, scoped, and revocable. The adapter host token can only pull commands and post events. Phone access over Tailscale (`tailscale serve`). The web client keeps the token in memory or an `HttpOnly`, `SameSite=Strict` cookie. | Skip passkeys in v0.4. Skip query-string tokens. Tailscale details are **inferred**. | A stolen token. Revoking must close the stream within seconds. |

## 4. One-day tests, by risk

| Test | Settles |
|---|---|
| Import gate: `from dspy.experimental import Noul, Score, Choice, TypeSafe`, plus one live call through `openrouter/anthropic/claude-haiku-5.5` and one through Jev | The interpreter stack runs at all. |
| Parse every local transcript and count unknown records | The parser is tolerant enough. |
| Plant 30 known secrets in a fixture slice and print the misses | What redaction misses. |
| Label 50 slices with both labellers and compute Cohen's kappa | Whether the labels are usable. |
| `PreToolUse` hooks that exit 1 or sleep past the timeout, with `onFailure: "block"`, in interactive, `-p`, and bypass mode | Whether the hook fails closed. |
| The 200-command corpus with mutants | Zero allows on the corpus. |
| Kill the actuator between intent and send, and between send and effect | A send happens zero or one time, never two. |
| Property test with Hypothesis: 10,000 random actions evaluate the same twice, a raising rule gives DENY, and an empty rule set gives ASK | The policy function is pure. |
| 20 concurrent writers and 3 readers for a minute | No reader skips or repeats a `seq`. |
| Three sessions in one directory | Pane mapping is right. |
| A two-line text with a quote, `$`, and a trailing newline through `paste-buffer` | The transcript record equals the input. |
| 100 concurrent answers with two keys and two versions | Exactly one `answering` row. |

## 5. The lab labels: a correction

You chose model-assisted labels with your spot-check. The risk is that the labels share the bias of the model under test. This procedure limits it:

1. Write a rubric with you before any model runs. Include a list of reasons that a human is needed and 10 worked examples.
2. **History** is an independent signal: what the next record was.
3. **Labeller B** is `anthropic/claude-sonnet-5.5` (batch) with the rubric. **Labeller C** is a non-Anthropic model, `deepseek/deepseek-v4.1-flash` (cheap) or `openai/gpt-5.6-terra` (stronger). Both exist on OpenRouter (read in the public list).
4. Report Cohen's kappa for B against C, and for each against history. Keep a label where B, C, and history agree. Send disagreements to you first.
5. Your subset is a stratified random sample from the agreed labels, to catch shared bias, plus every disagreement. The tool hides the model output.

**My earlier estimate was too low.** I said 150 slices, about 75 minutes. A one-sided 95% bound of 1% on the false auto-answer rate needs about **299 slices with no errors, 473 with one error, and 628 with two** (standard values, inferred, not run here). The sample must come from slices that the cascade would answer alone, because that is the denominator. If it answers 30% of 5,000 slices, that is about 1,500 slices, and you would check 300 to 500 of them. At 30 seconds each that is about 2.5 to 4 hours. Start with 150 and extend if the bound needs it.

For the needs_human recall of 95%: zero misses in 60 true positives bounds the miss rate at 5%. Aim for at least 100 positives.

When your subset is too small, the report shows n, the errors, and the upper bound. It says "not proven" for that criterion, not "pass".

**Cost for 5,000 slices of 10,000 input tokens** (50 million tokens, 300 output tokens each, no caching, every slice to every model, OpenRouter list prices):

| Model | Cost |
|---|---|
| Jev (vendor claim of $0.042 per million input tokens, output cost unknown) | about $2.10 |
| Haiku 5.5 | about $5.75 (about $1.70 if the cascade forwards 30%) |
| Sonnet 5.5 | about $115 (about $57.50 on batch) |
| Opus 5.5 | about $230 (about $115 on batch) |
| DeepSeek v4.1 flash | about $9.25 (about $2.70 on batch) |

My recommendation is Sonnet 5.5 on batch for labeller B and DeepSeek on batch for labeller C, about $60 together. Opus costs twice as much for a gain that I cannot measure.

## 6. Risks and unverified claims

- The agents did not run the DSPy types or reach Jev. The import gate test does.
- The dspy.ai pages returned only redirect stubs, so the `Evaluate`, save and load, and async names are inferred.
- Whether `PreToolUse` fires in `-p` mode, whether a hook deny overrides bypass mode, and the hook timeout are unknown.
- `tmux` newline behaviour comes from user reports and the tmux source. Nobody tested it on your Mac.
- The transcript structure for sidechain records comes from community docs. Sources disagree. Check your own files.
- The launchd, FSEvents, and `$TMUX_PANE` claims are inferred.
- The policy rule order, the 30-minute escalation, and the notification windows are proposals with no data.
- The Postgres append design is untested.
- I did not test any code in this round.

## 7. Deviations from the `/architect:design` procedure

1. The skill is not registered in this session. I followed `SKILL.md` and `design-mode.md` by reading them.
2. Four Sonnet agents explored this round from one shared fact sheet. A separate critic agent did not run.
3. Files sit in `priority-dev/docs/design/`. No `goal.json` exists.
4. The action loop figure changed. The target diagrams (level 1 and level 4) are not redrawn.
