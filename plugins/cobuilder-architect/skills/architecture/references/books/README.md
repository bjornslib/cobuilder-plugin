---
title: Vendored Software Engineering Books
description: MIT license attribution and manifest for books vendored from ciembor/agent-rules-books.
status: active
---

# Vendored Software Engineering Books

These files are vendored verbatim from [ciembor/agent-rules-books](https://github.com/ciembor/agent-rules-books) — practical interpretations of canonical software-engineering books, converted into operational rules for AI coding agents.

**Loading policy:** see `../book-index.md`. Per ADR-0021, load a minimum of
three `nano`-tier excerpts once Tier 1 narrows the candidate books, then
escalate any one of those books to `mini` or `full` only when its
principles are judged to matter for the task. Never combine
`unified-software-engineering.md` with another book — it has no nano/mini
tier and stays load-alone.

## Manifest

`full` tier vendored at upstream commit `2851b8535a86a6e6ea0210c013f95599b3b7c99f`.
`nano`/`mini` tiers vendored at upstream commit `9c8763613514e4047d75c089533e09bc4b493c28`
(ADR-0021 — upstream added these tiers after the `full` files were first vendored).
`unified-software-engineering.md` has no `nano`/`mini` counterpart upstream; it
is the synthesis book and stays load-alone regardless of tier.

| Book | `nano` | `mini` | `full` | Full lines |
|---|---|---|---|---|
| A Philosophy of Software Design | `a-philosophy-of-software-design.nano.md` | `a-philosophy-of-software-design.mini.md` | `a-philosophy-of-software-design.md` | 320 |
| Clean Architecture | `clean-architecture.nano.md` | `clean-architecture.mini.md` | `clean-architecture.md` | 471 |
| Clean Code | `clean-code.nano.md` | `clean-code.mini.md` | `clean-code.md` | 246 |
| Code Complete | `code-complete.nano.md` | `code-complete.mini.md` | `code-complete.md` | 288 |
| Designing Data-Intensive Applications | `designing-data-intensive-applications.nano.md` | `designing-data-intensive-applications.mini.md` | `designing-data-intensive-applications.md` | 307 |
| Domain-Driven Design | `domain-driven-design.nano.md` | `domain-driven-design.mini.md` | `domain-driven-design.md` | 986 |
| Domain-Driven Design Distilled | `domain-driven-design-distilled.nano.md` | `domain-driven-design-distilled.mini.md` | `domain-driven-design-distilled.md` | 283 |
| Implementing Domain-Driven Design | `implementing-domain-driven-design.nano.md` | `implementing-domain-driven-design.mini.md` | `implementing-domain-driven-design.md` | 316 |
| Patterns of Enterprise Application Architecture | `patterns-of-enterprise-application-architecture.nano.md` | `patterns-of-enterprise-application-architecture.mini.md` | `patterns-of-enterprise-application-architecture.md` | 354 |
| Refactoring | `refactoring.nano.md` | `refactoring.mini.md` | `refactoring.md` | 366 |
| Release It! | `release-it.nano.md` | `release-it.mini.md` | `release-it.md` | 343 |
| The Pragmatic Programmer | `the-pragmatic-programmer.nano.md` | `the-pragmatic-programmer.mini.md` | `the-pragmatic-programmer.md` | 303 |
| Unified Software Engineering | *(none)* | *(none)* | `unified-software-engineering.md` | 1023 |
| Working Effectively with Legacy Code | `working-effectively-with-legacy-code.nano.md` | `working-effectively-with-legacy-code.mini.md` | `working-effectively-with-legacy-code.md` | 331 |

To check for upstream drift or refresh: `bash ../../scripts/sync-books.sh` (diff-only by default; pass `--apply` to overwrite + bump SHA). This script does not exist yet in this repository — see ADR-0021's out-of-scope note.

## License

The vendored content is distributed under the MIT License, reproduced verbatim below.

```
MIT License

Copyright (c) 2026 Maciej Ciemborowicz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
