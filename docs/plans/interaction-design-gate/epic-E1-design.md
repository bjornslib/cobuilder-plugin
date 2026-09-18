# Epic E1 design: The vendored skill

## Scope and Intent

Fork the `design-to-code` skill from the think-with-ai repository into the
implement plugin as a three-step skill. Trim it to the part that `implement`
does not already own.

`implement` owns three documents before Gate 3: what the feature is for, how it
fits, and how it is built. It owns no document that states how the interface
behaves. This skill writes that document. It writes nothing else.

The fork is deliberate and one-way. The two copies are not kept in step. When
this copy changes, the think-with-ai copy is updated afterwards.

## Files Touched

Eight files travel. Three do not.

| File | Travels | Why |
|---|---|---|
| `SKILL.md` | yes, rewritten | Three steps replace five. Wording becomes epic-based. Paths become plan-directory paths. |
| `references/jsonc-schema.md` | yes | The schema for `ui-spec.jsonc`. It carries the new `interaction` block. |
| `references/research-workflow.md` | yes | Step 2. Unchanged in substance. |
| `references/shadcn-patterns.md` | yes | Step 2 component patterns. Unchanged in substance. |
| `references/implementation-rules.md` | yes, reframed | Its browser checks move from Step 4 to the GREEN and VALIDATE instructions. |
| `templates/interaction-design.md` | yes | The Gate 2b template. Twelve sections. |
| `examples/workflow-matrix-interaction-design.md` | yes | The one worked instance of that template. |
| `examples/voice-dashboard.jsonc` | yes | The one worked instance of the JSONC schema. |
| `templates/brief-template.md` | no | Serves the product brief, which `01-product.md` replaces. |
| `templates/prd.md` | no | Serves the product brief, which `01-product.md` replaces. |
| `examples/workflow-matrix-prd.md` | no | An instance of the deleted PRD template. |

`references/brief-template.md` does not travel because it does not exist. The
upstream copy is a byte-identical duplicate of `templates/brief-template.md`,
and it was deleted at source.

### Step map

| Upstream | Vendored | Reason |
|---|---|---|
| Step 1 — Image to brief and PRD | removed | Gate 1 `01-product.md` already holds the product intent, and Gate 1 forbids technical detail. |
| Step 1b — Interaction design specification | Step 1 | This is the gap the change fills. |
| Step 2 — Research components and patterns | Step 2 | Unchanged. |
| Step 3 — Generate the JSONC specification | Step 3 | Unchanged, except that interactions now travel into it. |
| Step 4 — Implement and verify in a browser | removed | The slice loop owns code. RED writes the failing contract, GREEN writes the code, VALIDATE scores it against a blind rubric. A second code path would bypass all four gates. |

The useful content of Step 4 survives as checks inside `implementation-rules.md`
and as the browser clause in VALIDATE's criteria.

### Terminology map

| Upstream word | Vendored word |
|---|---|
| PRD | `epic-<epic-id>-design.md` (Gate 4b) |
| Brief | `01-product.md` (Gate 1) |
| "Step N approval" | A gate approval recorded in `00-status.md` |
| "Implement from the JSONC" | The slice loop: RED, GREEN, VALIDATE |
| "Output path" | `docs/plans/<feature-slug>/` |
| "Feature" | "Epic", where the epic is the unit of design |

## Types & Signatures

The skill has no code. Its contract is its file structure and its frontmatter.

```yaml
---
title: "design-to-code"
description: >-
  Turn an approved design into an interaction design specification and a
  JSONC component spec. Use when a feature has a front end and its states,
  transitions, visibility rules, and defaults must be recorded before
  implementation.
status: active
type: skill
last_verified: 2026-09-14
---
```

Two artifacts leave the skill:

```jsonc
// docs/plans/<feature-slug>/interaction-design.md
// Markdown. Twelve sections. The template in templates/interaction-design.md
// supplies the skeleton. Eight of the twelve headings are required, because
// verify_gate.py checks for them.
```

```jsonc
// docs/plans/<feature-slug>/ui-spec.jsonc
{
  "components": [
    {
      "name": "string",
      "interaction": {
        "states": { "<state>": "<classes>" },
        "initial": "<state>",
        "timerArming": { "<state>": "<event>" }
      }
    }
  ],
  "interactions": {
    "stateClasses": ["default", "hover", "focusVisible", "pressed", "selected",
                     "disabled", "loading", "empty", "error", "transient"],
    "transitions": [{ "trigger": "string", "from": "string", "to": "string",
                      "durationToken": "string", "guard": "string",
                      "reset": "string" }],
    "visibility": [{ "element": "string", "condition": "string" }],
    "defaults": [{ "setting": "string", "value": "string" }],
    "timingTokens": { "string": "string" },
    "layering": [{ "surface": "string", "zIndexToken": "string" }],
    "hitTargets": [{ "element": "string", "size": "string" }],
    "scrollOwnership": [{ "surface": "string", "owner": "string" }]
  }
}
```

## Slice Decomposition

- **Slice 1** creates the directory, the `SKILL.md` skeleton, and the eight
  files. It proves the shape: three steps, valid frontmatter, no dangling
  relative path.
- **Slice 2** fills the four concepts into the template, adds the matching
  JSONC keys, and covers the paths that have nothing to design. It proves that
  the prose and the schema agree, which is what makes the artifact usable at
  Gate 4c, and that the skill costs nothing when a feature has no front end.

Slice 2 carries the risk. It holds both the content and the negative paths, so
one score now covers both. A half-finished slice scores low without saying which
half failed, and the validator must read the slice's two halves separately.

## Test Plan

`tests/test_design_to_code_skill.py` — new. It reads the tree, so it needs no
network and no model.

| Check | Method |
|---|---|
| Frontmatter parses | `yaml.safe_load` on the frontmatter block |
| Three steps are named | The overview names three steps and no fourth |
| Every cited path resolves | Extract relative paths from the Markdown, assert each exists |
| Deleted files are not cited | Grep for `brief-template`, `templates/prd.md`, `workflow-matrix-prd` |
| Terminology is epic-based | Grep for `PRD` and for the word `brief` as a document name |
| Required headings are present | Assert all eight `REQUIRED_INTERACTION_SECTIONS` appear in the template |

The last check is the important one. It couples the template to the gate check,
so a later edit to either one fails a test rather than a gate.

`tests/test_pillar_boundaries.py` must also pass. `design-to-code` joins
`KNOWN_OTHER_SKILLS`, or `assert_no_unscanned_pillar()` fails.

## Risks & Open Questions

- **The fork drifts.** The two copies diverge by design, so a fix applied to one
  does not reach the other. Accepted. The change that matters runs in one
  direction: cobuilder-plugin first, think-with-ai afterwards.
- **The name is close to `architect:design`.** `architect:design` means
  "interview an engineer and write `intent.json`". `implement:design-to-code`
  means "turn a supplied design into a specification". A session could confuse
  them. Mitigation: the `description` field names a supplied design and a front
  end, and `architect:design` does not.
- **Eight files may still be too many.** `references/shadcn-patterns.md` is
  1254 words about one component library. If a later build shows that Step 2
  reads it rarely, it should go. Not measured yet.
- **The template is long.** 2002 words with inline guidance. A filler who
  ignores the guidance writes a shorter document. The eight required headings
  are the floor, not the ceiling.
