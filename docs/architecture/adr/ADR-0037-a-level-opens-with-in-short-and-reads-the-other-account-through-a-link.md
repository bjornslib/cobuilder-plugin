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
problem: "A level page spends its first screen on two bars: the branch, epic count, and supersedes line, and the account rule with its jump button. The level's own short summary, which every design and every pull request level already carries as `narration`, is shown on the pull request as an unlabelled paragraph and is not shown on the work item. The rail lists the same three level names under two groups, and the pull request group repeats them. Record-gap lines inside the Problem and Solution cards tell a reader about missing fields that only an author can fix."
decision: "A paged level opens with an In Short strip above the section tabs. It holds the level's `narration`, the design's for a work item and the pull request level's for a pull request, and a Listen control only where the bundle serves the level's audio. The branch and the supersedes mark move into the top bar, and the epic count leaves the page, because the rail's Epics row holds it. The account rule becomes one text link at the right edge of every section heading, \"Read in PR 12 ›\" or \"Read in the work item ›\". It opens the same level in the other account, on the section of the same name, or on the first section when the name has no match. The section name travels as view state and never enters the address. The rail has three groups. Levels holds Intent, Problem & Solution, and Architecture of the work item. Also holds Plan, Epics, and Rubrics. A Pull request group, named for the PR number, holds the pull request's Intent, Problem & Solution, Architecture, and File Diffs. Each row is a link, and the row at the reader's address is current. The Record-gap lines leave the viewer. `build_index.py` warns about the same missing record parts instead."
alternatives:
  - option: "Keep the account rule bar and add the strip below it"
    rejected_because: "The first screen would carry three bars before the content. The prototype showed the strip fits in the space the two bars free, so the page is no taller."
  - option: "A pill switch or a menu in the heading for the account"
    rejected_because: "A switch says the same page shows different data. The two accounts hold different sections. A menu is two clicks for a move that is one link. The engineer chose the plain link after comparing the three in the prototype."
  - option: "Let the strip expand to the long text (show more)"
    rejected_because: "The short and long texts are different texts, written for different readers. A truncation would cut one text in two. The strip and the sections are two layers of the same level."
  - option: "Show each level once, in the active account, with the pull request's File Diffs in the Also group"
    rejected_because: "Shipped first, and the engineer rejected it on 2026-10-13. The pull request had no row of its own, so a reader on the work item could reach it only through the heading link. A heading link moves between accounts. It does not replace a rail row."
consequences:
  - "A level without a narration shows no strip and no sentence about it."
  - "A missing audio file shows nothing. The old sentence about a missing WAV file is gone."
  - "Record gaps reach authors through the build's warnings, and no viewer surface states one."
  - "ADR-0029's account rule is superseded for the shell. Its two account names, its section-name jump rule, and a rail group for each account stand. The groups are named Levels, Also, and Pull request, and the Build group is split into Levels and Also."
  - "The pull request keeps its own rail rows, so the heading link is a shortcut to the same section and never the only way in."
  - "ADR-0028's rule that the section index is view state stands. The carried section name is one-shot view state, consumed when the destination level mounts."
forces:
  - "A reader needs the level's high-level view before its detail."
  - "The two accounts carry different sections under the same three level names."
  - "The first screen has a fixed height, and every bar above the content moves the content down."
  - "A fact only an author can fix does not belong in the reader's page."
history:
  - { state: tentative, date: 2026-10-07, note: "Drawn from the approved prototype (version 3) and the engineer's answers in the session. The engineer reads and decides this record in the pull request." }
  - { state: decided, date: 2026-10-08, by: bjornslib, note: "Approved after the five slices passed their blind rubrics and a real-browser check at desktop and phone width. The viewer built the strip in InShort.tsx, so the planned inShort.ts module does not exist." }
  - { state: decided, date: 2026-10-13, by: bjornslib, note: "Amended. The first cut listed each level once in the active account and dropped the pull request rows. The engineer asked for the pull request group back, with active rows. The rail now has Levels, Also, and Pull request groups." }
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
