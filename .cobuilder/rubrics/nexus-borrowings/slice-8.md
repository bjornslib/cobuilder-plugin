# Rubric: Slice 8 — Implement notices, the vocabulary agent guard, and the bumps

Feature: nexus-borrowings
Epic: nexus-borrowings/E4
Slice goal: `implement:start`/`install`/`debug` surface the existence notice; `implement:vocabulary` step 0 returns `FINDINGS` with one `[UNDEFINED]` bootstrap item on a missing file, never a silent `CLEAN`. Marketplace bumps: architect 0.7.0, implement 0.4.0, artifact 0.7.0. Self-bundle rebuilt; full pytest green.
Test command: `uv run --with pytest pytest tests/ -q`

Sources: `04-slices.md` row 8, `epic-E4-design.md`, ADR-0036, ADR-0025.

## Criteria

### C1 — The agent guard is mechanical [CRITICAL]
**Must be true:** `plugins/implement/agents/vocabulary.md` step 0: when `DDD-VOCABULARY.md` is absent, the agent returns `FINDINGS` with one `[UNDEFINED]` item that names the design-stage-1 bootstrap — and never appends a `Verdict: CLEAN` block in that case.
**Evidence to check (transcript against a repo without the glossary):** the evidence file records FINDINGS with the bootstrap item; the `CLEAN` template is not used.
**Scoring:** 1.0; 0.0 any silent CLEAN on a missing file.

### C2 — The three implement commands surface the notice [IMPORTANT]
**Must be true:** `/implement:install`, `/implement:start`, and `/implement:debug` state whether the glossary exists and point at design stage 1; none runs the bootstrap itself.
**Evidence to check:** read the three command files; the notice lines present; no auto-run prose.
**Scoring:** 1.0 all three; 0.5 two; 0.0 absent or auto-running.

### C3 — Bumps and bundle rebuild [CRITICAL]
**Must be true:** `.claude-plugin/marketplace.json` reads architecture 0.7.0, implement 0.4.0, artifact 0.7.0 (pr and cobuilder-full-lifecycle unchanged); `tests/test_plugin_manifests.py` green; the self bundle rebuilt with `uv run shared/build_index.py` exits 0 and the nexus-borrowings entity carries `diagrams["runtime"]` and `contracts`.
**Evidence to check:** read the manifest; run build_index; run the full suite with no new failures.
**Scoring:** 1.0 all; 0.5 bumps right but bundle stale or suite red; 0.0 otherwise.

### C4 — No new install surface [IMPORTANT]
**Must be true:** No new agent files, hooks, or MCP servers anywhere; ADR-0025's packaging test stays green untouched.
**Evidence to check:** `tests/test_plugin_manifests.py` passes; manifest diff shows version strings only.
**Scoring:** 1.0; 0.0 otherwise.