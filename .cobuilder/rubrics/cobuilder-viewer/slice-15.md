# Rubric: Slice 15 — the change's account renders

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E7
Slice goal: A reader of a work item reads the change's Intent, Problem & Solution, Architecture, and File Diffs sections, each from that pull request's own records, at parity with today's viewer
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`.

Two work items in this bundle carry a change, and no pull request carries every part.
The epics of `plugin-split` reach pull request 11. It is merged, and it carries four
narration levels, three drawings, five decisions, and a diff. The epics of
`cobuilder-viewer` reach pull request 21. It is open, and it carries the intent block
and the assessment. Use each work item for the claims its own records answer. The
bundle holds scene art and narration audio for pull request 2 alone, and no epic
carries that pull request, so the surface states those two parts as absent.

## Criteria

### C1 — The change's four sections render that pull request's own records [CRITICAL]
**Must be true:** A reader of a work item whose own epics carry a pull request reads the change's Intent, Problem & Solution, Architecture, and File Diffs sections. Each section renders that pull request's own records, and no other pull request's.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the work item and walk the change's four sections. Take a snapshot at each one and read what it holds.
- Read `data/story.js` for that pull request, and the joins `data/index.json` carries for it. Each value a section shows is in the record that section names.
- Open a second work item whose own epics carry a different pull request. Its change's account shows that pull request's records.
**Scoring:**
- 1.0 — all four sections render that pull request's own records, and each matches the bundle.
- 0.5 — one section renders empty where the bundle carries its record.
- 0.0 — the change's account renders nothing, or it shows another pull request's records.

### C2 — The narration, the picture, the drawing, and the audio all resolve [CRITICAL]
**Must be true:** The change's narration renders, its scene art shows, its drawing draws, and its narration audio plays from the bundle. A part the bundle does not carry reads as an absent part.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read the network requests for pull request 11. Each asset the record names responds with a success status. The bundle holds no scene art and no narration audio for pull request 11, so the surface states both as absent.
- Compare the change's narration against the same pull request's narration in the shipped viewer. The two agree.
- Press play on one level and read the audio element's source. It resolves where the bundle holds a file, and the surface states the absence where it does not.
- Open a level the bundle holds no drawing for. The section states the absence and draws no empty frame.
**Scoring:**
- 1.0 — every asset the bundle holds resolves, the narration matches the shipped viewer, and each absent part is stated.
- 0.5 — one asset family fails to resolve, and the section states the gap.
- 0.0 — the art or the narration is missing with no statement.

### C3 — The change's own facts render [CRITICAL]
**Must be true:** The change's Intent section shows the intent block captured before the code existed. Its Problem & Solution section shows the assessment written against the merged diff, with its verdict. Its Architecture section names the decisions the change landed. Its File Diffs section renders the diff file by file.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read the four sections on `plugin-split`'s change, and read the Intent and Problem & Solution sections on `cobuilder-viewer`'s change.
- Read the timeline entry's `intent`, its `assessment`, its `adrs`, and its diff in the bundle. Each appears in the section that names it, on the work item whose epics carry that pull request.
- Compare the File Diffs section's file entries against the shipped viewer's own output for the same pull request. The two agree.
**Scoring:**
- 1.0 — all four render, each matches the bundle, and the diff matches the shipped viewer.
- 0.5 — one of the four is absent while the bundle carries it.
- 0.0 — two or more are absent, or the diff renders nothing.

### C4 — The change's account reads the index's joins, and derives none
**Must be true:** The decisions the change landed and the epics whose branch carries the pull request come from the record index's joins. The account derives no join of its own, so the account and the index cannot disagree.
**Evidence to check:**
- Read `data/index.json`'s `adr_to_pull_request` and `epic_to_pull_request` for that pull request. Each name a join carries appears in the change's account.
- Search the viewer source for a second derivation of either join. The search returns none.
**Scoring:**
- 1.0 — the account reads the index's joins, and no second derivation exists.
- 0.5 — the account reads the index and adds one local rule the index does not carry.
- 0.0 — the account derives the joins, so the index is no longer the one source.

### C5 — One name covers the change's first section
**Must be true:** ADR-0029 renames the narration level `landscape` to `intent`. Its amendment of 2026-09-25 keeps that rename with the parity work. The key reads `intent` in every place it appears. The audio file beside it carries that key. The audio file moves to its new name, and nobody records it again.
**Evidence to check:**
- Read `data/story.js`'s level keys. The first reads `intent`, and no key reads `landscape`.
- Read the audio directory the bundle carries. The first level's file reads `pr{N}_intent.wav`.
- Read `LEVEL_KEYS` in `shared/verify_bundle.py`, the level list in `plugins/artifact/viewer/src/shell/readiness.ts`, and the authoring level list in `plugins/pr/skills/odyssey/references/story-mode.md`. Each names `intent` once.
- Compare the moved audio file against the file the bundle carried before the move. The bytes agree, so nobody recorded the narration again.
**Scoring:**
- 1.0 — every reader of the key names `intent`, the audio file carries the new name, and the bytes agree.
- 0.5 — the key reads `intent` on screen, and the record or a filename still reads `landscape`.
- 0.0 — the rename is absent, or somebody recorded a paid file again.

### C6 — The change's account keeps the shipped section model
**Must be true:** The change's account renders through the same section model as the program's: one box on screen, the horizontal strip, and a fixed-height window whose pane does not scroll. The account introduces no second layout.
**Evidence to check:**
- With the ChromeDevTools MCP tools, measure the pane on each of the change's four sections. Its `scrollHeight` equals its `clientHeight`, and exactly one box sits inside the pane's rectangle.
- Read the strip's label count and the pager's reading against the box count. The three agree.
- Measure one section of the program's account the same way, and compare the two readings.
**Scoring:**
- 1.0 — both accounts keep the model on every section, and the pane does not scroll.
- 0.5 — one section scrolls the pane, or it shows two boxes.
- 0.0 — the change's account renders outside the section model.

## Regression check
- All tests that passed before this slice must still pass, including every case in the test files under `plugins/artifact/viewer/src/shell/`.
- Files outside the slice scope must remain unchanged: the program's account's own content, the bundle's other data files, and `plugins/artifact/scripts/`. C5 names its own files, and it is the one exception.
- This slice leaves a pull request's records in the bundle unchanged, except the level key and its audio filename, which C5 names. The account reads them and writes nothing else.

## Out of scope — do not penalise
- The rail's two groups, and the change's own address. Slice 16 owns them.
- The account mark, and the jump between the two accounts. Slice 17 owns it.
- The fate of the narration level named `file_changes`. ADR-0029 leaves it open, and the File Diffs section renders the diff rather than that level.
- The multi-pull-request mode and the merge-order path. They defer with E11 to E13.
- Publishing a pull request as an Artifact. It defers with E16.
- The diff's own rendering. The team ports it as it stands.
