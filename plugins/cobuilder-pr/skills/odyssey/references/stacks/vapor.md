---
title: "Stack Card — Vapor"
status: draft
type: reference
last_verified: 2026-08-06
grade: draft
---

# Stack: vapor — Vapor (server-side Swift)

> STUB — detection and inheritance are authoritative. The remaining sections are a
> reasoning sketch awaiting a real Vapor engagement to flesh out.

## Detect

- `Package.swift` declares a `vapor` dependency.
  Check: `grep -n "vapor" Package.swift`
- `Sources/App/` holds `configure.swift`, `routes.swift`, and `entrypoint.swift`
- Takes precedence over `swift.md` (most-specific card wins)

## Inherits

`swift.md` — load that card first. The rules below are Vapor additions.

## Boundary Rules (sketch)

1. A controller stays thin. It routes, it validates, and it calls a service or
   a repository. Business logic does not live in a route closure. This
   mirrors the routers-vs-services rule in `python-fastapi.md`.
2. A Fluent model never returns from a route. A route returns a `Content` DTO
   instead, so the database shape does not become the public API. This check
   takes two steps, because a single grep cannot tell a model from a DTO.
   Step 1, list the Fluent models:
   `grep -rhoE "(final )?class [A-Za-z]+: Model" Sources/App/Models/ | awk '{print $(NF-1)}' | tr -d ':'`
   Step 2, look for each name in a return position in a controller:
   `grep -rnE -- "-> *(EventLoopFuture<)?\[?(<name1>|<name2>)\b\]?" Sources/App/Controllers/`

   The trailing `\b` matters. Without it the pattern matches `UserDTO` as well as
   `User`, and it reports the correct pattern as a violation.
3. The app reads environment configuration in `configure.swift` only.
   Check: `grep -rn "Environment.get" Sources/App/ | grep -v configure.swift`
4. A migration stays additive, and it lives under version control. A
   destructive migration needs an ADR.
   Check: `grep -rn "deleteField\|delete()" Sources/App/Migrations/`

## ADR Topics (sketch)

- The repository pattern against direct Fluent model access in a controller
- Migration strategy, including rollout ordering and how the team handles a
  rollback
- Authentication and authorization, and where tenancy is enforced
- The DTO boundary: a separate `Content` type against a model that conforms
  to `Content`
- `EventLoopFuture` against async/await, and the migration end state when
  both exist
