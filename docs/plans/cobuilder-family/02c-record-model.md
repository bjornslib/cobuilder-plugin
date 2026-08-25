# The record model

A Gate 2 input. What the lifecycle tracks, how the entities join, and where
the records live.

## The proposal, and the constraint it meets

The proposal is a small database that tracks ADRs, pull requests, boundaries,
and implementations. The need behind it is real and already measured in
`02b`: 17 of 17 ADRs declare a `maps_to` join, 15 resolve to a district rather
than a context, and ADR-0013 is reachable from nowhere in the viewer.

**Postgres is out.** It is a service. The install surface is `/plugin install`
and nothing else, with no agents, no hooks, and no MCP servers. That rule just
disqualified the lavish CLI for the same reason, and it applies here.

**SQLite deserves a hearing, because it is a file and not a service.** It ships
in the Python standard library, needs no install, and would give real query
semantics. It still loses, for one decisive reason: **the viewer cannot read
it.** `viewer/index.html` loads six `<script src="../data/*.js">` files that
assign window globals, and `export_artifact.py` inlines each one as literal
JSON into a published page. Reaching SQLite from either path needs a WASM
build, which breaks the buildless-viewer rule and pushes against the 16 MiB
artifact budget. A SQLite store would serve scripts and not the viewer, which
means two stores for one set of facts.

**So the answer is JSON, and it is forced rather than settled for.** The
primary consumer decides the format.

**The engine is the reversible half of this decision.** What makes state
referenceable is stable identity and resolvable joins, not the store that
holds them. Get the ids right and a local SQLite file can be added later as a
build-time index without touching a single authored record. Get the ids wrong
and no engine helps. So identity is the decision to make carefully now, and
the engine is the one to defer.

**The threshold that would earn SQLite.** A JSON index answers a lookup by id
and a one-hop join by loading the file. It does not answer an arbitrary
traversal without loading everything: which ADRs govern the contexts touched
by pull requests merged after a date, for example. When a real question needs
that, SQLite becomes a build-time index beside `index.json`, not a
replacement for it. Until then it is a third layer with no reader.

## We already have the database

`story.json`, `adrs.json`, `designs.js`, `inventory.yaml`, and
`publish-manifest.json` are tables in a file-based store. It has a
`schema_version`, a migration ladder, and an authored-field guard.

What is missing is not an engine. It is three things:

1. **A declared entity model.** No file states what a design, an epic, a
   context, and a pull request are to each other.
2. **Stable identity across types.** An ADR has an id. A context has a
   directory name. An epic has an id scoped to one design. A boundary rule has
   nothing.
3. **An index that resolves the joins.** Every join is declared in the
   authored source and none is resolved anywhere, which is why an ADR is
   reachable only when a change happens to cite it.

## Terms — context, boundary, rule, module

Four terms were in play and the earlier draft collapsed two of them. Read from
`references/templates/boundary-template.yaml`, they are distinct.

| Term | What it is | Cardinality |
|---|---|---|
| **district** | An inferred region, derived by baseline for any repo. Never verified against import edges. A context claims the districts it verifies, so a district is the coarse map and a context is a surveyed part of it. | many per repo |
| **context** | A verified region. Carries a stable `id`, a `path`, and a `public_interface`. The entity. | many per repo |
| **boundary record** | The `boundary.yaml` file. The machine-diffable statement of one context's edges. The artifact. | exactly 1 per context |
| **boundary rule** | One constraint inside that record. | many per record |
| **module** | A C3-level unit inside a context, carrying its own invariant. | many per context |

A context is *the region*. A boundary is *where the region ends and what may
cross*. A context with no boundary record is a name. The boundary record is
what makes it checkable.

**A boundary rule has three shapes, not one.** The earlier draft proposed a
single `boundary_rule` entity keyed `<context>/<n>`, which flattens three
different things:

1. `forbidden_dependencies[]` — an edge prohibition. `{target, from?, why}`. A
   violating edge with no approving ADR is drift.
2. `modules[].rule` with `allowed_inbound` and `allowed_outbound` — a
   per-module invariant. `allowed_outbound: []` means a leaf, and it is the
   strongest checkable rule in the schema.
3. `context_map[]` — the integration pattern with one neighbour:
   `shared-kernel`, `anti-corruption-layer`, `conformist`,
   `open-host-service`, or `partnership`.

They share one question — what may cross this boundary — so they stay one
entity with a `kind` discriminator rather than three tables.

**The ADR join is already bidirectional, and both halves are empty.** An ADR
declares `maps_to.context`. A boundary record declares `governed_by: []`. The
template ships both. Nothing populates either.

## Entities and relations

```
design ──< epic ──? pull_request
  │                     │
  │                     ├──< comment
  │                     └──> adr *
  ├──> adr *
  └──< gate ──< slice ──< score

adr ──> context          (maps_to, today mostly unresolved)
adr ──> district         (maps_to when unanchored)
context ──< district     (boundary.verifies, the edge that resolves the above)
adr ──> adr              (related_decisions, typed edges)
context ──< boundary_rule
boundary_rule ──? adr    (a violation is an ADR candidate)

comment ──> any entity   (plus a DOM anchor, see 02b Design C)
page ──< publication     (url, content hash, published_at)
```

Cardinality worth stating, because both are already load-bearing:

- An epic maps to **zero or one** pull request, through `epics[].branch`.
- A branch may carry **more than one** design. ADR-0013 settles this.

## Identity

Every entity needs one stable id that survives a rebuild.

| Entity | Id | Source |
|---|---|---|
| `adr` | `ADR-NNNN` | the filename, already stable |
| `design` | directory name | already stable |
| `epic` | `<design>/<epic-id>` | scoped, because `E1` repeats across designs |
| `context` | directory name | already stable |
| `boundary_rule` | `<context>/<kind>/<n>` | **new** — no id today. `kind` is forbidden-dependency, module-invariant, or context-map |
| `pull_request` | integer | already the timeline key |
| `slice` | `<feature>/<n>` | already implied by the status file |
| `comment` | ulid | **new** |
| `publication` | page path | already the manifest key |

Two of these do not exist yet. That is the smallest change the model needs.

## Where records live

The existing rule holds: **authored source lives in `docs/`, derived
projections live in the bundle.**

- `docs/` stays the source for designs, ADRs, contexts, and plans. A person
  edits them. Git reviews them.
- `<bundle-dir>/data/index.json` and `index.js` are **derived**. A new
  `build_index.py` rebuilds them in full from `docs/` plus git, the same rule
  `build_adrs.py` and `build_designs.py` already follow. Never a merge, never
  authored by hand.

**One exception, and it is new.** A comment is authored by a reader at read
time and has no home in `docs/`. It is the first record the lifecycle produces
that is neither authored source nor derivable from it. It gets its own
append-only store at `<bundle-dir>/feedback/threads.ndjson`, and the index
reads it without owning it.

That asymmetry deserves naming rather than smoothing over. Everything else in
the bundle can be regenerated from `docs/` and git. Comments cannot. They join
the paid art and the authored narrative as content a rebuild would destroy,
which puts them under the same migration guard.

## The comment record

Agreed shape, combining the anchor from the lavish CLI with a durable ledger:

```json
{"id":"01JCXZ...", "state":"open",
 "entity":{"type":"pull_request","id":11,"level":2},
 "anchor":{"selector":"div.level-stack > p:nth-of-type(3)",
           "range":{"start":[0,14],"end":[0,61]},
           "quote":"each carries its own vendored copy"},
 "body":"is this still true after the split?",
 "author":"human", "ts":"2026-08-21T14:02:00Z",
 "queue_key":"pr11/l2/p3"}
```

- **`anchor.selector` is computed at annotation time from the live DOM**, not
  written into the page at build time. The lavish CLI walks up to five
  ancestors, short-circuits on a real `id`, and falls back to `:nth-of-type`.
  Any element becomes annotatable with no pre-tagging.
- **`anchor.range`** carries DOM range boundaries so a mid-sentence selection
  survives. `quote` is the human-readable fallback when a selector goes stale.
- **`state`** is `open`, `answered`, or `resolved`. The lavish CLI has no
  equivalent for a human comment, and its `takeFeedback()` deletes a prompt on
  delivery. Verified: all 18 sessions in `~/.lavish-axi/state.json` hold
  `prompts: []`.
- **`queue_key`** deduplicates a re-annotated spot before it is sent. Taken
  from `_lavishQueueKey`.
- **Machine-detected issues stay in a separate channel.** The lavish CLI keeps
  layout warnings apart from human prompts, and that separation is right. An
  automated finding must not compete with human intent in one inbox.

## What already exists and must not be rebuilt

`viewer/index.html:705` already ships a comments drawer. It takes a
level-tagged comment, keeps a list, persists to `localStorage` under
`odyssey-f:<repo>:<pr>`, and offers **Copy review as markdown**.

That is the clipboard transport, already working. The change is an upgrade in
two steps, not a new subsystem:

1. Widen the anchor from a whole level to a computed selector plus a range.
2. Replace the clipboard hand-off with an append to the ledger.

## Decided

1. **One `index.json`**, referencing everything else. Not one file per entity type.
2. **The index incorporates `adrs.js` and `designs.js`** rather than sitting
   beside them. `build_index.py` subsumes `build_adrs.py` and `build_designs.py`.
3. **Comments live in their own file**, separate from the index.
4. **Comments join the migration guard from the first commit.**
5. **The index tracks its source folders** so staleness is detectable.
6. **The write endpoint is designed now** and built after the terms, the
   human-facing documents, and the index are settled.

## Index freshness

The index is derived, so it goes stale the moment an authored file changes. It
records what it was built from:

```json
"sources": {
  "docs/architecture/adr":      {"files": 17, "hash": "sha256:..."},
  "docs/architecture/designs":  {"files": 3,  "hash": "sha256:..."},
  "docs/architecture/contexts": {"files": 2,  "hash": "sha256:..."},
  "docs/plans":                 {"files": 5,  "hash": "sha256:..."},
  "docs/pull-requests":         {"files": 8,  "hash": "sha256:..."},
  "git":                        {"head": "642ecb3"}
}
```

Each entry is a content hash over the tracked files in that directory. Any mode
that reads the index compares the hashes first and rebuilds on a mismatch, the
same way `migrate_bundle.py` already runs before every mode. This is what makes
a full-rebuild projection safe to trust.

## The background poll

A `POST /feedback` endpoint closes the loop only if something reads it. The
agent must find new threads without a person asking it to.

Claude Code can run a shell command in the background, and the harness
re-invokes the session when that command exits. So the poll is a background
command that blocks until the ledger grows, then exits. That is the pattern the
lavish CLI uses, and it is the only wake path available without a hook or an
MCP server.

Two rules make it safe:

- The poll exits on a timeout as well as on new feedback, so a session never
  waits forever on a reader who left.
- The ledger is append-only and the reader tracks its own offset. Unlike the
  lavish CLI's `takeFeedback()`, a read must never delete.

## Still open

Whether the write endpoint or default publishing lands first. Deferred until
the terms, the human-facing documents, and the index are settled.

## Unverified

- The selector walk and the range capture are read from the lavish CLI source
  at `dist/cli.mjs` around lines 5037 and 5354. They are read, not run.
- No estimate is offered for `build_index.py`. The scope depends on question 2.
