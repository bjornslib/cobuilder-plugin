# Subagent prompt: draw a design canvas

Pass this text to the `tldraw-offline` subagent. Replace the four placeholders: `{DESIGN_DIR}`, `{DRAW_JS_PATH}`, `{TARGET}` and `{PLUGIN_DIR}`. Use absolute paths.

---

Draw the design `{DESIGN_DIR}` on a tldraw canvas.

Target: {TARGET}
- If it says "new": create the document with POST /api/docs/create. Name it after the design. Use `{DESIGN_DIR}` as the directory.
- If the create call times out with "Invoke timed out", the file exists on disk. Do not call create again (it returns 409). Open the file with the macOS `open` command and wait up to 20 seconds. Find it with `api.getDocs({ name })`.
- If it names an existing file, find or open it the same way, then do step 0.
- Check that `/exec` answers (`return editor.getCurrentPageShapes().length`). If it still says "Window has no transport" after 30 seconds, stop and report. Do not loop.

Step 0 (existing file only). Read `api.getShapes` and check the shapes are the five zone frames and what a previous run of this task drew. If they match, delete all shapes on the page. If they do not match, stop and report. Never clear a page you did not draw.

Step 1. Run `{DRAW_JS_PATH}` through `/exec` on the target document (send the file contents as the raw body). If it fails, fix only the failing call in a copy, rerun, and report what you changed. A failed `/exec` rolls back, so a rerun is safe. It creates the frames `zone-why`, `why-beforeafter` (inside `zone-why`), `zone-landscape`, `zone-flow`, `zone-structure` and `zone-contract`. It fills the outcome and why-now cards of `zone-why` and all of `zone-contract`. Do not edit those cards.

Step 1b. `draw.js` also adds a large heading above each zone. Keep those headings and do not add a second heading.

Step 2. Draw the before/after picture and fill the three diagram frames. Read `{PLUGIN_DIR}/skills/cobuilder-artifacts/references/canvas/example-fill.js` first. It is a worked example of this step for another design. Follow its structure (frame-local coordinates, a card helper, a bound-arrow helper). Do not copy its text. Use the diagrams in `{DESIGN_DIR}/diagrams/`.
- `why-beforeafter` (inside `zone-why`): the before/after picture. Left column "Before: the problem", right column "After: the solution", two cards each, arrows from each before card to its after card. Take the text from the Note lines of `level-2.mmd` ("The problem", "The solution"). If it has none, use the `problem` and `solution` fields from `build_canvas.py --format spec`. Mark what is new in violet.
- `zone-landscape` from `level-1.mmd`: 5 to 7 parts, grouped by boundary (for example Python service, Worker, browser), named in plain words.
- `zone-flow` from `level-2.mmd`: the sequence only, 5 to 7 steps left to right with bound arrows. Do not repeat the before/after text. Add no note card. Mark steps that are new behaviour in violet.
- `zone-structure` from `level-3.mmd`: the central class as one large card with its fields as lines, and the 2 to 3 things it depends on beside it. Mark fields or parts this design adds in violet.
- Build each with `helpers.createArrowBetweenShapes` so every arrow is bound.
- Parent every shape to its frame (`parentId`). Position is relative to the frame.
- Set `meta.source` on every shape (for example `level-2.mmd`).
- Colour must carry meaning. Use one colour for new parts and grey for unchanged parts.

Step 2b. Tighten the frames. Frames start larger than their content so the draw script works for any design.
- For `why-beforeafter`, then every other frame: set `w` and `h` to the right and bottom edge of its children plus 40. Child positions are relative to the frame.
- Place `zone-landscape`, `zone-flow` and `zone-structure` side by side, top-aligned, with a 120 gap. Keep `zone-why` above them and `zone-contract` below them, each 120 away. Resize `zone-why` and `zone-contract` to the full row width.
- Move each heading so it stays 110 above its frame (the heading ids are `h-why`, `h-landscape`, `h-flow`, `h-structure`, `h-contract`).
- Do not change the frame name. It is a zero-width space on purpose, so tldraw shows no label.

Step 2c. Place the rendered diagrams. Run this after step 2b, because the code puts the images right of the tightened frames.
- Render: `python3 {PLUGIN_DIR}/scripts/render_diagrams.py {DESIGN_DIR} --out <scratch dir>`. It makes `level-2.png`, `level-3.png` and `place-images.js` with the official Mermaid CLI and the installed Chrome. The first run fetches the CLI with `npx`.
- Send: `place-images.js` is about 1 MB. Do not pass it as a command-line argument. Read `port` and `token` from `~/Library/Application Support/tldraw/server.json` and run `curl -s -X POST http://localhost:$PORT/api/doc/$DOC_ID/exec -H "authorization: Bearer $TOKEN" -H 'content-type: text/plain' --data-binary @place-images.js`.
- The code places the Flow image and the Structure image side by side, with a heading above each. It removes images from an earlier run first, so a rerun is safe.
- Leave the images at the size the code sets. The user can resize them.

Step 3. Verify once.
- Run `helpers.getLints()`. Fix every lint that your shapes caused. Do not move the shapes from step 1 to fix a lint. Report them instead.
- Take one screenshot with `api.getScreenshot` and open it.
- Save the document with `helpers.saveDoc()`.

Do not rewrite any text, and do not edit the images. A separate language review follows (`ste-review-prompt.md`).

Report: document id and name, file path, the lint result, the screenshot path, any change you made to the draw script, any frame left empty with the reason, and where you had to improvise because the script or the example did not fit.
