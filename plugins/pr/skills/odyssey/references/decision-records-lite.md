---
title: "Decision Records — Odyssey generate/review path"
type: reference
status: active
last_verified: 2026-08-19
owner: bjoerns
---

# Decision Records — Odyssey generate/review path

The canonical schema is the architecture skill's own
`references/decision-records.md`. This file is only the Odyssey path onto
that schema. Do not keep a second record shape.

## 1. How generate and review invoke decisions mode

1. Invoke `Skill("architect:architecture")` with decisions mode.
2. If that call gives `Unknown skill`, tell the engineer that decisions
   mode is unavailable and stop. Dropped: the earlier fallback read the
   architecture skill's `SKILL.md` and `references/decision-records.md`
   straight from `${CLAUDE_PLUGIN_ROOT}`. That path only resolved while
   both skills shared one plugin root. Once odyssey and architecture ship
   as separate plugins, `${CLAUDE_PLUGIN_ROOT}` in an odyssey-run script
   resolves only to odyssey's own cache, so the architecture skill's files
   are not there to read. The `Skill()` call above is the only path this
   file still relies on, and it crosses plugins by design, not by file
   path.

The skill resolves by name only in a session that has an installed plugin
version which contains it. A development checkout, or an older installed
version, does not find it.

Generate mode itself writes no ADR. A pre-merge decision is a proposal. The
register holds decisions. Review mode writes the record after the PR
merges, and reads the `intent` the interview captured.

## 2. Write markdown, then compile

Write the record under `docs/architecture/adr/ADR-NNNN-<slug>.md`. Then run:

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/shared/build_index.py"
```

Never write `data/adrs.json` or `data/adrs.js` by hand. `build_index.py` is a
full rebuild of the self-bundle record index, including the `adrs.json` and
`adrs.js` projections. It is self-only. Source is always
`<repo>/docs/architecture/adr/`, plus every other authored record under
`<repo>/docs/`. Destination is always `<repo>/.cobuilder-architect/self/data/`.
Do not point it at a foreign fixture.

Set this PR's `adrs: ["ADR-NNNN", ...]` array in `data/story.json` so story
mode's level 3 can pull `alternatives`/`forces` from the compiled records.

Start a new record from the architecture skill's
`references/templates/adr-template.md`.

## 3. State on a retro-created record

A record that review mode creates is `state: decided`. Never `approved`.
An agent must not set `approved` on its own initiative. `approved_by` is
stamped only when generate mode's post stage observes a human merge.

## 4. When the author already answered

Generate mode writes an `intent` block onto the PR's timeline entry. See
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
