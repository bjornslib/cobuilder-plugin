# Rubric: Slice 17 — the account mark, and the jump across

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E7
Slice goal: Every section of both accounts carries its account's mark, a word and a glyph with no fill, and a press moves a reader from one account's section to the other account's same-named section
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`. Use one work item whose own epics carry a merged pull
request: `plugin-split`.

## Criteria

### C1 — The account mark separates the two accounts [CRITICAL]
**Must be true:** Every section of both accounts states which account a reader is reading. The mark is a word and a glyph, and nothing else. It carries no fill of its own, so a reader tells the two accounts apart by the word and the glyph alone.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open one section of each account. Read the mark on each one. The two marks carry different words, and each carries a glyph.
- Read the two words and the two glyphs against the model: `Program` stands by a person, and `Change` stands by a pull request.
- Read the computed background of the mark, and of the frame around it. Neither is a fill the mark introduces.
- Open a second section of each account. The mark follows the account, and not the section.
**Scoring:**
- 1.0 — every section carries its account's word and glyph, and neither mark carries a fill.
- 0.5 — the mark renders on some sections only, or it carries a fill.
- 0.0 — the mark is absent, so a reader cannot tell the two accounts apart.

### C2 — The same-section jump crosses between the accounts [CRITICAL]
**Must be true:** A reader on one of the three shared section names moves to the other account's section of that same name in one press. A reader on the program's Intent section lands on the change's Intent section, and the reverse holds.
**Evidence to check:**
- With the ChromeDevTools MCP tools, start on the program's Intent section and press the jump. Read the section that renders, the strip's selected label, and the reader's address. The change's Intent section renders.
- Repeat from the change's Problem & Solution section, and from the program's Architecture section. Each crossing reaches the other account's section of that name.
- Count the presses each crossing took. One press crosses.
**Scoring:**
- 1.0 — every crossing reaches the other account's same-named section in one press.
- 0.5 — a crossing reaches another section of the other account.
- 0.0 — no jump exists, or the jump lands on the other account's first section every time.

### C3 — A section only one account carries offers no jump
**Must be true:** Epics, Rubrics, and File Diffs carry no counterpart, so no jump renders on them. Each of the three states which account it belongs to, and a dead control never appears.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the Epics section, the Rubrics section, and the File Diffs section. None of the three offers a jump.
- Read each section's mark, and the lead it states. Each names its own account.
**Scoring:**
- 1.0 — no jump renders on the three sections that carry no counterpart.
- 0.5 — a jump renders on one of the three and opens nothing.
- 0.0 — a jump renders on one of the three and opens a section of the other account.

### C4 — The jump writes an address, and the mark follows that address
**Must be true:** A jump crosses to an address, so a reader can share the section they land on. The mark a reader sees follows the address, and not a state the last press left behind.
**Evidence to check:**
- With the ChromeDevTools MCP tools, press the jump and copy the address. Open the address in a second window. The same section renders, with the same mark.
- Open the counterpart address by hand, without a press in this window. The section renders, and its mark names the account the address carries.
- Read the console messages across the walk. None reports an error.
**Scoring:**
- 1.0 — the address carries the section and the account, and the mark follows the address with a clean console.
- 0.5 — the section renders and its mark names the other account.
- 0.0 — the address opens another section.

### C5 — The mark and the jump keep the shipped frame
**Must be true:** The mark and the jump add one line to a section. The strip, the pager, and the box keep their count, and the pane still reports no scroll.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read the strip's label count and the pager's reading against the box count, on one section of each account. The three agree on each.
- Measure the pane's `scrollHeight` against its `clientHeight` on both. The two agree.
**Scoring:**
- 1.0 — both sections keep the model, and the pane does not scroll.
- 0.5 — one section scrolls the pane.
- 0.0 — the mark or the jump reorders the strip, or it hides a section.

## Regression check
- All tests that passed before this slice must still pass, including every case in the test files under `plugins/artifact/viewer/src/shell/`.
- Files outside the slice scope must remain unchanged: `shared/`, the bundle's data files, and `plugins/artifact/scripts/`.
- Both accounts keep their own content. This slice adds a mark and a jump, and it removes no record.

## Out of scope — do not penalise
- The content of the change's account. Slice 15 owns it.
- The rail's two groups, and the change's own address. Slice 16 owns them.
- A jump from a section of one work item to another work item. No account carries one.
- The multi-pull-request mode and the merge-order path. They defer with E11 to E13.
