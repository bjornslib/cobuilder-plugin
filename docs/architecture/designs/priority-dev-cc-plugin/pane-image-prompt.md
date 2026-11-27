# Image prompt: the Priority reader pane

Give this prompt to an image model. It asks for four layout options of one
terminal pane. Each constraint comes from the Claude Code mod interface
(build 2.1.322, https://code.claude.com/docs/en/plugins/mods/interface).
The baseline wireframe is in `contracts.md`, section "Wireframe: the sidebar
at 56 columns".

```text
Design 4 alternative layouts for one sidebar panel inside a terminal app, shown side by side as 4 separate mockups on one canvas. Label them A, B, C, D.

WHAT THE SCREEN IS
A full-screen dark terminal window, about 160 columns by 45 rows, monospace font everywhere (like JetBrains Mono or SF Mono), one fixed character grid. On the left 55–60% is a coding-agent chat transcript (Claude Code): user prompts, agent replies, tool-call rows like "⏺ Bash(npm test)". Keep the transcript plain and secondary. On the right, a docked sidebar panel titled "Priority reader", 50–60 columns wide (never more than 45% of the window), full height, drawn with a single-line box border. Under both, a one-line prompt box ("> ") with a dim status line under it. The sidebar is the subject of the design.

HARD CONSTRAINTS (the panel is drawn by a terminal UI toolkit, not a browser)
- Everything sits on the character grid: every element is a whole number of columns wide and rows tall. No pixel offsets, no subpixel spacing, no rounded corners except box-drawing characters (╭╮╰╯ allowed), no shadows, no gradients, no blur, no transparency, no images or illustrations, no icon fonts, no emoji. Unicode symbols that fit one cell are fine: ● ○ ✓ ✗ › · … ▸ ▾ │ ─.
- Only these building blocks exist:
  1. Box: a flex row or column with padding, gaps, optional single/double/round/bold box-drawing border, optional solid background color.
  2. Text: one font size (terminal), styles limited to bold, dim, italic, underline, strikethrough, inverse, and a foreground/background color.
  3. Button: a text label, either in brackets like "[ Send ]" or plain with its hotkey shown as "s Send" / "Send (s)". A button can show "[x]" or "[ ]" in its label to act as a toggle; there is NO real checkbox, radio, switch, slider, tab strip, or chip widget.
  4. Input: a one-line (or few-line) text field with a label, a placeholder, and a small submit word like "save".
  5. Select: a one-of-several dropdown drawn inline as "Label: value ▾".
  Do not draw anything that is not one of these five.
- No hover states, no tooltips, no drag handles, no scrollbars inside the panel. The panel has a fixed height: content that does not fit is cut, so the design must put the most important card at the top and collapse older items to one line each.
- Keyboard first: each button may show one single-letter or single-digit hotkey (s, e, r, w, 1–9). Show the focused element with inverse colors.
- Colors: the toolkit takes terminal theme colors or named colors, nothing else. Use a small palette — default foreground, dim gray, green, yellow, red, blue/cyan as an accent, and inverse. Dark theme. Style preference: at most 4 colors in the panel at once besides foreground and dim.

CONTENT (use this exact content in all four options so they compare)
Header: reader switch "● on", "4 readings", "running…".
Newest card, #4, 14:32, status "blocked", priority "P1", flag "needs you". Its proposed steps, each selectable:
  1. reply — "Run the migration before the tests, then re-run the suite." (selected)
  2. continue_until — goal "tests pass", 5 turns, 20 min (not selected)
  3. ask_human · decide — question "Which store keeps the marks?" options "$.store" (selected) and "a JSONL file", plus a free-text field "Other"
  4. approve_permission — shown dimmed, NOT selectable, with the note "no target at a stop"
A "Draft" preview: the exact text that will be sent, built from the selected steps, 2–4 dim lines.
Actions: "Send (s)" (primary), "Edit (e)" (puts the draft in the prompt box), "Right (r)", "Wrong (w)", and a one-line "Note" input with "save".
Older cards collapsed to one row each:
  #3 14:20 working P3 ✓
  #2 14:11 done P4 ✗
  #1 14:02 abstain · no_agent_reply

WHAT TO VARY BETWEEN A–D
A: Stacked — one column, everything in reading order, minimal borders, sections separated by blank rows.
B: Bordered card — the newest card in its own box-drawing frame, actions pinned as the last row of the frame, older cards as a compact list under it.
C: Split focus — the steps list on top, the draft preview in an inverse or accent-bordered block directly above the action row, so "what will be sent" is unmistakable.
D: Dense — maximize information per row: steps as single lines with right-aligned kind tags, the decide question folded into its step row, the marks (r/w) on the card title row.

OUTPUT
A clean, high-resolution UI mockup, flat, crisp monospace text, readable labels, realistic terminal look (not a web app, not a mobile app). No device frame. No marketing text. Each option labeled with its letter and a three-word name under it.
```
