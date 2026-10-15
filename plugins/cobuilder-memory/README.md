# cobuilder-memory

A Claude Code plugin that gives the main agent a `consult` tool. The tool asks
the project's Hindsight memory what the project decided or learned before,
and returns the records, with the judging rules for the agent.

## What it does

- `consult` (shown to the agent as `mcp__cobuilder-memory__consult`) takes no input. Haiku writes the recall query from the session. The plugin then runs recall and returns the records.
- `/memory-recall` runs the same memory run for the person.
- `/memory-check` calls each Hindsight tool once and prints one line per tool: `ok` or `failed`, the time, and the reason.

## What it needs

The plugin needs the `hindsight` MCP server. The server must provide these tools:

- `recall`
- `search_knowledge_base`
- `get_knowledge_page`
- `reflect`

The bank name comes from `~/.hindsight/coding-agent.json` and the git project name.

## Allow rules

Under auto mode, each Hindsight call needs an allow rule. Add these four
entries to `permissions.allow` in your settings:

- `mcp__hindsight__recall`
- `mcp__hindsight__search_knowledge_base`
- `mcp__hindsight__get_knowledge_page`
- `mcp__hindsight__reflect`

Without a rule, auto mode refuses that call, and the result shows the reason.

## Time limits

An HTTP MCP server stops each request after 60 seconds by default. A reflect
call usually takes 15 s to 20 s. To allow longer calls, set a `timeout` in
milliseconds on the `hindsight` server entry in `.mcp.json`, or set
`MCP_TOOL_TIMEOUT`. The run shows a call that times out as a failed call,
with the reason.

## Install

```
claude plugin install cobuilder-memory@cobuilder-plugin
```

## Load it for development

From the repository root:

```
claude --plugin-dir plugins/cobuilder-memory
```
