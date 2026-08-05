---
title: "Stack Card — React / TypeScript"
status: active
type: reference
last_verified: 2026-07-16
grade: authoritative
---

# Stack: react-typescript — React SPA with TypeScript

## Detect

- `package.json` declares `react` and (`typescript` dependency or `tsconfig.json` present)
- No `next` dependency (Next.js codebases match `nextjs.md` first — precedence rule)

## Reference Structure

```
src/
├── features/<feature>/     # feature folders: components, hooks, state, api per feature
│   ├── components/         # presentational components for this feature
│   ├── hooks/              # side effects (fetching, subscriptions) live here
│   ├── api.ts              # the feature's server-communication surface
│   └── index.ts            # the feature's public interface
├── components/             # shared presentational components only
├── lib/ or services/       # API clients, cross-cutting utilities
└── app/ or store/          # composition root: routing, providers, global state wiring
```

Rationale for the boundaries:
- **Feature folders with an index.ts** — each feature exposes a deliberate public
  interface. Other features import that interface, never internal files, so features stay
  independently changeable (frontend bounded contexts, per corpus card 005).
- **Container/presentational split** — the split separates components that fetch or
  coordinate from components that render, keeping the render layer testable with plain
  props (corpus card 001).
- **Side effects in custom hooks** — hooks wrap fetching, subscriptions, and timers instead
  of scattering them through component bodies (corpus card 004).

## Boundary Rules

Each rule is grep-checkable. Report violations as architecture findings.

1. Components never call HTTP clients directly — data access goes through hooks or the
   feature's `api.ts`.
   Check: `grep -rn "axios\|fetch(" src/**/components/`
2. No cross-feature deep imports — import a feature's `index.ts`, not its internals.
   Check: `grep -rn "features/[a-z-]*/\(components\|hooks\|api\)" src/features/ | grep -v "<same feature>"`
3. Shared `components/` never import from `features/` (dependency points from features
   toward shared code, not back).
   Check: `grep -rn "from.*features/" src/components/`
4. Presentational components do not import global stores — state arrives via props or
   feature hooks.
   Check: `grep -rn "useStore\|useSelector\|useAtom" src/**/components/`

## Corpus Load

- `corpus/principles/react_typescript/001_component_architecture.yaml`
- `corpus/principles/react_typescript/002_typescript_idioms.yaml`
- `corpus/principles/react_typescript/004_react_hooks.yaml`
- `corpus/principles/react_typescript/005_ddd_frontend.yaml`
- `corpus/principles/security/frontend_security.yaml`
- `corpus/principles/security/xss_csrf_csp.yaml`

Review mode already loads all of `corpus/principles/security/*`. The security entries
here exist so design mode gets them too. The Airbnb style cards
(`003_airbnb_style.yaml`, `006`–`031`) are style-level — load on demand via
`corpus-index.md` symptom lookup, not as part of the stack chain.

## Review Checks

Stack-specific smells beyond the generic corpus:

- **`any`-heavy typing**: `any`, `as any`, or `@ts-ignore` clusters that void the type
  system where it matters most (API boundaries, state).
- **Stale closures / missing hook deps**: effects and callbacks with a silenced or
  hand-pruned dependency array.
- **Prop drilling vs context**: the same prop threaded through 3+ component layers, or
  conversely one god-context re-rendering the whole tree.
- **Unbounded effects**: subscriptions, timers, or listeners in `useEffect` without a
  cleanup return.
- **State duplication**: server state copied into local state instead of derived from a
  query cache — two sources of truth.

## ADR Topics

Decisions this stack forces — during retro-extraction, check each has a record:

- State management (Redux/Zustand/Jotai/context — and what belongs in which)
- Data-fetching layer (React Query/SWR/hand-rolled), and its cache invalidation policy
- Styling system (CSS modules/Tailwind/CSS-in-JS)
- Form handling (react-hook-form/Formik/uncontrolled)
- Routing and code-splitting boundaries
