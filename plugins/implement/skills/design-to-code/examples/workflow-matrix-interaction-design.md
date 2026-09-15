---
title: "Workflow Matrix Interaction Design Example"
type: example
status: active
last_verified: 2026-09-14
---

# AgenCheck Workflow Matrix: Interaction Design Specification

This file is a filled instance of `templates/interaction-design.md`. Read the
template first. Read this file for a worked answer to each section.

**Version:** 1.0
**Date:** 15 January 2026
**Author:** FAIE Labs
**Product document:** `01-product.md`

---

## 1. Overview

The Workflow Matrix is a configuration interface that lets AgenCheck customers
define automated retry and channel fallback rules for agent communications.
A person can create default workflows that apply globally, or override them with
client-specific rules for one end customer.

### 1.1 Core Design Principles

1. **Progressive disclosure.** Show the matrix overview first. Reveal
   configuration detail on interaction.
2. **Visual hierarchy.** Use colour coding to separate rule types at a glance.
3. **Fail-safe defaults.** Fall back to the default rule when a client-specific
   rule does not exist.
4. **Non-destructive editing.** Save locally, publish in one explicit action,
   and keep version history.

---

## 2. Information Architecture

### 2.1 Navigation Structure

```
VoiceAgent.ai (AgenCheck)
├── Workflow (current)
│   ├── Default Workflows
│   └── Client-Specific Workflows
├── Analytics
├── Team
└── Logs
```

### 2.2 Data Model

- **Workflow Scope**: Default or Client-Specific.
- **Client**: The chosen organisation, read when the scope is Client-Specific.
- **Rule Group**: A communication channel category, for example Phone Calls or
  SMS/WhatsApp.
- **Action**: One communication task placed on the timeline.
- **Action Configuration**: Retry count, retry interval, fallback channel.

### 2.3 Declared Defaults

| Setting | Default value | Alternatives | Declared where |
|---------|---------------|--------------|----------------|
| Workflow scope | Default | Client-Specific | Route state |
| Theme | Light | Dark, follow system | `tokens.css` |
| Max retries for a new action | 3 | 1 to 10 | Configure Action modal |
| Interval for a new action | 10 min | 5 min, 15 min, 30 min, 1 hour, 4 hours, 24 hours | Configure Action modal |
| Fallback channel for a new action | None | SMS Message, Email, WhatsApp | Configure Action modal |
| Timeline length | 4 days | 1 to 7 days | Matrix grid |
| Matrix scroll position | Rule Groups column pinned | Unpinned | Matrix grid |

The modal pre-fills every new action from this table. The theme default is Light
even though the January 2026 mockup was rendered in dark mode. The mockup is not
the default.

---

## 3. States

### 3.1 Screen States

| State | Trigger | What the person sees |
|-------|---------|----------------------|
| Loading | Route entered, rules not yet fetched | Grid skeleton, footer shows no version |
| Default mode | Initial load, or the Default toggle selected | Default toggle active by outline. No client selector. |
| Client-Specific mode | Client Specific toggle selected | Client Specific toggle active and filled blue. Client dropdown visible. |
| Empty matrix | No rules exist for the selected scope | Empty cells with "+" affordances only |
| Populated matrix | Rules exist for the selected scope | Coloured action cards in the matching cells |
| Draft | Unsaved changes present | Footer reads "RULE_SET: Vx.x (DRAFT)" and a green checkmark reads "All changes saved locally" |
| Published | All changes saved to the server | Footer reads "RULE_SET: Vx.x (PUBLISHED)" |
| Modal open | A person is configuring an action | Configure Action modal overlays the matrix. The background dims. |
| Save in flight | "Save Rules" clicked | The button holds a spinner and reads "Saving..." |
| Save failed | The save request rejected | A toast reads "Failed to save." The local draft survives. |

### 3.2 Component States

#### Workflow Scope Toggle

A mutually exclusive button group.

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default selected | Default button white with a grey border and black text. Client Specific button transparent with grey text. Client dropdown hidden. | Yes | Not applicable |
| Client Specific selected | Client Specific button filled #2563EB with white text. Default button transparent with grey text. Client dropdown visible. | No | Not applicable |
| Hover | Background lifts to grey-50 on the unselected button | No | Not applicable |
| Focus-visible | 2 px focus ring, 2 px offset | No | Not applicable |
| Pressed | Background darkens to grey-100 | No | Held while the pointer is down |
| Disabled | 50% opacity, cursor not-allowed | No | Not applicable |
| Loading | Both buttons disabled. A 12 px spinner replaces the toggle highlight. | No | Starts on scope change, ends when the rule fetch settles |
| Error | A red dot on the active button. A tooltip names the failed fetch. | No | Not applicable |
| Empty | Not applicable. The toggle always applies. | No | Not applicable |
| Transient | Not applicable | No | Not applicable |

#### Action Card

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | Solid card, coloured dot indicator in the top-right corner | Yes | Not applicable |
| Hover | Subtle elevation and a shadow. Cursor pointer. | No | Not applicable |
| Focus-visible | 2 px blue ring around the card | No | Not applicable |
| Pressed | Shadow drops to 1 px | No | Held while the pointer is down |
| Selected | Blue border highlight while the Configure Action modal is open | No | Not applicable |
| Dragging | Elevated with a drop shadow. A 50% opacity ghost holds the original position. | No | Starts 150 ms after pointer down. Cancels if the pointer lifts first. |
| Disabled | 40% opacity. Pointer events off. | No | Not applicable |
| Loading | The dot is replaced by a 12 px spinner | No | Not applicable |
| Error | Red ring. A tooltip names the validation fault. | No | Not applicable |
| Empty | The cell draws a light grey dashed border with a centred "+" | Yes, when the cell holds no action | Not applicable |
| Transient | Invalid drop shake, 300 ms | No | Starts on drop release. Clears on animation end. |

The card's dot colour carries a second meaning. Blue is primary. Orange is
fallback. Purple is multi-step. The shape carries the same meaning for
colour-blind readers: filled, half-filled, and dotted.

#### Configure Action Modal

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | 360 px panel, pointer arrow to the card, or centred for a new action | Yes | Not applicable |
| Hover | Not applicable on the panel body | No | Not applicable |
| Focus-visible | First control receives focus on open | No | Not applicable |
| Pressed | Not applicable on the panel body | No | Not applicable |
| Selected | Not applicable | No | Not applicable |
| Disabled | Fields lock while a rule write is in flight | No | Not applicable |
| Loading | "Update Rule" shows a spinner and locks | No | Not applicable |
| Error | A red field outline plus one sentence naming the fault | No | Not applicable |
| Empty | Retry count empty. The preview sentence reads "No retries configured." | No | Not applicable |
| Transient | Not applicable | No | Not applicable |

#### Auto-save Indicator

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | Green checkmark with "All changes saved locally" | Yes | Not applicable |
| Transient (saving) | Grey text reads "Saving..." | No | Starts 800 ms after the last edit. Each new edit resets it. |

The debounce arms on the last edit, not on page load. A timer armed on load would
expire before the person made a change, and the indicator would then claim a save
that never happened.

#### Toast

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | Hidden | Yes | Not applicable |
| Transient | Slides up and fades in, holds, then slides down | No | Starts on appear. Holds 1800 ms. A pointer over the toast pauses the hold. |
| Error | Red accent bar and a "Try again" action | No | Same hold. The hold does not start until the pointer leaves. |

#### Footer Status

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | "RULE_SET: Vx.x" plus the save indicator | Yes | Not applicable |
| Transient | A changed version string holds for 600 ms | No | Starts on change. A second change restarts the hold. |

The 600 ms hold exists because the version string changed and returned within one
frame. A person never saw it. The hold sets a floor on how long a status stays.

### 3.3 Visibility Gating

| Control | Renders when | Removed when |
|---------|--------------|--------------|
| Client dropdown | Scope is Client-Specific | Scope returns to Default |
| "+" affordance in a cell | The cell holds no action | An action is placed in the cell |
| "Delete" in the modal | The action already exists | A person opens the modal from a "+" |
| "View History" | The rule set has at least one published version | The rule set has never been published |
| "Save Rules" | The draft differs from the published version | The save settles |
| Unsaved-changes warning dialog | A scope switch is requested with a dirty draft | The person saves or discards |
| Yellow no-fallback warning | The action has a primary rule and no fallback | A fallback is set |

Gating is not disabling. "View History" is absent before the first publish. It is
not drawn greyed out. The mockup drew it at all times, which was wrong.

---

## 4. Transitions

### 4.1 Transition Table

| Trigger | From | To | Duration | Easing | Guard or reset |
|---------|------|----|----------|--------|----------------|
| Click the other scope button | Default selected | Client Specific selected | `--motion-toggle` | ease-in-out | Client dropdown opens when no client is chosen |
| Click the other scope button | Default selected | Warning dialog | `--motion-modal-in` | ease-out | Guard: the draft is dirty. Otherwise the scope changes at once. |
| Click a client row | Client dropdown open | Client dropdown closed | `--motion-dropdown` | ease-in | The matrix reloads for that client |
| Click "+" in an empty cell | Empty cell | Modal open | `--motion-modal-in` | ease-out | Fields pre-fill from Section 2.3 |
| Click an action card | Idle | Modal open | `--motion-modal-in` | ease-out | Fields pre-fill from the action |
| Escape, or click outside | Modal open | Idle | `--motion-modal-out` | ease-in | Discards without a warning |
| Pointer down on a card | Idle | Dragging | `--motion-drag` | ease-out | Guard: the pointer stays down for 150 ms. A lift before 150 ms cancels. |
| Drop on an occupied cell | Dragging | Transient (invalid) | `--motion-reject` | ease-out | Returns the card to its origin, then clears |
| Drop on an empty cell | Dragging | Idle | `--motion-drop` | ease-out | Commits the move and marks the draft dirty |
| First keystroke after an edit | Idle | Transient (saving) | `--motion-fade` | ease-in-out | Rearms 800 ms after each further edit |
| Debounce expires | Transient (saving) | Default | `--motion-fade` | ease-in-out | Writes the draft to local storage |
| Click "Save Rules" | Draft | Save in flight | `--motion-press` | ease-out | Locks the scope toggle and the matrix |
| Save resolves | Save in flight | Published | `--motion-fade` | ease-out | Increments the version and fires the toast |
| Save rejects | Save in flight | Save failed | `--motion-fade` | ease-out | Keeps the local draft. Fires an error toast. |
| Version string changes | Default | Transient | `--motion-fade` | ease-in-out | Holds `--hold-status`, then returns |

### 4.2 Timing Tokens

| Token | Value | Used for |
|-------|-------|----------|
| `--motion-press` | 100 ms | Press down and press release |
| `--motion-modal-in` | 150 ms | Modal open, dropdown open |
| `--motion-modal-out` | 100 ms | Modal close |
| `--motion-toggle` | 150 ms | Scope toggle highlight slide |
| `--motion-dropdown` | 120 ms | Client dropdown open and close |
| `--motion-drag` | 100 ms | Card elevation on drag start |
| `--motion-drop` | 200 ms | Card travel to a valid cell |
| `--motion-reject` | 300 ms | Card return and shake on an invalid drop |
| `--motion-fade` | 200 ms | Toast, indicator, and footer fades |
| `--motion-toast-out` | 150 ms | Toast dismiss |
| `--motion-skeleton` | 1500 ms | Loading pulse |
| `--hold-drag` | 150 ms | Drag activation delay |
| `--hold-status` | 600 ms | Minimum dwell for a footer status change |
| `--hold-toast` | 1800 ms | Toast and acknowledgement dwell |

---

## 5. Interaction Flows

### 5.1 Switching Workflow Scope

**User goal:** View or edit default workflows against client-specific workflows.

**Entry condition:** The Workflow route is loaded.

**Flow:**

1. The person clicks the Default button or the Client Specific button.
2. If the switch is to Client Specific and no client is chosen, the client
   dropdown auto-opens and the matrix shows an empty state reading "Select a
   client to view their workflow rules".
3. If the switch is to Default, the client dropdown hides and the matrix loads
   the default rules.
4. If the switch is to Client Specific and a client is already chosen, the matrix
   loads that client's rules.
5. The footer updates to match.

**Edge cases:**

- If the client has no rules of its own, show the inherited default rules with a
  visual distinction and a tooltip reading "Inherited from Default".
- If the draft is dirty, raise the warning dialog "You have unsaved changes. Save
  before switching?".

### 5.2 Selecting a Client

**User goal:** Choose which client's workflow to configure.

**Entry condition:** Scope is Client-Specific.

**Flow:**

1. The person clicks the client dropdown.
2. The dropdown expands with a searchable list.
3. The person types to filter, or scrolls.
4. The person clicks a client name.
5. The dropdown closes and the matrix updates.
6. The footer shows "CLIENT_ID: [ID]".

**Dropdown contents:** a search input at the top; a scrollable client list; one
row per client with an icon, a name, and an optional "Has custom rules" badge;
recent clients at the top above a divider.

### 5.3 Creating a New Action

**User goal:** Add a communication action to the workflow.

**Entry condition:** A cell in the matrix holds no action.

**Flow:**

1. The person clicks "+" in an empty cell.
2. The Configure Action modal opens with the defaults from Section 2.3.
3. The person adjusts the controls.
4. The person clicks "Add Rule".
5. The modal closes and the card appears in the cell.
6. The footer shows DRAFT.

**Edge cases:**

- If the person drags an existing card into a new cell, the system copies it
  instead of creating an empty action.
- If the person right-clicks a cell, the context menu offers "Add Action" and
  "Paste Action".

### 5.4 Configuring an Existing Action

**User goal:** Edit retries, interval, or fallback channel for an existing action.

**Entry condition:** The cell holds an action.

**Flow:**

1. The person clicks the action card.
2. The modal opens with the current values.
3. The person changes Max Retries by typing or by the +/- buttons, from 1 to 10.
4. The person chooses an Interval: 5 min, 10 min, 15 min, 30 min, 1 hour,
   4 hours, or 24 hours.
5. The person chooses a Fallback Channel: SMS Message, Email, WhatsApp, or None.
6. The person clicks "Update Rule".
7. The modal closes and the card updates.
8. If a fallback is set, an orange indicator appears.

**Edge cases:**

- The modal holds a live preview sentence, for example "If all 3 retries fail,
  the system will switch to SMS channel automatically." It updates on each
  change.
- If the chosen fallback would close a loop, the option is disabled with the
  tooltip "Cannot select: would create circular fallback".

### 5.5 Deleting an Action

**User goal:** Remove an action from the workflow.

**Flow:**

1. The person opens the card in the modal.
2. The person clicks "Delete", a red text button at the bottom left.
3. A confirmation dialog reads "Delete this action? This will remove [Action
   Name] from [Rule Group]. This cannot be undone.".
4. The person confirms.
5. The modal closes and the card leaves the matrix.

**Edge cases:**

- If the scope is Client-Specific and a default action sits underneath, the cell
  then shows the inherited action with a dashed style.
- A person can also select the card and press Delete or Backspace, or use the
  right-click menu.

### 5.6 Moving an Action Between Days

**User goal:** Move an action to a different day on the timeline.

**Entry condition:** The action card is visible and not locked by a save.

**Flow:**

1. The person presses the pointer down on the card and holds.
2. After `--hold-drag`, drag mode starts. The card elevates. A 50% opacity ghost
   holds the origin. Valid targets take a blue dashed border.
3. The person moves the card to a new cell.
4. The person releases. A valid cell accepts the card. An invalid cell returns it
   with a shake.
5. The matrix marks itself dirty.

**Edge cases:**

- An action can move only within its own Rule Group row.
- An occupied cell rejects the drop. The person deletes the occupant first.

### 5.7 Saving Changes

**User goal:** Persist the workflow configuration.

**Flow:**

1. The person makes a change.
2. After `--hold-status` past the last edit, the draft writes to local storage and
   the footer shows a green checkmark with "All changes saved locally".
3. The person clicks "Save Rules", a blue button at the top right.
4. The button shows a spinner and reads "Saving...".
5. On success, a toast reads "Workflow rules saved successfully".
6. The footer shows "RULE_SET: V3.2 (PUBLISHED)".

**Edge cases:**

- If the network fails, the toast reads "Failed to save. Your changes are
  preserved locally. Try again?". The draft survives.
- If validation fails, a modal names the faults, for example "Phone Calls cannot
  have SMS as fallback when SMS rule is inactive".

### 5.8 Viewing History

**User goal:** See earlier versions of the configuration.

**Entry condition:** At least one version has been published.

**Flow:**

1. The person clicks "View History", a secondary button at the top right.
2. A side panel slides in from the right with a version list: number, timestamp,
   author, and change summary.
3. The person clicks a version to preview it.
4. The matrix dims and an overlay shows that version, read only.
5. The person clicks "Restore This Version" or "Close".
6. A restore raises a confirmation dialog, then applies the version as a new
   draft.

---

## 6. Component Specifications

### 6.1 Configure Action Modal

**Dimensions:** 360 px wide, auto height.
**Position:** Anchored to the chosen card with a pointer arrow. Centred for a new
action.

**Layout:**

```
┌─────────────────────────────────────┐
│ Configure Action                  ✕ │
├─────────────────────────────────────┤
│ MAX RETRIES              INTERVAL   │
│ [−] [3] [+]              [10 min ▼] │
│                                     │
│ FALLBACK CHANNEL                    │
│ [SMS Message                     ▼] │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ If all 3 retries fail, the      │ │
│ │ system will switch to SMS       │ │
│ │ channel automatically.          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Delete]              [Update Rule] │
└─────────────────────────────────────┘
```

**Behaviour:**

- Opens on a card click or a "+" click.
- Closes on the ✕ click, Escape, "Update Rule", "Add Rule", or a click outside.
- Closes without a warning when the draft is dirty. A warning is worth adding.
- Traps focus while open. The first control takes focus on open. Focus returns to
  the card on close.

### 6.2 Matrix Grid

**Columns:** Rule Groups at about 300 px, fixed. Immediate, Day 1, Day 2, Day 3,
and Day 4 at 120 px each.

**Rows:** A sticky header row plus Rule Group rows of at least 80 px.

**Cell states:**

- Empty: light grey dashed border with a centred "+".
- Populated: an action card with icon, title, subtitle, and status indicator.

### 6.3 Action Card

**Dimensions:** Fills the cell with 8 px padding.

**Contents:** a channel icon at the top left; a title, for example "Initial Call"
or "Email Request"; a subtitle, for example "1x → SMS" or "No retry"; a coloured
status dot at the top right.

**Variants:** Primary is blue. Fallback is orange. Multi-step is purple.

---

## 7. Error States and Edge Cases

### 7.1 Circular Fallback Prevention

**Scenario:** A person sets SMS as the fallback for Email, and Email is already
the fallback for SMS.

**Handling:** The fallback dropdown disables the circular option. The disabled
option carries the tooltip "Cannot select: would create circular fallback".

### 7.2 Empty Client Workflow

**Scenario:** A client has no rules of its own.

**Handling:** The matrix shows the inherited default rules with dashed borders at
60% opacity, and the tooltip "Inherited from Default. Click to customise for this
client.". The first customisation creates an override.

### 7.3 Default Rule Deletion Impact

**Scenario:** A person deletes a default rule that client rules inherit.

**Handling:** A warning dialog reads "This default rule is inherited by 3 clients.
Deleting it will affect: Acme Corp, Beta Ltd, Gamma Inc. Continue?". An option
reads "View affected clients".

### 7.4 Client Without a Fallback Rule

**Scenario:** A client holds a custom primary rule and no fallback.

**Handling:** A yellow indicator appears on the card with the tooltip "No
fallback configured. If this action fails, no retry will occur.". Saving is not
blocked, because no fallback can be intentional.

### 7.5 Cases to Check

Still open for this interface:

- A rule set longer than the timeline holds
- Two people editing the same client at once
- A client deleted while its rules are open
- A permission downgrade during a session
- A timeout during a publish, where the write may have landed

---

## 8. Accessibility

### 8.1 Keyboard Navigation

Tab moves through the scope toggle, the client dropdown, the matrix cells, and
the action buttons. Arrow keys move within the grid. Enter and Space open the
modal on a focused cell. Escape closes it.

### 8.2 Screen Reader Support

- The scope toggle announces "Workflow scope, button group, Default selected" or
  "Client Specific selected".
- The matrix announces "Workflow matrix, grid with 4 rule groups and 5 time
  columns".
- A card announces its full context, for example "Phone Calls, Day 1, Follow-up,
  3 retries, falls back to SMS".
- The footer version string is a live region with `aria-live="polite"`.
- A toast is a live region with `aria-live="assertive"`.

### 8.3 Colour Independence

Status indicators use colour plus shape: filled, outlined, or dotted. Error
states use an icon plus colour. Every interactive element carries a visible focus
ring.

### 8.4 Focus Management

Focus enters the modal at the first control. Focus returns to the source card on
close. The modal traps focus while open. The history side panel moves focus to
its heading on open and returns focus to "View History" on close.

---

## 9. Responsive Considerations

### 9.1 Desktop, over 1200 px

The full matrix is visible. Controls sit side by side. The Configure Action modal
positions against its card.

### 9.2 Tablet, 768 px to 1200 px

The matrix scrolls horizontally with the Rule Groups column pinned. The modal is
centred. Touch targets are at least 44 by 44 px.

### 9.3 Mobile, under 768 px

The matrix is not recommended. Show a read-only summary with a link reading "Edit
on desktop". Alternatively, collapse to a list view with expandable rule groups.

---

## 10. Animation Specifications

Animation that is not a state change. Every state change lives in Section 4.1.

| Animation | Where | Duration | Easing |
|-----------|-------|----------|--------|
| Skeleton pulse | Loading placeholder cells | `--motion-skeleton` | ease-in-out |
| Toast enter | Toast first mount | `--motion-fade` | ease-out |
| Toast exit | Toast dismissal | `--motion-toast-out` | ease-in |

**Animation principles:** Keep a state change under 300 ms. Use ease-out to enter
and ease-in to exit. Suppress motion when the person sets a reduced-motion
preference.

---

## 11. Layering, Hit Targets, and Scroll Ownership

### 11.1 Layering

| Layer | Token | Surfaces | Collision rule |
|-------|-------|----------|----------------|
| Base | `--z-base` | Matrix grid, footer | Yields to everything above |
| Sticky | `--z-sticky` | Grid header row, Rule Groups column | Sits above the grid, below the modal |
| Overlay | `--z-overlay` | Configure Action modal, confirmation dialog | Dims the surface below and traps focus |
| Drawer | `--z-drawer` | History side panel | Sits above the overlay |
| Toast | `--z-toast` | Notifications | Above all. Never covers the "Save Rules" button. |

The modal and the confirmation dialog never appear together. The dialog replaces
the modal inside the overlay layer.

### 11.2 Hit Targets

| Control | Element that receives the event | Clickable bounds | Ancestor pointer-events |
|---------|--------------------------------|------------------|-------------------------|
| Scope toggle button | The button element | The whole button, at least 44 px tall | None set |
| Action card | The card root | The whole card, not the status dot | None set |
| Card status dot | The card root | A click on the dot opens the card. The dot itself ignores the event. | None set |
| Client dropdown row | The row element | The whole row, including the icon and badge | None set |
| "+" affordance | The cell | The whole cell, not the glyph | None set |
| Toast "Try again" | The button element | The whole button | None set |
| Matrix cell padding | Not interactive | None. A click on the padding selects nothing. | None set |

Every control in this interface sits inside an ancestor that has no
`pointer-events` override. Check each ancestor when the chrome changes. A control
that inherits `pointer-events: none` stays visible and stops responding, and a
synthetic `.click()` in a test still passes.

### 11.3 Scroll Ownership

| Region | Owns the wheel and drag | Other surface |
|--------|------------------------|---------------|
| Version list inside the History panel | The version list | The panel body does not scroll |
| Client dropdown list | The dropdown list | The matrix behind it does not scroll or drag |
| Matrix body on tablet | The matrix, horizontally | The page does not scroll sideways |
| Configure Action modal | The modal body when it overflows | The matrix behind it is frozen |
| Preview overlay in the History panel | The overlay body | The matrix does not accept input |

Use `overflow: clip` where a corner needs clipping without a scroll container. A
container set to `overflow: hidden` claims the wheel gesture and swallows it.

---

## 12. Future Considerations

1. **Bulk actions.** Select several actions and configure them together.
2. **Templates.** Save a configuration as a template for fast client setup.
3. **A/B testing.** Compare retry strategies across client segments.
4. **Analytics.** Show success rates per action inside the matrix.
5. **Conditional logic.** Support rules such as "outside business hours, use SMS
   instead of a call".
6. **Timeline extensions.** Allow a timeline longer than 4 days.

---

## Document Validation Checklist

- [x] Every interactive component has a state table in Section 3.2.
- [x] Every component marks exactly one initial state.
- [x] Every timer names its arming event and its reset event.
- [x] Every control with a conditional existence appears in Section 3.3.
- [x] Every multi-valued setting appears in Section 2.3 with a default.
- [x] Every state change appears in Section 4.1 with a source and target state.
- [x] Every duration in Section 4.1 names a token from Section 4.2.
- [x] Every flow names its entry condition and its edge cases.
- [x] Every floating surface names a layer from Section 11.1.
- [x] Every control names its hit target element and its clickable bounds.
- [x] Every overlapping region names the surface that owns the gesture.
- [x] No section depends on the mockup for an answer.
