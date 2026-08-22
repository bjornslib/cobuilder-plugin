---
title: Domain Driven Design Distilled
description: Vendored book rules from ciembor/agent-rules-books — see references/books/README.md and SKILL.md "Book References".
status: active
source: https://github.com/ciembor/agent-rules-books
upstream_path: domain-driven-design-distilled/claude/.claude/rules/domain-driven-design-distilled.md
upstream_commit: 2851b8535a86a6e6ea0210c013f95599b3b7c99f
license: MIT
---

# Domain-Driven Design Distilled

## Purpose

This repository follows **Domain-Driven Design Distilled**:
use the smallest effective set of DDD practices to model the business meaning clearly and deliver results quickly.

All code generation, edits, and reviews must optimize for:
- clear business language
- explicit bounded contexts
- focus on core domain complexity
- selective use of tactical DDD patterns
- practical implementation over ceremony
- collaboration between model and software design

This file is a binding engineering policy for Claude.

---

## Primary Directive

Use DDD where it clarifies complex business software.
Do not turn DDD into ritual.

When uncertain:
1. identify the business capability or subdomain
2. decide whether it is core, supporting, or generic
3. define the bounded context
4. use the local ubiquitous language
5. apply only the tactical patterns that actually earn their cost

Reject both extremes:
- no modeling when the domain is complex
- full-blown DDD ceremony when the problem is simple

---

## Strategic Rules

### Start with Subdomains
Classify major areas as:
- core domain
- supporting subdomain
- generic subdomain

Rules:
1. Invest the most design effort in the core domain.
2. Keep supporting and generic subdomains simpler unless complexity proves otherwise.
3. Do not waste the best modeling effort on commodity concerns.

### Define Bounded Contexts Early
1. Every meaningful model lives inside a bounded context.
2. A bounded context owns its language, rules, and model semantics.
3. The same term may mean different things in different contexts.
4. Code structure must reflect context boundaries.

### Use Context Mapping
1. Make context relationships explicit.
2. Translate where meanings differ.
3. Own integration contracts deliberately.
4. Protect the local model from foreign language.

Anti-patterns:
- one model reused across billing, identity, catalog, fulfillment, and support
- shared domain classes with subtly different meanings
- context boundaries documented but ignored in code

---

## Ubiquitous Language Rules

1. Use domain terms from the current bounded context in code, tests, commands, events, and conversations.
2. One concept gets one term.
3. One term must not carry multiple meanings inside one context.
4. Rename code when understanding improves.
5. Prefer domain names over technical placeholders.

Avoid:
- `Manager`
- `Handler`
- `Processor`
- `Data`
- `EntityInfo`
- `BusinessObject`

---

## Tactical Pattern Rules

### Entities
Use entities when identity and lifecycle matter.

Rules:
1. Entities must have explicit identity.
2. Entities must protect meaningful state transitions.
3. Do not expose unrestricted mutation by default.

### Value Objects
Use value objects aggressively when a primitive hides meaning.

Rules:
1. Value objects are immutable by default.
2. They validate themselves.
3. They make code read in domain language.

### Aggregates
Use aggregates only where invariants require a consistency boundary.

Rules:
1. Keep aggregates small.
2. Protect invariants through the aggregate root.
3. Reference other aggregates by identity.
4. Avoid loading large object graphs.

### Repositories
Use repositories to access aggregates in domain terms.

Rules:
1. Repository contracts belong to the model or application that needs them.
2. Repositories return domain objects or domain-shaped results.
3. Repositories are not generic table CRUD bags.

### Domain Events
Use domain events for meaningful facts.

Rules:
1. Name events in the past tense.
2. Use events when they clarify collaboration or integration.
3. Do not publish trivial noise for every field change.

### Domain Services
Use a domain service only when behavior is domain-significant and fits no single entity or value object naturally.

Anti-patterns:
- moving all behavior into services
- creating services that are only wrappers around repositories

---

## Aggregate Minimalism Rules

1. Do not create large aggregates to make navigation convenient.
2. Default to smaller boundaries.
3. Default to eventual consistency across aggregates.
4. Use IDs for references across aggregate boundaries.
5. One transaction should usually change one aggregate.

Anti-patterns:
- aggregate designed around a screen
- one request loading and mutating a whole graph
- aggregate roots exposing mutable children directly

---

## Application Service Rules

1. Application services coordinate use cases.
2. They load aggregates, call domain behavior, save results, and trigger integration work.
3. They must not become the real domain model.
4. They should stay thin enough that the model still carries meaning.

Anti-patterns:
- all business decisions in application services
- controllers duplicating application orchestration
- application services shaped only by transport

---

## Architecture and Infrastructure Rules

1. Infrastructure is a detail.
2. Keep frameworks, ORM mechanics, serializers, HTTP requests, and vendor SDKs out of the domain model.
3. Persist aggregates without letting persistence define the model.
4. Translate transport and integration data at the boundary.

Anti-patterns:
- persistence-first modeling
- reusing DTOs as domain objects
- domain methods depending on framework types

---

## Collaboration Rules

1. Keep names close to real business terms.
2. Prefer code that teaches the model to a reader.
3. Make domain assumptions explicit in names, tests, and events.
4. Where a concept is fuzzy, do not hide the ambiguity behind technical abstractions.

Anti-patterns:
- generic code that could belong to any business
- unexplained status codes and flags with domain meaning
- enums and booleans where a richer concept is needed

---

## Practicality Rules

1. Use the least expensive pattern that honestly models the problem.
2. Simple domains may use simple services and data structures.
3. Once invariants, lifecycle, and language complexity rise, strengthen the model.
4. Prefer incremental improvement over massive design overhauls.

Anti-patterns:
- dismissing DDD because not every module needs it
- over-modeling a generic subsystem
- introducing aggregates, factories, repositories, and events before knowing why

---

## Code Generation Rules

When generating code, use this default order:
1. identify the subdomain
2. identify the bounded context
3. write names in the local ubiquitous language
4. decide whether a concept is entity, value object, aggregate, service, repository, or event
5. choose the smallest tactical pattern that fits
6. isolate infrastructure at boundaries
7. keep context translation explicit

Default avoidance:
- giant shared domain packages
- service-centric fake DDD
- technical names replacing domain language
- full tactical DDD in trivial modules

---

## Review Rules for Claude

When reviewing code, actively look for:
- missing subdomain classification
- missing bounded context ownership
- context bleeding
- no context translation where meanings differ
- primitive obsession
- anemic entities
- no value objects where concepts repeat
- aggregates too large
- services containing all behavior
- excessive ceremony in simple modules
- no modeling at all in complex modules

---

## Testing Rules

1. Domain tests must read in the ubiquitous language.
2. Test value objects for validation and behavior.
3. Test entities and aggregates for valid and invalid transitions.
4. Test application services for orchestration, not for all domain rules.
5. Test context translation where external or foreign models exist.

---

## Review Checklist

Before finalizing any change, verify:
- Is the subdomain/core importance understood?
- Is the bounded context explicit?
- Is the ubiquitous language visible in the code?
- Did we use only the tactical patterns that genuinely help?
- Are aggregates small and focused on invariants?
- Are value objects used where they clarify meaning?
- Are application services coordinating rather than owning all domain logic?
- Did we keep infrastructure out of the model?
- Did we avoid DDD theater and over-modeling?

If any answer is no, revise before shipping.

---

## Final Instruction

When uncertain, choose the option that:
1. sharpens the business language
2. clarifies the bounded context
3. models real complexity honestly
4. avoids unnecessary ceremony
5. keeps the design practical enough to deliver

Use DDD selectively, but seriously.
