---
title: Designing Data Intensive Applications
description: Vendored book rules from ciembor/agent-rules-books — see references/books/README.md and SKILL.md "Book References".
status: active
source: https://github.com/ciembor/agent-rules-books
upstream_path: designing-data-intensive-applications/claude/.claude/rules/designing-data-intensive-applications.md
upstream_commit: 2851b8535a86a6e6ea0210c013f95599b3b7c99f
license: MIT
---

# Designing Data-Intensive Applications

## Purpose

This repository follows **Designing Data-Intensive Applications** in the sense of Martin Kleppmann:
design systems around explicit trade-offs in reliability, scalability, maintainability, consistency, and data flow.

All code generation, edits, and reviews must optimize for:
- explicit data and consistency semantics
- idempotent and replay-safe processing
- clear ownership of truth
- durable boundaries between storage, messaging, and computation
- schema evolution awareness
- realistic distributed systems assumptions

This file is a binding engineering policy for Claude.

---

## Primary Directive

Data systems are defined by trade-offs.
When uncertain, make those trade-offs explicit instead of hiding them behind vague abstractions.

Always ask:
1. what is the source of truth?
2. what are the consistency expectations?
3. what happens on retries, duplicates, reordering, and partial failure?
4. how does the data evolve over time?
5. where is state durable, cached, derived, or ephemeral?

Do not design distributed behavior as if everything were local, ordered, and exactly once.

---

## Reliability Rules

1. Treat crashes, partial writes, duplicate work, timeouts, and stale reads as normal design inputs.
2. Make write acknowledgment semantics explicit.
3. Avoid hidden assumptions about durable success.
4. Design for restart, replay, and partial failure recovery.

Anti-patterns:
- side effects that cannot be retried safely
- no distinction between accepted, persisted, and applied
- assuming one successful response means all downstream effects succeeded

---

## Data Model and Storage Rules

1. Choose storage shape based on access patterns, consistency needs, and update behavior.
2. Do not force one storage pattern onto all workloads.
3. Keep the ownership of each dataset explicit.
4. Distinguish primary data from indexes, caches, projections, and search copies.

### Source of Truth
For every important piece of data, identify:
- primary owner
- derived copies
- replication path
- update path
- consistency expectation

Anti-patterns:
- many writable copies with no ownership
- cache quietly becoming the real source of truth
- denormalized copies with no repair strategy

---

## Consistency Rules

1. Be explicit about read-after-write expectations.
2. Be explicit about staleness tolerance.
3. Be explicit about conflict handling.
4. Use strong consistency only where the product truly requires it.
5. Use eventual consistency intentionally, not accidentally.

### Write Semantics
Document or encode:
- when a write is durable
- when it is visible
- whether readers may see stale data
- how conflicts are detected or resolved

Anti-patterns:
- “eventual consistency” used as a slogan instead of a contract
- stale-read bugs blamed on infrastructure with no product decision behind them
- no conflict model for concurrent updates

---

## Idempotency and Replay Rules

1. Handlers of commands, jobs, and events must tolerate retries where delivery or acknowledgment is uncertain.
2. Prefer deduplication keys or naturally idempotent state transitions.
3. Design processing to survive replay after crashes.
4. Never assume exactly-once delivery unless the system boundary truly provides it and the design proves it.

Anti-patterns:
- duplicate billing/order/send on retry
- handlers with non-repeatable side effects and no guard
- event processors depending on “it probably won't happen twice”

---

## Ordering Rules

1. Do not assume global order in distributed systems.
2. Require only the minimum ordering guarantees the business logic actually needs.
3. When ordering matters, define its scope:
   - per key
   - per stream
   - per partition
   - per aggregate
4. Keep ordering-sensitive logic close to the key or stream that defines the order.

Anti-patterns:
- implicit reliance on total ordering
- out-of-order events corrupting state because no versioning or sequence policy exists
- parallel consumers updating the same key with no ordering plan

---

## Event, Log, and Stream Rules

1. Distinguish commands, events, and materialized views clearly.
2. Events describe facts that happened; commands request action.
3. Logs and streams are durable histories, not merely transport pipes.
4. Consumers must tolerate lag, duplicates, restart, and replay.
5. Derived projections must be rebuildable where feasible.

### Event Design
- use stable identifiers
- include enough metadata for correlation and replay
- version payloads carefully
- keep semantics explicit

Anti-patterns:
- event payloads tied to one serializer or internal object layout
- projections that cannot be rebuilt
- assuming consumers keep up forever

---

## Schema Evolution Rules

1. Schemas will change; plan for it.
2. Version contracts intentionally.
3. Prefer backward- and forward-compatible changes where possible.
4. Keep old readers and writers in mind during rollout.
5. Distinguish internal refactors from contract changes.

Anti-patterns:
- breaking payloads or DB semantics without migration strategy
- reusing fields with new meaning
- silently changing enum or status semantics across services

---

## Partitioning and Locality Rules

1. Keep data and work colocated by the key that most often drives consistency or aggregation.
2. Partition by a domain-relevant key, not by convenience alone.
3. Be explicit about hot-key risk and skew.
4. Design cross-partition operations carefully.

Anti-patterns:
- partitioning that makes every common query cross-node
- no plan for skew or hotspots
- requiring cross-partition transactions for ordinary operations

---

## Transaction Rules

1. Use local transactions where they solve a real consistency problem cleanly.
2. Avoid distributed transactions as a default coordination strategy.
3. Prefer outbox, idempotent consumers, and compensating workflows where cross-boundary coordination is required.
4. Make atomicity scope explicit.

Anti-patterns:
- multi-system two-phase coordination by default
- side effects emitted outside transactional boundaries with no repair path
- pretending asynchronous side effects are atomic because they “usually happen”

---

## Derived Data Rules

1. Treat indexes, search copies, caches, and read models as derived data unless they are explicitly authoritative.
2. Derived data must be repairable, rebuildable, or re-syncable.
3. Know how lag affects user-visible behavior.
4. Keep derivation pipelines observable.

Anti-patterns:
- no way to rebuild projections
- no lag visibility
- mixing primary writes directly into derived stores with no ownership model

---

## API and Service Boundary Rules

1. Service boundaries must reflect data ownership and update semantics.
2. Do not split one tightly consistent business concept across many services casually.
3. Avoid chatty cross-service joins on hot paths.
4. Contracts must encode identifiers, versions, and failure semantics clearly.

---

## Review Rules for Claude

When reviewing code, actively look for:
- hidden assumptions about ordering
- hidden assumptions about exactly-once delivery
- lack of idempotency
- no source-of-truth ownership
- broken schema evolution practices
- no versioning or sequencing where concurrency matters
- side effects that cannot be repaired
- write paths that update several stores with unclear guarantees
- projections that cannot be rebuilt
- partitioning blind to locality or hotspots

---

## Forbidden Patterns

### Exactly-Once Wishful Thinking
- assuming a broker or queue magically prevents all duplicates
- writing non-idempotent handlers without safeguards

### Hidden Consistency Contract
- readers and writers disagreeing on freshness requirements
- stale or conflicting behavior treated as incidental instead of product design

### Multi-Write Chaos
- writing to several authorities in one operation with no atomicity or repair strategy
- side effects sent before durable state with no recovery path

### Schema Drift by Accident
- changing payload meaning without versioning
- reusing fields for new concepts
- no rollout compatibility strategy

---

## Code Generation Rules

When generating code, default to:
1. explicit identifiers and ownership
2. explicit idempotency where retries or duplicates can happen
3. explicit versioning or conflict strategy where ordering matters
4. explicit distinction between authoritative and derived data
5. repairable or rebuildable downstream state
6. compatibility-aware schema changes
7. observability for lag, retries, and failures

Avoid by default:
- assuming strict global order
- exactly-once promises with no proof
- writing the same fact into several places as if they were one transaction
- treating streams and queues as fire-and-forget

---

## Testing Rules

1. Test duplicate delivery handling.
2. Test out-of-order event or message handling where applicable.
3. Test replay safety.
4. Test conflict resolution or optimistic concurrency behavior.
5. Test schema compatibility when contracts evolve.
6. Test rebuild or repair of derived views where that capability exists.

---

## Review Checklist

Before finalizing any change, verify:
- Is the source of truth explicit?
- Are consistency expectations explicit?
- Is the code safe under retry or duplicate delivery?
- Is ordering dependency explicit and scoped?
- Can derived data be rebuilt or repaired?
- Is schema evolution considered?
- Is atomicity scope honest?
- Did we avoid exactly-once wishful thinking?
- Are service boundaries aligned with data ownership?
- Are lag and failure observable?

If any answer is no, revise before shipping.

---

## Final Instruction

When uncertain, choose the design that:
1. makes data ownership explicit
2. makes consistency semantics explicit
3. survives retries, duplicates, and replay
4. supports evolution without silent breakage
5. treats distributed systems trade-offs honestly

Do not hide distributed complexity behind local-looking code.
