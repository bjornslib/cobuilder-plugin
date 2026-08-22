---
title: "Stack Card — Generic Fallback"
status: active
type: reference
last_verified: 2026-07-16
grade: authoritative
---

# Stack: generic — fallback when no card matches

Applies when no other card's `## Detect` markers match. It also covers language matches
without a framework card — for example, a plain-Python service that is not FastAPI.

## Detect

Always matches, last in precedence order.

## Reference Structure

This card imposes no canonical layout. Use the layering defaults from
`corpus/principles/architecture/003_hexagonal_architecture.yaml` (ports & adapters) and
`corpus/principles/architecture/007_architectural_boundaries.yaml` as the diff target.
That target is a core of domain/business logic that does not import I/O, frameworks, or
storage, with adapters at the edges.

## Boundary Rules

1. The dependency rule: inner layers (domain, business logic) never import outer layers
   (HTTP, UI, DB drivers, framework code). Identify the codebase's inner packages, then
   grep them for framework/driver imports.
2. Configuration crosses into code in one place, not scattered env reads.

## Corpus Load

1. Identify the primary language from manifests (`pyproject.toml` / `package.json` /
   `go.mod` / ...).
2. If a matching language corpus exists, load its core cards:
   - Python → `corpus/principles/python/*` (start with `001_deep_modules`,
     `004_clean_architecture`, `007_type_hints_static_analysis`)
   - TypeScript/React → `corpus/principles/react_typescript/*` (start with `001`, `002`)
3. Otherwise, root corpus only — `corpus/principles/architecture/*` plus
   `corpus-index.md` symptom lookup.

## Review Checks

These seven checks apply to any language. This card is the fallback, and no
corpus ships with the plugin.

- **A God file or a God function**: one file or one function that holds
  several unrelated responsibilities.
- **A duplicated code path**: the same logic in two places, where a change
  must land in both.
- **A swallowed error**: a caught error that the code discards without a
  log, a re-throw, or a recovery.
- **A hardcoded secret or endpoint**: a credential, a token, or a host name
  written into a source file.
- **Dead code**: an unreachable branch, an unused export, or a function no
  caller invokes.
- **A widened public interface with no caller**: a symbol made public that
  only one internal caller uses.
- **An untested new branch**: a new conditional path with no test that
  exercises it.

## ADR Topics

- Persistence choice and how the codebase abstracts storage from the domain
- Module/boundary strategy (monolith layering, package structure, service split)
- External integration style (sync calls vs events, and where anti-corruption sits)
