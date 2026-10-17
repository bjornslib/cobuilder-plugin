# Slice plan: cobuilder-memory

Draft for Gate 4a. Gates 1 to 3 are rewritten for the revised design before
this plan can be approved. E1 is the build, and it now includes the workflow
steps. E2 is light and E3 is a stub. Both stay in the backlog, and each gets its own epic design before any of
its slices start.

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`cobuilder-memory/E1` — The memory plugin ships for CoBuilder.** An opt-in plugin gives the main agent the consult tool. It shows each run in a pane and joins the design and build workflows. | | | | |
| 1 | `cobuilder-memory/E1` | Tracer bullet: the installed plugin proves each Hindsight MCP tool and answers consult | A session started with `--plugin-dir plugins/cobuilder-memory` lists `mcp__cobuilder-memory__consult`, and `claude plugin validate .` accepts the marketplace with its new entry. From the loaded plugin, `/memory-check` returns `ok` for `recall`, `search_knowledge_base`, `get_knowledge_page`, and `reflect`. The evidence records one reflect's time and what the engine does past its MCP timeout. A consult call returns the judging rules first, then the header, the Need line, and the recall records, with this session's own transcript dropped. With no `hindsight` server that has these tools, the run names what to set up. `claude plugin validate`, `claude plugin test`, and `uv run pytest tests -q` pass. The tests cover the amended install rule, the marketplace entry, the matching versions, and the `shared` symlink. | — | planned |
| 2 | `cobuilder-memory/E1` | A knowledge page joins the run | `search_knowledge_base` runs beside recall. Haiku's second call may pick one page, and `get_knowledge_page` reads it. The result shows its name, update date, and body. The run never shows a page whose snippet or body is empty or reads "Generating content...". The module refuses a page id that the search did not return. | — | planned |
| 3 | `cobuilder-memory/E1` | Reflect questions written from the records | Haiku writes a context and up to three reflect questions. Each names an ADR id or term of the kept records. The page read and the `reflect` calls run side by side through `$.mcp.call`. A reflect that fails or times out writes its reason. The other answers still show. | — | planned |
| 4 | `cobuilder-memory/E1` | The memory pane shows each run | The pane `memory-run`, titled `🧠 CoBuilder Memory: Hindsight Run`, matches the approved Gate 2b design. It opens before the first Haiku call. While a run works, it shows each step and each Hindsight call with its state and counts, and the elapsed time. When the run ends, it shows the records, the page, and each reflect answer or its failure. `/memory-recall` opens it at any width, and a tool run opens it unasked from 144 columns. | — | planned |
| 5 | `cobuilder-memory/E1` | Design and build call the consult tool at fixed steps | Design stage 1 and implement Gate 1 call the consult tool when the session lists it. Otherwise they state that it is absent. The implement skill holds no H1 to H5 checkpoint. A blind agent given design stage 1 calls the consult tool before it drafts the hypothesis. | — | planned |
| 6 | `cobuilder-memory/E1` | One install command sets up the family, with the Hindsight allow rules | `/cobuilder-full-lifecycle:install` runs the habit-hooks setup that `/implement:install` ran, the glossary check, and a new Hindsight step. `/implement:install` hands over to it. The coach check stays in `implement` as its own mode, because only `implement` can resolve its script path. The Hindsight step finds the allow rules that the session needs and `~/.claude/settings.json` lacks. It asks once, and it adds them only after a yes. A test checks that each Hindsight tool that cobuilder-memory calls, and the retain tool of the slice note, appears in the setup skill. A blind agent adds only the missing rules after a yes, and adds none after a no. | — | planned |
| 7 | `cobuilder-memory/E1` | The value check in two repos | One design question in this repo and one in think-with-ai each get a run. Each run returns a dated record that the main agent uses or rejects with a reason. The evidence file holds both transcripts. CLAUDE.md, README.md, and DDD-VOCABULARY.md name six plugins, and ADR-0025's history names ADR-0039. | — | planned |
| 8 | `cobuilder-memory/E1` | The agent's focus steers the recall query | `consult` takes an optional `focus` string. Haiku reads three inputs in a fixed order of authority: the focus sets the topic, the session end gives the concrete names, and the person's stored prompts add context only. The session end is the last six messages with text, after injected hook blocks are removed, and at most 12,000 characters. The result and the pane show the focus, or state that none was given. Design stage 1 and Gate 1 pass a focus. A live run whose focus and last prompt name different topics writes a Recall line on the focus. | — | planned |
| | **`cobuilder-memory/E2` — A Jev gate.** Light: a classifier decides when else to call the consult tool. | | | | |
| 9 | `cobuilder-memory/E2` | A Jev gate decides every n tool calls | Every n tool calls, one Jev `noul` question judges whether a consult would help. Above the threshold, the plugin starts a run. A measured sample sets n, the threshold, the latency, and the cost. | — | backlog |
| | **`cobuilder-memory/E3` — Every Hindsight call in view.** Stub. | | | | |
| 10 | `cobuilder-memory/E3` | Stub: the pane lists every Hindsight call of the session | The memory pane lists each Hindsight call of the session. It marks the plugin's own runs apart. Sources: the agent's `mcp__hindsight__` calls, `diag.jsonl`, and the audit log. | — | backlog |

## Notes

- **Order.** Slice 1 is the tracer bullet. Slices 2 and 3 extend the run.
  Slice 4 needs the run's steps, so it follows 3. Slice 5 wires the tool
  into the workflows once it is complete. Slice 6 gives the family one
  install command, so slice 7 can start from a clean setup. Slice 7 judged
  the whole plugin. Slice 8 follows from what slice 7 found.
- **One install command (engineer, 2026-10-16).** The habit-hooks setup
  moves from `implement` to `/cobuilder-full-lifecycle:install`, and
  `/implement:install` hands over to it. The setup skill lists the Hindsight
  allow rules itself, with no extra tool. A test keeps that list in step
  with the tools that cobuilder-memory calls. The rules go to the user
  file, `~/.claude/settings.json`.
- **Slice 1 loads through `--plugin-dir` (engineer, 2026-10-15, Q-J b).** A
  marketplace install reads the default branch, `master`, on GitHub, and a
  local folder marketplace would re-point the `cobuilder-plugin` record for
  the whole machine. So slice 1 loads the repo folder with `--plugin-dir`
  and validates the marketplace entry. A mod is a plugin whose
  `hooks/hooks.json` names a hooks module, so the folder is the shipped
  layout. Slice 1 also carries the install-surface amendment and the
  manifest test (ADR-0039 Consequences).
- **The agent's focus steers the query (engineer, 2026-10-17).** In the
  first live run, Haiku wrote its query from the person's last prompt and
  missed the question that the agent stated. The order of authority is now
  the agent's focus, then the session end, then the person's prompts. The
  engineer chose no ADR, and put the change in E1 as slice 8. The session
  end is the last six messages, at most 12,000 characters.
- **After E1 merges,** run `claude plugin install cobuilder-memory@cobuilder-plugin`
  once from the GitHub marketplace, and record the result in `00-status.md`.
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
