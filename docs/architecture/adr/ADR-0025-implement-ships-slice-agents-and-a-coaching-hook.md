---
# --- doc-gardener required frontmatter ---
title: "ADR-0025 — implement ships slice agents and a coaching hook"
status: active
type: architecture
last_verified: 2026-09-27
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0025
name: "implement ships slice agents and a coaching hook"
state: approved
groups: [workflow, packaging]
approved_by: bjornslib
problem: "The install-surface rule says no plugin in this family ships an agent, a hook, or an MCP server. implement's build skill runs a red-green-validate slice loop, and its role prompts today are pasted text, not stable agent identities. A hook cannot filter on a role that has no identity to filter on. Claude Code also ignores a hooks frontmatter key inside a plugin agent file, so a per-agent hook cannot live next to the agent it targets. Nothing in the family can adopt habit-hooks, an external coaching CLI, without a hook to call it from."
decision: "The implement plugin may ship agents/ (RED, GREEN, VALIDATE, and a vocabulary reviewer agent) and hooks/hooks.json (one PostToolUse hook on Write|Edit that runs habit-hooks for the GREEN agent only). The other four plugins, architect, pr, artifact, and cobuilder-full-lifecycle, still ship no agents and no hooks. No plugin in the family ships an MCP server. GREEN needs a stable identity, implement:green, that the hook filters on through the hook input's agent_type field. Because Claude Code ignores a hooks key in a plugin agent's frontmatter, the hook has to sit at the plugin level, in hooks/hooks.json, not beside the agent it targets. The role prompts that RED, GREEN, VALIDATE, and the vocabulary reviewer used as pasted text become agent definitions instead, each with its own file and its own identity. habit-hooks is a required external CLI, MIT licensed, at https://github.com/habit-hooks/habit-hooks, by Ivett Ördög and contributors. The plugin calls it as a subprocess. It vendors none of its code."
alternatives:
  - option: "Keep the blanket no-agents, no-hooks rule and paste habit-hooks coaching text into the GREEN role prompt instead"
    rejected_because: "Pasted text is not a hookable event. habit-hooks runs on a tool call, after the fact, and reads the actual diff. A paragraph in a role prompt cannot see a Write or Edit call the model already made, so it cannot coach against what really happened."
  - option: "Give every one of the five plugins the same agents/ and hooks/ allowance, instead of implement alone"
    rejected_because: "Only implement's build skill runs a slice loop with a GREEN step. architect, pr, and artifact have no role that a coaching hook on Write or Edit would ever fire for. Widening the allowance to plugins with no matching role adds install surface with no matching use."
  - option: "Put the hook inside each agent's own frontmatter"
    rejected_because: "Claude Code ignores a hooks key inside a plugin agent file. A hook declared there never runs, so this option does not exist as a working mechanism."
  - option: "Vendor habit-hooks's code into shared/ under ADR-0017 instead of calling it as an external CLI"
    rejected_because: "habit-hooks is a required external tool with its own release cycle. Vendoring its code would fork a dependency the family does not maintain, and shared/ is a marketplace-wide commitment ADR-0017 scoped to code every plugin needs, not one plugin's one dependency."
  - option: "Filter the hook on the tool call's file path instead of agent_type"
    rejected_because: "RED, GREEN, and VALIDATE all write and edit files in the same slice. A path-based filter cannot tell which role made the call, so it either coaches every role or none. agent_type is the one field the hook input carries that names the caller directly."
consequences:
  - "Installing implement now adds one PostToolUse hook to the user's session. It fires on every Write or Edit call, and it exits silently unless the caller's agent_type is implement:green."
  - "The packaging test, tests/test_plugin_manifests.py, enforces the narrowed rule: implement alone may ship agents/ and hooks/, and no plugin, including implement, may ship an MCP server."
  - "RED, GREEN, VALIDATE, and the vocabulary reviewer become named agents with stable identities, implement:red, implement:green, implement:validate, and the vocabulary reviewer's own name, in place of pasted role text."
  - "habit-hooks becomes a required external dependency for anyone who installs implement, alongside the existing requirements for uv on PATH and a git repository."
related_decisions:
  - { type: is-related-to, target: ADR-0016 }
  - { type: is-related-to, target: ADR-0017 }
history:
  - { state: decided, date: 2026-09-27, note: "Recorded from the design session. The narrowed install-surface rule, the plugin-level hook placement, and the required habit-hooks dependency were each approved by the human during that session." }
  - { state: approved, date: 2026-09-27, by: bjornslib, note: "Approved by the human in session, before merge." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/implement/agents, plugins/implement/hooks, tests/test_plugin_manifests.py]
  rule: "implement is the one plugin in the family that may ship agents/ and hooks/. Every other plugin still ships neither. No plugin ships an MCP server. The hook in implement's hooks/hooks.json runs habit-hooks on Write or Edit, and it exits without effect unless the caller's agent_type is implement:green."
delivers:
  capability: "A hook can coach the GREEN step of the slice loop on every Write or Edit call it makes, using an external tool that reads the real diff instead of a static role prompt."
  benefit: "Coaching happens at the moment a file changes, against what the model actually wrote, instead of as advice the model may or may not have followed."
  beneficiary: [developer, validator-agent]
  enables: ["A stable implement:green identity that later tooling can target the same way"]
  addresses_problem: P1
related: []
---

# ADR-0025 — implement ships slice agents and a coaching hook

## Context

The install-surface rule in `CLAUDE.md` has read, since the five-plugin
split, that no plugin in this family ships an agent, a hook, or an MCP
server. That rule kept every plugin's install surface identical to the
other four: no plugin ever touched another session's permission surface.

`implement`'s build skill runs a slice loop with three steps: RED writes a
failing test, GREEN makes it pass, and VALIDATE scores the result against a
blind rubric. `plugins/implement/skills/build/SKILL.md` and its
`references/` files carry each role as prose the orchestrating Claude reads
and adopts in turn. No role has a stable identity of its own. A hook that
wants to act only during the GREEN step has nothing to filter on, because
nothing in the session states which role is currently active.

habit-hooks is an external, MIT-licensed coaching tool
(https://github.com/habit-hooks/habit-hooks, by Ivett Ördög and
contributors) that runs on a `PostToolUse` event and reads the tool call
that just happened. It can coach a `Write` or `Edit` call the moment it
lands, against the real diff, in a way a pasted role paragraph cannot. Using
it requires a hook. The blanket rule forbids one.

A hook cannot live inside an agent's own frontmatter either. Claude Code
ignores a `hooks` key declared inside a plugin agent file. A hook that
targets one role has to sit at the plugin level and filter by the caller's
identity, which means the role first needs an identity worth filtering on.

## Decision

The `implement` plugin may ship `agents/` and `hooks/hooks.json`. The other
four plugins, `architect`, `pr`, `artifact`, and
`cobuilder-full-lifecycle`, still ship no agents and no hooks. No plugin in
the family, including `implement`, ships an MCP server.

`implement/agents/` holds four agent definitions: RED, GREEN, VALIDATE, and
a vocabulary reviewer. Each role prompt that used to live as pasted text in
`SKILL.md` or a `references/` file becomes its own agent file instead, with
its own name. GREEN's agent identity is `implement:green`.

`implement/hooks/hooks.json` declares one `PostToolUse` hook, matched on
`Write|Edit`, that runs habit-hooks. The hook reads the hook input's
`agent_type` field. It runs habit-hooks only when that field reads
`implement:green`. For every other caller, including RED, VALIDATE, the
vocabulary reviewer, and the orchestrating Claude itself, the hook exits
without effect.

habit-hooks stays an external, required CLI. The plugin invokes it as a
subprocess and vendors none of its source.

## Alternatives considered

- **Keep the blanket rule, and paste habit-hooks coaching text into the
  GREEN role prompt instead.** Pasted text cannot see a tool call after it
  happens. habit-hooks's value is that it reads the real diff a `Write` or
  `Edit` call produced. A paragraph of advice in a role prompt has nothing
  to react to.
- **Give every plugin the same agents-and-hooks allowance.** Only
  `implement` runs a slice loop with a GREEN step. The other four plugins
  have no role a Write-or-Edit coaching hook would ever fire for. Widening
  the allowance would add install surface nothing in those plugins would
  use.
- **Put the hook inside each agent's own frontmatter.** Claude Code ignores
  a `hooks` key inside a plugin agent file. A hook declared there never
  runs, so this is not a working option.
- **Vendor habit-hooks's code into `shared/` under ADR-0017.** habit-hooks
  is a required external tool with its own release cycle, not code the
  family maintains. ADR-0017 scoped `shared/` to code every plugin needs.
  One plugin's one external dependency does not meet that bar.
- **Filter the hook on the tool call's file path instead of `agent_type`.**
  RED, GREEN, and VALIDATE all write and edit files during the same slice.
  A path-based filter cannot tell which role made a given call, so it
  either coaches every role or none. `agent_type` is the field the hook
  input carries that names the caller directly.

## Consequences

- Installing `implement` adds one `PostToolUse` hook to the user's session.
  It fires on every `Write` or `Edit` call, and it exits silently unless
  the caller's `agent_type` is `implement:green`.
- The packaging test, `tests/test_plugin_manifests.py`, enforces the
  narrowed rule. Only `implement` may ship `agents/` or `hooks/`. No
  plugin, including `implement`, may ship an MCP server declaration or
  manifest key.
- RED, GREEN, VALIDATE, and the vocabulary reviewer become named agents
  with stable identities, in place of pasted role text the orchestrating
  Claude used to adopt in turn.
- habit-hooks becomes a required external dependency for anyone who
  installs `implement`, alongside the existing requirements for `uv` on
  `PATH` and a git repository.

## Value delivered

A hook can now coach the GREEN step of the slice loop on every file change
it makes, using a tool that reads the actual diff instead of a static role
prompt. The correction lands at the moment a file changes, not as advice
the model may or may not have followed.

## Maps to

`implement/agents/`, `implement/hooks/hooks.json`, and
`tests/test_plugin_manifests.py`. `implement` is the one plugin in the
family that may ship agents or hooks. Every other plugin still ships
neither, and no plugin ships an MCP server.
