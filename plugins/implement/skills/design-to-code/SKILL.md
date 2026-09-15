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

# Design to Code

Turn a supplied design into two specification documents. Implementation is not
this skill's job. The slice loop owns code.

## When to use this skill

Use it at Gate 2b, after Gate 2 approves the architecture and before Gate 3
names types and signatures.

Use it when the feature has a front end. When the feature has no front end,
write one line and continue to Gate 3:

```markdown
- Gate 2b — Interaction design: n/a (no UI) — Screens: "<the ## Screens entry>"
```

The quoted `## Screens` entry is the audit on that answer. No tool can tell
whether a front end exists, so a reviewer compares the two documents by hand.

The person supplies the design. Ask for an image, a set of screenshots, or a
link to a rendered page. Do not invent a design.

## Workflow Overview

```
Step 1: Supplied design  → interaction-design.md   [gate approval required]
Step 2: Interaction spec → component research      [optional MCP tools]
Step 3: Research         → ui-spec.jsonc
```

Each step produces one artifact. The next step reads that artifact, so the work
stays aligned with what the person approved.

Both artifacts belong in `docs/plans/<feature-slug>/`.

A mockup describes the interface at rest. It holds one state of each element.
Step 1 describes what the interface does over time. Do not let the mockup answer
a question about a second state.

## Step 1: Interaction Design Specification

### Input

- The supplied design: an image, a set of screenshots, or a rendered page.
- Stitch HTML and CSS, when the source is Stitch. This HTML is static. It is
  authoritative for layout and structure only. It carries no hover state, no
  focus state, no timer, and no declared default.
- `docs/plans/<feature-slug>/01-product.md` for the product intent.
- `docs/plans/<feature-slug>/02-architecture.md` for the named layers.
- `templates/interaction-design.md`

### Process

1. **Fill `templates/interaction-design.md`** into
   `docs/plans/<feature-slug>/interaction-design.md`. Read the template first.
   It holds the section list and the inline guidance.

2. **Answer the four questions a mockup cannot answer:**

   - **Initial state and timer arming.** Name the state each component renders
     in first. Name the event that starts each timer and the event that resets
     it. Never arm a timer on mount when the countdown should start on a
     person's action.
   - **Transitions on state change.** Write one row for each edge of the state
     machine: trigger, source state, target state, timing token, and reset
     condition.
   - **Visibility gating.** Name what must be true before a control exists at
     all. Gating is not the same as disabling. A disabled control is visible and
     inert. A gated control is absent.
   - **Declared defaults.** Name the starting value for every setting with more
     than one option. A mockup rendered in dark mode does not make dark mode the
     default.

3. **Declare the three cross-component contracts** in Section 11 of the
   template: one named layering scale, one hit-target element per control, and
   one scroll owner per overlapping region.

4. **Run the Document Validation Checklist** at the foot of the template.

### Output

`docs/plans/<feature-slug>/interaction-design.md`, approved by the person.

### Checkpoint

Present the finished document and ask:

> "This specification fixes the states, the transitions, the gating, and the
> defaults. Does it match your intent before I research components?"

Do not continue to Step 2 until the person approves this document.

Eight of the twelve headings are required. `verify_gate.py` checks for them at
Gate 4c. A document that omits one fails the gate.

## Step 2: Research Components and Patterns

### Input

- The approved `interaction-design.md` from Step 1.
- `01-product.md` for the component list.
- `02-architecture.md` for the layer the components belong to.

### Process

Run the research in parallel where the tools allow it. Every tool below is
optional. When a tool is absent, skip that lookup and say which one you skipped.
Do not treat a missing tool as a blocked step.

#### 2a. Search existing codebase patterns

Use the Explore agent to find components similar to the ones the product
document names, the layout patterns already in use, the animation patterns
already in use, and the state-store patterns that fit.

#### 2b. Query Magic UI components

Use the Magic UI tools to browse the component catalog, to find animation
options, and to find button, background, and effect variants.

#### 2c. Check shadcn availability

Use the shadcn tool to learn which required components are already installed.
Name the ones that need `npx shadcn@latest add`.

#### 2d. Research UI patterns

Use the pattern research tools for a quick lookup, or to compare two approaches
when the choice is not obvious.

#### 2e. Read framework documentation

Use the documentation tools for the framework, React, or Tailwind details that
the codebase does not already answer.

### Output

A component research report, returned in the session. It names the patterns to
reuse, the recommended components, the install commands, and the animation
choices. It writes no file, because Step 3 is what records the decision.

## Step 3: Generate the JSONC Specification

### Input

- The approved `interaction-design.md` from Step 1.
- The component research report from Step 2.
- `references/jsonc-schema.md`

### Process

1. **Build `docs/plans/<feature-slug>/ui-spec.jsonc`** following the schema in
   `references/jsonc-schema.md`.

2. **Map components to the researched options.** Prefer a component that already
   exists in the codebase. Then a shadcn component. Then a Magic UI component.

3. **Map colours to the target project's design tokens.** Read the token
   definitions from the target project, usually in `app/globals.css`,
   `styles/tokens.css`, or `tailwind.config.*`. Map each role to a token name.
   Never carry a literal palette from another project into the specification.

4. **Carry the interaction design into the `interactions` block.** Copy the
   states, transitions, visibility rules, defaults, timing tokens, layering, hit
   targets, and scroll ownership out of `interaction-design.md`. Section 3.2 of
   that document becomes `components[].interaction.states`, and Section 2.3
   becomes `interactions.defaults`. The mapping table in
   `references/jsonc-schema.md` names every pair.

5. **Record the component source** for each component: `existing`, `shadcn`,
   `magicui`, or `custom`. Name the install command when one is needed.

6. **Carry the accessibility annotations** from the research into the spec.

### Output

`docs/plans/<feature-slug>/ui-spec.jsonc`.

## What happens next

This skill stops here. The slice loop owns code.

- RED reads `03-program-design.md`, the epic design, `interaction-design.md`,
  and `ui-spec.jsonc`. A front-end slice derives its failing contract from all
  four.
- GREEN writes the component, following `references/implementation-rules.md`.
- VALIDATE scores the work against a blind rubric. A front-end criterion names
  a check a browser can make with real pointer input. A component test that
  calls `.click()` is not that check.

The browser checks live in `references/implementation-rules.md`. They are the
part of the old implementation step that survived, and they matter because a
type-check and a build prove that the code compiles rather than that a control
responds.

## MCP Tool Quick Reference

| Tool | Purpose |
|---|---|
| Magic UI component tools | Browse the catalog and find animation or effect components |
| `mcp__shadcn` | Check and install shadcn components |
| `mcp__perplexity__perplexity_ask` | Quick pattern lookups |
| `mcp__perplexity__perplexity_reason` | Compare two UI approaches |
| `mcp__context7__get-library-docs` | Framework documentation |

## Additional Resources

### Templates

- **`templates/interaction-design.md`** — the Step 1 skeleton. Twelve sections,
  the state, transition, gating, and default tables, the three cross-component
  contracts, and the validation checklist.

### Reference Files

- **`references/jsonc-schema.md`** — the Step 3 schema, including the
  `interactions` block and the mapping table from the template's sections.
- **`references/research-workflow.md`** — the detailed guide for Step 2.
- **`references/shadcn-patterns.md`** — shadcn component patterns and variants.
- **`references/implementation-rules.md`** — the rules GREEN follows, with the
  browser checks VALIDATE needs.

### Examples

- **`examples/workflow-matrix-interaction-design.md`** — a filled interaction
  design specification. Read it for a worked answer to each section.
- **`examples/voice-dashboard.jsonc`** — a filled JSONC specification.

## Critical Checkpoints

1. **Before Step 1**: ask the person for the design. Do not invent one.
2. **After Step 1**: pause and ask the person to approve the interaction design
   specification.
3. **After Step 2**: present the component recommendations when the interface is
   large or the choice is close.
4. **After Step 3**: present `ui-spec.jsonc` for review.
5. **Before Gate 3**: record `APPROVED <date>` on the `2b` line, or record the
   `n/a (no UI)` form with the quoted `## Screens` entry.

## Error Handling

When the research finds a conflict between two components, prefer the pattern
the codebase already uses. Check that a shadcn component works with React 19, and
that a Magic UI component works with Tailwind 4.

When a required component is missing, fall back to a simpler shadcn component
and record that choice in the spec. When the design cannot be built as supplied,
say so and propose the change before writing anything.
