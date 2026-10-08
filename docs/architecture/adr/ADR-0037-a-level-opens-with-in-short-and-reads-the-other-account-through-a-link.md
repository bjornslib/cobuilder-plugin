---
# --- doc-gardener required frontmatter ---
title: "ADR-0037 — A level opens with an In Short strip, and the other account is one link in the heading"
status: active
type: architecture
last_verified: 2026-10-08
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0037
source_pr: null
name: "A level opens with an In Short strip, and the other account is one link in the heading"
state: decided
groups: [viewer, navigation, interaction]
approved_by: bjornslib
problem: "A level page spends its first screen on two bars: the branch, epic count, and supersedes line, and the account rule with its jump button. The level's own short summary, which every design and every pull request level already carries as `narration`, is shown on the pull request as an unlabelled paragraph and is not shown on the work item. The rail lists the same three level names under two groups. Record-gap lines inside the Problem and Solution cards tell a reader about missing fields that only an author can fix."
decision: "A paged level opens with an In Short strip above the section tabs. It holds the level's `narration`, the design's for a work item and the pull request level's for a pull request, and a Listen control only where the bundle serves the level's audio. The branch and the supersedes mark move into the top bar, and the epic count leaves the page, because the rail's Epics row holds it. The account rule becomes one text link at the right edge of every section heading, \"Read in PR 12 ›\" or \"Read in the work item ›\". It opens the same level in the other account, on the section of the same name, or on the first section when the name has no match. The section name travels as view state and never enters the address. The rail lists Intent, Problem & Solution, and Architecture once, in the active account, and an Also group holds Plan, Epics, Rubrics (work) and File Diffs (pull request), each tagged. The Record-gap lines leave the viewer. `build_index.py` warns about the same missing record parts instead."
alternatives:
  - option: "Keep the account rule bar and add the strip below it"
    rejected_because: "The first screen would carry three bars before the content. The prototype showed the strip fits in the space the two bars free, so the page is no taller."
  - option: "A pill switch or a menu in the heading for the account"
    rejected_because: "A switch says the same page shows different data. The two accounts hold different sections. A menu is two clicks for a move that is one link. The engineer chose the plain link after comparing the three in the prototype."
  - option: "Let the strip expand to the long text (show more)"
    rejected_because: "The short and long texts are different texts, written for different readers. A truncation would cut one text in two. The strip and the sections are two layers of the same level."
  - option: "Keep the Build and Review rail groups"
    rejected_because: "Each repeats the same three names. The level rows read the account the reader is in, and the Also group holds the rows only one account has."
consequences:
  - "A level without a narration shows no strip and no sentence about it."
  - "A missing audio file shows nothing. The old sentence about a missing WAV file is gone."
  - "Record gaps reach authors through the build's warnings, and no viewer surface states one."
  - "ADR-0029's two rail groups and its account rule are superseded for the shell. Its two account names and its section-name jump rule stand."
  - "ADR-0028's rule that the section index is view state stands. The carried section name is one-shot view state, consumed when the destination level mounts."
forces:
  - "A reader needs the level's high-level view before its detail."
  - "The two accounts carry different sections under the same three level names."
  - "The first screen has a fixed height, and every bar above the content moves the content down."
  - "A fact only an author can fix does not belong in the reader's page."
history:
  - { state: tentative, date: 2026-10-07, note: "Drawn from the approved prototype (version 3) and the engineer's answers in the session. The engineer reads and decides this record in the pull request." }
  - { state: decided, date: 2026-10-08, by: bjornslib, note: "Approved after the five slices passed their blind rubrics and a real-browser check at desktop and phone width. The viewer built the strip in InShort.tsx, so the planned inShort.ts module does not exist." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/artifact/viewer/src/shell/App.tsx, plugins/artifact/viewer/src/shell/InShort.tsx, plugins/artifact/viewer/src/shell/TopBar.tsx, plugins/artifact/viewer/src/shell/Rail.tsx, plugins/artifact/viewer/src/shell/model.ts, plugins/artifact/viewer/src/shell/atoms.tsx, shared/build_index.py]
  rule: "A paged level opens with its own narration, and the other account is one heading link that carries the section name as view state."
delivers:
  capability: "A reader sees what a level is about before its detail, and moves between a design and its pull request in one press."
  benefit: "The first screen shows content, and a missing record part reaches the author who can fix it."
  beneficiary: [developer, reviewer]
---

# ADR-0037 — A level opens with an In Short strip, and the other account is one link in the heading

## Context

The viewer's level page holds the chrome of two accounts, ADR-0029's program and
change. Each account owns a rule bar, a top line, and a rail group. The
engineer reviewed the page against an approved prototype and decided that the
first screen should lead with a short summary, that the branch belongs in the
top bar, and that one link should move between the accounts.

## Decision

See the front matter. The approved prototype is
https://claude.ai/artifact/8vkqCoEjZfB5YpfiVcqbd6 (version 3). The plan is
`docs/plans/level-page-restructure/`.

## Consequences

The strip is not a collapsible control: the engineer chose the open form. A
work item shows no Listen control because designs have no served audio today.
