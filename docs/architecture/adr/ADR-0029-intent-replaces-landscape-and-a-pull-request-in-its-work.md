---
# --- doc-gardener required frontmatter ---
title: "ADR-0029 — Intent replaces landscape, and a work's pull request is content in its own sections, with its own address"
status: active
type: architecture
last_verified: 2026-09-25
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0029
source_pr: null
name: "Intent replaces landscape, and a work's pull request is content in its own sections, with its own address"
state: decided
groups: [viewer, data-model]
approved_by: ""
problem: "The narration level named `landscape` is a second name for a thing this repository already calls Intent. The Work surface's own level is Intent. This repository's rule is one name for one thing, so one level carries two names. Two more matters arrived with it, from the engineer's reading of the Work surface. A pull request that one of a work's own epics carries opens as a page of its own, and its three panels render nothing. A reader therefore cannot tell what the program intended from what the change did, without holding two pages in mind. The narration level named `file_changes` also reads as not done well, and its fate stays open. This record decides the first two matters. It leaves the third open, and it leaves the board placement of a pull request that belongs to no program open too."
decision: "The narration level `landscape` becomes `intent`, as a real rename and not a display label. The level key reaches the audio filenames, so the rename touches six places: the level keys in `story.json` and a design's `narrative.json`, `LEVEL_KEYS` in `shared/verify_bundle.py`, the authoring level list in `plugins/pr/skills/odyssey/references/story-mode.md`, the viewer's level labels, and the audio files themselves. It runs with the parity work, never immediately, because the audio files are paid authored assets that must move and must not be re-recorded. A pull request that belongs to a work is not a second surface. Seven parts land inside the work's own Intent, Problem & Solution, and Architecture sections, beside what the program intended. They are its three narration levels with their art, audio, and diagrams, its intent block, its assessment, the decisions it landed, and the facts of the change itself. A later slice owns the layering that separates the two accounts. The pull request keeps an address of its own, and that address renders the same content rather than a second surface."
alternatives:
  - option: "Keep the level key `landscape` and show the word Intent in the viewer alone"
    rejected_because: "One name for one thing. A display label leaves the record, the audio filename, and the authoring guide calling the level landscape. The screen and the record then disagree, and the next session reads the record rather than the screen."
  - option: "Rename the key and re-record the narration audio in the same pass"
    rejected_because: "The audio is paid authored content. `data/audio/` holds one file per narrated level, and a file needs a new name rather than new words. A re-record spends Gemini calls to say the same narration again."
  - option: "Rename `landscape` immediately, in its own change"
    rejected_because: "The parity work touches the same level keys and the same viewer level list. Two changes over one key set means the second rewrites what the first landed. The rename travels with the parity work instead."
  - option: "Show a pull request that belongs to a work as a page of its own, at parity with the standalone case"
    rejected_because: "The work's own Intent, Problem & Solution, and Architecture levels already carry what the program intended. A second page makes a reader hold two pages in mind to answer one question."
  - option: "Add the change's content behind a fold inside each section"
    rejected_because: "ADR-0028 fixed the shape. A paged section carries no fold, and its panels render open. A fold inside a page is a fold inside a fold."
  - option: "Render the change inside its work and drop the pull request's own address"
    rejected_because: "A reviewer arrives from a pull request number, from a commit, or from a review thread. Each of those needs one URL for that pull request."
  - option: "Add the content with no mark between the program's intent and the change's act"
    rejected_because: "It makes two accounts read as one. A later slice owes that mark, and this record states the debt."
forces:
  - "CLAUDE.md's Vocabulary section states the rule: one name for one thing, and the same short word never names two different things. A narration level named `landscape` and a level named Intent are two names for one idea."
  - "Two different things are both called a level in this repo. A story bundle calls `landscape`, `problem_solution`, `architecture`, and `file_changes` its levels. The Work surface calls Intent, Problem & Solution, Architecture, Build, Pull requests, and Shipped its levels."
  - "The level key reaches an audio filename. `shared/verify_bundle.py` builds `data/audio/pr{N}_{level_key}.wav`, and the self-bundle carries `pr2_landscape.wav`."
  - "The audio is a paid, authored asset. `data/audio/` holds one file per narrated level, and the self-bundle holds three files for pull request 2, one each for `landscape`, `problem_solution`, and `architecture`. `file_changes` carries no voice script, and the key set is four."
  - "The viewer's level labels live in one list. `plugins/artifact/viewer/src/shell/readiness.ts` holds `{ key: landscape, label: Landscape }`."
  - "Two more readers of the same key each carry their own level list: `shared/migrate_bundle.py` and `plugins/pr/scripts/generate_prompts.py`."
  - "ADR-0028 fixed the shape the added content lands in. A level is a sequence of sections, one section on screen at a time, and a box owns the scroll rather than the pane."
  - "ADR-0027 places a single pull request on the FlightDeck surface and gives it three narration levels. This record does not build a second surface for it."
  - "A pull request already joins to a work item. `joins.epic_to_pull_request` resolves the join, and the shell reads it as `work.pullRequests` and `work.pullRequestVia`."
  - "The work's three levels take their names from `SECTION_TITLE`, and `pagedSections` in `plugins/artifact/viewer/src/shell/App.tsx` lays out their sections."
  - "The pull request's own detail already keys its three levels `intent`, `problem-and-solution`, and `architecture`, and renders nothing in them today. Each panel says the surface does not read a pull request's own story records yet."
  - "The bundle already carries the change's own facts. A timeline entry holds `size`, `touched`, `commit`, and `date`, and its `levels` hold the narration and the voice."
  - "The corpus grows. The self-bundle holds seventeen timeline entries, and a bundle can hold four narration levels per pull request."
related_decisions:
  - { type: depends-on, target: ADR-0028 }
  - { type: depends-on, target: ADR-0027 }
  - { type: is-related-to, target: ADR-0023 }
  - { type: is-related-to, target: ADR-0018 }
related_concerns: []
history:
  - { state: decided, date: 2026-09-24, by: bjornslib, note: "Decided while the engineer read the Work surface's prototype. The engineer directed three things: rename the narration level landscape to intent, add a pull request's own content into its work's Intent, Problem & Solution, and Architecture levels rather than showing a separate page, and keep a pull request's own URL. The engineer left the board placement, the fate of file_changes, and the standalone pull request's section list open. An agent wrote this record, so the state is decided and never approved." }
  - { state: decided, date: 2026-09-25, by: bjornslib, note: "Amended in place, because the model moved after the record landed and the engineer then read a prototype of the new shape. A work's pull request keeps its own space, so a reader jumps between the two accounts on the same section. The rail groups its rows as Build and Review, and the account mark carries a word and a glyph. The rename of landscape to intent, the change's own address, and the three open matters stand. The state stays decided, because an agent wrote this record and an agent does not approve its own record." }
  - { state: decided, date: 2026-09-25, by: bjornslib, note: "Amended in place again, after the parity work landed the rename. The viewer's level reader keeps `PRE_RENAME_LEVEL_KEY`, a table that maps `intent` to `landscape`. So a design record authored before the rename still reads as narrated rather than as an empty level. The validator offered two ways out: drop the table and rename the fixture data, or keep the table and record the decision here. The record takes the second way, because a committed bundle holds records written before the rename and the table protects them. The rename, the change's own address, and the three open matters stand. The state stays decided, because an agent wrote this record and an agent does not approve its own record." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/artifact/viewer/src, shared, plugins/pr]
  rule: "A work's pull request keeps its own address, `#/<work>/pull-requests/<pr>`, and renders as a space of its own, never as content inside the work's own levels. A reader reaches the program's account and the change's account by a jump on the same section. The narration level's only key becomes `intent` once the audio move lands."
delivers:
  capability: "A reader of a work reads the change's own account inside the work's Intent, Problem & Solution, and Architecture levels. One pull request still reaches an address of its own."
  benefit: "One word names one level, so a reader and a record agree. The record states the audio move before somebody performs the rename and meets that cost by surprise."
  beneficiary: [developer, reviewer]
  enables: ["A level's key can take a new name once the audio move lands with it", "The work's own levels can carry two accounts, once a later slice adds the mark between them"]
provenance: authored
related:
  - "docs/architecture/designs/cobuilder-viewer/goal.json"
  - "docs/architecture/designs/cobuilder-viewer/intent.json"
  - "docs/architecture/designs/cobuilder-viewer/open-questions.md"
  - "plugins/artifact/viewer/src/shell/sections.tsx"
  - "plugins/artifact/viewer/src/shell/readiness.ts"
---

# ADR-0029 — Intent replaces landscape, and a work's pull request is content in its own sections, with its own address

## Context

The Work surface renders one piece of work as a set of levels. Intent, Problem &
Solution, Architecture, Build, Pull requests, and Shipped are the levels. ADR-0028
made each level a sequence of sections, with one section on screen at a time.

A story bundle uses the word level for something else. A pull request's narration
carries four of them: `landscape`, `problem_solution`, `architecture`, and
`file_changes`. `shared/verify_bundle.py` holds those four keys in `LEVEL_KEYS`.
This record says **narration level** for the bundle's four, and **level** for the
Work surface's six.

Three matters came up together while the engineer read the Work surface's
prototype.

**One level carried two names.** The narration level named `landscape` and the
Work surface's level named Intent describe the same idea. The narration level's
authoring guide gives it a one-line hook and a mechanical summary of size and
touched directories. The Work surface's Intent level answers why the work exists.
A reader meets two names for one thing, and this repository's rule is one name for
one thing.

**A pull request opened a page of its own.** A pull request that one of a work's
own epics carries reached a page of its own, inside the Pull requests level. Its
three panels render nothing today, and each says the surface does not read a pull
request's own story records yet. So the page could not answer what the program
intended or what the change did. The work's own Intent, Problem & Solution, and
Architecture levels hold the program's account. The change's account sat one page
away.

**Two matters stayed open.** The engineer reads the narration level named
`file_changes` as not done well, and wants to remove it without having decided.
Where a pull request that belongs to no program sits on the Work board is also
open, and the engineer is still working through it.

## Options considered

1. **Keep the key `landscape` and show Intent on screen alone.** Rejected. A
   display label leaves the record, the audio filename, and the authoring guide
   calling the level landscape. The screen and the record then disagree.
2. **Rename the key and re-record the narration audio in the same pass.** Rejected.
   The audio is paid authored content. A file needs a new name rather than new
   words, so a re-record spends Gemini calls to say the same narration again.
3. **Rename `landscape` immediately, in its own change.** Rejected. The parity work
   touches the same level keys and the same viewer level list. Two changes over one
   key set means the second rewrites what the first landed.
4. **Show a pull request that belongs to a work as a page of its own.** Rejected.
   The work's own levels already carry what the program intended. A second page
   makes a reader hold two pages in mind to answer one question.
5. **Add the change's content behind a fold inside each section.** Rejected.
   ADR-0028 fixed the shape. A paged section carries no fold, and its panels render
   open. A fold inside a page is a fold inside a fold.
6. **Render the change inside its work and drop the pull request's own address.**
   Rejected. A reviewer arrives from a pull request number, a commit, or a review
   thread. Each of those needs one URL for that pull request.
7. **Add the content with no mark between the program's intent and the change's
   act.** Rejected. It makes two accounts read as one. A later slice owes that mark,
   and this record states the debt.
8. **Rename `landscape` to `intent`, add the change's content into the work's own
   levels, and keep the pull request's address as the same render.** Chosen.

## Decision

**One level, one name.** The narration level `landscape` becomes `intent`. The
rename is a real rename, not a display label. It runs with the parity work, and
never immediately.

**The rename reaches six places, and the audio is the sharp edge.** The level key
is part of the audio filename. `data/audio/pr{N}_{level_key}.wav` is the path, so
`data/audio/pr2_landscape.wav` in the self-bundle must become
`data/audio/pr2_intent.wav`. The six places are the level keys in `story.json` and
a design's `narrative.json`, `LEVEL_KEYS` in `shared/verify_bundle.py`, the
authoring level list in `plugins/pr/skills/odyssey/references/story-mode.md`, the
viewer's level labels in `plugins/artifact/viewer/src/shell/readiness.ts`, and the
audio files themselves. Two more readers carry their own copy of the same key
list, `shared/migrate_bundle.py` and `plugins/pr/scripts/generate_prompts.py`, so
each takes the new key too.

**The audio files are what make the rename more than an edit.** Every file is a
paid, authored asset. The rename must move each file to its new name in every
bundle, and it must not re-record one. A level holds a file only when its `voice`
field carries text, so one file exists per narrated level. The self-bundle holds
three files for pull request 2, one each for `landscape`, `problem_solution`, and
`architecture`, while the key set is four.

**A pull request that belongs to a work is not a second surface.** Its content
lands in the work's own Intent, Problem & Solution, and Architecture levels, beside
what the program intended. The addition carries seven parts:

- the three narration levels, with their scene art, their narration audio, and
  their diagrams;
- the change's intent block, the `intent` field a timeline entry carries, which
  Generate mode captured before the code existed;
- the change's assessment, the `assessment` field the same entry carries;
- the decisions the change landed, read from the entry's `adrs` list;
- the facts of the change itself, read from the entry's `size`, `touched`,
  `commit`, and `date` fields, and from its diff.

**The layering is a later slice's work.** A reader must be able to tell what the
program intended from what the change did. This record fixes the parts and not
their marks. The slice that builds the addition owns the mark, the order, and the
words that separate the two accounts.

**The pull request keeps an address of its own.** The address is the same render,
deep-linked, and never a second surface. The viewer carries the route already. The
Pull requests level opens one pull request at `#/<work>/pull-requests/<pr>`, and
the shell reads it as `focusPr`. That render becomes the added content, and the
address selects it. A reader who follows a pull request number lands on the
content a reader of the work's levels reads.

## Consequences

- **Positive:** one name covers one level. The record, the audio filename, the
  authoring guide, and the screen agree.
- **Positive:** a reader of a work reads the program's intent and the change's act
  on one surface.
- **Positive:** the pull request's address survives. A reviewer who arrives from a
  pull request number, a commit, or a thread reaches the same content.
- **Constraint introduced:** the narration level's only key is `intent`, and every
  reader of that key takes the new name. The audio filename follows the key, so a
  rename of the key is always a move of the file.
- **Constraint introduced:** a pull request that belongs to a work renders as
  content inside that work's levels. It never renders as a second surface with a
  layout of its own.
- **Negative:** the rename lands across six files and every bundle's audio
  directory, and a browser cannot do it. A bundle that carries audio needs the move
  on disk.
- **Negative:** two changes touch one key set. The parity work and the rename must
  land together, and a rename that lands first leaves the level list to be rewritten
  twice.
- **Negative:** the addition puts two accounts inside one level before the mark
  exists. Between the two slices, a reader cannot tell the program's intent from
  the change's act.

## Not decided

Three matters stay open. No later slice may read them as settled.

**The board and its navigation.** A pull request that belongs to no program has no
place on the board yet. Three shapes are open: a sibling row after the designs, a
child row under a design, or a filtered view of one board. The engineer said they
are still working through it.

**The fate of the narration level `file_changes`.** The engineer wants to remove
it, and reads the level as not done well today. No decision stands. One candidate
is cheap if it is chosen: drop `file_changes` as a narration level and keep the
diff as a view of its own. That shape needs no migration, because the viewer
renders whatever narration levels a bundle carries.

**What a standalone pull request shows, section by section.** The engineer asked
for a proposal and has not answered it yet. This record does not invent one.

## Value delivered

- **New capability:** a reader of a work reads the change's own account inside the
  work's Intent, Problem & Solution, and Architecture levels.
- **New capability:** one pull request reaches one address, and that address shows
  the content the work's levels carry.
- **Benefit:** the level named `landscape` no longer carries a second name for
  Intent. A reader and a record use one word for one thing. The record states the
  audio move before somebody performs the rename and meets that cost by surprise.
- **Beneficiary:** a developer reading a work item and its change, and a reviewer
  who arrives from a pull request number.

## Maps to

Context `cobuilder-packaging`. Modules `plugins/artifact/viewer/src`, `shared`, and
`plugins/pr`.

The rule this record establishes is the one the boundary record carries for the
viewer. The narration level's only key is `intent`, and the audio filename follows
that key. A pull request that belongs to a work renders as content inside that
work's own levels, and its own address renders that same content rather than a
second surface.

## Amendment, 2026-09-25

**This section states what moved, and it governs where the two disagree.** The
engineer chose a different shape after this record landed. A prototype now shows
that shape. The record above keeps its original text, so a reader sees both the
decision of 2026-09-24 and this amendment. The front matter's `decision` field
keeps that original wording too, and `maps_to.rule` carries the invariant that
survives, because a tool reads that field.

1. **A work's pull request keeps its own space.** The work item and its pull
   request are two spaces. A reader jumps between them on the same section:
   Build's Intent to Review's Intent, and back. That supersedes the part of the
   original decision that put the pull request's content inside the work's own
   Intent, Problem & Solution, and Architecture sections. The pull request's
   address, its intent block, its assessment, its decisions, and the facts of the
   change all keep a place of their own.

2. **The rail groups its rows in two parts.** Build holds the program's account,
   and it reads Intent, Problem & Solution, Architecture, Epics, and Rubrics.
   Review holds the change's account, and it reads Intent, Problem & Solution,
   Architecture, and File Diffs. Three section names appear in both groups, and
   that repetition makes the same-section jump possible. An earlier three-part
   grouping carried a third group, Deploy, and the engineer removed it on
   2026-09-25.

3. **The rail's fold and its arrow walk obey one convention.** The walk visits
   every row of both groups, open or closed. The group that holds the current row
   stays open, so the rail refuses a press that would close it. The control
   carries that reason in its own accessible name. The convention belongs to the
   rail, not to the prototype that showed it, so the shipped rail takes it too.

4. **The account mark is a word and a glyph, with no fill.** `Program` stands by a
   person, and `Change` stands by a pull request. An earlier proposal gave the mark
   a background fill as well, and the engineer removed it on 2026-09-25. A filled
   heading reads as something selected, and neither mark selects anything.

5. **The decisions a change landed come from the index's join.** Point 4 of the
   original decision reads the decisions "from the entry's `adrs` list". The parity
   slice reads them from `joins.adr_to_pull_request` instead, because that join is
   what `data/index.json` derives, and a second list on the entry can and does
   disagree with it. One source, so the change's account and the index cannot show
   two answers for one pull request. The entry's `adrs` list stays as the record
   `build_index.py` builds the join from, and no surface reads it directly.

6. **What stands unchanged.** The rename of the narration level `landscape` to
   `intent` stands, with its six places and with the audio move. That move ran
   with the parity work, and it re-recorded no paid file. The change's own
   address stands at `#/<work>/pull-requests/<pr>`, and a named section appends one
   segment in the shell's existing slot. The three matters that the original record
   leaves undecided stay undecided. Where a pull request that belongs to no program
   sits on the board stays open, and so does the fate of `file_changes`. What a
   standalone pull request shows, section by section, stays open too.

7. **A pre-rename record stays readable.** `plugins/artifact/viewer/src/shell/readiness.ts`
   holds `PRE_RENAME_LEVEL_KEY`, a table that maps the level's current key to the one it
   carried before the rename. The table holds one entry, `{ intent: "landscape" }`. A
   reader asks for the level's current key first and for the pre-rename key second. A
   design record authored before the rename therefore still reads as narrated, rather than
   as an empty level. The validator offered two ways out on 2026-09-25. The first way drops
   the table and renames the fixture data. The second way keeps the table and records the
   decision here. This record takes the second way, because a committed bundle holds
   records written before the rename, and the table protects them. Nothing writes the old
   key. The table is a read of an older record, and it is never a second name for the
   level. A later session may drop the read once no bundle in service predates the rename.

**The prototype is the evidence.** It sat at
`plugins/artifact/viewer/src/variations/flightdeck/` until 2026-10-08, when the
prototypes were removed from the viewer source. Git history holds it. The engineer
read it at `http://localhost:5273/variations/flightdeck/dev.html`. The prototype shows the
word Intent on the screen and reads the bundle's own `intent` key, because the
rename has landed and the bundle now writes that key. The prototype was evidence
for the shape before the rename; after it, the prototype reads the same key the
shipped shell reads, so the two cannot disagree about the level's name.
