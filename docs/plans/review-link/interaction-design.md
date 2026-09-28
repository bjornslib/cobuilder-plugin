# Plan page: Interaction Design Specification

This document covers one new page of the Work surface, the plan page. It
extends `docs/plans/cobuilder-viewer/interaction-design.md` and does not
repeat it. Where this file is silent, that file governs. The page uses the
existing shell, rail, heading bands, and tokens. It adds no new token.

## 1. Overview

The plan page shows the three plan documents of one piece of work: product
(Gate 1), architecture (Gate 2), and program design (Gate 3). A reviewer
reaches it from a link that a workflow prints before an approval question.
The page is read-only.

## 2. Information Architecture

The plan page is one row of the Build group in the rail, after Epics and
Rubrics. Its address is `#/<work>/build/plan`. The page holds three blocks, in
gate order: Product, Architecture, Program design. Each block has a heading
band with the gate name, the source path, and the rendered document body.

### 2.3 Declared Defaults

- The page opens scrolled to the top, at the Product block.
- A tail of `#/<work>/build/plan/<gate>` scrolls to that block on load. The
  values of `<gate>` are `product`, `architecture`, and `program`.
- Each block is open. No block collapses.

## 3. States

### 3.2 Component States

**Plan block.** Two states.

- *Present.* A heading band with the gate name, for example "Gate 1 —
  Product". Under it, the source path in the mono face, then the body,
  rendered through the viewer's existing markdown renderer.
- *Absent.* The same heading band. Under it, one line in `--text-3`: "No
  <document> for this work yet." The block keeps its height small and holds
  no control.

**Plan rail row.** The states of the existing nav item, with no change.

### 3.3 Visibility Gating

- The Plan rail row shows for every work item that has a plan slug.
- A work item with no plan slug shows the row disabled, with the reason "no
  plan", the same way a level with no record shows today.
- The page renders all three blocks always. An absent document shows its
  empty state and never hides its block, so the gate order stays fixed.

## 4. Transitions

### 4.1 Transition Table

| From | Event | To | Motion |
|---|---|---|---|
| Any Build row | Select the Plan row | Plan page | The existing section change |
| Outside link | Load with `#/<work>/build/plan/<gate>` | Plan page, at that block | Scroll with no animation |
| Plan page | Select another rail row | That row's page | The existing section change |

### 4.2 Timing Tokens

The page adds no timing token. A section change uses the shell's existing
section duration and easing. Under `prefers-reduced-motion: reduce`, all
durations resolve to zero, as they do today.

## 11. Accessibility details

### 11.2 Hit Targets

The page has one new control, the Plan rail row. It uses the nav item's
existing 44 px minimum height. The document bodies carry links from the
markdown only, and those keep the house link style.

### 11.3 Scroll Ownership

The main column owns the scroll, as on every other Build page. A block never
scrolls on its own. A wide table or code block in a document scrolls
horizontally inside its own box, so the page never scrolls sideways.
