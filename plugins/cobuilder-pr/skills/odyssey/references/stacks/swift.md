---
title: "Stack Card — Swift"
status: active
type: reference
last_verified: 2026-08-06
grade: authoritative
---

# Stack: swift — Swift language baseline (Apple platforms, server, cross-platform)

## Detect

- A `Package.swift` manifest, or one or more `*.xcodeproj` / `*.xcworkspace` bundles
- A project generator manifest counts as a marker: `Project.swift` (Tuist) or
  `project.yml` (XcodeGen)
- Tracked `*.swift` files under `Sources/`, `Tests/`, or an Xcode target directory
- No more specific Swift card matched. `vapor.md` and `swiftui-app.md` win first,
  under the most-specific-card rule in `README.md`

Record two facts during detection. Every rule below depends on them.

1. **Language mode.** Read `// swift-tools-version:` on line 1 of `Package.swift`,
   then read `swiftLanguageMode` in each target's `swiftSettings`. Tools version 6.0
   and later default to the Swift 6 language mode, which turns a data race into a
   compile error instead of a warning. An Xcode target carries the same choice in the
   `SWIFT_VERSION` build setting.
   Check: `head -1 Package.swift && grep -n "swiftLanguageMode" Package.swift`
2. **Default isolation.** A package on tools version 6.2 or later can set
   `.defaultIsolation(MainActor.self)` per target (SE-0466). An Xcode target sets
   `SWIFT_DEFAULT_ACTOR_ISOLATION`. Under that setting every declaration is
   main-actor isolated unless it is marked `nonisolated` or `@concurrent`. A
   `@MainActor` annotation in the diff therefore means nothing on its own. A missing
   one does not mean the code runs off the main actor.
   Check: `grep -n "defaultIsolation" Package.swift`

A Swift codebase still on the Swift 5 language mode is a different codebase from one
on Swift 6. Do not report a concurrency finding without naming which mode the target
uses.

## Reference Structure

```
Package.swift                 # tools version, language mode, per-target swiftSettings
Sources/
├── Core/                     # Sendable value types, errors, pure logic, no UI, no I/O
├── <Feature>Interface/       # the protocols and models a feature exposes, no implementation
├── <Feature>/                # the implementation, depends on its own Interface and on Core
├── Networking/, Persistence/ # adapters at the edges, one per external system
└── App/                      # composition root: binds implementations to interfaces
Tests/<Module>Tests/
```

Rationale for the boundaries:
- **An Interface target per feature** — a feature depends on another feature's
  `Interface` target, never on its implementation. The build graph stays wide instead
  of deep, so targets compile in parallel. A test also substitutes a stub for an
  implementation without a mocking framework.
- **`package` access as the boundary tool** — `public` means the symbol leaves the
  package. `package` (SE-0386) shares a symbol between targets inside one package.
  `internal` is the default and stays inside the module. A `public` symbol that only a
  sibling target uses leaks the module boundary and blocks a later rename.
- **Core imports no framework** — a shared module that imports SwiftUI or UIKit pulls
  every dependent onto the main actor. It also ends reuse on Linux and in tests.
- **A composition root in App** — one place knows the concrete types. Every other
  module receives its dependencies instead of reaching for them.

A single-target Xcode app applies the same layering to directories, because a
directory is the only boundary it has. The compiler checks nothing there. That is the
reason these rules matter more in a single-target app, not less.

## Boundary Rules

Each rule is grep-checkable. Report a violation as an architecture finding.

1. Core and domain modules import no UI framework.
   Check: `grep -rn "^import \(SwiftUI\|UIKit\|AppKit\|WatchKit\)" Sources/Core/`
2. A feature imports another feature's `Interface` target, never its implementation.
   Check: `grep -rn "^import " Sources/<Feature>/ | grep -vE "Interface|Core|Foundation|OSLog"`
3. Every concurrency escape hatch names the guarantee that makes it safe. A hit
   without a comment that names the lock, the queue, or the invariant is a violation.
   Check: `grep -rn "@unchecked Sendable\|nonisolated(unsafe)\|@preconcurrency" Sources/`
4. A production path carries no force try and no force cast.
   Check: `grep -rnE "\btry!|\bas!" Sources/`
5. Grand Central Dispatch does not sit beside structured concurrency. In a target on
   the Swift 6 language mode, each hit needs an ADR or a comment. A `DispatchSemaphore`
   inside an `async` function is a violation on its own, because it blocks a thread of
   the cooperative pool.
   Check: `grep -rn "DispatchQueue\|DispatchSemaphore\|OperationQueue" Sources/`
6. Environment and bundle configuration crosses into code in one place.
   Check: `grep -rn "ProcessInfo.processInfo.environment\|Bundle.main" Sources/ | grep -vi "config"`

## Corpus Load

None. This plugin ships no principle corpus, so this card names no corpus path. The
section stays for the card contract in `README.md`. Generate mode never reads it — see
`review-mode.md` §5.

The authoritative external references for this stack are the Swift API Design
Guidelines and the Swift 6 concurrency migration guide, both on `swift.org`. They are
web documents, not bundled files, and no mode fetches them.

## Review Checks

Stack-specific smells beyond the boundary rules:

- **Escape-hatch creep**: `@unchecked Sendable`, `nonisolated(unsafe)`,
  `@preconcurrency import`, or a `@MainActor` added to a type only to silence the
  compiler. Each one moves a data race from compile time to run time.
- **Blocking the main actor**: a synchronous file read, a network call,
  `Data(contentsOf:)`, or a `JSONDecoder` pass over a large payload inside a
  main-actor type.
- **Unowned unstructured work**: `Task { }` with no stored handle, no cancellation,
  and no owner. A child task in a task group, or a task tied to a view lifetime,
  cancels with its parent.
- **A `deinit` that touches isolated state**: `deinit` is always non-isolated. The
  supported pattern captures the property it needs and never captures `self`.
- **A retain cycle in an escaping closure**: a closure stored on `self` that captures
  `self` strongly.
- **Force unwrap in a production path**: `!` applied to an optional. A test target
  and a `#if DEBUG` block are the accepted exceptions. The grep is noisy, so read the
  diff instead of trusting a count.
- **Legacy observation in new code**: `ObservableObject` with `@Published` where the
  deployment target already allows `@Observable`. Also an `@Observable` model stored
  in a plain `let` on a view instead of `@State`, which re-creates the model on every
  view initialization.
- **A type that does everything**: a view `body` or a view controller that fetches,
  maps, and navigates in one file.
- **`.shared` reached across a module boundary**: a singleton used as an ambient
  dependency defeats the composition root and blocks a test double.
- **Naming drift from the API Design Guidelines**: a `get` prefix on a non-mutating
  accessor, or a type name repeated in an argument label. A mutating and
  non-mutating pair that breaks the `sort` and `sorted` rule counts here too.
- **`@testable import` outside a test target**.
  Check: `grep -rn "@testable" Sources/`
- **Manifest drift**: one target left on an older language mode after the rest of the
  package moved to Swift 6.
- **An untyped error at a module boundary**: an error thrown across a module boundary
  as a bare `Error`. A typed throw, or an enum conforming to `LocalizedError`, tells
  the caller what to handle.

## ADR Topics

Decisions this stack forces — during retro-extraction, check each has a record:

- Concurrency posture: the language mode per target, whether
  `defaultIsolation(MainActor.self)` is on, and which upcoming feature flags the
  package enables (`NonisolatedNonsendingByDefault` SE-0461,
  `InferIsolatedConformances` SE-0470, `GlobalActorIsolatedTypesUsability` SE-0434,
  `InferSendableFromCaptures` SE-0418, `DisableOutwardActorInference` SE-0401)
- Module strategy: one Xcode target against local SPM packages, and where the
  interface and implementation split falls
- Dependency injection style: initializer injection, an environment, a container, or
  singletons
- UI framework and state ownership: SwiftUI with Observation against UIKit with MVVM,
  and who owns navigation state
- Persistence: SwiftData, Core Data, GRDB, or Fluent, and how the domain stays
  independent of the store
- Error model: typed throws against a plain `Error`, and what shape an error takes
  when it crosses a module boundary
- Test framework and test double strategy: Swift Testing against XCTest, and protocol
  witnesses against generated mocks
- Minimum deployment target: it gates Observation, SwiftData, and typed throws
- Project file generation: a committed `.xcodeproj` against Tuist or XcodeGen, and how
  the team handles a merge conflict in it
- Runtime verification posture: Thread Sanitizer, the Main Thread Checker, and the
  Xcode concurrency runtime checks. Compile-time data-race safety covers one half of
  the problem. A target still on the Swift 5 language mode depends on the runtime
  checks for the other half.
