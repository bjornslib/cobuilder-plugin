# priority.dev: options research (round 2)

This file keeps the research behind the technology choices. `v0.1-scope.md` holds the current scope and decisions. Where the two differ, `v0.1-scope.md` wins. Date: 2026-10-23.

Evidence marks: **source** means someone read the primary page. **summary** means a WebFetch summary. **claim** means a secondary source or a vendor states it. **inferred** means my reasoning.

## 1. Interpreter and System-One models

**DSPy (source: the DSPy docs and pull request 10463).** Pull request 10463 merged on 2026-09-24. It adds experimental decision types to `dspy.Predict`.

- `Noul` is a yes or no with a probability and a threshold. `Choice` picks one label from a list. `Score` rates on ordered levels. Each returns a value, a confidence, and probabilities.
- The confidence is the distance from the threshold. It is not a calibrated probability.
- `dspy.LM("typesafe:jev-latest")` with `TYPESAFE_API_KEY` selects Jev. An ordinary generative model (for example `openai/gpt-4o-mini`) works with the same signature, through the chat or JSON adapter, with probability evidence. A program can mix both.
- `ReAnchor` fits the thresholds, cuts, and weights to a labelled training set. It works with cached calls. It is the only optimiser the tutorial describes.
- A saved program is a JSON file. A Jev backend does not support streaming, `BestOfN`, `Refine`, generative optimisers, or fine-tuning.
- The pull request example names `dspy: 3.4.0b1`. I could not confirm which release holds the feature. Pin the version.
- Local model setup is not stated in the docs. A local model that serves a chat API should work through the generative path (inferred).

**The cascade (engineer's decision, 2026-10-23).** Jev decides first. At the end of each turn, a fixed set of typed questions runs on a clipped slice of the transcript: the status (`Choice`), whether a human must answer (`Noul`), the risk (`Score`), and a priority suggestion (`Score`). The stage forwards a case to a language model when the confidence is below a threshold, or when Jev says the status is `waiting_answer`. The language model reads the case, quotes the line that supports its reading, and writes a typed proposal. The forwarding rule is code. `ReAnchor` fits its thresholds on shadow data. The advisor never decides alone, because the policy engine still decides. An optional language-model-only classifier can run on a sample in shadow mode as a baseline.

**Open-weight System-One models you could host (source: systemonemodels.org summary, with search results).**

| Model | Open weights | Context | Licence | Note |
|---|---|---|---|---|
| Liquid AI d1-3B | Yes, released 2026-10-07 | 32,768 tokens (claim) | LFM Open License, free below about $10M revenue (claim) | About 8 ms on an RTX 4090 (claim). Runs on llama.cpp, vLLM, and Ollama (claim). A laptop candidate. |
| Liquid AI d1-omni-600M | Yes | Not found | Not found | A smaller laptop candidate. |
| Perplexity pplx-decider-v1.1-27b | Yes, on Hugging Face | 262,144 tokens (claim) | Apache-2.0 (claim) | A 27B model, so it needs a GPU. A private cloud candidate. |
| Fastino GLiDE v1.2 | Yes | Not found | Fastino's own licence, which limits large companies | Based on Qwen3.8-27B. |

The site says that no standard interface exists for System-One models. Only the TypeSafe client is built into DSPy. For the others, check whether the model serves a chat API that DSPy can call. I did not verify this.

Our transcript slices run from 8,000 to 32,000 tokens. d1-3B fits at the upper edge. Test it before you rely on it.

**Jev (source: Wikipedia and DigitalOcean summaries).** The API limit is 64k tokens. Data retention and rate limits are not stated. You stated that Jev has no self-hosting option.


## 2. The harness

**Your belief about Claude Code cloud sessions is partly right.** A documented way to send a message exists: `claude -p "msg" --cloud <session-id>` queues a message and returns JSON (source: Claude Code docs, read by an agent). It needs a claude.ai sign-in. No documented way exists for an outside program to read a cloud transcript or status. I verified in this session that the `claude-code-remote` MCP server returns the session record and transcript events from inside a session. Whether an outside process can use it is not verified.

**Billing changes the answer.** A secondary source (The Register, 2026-05-14) reports that from 2026-06-15 only interactive use draws on plan limits. It reports that `claude -p`, the Agent SDK, and third-party tools draw on a separate credit, then API rates. I could not find the Anthropic page. If true, a fleet of 20 headless agents costs API prices. The Pi docs say that third-party harness use on a Claude subscription "is billed per token through extra usage" (source: Pi provider docs, read by an agent). Anthropic reports about $13 for each developer for each active day. Twenty busy agents would cost about $260 to $600 a day at that rate (inferred, not measured).

| Option | Read | Send | Resume | Billing | Risk |
|---|---|---|---|---|---|
| **A. Claude Code in tmux** | Hooks, transcript file, `claude agents --json` | tmux keys, hook answers | `--resume` | Interactive, plan limits (claim) | Preview CLI features, lagging transcript, unknown limit for 20 sessions |
| B. Claude Code cloud | In session only. Outside: unknown | `--cloud` send | Anthropic | Plan | Undocumented read |
| C. Pi Durable as host | `watch()` | `submit`, steer | Checkpoint resume | Per token for Claude | Experimental, TypeScript only |
| D. Pi through RPC | JSON lines, `get_entries since` | `prompt`, steer | Partial | Per token for Claude | Moderate |
| E. Claude Code headless | stream-json | stream-json | `--resume` | Programmatic credit, then API (claim) | Cost |
| F. Codex app-server | Yes (agentbox) | Yes | Unknown | ChatGPT plan or key | Not checked |
| G. Omnigent | Not found in docs | Not found | Not stated | Not stated | Alpha, undocumented events |

**Recommendation.** Build v0.1 against option A. Reasons:

- A human can still attach to the pane.
- A hook is a synchronous gate that code controls. The `PermissionRequest` and `PreToolUse` hooks receive structured tool input and can allow, deny, ask, or rewrite (source: Claude Code hooks docs).
- It stays on plan limits if the billing report is true.
- It matches your agents today.

Pi Durable is the better long-run engine for resumable work. It is experimental and TypeScript only, and it covers only the sessions that run in it. Put it in v0.2 behind the same port. A Pi adapter through RPC can be written in Python, because RPC is JSON lines. Check Omnigent in a one-week spike, because it already wraps Claude Code, Codex, and Pi.


## 3. Technology for each component (round 2 table)

| Component | v0.1 | Later | Avoid |
|---|---|---|---|
| Session adapter | tmux adapter for Claude Code. A fake adapter for tests | Pi RPC, Omnigent, Pi Durable host, Claude Code cloud send | Screen scraping for enforcement |
| Event log | **Round 3 change:** Postgres from v0.2 (see `v0.1-scope.md` section 6). The v0.1 lab uses plain files. | A broker only as a transport on top of the log | RabbitMQ or Redis as the system of record. Kafka, JetStream |
| Queues | Tables in the same Postgres database, as projections of the log | DBOS if timers are needed | A job-queue library |
| Runtime | Python 3.12 or later: DSPy, Pydantic, FastAPI. Adapters in Python | TypeScript for clients and a possible Pi Durable host | Two runtimes inside the service |
| Durable execution | Cursors, idempotency keys, intent then effect | DBOS on Postgres | Temporal |
| Event schema | Pydantic models, JSON Schema export, `schema_version` on each row, CloudEvents-style envelope | Protobuf if needed | Hand-written JSON Schema |
| Interpreter | DSPy decision types. A generative model and Jev side by side in shadow mode | Open-weight System-One model. `ReAnchor` on shadow data | Jev only |
| Policy engine | Typed Python rules from one YAML file. Verdicts ALLOW, DENY, ASK. A policy version hash on every decision | Cedar or OPA for several authors | Rego now. Rules only in prose |
| Fixed deny list | Code. tree-sitter-bash parse. An unparseable command escalates | A command allowlist that grows from logs | A regex as the only layer |
| Enforcement points | The hook (fail closed with exit code 2) and the actuator re-check | A sandbox as a backstop | A hook as the only point |
| Sandbox | None for host sessions. The control plane runs in Docker. The advisor has no shell and no tools | Docker per project with an egress proxy. SPACE in the cloud | SPACE now |
| Credentials | The DSPy process or a local proxy holds the key. No key enters a container. A secret scan on outgoing replies | Gateway injection | Keys in a sandbox |
| Inbox API | REST and SSE with a cursor. An answer POST with an idempotency key and the item version. Bearer tokens | Passkeys or OIDC in the cloud | tRPC, GraphQL subscriptions |
| Clients | React web app (PWA) and a command line | An Expo shell | |
| Notifications | The inbox-stream plugin and a host desktop notifier process | ntfy with content-free push, an email digest | Content in a push body |
| Remote access | Local only, then Tailscale with a token for a phone | | A public port |

A PWA push works on iOS only for an app on the Home Screen (summary). The EU status in 2026 is unknown. Use ntfy for a dependable phone alert.


## 4. Proposed wording for principle 2 (an implementation slice)

The current text says: "Claude writes judgment, scripts move data. Claude writes the narrative, the ADRs, the assessments, and the diagram sources. Scripts fetch diffs, compile, convert, and verify. A script never writes content." The Layout list adds: "Never hardcode judgment in a script or a skill body."

Proposed replacement:

> **2. Enforce in code what code can enforce.** When a script, a gate, or a policy file can check a rule, write the rule as code or data and enforce it with a check. An agent can ignore prose, so prose alone never enforces a rule. Use a skill or a reference file for judgment that code cannot encode, and to explain why each rule exists. Document every principle and every rule. Claude writes the narrative, the ADRs, the assessments, and the diagram sources. A script may write content when a typed schema or a policy file governs it.

And in the Layout list: "Put judgment that code cannot encode in `references/*.md`. Put every rule that code can enforce in code or data, with a test."

This wording keeps the old rule for authored documents and removes the ban on code that enforces policy. It covers a compiled DSPy program and a deny list in code. I have not edited `CLAUDE.md`.

