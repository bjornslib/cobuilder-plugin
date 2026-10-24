---
name: priority-dev-spike-handover
description: Hand over the priority-dev-spike program to a colleague session. Use when you must build, resume, or review the first spikes of priority.dev (model probe, hook probe, tmux probe, interpreter, event log, session adapter) with /implement:start. Gives the state of play, the decisions already made, the rules, and the first steps.
---

# Handover: the priority-dev-spike program

You take over the build of the first spikes of priority.dev. A previous session designed it with the engineer over ten rounds. Read this file in full before you act. It states what is settled, what is open, and what you must not do.

## What priority.dev is

A fleet inbox for one developer who runs many local Claude Code sessions in tmux (4 or 5 now, 20 later). It shows only the sessions that need a human. An interpreter reads each stopped session and proposes. A policy decides. An actuator acts. The spike builds the interpreter on recorded transcripts and measures the hooks and tmux. It builds no policy and no actuator.

## Where everything is

Work in the worktree on branch `design/priority-dev`. Its path at the time of writing is `/private/tmp/claude-503/-Users-theb-Documents-Windsurf-cobuilder-plugin/05e9a06e-c737-4a85-ae83-84319ee56377/scratchpad/wt`. If it is gone, check out the branch `design/priority-dev` from the repository. Do not edit the engineer's main checkout. The branch carries a merge of `e40bb0c` from `feature/tracker-management`.

| What | Where |
|---|---|
| The design record | `docs/architecture/designs/priority-dev-spike/` (`goal.json`, `intent.json`, `assessment.json`, `contracts.md`, diagrams) |
| The decision | `docs/architecture/adr/ADR-0045-the-priority-dev-spike-measures-its-unknowns-probes-first.md` |
| The gates and the slices | `docs/plans/priority-dev-spike/` (`01` to `04`, and `epic-E1` to `epic-E4` designs) |
| The blind rubrics | `.cobuilder/rubrics/priority-dev-spike/`. Do not read a slice rubric before you build that slice. A validator reads it, not you |
| The detailed design | `priority-dev/docs/design/`: `schemas.md`, `adapter-host.md`, `dspy-modules.md`, `components.md` |
| Running sketches | `priority-dev/docs/design/schemas/interpreter_schemas.py` and `dspy_modules.py`. Run each with `uv run`. Each prints `ok` |
| Review pages | `.lavish/priority-dev-schemas.html` and `priority-dev-spikes.html`. Rebuild both with `uv run priority-dev/tools/build_pages.py` |
| The model key | `priority-dev/.env` (`OPENROUTER_API_KEY`). Git ignores it. Never print it or commit it |

## Settled decisions

1. Code lives in `priority-dev/`, with its own `pyproject.toml`. It never imports from `plugins/` or `shared/`, and the plugin tests never collect it (ADR-0045).
2. No Jev in the spike. Nemo (`openrouter/mistralai/mistral-nemo`) does Triage, Pick, Fill, and Card. Inkling (`openrouter/thinkingmachines/inkling:free`) does Digest. Use DSPy. The skills are in `/Users/theb/Documents/Windsurf/think-with-ai/.claude/skills/dspy-skills` and its sibling skills.
3. The interpreter input is the **stop brief**, never "slice". Slice means a build unit only.
4. `continue_until` is our action. The Claude Code adapter turns it into the `/goal` command. This is a later phase.
5. Order: probes first (slices 1 to 3), then the stop brief, Interpret, Digest, and the replay (4 to 7). After slice 7 the engineer decides go or no-go. Then the event log (8 to 10) and the adapter to the log (11 to 13). Build slices 1 to 5 first.
6. Three merges apply: every model call is stored with its model id, prompt hash, and raw reply. Every hook exits 0 within 5 seconds on any failure, and a bypass file `~/.priority-dev/bypass` turns all hooks into no-ops. A failed model call ends as an Abstain with a logged reason.
7. Fixtures: real transcripts, redacted, kept local, and ignored by Git (`priority-dev/fixtures/real/`). Small made-up fixtures go in the repository.
8. Code checks every quote that a model gives. A quote that is not in the stop brief gives an Abstain.

## Open items you must settle with the engineer

1. **The tracker.** The program is seeded: `priority-dev-spike` with epics E1 to E4 and slices 1 to 13, in the beads tracker. The first read failed because the branch was older than PR #50 (beads-native), so its adapter could not read gate records. The fix was `git merge e40bb0c`. `next-ready` returns nothing until the engineer approves the gates and the program stage moves on. Do not seed again.
2. **Gate approvals.** Gates 1 to 4 were approved on 2026-10-24 and are in `00-status.md` and the tracker. `verify_gate.py` reports OK. **The engineer asked to see the final design and program in the viewer (`/artifact:view`) before any implementation starts.** Confirm that this review happened and that the engineer said to start. Do not write code before that.
3. **The design stage.** `goal.json` holds `stage: approved`. The local branch `design/priority-dev-spike` exists, unpushed, and the engineer chose one pull request. No PR is open.
4. **The index.** Built after the merge. Rebuild with `uv run shared/build_index.py` after any change to the plan or the design.
5. **Later programs.** `priority-dev-phase-a` and later phases are planned, not created.

## First steps

1. Run `git status`, `uv run shared/tracker.py doctor`, and `uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/priority-dev-spike`. Report what fails. The gate check fails today on three approval lines, and that is expected.
2. Read the design record, the plan, and `adapter-host.md` section 7 (the unknowns).
3. Run `/implement:start` for the program `priority-dev-spike`. Follow its resume rule and its approval protocol.
4. Build slice 1, the model probe. Run it on three redacted real transcripts from `~/.claude/projects/`. Ask the engineer which three. Redact first.
5. Build slices 2 and 3 only in a scratch tmux session with a scratch Claude Code session. Never install a hook in a live session. Never send keys to a pane that is not the scratch pane.

## Rules

- Write in British English. Money is in Australian dollars. Use Simplified Technical English: short sentences, active voice, no contractions, no semicolons, no em-dashes, and an article before each countable noun. Cap a sentence at 25 words and a paragraph at 6 sentences.
- Do not exaggerate. Do not fill. Say "I do not know" and ask when you are unsure. Label what you read, what you inferred, and what you did not test.
- Label every reply to the engineer, in this order, using only the labels with content: **FYI**, **Summary**, **Next steps**, **Decisions and questions**. Back every claim of success with evidence. State each gap.
- Push `design/priority-dev` without asking. Do not open a pull request unless the engineer asks. Ask before any other push or merge.
- Use Sonnet subagents for work that weighs options. Use Haiku for fetch and summarise.
- Do not edit `CLAUDE.md` yet.
- Do not discuss lab labelling. Metrics that need labels wait.
- A probe may refute its claim. State the result plainly. A refuted claim is a valid result.
- Never trust a self-report. A slice is done when an independent validator scores it 0.90 or higher against its blind rubric.

## Facts to check before you rely on them

- The hooks facts come from `hooks.md` and `goal.md` on code.claude.com, read on 24 October 2026. Read them again.
- Nobody has made a model call yet. Nemo's validity on the 13 action payloads is unknown.
- `$TMUX_PANE` in a hook, the transcript lag after Stop, and whether the permission dialog shows while a hook waits are untested.
