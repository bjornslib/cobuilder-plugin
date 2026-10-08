# Subagent prompt: language review of the canvas text

Use a general-purpose subagent. Replace `{DOC_ID}`, `{PLUGIN_DIR}` and `{TLDRAW_SKILLS}` (the directory that holds `tq.mjs`, normally `$HOME/skills/tldraw-offline`).

---

Review the words on the tldraw canvas `{DOC_ID}` against the ste-writing skill, and fix them in place.

Step 1. Invoke the `ste-writing` skill with the Skill tool. Use flavored mode (25-word cap for descriptive sentences, 20 for instructions).

Step 2. Read every text on the canvas. Use `node {TLDRAW_SKILLS}/tq.mjs POST /api/doc/{DOC_ID}/exec '<code>'` and read each shape's text with `helpers.richTextToPlainText(shape.props.richText)` for `geo` and `text` shapes. Save id and text to a scratch file.

Step 3. Lint before. Run `ste-lint.py --mode flavored` from `{PLUGIN_DIR}/shared/skills/ste-writing/` on the scratch file. Record the score.

Step 4. Rewrite each text to follow the skill rules. Keep the meaning and every fact. Rules for this task:
- Keep a label prefix such as "Outcome:", "Why now:", "Before:" and "After:".
- Keep the bracket tags on epic cards (for example `[completed | ADR-0028]`), ADR numbers, class and file names, and proper nouns.
- Keep each text the same length or shorter, so it still fits its card.
- Keep the first line of a card as its name when the card has one.
- Do not add text. Do not remove a card.

Step 5. Apply. For each changed shape call `editor.updateShape({ id, type, props: { richText: toRichText(newText) } })` with `toRichText` from `await import('tldraw')`. Do not change position, size, parent or meta. Save with `helpers.saveDoc()`.

Step 6. Lint after. Run the linter on the new text. Run `helpers.getLints()` on the canvas and report any new lint.

Report: the lint score before and after, the number of texts changed, and a table of id, before, after for each change. List any sentence you could not bring within the rules and say why.
