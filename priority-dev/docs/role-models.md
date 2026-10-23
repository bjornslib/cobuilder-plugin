# Role-model implementations

priority.dev borrows ideas from open-source projects. This file names each project, says what the design takes, and says what it does not take. Read the licence column before you copy any code. The design borrows ideas only. It copies no code.

Evidence marks: **source** means a person or agent read the repository or the docs. **summary** means the text came through a WebFetch summary. **claim** means a vendor or a secondary source states it and nobody verified it.

Last updated: 2026-10-23.

| Project | Licence | Stack | Evidence |
|---|---|---|---|
| [Omnigent](https://github.com/omnigent-ai/omnigent) | Apache-2.0 | Python 3.12+, web UI in pnpm | summary |
| [agentbox](https://github.com/savannahfeder/agentbox) | GPL-3.0-or-later | Electron, Vite, Node 22 | source and summary |
| [petekp/inbox](https://github.com/petekp/inbox) | MIT | TypeScript, Bun | source and summary |
| [Plannotator](https://github.com/backnotprop/plannotator) | MIT or Apache-2.0 | TypeScript, Bun | summary |
| [herdr](https://github.com/herdrdev/herdr) | Apache-2.0 | Rust | source (local fork) |
| [Pi and Pi Durable](https://github.com/earendil-works/pi) | MIT | TypeScript | source (blog read in full) |
| [Perplexity SPACE](https://blog.bokvi.com/blog/perplexity-space-agent-sandbox/) | Apache-2.0 | Rust, Go shim | source (blog read in full) |

The agentbox licence is GPL. Borrow its design ideas only. Do not copy its code into this repository unless the licences are compatible.

## Omnigent

The engineer wrote "Omniagent". The project is called **Omnigent**. Databricks announced it on 2026-06-13 as an alpha ([blog](https://www.databricks.com/blog/introducing-omnigent-meta-harness-combine-control-and-share-your-agents)). The repository lists about 11,000 stars.

**What it is.** A meta-harness. It sits above Claude Code, Codex, Cursor, OpenCode, Hermes, Pi, and custom agents that a YAML file defines. The interface to the user stays the same whatever the harness does inside: "messages and files in, text streams and tool calls out".

**What the design takes.**

- The idea that the user-to-agent interaction does not depend on the harness. This is the aim of the session adapter port.
- The host concept. A machine registers as a host, and the server runs sessions on hosts. This matches the adapter host.
- Policy verdicts of ALLOW, DENY, and ASK, in a fixed order: session, then agent, then server. A DENY stops the chain. priority.dev uses the same three verdicts, and its advisor may answer an ASK.
- Policies as code. A policy is a Python function that takes an event with the tool name, the arguments, the actor, the cost, and the session state, and returns a verdict. This agrees with the rule that code enforces what code can enforce.
- Fail toward a question. When the shell parser cannot classify a command, the policy adds an ASK.
- Native harnesses that wrap the vendor command line in a tmux or PTY terminal. This shows that a tmux adapter works in practice.

**What the design does not take.** Nothing is rejected yet. Omnigent is also a candidate adapter layer for v0.2.

**Not found in the public docs.** A way for an outside program to read a session's events or to answer a pending approval. The README names a REST API and an `openapi.json` file, and it gives no endpoint paths. A one-week spike must settle this.

## agentbox

**What it is.** A desktop app that runs many Claude Code and Codex agents. Each task gets its own agent, git worktree, and branch. The user reads an inbox of rows that need attention.

**What the design takes.**

- Ranking by project, then priority, then age. Only the top level (Urgent, value 9) interrupts. An agent cannot change its own priority.
- An append-only ledger with epoch fencing, so a stale writer loses.
- A claim lease of five minutes with a heartbeat. Expiry is computed when read and never written.
- Notification rules: an approval outranks a finished agent, a banner stays silent while the user is active, and an away user gets at most two banners.
- Risk tiers of low, look, and risky. Look and risky changes wait for approval.
- Workers use the user's own subscription, and no API key enters a worker environment.

**What the design does not take.** It has no auto-reply. Its status changes are not enforced, so any writer can write any value. Its unanswered approval is denied after 15 minutes. priority.dev escalates the item and never answers by default.

## petekp/inbox

**What it is.** A plugin for Claude Code, Codex, and omp. It puts the questions, tasks, findings, and pull requests of one session into a panel beside the chat.

**What the design takes.**

- The split of an event into decide, do, and skip. priority.dev adds a fourth outcome, answer.
- A typed item with options, a recommendation, and up to three help steps.
- The rule that an option the agent picked is never the human's answer.
- The method of one small model call at the end of each turn, with the transcript clipped to a bound.
- The evaluation habit: 53 cases, eight runs for each case, and a pass rate.

**What the design does not take.** It handles one session at a time. It drops a malformed reply without a warning. It has no audit log. priority.dev fails closed and escalates.

## Plannotator

**What it is.** A local review tool that opens a plan or a diff in a browser and returns the annotations to the agent.

**What the design takes.**

- One adapter for each harness, through that harness's own hook or tool.
- A non-blocking reply that arrives later as a message.
- Three decisions: Send Feedback, Approve with Notes, and Approve.
- A warning before an approval drops notes that were not sent.

**What the design does not take.** It surfaces every plan with no rule for what reaches the human. Its remote mode binds to all interfaces with no authentication.

## herdr

**What it is.** A terminal runtime for agents. Panes live in a server, and each pane has a status.

**What the design takes.**

- The status vocabulary: idle, working, blocked, done, and unknown.
- The event stream: a client subscribes to status changes over a local socket.
- The finding that a screen detector shows `idle` when an agent asks a question in prose. This is why priority.dev reads the transcript and does not rely on the screen.

**What the design does not take.** Any dependency on herdr. The event stream has no replay, and its buffer is in memory.

## Pi and Pi Durable

**What it is.** Pi is a terminal coding agent. Pi Durable is an experimental package for long-running agents that survive crashes. Earendil announced both on 2026-10-01 ([post](https://earendil.com/posts/pi-durable/)).

**What the design takes.**

- A checkpoint for each step, and a resume that continues from the last checkpoint.
- A `requestId` that makes a submission exactly-once. The inbox API uses an idempotency key for the same reason.
- A `beforeTool` hook that can block or rewrite a tool call, and a memo that stores the decision so a restart does not ask again.
- An execution-environment interface, so a harness can run on one machine while its tools run on another.
- Many conversations in one harness, with clients that attach to any of them and steer a running one.

**What the design does not take yet.** Pi Durable is experimental, and the post says the API might still change. It is TypeScript only. One process owns a storage. It is a candidate harness for v0.2 or later.

## Perplexity SPACE

**What it is.** A Firecracker microVM sandbox for agents, released as open source on 2026-10-15 ([post](https://blog.bokvi.com/blog/perplexity-space-agent-sandbox/)).

**What the design takes.**

- Secrets stay outside the sandbox. A gateway adds the credential at the network layer.
- The sandbox does not keep command output. The client keeps its own transcript.
- A hostname rule is not a network rule. Enforce egress at the network, not on the name.

**What the design does not take yet.** SPACE needs Linux x86_64 with KVM, btrfs, and a privileged Docker daemon. It does not run on macOS. The post calls it a real infrastructure project. It becomes worth its cost when sessions run in the cloud.
