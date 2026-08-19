---
title: "Decision Records — authoring reference (decisions mode)"
type: reference
status: active
last_verified: 2026-06-26
owner: bjoerns
---

# Decision Records — authoring reference

How to author, retro-extract, and maintain ISO/IEC/IEEE 42010 decision records (van Heesch,
Avgeriou & Hilliard 2011 model). Canonical standard: `standard.md` §5.4. The state machine and
integrity rules below exist to keep the decision graph trustworthy: `approved` must mean a human
actually approved it, and a record's history must never be rewritten to look tidier than what
really happened. Start every record from `templates/adr-template.md`.

## 1. Record anatomy — one file, two parts

- **YAML frontmatter** — the machine-readable index. Parsed by the viewpoint generator and (future)
  state validator. Every field below.
- **Markdown body** — the MADR-style narrative: Context, Options considered, Decision,
  Consequences, **Value delivered**, Maps to. The frontmatter `alternatives`/`forces` are
  summaries; the body holds the argument.

## 2. Frontmatter schema

| Field | Req | Notes |
|-------|:---:|-------|
| `id` | ✅ | `ADR-NNNN`, zero-padded, next free number in `{doc_root}/adr/` |
| `name` | ✅ | One-line decision name |
| `state` | ✅ | One of the seven states (§3). |
| `groups` | — | Cross-cutting theme tags (e.g. `ddd-alignment`); drive viewpoint grouping |
| `approved_by` | ✅ if `state: approved` | Human identity. **An agent must never set `approved` on its own initiative** — only record it when the human has approved (explicitly, or implicitly by merging the PR that shipped it). |
| `problem` | ✅ | The problem the decision answers |
| `decision` | ✅ | The chosen option, one sentence |
| `alternatives` | ✅ | ≥1 `{option, rejected_because}` — the P2 guard: what was traded away |
| `forces` | ✅ | Constraints/drivers (requirements, expertise, business) |
| `related_decisions` | — | Typed edges: `depends-on`, `caused-by`, `is-excluded-by`, `replaces`, `is-alternative-for`, `is-related-to`. Use `is-related-to` for group siblings; reserve `caused-by`/`depends-on` for real causality/dependency. |
| `related_concerns` | — | van Heesch concern codes (C1–C23) |
| `history` | ✅ | `{state, date, by?, source?, note?}` entries, oldest first (§5 integrity) |
| `maps_to` | ✅ | `{context, modules[], rule}` — the structural anchor. `context` must exist in `{doc_root}/architecture/contexts/<id>/boundary.yaml`; `rule` must be consistent with that boundary record. |
| `delivers` | ✅ | `{capability, benefit, beneficiary[], enables[]?, addresses_problem?}` — the value facet (§4) |
| `source_pr` | retro only | PR number the decision was extracted from |
| doc-gardener fields | ✅ | `title`, `status: active`, `type: architecture`, `last_verified`, `owner` |

## 3. State machine

```
idea → tentative → decided → approved → challenged → rejected | discarded
```

Legal transitions (reject anything else):

| From | To |
|------|----|
| idea | tentative, discarded |
| tentative | decided, discarded |
| decided | approved, challenged, discarded |
| approved | challenged |
| challenged | decided, approved, rejected |
| rejected / discarded | (terminal) |

Rules: `approved` is **human-granted** — requires non-empty `approved_by`. Never jump states (no
`idea → approved`). A superseded decision is not deleted: mark it `rejected` and add a `replaces`
edge on its successor.

## 4. The value facet (`delivers`) — mandatory

Every record must state the return, not only the cost:

```yaml
delivers:
  capability: "<what is now possible that was not before>"
  benefit:    "<the value created and why it matters>"
  beneficiary: [operator | developer | validator-agent | the-business]
  enables:    ["<future capability unlocked>"]        # optional
  addresses_problem: P3                                # optional: P1 drift | P2 sub-optimal | P3 human-out-of-loop | P4 incoherent edits
```

Mirror this in a `## Value delivered` body section, and lead any PR/changelog description of the
change with it (see `.github/pull_request_template.md`).

## 5. Integrity rules (non-negotiable)

1. **Never invent history.** If the real decision date is unknown (retro-extraction), write
   `date: unrecorded` with a `source`, and date the `approved` entry to when it was retro-recorded,
   with a `note` saying so.
2. **No placeholder targets.** `related_decisions` must reference records that exist. If a
   prerequisite decision is not yet extracted, leave the edge out and note it in the body.
3. **`approved` ⟺ human.** Merging a PR counts as implicit approval for decisions that shipped in
   it; anything else needs the human's explicit word.
4. **`maps_to` must resolve.** If the anchored context has no `boundary.yaml`, either document the
   context first (describe mode) or flag the record as unanchored.
5. **Examples never live in the register.** Sample/demo records go in skill references, not
   `{doc_root}/adr/`.

## 6. Workflows

**New decision (design-time):** duplicate `templates/adr-template.md` → fill frontmatter + body →
`state: tentative` (or `decided` if the team has chosen) → human approval moves it to `approved`
with `approved_by` + dated history entry.

**Retro-extraction (from a merged PR):** read the PR body/diff → one record per *structural*
decision (module boundary, dependency direction, data-flow, public interface, cross-cutting
pattern) → `state: approved`, `source_pr`, history dated to the merge → note in the body that it
was retroactively extracted.

**After any record change:** refresh the three viewpoints in `{doc_root}/decisions/`
(`relationship.md`, `chronology.md`, `capabilities.md`) so they agree with the record set. Until
`generate_decision_views.py` exists, update them by hand in the same change.
