---
title: Code Complete
description: Vendored book rules from ciembor/agent-rules-books — see references/books/README.md and SKILL.md "Book References".
status: active
source: https://github.com/ciembor/agent-rules-books
upstream_path: code-complete/claude/.claude/rules/code-complete.md
upstream_commit: 2851b8535a86a6e6ea0210c013f95599b3b7c99f
license: MIT
---

# Code Complete

## Purpose

This repository follows **Code Complete** in the sense of Steve McConnell:
apply disciplined software construction practices that reduce defects, improve readability, and produce robust code under real-world constraints.

All code generation, edits, and reviews must optimize for:
- low-defect construction
- readable and intention-revealing code
- controlled complexity
- defensive programming where appropriate
- strong routine and class design
- practical correctness over style theater

This file is a binding engineering policy for Claude.

---

## Primary Directive

Construction quality is not accidental.

When uncertain, choose the option that:
1. lowers defect probability
2. makes the code easier to inspect and reason about
3. reduces control-flow complexity
4. uses data and routines clearly
5. protects the program against invalid states and misuse

Do not optimize for cleverness, minimal keystrokes, or fashionable idioms at the cost of clarity.

---

## Foundational Construction Rules

1. Write code primarily for human readers.
2. Favor clarity, locality, and explicitness over trickiness.
3. Keep control flow simple and visible.
4. Make correctness easier to achieve than incorrectness.
5. Use conventions consistently.

---

## Routine Design Rules

1. Routines should have one clear purpose.
2. The routine name should describe the result or action precisely.
3. Keep the interface as small as practical.
4. Avoid long parameter lists and flag arguments.
5. Separate setup, validation, computation, and side effects when they are conceptually different.
6. Return values should be meaningful and hard to misuse.
7. Prefer guard clauses and straightforward structure over deeply nested logic.

Anti-patterns:
- routines that do several unrelated things
- routines whose names describe implementation detail instead of purpose
- many hidden side effects
- boolean parameters that switch routine mode

---

## Variable and Data Rules

1. Use names that reveal purpose and meaning.
2. Keep variable scope as small as practical.
3. Initialize variables deliberately.
4. Prefer constants or immutable values where mutation adds no value.
5. Avoid magic numbers and unexplained sentinel values.
6. Use stronger data types when primitives hide meaning.

Anti-patterns:
- reused loop/index/temp variables beyond their purpose
- long-lived mutable locals carrying many meanings
- values whose units or semantics are unclear

---

## Control Flow Rules

1. Prefer the simplest control flow that expresses the logic.
2. Keep nesting shallow when possible.
3. Replace complicated boolean logic with named predicates or clearer structure.
4. Use case/switch constructs only when they improve clarity.
5. Eliminate impossible paths and dead branches.
6. Avoid surprising exits unless they clarify the routine.

Anti-patterns:
- deeply nested conditionals
- complicated loop exits with hidden state changes
- control flow dependent on side effects in expressions
- clever one-liners that obscure the logic

---

## Defensive Programming Rules

1. Validate inputs at trust boundaries.
2. Use assertions or invariant checks where programmer assumptions matter.
3. Distinguish between recoverable conditions and programming errors.
4. Fail in a way that preserves diagnosability.
5. Do not silently continue from corrupted or impossible state.

Anti-patterns:
- assuming all callers are correct
- burying invalid state until it causes distant failures
- swallowing exceptions without context

---

## Error Handling Rules

1. Handle errors at the right level of abstraction.
2. Preserve useful context.
3. Do not let error handling dominate the normal path.
4. Standardize similar failure handling.
5. Prefer explicit, well-understood failure semantics over ad hoc conventions.

---

## Table-Driven and Data-Driven Rules

1. Prefer data-driven logic over long repeated condition chains when the mapping is stable and explicit.
2. Use tables or maps for configuration-like decisions.
3. Keep the structure obvious and validated.
4. Do not hide complex logic in inscrutable data encodings.

---

## Class and Module Design Rules

1. Each class or module should own a focused responsibility.
2. Separate interface from implementation.
3. Hide representation and incidental detail.
4. Keep classes cohesive.
5. Reduce coupling through clear contracts and limited knowledge of internals.

Anti-patterns:
- god classes
- modules with mixed persistence, formatting, business logic, and integration concerns
- public surfaces that expose internal bookkeeping

---

## Complexity Management Rules

1. Treat rising complexity as a defect risk.
2. Prefer simple code over clever code.
3. Break apart large or tangled routines and modules.
4. Remove duplication that multiplies maintenance effort.
5. Choose designs that reduce the amount a maintainer must keep in working memory.

---

## Construction with Preconditions and Postconditions

1. Be explicit about routine assumptions.
2. Encode important invariants close to the code they protect.
3. Keep contracts simple and testable.
4. Use assertions for programmer mistakes, validation for external input, and domain errors for expected business failures.

---

## Comment Rules

1. Comments should explain intent, rationale, contracts, and non-obvious facts.
2. Do not comment obvious code instead of improving it.
3. Keep comments accurate or delete them.
4. Prefer self-documenting structure first, comments second.

---

## Coding Standards Rules

1. Be consistent within the codebase.
2. Use formatting, naming, and file structure to support readability.
3. Standardize common idioms so readers do not need to relearn style per module.
4. Prefer a shared convention over local personal taste.

---

## Incremental Construction Rules

1. Build in small, verifiable increments.
2. Integrate frequently enough to surface conflicts and misunderstanding early.
3. Keep partial work from rotting in long-lived isolation.
4. Review and improve code as part of construction, not only after it.

---

## Review Rules for Claude

When reviewing code, actively look for:
- unclear names
- weak routine boundaries
- long parameter lists
- unnecessary nesting
- hidden side effects
- poor defensive checks at trust boundaries
- duplicated logic
- confusing control flow
- god classes or mixed responsibilities
- comments compensating for poor structure

---

## Forbidden Patterns

### Cleverness over Clarity
- dense tricks that are hard to inspect
- compressed expressions that save lines but increase interpretation cost

### Routine Bloat
- one routine doing several phases and concerns
- long signatures with many unrelated parameters

### Defensive Vacuum
- no validation at trust boundaries
- no checks around critical assumptions
- silent fallback from impossible state

### Comment-as-Crutch
- obvious comments over bad code
- stale comments that mislead

### Consistency Neglect
- arbitrary naming and formatting changes
- module-specific mini dialects inside one codebase

---

## Code Generation Rules

When generating code, default to:
1. clear names
2. focused routines
3. explicit data meaning
4. simple control flow
5. defensive checks at boundaries
6. cohesive classes/modules
7. consistent style

Avoid by default:
- dense clever code
- broad god objects
- fragile hidden assumptions
- unnecessary complexity in loops and conditionals
- comments where better names or decomposition would do

---

## Testing Rules

1. Test routine behavior around normal, boundary, and invalid inputs.
2. Test defensive checks where boundary validation matters.
3. Keep tests aligned with routine contracts.
4. Test complex data-driven logic with representative tables and edge cases.

---

## Review Checklist

Before finalizing any change, verify:
- Are names clear and intention-revealing?
- Are routines focused and reasonably small?
- Is control flow straightforward?
- Are trust boundaries defended?
- Are contracts and invariants explicit enough?
- Did we reduce or at least not increase complexity?
- Are classes/modules cohesive?
- Did we avoid cleverness that harms inspection?
- Are comments used only where they add value?
- Is the style consistent with the rest of the codebase?

If any answer is no, revise before shipping.

---

## Final Instruction

When uncertain, choose the option that:
1. lowers defect risk
2. improves readability
3. simplifies control flow
4. strengthens defensive correctness
5. keeps the code easier to inspect and maintain

Write code that would stand up to careful review.
