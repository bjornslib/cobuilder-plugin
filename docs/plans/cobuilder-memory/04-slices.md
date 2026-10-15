# Slice plan: cobuilder-memory

Draft for Gate 4a. Gates 1 to 3 are rewritten for the revised design before
this plan can be approved. E1 is the build, and it now includes the workflow
steps. E2 is light and E3 is a stub. Both stay in the backlog, and each gets its own epic design before any of
its slices start.

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`cobuilder-memory/E1` — The memory plugin ships for CoBuilder.** An opt-in plugin gives the main agent the consult tool. It shows each run in a pane and joins the design and build workflows. | | | | |
| 1 | `cobuilder-memory/E1` | Tracer bullet: the installed plugin proves each Hindsight MCP tool and answers consult | `claude plugin install cobuilder-memory@cobuilder-plugin` installs the plugin from this repo's marketplace, and after `/reload-plugins` the session lists `mcp__cobuilder-memory__consult`. From the installed plugin, `$.mcp.call("hindsight", ...)` returns data from `recall`, `search_knowledge_base`, `get_knowledge_page`, and `reflect`. The evidence records one reflect's time and what the engine does past its MCP timeout. A consult call returns the judging rules first, then the header, the Need line, and the recall records, with this session's own transcript dropped. With no `hindsight` server that has these tools, the run names what to set up. `claude plugin validate`, `claude plugin test`, and `uv run pytest tests -q` pass. The tests cover the amended install rule, the marketplace entry, the matching versions, and the `shared` symlink. | — | planned |
| 2 | `cobuilder-memory/E1` | A knowledge page joins the run | `search_knowledge_base` runs beside recall. Haiku's second call may pick one page, and `get_knowledge_page` reads it. The result shows its name, update date, and body. The run never shows a page whose snippet or body is empty or reads "Generating content...". The module refuses a page id that the search did not return. | — | planned |
| 3 | `cobuilder-memory/E1` | Reflect questions written from the records | Haiku writes a context and up to three reflect questions. Each names an ADR id or term of the kept records. The page read and the `reflect` calls run side by side through `$.mcp.call`. A reflect that fails or times out writes its reason. The other answers still show. | — | planned |
| 4 | `cobuilder-memory/E1` | The memory pane shows each run | The pane `memory-run`, titled `🧠 Hindsight: CoBuilder Memory Run`, matches the approved Gate 2b design. While a run works, it shows each step with its state and counts. When the run ends, it shows the records, the page, and each reflect answer or its failure. `/memory-recall` opens it at any width, and a tool run opens it unasked from 144 columns. | — | planned |
| 5 | `cobuilder-memory/E1` | Design and build call the consult tool at fixed steps | Design stage 1 and implement Gate 1 call the consult tool when the session lists it. Otherwise they state that it is absent. The implement skill holds no H1 to H5 checkpoint. A blind agent given design stage 1 calls the consult tool before it drafts the hypothesis. | — | planned |
| 6 | `cobuilder-memory/E1` | The value check in two repos | One design question in this repo and one in think-with-ai each get a run. Each run returns a dated record that the main agent uses or rejects with a reason. The evidence file holds both transcripts. CLAUDE.md, README.md, and DDD-VOCABULARY.md name six plugins, and ADR-0025's history names ADR-0039. | — | planned |
| | **`cobuilder-memory/E2` — A Jev gate.** Light: a classifier decides when else to call the consult tool. | | | | |
| 7 | `cobuilder-memory/E2` | A Jev gate decides every n tool calls | Every n tool calls, one Jev `noul` question judges whether a consult would help. Above the threshold, the plugin starts a run. A measured sample sets n, the threshold, the latency, and the cost. | — | backlog |
| | **`cobuilder-memory/E3` — Every Hindsight call in view.** Stub. | | | | |
| 8 | `cobuilder-memory/E3` | Stub: the pane lists every Hindsight call of the session | The memory pane lists each Hindsight call of the session. It marks the plugin's own runs apart. Sources: the agent's `mcp__hindsight__` calls, `diag.jsonl`, and the audit log. | — | backlog |

## Notes

- **Order.** Slice 1 is the tracer bullet. Slices 2 and 3 extend the run.
  Slice 4 needs the run's steps, so it follows 3. Slice 5 wires the tool
  into the workflows once it is complete. Slice 6 runs last, because it
  judges the whole plugin.
- **Slice 1 is an installed plugin, not a `--plugin-dir` load.** A mod is a
  plugin whose `hooks/hooks.json` names a hooks module. Slice 1 adds the
  plugin to `.claude-plugin/marketplace.json`, so `claude plugin install`
  works, and it carries the install-surface amendment and the manifest
  test (ADR-0039 Consequences). `--plugin-dir` stays a development aid.
- **Hindsight through MCP (engineer, 2026-10-15).** Every Hindsight call
  goes through `$.mcp.call` on the server named `hindsight`: `recall`,
  `search_knowledge_base`, `get_knowledge_page`, and `reflect`. Each call
  passes `bank_id`. The MCP `reflect` tool takes no `fact_types` and no
  `exclude_mental_models`, so that filter is gone. `$.mcp.call` has no
  timeout of its own. Slice 3 measures the engine's MCP timeout.
- **H1 finding (2026-10-15).** Two of three reflects timed out at 170 s
  while consolidation ran on the same model. Slice 3 shows that a failed
  reflect leaves the other answers intact.
- **The pane design** is Gate 2b. The draft mockup is
  `mockups/memory-pane.html`.
- **E2 and E3** get epic designs when they leave the backlog.
