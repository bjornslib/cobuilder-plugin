---
title: Divergent Exploration
description: Two-phase diverge/focus loop for design option generation, review blind-spot hunting, and debug hypothesis generation — isolated frame-bound agent calls followed by a separate critic pass.
status: active
---

# Divergent Exploration

The skill's detection engine (`references/saas-checklist.md`) finds only what it is already looking for: enumerated problem classes via grep. It has no mechanism for the unenumerated case, and design mode has no option generation at all. This reference adds a mechanical two-phase loop that widens the search before the checklist narrows it.

The pattern: N *isolated* agent calls, each locked into one cognitive frame with evaluation forbidden, followed by a SEPARATE critic call with the opposing prompt. The isolation is load-bearing. Tree-of-Thought-style branching that shares one context lets anchoring propagate from the first branch to the rest — the second branch reads as a variation on the first, not an independent frame. Separate `Agent` calls with no shared transcript are the only way to actually prevent that. This is the mechanism behind the ADHD skill's measured 5.2x baseline improvement on trap detection: seductive-but-broken ideas caught before they cost engineering time.

We also take the isolation mechanic from the parallel-solutioning pattern — N agents in one message, standardized output, no cross-contamination — but replace its aggregation step. That pattern typically scores candidates by majority vote ("Unanimous Consensus 7/7", "Strong Majority 5-6/7") and synthesizes toward the center. That structurally discards the minority insight the entire exercise exists to surface: an idea only one frame reaches is not noise, it is the whole point of diverging. §4 below keeps agreement as a recorded, secondary signal and forbids using it as a filter.

## 1. Pre-flight gate (abort conditions)

This gate is the primary cost control. Without it, every trivial ADR or every routine review spawns 6 agents for a decision that had one answer. Check these before doing anything else. If any one is true, skip divergence and proceed linearly through the normal mode workflow.

| Condition | Why it aborts |
|---|---|
| The question has one canonical answer (e.g. "which serializer for this API" when the stack card already prescribes one) | No genuine option space to diverge over |
| The detected stack card (`references/stacks/`) already prescribes the pattern | The card is the converged answer; re-deriving it wastes agents |
| The issue is mechanically detectable — already covered by a `saas-checklist.md` grep or a `references/mechanical-enforcement.md` rule | A deterministic check is cheaper and more reliable than 4-6 agents |
| The user asked for "standard" / "quick" / "textbook" | Explicit signal that breadth is not wanted |

State the gate result explicitly before proceeding either way: "Pre-flight: proceeding linearly, [condition] applies" or "Pre-flight: no abort condition met, diverging across N frames."

## 2. Phase 1 — Diverge

Issue N isolated `Agent` tool calls in a SINGLE message (true parallelism — the same discipline `parallel-solutioning.md` enforces). Each branch receives:

- The problem statement.
- Identical supporting context (same files read, same background, same constraints).
- Exactly one frame's vantage prompt (§3).
- A system instruction that forbids evaluation, ranking, and hedging within the branch — the branch generates, it does not judge itself. Include ADHD's rule explicitly: the first three answers everyone would independently reach are banned; if the branch's first instinct is one of them, discard it and go one level deeper into the frame.

Isolation is mechanical, not requested. It comes from launching N separate `Agent` calls with no shared transcript — never from asking one agent to "consider N perspectives" inside a single response, which keeps the anchoring the exercise is designed to prevent. Branches never see each other's output; no branch is told what the other branches produced.

**Example dispatch** (design mode, "Remove the load-bearing assumption" frame):

```
Agent({
  description: "Diverge: remove load-bearing assumption",
  subagent_type: "solution-architect",
  prompt: "PROBLEM: [paste problem statement]\n\nCONTEXT: [identical context block — same for all N branches]\n\nFRAME — Remove the load-bearing assumption:\nAssume the piece of infrastructure this design currently treats as fixed \
is gone: the framework, the database, the network between services — pick \
whichever the current thinking leans on hardest. What is still possible? \
Design as if you have to deliver the outcome without it.\n\nRULES: Generate only. Do not evaluate, rank, or hedge your own output. \
Do not mention tradeoffs or caveats. The first three answers any \
competent engineer would independently propose are banned — if your \
first instinct is one of them, go deeper into the frame. Output: a single \
concrete option with a 2-3 sentence sketch. No preamble."
})
```

Repeat with a different `frame` value per call, all N calls in the same message.

## 3. Frame catalogue

### Design frames (ADR option generation)

| Frame | Vantage prompt | Catches |
|---|---|---|
| Remove the load-bearing assumption | "Assume the piece of infrastructure this design currently treats as fixed is gone — the framework, the database, the network between services. What is still possible? Design as if you must deliver the outcome without it." | Options masking a single point of failure as an architectural given |
| 3am on-call | "You are the engineer paged for this system at 3am, alone, with no one to ask. What can you actually do with what this design gives you? Design so that person has a real answer." | Designs that are operable only with tribal knowledge or daytime staffing |
| Regulator / auditor | "You must prove after the fact — to a regulator, not a colleague — exactly what happened, when, and who authorized it. What must this design make provable, traceable, and refusable? Design for the audit, not the demo." | Missing audit trail, missing consent/refusal paths, unprovable claims |
| $0 budget, 1 hour | "You have no budget and one hour before this has to work. What is the crudest version that still delivers the actual outcome, with nothing decorative?" | Over-engineering, gold-plating, scope the requirement never asked for |
| 100x / 10-year | "This system now runs at 100x current load and has been live for 10 years. What survives unchanged, and what has to be thrown away to get here? Design the seam where it breaks." | Designs that work now but have no path past one order of magnitude |
| Inversion | "How would you design this to guarantee it fails — reliably, quietly, in the worst possible way? Now negate every element of that design." | Blind spots invisible when reasoning forward; surfaces the actual failure mode by construction |

### Review frames (blind-spot hunt)

Each frame targets a class of issue the grep-based `saas-checklist.md` structurally cannot express — it pattern-matches source text, it cannot reason about what a legitimate actor can *reach* or what happens under *degraded* conditions. State the "catches" note in the finding output so it's traceable to why the frame ran.

| Frame | Vantage prompt | Catches |
|---|---|---|
| Malicious tenant | "You hold a legitimate, unprivileged account on this system. Nothing about your account is compromised. What can you reach that isn't yours — by URL guessing, ID incrementing, cross-tenant references, or just asking for it? Enumerate what a normal login lets you touch." | Authz logic gaps and IDOR — beyond the checklist's missing-tenant-filter grep, which only catches queries that omit a filter clause, not queries that filter on the wrong or attacker-controlled value |
| 3am on-call | "This system just failed in production at 3am. What fails silently here — no alert fires, no runbook exists, no dashboard shows it? Find the failure with no human-visible signal." | Observability gaps: missing alerting, missing runbooks, silent degradation |
| Regulator / auditor | "An incident happened. You must reconstruct exactly what data moved, who touched it, and when — from records, not memory. What can you not prove after the fact?" | Audit-log gaps, data lineage gaps, unprovable access history |
| Speedrunner | "You are trying to break this system's correctness by hitting it in the wrong order, twice at once, or mid-retry. What ordering, timing, or state glitch lets you skip a check that was supposed to run?" | Races, TOCTOU, retry/idempotency bugs |
| Remove the load-bearing assumption | "The database, the queue, or a third-party dependency this code calls is now slow or fully down. What does this code do? Trace the actual behavior, not the intended behavior." | Degraded-dependency handling, missing timeouts, missing circuit breakers |
| The new hire | "You just joined and were handed this code with no one to ask. What did you have to guess, or would have had to message a human to find out, because the code itself doesn't say it?" | Agent-legibility gaps — cross-reference `references/agent-legible-principles.md` for the four principles this frame is checking against |

### Debug frames (root cause)

| Frame | Vantage prompt | Catches |
|---|---|---|
| It's not the code | "Assume the code under suspicion is correct. Where else could this symptom originate — config, environment variables, data shape, system clock, network path? Find the non-code explanation first." | Bugs that live in config/env/data, wrongly attributed to logic |
| It worked before | "This worked at some point and now doesn't. What changed between then and now — deploy, dependency version, data migration, config flip? Name the specific change, not a category of change." | Regressions — shaped for bisection, not theorizing from first principles |
| The error is a lie | "The reported symptom is where the failure became visible, not necessarily where it originated. What upstream fault would produce exactly this downstream symptom?" | Misattributed root cause — stack trace or error message pointing at the victim, not the culprit |
| The seam | "This bug lives at the boundary between two components, and neither team believes it's theirs. Where is that boundary, what does each side assume the other guarantees, and where do those assumptions not actually match?" | Integration bugs owned by no one, contract mismatches |
| Concurrency | "Assume this is not a logic bug but an ordering bug. What sequence of requests, retries, or cache staleness produces this exact symptom?" | Race conditions, stale reads, partial-failure states |
| Inversion | "If you had to deliberately produce this exact symptom on demand, what would you do? Write the recipe." | Forces a concrete causal mechanism instead of a vague theory |

## 4. Phase 2 — Focus

A SEPARATE critic call, issued after all N diverge branches return, with the opposing system prompt: this call's job is to evaluate, not generate. Hard wall — the critic must not be the same call, session, or context that generated any candidate. It receives all N outputs at once, unlabeled by frame origin if you want to reduce halo effect, though in practice frame labels are useful for the `frame` field in §5 and can stay attached.

The critic performs, in order:

1. **Score** each candidate `novelty` / `viability` / `fit`, each 0-10.
2. **Flag traps**, with stated reasoning per flag. A trap is mode-specific:
   - *Design mode*: an option that scores high on `fit` but rests on an unexamined load-bearing assumption — it looks right because it quietly assumes away the hard part.
   - *Review mode*: a finding whose recommended fix would make things worse, or a finding a compensating control already neutralises. Before reporting a review finding as real, challenge it explicitly: does a compensating control — a WAF, upstream input sanitisation, an existing rate limiter, etc. — already neutralise the issue? A finding that does not survive this challenge is a trap, not a real finding.
3. **Cluster** candidates by underlying angle (not by frame — two frames can converge on the same underlying idea) and record `agreement` = how many independently-run frames reached that cluster. Agreement is a SECONDARY signal only. It must NEVER be used as a filter, ranking key, or reason to drop a candidate. That is exactly the parallel-solutioning failure mode this reference corrects — majority voting synthesizes toward the center and throws away the minority insight the divergence was run to surface. Agreement exists only so a downstream consumer who explicitly wants a consensus view has one available; it must never gate what gets reported.
4. **Mark non-obvious survivors** with a star (`starred: true`) — candidates that are low-agreement (reached by one frame only) but pass the trap check and score well on `fit`. These are usually the actual payoff of diverging; do not bury them below high-agreement clusters in the output ordering.
5. **Deepen the top 3** (by a combination of score and starred status, not by agreement) into fuller sketches: each gets its load-bearing risks spelled out and a first concrete step small enough to start immediately.

### Debug mode overrides the ranking key

In debug mode, do not rank hypotheses by likelihood. Rank by **cheapest discriminating test**: which single observation, if made, eliminates the most surviving hypotheses per unit of effort spent making it. This is the right convergence criterion for debugging specifically because the goal is not "which hypothesis do I believe" — that invites confirmation bias toward whichever theory is most familiar — but "which action shrinks the hypothesis set fastest for the least cost." A cheap test that rules out three hypotheses at once is worth more than an expensive test that slightly favors the most plausible one.

**Worked example.** Symptom: intermittent 500s on one endpoint, no pattern in the logs.

| Hypothesis | Test | Cost | Hypotheses eliminated if test comes back negative |
|---|---|---|---|
| H1: downstream DB connection pool exhaustion under load | Check pool metrics during a failure window | Low (dashboard already exists) | Eliminates H1 alone |
| H2: race condition in a shared in-memory cache | Reproduce with concurrent requests locally | High (needs a repro harness) | Eliminates H2 alone |
| H3: intermittent DNS resolution failure to a third-party dependency | Grep access logs for the third-party call's latency/error pattern during failure windows | Low (logs already exist) | Eliminates H3, and if latency is elevated, also weakens H1 (pool exhaustion would show as pool-metric saturation, not upstream latency) |

H3's test is run first: lowest cost, and its outcome is informative about H1 too. H2 is tested last — not because it's least likely, but because ruling it in or out is the most expensive action available, and by the time H1 and H3 are settled the remaining hypothesis space may already be down to H2 alone, making the expensive test unambiguous instead of speculative.

## 5. Output schema

One JSON object per candidate, whether it originated in design, review, or debug mode. In review mode, deliberately shape each candidate with `id`, `severity`, `file`, `line`, `evidence`, and `recommendation` fields so blind-spot output from a review-mode divergence can be folded into a standard findings array mechanically, without an LLM retyping it into a different shape.

```json
{
  "id": "DIV-04",
  "frame": "malicious_tenant",
  "cluster": "cross-tenant-id-guessing",
  "title": "Invoice PDF endpoint accepts any invoice_id with no ownership check",
  "sketch": "GET /invoices/{id}/pdf checks auth (logged in) but not authorization (is this invoice yours). Sequential integer IDs make enumeration trivial.",
  "scores": { "novelty": 6, "viability": 9, "fit": 9 },
  "trap": false,
  "trap_reasoning": "No compensating control found — endpoint is not behind an API gateway with per-resource ACLs, and no ownership check exists anywhere in the call path.",
  "agreement": 1,
  "starred": true,
  "risks": ["Fix must not break legitimate cross-tenant sharing links if any exist — check for a separate shared-link feature before adding a blanket ownership check."],
  "first_step": "Grep the invoices router for every handler taking `invoice_id` as a path param; confirm which ones join against `tenant_id` before returning data."
}
```

Field notes:
- `trap` is boolean; `trap_reasoning` is required whenever `trap` is true, and should still be filled in (briefly) when false, stating what was checked.
- `agreement` counts independently-reached clusters, not raw candidate count — two candidates from the same frame that happen to overlap do not count as agreement.
- `starred` is set by the critic in step 4 of §4, not self-reported by the generating branch (branches cannot self-evaluate, per §2).

## 6. Cost

| Mode | Diverge-phase agent count | Focus-phase agent count |
|---|---|---|
| Design | 6 (one per design frame) | 1 critic |
| Review | 4-6 (skip frames that duplicate ground already covered by a loaded stack card or checklist section for this codebase) | 1 critic |
| Debug | 6 (one per debug frame) | 1 critic |

Total: 5-7 agent calls per divergence run. §1's gate is the primary cost control — it decides whether this run happens at all. Once past the gate, the frame count itself should not be trimmed further as a cost-saving measure; a partial frame set reintroduces the anchoring/blind-spot risk the full catalogue exists to cover. Trim by skipping the whole exercise (§1), not by running fewer frames within it.
