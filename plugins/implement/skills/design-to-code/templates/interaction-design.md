---
title: "Interaction Design Template"
type: template
status: active
last_verified: 2026-09-14
---

# Interaction Design Specification Template

Fill this template at Step 1, after the product document is approved and before
component research starts. The product document describes what the interface
looks like at rest. This document describes what the interface does over time.

A static mockup cannot answer the questions in this document. Do not treat the
mockup, or Stitch HTML, as authoritative for any section below.

Write one file per feature. Name it `interaction-design.md` beside the
`01-product.md` file in `docs/plans/<feature-slug>/`.

---

# {Component or Feature Name}: Interaction Design Specification

**Version:** 1.0
**Date:** {Current Date}
**Author:** {Author or Team}
**Product document:** `01-product.md`

---

## 1. Overview

{Two or three paragraphs describing the interface, the problem it solves, and
the scope of this document.}

### 1.1 Core Design Principles

{List three to five principles. State each as a rule that decides a future
argument. Example: "Progressive disclosure. Show the overview first. Reveal
configuration on interaction."}

---

## 2. Information Architecture

### 2.1 Navigation Structure

```
{Application Name}
├── {Route 1}
│   └── {Sub-route}
├── {Route 2} (current)
└── {Route 3}
```

### 2.2 Data Model

{Name each entity and its relationship. List the fields the interface reads,
writes, or displays.}

### 2.3 Declared Defaults

Record the starting choice for every setting that has more than one possible
value. A default that nobody declared becomes a correction later. The theme
default is the clearest case: a mockup rendered in dark mode does not make dark
mode the default.

| Setting | Default value | Alternatives | Declared where |
|---------|---------------|--------------|----------------|
| {Theme} | {Light} | {Dark, system} | {tokens.css} |
| {Panel state} | {Collapsed} | {Expanded} | {component} |
| {Scope} | {Default} | {Client-specific} | {store} |

---

## 3. States

### 3.1 Screen States

List every state of the whole screen, not only the happy path.

| State | Trigger | What the person sees |
|-------|---------|----------------------|
| Loading | {Initial data fetch} | {Skeleton} |
| Empty | {No data exists} | {Empty message plus action} |
| Populated | {Data loaded} | {Content} |
| Error | {Request failed} | {Error message plus retry} |

### 3.2 Component States

Use one table per interactive component. Cover every state in the vocabulary
below, and mark any state that does not apply as "not applicable" with a reason.

Vocabulary: `default`, `hover`, `focus-visible`, `pressed`, `selected`,
`disabled`, `loading`, `error`, `empty`, `transient`.

Two columns carry most of the failures.

- **Initial** marks the state the component renders in first. Exactly one row
  per component carries it.
- **Timer arming** names the event that starts any countdown, and names the
  event that resets it. Do not arm a timer on mount when the countdown should
  start on a person's action. A timer armed on mount expires while the person is
  still waiting for the screen to appear, and the component then reads as broken
  even though it started in the correct state.

#### {Component Name}

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | {Description} | Yes | {Not applicable} |
| Hover | {Description} | No | {Not applicable} |
| Focus-visible | {Ring, offset} | No | {Not applicable} |
| Pressed | {Description} | No | {Held while pointer is down} |
| Selected | {Description} | No | {Not applicable} |
| Disabled | {Opacity, cursor} | No | {Not applicable} |
| Loading | {Description} | No | {Starts on request, ends on settle} |
| Error | {Description, recovery action} | No | {Not applicable} |
| Empty | {Description} | No | {Not applicable} |
| Transient | {Description} | No | {Starts on action, resets after {n} ms} |

### 3.3 Visibility Gating

State what must be true before a control exists at all. Gating is not the same
as disabling. A disabled control is visible and inert. A gated control is absent.
Decide which one each control needs, because a mockup shows only one of them.

| Control | Renders when | Removed when |
|---------|--------------|--------------|
| {Invite} | {The person has joined a room} | {The person leaves} |
| {Retry} | {The last request failed} | {A request starts} |

---

## 4. Transitions

### 4.1 Transition Table

Record one row per edge of the state machine. A transition has a trigger, a
source state, a target state, a duration, and a reset condition. An animation
table without source and target states cannot be implemented or tested.

Name a timing token in the duration column. Do not write a literal duration.

| Trigger | From | To | Duration | Easing | Guard or reset |
|---------|------|----|----------|--------|----------------|
| {Shape selected} | Hidden | Expanded | `--motion-panel` | ease-out | {Never auto-closes while selected} |
| {Pointer leaves, idle 5 s} | Expanded | Dimmed | `--motion-dim` | ease-in-out | {Pointer re-entry restores expanded} |
| {Pointer enters} | Dimmed | Expanded | `--motion-panel` | ease-out | {Rearms the idle timer} |

### 4.2 Timing Tokens

Declare every duration and easing once, in this table. Implementation reads from
here. A duration invented at implementation time cannot be reviewed.

| Token | Value | Used for |
|-------|-------|----------|
| `--motion-panel` | {180 ms} | {Panel open, close, resize} |
| `--motion-dim` | {400 ms} | {Idle dim, restore} |
| `--motion-press` | {90 ms} | {Press down, press release} |
| `--hold-status` | {600 ms} | {Minimum dwell for a transient status} |
| `--hold-ack` | {1800 ms} | {Minimum dwell for a copy or save acknowledgement} |

---

## 5. Interaction Flows

Write one subsection per flow. State the entry condition, the ordered steps, and
the edge cases. Cover these flows when they apply:

- Creating an item, editing it, deleting it, and confirming the delete
- Filtering, searching, sorting, and selecting
- Saving, publishing, and recovering from a save failure
- Opening and closing a modal, drawer, panel, or popover
- Submitting a form, including validation failure
- Navigating between views, and returning

### 5.1 {Interaction Name}

**User goal:** {What the person is trying to finish}

**Entry condition:** {What must be true before this flow can start}

**Flow:**

1. {Person does X}
2. {System responds with Y}
3. {Person does Z}
4. {Flow ends in state W}

**Edge cases:**

- If {condition}, then {behaviour}.
- If {condition}, then {behaviour}.

---

## 6. Component Specifications

### 6.1 {Component Name}

**Dimensions:** {Width by height, or the responsive rule}
**Position:** {Where it appears, and what it anchors to}

**Layout:**

```
┌─────────────────────────────────────┐
│ {Header area}                       │
├─────────────────────────────────────┤
│ {Content area}                      │
├─────────────────────────────────────┤
│ {Action area}                       │
└─────────────────────────────────────┘
```

**Behaviour:**

- {How it appears and disappears}
- {How it responds to pointer input}
- {Keyboard interaction}

---

## 7. Error States and Edge Cases

### 7.1 {Case Name}

**Scenario:** {What happened}

**Handling:** {What the system does, what the person sees, and how to recover}

### 7.2 Cases to Check

Check each case, and record the ones that apply:

- No data, partial data, and more data than the layout holds
- Network failure, timeout, and offline
- Validation failure and conflicting input
- Concurrent editing by two people
- Permission denied, and a resource deleted while open
- Circular references and duplicate detection
- Maximum limits reached

---

## 8. Accessibility

### 8.1 Keyboard Navigation

{Tab order, arrow keys, Enter and Space, Escape. Name what receives focus.}

### 8.2 Screen Reader Support

{Landmarks, labels, and live regions. Name each announcement.}

### 8.3 Colour Independence

{How the interface conveys each signal without colour. Name the icon, shape, or
text that carries the same meaning.}

### 8.4 Focus Management

{Where focus moves on open, where it returns on close, and which containers trap
focus.}

---

## 9. Responsive Considerations

### 9.1 Desktop (over 1200 px)

{Full layout, columns, and the hover interactions that exist here only.}

### 9.2 Tablet (768 px to 1200 px)

{Adapted layout, column changes, and touch target sizes.}

### 9.3 Mobile (under 768 px)

{Layout, hidden elements, gestures, and the minimum touch target of 44 by 44 px.}

---

## 10. Animation Specifications

Record animation that is not a state transition: entrance, exit, skeleton pulse,
and load. Record every state change in Section 4.1 instead, and do not repeat it
here.

| Animation | Where | Duration | Easing |
|-----------|-------|----------|--------|
| Entrance | {Panel on first mount} | `--motion-panel` | ease-out |
| Skeleton pulse | {Loading placeholder} | {1500 ms} | ease-in-out |

**Animation principles:** Keep a state change under 300 ms. Use ease-out to
enter and ease-in to exit. Suppress motion when the person sets a reduced-motion
preference.

---

## 11. Layering, Hit Targets, and Scroll Ownership

These three contracts cross component boundaries. A component-level description
cannot state them, which is why two overlapping panels and one nested scroller
reliably survive review.

### 11.1 Layering

Declare one named scale. Every floating surface names a layer from this table.
For each pair of surfaces that can meet, state the collision rule.

| Layer | Token | Surfaces | Collision rule |
|-------|-------|----------|----------------|
| Chrome | `--z-chrome` | {App bar, tool rail} | {Yields to any panel} |
| Panel | `--z-panel` | {Agent panel, style panel} | {Panels never overlap. The second one repositions.} |
| Overlay | `--z-overlay` | {Dialog, popover, toast} | {Above all panels. Dims the surface below.} |

### 11.2 Hit Targets

Name the element that must receive the pointer event for every control. State
the clickable bounds, because a control drawn as one pill is often implemented as
one small handler on an inner icon.

Any ancestor can set `pointer-events: none`. A control that inherits that value
is invisible to a real pointer while remaining visible on screen, and a
synthetic `.click()` still fires its handler. Record the ancestor that provides
the containing layout, and confirm the control restores `pointer-events: auto`.

| Control | Element that receives the event | Clickable bounds | Ancestor pointer-events |
|---------|--------------------------------|------------------|-------------------------|
| {Capsule chip} | {The whole pill} | {Entire pill, not the arrow} | {Containing chrome sets none. The pill restores auto.} |

### 11.3 Scroll Ownership

For each region where two surfaces overlap, name the surface that owns the wheel
and the drag gesture. State what the other surface does with the same gesture.

| Region | Owns the wheel and drag | Other surface |
|--------|------------------------|---------------|
| {Agent panel over the canvas} | {The agent panel} | {The canvas does not pan or zoom} |
| {Message list inside the panel} | {The message list} | {The panel does not scroll} |

A container set to `overflow: hidden` becomes a scroll container and swallows
the gesture. Use `overflow: clip` to clip a corner without claiming the gesture.

---

## 12. Future Considerations

{List improvements that are out of scope now, with the reason to revisit each.}

1. **{Feature}:** {Description and rationale}
2. **{Feature}:** {Description and rationale}

---

## Document Validation Checklist

Confirm each item before presenting this document for approval.

- [ ] Every interactive component has a state table in Section 3.2.
- [ ] Every component marks exactly one initial state.
- [ ] Every timer names its arming event and its reset event.
- [ ] Every control with a conditional existence appears in Section 3.3.
- [ ] Every multi-valued setting appears in Section 2.3 with a default.
- [ ] Every state change appears in Section 4.1 with a source and target state.
- [ ] Every duration in Section 4.1 names a token from Section 4.2.
- [ ] Every flow names its entry condition and its edge cases.
- [ ] Every floating surface names a layer from Section 11.1.
- [ ] Every control names its hit target element and its clickable bounds.
- [ ] Every overlapping region names the surface that owns the gesture.
- [ ] No section depends on the mockup for an answer.
