---
title: "Stack Card — SwiftUI App"
status: draft
type: reference
last_verified: 2026-08-06
grade: draft
---

# Stack: swiftui-app — SwiftUI application (Apple platforms)

> STUB — detection and inheritance are authoritative. The remaining sections are a
> reasoning sketch awaiting a real SwiftUI engagement to flesh out.

`NavigationView` is deprecated. New code uses `NavigationStack` instead. A view
body past roughly 100 lines is the usual signal to extract a subview.

## Detect

- A target imports SwiftUI and declares a `struct <Name>: App` entry point.
  Check: `grep -rn "^import SwiftUI" Sources/` and `grep -rn ": App\b" Sources/`
- An `@main` attribute on that struct
- Takes precedence over `swift.md` (most-specific card wins)

## Inherits

`swift.md` — load that card first. The rules below are SwiftUI additions.

## Boundary Rules (sketch)

1. A view performs no I/O. Networking and persistence calls belong in a model
   or a service the view holds.
   Check: `find Sources -type d -name Views -exec grep -rn "URLSession\|FileManager\|\.fetch(" {} +`
2. The view that owns an `@Observable` model holds it in `@State`. A plain
   `let` re-creates the model on every view initialization, and the state
   does not survive. A child view receives the model as a plain property
   or as `@Bindable`.
3. Navigation state lives in one model. Scattered `@State` booleans behind
   `NavigationLink` and `.sheet` make a deep link impossible to express.
   Prefer an enum-based path on a `NavigationStack`.
   Check: `grep -rn "@State.*isPresented\|@State.*showing" Sources/`
4. A view never imports a Networking or Persistence module directly. It
   depends on a feature Interface target.
   Check: `find Sources -type d -name Views -exec grep -rn "^import \(Networking\|Persistence\)" {} +`

A `Sources/**/Views/` path needs the bash `globstar` option, which is off by
default. A shell without it silently skips a top-level `Sources/Views/`
directory. The `find` form above checks every depth.

## ADR Topics (sketch)

- State ownership and the observation strategy: `@Observable` against
  `ObservableObject`, and the minimum deployment target that gates the choice
- Navigation: a `NavigationStack` path against a coordinator object, and who
  owns the path
- The SwiftUI and UIKit interop boundary, when the app has both
- Dependency delivery: `@Environment` against initializer injection
- The view extraction threshold, and whether previews are a maintained surface
