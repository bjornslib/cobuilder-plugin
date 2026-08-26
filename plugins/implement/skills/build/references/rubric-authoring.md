---
title: "Rubric Authoring (Gate 4b)"
status: active
type: reference
---

# Writing the blind per-slice rubric

Write one rubric per slice at Gate 4, before writing any implementation code.
This ordering is mandatory. A rubric written after code describes the code. A
rubric written before code describes the requirement.

Location: `.cobuilder/rubrics/<feature-slug>/slice-N.md`, plus one
`manifest.yaml` for the feature.

---

## 1. What a rubric is

A rubric is a list of criteria that a validator checks with evidence. Phrase
criteria so two independent people score them identically. A rubric is not a
test file or a spec. It is the question sheet for the validator.

Each criterion needs three parts:

- **The claim** — what must be true in behavior terms.
- **The evidence to check** — the concrete command, file, or test that proves
  the claim. For example, run `pytest tests/auth -v`, and read
  `src/auth/session.py` for token expiry handling.
- **The scoring guide** — exact descriptions for scores of 1.0, 0.5, and 0.0.

A criterion whose evidence says "read the code and judge" is weak. Rewrite the
criterion until the evidence names something a validator can execute.

---

## 2. Template

```markdown
# Rubric: Slice <N> — <slice name>

Feature: <feature-slug>
Epic: <epic-id>
Slice goal: <one sentence, copied from 04-slices.md>
Test command: <the exact command that runs the test suite>

## Criteria

### C1 — <short claim> [CRITICAL]
**Must be true:** <the behavior, in end-user or caller terms>
**Evidence to check:**
- <command to run>
- <file or symbol to read, and what to look for>
**Scoring:**
- 1.0 — <full credit description>
- 0.5 — <partial credit: fragile or happy path only>
- 0.0 — <missing, wrong, or the test fails>

### C2 — <short claim>
...

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged: <list scope>

## Out of scope — do not penalise
- <capability belonging to a later slice>
- <capability belonging to a later slice>
```

**`[CRITICAL]`** marks a criterion whose failure makes the slice unusable
regardless of the average score. A failing critical criterion blocks acceptance.
Mark critical criteria sparingly. Use two or three per slice at most.
Authentication, data integrity, and money movement are usually critical. Visual
formatting is not.

**The out-of-scope list is mandatory.** Without it, the validator penalises the
implementer for missing future slices. That causes the score to collapse and
wastes retry attempts on unrequested work.

---

## 3. Manifest

Write one manifest per feature at
`.cobuilder/rubrics/<feature-slug>/manifest.yaml`:

```yaml
feature: <feature-slug>
test_command: "pytest tests/ -v"        # exact, runnable from repo root
thresholds:
  accept: 0.90          # score >= this accepts the slice
  investigate: 0.70     # score >= this but < accept retries with feedback
  # score < investigate rejects the slice; rethink the slice before retrying
max_attempts: 3         # after this, escalate rather than loop
slices:
  - id: 1
    name: "tracer bullet"
    weight: 0.10        # weights are for the feature rollup, not the gate
  - id: 2
    name: "happy path"
    weight: 0.30
```

**Threshold guidance.** 0.90 is the default and must remain the default. Lower
thresholds allow bugs into production. A 0.70 gate accepts a slice where three
criteria out of ten are half-met. Change the threshold only when the user
requests it. Record the reason in `00-status.md`.

Weights apply only to the feature-level rollup score reported at the end. Each
slice gates on its own unweighted score.

---

## 4. Writing rubrics that stay blind

The rubric is the answer key. Follow three practices to keep it effective:

- **Describe behavior, not implementation.** "The endpoint returns 429 after 10
  requests in a minute" survives a refactor. "The `RateLimiter` class has a
  `check()` method" restricts implementation choices and leaks the design.
- **Do not invent files outside the approved designs.** If the rubric invents a
  file path, it overrides the design documents.
- **Derive criteria from approved documents.** Author criteria from
  `01-product.md`, `03-program-design.md`, and the approved Epic Technical
  Solution Design (`docs/plans/<slug>/epic-<epic-id>-design.md`). If you cannot
  write a criterion without guessing, the design documents are incomplete.
  Update the technical design first. For an epic carrying more than one
  slice, `plugins/implement/scripts/verify_gate.py --plan
  docs/plans/<slug>` names the missing or incomplete design under `4b`. Run
  it and fix what it names before writing rubrics for that epic.

---

## 5. Common defects

| Defect | Why it hurts | Fix |
|---|---|---|
| Criterion with no runnable evidence | The validator guesses and scores drift | Name a concrete command, test, or file assertion |
| Everything marked CRITICAL | The critical marker loses its meaning | Keep critical criteria to two or three per slice |
| Missing out-of-scope list | The validator penalises unbuilt future slices | List what later slices own |
| Rubric written after code | It describes the code and passes automatically | Write the rubric at Gate 4 before writing code |
| Rubric naming internal methods | It becomes a strict spec that implementers copy | Use behavioral assertions instead |
| One rubric for the whole feature | Cannot gate individual slices | Write one rubric per slice |
