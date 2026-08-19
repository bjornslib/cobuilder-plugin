---
title: "Decision Records (lite) — retro-extraction reference"
type: reference
status: active
last_verified: 2026-07-20
owner: bjoerns
---

# Decision Records (lite) — retro-extraction reference

How to retro-extract architecture decision records from a merged PR into the
Odyssey bundle's `data/adrs.json`. This is a *lite* form of the ISO/IEC/IEEE
42010 decision-record model (van Heesch, Avgeriou & Hilliard 2011). Governance
machinery — state transitions, human approval, viewpoint regeneration, ADR
numbering authority — is dropped. These records describe a foreign repo's
history, not a document set this plugin maintains. Start every record from
`references/adr-template.md`.

## 1. Record shape

One JSON object per decision, keyed by id in `data/adrs.json`:

```json
{
  "id": "ADR-0001",
  "title": "<one-line decision name>",
  "state": "approved",
  "source_pr": 73,
  "problem": "<the problem this decision answers>",
  "decision": "<the chosen option, one sentence>",
  "alternatives": [
    {"option": "<rejected option>", "rejected_because": "<why>"}
  ],
  "forces": ["<constraint/driver>", "..."],
  "delivers": {
    "capability": "<what is now possible that was not before>",
    "benefit": "<the value created and why it matters>",
    "beneficiary": ["operator", "developer"]
  },
  "body": "<markdown: Context / Options considered / Decision / Consequences / Value delivered / Maps to>"
}
```

`data/adrs.js` mirrors the same data as a browser-loadable global:
`window.ADRS = {<id>: <record>, ...};` — regenerate it alongside `adrs.json`
whenever a record changes. It is not hand-maintained.

`id` is `ADR-NNNN`, zero-padded, next free number across the whole bundle (not
per-PR) — read the existing `data/adrs.json` before picking the next id.

## 2. The value facet (`delivers`) — mandatory

Every record states the return, not only the cost. `capability` is what is
now possible that was not possible before. `benefit` is why that capability
matters. `beneficiary` is who gains (`operator | developer |
validator-agent | the-business`, or repo-appropriate equivalents). Mirror
this in the body's `## Value delivered` section.

## 3. Integrity rules (kept from the full model, non-negotiable)

1. **Never invent history.** These are retro-extractions from a repo you do
   not own — you only know the merge date, not internal deliberation. Do not
   fabricate a decision date beyond what `git log` gives you for the merge
   commit.
2. **`state: approved` for merged PRs.** A PR that shipped is, by definition,
   an approved decision at the point it merged. No separate human-approval
   step exists in this lite model, because that machinery is dropped. Set
   `source_pr` and note in the body that the record is retroactively
   extracted.

   **Carve-out for an unmerged PR.** A decision in a PR that has not merged is
   a proposal, not an approved decision. Use `state: proposed` for a PR whose
   `timeline[].status` is `"open"`. Submit mode never writes an ADR at all —
   see §7 — so this case only arises when generate mode runs against an open
   PR. Change the state to `approved` on the next run after the PR merges.

3. **One record per structural decision** — module boundary, dependency
   direction, data-flow choice, public interface, cross-cutting pattern.
   Not every PR produces one. Most PRs produce zero or one. Do not manufacture
   a record for a PR with no real structural decision.

4. **`alternatives` must be real.** Pull rejected options from the PR body,
   commit messages, or code comments. Never invent an option the PR did not
   actually consider. If you cannot find any, either the PR is not ADR-worthy
   or the alternative is genuinely just "do nothing," which is a legitimate
   entry.

   **Prefer the author's own answer when it exists.** See §7. An `intent`
   block on the timeline entry holds `alternatives` in this exact
   `{option, rejected_because}` shape, stated by the person who made the
   choice. Copy those instead of searching for traces of them.
5. **Examples never live in the register.** Sample/demo records belong in this
   reference file, not in a real bundle's `data/adrs.json`.

## 4. What is dropped from the full model, and why

| Dropped | Why |
|---|---|
| State machine (`idea → tentative → decided → approved → ...`) | The plugin extracts records after a PR merges, so exactly one meaningful state (`approved`) applies for this plugin's purpose. |
| `approved_by` / human-approval gate | No human review loop exists for a generated bundle — the PR merge itself is the approval signal. |
| Viewpoint files (`relationship.md`, `chronology.md`, `capabilities.md`) | Those regenerate a maintained doc set. The bundle's `adrs.json`/`adrs.js` *is* the artifact. |
| ADR numbering governance / `related_concerns` (van Heesch C1–C23) | Governance overhead for a repo you maintain, not one you are narrating. |
| `maps_to` resolving against `boundary.yaml` | No `boundary.yaml` exists for a foreign repo. |

## 5. `maps_to` in this model

Instead of anchoring to a `boundary.yaml`, `maps_to` references a **context id
from `<bundle-dir>/inventory.yaml`** — the district the decision most
directly affects. Add it in the body's "Maps to" section, or as an optional
top-level field, if the consuming code wants it structured that way. Records
inherit `provenance: inferred` from the inventory context they map to. There
is no separate provenance field on the record itself.

## 6. Workflow — retro-extraction from a merged PR

1. Read the PR's diff (`extract_diffs.py` output) and touched files.

2. Read this PR's `intent` block, if it has one (§7).

3. Identify zero or more *structural* decisions in the diff (see §3.3).

4. For each: fill the shape in §1, using `references/adr-template.md` as the
   body skeleton. Ground `problem`/`decision`/`alternatives`/`forces` in what
   the diff and surrounding code actually show — never speculate beyond the
   evidence.

5. Assign the next free `ADR-NNNN` id.

6. Write or merge the record into `<bundle-dir>/data/adrs.json`, and
   regenerate `data/adrs.js`. Set this PR's `adrs: ["ADR-NNNN", ...]` array
   in `data/story.json`, so story mode's level 3 can pull
   `alternatives`/`forces` straight from these records (see `story-mode.md`
   §2).

## 7. When the author already answered

Submit mode (`/cobuilder-architect:submit`) interviews the author before the PR opens,
and writes an `intent` block onto the PR's timeline entry. See
`references/interview-guide.md` §1 for the shape. When that block is present,
it changes this workflow in three ways:

1. **`problem` and the body's `## Context` come from `intent.problem` and
   `intent.why_now`.** These are statements of fact by the person who made the
   change. Do not replace them with your reading of the diff.
2. **`alternatives` come from `intent.alternatives`.** The shape already
   matches, so copy the entries. This is the case §3.4's escape hatch exists
   for, and an interviewed PR does not need it.
3. **The record carries `provenance: authored` instead of `inferred`.** §5's
   default applies only to a record you reconstructed yourself. A reader needs
   to know which of the two applies.

Two rules do not relax. A record still needs a real *structural* decision
(§3.3) — an interview does not make a routine PR ADR-worthy. And an `intent`
block whose own `source` is `"inferred"` is not an author statement. It is
another reading of the evidence, so the record stays `provenance: inferred`.

**Submit mode itself writes no ADR.** A pre-merge decision is a proposal, and
the register holds decisions. Generate mode writes the record after the PR
merges, reading the `intent` the interview captured.
