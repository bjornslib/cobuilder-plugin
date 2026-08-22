---
title: "Validation Scoring and Gap Routing"
status: active
type: reference
---

# Scoring a slice, and routing a gap

---

## 1. The score

```
criterion_score  ∈ {0.0, 0.5, 1.0}
overall_score    = average of criterion scores in the slice rubric
```

Use three discrete values. A continuous scale invites compromise scores like
0.7 on ambiguous items. Force the decision:

| Score | Meaning |
|---|---|
| **1.0** | Fully met. Evidence is clear and tests pass. |
| **0.5** | Partially met. Works for happy path only, or is fragile, or test passes for the wrong reason. |
| **0.0** | Missing, wrong, or the test fails. Also assigned if a pass was rigged. |

Every score must cite evidence: a file path with a line number, a test name, or
captured test output. A score without evidence is an unsupported claim.

### Worked example

```
Slice 3 — "rate limiting", 5 criteria:

C1 [CRITICAL] returns 429 past the limit      1.0   test_rate_limit_429 passes
C2 [CRITICAL] limit is per-user, not global   1.0   test_per_user_isolation passes
C3            window resets after 60s         0.5   works, but uses wall clock,
                                                    fails under clock skew
C4            limit is configurable           1.0   src/config.py:41
C5            429 body names the retry time   0.0   header absent, test fails

overall = (1.0 + 1.0 + 0.5 + 1.0 + 0.0) / 5 = 0.70

0.70 < 0.90  →  FAIL (attempt 1) → back to GREEN with C3 and C5 as guidance
```

---

## 2. The gate

```
PASS        overall_score >= 0.90  AND  no CRITICAL criterion below 1.0
FAIL        otherwise, and attempt < max_attempts (default 3)
ESCALATION  otherwise, and attempt >= max_attempts
```

**Why 0.90 is the standard.** A 0.70 gate accepts a slice where three criteria in
ten are half-met. Slices are small enough that 0.90 is reachable. If 0.90 is not
reachable, the slice is too large.

**The CRITICAL override.** A failing critical criterion blocks acceptance
regardless of the overall average.

**Changing the threshold.** Change the threshold only when the user requests it.
Record the new value in `manifest.yaml` and the reason in `00-status.md`. Never
change the threshold to rescue a failed attempt.

---

## 3. The feature rollup

At the end of the feature, calculate a weighted rollup with the weights from
`manifest.yaml`:

```
feature_score = SUM( slice_weight[i] * slice_score[i] )
```

This rollup is informational. Each slice is gated independently on its own
score.

---

## 4. Gap routing

A gap is any criterion scored below 1.0. Every gap requires a specific route. Do
not ignore any gap.

### The four routes

| Route | When | Action |
|---|---|---|
| **RETRY** | In scope, mechanical, no architecture change. Missing import, missing header, unhandled branch. | Add to the feedback file. GREEN fixes it in the next attempt. |
| **DEFER** | A planned future slice owns the capability. | Add a line to that future slice rubric. Do not build it now. |
| **FILE** | In scope and fixable, but large or high risk. Crosses a service boundary or needs a migration. | Record as a follow-up work item in `00-status.md`. Do not block the slice. |
| **ESCALATE** | Fixing it requires an architectural or product decision. | Stop. Present the issue to the user. Update earlier gate documents if needed and request re-approval. |

---

## 5. Escalation

A slice that fails three targeted attempts is stuck. Escalation accepts the
slice with reservations so subsequent work can continue.

Format for escalation in `00-status.md`:

```markdown
## Escalated
- Slice 3 — rate limiting — score 0.70 after 3 attempts
  Unmet: C3 (window uses wall clock, fails under clock skew), C5 (retry-after
  header absent).
  Root cause: the limiter has no access to a monotonic clock in this runtime.
  This is an architecture gap, not an implementation gap.
  Follow-up: <issue link or work item>
  Decision needed from: the user
```

---

## 6. Voided runs

Certain findings void the score rather than lower it. Report the void
immediately:

- A test file appears in the slice diff.
- A test was skipped, ignored, commented out, or weakened.
- A test also passes against pre-change code.
- The implementer read the rubric under `.cobuilder/`.

A voided run requires rewriting the affected test or rubric, then restarting the
slice from RED.
