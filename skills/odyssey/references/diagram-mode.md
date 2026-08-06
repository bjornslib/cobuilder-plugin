---
title: "Diagram Mode — Mermaid authoring reference"
type: reference
status: active
last_verified: 2026-08-01
owner: bjoerns
---

# Diagram Mode — Mermaid authoring reference

How to write the per-PR Mermaid diagrams for the Odyssey bundle. Each diagram
is one Mermaid source file. `scripts/build_diagrams.py` reads these files and
compiles them into `data/diagrams.js` for the viewer.

## 1. Per-level contract

| Level | Schema key | Diagram type | Output path |
|---|---|---|---|
| 1 | `landscape` | `C4Container` | `<bundle-dir>/data/diagrams/pr{N}-level1.mmd` |
| 2 | `problem_solution` | `sequenceDiagram` | `<bundle-dir>/data/diagrams/pr{N}-level2.mmd` |
| 3 | `architecture` | `classDiagram` | `<bundle-dir>/data/diagrams/pr{N}-level3.mmd` |
| 4 | `file_changes` | none | — |

Level 4 has no diagram. Do not write a `pr{N}-level4.mmd` file.

One diagram per file. Each file holds raw Mermaid source only. It has no code
fences, no markdown headings, and no surrounding prose. The first line is the
diagram type keyword (`C4Container`, `sequenceDiagram`, or `classDiagram`),
optionally after one or more `%%` comment lines.

## 2. Grounding rules

Every diagram must trace back to the real PR diff. This is the same discipline
as `story-mode.md`: do not invent a component, a call, or a relation that the
diff does not show.

- Every C4 container, every sequence participant, and every class must map to
  a real file, module, or symbol touched by this PR. Use the real file name as
  the node label — `clipboard-monitor.ts`, not "the monitor component."

- Every relation (`Rel`, an arrow between participants, a class association)
  must reflect a real call, a real message, or a real dependency. The diff
  or the surrounding code must show it. Do not add a relation that makes the
  diagram look more complete than the change actually is.

- Read the diff before you draw. Do not infer structure from a commit message
  or a PR title alone.

- Pull class members and container descriptions from the actual code: a
  method signature, a stored field, a config key. Do not guess them from
  what a file with that name probably does.

## 3. Syntax constraints

These constraints exist because real failures showed up when they were
ignored. Follow them even when the diagram would render without them.

- **C4 is an experimental Mermaid diagram type.** Keep to the documented
  subset: `Person`, `System_Ext`, `Container`, `ContainerDb`,
  `Container_Boundary`, and `Rel`. Do not reach for less common C4 macros.
  They are more likely to hit a Mermaid version gap.

- **No `<br/>` in labels.** Use `\n` inside a quoted label to force a line
  break. `<br/>` is an HTML tag, and not every Mermaid renderer accepts it in
  every diagram type.

- **Keep level-1 containers under about twelve.** A C4 diagram with more
  containers than that lays out unreadably at the hero-image width the
  viewer uses. Group related files into one container instead of listing
  each one.

- **Quote every label with a comma or a parenthesis inside it.** An unquoted
  label with a comma or a parenthesis can break the Mermaid parser. It can
  also shift text into the wrong field.

- **No tabs.** Use spaces for indentation. A tab can produce a parse error
  that a space would not.

- **No `#` in a C4 `title` line.** The C4 lexer stops at a `#` that is not
  inside quotation marks, and it gives this error:
  `Lexical error on line 2. Unrecognized text.` A PR title usually contains
  `#`, so this is easy to do by accident. Write `title Digital Curator PR 1`,
  or put the text in quotation marks. A `#` inside a quoted label is safe. A
  `#` in a `sequenceDiagram` or a `classDiagram` is also safe.

## 4. Worked examples

These three examples are the chosen diagram types for this bundle. You may
see other Mermaid diagram types referenced elsewhere: mindmap, state diagram,
block diagram, C4 component diagram. Ignore them. Those were alternates
considered for an earlier bundle, and they are not part of this contract.

### Level 1 — `C4Container`

```
C4Container
    title Digital Curator PR 1 — adds the SecurePII desktop container

    Person(user, "User", "Copies and pastes text containing PII")

    Container_Boundary(ext, "Chrome Extension (src/) — existing") {
        Container(bg, "Background service worker", "MV3", "Privacy filter, offscreen document")
        Container(content, "Content scripts", "TS", "Injected into claude.ai / chatgpt.com, intercepts paste/copy")
        Container(shared, "shared/", "TS", "Zustand store, redaction, paste-instruction.ts")
    }

    Container_Boundary(desk, "SecurePII Desktop (desktop/) — new in PR #1") {
        Container(monitor, "clipboard-monitor.ts", "Electron main", "Polls system clipboard every 500ms")
        Container(decision, "clipboard-decision.ts", "TS", "Redact / restore / pass-through ladder")
        Container(inference, "inference-host.ts", "Hidden BrowserWindow", "Reuses privacy-filter.ts over IPC (ADR-0001)")
        ContainerDb(records, "records-store.ts", "electron-store + Keychain", "Encrypted original values")
        Container(tray, "Tray / overlay", "Electron renderer", "Menu-bar UI, hotkeys")
    }

    System_Ext(chatapp, "AI Chat", "claude.ai / chatgpt.com")
    System_Ext(nativeapp, "Native apps", "Mail, Slack, IDE — previously unprotected")

    Rel(user, content, "Pastes into", "DOM paste event")
    Rel(content, chatapp, "Redacted text reaches")
    Rel(user, nativeapp, "Copies PII from")
    Rel(nativeapp, monitor, "Clipboard read", "polling")
    Rel(monitor, decision, "Attributed clipboard change")
    Rel(decision, inference, "Redact via")
    Rel(decision, records, "Store / restore original")
    Rel(monitor, tray, "Status updates")
    Rel(shared, decision, "Shared paste-instruction.ts (ADR-0002)")
```

### Level 2 — `sequenceDiagram`

```
sequenceDiagram
    participant User
    participant Mail as Mail (native app)
    participant SecurePII as SecurePII clipboard-monitor.ts
    participant Records as records-store.ts
    participant Chat as ChatGPT (browser)

    User->>Mail: Copy "SSN 123-45-6789"
    Mail-->>SecurePII: Clipboard change (polled, 500ms)
    SecurePII->>SecurePII: attribution.ts identifies frontmost app

    alt App is on exclusion list
        SecurePII-->>Mail: Leave clipboard unmodified
    else App is not excluded
        SecurePII->>SecurePII: clipboard-decision.ts chooses redact
        SecurePII->>Records: Store original, mint id 8a1f2c04
        SecurePII-->>Mail: Rewrite clipboard to "[ssn:8a1f2c04]"
    end

    User->>Chat: Paste "[ssn:8a1f2c04]" + placeholder instruction
    Chat-->>User: Reply echoes "[ssn:8a1f2c04]" verbatim
    User->>SecurePII: Copy reply from Chat
    SecurePII->>Records: Look up 8a1f2c04
    Records-->>SecurePII: Original "123-45-6789"
    SecurePII-->>User: Clipboard restored to original SSN
```

### Level 3 — `classDiagram`

```
classDiagram
    class ClipboardMonitor {
        +pollIntervalMs int
        +readClipboard() string
    }

    class Fingerprint {
        +hasChanged(content) bool
        +ignoreOwnWrites() void
    }

    class Attribution {
        +frontmostApp() string
        +usesLsappinfoFallback() bool
    }

    class Exclusions {
        +isExcluded(appId) bool
        +excludedApps list
    }

    class ClipboardDecision {
        +decide(content, app) Action
    }

    class InferenceHost {
        <<hidden BrowserWindow>>
        +reusesPrivacyFilter bool
        +runViaIPC() void
    }

    class RecordsStore {
        +store(id, original) void
        +restore(id) string
    }

    ClipboardMonitor --> Fingerprint : detects changes via
    ClipboardMonitor --> Attribution : identifies app via
    ClipboardMonitor --> ClipboardDecision : delegates to
    ClipboardDecision --> Exclusions : checks
    ClipboardDecision --> InferenceHost : redact/restore via
    InferenceHost --> RecordsStore : reads/writes originals

    note for InferenceHost "ADR-0001: reuses privacy-filter.ts\nverbatim instead of a native module"
```

## 5. Validation

`scripts/build_diagrams.py` checks every `.mmd` file before it compiles
`data/diagrams.js`. It checks three things. The first content line must
match the level's required diagram type. Brackets must balance across the
file. The file must not be empty once comments and blank lines drop out.
Run `--strict` to also parse each file with `mermaid-cli` through `npx`, when
`npx` is on the PATH.

A validation failure names the file and the line. Fix it in the `.mmd`
source — the compiled `data/diagrams.js` is a build product, and hand-editing
it does not survive the next build.
