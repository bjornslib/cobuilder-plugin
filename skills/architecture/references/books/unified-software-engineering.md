---
title: Unified Software Engineering
description: Vendored book rules from ciembor/agent-rules-books — see references/books/README.md and SKILL.md "Book References".
status: active
source: https://github.com/ciembor/agent-rules-books
upstream_path: unified-software-engineering/claude/.claude/rules/unified-software-engineering.md
upstream_commit: 2851b8535a86a6e6ea0210c013f95599b3b7c99f
license: MIT
---

# Unified Software Engineering

## Purpose

This repository follows a unified software engineering rule set synthesized from the existing book-inspired rules.

All code generation, edits, reviews, refactors, tests, and documentation changes must optimize for:
- readable code that communicates intent
- low accidental complexity
- clear ownership of business rules and data
- explicit architectural boundaries
- safe incremental change
- domain language where domain complexity exists
- production survivability
- fast, trustworthy feedback
- maintainability over cleverness

This file is a binding engineering policy for Claude.

Use this unified set as one comprehensive default. Do not combine it with every individual book rule set unless the task explicitly needs a stronger specialized emphasis; duplicated or competing instructions reduce model reliability.

---

## Primary Directive

When uncertain, choose the option that makes the system easier to understand, safer to change, and more honest about its real constraints.

Prefer designs that:
1. reduce the number of facts a reader must hold at once
2. put each business rule in one authoritative place
3. keep volatile details behind stable boundaries
4. make data ownership and consistency explicit
5. survive partial failure, retries, and operational stress
6. preserve behavior during structural change
7. shorten feedback loops

Reject designs that merely appear simpler by hiding complexity in callers, frameworks, databases, global state, queues, or operational assumptions.

---

## Conflict Resolution Rules

Apply these rules when engineering principles appear to disagree.

### Simplicity vs Rich Modeling
- Use the simplest design that honestly represents the problem.
- Simple CRUD or administrative workflows may use transaction scripts or simple service-layer code.
- Complex business rules, lifecycles, invariants, and language distinctions require richer domain modeling.
- Do not use DDD patterns as ceremony in generic or low-complexity subdomains.
- Do not flatten real domain complexity into passive records and procedural services.

### Small Functions vs Deep Modules
- Functions and routines should be cohesive and understandable.
- Prefer small units when they clarify intent, isolate responsibility, or simplify testing.
- Avoid chains of tiny pass-through functions that force readers to jump constantly.
- A module may contain internal complexity when its public interface is small, meaningful, and stable.

### DRY vs Premature Abstraction
- Remove duplicated knowledge, not merely duplicated text.
- Centralize business rules, validation semantics, mappings, status meanings, and calculations.
- Keep similar code separate when the similarity is coincidental or the shared abstraction would be vague.

### Boundaries vs Overengineering
- Introduce explicit boundaries around volatility, external systems, persistence, frameworks, time, randomness, and cross-context translation.
- Do not add layers that only forward calls.
- Every abstraction must reduce coupling, hide complexity, clarify ownership, or protect a contract.

### Strong Consistency vs Eventual Consistency
- Protect invariants that must hold immediately inside the smallest useful consistency boundary.
- Prefer one aggregate or one local transaction as the default atomic unit.
- Use eventual consistency across aggregates, services, or contexts when immediate consistency is not a real product requirement.
- Always make consistency, staleness, conflict, and retry semantics explicit.

### Comments vs Self-Documenting Code
- Improve names and structure before adding comments.
- Use comments for contracts, invariants, rationale, non-obvious constraints, legal requirements, and external protocol assumptions.
- Delete comments that narrate obvious code, repeat names, or describe obsolete behavior.

### Refactor vs Preserve Behavior
- Refactoring must preserve observable behavior.
- If behavior must change, keep the behavior change distinct from structural cleanup where practical.
- Use small, verified transformations instead of big-bang rewrites.

---

## Default Work Workflow

For every non-trivial task:

1. Understand the requested behavior and the affected area.
2. Identify the current safety net: tests, types, assertions, logs, examples, or manual checks.
3. If the area is risky or unclear, characterize current behavior before redesigning it.
4. Identify the simplest change that preserves or improves architecture.
5. Make preparatory refactors only when they make the requested change safer or clearer.
6. Implement the behavior or structural change in small reviewable steps.
7. Add or update proportionate tests and checks.
8. Review the diff for duplication, naming, boundary leaks, hidden assumptions, and operational risk.
9. Stop when the requested change is done and further cleanup would be speculative.

Do not silently broaden scope beyond the task.

---

## Naming and Language Rules

- Use intention-revealing names.
- Names must describe purpose, role, behavior, or domain meaning.
- Use one term for one concept inside a boundary.
- Do not use one term for multiple concepts inside the same boundary.
- Avoid misleading names, vague names, private jokes, and visually confusable identifiers.
- Avoid abbreviations unless they are established domain or platform standards.
- Avoid type prefixes, Hungarian notation, and implementation encodings in names.
- Class, type, and module names should usually be nouns or noun phrases.
- Function and method names should usually be verbs, verb phrases, or precise query phrases.
- Use problem-domain names for domain concepts.
- Use solution-domain names for technical concepts.
- Prefer domain-specific names over generic pattern names in public APIs.
- Rename code when understanding improves.

Avoid names such as `Manager`, `Processor`, `Handler`, `Helper`, `Util`, `Common`, `Data`, `Info`, and `Service` when a more precise role or domain term exists.

If a class is named `Service`, it must be clear whether it is:
- an application use case coordinator
- a domain service expressing a domain concept
- an infrastructure adapter
- a temporary legacy boundary

---

## Communication and Documentation Rules

- Code is communication first.
- Use tests, examples, and clear APIs as living documentation where possible.
- Keep design documents short enough to maintain.
- Keep diagrams focused on boundaries, relationships, invariants, lifecycle, and data flow rather than class inventory.
- Keep glossaries or terminology notes close to the bounded context they describe.
- Update documents when terminology, boundaries, contracts, or operational behavior changes.
- Prefer plain text, diffable formats, and inspectable configuration for long-lived automation and integration.

Comments should explain:
- why an abstraction exists
- interface contracts
- invariants and preconditions
- surprising decisions
- external protocol assumptions
- operational constraints
- legal or licensing requirements

Comments must not compensate for:
- bad names
- poor decomposition
- confusing control flow
- missing domain concepts
- stale design documents

---

## Construction Rules

### Foundational Rules

- Write code primarily for human readers.
- Prefer explicit, boring, maintainable solutions.
- Favor clarity, locality, and consistency over cleverness.
- Use existing project conventions unless they conflict with these rules or the user explicitly asks otherwise.
- Prefer standard library and existing local helpers over new dependencies.
- Add a dependency only when it clearly reduces total complexity.
- Keep partial work from rotting in long-lived isolation.
- Make correctness easier to achieve than incorrectness.

### Functions and Routines

- A routine should have one coherent purpose.
- Keep each routine at one level of abstraction.
- Keep interfaces small and hard to misuse.
- Prefer descriptive names over short clever names.
- Minimize parameters.
- Replace repeated parameter groups with meaningful objects or parameter objects.
- Avoid boolean flag parameters; split behavior or model the mode explicitly.
- Avoid output parameters unless language conventions make them necessary.
- Separate commands from queries.
- A function that answers a question should not also mutate state.
- Isolate error handling from the main path.
- Prefer guard clauses when they clarify the happy path.
- Split parsing, validation, computation, I/O, and formatting when they are conceptually different.
- Delete dead code instead of commenting it out.

### Variables and Data

- Keep variable scope as small as practical.
- Initialize variables deliberately.
- Prefer immutability when mutation adds no value.
- Use constants, enums, value objects, or richer types instead of magic values and unexplained sentinels.
- Use names that expose units, meaning, and lifecycle.
- Avoid long-lived mutable locals that carry multiple meanings.
- Avoid pass-through variables that do not clarify intent.
- Encapsulate mutable state behind intention-revealing operations.

### Control Flow

- Prefer straightforward control flow over clever control flow.
- Keep nesting shallow when possible.
- Replace complicated boolean logic with named predicates or clearer structure.
- Use table-driven or data-driven logic for stable explicit mappings.
- Do not hide complex logic in inscrutable data encodings.
- Remove impossible paths and dead branches.
- Keep explicit conditionals when they are simple and honest.
- Use polymorphism, strategies, tables, or stronger models only when they reduce real repeated branching or clarify behavior.

### Defensive Programming and Contracts

- Validate syntax, shape, and trust-boundary input explicitly.
- Encode important invariants close to the code they protect.
- Use assertions for programmer assumptions.
- Use validation for external input.
- Use domain errors for expected business failures.
- Distinguish recoverable conditions, permanent failures, and programming errors.
- Do not silently continue from corrupted or impossible state.
- Provide enough error context for diagnosis.
- Keep cleanup and shutdown paths correct and visible.
- Do not return or pass `null`-like sentinels when a safer model exists.

---

## Module, Interface, and Dependency Design

### Complexity Management

- Treat complexity as a defect risk.
- Watch for change amplification, cognitive load, unknown unknowns, hidden dependencies, and temporal coupling.
- Put complexity in one place rather than many.
- Hide volatile decisions behind stable interfaces.
- Prefer a slightly more complex implementation when it makes many callers simpler.
- Eliminate special cases by improving interfaces or invariants where possible.
- Use special-general decomposition when rare behavior clutters the main path.

### Deep Modules and Interfaces

- Prefer deep modules: simple public interface, substantial hidden value.
- Avoid shallow modules that only rename or forward calls.
- Design interfaces around what clients need to know, not how the implementation works.
- Keep public APIs small, semantic, and hard to misuse.
- Avoid call-order traps and half-initialized objects.
- Avoid flags and mode parameters that expose internal implementation choices.
- Hide data representations, storage shape, caching details, transport mechanics, and normalization rules.

### Cohesion and Coupling

- Each module should have a focused reason to change.
- Keep related concepts close together.
- Split modules that accumulate unrelated behavior.
- Organize code so likely changes remain local.
- Prefer composition over complex inheritance unless inheritance is clearly simpler and stable.
- Minimize global state, ambient context, singletons, and shared mutable state.
- Separate policy from mechanism, data from presentation, orchestration from computation, and domain logic from infrastructure.

---

## Architecture and Boundary Rules

### Dependency Direction

- Business rules must not depend on frameworks, web handlers, ORMs, database drivers, UI libraries, queues, SDKs, or vendor APIs.
- Inner policy layers define the abstractions they need.
- Outer detail layers implement those abstractions.
- Source dependencies for core policy must point inward toward stable business rules.
- Keep framework annotations, decorators, controllers, routes, serializers, ORM artifacts, and SDK clients at the edges.
- Object construction and dependency wiring belong in the composition root or outer layer.

### Layer Responsibilities

Domain layer:
- owns entities, value objects, domain services, invariants, and core business rules
- stays framework-free, persistence-ignorant, and delivery-agnostic
- does not perform I/O or read configuration directly

Application layer:
- owns use cases, input models, output models, ports, and orchestration
- coordinates workflows explicitly
- defines interfaces for external behavior it needs
- does not contain HTTP, ORM, SQL, or presentation formatting unless explicitly modeling a presenter boundary

Interface adapter layer:
- owns controllers, presenters, view models, repository implementations, gateway adapters, and mapping code
- translates between external formats and internal models
- does not move business policy out of the use case or domain model

Infrastructure layer:
- owns framework bootstrap, dependency injection, database details, SDK integrations, message bus clients, filesystem access, and network clients
- remains replaceable
- implements interfaces owned by inner layers

### Use Case Rules

- Identify the use case for every non-trivial feature.
- A use case represents one application action.
- A use case coordinates entities, repositories, gateways, and side effects.
- Use cases must not know about HTTP, JSON transport, cookies, headers, routing, framework sessions, or raw SQL rows.
- Controllers and endpoints translate delivery input into use-case input.
- Presenters or response mappers translate use-case output into delivery output.

### Business Logic Pattern Selection

Choose the smallest pattern that fits actual complexity:

- Use transaction script when logic is simple and request-oriented.
- Use table module or table gateway when behavior is naturally tabular or set-oriented.
- Use a rich domain model when identity, lifecycle, collaboration, and invariants matter.
- Use active record only when domain logic is simple and persistence coupling is acceptable.
- Use service layer for application operations and transaction orchestration.
- Use repository and data mapper when the domain model should remain decoupled from persistence.
- Use row data gateway or table data gateway for simpler record-oriented data access.
- Use remote facade and DTOs for remote boundaries where coarse-grained transport contracts reduce chattiness.

Do not wrap trivial CRUD in excessive modeling. Do not trap complex business rules in scripts, controllers, or database code.

### Enterprise Boundary Rules

- Presentation handles input, rendering, and transport, not business decisions.
- Repository interfaces should reflect use cases or aggregate access patterns, not raw tables.
- DTOs are boundary structures, not domain models.
- Mapping must be explicit and testable.
- Transaction boundaries must be explicit in application workflow.
- Avoid transactions that span remote calls.
- Keep transactions short.
- Use optimistic locking when conflicts are possible but uncommon.
- Use pessimistic locking only when contention is expected and justified.
- Use identity map and unit of work deliberately when object identity and transactional write coordination need a clear scope.
- Use lazy loading deliberately and guard against hidden N+1 queries, serialization surprises, and loop-triggered database chatter.
- Remote APIs must be coarse-grained and version-aware.
- Do not pretend network calls are local method calls.

---

## Domain Modeling Rules

### Strategic Domain Design

- Identify the bounded context before modeling substantial domain behavior.
- A model is valid only inside its bounded context.
- Terms may differ across contexts; respect local meanings.
- Classify areas as core, supporting, or generic subdomains.
- Invest the richest modeling effort in the core domain.
- Keep supporting and generic subdomains simpler unless real complexity proves otherwise.
- Protect the core domain from foreign models, vendor schemas, legacy vocabulary, and generic platform abstractions.
- Make context relationships visible in code, integration adapters, tests, or documentation.
- Use shared kernel only for a small, jointly governed model subset.
- Use customer/supplier, conformist, anticorruption layer, separate ways, open host service, or published language deliberately.

### Ubiquitous Language

- Use business terms exactly as they are understood in the current bounded context.
- Use the same vocabulary in code, tests, commands, events, repositories, APIs, and conversations.
- Rename code when the model improves.
- Prefer executable examples and tests over disconnected documentation.
- When language is ambiguous, do not hide ambiguity behind generic technical names.

### Knowledge Crunching and Model Discovery

- Treat the model as discovered through domain understanding, not copied from database tables or UI forms.
- Let awkward code, contradictory names, repeated conditionals, and fuzzy statuses trigger deeper modeling.
- Promote hidden constraints, policies, lifecycles, and processes into explicit concepts.
- Use scenario walkthroughs to test whether the model collaborates naturally.
- If a better model explains many special cases, migrate toward it incrementally.

### Entities

- Use entities when identity, continuity, and lifecycle matter.
- Entities must have explicit stable identity.
- Entities must protect meaningful state transitions.
- Expose intention-revealing behavior, not arbitrary setters.
- Do not use entities as passive ORM containers in behavior-rich domains.

### Value Objects

- Use value objects when a concept is defined by attributes rather than identity.
- Use value objects when a primitive hides meaning, validation, units, or behavior.
- Value objects are immutable by default.
- Construction must guarantee validity.
- Equality is by value.
- Keep validation and behavior near the concept.

Examples of concepts that often deserve value objects: money, email address, date range, percentage, policy number, quantity, currency, tenant ID, product ID, order quantity, reservation window.

### Aggregates

- Aggregates are consistency boundaries, not object graphs.
- Design aggregates around invariants that must hold immediately.
- Keep aggregates small.
- Only the aggregate root may be referenced directly from outside.
- All invariant-changing operations must go through the root.
- Internal members must not be mutated directly by external code.
- Reference other aggregates by identity unless stronger consistency is truly required.
- Modify one aggregate per transaction by default.
- Use events, policies, or process coordination for cross-aggregate workflows where consistency can be eventual.

Avoid aggregate boundaries shaped by ORM navigation, screen layout, or convenience loading.

### Domain Services

- Use a domain service only when behavior is domain-significant and fits no single entity or value object naturally.
- A domain service must speak the ubiquitous language.
- Domain services coordinate domain concepts, not infrastructure details.
- Do not move behavior into services merely to keep entities thin.

### Repositories

- Repositories exist for aggregate roots or clear domain access needs.
- Repository interfaces belong to the domain or application code that needs them.
- Repositories reconstitute and persist aggregates.
- Repository APIs should reflect aggregate access needs and domain intent.
- Repositories must return domain objects or domain-oriented results, not ORM rows or transport DTOs.
- Keep mapping and persistence mechanics hidden in implementations.

Avoid giant generic repositories, one repository per table by reflex, and business rules inside repository implementations.

### Factories

- Use factories when valid creation is complex, business-significant, or requires multiple collaborating values.
- Factories must create valid objects.
- Factories encode domain creation rules, not merely technical object assembly.
- Do not use a factory only to hide a trivial constructor.

### Domain Events

- Emit domain events for meaningful business facts.
- Event names must be in the past tense.
- Event payloads should contain domain-relevant facts.
- Use events to coordinate across aggregates or contexts when immediate consistency is not required.
- Do not publish trivial noise for every field change.
- Do not use events to compensate for missing aggregate design.
- Domain events are model concepts, not transport mechanics.

### Specifications, Policies, and Explicit Constraints

- Extract repeated business conditions into named domain concepts.
- Use specifications for named, combinable business rules that answer whether something satisfies a criterion.
- Keep specifications in domain language, not merely query language.
- Use strategy or policy objects when interchangeable domain policies are real model concepts.
- Do not name public domain APIs after generic design patterns when a business term exists.

### Application Services in Domain-Oriented Systems

- Application services load aggregates, call domain behavior, persist results, publish resulting events, and coordinate side effects.
- Application services may own transaction boundaries.
- They must not contain core business invariants that belong in the domain model.
- They should be thin enough that the model still matters.

### Translation and Anticorruption

- Translate at context boundaries.
- Translate between domain objects and transport or persistence representations where needed.
- Keep foreign schemas, statuses, IDs, DTOs, and vendor vocabulary out of the local core model.
- Use an anticorruption layer when protecting a local model from a foreign, legacy, or partner model.
- Do not pass local aggregates directly across context boundaries.
- Keep contract models separate from local models.

### Distillation and Large-Scale Structure

- Make the core domain easy to find in code.
- Use a short domain vision statement, highlighted core, segregated core, cohesive mechanism, generic subdomain, or abstract core when it clarifies priorities.
- Let large-scale structure evolve with the model.
- Use responsibility layers, knowledge level, system metaphor, evolving order, or pluggable component framework only when they reduce cognitive load.
- Strategic design decisions must stay revisable as domain understanding changes.
- Keep architecture teams and strategic decisions connected to implementation feedback and customer/domain needs.

---

## Data-Intensive System Rules

### Source of Truth

For every important dataset, identify:
- primary owner
- derived copies
- replication path
- update path
- read path
- consistency expectation
- repair or rebuild strategy

Do not allow caches, indexes, denormalized copies, search projections, or analytics stores to quietly become authoritative unless explicitly designed that way.

### Consistency and Write Semantics

- Be explicit about read-after-write expectations.
- Be explicit about staleness tolerance.
- Be explicit about conflict detection and resolution.
- Use strong consistency only where the product requires it.
- Use eventual consistency intentionally, not accidentally.
- Document or encode when a write is accepted, durable, visible, and applied.
- Make atomicity scope honest.

### Idempotency, Retry, and Replay

- Handlers of commands, jobs, events, and client requests must tolerate retries where delivery or acknowledgment is uncertain.
- Prefer deduplication keys, request IDs, natural idempotency, or monotonic state transitions.
- Design processing to survive restart and replay.
- Never assume exactly-once delivery unless the system boundary truly provides it and the design proves it.
- Avoid side effects that cannot be safely repeated or repaired.

### Ordering

- Do not assume global order in distributed systems.
- Require only the minimum ordering the business logic needs.
- Define ordering scope: per key, stream, partition, aggregate, tenant, or account.
- Keep ordering-sensitive logic close to the key or stream that defines order.
- Use versions, sequence numbers, optimistic concurrency, or conflict policies where out-of-order updates matter.

### Events, Logs, and Streams

- Distinguish commands, events, and materialized views.
- Commands request action; events state facts that happened.
- Logs and streams are durable histories, not merely transport pipes.
- Consumers must tolerate lag, duplicates, restart, and replay.
- Derived projections should be rebuildable where feasible.
- Event payloads need stable identifiers, correlation metadata, explicit semantics, and versioning.

### Schema Evolution

- Schemas and contracts will change; plan for it.
- Prefer backward- and forward-compatible changes.
- Keep old readers and writers in mind during rollout.
- Do not reuse fields, statuses, or enum values with new meanings.
- Distinguish internal refactors from contract changes.

### Partitioning and Locality

- Partition by a domain-relevant key that supports consistency, aggregation, and common access patterns.
- Be explicit about hot-key risk, skew, and cross-partition operations.
- Avoid partitioning that makes ordinary queries cross-node or cross-service.
- Model tenant, ownership, or partition identity explicitly where relevant.

### Distributed Transactions and Derived Data

- Use local transactions where they solve real consistency problems cleanly.
- Avoid distributed transactions by default.
- Prefer outbox, idempotent consumers, sagas/process managers, and compensating workflows for cross-boundary coordination.
- Derived data must be repairable, rebuildable, or re-syncable.
- Monitor derivation lag and failure.

### Service Boundaries

- Service boundaries should reflect data ownership and update semantics.
- Do not split one tightly consistent business concept across services casually.
- Avoid chatty cross-service joins on hot paths.
- Contracts must encode identifiers, versions, failure semantics, and compatibility expectations.

---

## Production Readiness Rules

### Stability Mindset

Assume:
- every dependency can be slow, unavailable, or wrong
- every queue can fill
- every cache can miss, stampede, or disappear
- every timeout can cascade
- every caller can retry badly
- every degraded state can last longer than expected

Design for production reality, not only the happy path.

### Dependency Protection

- Every outbound call must have an explicit timeout.
- Timeouts must be intentional, not hidden library defaults.
- Retry only where the operation is safe or idempotent.
- Bound retry count and total retry time.
- Use jitter and backoff to avoid retry storms.
- Do not retry validation errors or permanent failures.
- Use circuit breakers or fast-fail mechanisms for unhealthy dependencies when appropriate.
- Isolate risky or slow dependencies with bulkheads and separate resource pools where failure isolation matters.
- Do not hold locks or scarce resources across slow remote calls.

### Load, Capacity, and Backpressure

- Every system must have an overload strategy.
- Reject, defer, queue, shed, or degrade intentionally.
- Unbounded queues, buffers, and work acceptance are forbidden.
- Monitor queue length, age, throughput, and failure rate.
- Define poison-message and dead-letter handling.
- Protect scarce resources with rate limits or admission control where needed.
- Preserve core functions and shed low-value work first.

### Resource Management

- Budget threads, database connections, sockets, file descriptors, memory, CPU-heavy workers, and external quotas.
- Release resources deterministically.
- Use streaming or pagination for large payloads.
- Guard memory-heavy operations.
- Avoid hidden N+1 loading and unbounded batch processing.

### Data Boundaries and Input Safety

- Treat all external input as untrusted.
- Validate syntax, shape, and business plausibility at the right boundary.
- Normalize and sanitize once at the correct boundary.
- Keep parsing errors, validation errors, and domain rule violations distinct.
- Do not let malformed data poison caches, queues, projections, or downstream systems.

### Observability

- Observability is part of the design.
- Emit meaningful structured logs at boundaries and failure points.
- Include correlation IDs, operation names, dependency names, and relevant identifiers.
- Do not log secrets.
- Avoid log spam loops during retry storms.
- Measure latency, throughput, error rate, saturation, queue depth, retries, timeouts, circuit-breaker state, dependency health, and lag.
- Health checks and readiness checks must reflect real ability to serve.

### Deployment, Startup, and Operations

- Startup must fail fast on missing critical configuration.
- Readiness must report whether the service can actually serve.
- Liveness must not mask deadlocks or stuck subsystems.
- Avoid expensive or destructive startup work in request-serving processes.
- Migrations and one-time jobs must be deliberate, observable, and recoverable.
- Keep deployment, rollback, and local validation steps reproducible.

### API and Cache Rules

- Make failure modes explicit in API contracts where they matter.
- Let callers distinguish retryable, recoverable, and permanent failures.
- Prefer coarse-grained resilient interactions over fragile chattiness.
- Version long-lived contracts.
- Document idempotency expectations.
- Treat cache as an optimization unless explicitly authoritative.
- Plan for cache misses, stale data, dogpiles, and cache outages.

### Background Work

- Background jobs must be restart-safe.
- Job handlers must tolerate duplicate delivery or re-execution where applicable.
- Failure and retry policy must be explicit.
- Poison work items must not loop forever.
- Long-running jobs need progress, timeout, and cancellation strategy.

---

## Refactoring Rules

### What Counts as Refactoring

Refactoring changes internal structure without changing observable behavior.

Use refactoring to:
- make the next change easier
- remove code smells
- improve readability, locality, and testability
- move toward clearer names, boundaries, and responsibilities

Do not call a change a refactor when it changes behavior, migrates architecture wholesale, modernizes without verification, or rewrites large areas without understanding current behavior.

### Refactoring Discipline

- Work in small behavior-preserving steps.
- Keep the system runnable and buildable where practical.
- Separate structural edits from behavior changes when practical.
- Use the simplest helpful refactoring.
- Make preparatory refactors before feature work when code friction makes the feature harder.
- Refactor after feature work if the change introduced local structural debt.
- Stop when the requested change is easy, major friction is removed, and further cleanup would be speculative.

### Code Smells to Act On

Actively look for:
- duplicated logic or duplicated knowledge
- vague or misleading names
- long functions with mixed abstraction levels
- long parameter lists
- boolean control flags
- deep nesting
- global data and hidden dependencies
- divergent change
- shotgun surgery
- feature envy
- data clumps
- primitive obsession
- repeated switch/type/status conditionals
- temporary fields and half-valid lifecycles
- middle-man pass-through layers
- speculative generality
- god classes or god services
- comment-heavy code that needs better structure
- dead code

### Preferred Refactoring Moves

- Rename variables, functions, types, and modules to reveal intent.
- Extract function when a block has a coherent purpose.
- Extract variable when an expression hides meaning.
- Extract class or module when responsibilities are mixed.
- Move behavior closer to the data or concept it belongs to.
- Move statements to group related operations.
- Inline accidental abstractions.
- Collapse layers that only forward calls.
- Replace nested conditionals with guard clauses, predicates, tables, strategies, or richer models when useful.
- Encapsulate mutable state.
- Replace magic values with named constants or domain types.
- Introduce parameter objects for repeated argument groups.
- Replace raw collections with named abstractions when behavior accumulates around them.

Avoid replacing a simple local conditional with needless indirection.

---

## Legacy Code Rules

Treat code without trustworthy tests as legacy code.

### Default Legacy Workflow

1. Identify the exact area affected.
2. Determine whether trusted tests protect the behavior.
3. If behavior is unclear, add characterization tests where feasible.
4. Identify the dependency that makes change difficult.
5. Find or create a seam.
6. Break the blocking dependency.
7. Make the requested change.
8. Refactor locally for clarity and testability.

Do not start by cleaning the whole module.

### Characterization and Safety

- Characterize current behavior before redesigning unclear code.
- Capture ugly behavior if real consumers rely on it.
- Separate tests describing legacy behavior from tests describing new requirements when useful.
- Never delete a failing test just to complete a refactor.
- If tests are absent and cannot be added quickly, keep the change smaller and improve testability first.

### Seams and Dependency Breaking

A useful seam allows substitution, observation, or interception.

Use the smallest seam that unlocks safe change:
- constructor injection
- parameter injection
- extracted method
- wrapper around static or global access
- adapter around framework objects
- factory indirection
- module boundary
- import seam
- subclass seam only when forced by constraints

Break dependencies on:
- time
- randomness
- environment variables
- thread-local state
- static singletons
- global configuration
- implicit current user or request
- direct file writes
- direct network calls
- process exits
- direct database writes
- direct message publication
- constructors that do real work
- hidden factory calls

### Legacy Techniques

- Use sprout method when new behavior can be added through a small insertion point.
- Use sprout class when a new responsibility does not fit a risky old class.
- Use wrap method for pre/post behavior or observability around risky code.
- Use wrap class to mediate behavior around a hard-to-test class.
- Use extract-and-override only when language constraints leave few better options.

Every legacy change should leave the area more observable, testable, or modular.

---

## Testing and Verification Rules

### General Test Quality

- Treat tests as production-quality code.
- Tests must be readable, deterministic, maintainable, and self-checking.
- A test should communicate one main idea.
- Prefer simple setup and clear assertions.
- Avoid brittle tests coupled to irrelevant implementation details.
- Tests should be isolated and order-independent where possible.
- Add or update tests for behavior changes, bug fixes, risky refactors, and significant contracts.
- When fixing a bug, add a test that would have caught it when feasible.
- Run relevant validation before finishing.

### Domain and Application Tests

- Domain tests must read in the ubiquitous language.
- Test value objects for validation and behavior.
- Test entities and aggregates for valid and invalid transitions.
- Test aggregate invariants directly.
- Test domain events as outcomes of domain behavior.
- Test specifications, policies, and explicit constraints.
- Test application services for orchestration, transaction ownership, and port usage, not for every domain decision.
- Test context translation and anticorruption layers explicitly.

### Architecture and Adapter Tests

- Core business tests should run without the real web framework, database, network, or vendor SDK.
- Test adapters separately for mapping correctness, repository behavior, controller translation, presenter formatting, and integration with real details.
- Test repositories, mappers, gateways, identity map, unit of work, and locking behavior where they carry risk.
- Do not use slow integration tests as a substitute for testing business rules.

### Data and Distributed Tests

- Test duplicate delivery handling.
- Test retry and replay safety.
- Test out-of-order events where applicable.
- Test conflict resolution or optimistic concurrency behavior.
- Test schema compatibility when contracts evolve.
- Test projection rebuild or repair where that capability exists.
- Test source-of-truth and derived-data assumptions where they affect behavior.

### Production and Operational Tests

- Test timeout behavior.
- Test retry boundaries and idempotency.
- Test degraded dependency scenarios.
- Test overload, queue saturation, and rate limiting where practical.
- Test startup and readiness failure modes.
- Test background job restart, duplicate execution, poison-message, timeout, and cancellation behavior.

### Refactoring and Legacy Tests

- Add characterization tests before risky edits when current behavior is unclear.
- Keep tests focused on externally visible behavior unless lower-level tests are the safest seam.
- Update tests only when behavior intentionally changes.
- Refactor tests too when they become noisy, duplicative, or misleading.

---

## Pragmatic Engineering Rules

### Ownership and Responsibility

- Take responsibility for the quality and changeability of the code you touch.
- Do not blame tooling, framework defaults, or existing style for avoidable bad design.
- Surface trade-offs, risks, and uncertainty explicitly.
- Leave touched areas better where the cost is low and value is immediate.

### Orthogonality

- Keep components independent so one change does not force unrelated changes elsewhere.
- Avoid overlapping responsibilities.
- Minimize hidden coupling through globals, ambient context, shared mutable state, shared utility dumping grounds, or cross-context imports.
- Make changes local by improving boundaries and ownership.

### Tracer Bullets and Prototypes

- Prefer a thin end-to-end slice to validate architecture, integration, and assumptions early.
- Keep the first slice simple but real enough to prove the path.
- Use prototypes to learn.
- Be explicit about what a prototype proves and what it does not.
- Do not let experimental shortcuts silently become production defaults.

### Automation and Feedback

- Automate repetitive, error-prone, or easy-to-forget tasks.
- Prefer repeatable scripts over tribal-knowledge commands.
- Build, test, lint, format, package, and deploy steps should be reproducible.
- Keep local automation aligned with CI/CD behavior.
- Run relevant tests early and often.
- Use static analysis, linting, and type checks where they reduce real risk.
- Prefer cheap early feedback over late expensive surprises.

### Broken Windows

- Do not normalize local decay.
- Fix small quality problems in touched areas when the cost is low.
- Avoid leaving temporary hacks without a cleanup plan.
- Do not perform broad unrelated cleanup under the cover of a focused task.

---

## Forbidden Patterns

Do not generate or preserve these patterns unless explicitly required and justified.

### Complexity and Design

- clever code that is hard to inspect
- shallow pass-through layers
- wrappers that add names but no simplification
- one more flag, callback, or conditional instead of a better abstraction
- speculative frameworks, interfaces, or hierarchies before a real need exists
- generic `utils`, `helpers`, `common`, or `shared` packages as design escape hatches
- god classes and god services
- duplicated business rules across UI, API, services, database, and jobs

### Architecture and Domain

- business rules in controllers, views, SQL scripts, repository implementations, or serialization code
- framework or ORM types in core domain or use-case code
- domain models shaped primarily around tables, DTOs, or REST payloads
- one global company-wide domain model
- shared domain classes across contexts by default
- anemic entities in complex domains
- aggregates sized around object graphs or screens
- direct cross-context imports of domain classes
- generic repositories that erase domain meaning
- domain events for every property change
- fake DDD that renames CRUD without changing the model
- over-modeled generic subdomains

### Data and Production

- exactly-once wishful thinking
- non-idempotent handlers under retry or redelivery
- many writable copies with no source-of-truth ownership
- stale-read or conflict behavior treated as incidental
- changing contract meanings without versioning or rollout strategy
- projections that cannot be repaired or rebuilt when they need to be
- unbounded queues, buffers, batches, or resource pools
- outbound calls with no explicit timeout
- nested retries at multiple layers
- retries on non-idempotent or permanent failures
- health checks that stay green while dependencies required for serving are broken
- caches treated as always available and always correct

### Change and Legacy

- big-bang rewrites before understanding current behavior
- behavior changes hidden inside refactors
- broad edits in poorly tested legacy modules without characterization or seams
- cosmetic refactoring that leaves hard dependencies untouched
- deleting failing tests to make a refactor pass
- manual release or validation rituals that should be automated

---

## Code Generation Rules

When generating code, default to this order:

1. Identify the business capability, use case, or technical contract.
2. Identify the bounded context or ownership boundary if domain behavior is involved.
3. Choose the smallest fitting business logic pattern: transaction script, table module, domain model, service layer, or adapter.
4. Name concepts in the local domain or technical language precisely.
5. Define inputs, outputs, ports, contracts, and invariants.
6. Keep business rules independent from frameworks, persistence, transport, and vendor APIs.
7. Model identity, values, lifecycles, consistency, and source of truth explicitly when they matter.
8. Protect external dependencies with timeouts, bounded retries, idempotency, and observability where applicable.
9. Keep routines cohesive, control flow straightforward, and data meaning explicit.
10. Add tests and validation proportionate to risk.
11. Review for duplication, boundary leaks, operational failure modes, and unnecessary abstraction.

Avoid by default:
- starting from database schema, controller shape, or framework convention when business behavior is central
- adding layers that only pass calls through
- assuming local, ordered, exactly-once behavior across distributed boundaries
- hiding complexity in global state or caller ceremony
- introducing dependencies without reducing total complexity

---

## Review Checklist

Before finalizing any change, verify:

- Is the requested behavior or structural goal satisfied?
- Are names precise and consistent?
- Did the change reduce or avoid increasing cognitive load?
- Are routines cohesive and readable?
- Is control flow straightforward?
- Are contracts, invariants, and assumptions explicit?
- Are business rules in the right place?
- Do dependencies point toward stable policy where core logic is involved?
- Are framework, persistence, transport, and vendor details kept at the edge?
- Is the chosen business logic pattern appropriate for the actual complexity?
- Is the bounded context clear where domain behavior is involved?
- Does the code use the ubiquitous language consistently inside that context?
- Are value objects, entities, aggregates, repositories, factories, services, specifications, and events used only where they earn their cost?
- Are aggregate and transaction boundaries explicit and small enough?
- Is source-of-truth ownership clear for important data?
- Are consistency, ordering, retry, replay, and schema evolution assumptions explicit where relevant?
- Are remote calls protected by timeouts and safe retry policies?
- Are queues, resources, caches, and background jobs bounded and observable?
- Is failure diagnosable through logs, metrics, health checks, or surfaced errors?
- Did refactoring preserve behavior?
- Did legacy changes add understanding, seams, or testability?
- Are tests proportionate to behavior, risk, and blast radius?
- Did we avoid speculative abstraction and broad unrelated cleanup?
- Is the touched area cleaner or more changeable than before?

If any answer is no, revise before shipping or explicitly call out the remaining trade-off.

---

## Output Expectations for Claude

When implementing:
- briefly state what changed
- state what validation was run
- call out unresolved risks, assumptions, or trade-offs

When reviewing:
- lead with concrete bugs, risks, regressions, and missing tests
- reference files and lines where possible
- separate findings from summary

When modifying legacy or production-sensitive code:
- state how behavior was protected
- state how retry, failure, data consistency, or operational risk was addressed when relevant

---

## Final Instruction

When uncertain, choose the change that:
1. makes intent clearer
2. keeps business meaning in the right place
3. hides volatile details behind useful boundaries
4. makes data and consistency semantics explicit
5. survives failure and retry
6. preserves behavior while improving structure
7. gives maintainers faster and more trustworthy feedback

Build software that remains understandable when the codebase, domain, data, and production environment all become harder than the happy path.
