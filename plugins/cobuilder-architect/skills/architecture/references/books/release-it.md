---
title: Release It
description: Vendored book rules from ciembor/agent-rules-books — see references/books/README.md and SKILL.md "Book References".
status: active
source: https://github.com/ciembor/agent-rules-books
upstream_path: release-it/claude/.claude/rules/release-it.md
upstream_commit: 2851b8535a86a6e6ea0210c013f95599b3b7c99f
license: MIT
---

# Release It!

## Purpose

This repository follows **Release It!** in the sense of Michael Nygard:
design and implement software that survives production reality - failures, overload, latency, partial outages, bad data, hostile traffic, and operational mistakes.

All code generation, edits, and reviews must optimize for:
- production readiness
- failure isolation
- graceful degradation
- backpressure and overload protection
- timeouts and retries with discipline
- observability
- survivability over ideal-path elegance

This file is a binding engineering policy for Claude.

---

## Primary Directive

Assume production will be messy.

When uncertain, choose the design that:
1. fails visibly instead of hanging silently
2. limits blast radius instead of maximizing coupling
3. sheds load instead of collapsing
4. preserves core service under stress
5. makes diagnosis possible

Do not design only for the happy path.

---

## Stability Mindset Rules

1. Every dependency can be slow, unavailable, or wrong.
2. Every queue can fill.
3. Every cache can miss or stampede.
4. Every timeout can cascade.
5. Every caller can retry badly.
6. Every “temporary” degraded state can become normal for hours.

The code must assume these conditions, not merely tolerate them by accident.

---

## Dependency Protection Rules

### Timeouts Are Mandatory
1. Outbound calls must have explicit time limits.
2. Timeouts must be chosen intentionally, not left to library defaults.
3. Different dependencies may need different timeout budgets.
4. Infinite waits are forbidden.

### Retries Must Be Disciplined
1. Retry only where the operation is safe or idempotent.
2. Bound retry count and total retry time.
3. Add jitter/backoff to avoid synchronized retry storms.
4. Do not retry validation errors or permanent failures.

### Circuit Breakers and Fast Failure
1. Protect unstable dependencies with fast-fail mechanisms when appropriate.
2. When a dependency is clearly unhealthy, stop flooding it.
3. Surface fallback or degraded mode explicitly.

### Bulkheads and Isolation
1. Separate resource pools for unrelated workloads where failure isolation matters.
2. One failing integration must not consume all threads, connections, or worker capacity.
3. Isolate slow or risky work from core request paths.

Anti-patterns:
- nested retries at multiple layers
- no timeout around remote calls
- one shared pool for all outbound work
- treating all failures as transient

---

## Load and Capacity Rules

### Backpressure
1. The system must have a strategy for overload.
2. Reject, defer, queue, or degrade intentionally.
3. Unbounded acceptance of work is forbidden.

### Queues
1. Queues are buffers, not infinite storage.
2. Monitor queue length, age, throughput, and failure rate.
3. Know what happens when producers outpace consumers.
4. Define dead-letter or poison-message handling explicitly.

### Rate Limiting and Admission Control
1. Protect scarce resources with limits.
2. Prefer early rejection over total collapse.
3. Reserve capacity for critical traffic when appropriate.

### Load Shedding
1. Define which work is optional under stress.
2. Shed low-value work first.
3. Preserve core functions whenever possible.

Anti-patterns:
- unbounded queues
- accepting work with no plan to finish it
- letting best-effort tasks crowd out critical work

---

## State and Data Safety Rules

1. Design state transitions to be restart-safe where possible.
2. Make operations idempotent when retries or duplicate delivery are possible.
3. Use durable handoff for important asynchronous work.
4. Avoid partial updates with unclear compensation strategy.
5. Validate assumptions at system boundaries.

### Idempotency
Required when:
- clients may retry
- jobs may rerun
- events may redeliver
- timeouts may obscure whether work completed

Anti-patterns:
- duplicate charge/order/send operations on retry
- side effects before durable state change with no recovery plan
- hidden dependence on “exactly once”

---

## Resource Management Rules

1. Explicitly budget scarce resources:
   - threads
   - DB connections
   - sockets
   - file descriptors
   - memory
   - CPU-intensive worker slots
2. Release resources deterministically.
3. Do not hold locks or expensive connections across slow remote calls.
4. Use streaming or pagination for large payloads where appropriate.
5. Guard memory-heavy operations.

Anti-patterns:
- one huge in-memory batch by default
- blocking worker threads on slow I/O when a better model exists
- connection pools sized by guess and then ignored

---

## Data Boundary Rules

1. Treat all external input as untrusted.
2. Validate syntax, shape, and business plausibility separately where needed.
3. Avoid letting malformed data poison caches, queues, or downstream systems.
4. Normalize and sanitize data once at the right boundary.
5. Keep parsing errors and domain rule violations distinct.

---

## Operational Visibility Rules

### Observability Is Part of the Design
1. Emit meaningful logs at boundaries and failure points.
2. Include identifiers needed for correlation and diagnosis.
3. Measure latency, throughput, error rate, saturation, queue depth, and retry behavior.
4. Expose health information that reflects real dependency state.

### Logging
1. Log structured context, not just prose.
2. Log failures with the dependency, operation, and outcome.
3. Do not log secrets.
4. Avoid log spam loops under retry storms.

### Metrics
At minimum, capture:
- request rate
- success/failure counts
- dependency latency
- timeout counts
- queue depth
- retry counts
- circuit-breaker state
- saturation signals

Anti-patterns:
- only logging stack traces without context
- no metrics for slow dependencies
- health checks that always return green despite broken downstreams

---

## Deployment and Startup Rules

1. Startup must fail fast on missing critical configuration.
2. Readiness must reflect actual ability to serve.
3. Liveness must not mask deadlocks or stuck subsystems.
4. Avoid expensive or destructive startup work in request-serving processes when possible.
5. Migrations and one-time jobs must be deliberate, observable, and recoverable.

---

## API and Contract Rules

1. Make failure modes explicit in API contracts where they matter.
2. Return clear retryable vs non-retryable outcomes.
3. Prefer coarse-grained, resilient interactions over fragile chattiness.
4. Use versioning and compatibility discipline for long-lived contracts.
5. Document idempotency expectations clearly.

---

## Cache Rules

1. Cache is an optimization, not a source of truth unless explicitly designed that way.
2. Plan for cache miss storms, stale data, and cache outages.
3. Avoid dogpiles with request coalescing or appropriate expiry strategies.
4. Define what happens when the cache is unavailable.

Anti-patterns:
- assuming cache hit rate is always high
- rebuilding the whole cache synchronously on miss
- hiding correctness assumptions inside cache behavior

---

## Background Work Rules

1. Background jobs must be restart-safe.
2. Job handlers must tolerate duplicate delivery or re-execution where applicable.
3. Failure and retry policy must be explicit.
4. Poison work items must not loop forever.
5. Long-running jobs need progress, timeout, and cancellation strategy.

---

## Review Rules for Claude

When reviewing code, actively look for:
- outbound calls with no timeout
- retries without idempotency
- no backoff or jitter
- unbounded queues or buffers
- shared resource pools with no isolation
- no overload strategy
- no failure visibility
- hidden duplicate side effects
- health checks that say nothing meaningful
- background jobs that are not restart-safe
- caches treated as always available

---

## Forbidden Patterns

### Happy-Path Design
- code that assumes dependencies are fast and correct
- no timeout, no retry discipline, no degradation path

### Retry Storms
- retries at every layer
- retries on non-idempotent actions
- synchronized retries without jitter

### Collapse by Queue
- unbounded queue growth
- taking work forever even while falling behind
- no poison-message handling

### Silent Failure
- swallowed exceptions
- generic “something went wrong” without context
- missing correlation information

### Blast-Radius Amplification
- one dependency outage consuming all worker threads or DB connections
- shared pools for all risk classes with no isolation

---

## Code Generation Rules

When generating code, default to:
1. explicit timeout for every remote dependency
2. explicit retry policy only where safe
3. idempotent handling where retries or duplicates are possible
4. bounded resources and queues
5. clear failure paths
6. useful telemetry hooks
7. graceful degradation or fast failure where appropriate

Avoid by default:
- infinite waits
- implicit library retries
- unbounded buffering
- best-effort logging with no metrics
- fragile startup sequences
- assuming exactly-once delivery

---

## Testing Rules

1. Test timeout behavior.
2. Test retry boundaries and idempotency.
3. Test degraded dependency scenarios.
4. Test overload and queue saturation behavior where practical.
5. Test duplicate delivery or repeated execution for background work.
6. Test startup and readiness failure modes.

---

## Review Checklist

Before finalizing any change, verify:
- Does every remote call have an explicit timeout?
- Are retries bounded and safe?
- Is the operation idempotent where retries or duplicates are possible?
- Is there an overload strategy?
- Are queues and resource pools bounded?
- Is failure isolated from unrelated work?
- Is there enough telemetry to diagnose issues?
- Are health/readiness signals meaningful?
- Can background work be retried safely?
- Did we preserve the core service under likely failure scenarios?

If any answer is no, revise before shipping.

---

## Final Instruction

When uncertain, choose the design that:
1. survives partial failure
2. limits blast radius
3. fails fast or degrades gracefully
4. exposes enough information to operate
5. prevents overload from becoming collapse

Production reality outranks happy-path elegance.
