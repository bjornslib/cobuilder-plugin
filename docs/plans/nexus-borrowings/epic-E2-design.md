# Epic E2: The draft reviewer

Sources: `02-architecture.md` §reviewer, `03-program-design.md`, ADR-0036, ADR-0005 (dual-path), ADR-0035 (alternatives seam).

## Technical approach

Design mode stage 6 gains a spawn block in `design-mode.md` prose. Before the
engineer reads the draft, the session spawns a reviewer subagent via the
ADR-0005 dual-path pattern (a named agent when the harness resolves it, the
pasted-prompt fallback otherwise). No new agent file ships anywhere.

The spawn brief pins four things:

1. **Blindness**: the reviewer reads `goal.json` (`outcome`, `done_when`,
   `abort_if`) and `intent.json` and writes the blind rubric from those two
   files alone, before it opens the ADR draft, the diagrams, or
   `runtime-architecture.svg`.
2. **Two passes**: (a) validate — score the draft against the rubric, every
   finding cited (ADR id, district id, boundary rule), everything `kind:
   "prediction"`; (b) re-explore — seed divergent exploration with the final
   draft and return survivor options that beat `intent.approach` on the
   criteria the goal states, with reasons.
3. **Routing**: findings enter stage 6 as classified challenges the engineer
   adjudicates. Endorsed survivors reach `intent.alternatives` only through
   the stage-4 record — the reviewer never writes the intent file (ADR-0035:
   design stage 4 alone fills `intent.alternatives`).
4. **Model**: `glm-5.3-flash:cloud`, per the engineer's standing directive.

Outcome recording: `goal.min_work.draft_review_run` is set to true only after
a reviewer round returns. Existing churn-detection and the round limits
(`warn_after_rounds`, `cutoff_rounds`) govern retries; the reviewer is
advisory and cannot block approval on its own.

## Boundary rules touched

- ADR-0025: no agent file ships; the spawn is session-level.
- ADR-0013: design mode keeps framing/exploration/challenge; this extends the
  challenge stage with an automated first pass.
- ADR-0035: options mode proposes whole-system alternatives once, before a
  design exists; the reviewer closes the loop after one design's draft.

## Risks

Latency: one spawn per round adds runtime to every design round. Thin rubrics:
goal.json alone may score loose; mitigation is mandatory citation, and `k`
stays a follow-up field if the dogfood run shows thin findings.