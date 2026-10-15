# Program Design: cobuilder-memory

Grounded in `docs/architecture/designs/cobuilder-memory/contracts.md`,
`intent.json` (ADR-0036), `02-architecture.md`, and `interaction-design.md`.
Scope: epic E1, slices 1 to 6. The spike in `~/mods/cobuilder-memory`
is the starting code, and this design splits it by job.

## Files

### New: `plugins/cobuilder-memory/`

| File | Job | Slice |
|---|---|---|
| `.claude-plugin/plugin.json` | The manifest: name, version `0.1.0`, description, author, repository, license, keywords, and `"types": "./types/index.d.ts"` | 1 |
| `hooks/hooks.json` | `{ "modules": ["./register.ts"] }` | 1 |
| `hooks/register.ts` | Wiring only: `session.start`, `prompt.submit`, `tool.call`, `command.run`, and `ui.render` hooks | 1, grows in 4 |
| `hooks/bank.ts` | The bank rule | 1 |
| `hooks/prompts.ts` | The prompt store and the text that Haiku reads | 1 |
| `hooks/hindsight.ts` | The one adapter for `$.mcp.call("hindsight", …)` and its result parsing | 1, grows in 2 and 3 |
| `hooks/haiku.ts` | The two Haiku calls, their system texts, and their reply parsing | 1, grows in 2 and 3 |
| `hooks/result.ts` | The judging rules and the result text | 1, grows in 2 and 3 |
| `hooks/run.ts` | The memory run: the four steps, and the state updates | 1, grows in 2, 3, and 4 |
| `hooks/pane.tsx` | The pane atom, the state updates, and the drawing | 4 |
| `types/index.d.ts` | The `$.state` contract for the pane atom | 4 |
| `tests/*.test.ts` | `claude plugin test` cases, one file per hooks file | each slice |
| `tsconfig.json` | Extends the engine's generated config, for `tsc -p` | 1 |
| `README.md` | What the plugin does, the MCP server it needs, and how to load it | 1 |
| `shared` | Symlink to `../../shared` (ADR-0017 packaging test) | 1 |

### Modified

| File | Change | Slice |
|---|---|---|
| `.claude-plugin/marketplace.json` | A sixth entry `cobuilder-memory`, source `./plugins/cobuilder-memory`, version `0.1.0` | 1 |
| `tests/test_plugin_manifests.py` | `hooks/` allowed for `implement` and `cobuilder-memory`, `agents/` for `implement` only | 1 |
| `.gitignore` | `plugins/cobuilder-memory/.claude-plugin/types/` | 1 |
| `plugins/architect/skills/architecture/references/design-mode.md` | §4 Stage 1 calls the consult tool when listed | 5 |
| `plugins/implement/skills/build/SKILL.md` | Gate 1 calls the consult tool when listed. The Hindsight section and its reference row go | 5 |
| `plugins/implement/skills/build/references/hindsight-routine.md` | Removed | 5 |
| `plugins/architect` and `plugins/implement` manifests | Version bumps in `plugin.json` and `marketplace.json` | 5 |
| `CLAUDE.md`, `README.md`, `DDD-VOCABULARY.md` | Six plugins, principle 5, the Layout line | 6 |
| `docs/architecture/adr/ADR-0025-*.md` | A history entry naming ADR-0039 | 6 |

## Types & signatures

```ts
// bank.ts
type Bank = { bank: string }
type NoBank = { error: string }
export function resolveBank($: Engine): Promise<Bank | NoBank>

// prompts.ts
export type StoredPrompt = { at: string; text: string }
export const PERSON_ORIGINS: readonly ["composer", "bridge"]
export function shouldStore(e: PromptSubmitInput): boolean
export function storePrompt($: Engine, text: string): Promise<void>
export function readPrompts($: Engine): Promise<StoredPrompt[]>
export function promptBlock(prompts: readonly StoredPrompt[], maxChars?: number): string
export function sessionTail(messages: readonly SessionMessage[], maxChars?: number): string

// hindsight.ts
export type Hit = { text: string; date: string; doc: string }
export type PageHit = { id: string; name: string; snippet: string; updated: string }
export type Page = { id: string; name: string; body: string; updated: string }
export type Outcome<T> = { ok: true; value: T; ms: number } | { ok: false; reason: string; ms: number }
export const HINDSIGHT_SERVER: "hindsight"
export const REQUIRED_TOOLS: readonly ["recall", "search_knowledge_base", "get_knowledge_page", "reflect"]
export function checkServer($: Engine): Promise<{ ok: true } | { ok: false; message: string }>
export function recall($: Engine, bank: string, query: string): Promise<Outcome<Hit[]>>
export function searchPages($: Engine, bank: string, query: string): Promise<Outcome<PageHit[]>>
export function getPage($: Engine, bank: string, id: string): Promise<Outcome<Page>>
export function reflect($: Engine, bank: string, query: string, context: string): Promise<Outcome<string>>
export function dropOwnSession(hits: Hit[], sessionId: string): Hit[]
export function dropEmptyPages(pages: PageHit[]): PageHit[]

// haiku.ts
export type RecallPlan = { need: string; recall: string }
export type ReflectPlan = { pageId: string | null; context: string; questions: string[] }
export function writeRecallQuery($: Engine, prompts: string, tail: string): Promise<RecallPlan | { error: string }>
export function writeReflectPlan($: Engine, need: string, query: string, hits: Hit[], pages: PageHit[]): Promise<ReflectPlan | { error: string }>
export function parseLines(text: string, label: string): string[]

// result.ts
export const HOW_TO_JUDGE: string
export type RunReport = {
  bank: string; promptsRead: number; need: string
  recall: { query: string; total: number; own: number; kept: Hit[] } | { query: string; reason: string }
  page: Page | null | { reason: string }
  context: string
  reflects: { question: string; answer: string | null; reason: string | null }[]
}
export function buildResult(r: RunReport): string

// run.ts
export type RunOrigin = "tool" | "command"
export function runMemory($: Engine, origin: RunOrigin): Promise<string>
export function runCheck($: Engine): Promise<string>   // /memory-check

// pane.tsx and types/index.d.ts (slice 4)
export type RunStep = "query" | "search" | "questions" | "reflect" | "done" | "failed"
export type CallState = { name: string; state: "running" | "done" | "failed"; note: string }
export type RunState = {
  startedAt: string; elapsedSec: number; bank: string; step: RunStep; need: string
  calls: CallState[]; recall: RunReport["recall"] | null; page: { name: string; updated: string } | null
  reflects: { question: string; state: "running" | "done" | "failed"; note: string }[]; error: string | null
}
export const PANE_ID: "memory-run"
export const PANE_TITLE: "🧠 Hindsight: CoBuilder Memory Run"
export function openPane($: Engine, asked: boolean): Promise<void>
export function setRun($: Engine, change: (s: RunState) => RunState): Promise<void>
export function startTick($: Engine): () => void
export function renderPane($: Engine, e: UiRenderInput): Promise<UiTree>
```

`Engine`, `PromptSubmitInput`, `SessionMessage`, `UiRenderInput`, and
`UiTree` are the engine's own types from `claude-code`.

## Call stack

The main path: the agent calls the consult tool.

```
register.ts  on('tool.call', { tool: /^mcp__cobuilder-memory__consult$/ })
└─ run.ts  runMemory($, "tool")
   ├─ pane.tsx  setRun(step "query"), openPane($, false), startTick($)      (slice 4)
   ├─ bank.ts  resolveBank($)                       → stop with reason on NoBank
   ├─ hindsight.ts  checkServer($)                  → stop with the set-up message
   ├─ prompts.ts  readPrompts, promptBlock, sessionTail
   ├─ haiku.ts  writeRecallQuery                    → RecallPlan
   ├─ pane.tsx  setRun(step "search")
   ├─ Promise.all
   │  ├─ hindsight.ts  recall → dropOwnSession
   │  └─ hindsight.ts  searchPages → dropEmptyPages                          (slice 2)
   ├─ pane.tsx  setRun(step "questions")
   ├─ haiku.ts  writeReflectPlan                    → ReflectPlan            (slices 2, 3)
   ├─ pane.tsx  setRun(step "reflect")
   ├─ Promise.all
   │  ├─ hindsight.ts  getPage  (only an id from the search)                 (slice 2)
   │  └─ hindsight.ts  reflect × 1–3                                         (slice 3)
   ├─ result.ts  buildResult(report)
   └─ pane.tsx  setRun(step "done"), stop the tick
```

`command.run` for `memory-recall` calls `runMemory($, "command")`, which
opens the pane asked. `command.run` for `memory-check` calls `runCheck($)`. `prompt.submit` calls `shouldStore`, then
`storePrompt`, then `next(e)`. `ui.render` for `{ component: "Pane",
requestId: "memory-run" }` calls `renderPane`.

## Test plan

Every test runs with `claude plugin test plugins/cobuilder-memory`, with
the model, MCP, process, and session answers stubbed. Packaging runs with
`uv run pytest tests -q`.

| Slice | Test | Asserts |
|---|---|---|
| 1 | `tests/bank.test.ts` | The template takes the main worktree's name. Outside git, the run gives the reason. An unknown placeholder gives the reason. |
| 1 | `tests/prompts.test.ts` | Composer and bridge prompts are stored. SDK, plugin, meta, and command prompts are not. The store keeps 100 prompts of 2,000 characters. |
| 1 | `tests/hindsight.test.ts` | Each call passes `bank_id` and the contract's arguments to `hindsight`. A missing server or tool gives the set-up message. The current transcript is dropped. |
| 1 | `tests/run.test.ts` | The consult tool returns the judging rules first. The header, the Need line, and the recall records follow. |
| 1 | `tests/test_plugin_manifests.py` | `cobuilder-memory` may ship `hooks/`, not `agents/` or an MCP server. The versions match. `shared` is a symlink. |
| 1 | live: `claude --plugin-dir plugins/cobuilder-memory` | The session lists the tool. Each of the four MCP tools returns data. The evidence records one reflect's time and the MCP timeout. |
| 2 | `tests/hindsight.test.ts`, `tests/haiku.test.ts`, `tests/run.test.ts` | Empty and still-generating pages are dropped. A page id outside the search is refused. The result shows the page body, name, and date. |
| 3 | `tests/haiku.test.ts`, `tests/run.test.ts` | One to three questions are kept. The page read and the reflects run side by side. A failed reflect writes its reason, and the others still show. |
| 4 | `tests/pane.test.ts` | The pane opens before the first model call. Each step and call updates the state. The tick moves the elapsed time. The four states draw as `interaction-design.md` says. |
| 5 | `tests/test_hindsight_wiring.py` and one blind agent pass | The build skill names no H1 to H5 and no `hindsight-routine.md`. Both skills name the consult tool. A blind agent calls the tool first at design stage 1. |
| 6 | evidence file and `uv run pytest tests -q` | Two live runs are judged. The top-level documents count six plugins. |

## Least confident decisions

1. **The MCP timeout.** `$.mcp.call` has no timeout setting. If the engine's
   own MCP timeout is shorter than a slow reflect, slice 3's failure path
   carries the run. Slice 1 measures it.
2. **A long `tool.call` hook.** A run takes minutes. If the engine stops a
   `tool.call` hook before the run ends, the design fails (`abort_if`).
   Slice 1 checks one full run.
3. **The result shape of `$.mcp.call`.** The Hindsight server answers with
   text content blocks that hold JSON. `hindsight.ts` parses them, and the
   live check in slice 1 confirms the shape.
4. **The unasked pane.** A tool run opens the pane unasked, so a terminal
   under 144 columns does not place it. Slice 4 tests the open, not the
   placement.
5. **Splitting the module.** The spike was one file. The split puts each
   engine call behind one function, so the tests stub one place each.
