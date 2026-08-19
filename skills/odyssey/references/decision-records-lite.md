---
title: "Decision Records — Odyssey generate/submit path"
type: reference
status: active
last_verified: 2026-08-19
owner: bjoerns
---

# Decision Records — Odyssey generate/submit path

The canonical schema is the architecture skill's
`skills/architecture/references/decision-records.md`. This file is only the
Odyssey path onto that schema. Do not keep a second record shape.

## 1. How generate and submit invoke decisions mode

Use the same dual-path guard as mermaid authoring in `SKILL.md`:

1. Invoke `Skill("cobuilder-architect:architecture")` with decisions mode.
2. If that call gives `Unknown skill`, read
   `${CLAUDE_PLUGIN_ROOT}/skills/architecture/SKILL.md` and
   `${CLAUDE_PLUGIN_ROOT}/skills/architecture/references/decision-records.md`
   directly and obey those files instead.

The skill resolves by name only in a session that has an installed plugin
version which contains it. A development checkout, or an older installed
version, does not find it. The path always resolves, because
`${CLAUDE_PLUGIN_ROOT}` points at the copy in use.

Submit mode itself writes no ADR. A pre-merge decision is a proposal. The
register holds decisions. Generate mode writes the record after the PR
merges, and reads the `intent` the interview captured.

## 2. Write markdown, then compile

Write the record under `docs/architecture/adr/ADR-NNNN-<slug>.md`. Then run:

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/scripts/build_adrs.py"
```

Never write `data/adrs.json` or `data/adrs.js` by hand. `build_adrs.py` is a
full rebuild of the self-bundle projection. It is self-only. Source is always
`<repo>/docs/architecture/adr/`. Destination is always
`<repo>/.cobuilder-architect/self/data/`. Do not point it at a foreign
fixture.

Set this PR's `adrs: ["ADR-NNNN", ...]` array in `data/story.json` so story
mode's level 3 can pull `alternatives`/`forces` from the compiled records.

Start a new record from
`skills/architecture/references/templates/adr-template.md`.

## 3. State on a retro-created record

A record that generate mode creates is `state: decided`. Never `approved`.
An agent must not set `approved` on its own initiative. `approved_by` is
stamped only when submit mode's post stage observes a human merge.

## 4. When the author already answered

Submit mode writes an `intent` block onto the PR's timeline entry. See
`references/interview-guide.md` §1 for the shape. When that block is present:

1. `problem` and the body's `## Context` come from `intent.problem` and
   `intent.why_now`. These are statements of fact by the person who made the
   change. Do not replace them with your reading of the diff.
2. `alternatives` come from `intent.alternatives`. The shape already
   matches, so copy the entries.
3. The record carries `provenance: authored` instead of `inferred`. A reader
   needs to know which of the two applies.

An `intent` block whose own `source` is `"inferred"` is not an author
statement. The record stays `provenance: inferred`.

A record still needs a real structural decision. An interview does not make
a routine PR ADR-worthy.

## 5. Integrity rules that stay

1. One record per structural decision: module boundary, dependency
   direction, data-flow choice, public interface, or cross-cutting pattern.
   Most PRs produce zero or one. Do not manufacture a record for a PR with
   no real structural decision.
2. Never invent alternatives. Pull rejected options from `intent`, the PR
   body, commit messages, or code comments. If you cannot find any, either
   the PR is not ADR-worthy or the alternative is genuinely "do nothing".
