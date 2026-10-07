# Interaction design: Level page restructure

Feature: `level-page-restructure`. One screen changes: the level page of a work
item or a pull request. The approved prototype is the design:
https://claude.ai/artifact/8vkqCoEjZfB5YpfiVcqbd6 (version 3).

## 1. Vocabulary

| Word | Meaning |
|---|---|
| Level | Intent, Problem & Solution, or Architecture. The three levels both accounts carry. |
| Account | The work item (program account) or the pull request (change account). |
| In Short | The strip above the section tabs. It holds the level's `narration` and, when audio exists, a Listen control. |
| Section | One panel of a level. The tabs name them. |
| Account link | The text link in the section heading: "Read in PR 12 ›" or "Read in the work item ›". |
| Carry | The section name the account link hands to the destination level, so it can open the section of the same name. |

## 2. Information Architecture

Top to bottom: top bar, progress line, In Short strip, section tabs, section
panel (heading with the account link, then the content), pager. The left rail
lists levels once, then an "Also" group. The branch and the supersedes mark read
in the top bar. The epic count is not shown on the page: the rail's Epics row
holds it.

### 2.3 Declared Defaults

| State | Default |
|---|---|
| In Short | Open. Always shown on a level that has a narration. No collapse control. |
| Listen | Shown only when a served audio file exists for the level. Idle. |
| Account | The account of the address the reader arrived on. |
| Section | The first section, or the section named by a carry. |
| Branch | The work item's branch. With several branches, the first, and the title lists all. |

## 3. Controls

### 3.1 Inventory

| Control | Kind | Behaviour |
|---|---|---|
| Rail row (Levels) | Link | Opens the level in the active account. |
| Rail row (Also) | Link | Opens the row. A press on a row of the other account switches the account. Each row carries a small tag: "work" or "PR". |
| Section tab | Button | Shows one section. The In Short strip does not change. |
| Account link | Link | Moves to the same level in the other account, on the section of the same name. |
| Listen | Button | Plays and pauses the level's audio. A thin progress line runs under the strip. |
| Pager | Buttons | Previous and Next move one section. |

### 3.2 Component States

| Component | States |
|---|---|
| In Short | shown (has narration), absent (no narration: the strip is not drawn and no sentence about it is shown) |
| Listen | hidden (no served file), idle, playing, ended |
| Account link | drawn (the work item has a PR), absent (no PR: nothing is drawn) |
| Rail "Also" row | current, other, disabled (the record is absent) |

### 3.3 Visibility Gating

| Element | Visible when |
|---|---|
| In Short strip | The level is paged and has a narration |
| Listen | The bundle serves the level's audio file. A missing file shows nothing. |
| Account link | The work item has a pull request and the section name exists on both sides, or the level exists on both sides |
| Supersedes mark | The work item supersedes at least one design |
| Branch | The work item has at least one epic branch |

## 4. Motion

### 4.1 Transition Table

| Change | Motion |
|---|---|
| Section change | The existing slide of the section track |
| Account change | A route change. The existing level fade |
| Listen progress | A linear width change under the strip |

### 4.2 Timing Tokens

The existing tokens apply: the section track's slide and the level's fade. The
Listen progress line has no easing and no token. `prefers-reduced-motion` drops
the slide and the fade as today.

## 5. The keyboard contract

The arrow keys step the sections, as today. The account link and Listen are
ordinary focusable controls in the tab order. The rail's walk keeps its keys and
steps the new rows in reading order: the levels, then the "Also" rows.

## 11. Layout

### 11.2 Hit Targets

The account link and Listen are at least 32 px tall at every width. A rail row
keeps its current height.

### 11.3 Scroll Ownership

Unchanged: a paged level's pane does not scroll, and the section box owns the
scroll. The In Short strip and the tabs stay in view above the box. A narration
of up to three sentences wraps within the strip's width and never scrolls.

## 12. Accessibility

The strip is a labelled region named "In Short". Listen has a pressed state and
an accessible name that states play or pause. The account link is a real link
with a real address. The rail rows keep their `aria-label` form and name the
account in words.
