---
title: Vendored Software Engineering Books
description: MIT license attribution and manifest for books vendored from ciembor/agent-rules-books.
status: active
---

# Vendored Software Engineering Books

These files are vendored verbatim from [ciembor/agent-rules-books](https://github.com/ciembor/agent-rules-books) — practical interpretations of canonical software-engineering books, converted into operational rules for AI coding agents.

**Loading policy:** see `../../SKILL.md` *Book References* section. Read `../book-index.md` first to pick a book; load AT MOST one primary + one optional companion; never combine `unified-software-engineering.md` with another book.

## Manifest

Vendored at upstream commit `2851b8535a86a6e6ea0210c013f95599b3b7c99f`.

| File | Upstream | Lines |
|---|---|---|
| `a-philosophy-of-software-design.md` | `a-philosophy-of-software-design/claude/.claude/rules/a-philosophy-of-software-design.md` | 320 |
| `clean-architecture.md` | `clean-architecture/claude/.claude/rules/clean-architecture.md` | 471 |
| `clean-code.md` | `clean-code/claude/.claude/rules/clean-code.md` | 246 |
| `code-complete.md` | `code-complete/claude/.claude/rules/code-complete.md` | 288 |
| `designing-data-intensive-applications.md` | `designing-data-intensive-applications/claude/.claude/rules/designing-data-intensive-applications.md` | 307 |
| `domain-driven-design.md` | `domain-driven-design/claude/.claude/rules/domain-driven-design.md` | 986 |
| `domain-driven-design-distilled.md` | `domain-driven-design-distilled/claude/.claude/rules/domain-driven-design-distilled.md` | 283 |
| `implementing-domain-driven-design.md` | `implementing-domain-driven-design/claude/.claude/rules/implementing-domain-driven-design.md` | 316 |
| `patterns-of-enterprise-application-architecture.md` | `patterns-of-enterprise-application-architecture/claude/.claude/rules/patterns-of-enterprise-application-architecture.md` | 354 |
| `refactoring.md` | `refactoring/claude/.claude/rules/refactoring.md` | 366 |
| `release-it.md` | `release-it/claude/.claude/rules/release-it.md` | 343 |
| `the-pragmatic-programmer.md` | `the-pragmatic-programmer/claude/.claude/rules/the-pragmatic-programmer.md` | 303 |
| `unified-software-engineering.md` | `unified-software-engineering/claude/.claude/rules/unified-software-engineering.md` | 1023 |
| `working-effectively-with-legacy-code.md` | `working-effectively-with-legacy-code/claude/.claude/rules/working-effectively-with-legacy-code.md` | 331 |

To check for upstream drift or refresh: `bash ../../scripts/sync-books.sh` (diff-only by default; pass `--apply` to overwrite + bump SHA).

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
