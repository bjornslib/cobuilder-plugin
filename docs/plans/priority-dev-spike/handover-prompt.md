# Handover prompt for the colleague session

Paste this text as the first message of a new Claude Code session. Start the session in the worktree folder named below.

```text
You take over the build of the priority-dev-spike program. Work only in this git worktree:
/Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/priority-dev-spike
Branch: design/priority-dev-spike (local, unpushed). Do not edit the main checkout or any other worktree.

First, read .claude/skills/priority-dev-spike-handover/SKILL.md in full, or run Skill("priority-dev-spike-handover"). It holds the settled decisions, the open items, and the rules.

Then, in this order:
1. Run: git status; uv run shared/tracker.py doctor; uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/priority-dev-spike. The gate check must report Overall: OK. Report anything else.
2. Read docs/plans/priority-dev-spike/ (00 to 04 and the four epic designs) and docs/architecture/designs/priority-dev-spike/.
3. Do NOT start slice 1 until the engineer says "start" in this session. The engineer has asked to review the design and program in the viewer first. Ask once, and wait.
4. After "start", run /implement:start for the program priority-dev-spike. Follow its resume rule, the red-green-validate loop, and the blind rubrics in .cobuilder/rubrics/priority-dev-spike/. Do not read a slice rubric before its slice is built.
5. Build slices 1 to 5 first. After slice 7, stop and ask the engineer for go or no-go.

Rules: British English, Simplified Technical English, no exaggeration, label replies FYI, Summary, Next steps, Decisions and questions. Say "I do not know" and ask when unsure. Use priority-dev/.env for the OpenRouter key and never print it. Run probes only in a scratch tmux session with a scratch Claude Code session, never in a live one. The interpreter input is the stop brief, never "slice". Ask before any push or pull request.
```
