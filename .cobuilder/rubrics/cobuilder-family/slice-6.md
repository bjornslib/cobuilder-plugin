# Rubric: Slice 6 — five plugins, five manifests

Feature: cobuilder-family
Epic: plugin-split/E1
Slice goal: `claude plugin validate` passes on each, and the family installs.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — Each plugin validates and installs alone [CRITICAL]
**Must be true:** Each of the five installs from the marketplace on its own and its commands appear.
**Evidence to check:** Validate each manifest. Install each alone into a clean cache and list its commands.
**Scoring:** 1.0 — all five. 0.5 — four. 0.0 — any fails to validate, or one needs another to install.

### C2 — The umbrella plugin brings the other four [CRITICAL]
**Must be true:** Installing the full-lifecycle plugin installs the other four through its dependency list.
**Evidence to check:** Install it into a clean cache and list what arrived.
**Scoring:** 1.0 — all four arrive. 0.5 — they arrive after a manual step. 0.0 — the dependency list does nothing.

### C3 — The install surface is unchanged
**Must be true:** No plugin ships an agent, a hook, or an MCP server.
**Evidence to check:** Read all five manifests and scan each plugin tree.
**Scoring:** 1.0 — none present. 0.0 — any present. There is no half credit on this one.

### C4 — Each plugin carries its own copy of what it shares
**Must be true:** Each installed cache holds a real copy of the shared modules and the shared skills. No cache reaches outside itself.
**Evidence to check:** List each cache. Rename the marketplace source and re-run one command per plugin.
**Scoring:** 1.0 — every cache self-contained. 0.5 — self-contained only while the source tree exists. 0.0 — a plugin reads outside its root.

### C5 — Two plugins can be different versions without corrupting a bundle
**Must be true:** An older plugin and a newer one against the same bundle produce a refusal rather than a bad write.
**Evidence to check:** Set an older version constant in one cache and run it against a newer bundle.
**Scoring:** 1.0 — refused with a clear message. 0.5 — refused with an unclear one. 0.0 — it writes.

### C6 — The temporary command name from slice 4 is undone [CRITICAL]
**Must be true:** `cobuilder-pr` ships `commands/review.md`, and no command file anywhere is named `odyssey-review.md`. Slice 4 used that name only because one `commands/` directory cannot hold two files named `review.md`. The split removes the collision, so the workaround must go with it.
**Evidence to check:** List every command file of every plugin. Confirm `cobuilder-architect` and `cobuilder-pr` each carry their own `review.md`, and that both resolve as separate commands.
**Scoring:**
- 1.0 — both plugins carry `review.md`, and `odyssey-review` exists nowhere.
- 0.5 — the file is renamed and a document still refers to `odyssey-review`.
- 0.0 — the workaround ships.

*Added during the build, on 2026-08-21, after slice 4 surfaced the collision. Recorded here rather than fixed silently, so the rubric stays the record of what is required.*

## Regression check
- Every bundle in the repo still verifies.
- Every command that worked at slice 5 still works.

## Out of scope — do not penalise
- The index, the viewer modes, and the ledger.
- The `cobuilder-implement` port. That is slice 7.
