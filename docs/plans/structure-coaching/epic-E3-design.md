# Epic Technical Solution Design: E3 — The loop uses the agents

Feature: structure-coaching
Epic ID: E3

## Scope and Intent

The engineer saw sessions where the main agent wrote a slice itself. Then the coach and the blind score did not run. Text alone cannot force the agent use, and `slice-loop.js` is not the default mode. E3 therefore adds one effect that a script reads before a slice closes, and it makes the loop text stronger. The engineer chose the effect on 2026-11-13: the VALIDATE attempt file (candidate A).

## Files Touched

- `plugins/implement/scripts/agent_use.py` (new, slice 6)
- `plugins/implement/scripts/verify_gate.py` (`--slice`, slice 6)
- `tests/test_agent_use.py` (new, slice 6)
- `plugins/implement/skills/build/references/slice-loop.md` (slice 7)
- `plugins/implement/skills/build/SKILL.md` (slice 7)

## Types & Signatures

```python
def check_slice(plan_dir: Path, rubrics_dir: Path, slice_id: int) -> str: ...
```

`verify_gate.py --plan <dir> --slice <N>` runs only this check. It prints `ok` or the reason, and it exits 0 or 1.

The two candidate effects, from ADR-0048 decision 9:

| Candidate | Reads | Gap |
|---|---|---|
| A. The VALIDATE attempt file | `evidence/slice-<N>-attempt-<M>.md` written by VALIDATE | Cannot see a main agent that writes the code and spawns only VALIDATE |
| B. A role line in each agent report | A line that RED, GREEN, and VALIDATE each add to the evidence | Needs a change to three agent bodies |

**Chosen: A**, by the engineer on 2026-11-13. A third candidate, the Claude Code subagent transcripts, would also see a skipped RED or GREEN. The engineer chose A because it works in each harness and reads no session content. `check_slice` passes when the newest attempt file of the slice exists, holds an `overall_score`, and holds a verdict of PASS at or above the accept threshold of `manifest.yaml`, or an escalation. It fails otherwise, with the reason.

The check must hold in manual mode and in workflow mode. The coach must not write a marker, because the coach ignores every caller but GREEN.

## Slice Decomposition

6. **Slice 6.** Depends on slice 1, which holds the spike. Ends with the four check tests.
7. **Slice 7.** Depends on slice 6. Ends with a blind main-agent pass and one real slice transcript.

## Test Plan

- Slice 6: `test_agent_use.py` with no attempt file, a pass at attempt 1, a workflow-mode slice, and a main-agent slice.
- Slice 7: a blind pass. A fresh main agent gets the changed loop text and a two-slice design. The evidence is its transcript: the spawn order and the check call.

## Risks & Open Questions

- Neither candidate sees every skip. The design accepts a gap that the engineer can see in the transcript.
- A check that the main agent must call can itself be skipped. The `SKILL.md` line and the close step in `slice-loop.md` both name it.
