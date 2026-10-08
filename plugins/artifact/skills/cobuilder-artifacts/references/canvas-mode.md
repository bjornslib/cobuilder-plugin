# Canvas mode

Turn one design folder into one tldraw canvas. A script prepares the exact
data. The `tldraw-offline` subagent draws it. This mode reads a design. It does
not edit the design, and it does not call the `Artifact` tool.

## Why two parts

- Facts must not drift. `scripts/build_canvas.py` copies the contract (epics,
  states, dependencies) and the Why text straight from the JSON files.
- Diagrams need judgement. A full mermaid diagram is a wall of boxes. The agent
  redraws each one with 5 to 7 core nodes.

## Zones

| Zone | Source | Drawn by |
|---|---|---|
| A. Why | Outcome and why-now cards: `goal.json`, `intent.json`. Before/after picture: Note lines of `level-2.mmd`, else `narrative.json` | script (cards), agent (before/after) |
| B. Landscape | `diagrams/level-1.mmd` | agent |
| C. Flow | `diagrams/level-2.mmd`, the sequence of steps only | agent |
| D. Structure | `diagrams/level-3.mmd` | agent |
| E. Contract | `goal.json#epics` | script |

The rendered level-2 and level-3 diagrams (PNG) sit side by side to the right of
the zones. Level 1 is not rendered, because its C4 layout is cluttered.

Each zone gets a large heading above its frame. The frames carry a zero-width
space as their name, because tldraw shows "Frame" for a blank name and the label
cannot be resized. After filling, the agent shrinks each frame to its content.

Epic colour tracks `state`: grey is planned, blue is open, orange is
in-progress, green is completed or done.

## Procedure

1. **Preflight.** Run:
   ```bash
   python3 -I "${CLAUDE_PLUGIN_ROOT}/scripts/canvas_preflight.py" --design "<value of --design>" --repo "<value of --repo, default .>"
   ```
   - Without `--design`, list the folders under `docs/architecture/designs/`
     and ask which one to draw.
   - It prints JSON. When `ok` is false, show every line of `problems` and STOP.
     Do not try to install the `tldraw-offline` skill or start the app.
   - When `images_ok` is false, tell the user which `image_problems` apply and
     continue as if `--no-images` was set.

2. **Choose the target.** The file is `<design_dir>/<design_name>.tldraw`.
   - The file does not exist: the target is "new".
   - The file exists and `--redraw` is not set: tell the user and STOP.
   - The file exists and `--redraw` is set: the target is that file. The agent
     clears the page first, so use `--redraw` only for a canvas this mode drew.

3. **Prepare the draw code.** Write it to the scratchpad:
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/build_canvas.py" "<design_dir>" --format js > "<scratchpad>/draw.js"
   ```
   `--format spec` prints the same facts as JSON. Use it to check what the
   script found.

4. **Draw.** Launch the `tldraw-offline` subagent with
   `references/canvas/agent-prompt.md`. Fill in four placeholders:
   `{DESIGN_DIR}`, `{DRAW_JS_PATH}`, `{TARGET}` and `{PLUGIN_DIR}`
   (`${CLAUDE_PLUGIN_ROOT}`). Use absolute paths.
   - With `--no-images`, delete step 2c from the prompt before you send it.

5. **Check the report.** It must list the lint result and one screenshot path.
   Open the screenshot and show both to the user. If the report says the editor
   did not answer, tell the user to restart tldraw Desktop and run the command
   again.

6. **Review the language** unless `--no-review` is set. Launch a general-purpose
   subagent with `references/canvas/ste-review-prompt.md`. Fill in `{DOC_ID}`,
   `{PLUGIN_DIR}` and `{TLDRAW_SKILLS}` (`tldraw_skills` from the preflight).
   Show the user its report.

7. **Report.** Give the file path, the lint result, the screenshot, and the
   number of texts the language review changed.

## Rules

- Never hand-edit the script-drawn cards of zones A and E. Fix the script and
  rerun.
- A design without `narrative.json` or `diagrams/` still works. The before/after
  picture falls back to the `intent.json` text. Zones B, C and D stay empty
  frames. Say so in the report.
- Do not copy mermaid syntax onto the canvas as text.
- Every shape carries `meta.source` (for example `goal.json#epics[3]`). Keep it
  on any shape the agent adds.
- The `.tldraw` file embeds the two diagram images. It is about 450 KB with
  them. Mention this when the user plans to commit the file.

## Files

- `references/canvas/agent-prompt.md`: the drawing subagent prompt.
- `references/canvas/example-fill.js`: a worked fill script for zones B, C and
  D. It shows the pattern and is not a generator.
- `references/canvas/ste-review-prompt.md`: the language review prompt.
- `scripts/canvas_preflight.py`: the checks and the design folder resolution.
- `scripts/build_canvas.py`: the data and draw-code generator. Standard library
  only.
- `scripts/render_diagrams.py`: renders level 2 and level 3 to PNG, and writes
  the code that places them. It needs `npx` and Google Chrome. Class-diagram
  `note` lines are dropped unless `--keep-notes` is set.
