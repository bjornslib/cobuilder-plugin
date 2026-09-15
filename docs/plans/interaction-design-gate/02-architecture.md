# Architecture: Interaction design gate

## Fit

The change touches two plugins and one shared module. It adds no server and no
new route.

| File | State | What changes |
|---|---|---|
| `plugins/implement/skills/design-to-code/` | new | A three-step skill, forked from the five-step skill in the think-with-ai repository. Eight files travel. Three product-brief files do not. |
| `plugins/implement/skills/build/SKILL.md` | modified | A `## Gate 2b` section after the Gate 2 section. A `2b` line in the `00-status.md` template, between the Gate 2 and Gate 3 lines. The resume rule names 2b. |
| `plugins/implement/skills/build/references/rubric-authoring.md` | modified | §4 gains `interaction-design.md` and `ui-spec.jsonc` as derivation sources. |
| `plugins/implement/skills/build/references/slice-loop.md` | modified | RED reads the interaction design and the JSONC spec. VALIDATE's front-end criteria name a browser check. |
| `plugins/implement/scripts/verify_gate.py` | modified | A `2b` group. The docstring says the script verifies Gate 2b and Gate 4. |
| `shared/build_index.py` | modified | `STATUS_GATE_RE` accepts a `2b` label. A new `interaction_design` entity projects the document. |
| `plugins/artifact/scripts/build_builds_view.py` | modified | `GATE_LINE` accepts `2b`. `GATE_DOCS` gains a `2b` key. |
| `plugins/implement/commands/start.md` | modified | The two new artifacts join the "What this writes" list. |
| `plugins/implement/.claude-plugin/plugin.json` | modified | Version 0.1.0 to 0.2.0. |
| `tests/test_pillar_boundaries.py` | modified | `design-to-code` joins `KNOWN_OTHER_SKILLS`. |
| `tests/test_design_to_code_skill.py` | new | The skill's structure, and every relative path it cites. |
| `tests/test_gate_2b.py` | new | The `2b` group in `verify_gate.py`. |

`plugins/implement/commands/start.md` already wraps `build`, so the command
contract does not change. `plugins/implement/commands/debug.md` sets the
precedent for one plugin citing another plugin's skill, but this change does
not need it. The skill sits inside `implement`, so the call stays in one
plugin.

## Endpoints

none — two skills, one script, and a static-bundle projection.

## Data

`data/index.json` gains one entity array:

```jsonc
"interaction_design": [
  {
    "feature_slug": "interaction-design-gate",
    "gate": "2b",
    "title": "Interaction design: <feature>",
    "state": "n/a (no UI)",
    "source_path": "docs/plans/interaction-design-gate/interaction-design.md",
    "body_md": "<the document body>"
  }
]
```

`joins.feature_gates[<slug>]` gains one entry when the plan carries a `2b`
line:

```jsonc
{ "n": "2b", "name": "Interaction design", "state": "n/a (no UI)", "doc": "<feature-slug>" }
```

`n` is an integer today. `resolve_feature_gates()` writes it, and that function
compares `gate["n"] == 3` to attach the program-design document. A `2b` label
forces `n` to become a string. Three call sites assume a small integer:

1. `shared/build_index.py:1091` — `gate["n"] == 3`.
2. `plugins/artifact/viewer/index.html:3290` — `const isCurrent = g.n === 4;`.
3. `plugins/artifact/scripts/build_builds_view.py:174` — `current_doc()` treats
   a gate as done only when its state starts with `APPROVED`. An `n/a` 2b gate
   is not done, so the Builds view would open on a gate that asks for nothing.

Epic E3 owns all three. `epic-E3-design.md` records them as risks.

## Flow

1. A session reaches Gate 2 and records `- Gate 2 — Architecture: APPROVED
   <date>` in `00-status.md`.
2. The session reads the `## Screens` line in `01-product.md` and the `## Fit`
   section in `02-architecture.md`.
3. Two branches follow:
   - No front end. The session writes
     `- Gate 2b — Interaction design: n/a (no UI) — Screens: "<the entry>"` and
     continues to Gate 3.
   - A front end. The session asks the person to supply the design. It then
     invokes `implement:design-to-code`, runs its three steps, and records
     `APPROVED <date>`.
4. Gate 3 begins only when the 2b line reads APPROVED or n/a.
5. Gate 4c derives criteria from `interaction-design.md` and `ui-spec.jsonc`.
6. The slice loop reads both documents at RED, and VALIDATE exercises each
   front-end criterion in a browser.

## External

none — no network call, no new dependency, no model call. The skill's Step 2
offers two optional MCP lookups. Both stay optional, and a session without
those tools still completes the step.
