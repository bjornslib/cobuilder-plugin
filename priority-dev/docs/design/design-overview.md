> **Update 2026-10-23 (round 3).** The engineer ruled that the actuator attempts an action and the policy accepts or rejects it, and that the service stores its log in Postgres. The pipeline order and the storage in this file are older. `v0.1-scope.md` holds the current reading (sections 6 and 7). The diagrams are not yet redrawn.

# priority.dev high-level design (v2)

Status: draft for the engineer to settle. Stages 0 to 4 of `/architect:design` have run. This version covers the high-level design only. The engineer will review the detail (the three hard parts, the policy, the deny list, and the delivery windows) after this version is settled. The first version is kept in `v1/`. Date: 2026-10-22.

## What changed since v1

| The engineer said | The design now |
|---|---|
| A plain-code reducer cannot read a transcript. | The interpreter sends transcript content to a model. Plain code maps only structured facts, such as a session that ended. |
| The interpreter must pipe session data to different places and use different methods. | The interpreter is a router with pluggable stages. One event can go to several stages at once, so two methods can run side by side. |
| A System-1 model such as Jev, or DSPy, may fit. | Both fit as stages. See the interpreter section. |
| The chain is session, interpreter, events, policy, actuator, attention queue. | Accepted, with the event log under every stage. See the pipeline section. |
| "Web inbox" must become "inbox". Mobile and web must need no architecture change. | One inbox API. The web viewer, a mobile app, and a command line are clients. |
| Notifications are a separate part, with a queue. Desktop is one target. | A notification queue and notifier plugins. Desktop, mobile push, and email are targets. |
| The service runs in a Docker container. | The service runs in Docker. Sessions stay on the host, so a small adapter host sits next to them. See the deployment section. |

## Outcome

A developer runs up to 20 coding agents across several projects. Only the sessions that need a human reach the developer, ranked by the developer's own priorities. An advisor answers the rest under a policy that the developer sets and can audit.

## The pipeline

The chain is: session, interpreter, events, policy, actuator, attention queue. A notification queue follows the attention queue.

My v1 diagram did not draw this chain. It linked the interpreter straight to the actuator and to the queue, and it hid the policy inside the actuator. The engineer's chain is cleaner, so v2 follows it.

Three points make the chain precise:

1. The event log sits under every stage. Each stage reads events from its last cursor and appends events of its own. A stage can fail, restart, or be replaced with no loss.
2. Escalation is an action. The policy engine decides to escalate, and the actuator carries it out by opening an item in the attention queue. A human answer comes back as an event, and the actuator sends it.
3. The advisor proposes and the policy decides. The advisor is a stage in the interpreter. It writes a proposed reply as an event. The policy engine is deterministic code, so the fixed deny list never depends on a model.

### Event classes

| Class | Producer | Examples |
|---|---|---|
| `session.*` | Session adapter | started, turn_ended, permission_requested, output, ended, liveness |
| `fact.*` | Interpreter stage | status, attention kind (skip, answer, decide, do), with confidence and an evidence reference |
| `proposal.*` | Advisor stage | a proposed reply, a proposed gate approval, with evidence |
| `decision.*` | Policy engine | allow an action, deny it, or escalate, with a priority class |
| `action.*` | Actuator | intent before a command, effect after it |
| `attention.*` | Attention queue | opened, answered, expired |
| `notification.*` | Notification queue | planned, delivered, failed |

## Parts

1. **Session adapter.** A plugin with a signal source and a transport. It emits `session.*` events and accepts commands. The first adapter is tmux. It runs on the host, in an adapter host.
2. **Event log.** An append-only file for each project. Each record has a producer, a type, a time, and a cursor.
3. **Interpreter.** A router and pluggable stages. See the next section.
4. **Policy engine.** Deterministic code. It reads configured rules and the fixed deny list. It emits `decision.*` events and sets the priority class.
5. **Actuator.** The only part that sends input, records a gate approval, or opens an attention item. It writes an intent before and an effect after each command.
6. **Attention queue.** The items that wait for a human, ranked. It takes the human answer and appends it as an event.
7. **Notification queue.** It reads `attention.*` events, plans delivery by priority class, and queues one notification for each target.
8. **Notifier plugins.** One plugin for each target: desktop, mobile push, email. A target is added with no change to the queue.
9. **Inbox API and clients.** One API with a request path and an event stream. The web viewer, a mobile app, and a command line are clients of the same API.

## The interpreter

The interpreter reads `session.*` events and emits `fact.*` and `proposal.*` events. Each stage declares which events it reads and which it emits. A routing file sends an event to one stage or to several. Two stages that read the same events can run side by side, so the log holds both answers for a later comparison.

Stage types:

- **Fact mapper.** Plain code for structured facts only, such as a session that ended or a pane that stopped. It reads no transcript text.
- **System-1 classifier.** A fast model that answers typed questions about a transcript slice, such as the status or whether a human must answer. Jev is a candidate. A small language model is another.
- **Advisor agent.** A model with tools that reads the task record and the history and writes a proposed reply. It runs only when the classifier says a reply is possible.

### Jev (researched on 2026-10-22)

- Jev is a proprietary model from TypeSafe AI. It is in limited early access since 2026-09-15. The version listed is jev-1.13.0.
- It answers typed questions: yes or no (`noul`), a choice from a list (`choice`), and a score on a scale (`score`). Each answer carries a probability distribution and a confidence value. It writes no text and no reason.
- The API limit is 64k tokens for each input, with 32k for the state and the longest question.
- TypeSafe claims 70 to 500 ms for each response and a price of $0.042 for each million input tokens. No independent benchmark appears in the sources that I read.
- Access is an HTTP API. The engineer states that Jev offers no self-hosting option. Data retention and rate limits are not stated. The design keeps the classifier stage replaceable, so an open-weight System-One model can take its place. See `v0.1-scope.md`.
- Fit: it matches the classifier stage. The confidence value can drive the choice between acting and escalating.
- Limits for us: no evidence quote, so the advisor or a second step must supply one. Early access may block use. A hosted API sends transcript text to a second vendor.

### DSPy (checked on 2026-10-23: see `v0.1-scope.md` section 3)

- DSPy is a Python library for programs that call language models. A program declares typed signatures. Optimisers tune its prompts from labelled examples and a metric.
- Fit: shadow-mode records give labelled examples, and the optimiser can use them. This answers the lack of an evaluation target without setting one now.
- Limit: a compiled program is a generated prompt. It must live in a reviewed file, and CLAUDE.md principle 2 says judgment lives in reference files. An ADR must settle this.
- I expect a Jev call to fit as a custom module and not as a language-model backend, because its API takes typed questions and not a prompt. I have not checked this.

## Clients and notifications

- The inbox API is the only door for a client. It offers a request path for lists and answers, and an event stream for live updates. A new client needs no change in the service.
- The attention queue holds the items. The notification queue holds the messages that nudge the human about them. The two are separate, because an item can exist with no message, and one item can cause several messages.
- Delivery by priority class (immediate or batched) belongs to the notification queue. The detail waits for the stage 5 review.

## Deployment

- The service runs in a Docker container. It holds the interpreter, the policy engine, the actuator, the attention queue, the notification queue, the inbox API, and the event log on a volume.
- The sessions run on the host. A container cannot read a host tmux session by default. Two ways exist:
  - **Adapter host (accepted by the engineer on 2026-10-23).** A small process on the host runs the tmux adapter and talks to the service over HTTP. It also suits a later cloud move, because an adapter can run wherever its sessions run.
  - **Mounts.** Mount the tmux socket and the transcript folder into the container. This may fail on macOS, where Docker runs in a virtual machine. I have not checked this.
- Hook scripts run on the host. They append events to the log through the adapter host.
- A desktop notification cannot come from inside a container. The desktop notifier is a host process that reads the notification stream.
- The advisor agent needs model credentials inside the container. How to supply them is open.

## Rules of the repo that the design touches

1. Principle 2: judgment lives in reference files and scripts move data. A model that is not Claude, and a compiled DSPy program, both need an ADR.
2. Principle 5: only `implement` ships agents. The advisor agent and any new hooks need an ADR that amends it.
3. Principle 7: the advisor approving a push stays open. The engineer has not ruled.
4. Principle 10: gate state goes through `tracker.py`. Where `tracker.py` and `bd` run, in the container or on the host, is open.
5. The repo has no deploy step and no container image. A Docker service is new and needs an ADR.
6. The glossary needs the full names session adapter, tracker adapter, and notifier plugin.

## Open questions for this round

1. Does the chain, with the event log under every stage, match the engineer's reading?
2. Does the advisor sit in the interpreter and propose, or inside the policy and decide? I recommend proposing.
3. Adapter host or mounts for the sessions? The engineer's operating system decides.
4. Which first System-1 backend: a small language model, or Jev? I recommend the small language model first, with Jev as an optional backend.
5. Is DSPy the framework for the interpreter stages? I recommend yes, with compiled programs kept as reviewed files.
6. Where does the code live: a new plugin, or a separate repository?

## Deferred to the engineer's stage 5 review

Status vocabulary, respond or escalate, delivery windows, the policy and the fixed deny list, the contracts in detail, and levels 2 and 3. The v1 text for these is in `v1/design-overview-v1.md`. The parts of it that rely on a plain-code reducer, a web-only inbox, or a desktop-only notification are out of date.

## Unverified claims

- Jev facts come from Wikipedia and a DigitalOcean article, read through WebFetch summaries. Search results added blog claims that I did not verify, including one report of a 791-decision benchmark.
- DSPy facts come from my own knowledge. I did not re-check them.
- The Docker and macOS limit on socket mounts is my belief. I did not test it.
- The Claude Code hook fields, the transcript format, and the values that a hook can return are still unchecked.
- agentbox, petekp/inbox, herdr, and pi Durable facts are as in v1.

## Deviations from the `/architect:design` procedure

1. The skill is not registered in this session. I followed `SKILL.md` and `design-mode.md` by reading them.
2. Stage 3 used six Haiku calls and an inline critic pass. A separate critic agent did not run. The new engineer feedback has not been through a second exploration.
3. Files sit in `priority-dev/docs/design/`, the new project folder, and not in `docs/architecture/designs/`. No `goal.json` exists.
4. Levels 2 and 3 are retired for now. They sit in `v1/diagrams/`.
5. Level 1 comes from the diagram subagent. Level 4 is my own SVG, as the workflow requires.
