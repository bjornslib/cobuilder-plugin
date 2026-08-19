---
name: architecture
description: This skill should be used when the user asks to "review architecture", "audit codebase health", "design a system", "maintain codebase health", "check system design", "perform architecture review", "assess code quality", "security audit", "record an architecture decision", "create an ADR", "document a bounded context", "write a boundary record", "generate decision viewpoints", "document the architecture", "debug this", "find the root cause", "why is this failing", "diagnose", or mentions review, design, maintenance, architecture audit, codebase health, technical debt, refactoring plan, system design, decision records, architecture description, bounded context, or architecture governance. Supports six modes -- design, review, maintenance, decisions, describe, and debug -- invoked via skill argument or interactive prompt.
version: 1.0.0
title: "Architecture Review, Design & Maintenance"
status: active
---

# Architecture Review, Design & Maintenance

A mode-switchable skill for six use cases. System design covers architecture decisions and ADRs. Codebase review runs a security, architecture, and quality audit and produces dual HTML reports. Maintenance covers trend analysis and an incremental backlog. Decision records follow 42010 governance rules, with a state machine and a value facet. Architecture description documents a bounded context to the project standard. Debug diagnoses a root cause through divergent hypothesis generation. Design, review, and maintenance modes load a curated subset of the bundled corpus through `references/corpus-index.md`, plus the detected stack card from `references/stacks/`. Decisions and describe modes follow `references/decision-records.md` and `references/architecture-documentation.md`. Design, review, and debug modes also use `references/divergent-exploration.md`.

## Mode Invocation

Accept a mode argument when the skill is invoked. Prompt for one if the user gives none.

**Argument-based invocation:**
- `/cobuilder-architect:design` -- Design mode
- `/cobuilder-architect:review` -- Review mode
- `/cobuilder-architect:maintenance` -- Maintenance mode
- `/cobuilder-architect:decisions` -- Decision Records mode
- `/cobuilder-architect:describe` -- Architecture Description mode
- `/cobuilder-architect:debug` -- Debug mode

These modes are self-only. They analyse the session's own repo. Odyssey can target another checkout. Architecture cannot. If the user asks to analyse a different local checkout, or to override where output lands, refuse.

**Interactive fallback:** If invoked without an argument, prompt: "Which mode? (design / review / maintenance / decisions / describe / debug)". Do not assume review mode by default.

**Content-inferred fallback:** If the user says "help me design this" without a mode argument, infer `design`. If the user says "audit my codebase", infer `review`. If the user says "record this decision", "create an ADR", or "extract decisions from this PR", infer `decisions`. If the user says "document this module or context" or "write the boundary record", infer `describe`. If the user asks "why is X failing", asks to "find the root cause", or says "debug this", infer `debug`.

Narrated per-PR story generation, meaning explain-diff narratives, scene art, and voice narration, is not part of this skill. It lives in the `odyssey` skill in this plugin.

## Repo

The repo is always the session's own git toplevel. Normalise it once with `git rev-parse --show-toplevel`. There is no foreign target.

**Working directory.** Run READ commands at the repo toplevel. This keeps `references/saas-checklist.md`'s bare `grep` and `find` commands working. It also lets stack cards test bare filenames like `[ -f pyproject.toml ]`. Send WRITES to `{doc_root}` or `{doc_root}/review/`.

## Documentation Root

`{doc_root}` is always `docs/architecture/` under the repo toplevel.

If the repo already has a populated `docs/adr/` or `doc/adr/` tree, adopt that tree instead of creating a second one.

Send HTML review and maintenance reports to `docs/architecture/review/`. Filenames stay `architecture-review-YYYY-MM-DD-{technical,founder}.html`. Keep the pair co-located, because they cross-link with relative hrefs.

Resulting layout:
```
{doc_root}/adr/ADR-NNNN-<slug>.md
{doc_root}/contexts/<context-id>/{canvas.md,boundary.yaml}
{doc_root}/INVENTORY.md
{doc_root}/decisions/           # generated viewpoints
{doc_root}/review/              # HTML reports, both files together
```

## Mode Workflows

### Design Mode

**Scope:** Produce an Architecture Decision Record (ADR) with component diagrams for new or evolving systems.

**Corpus chain:**
1. Read `references/corpus-index.md` Section 1 for symptom mappings.
2. Load up to 3 files from: `corpus/principles/architecture/*`, `corpus/principles/ddd/*`, `corpus/principles/design_patterns/*`.
3. Detect the stack through `references/stacks/` (card fields, detection precedence, and fallback rules live in `references/stacks/README.md`), then load the matched card's Corpus Load list. Use the card's Reference Structure as the starting skeleton for component boundaries.
4. Load `corpus/principles/resilience/*` if the system has external integrations. This step is optional.
5. Check the pre-flight gate in `references/divergent-exploration.md` §1. This step can legitimately no-op if an abort condition applies. Otherwise, run divergent exploration per that reference using the **design frame set** (§3). Survivors populate the ADR's Considered Options section. Every trap the critic flags becomes a rejected-option entry with its reason recorded. This is what turns the ADR from a record of one choice into a record of a decision.

**Output:** An ADR markdown document (`{doc_root}/adr/ADR-NNNN-<slug>.md`) with component boundaries, interface contracts, and dependency direction. An HTML version can optionally be produced using the report conventions in the Report Generation section below.

### Review Mode

**Scope:** An audit of security, architecture, code quality, scaling, maintainability, dependency health, and testing. Produces two linked self-contained HTML reports.

**Corpus chain:**
1. Read `references/corpus-index.md` Section 1 for symptom mappings.
2. Load design corpus (`corpus/principles/architecture/*`, `corpus/principles/ddd/*`, `corpus/principles/design_patterns/*`).
3. Detect the stack through `references/stacks/` (precedence and fallback rules live in `references/stacks/README.md`), then load the matched card's Corpus Load list. Apply the card's Boundary Rules and Review Checks. Report deviations from its Reference Structure as architecture findings.
4. **Load security corpus:** `corpus/principles/security/*` -- ALL 14 files. This is mandatory for review mode.
5. Load `corpus/principles/testing/*`, `corpus/principles/resilience/*`, and `corpus/principles/data_systems/*` (as design choices).
6. Load `corpus/refactorings/*` for diagnostic smells.
7. Load `corpus/reviews/*` for worked audit examples.
8. **Load the SaaS checklist:** `references/saas-checklist.md` -- the detection method for SaaS-specific security, architecture, and quality issues.
9. Blind-spot hunt: run divergent exploration per `references/divergent-exploration.md` using the **review frame set** (§3), after the checklist above has run. Tell hunters what the checklist already found, and instruct them to look elsewhere. This is what makes it a blind-spot hunt rather than a duplicate scan. Survivors enter the normal P0/P1/P2 severity flow below. The scoring rubric, impact taxonomy, size categorisation, and both report templates need no changes.

**Output:** Two linked HTML artifacts, written to `docs/architecture/review/`:
1. **Technical Report (B)** -- First. Severity-tagged findings (P0/P1/P2), file-level evidence blocks, code paths, and remediation prompts. Uses `references/reports/architecture-review-TECHNICAL-TEMPLATE.html` as the design reference.
2. **Founder Report (A)** -- Second. A plain-language translation of the Technical Report findings. It carries a health score (0-100), a letter grade, and 8 category breakdown bars. Findings are business-impact-first, with right-aligned severity badges (`Blocking` / `Warning` / `Plan` / `Pass`). It also carries a phased remediation plan, AI prompt packs with copy buttons, and a comparison with the previous scan. Uses `references/reports/architecture-review-FOUNDER-TEMPLATE.html` as the design reference.

**Always generate both reports.** No toggle to skip either.

### Maintenance Mode

**Scope:** Trend analysis and net-new finding detection. Reuses the review corpus chain.

**Prior scan detection:** Scan `docs/architecture/review/` for existing `architecture-review-YYYY-MM-DD-technical.html` files. Sort them by the date in the filename. Never scan the repo unbounded. Scan only that one directory. If a prior scan exists:
- Compare the current findings with the prior scan.
- Surface NEW, ESCALATED, STABLE, and RESOLVED items in the Trend section.
- Highlight regressions in a top callout.

If no prior report exists, state: "This is the first scan. Future audits will compare against this baseline."

**Corpus chain:** Same as Review mode.

**Refactoring invocation:** When diagnostics flag a specific smell (god class, duplicated code, long function, and so on), load the matching `corpus/refactorings/<smell>.yaml` on demand. Do not pre-load all refactoring files.

**Output:** A trend report (HTML or markdown), written to `docs/architecture/review/`, showing the delta, plus an incremental backlog. If structural fixes are required, produce a refactoring plan that references the loaded refactoring YAML.

### Decisions Mode

**Scope:** Author, retro-extract, or update ISO/IEC/IEEE 42010 decision records. These are ADRs with a machine-readable frontmatter index, a state machine, and a mandatory value facet. This mode also refreshes the generated decision viewpoints.

**Workflow:**
1. Read `references/decision-records.md` for the full record schema, the state machine, the transition rules, and the integrity rules. Read it before writing any record.
2. Start every new record from `references/templates/adr-template.md`. Records live in `{doc_root}/adr/ADR-NNNN-<slug>.md` (zero-padded, next free number).
3. For retro-extraction from a merged PR, write one record per structural decision in the PR. Set `state: approved` (it merged), set `source_pr`, and date `history` entries to the merge. Never invent dates (see the integrity rules).
4. During retro-extraction, also consult the detected stack card's ADR Topics (`references/stacks/`) as a checklist for decisions the codebase has made but never recorded.
5. Every record MUST carry a `delivers` block (capability, benefit, and beneficiary) and a `## Value delivered` body section. A record without value framing fails the standard.
6. Anchor `maps_to` to a context or module that exists in a `boundary.yaml` under `{doc_root}/contexts/`. If the context is undocumented, flag it, or switch to `describe` mode first.
7. After you add or change records, refresh the three viewpoint files in `{doc_root}/decisions/` (relationship, chronology, capabilities), so they stay consistent with the record set.

**Output:** ADR file(s) plus updated viewpoint indexes, under `{doc_root}`. Canonical standard: `references/standard.md` §5.4.

### Describe Mode (Architecture Description)

**Scope:** Document a bounded context to the project's Architecture Documentation Standard: a ddd-crew canvas, C4 diagrams, and the machine-diffable boundary record that makes drift detectable.

**Workflow:**
1. Read `references/architecture-documentation.md` for the authoring procedure, and consult `references/standard.md` (canonical) for artifact definitions.
2. **Verify before writing.** Ground every claim in code. Enumerate the context's modules, grep its real import edges in both directions, and identify its actual public interface. Never write a boundary rule you have not checked against the code.
3. Produce the context bundle in `{doc_root}/contexts/<context-id>/` from the templates: `canvas.md` (from `references/templates/canvas-template.md`, eight canvas sections plus embedded C2/C3 Mermaid) and `boundary.yaml` (from `references/templates/boundary-template.yaml`). Seed `forbidden_dependencies` candidates from the detected stack card's Boundary Rules (`references/stacks/`), and keep only those verified against the code in step 2.
4. Record any boundary violation found during verification, such as inverted imports, schema leakage, or term overloading. Add it to the canvas as a `forbidden_dependencies` entry with a `why`, and flag it as an ADR candidate. Surfacing smells is a primary output, not a side effect.
5. Update `{doc_root}/INVENTORY.md` (doc status, findings).

**Output:** `canvas.md` plus `boundary.yaml` for the context, an updated INVENTORY, and a list of surfaced ADR candidates, under `{doc_root}`. Minimum bar: `references/standard.md` §8.

### Debug Mode

**Scope:** Diagnose the root cause of a specific failure or bug. Does not implement the fix.

**Workflow:**
1. Reproduce the bug first, inside the repo. A hypothesis about an unreproduced bug is a guess.
2. Diverge hypotheses: run divergent exploration per `references/divergent-exploration.md` using the **debug frame set** (§3).
3. The critic ranks surviving hypotheses by **cheapest discriminating test**, not by likelihood. This override is defined in `references/divergent-exploration.md` §4.
4. Run that test, inside the repo.
5. Converge on a root cause, or re-diverge on the surviving hypotheses if the test does not resolve it.

**Output:** A root-cause statement, the evidence, the specific discriminating observation that confirmed it, a recommended fix, and a regression test that would have caught it. This mode delivers diagnosis and a recommended fix, not the fix itself. It writes no report directory.

## Report Generation

When you produce human-consumable deliverables, follow these rules:

1. **Default to HTML.** Use the Report category (Category 8) and Data-Rich Document (Category 10) patterns.
2. **Copy the design system:** Use the ivory/slate/clay palette from `assets/design-system.css`. Keep it self-contained, with no external dependencies.
3. **Include a `.prompt-box`** in the page header. Document the scan parameters and the command that generated the report.
4. **Generate the Technical Report (B) first, then the Founder Report (A).** The Technical Report contains the "Technical Report Summary" section. The Founder Report contains the "Executive Summary." Founder findings are translations of Technical Report findings. Lock the technical evidence before you translate it.
5. **Link bidirectionally:** Link every founder finding to its technical counterpart through an anchor (`#SEC-01`), and link back the same way. Filenames follow `architecture-review-YYYY-MM-DD-technical.html` and `architecture-review-YYYY-MM-DD-founder.html`. The two reports link to each other with relative hrefs, so keep them co-located in `docs/architecture/review/`.
6. **Add copy buttons:** Include "Copy AI prompt" buttons on founder findings, using inline JS clipboard.
7. **Reference templates:** Consult `references/reports/architecture-review-TECHNICAL-TEMPLATE.html` and `references/reports/architecture-review-FOUNDER-TEMPLATE.html` for the exact component structure: severity badges, score bars, impact tags, evidence blocks, and phased plan cards.
8. **Technical Report Summary, not Executive Summary.** The technical report's top section is titled "Technical Report Summary." It summarises the P0/P1/P2 counts and the audit scope. The Founder Report has the "Executive Summary."
9. **AI prompts reference the technical report filename.** Every AI prompt block in the Founder Report must reference the technical report filename. For example: "Load the full technical context from `architecture-review-YYYY-MM-DD-technical.html` before implementing." This lets a coding agent load the complete evidence.
10. **No developer-hour estimates in founder findings.** Do not estimate hours or days. Instead, categorise every finding as one of: `Bugfix`, `Small Change`, `Medium Change`, `Large Feature or Migration`. Count findings by category in a summary table at the top of the Remediation Plan section.
11. **Large items require a solution design document.** Every finding categorised as `Large Feature or Migration` must include a note: "Before coding: produce a solution design document referencing `architecture-review-YYYY-MM-DD-technical.html`. The coding agent must load the full technical report for context before implementation."
12. **Founder finding structure.** Each founder finding must contain six parts. A right-aligned severity badge (`Blocking` / `Warning` / `Plan` / `Pass`). Domain and business impact tags. "What We Found," a plain-language description of the discovery. "Impact If Not Fixed," the business consequence. The AI prompt with a copy button. The size category badge.

## Impact Taxonomy for Founder Reports

Every finding in the Founder Report must carry exactly one **domain** tag and one **business impact** tag:

| Domain | Business Impact |
|---|---|
| **Security** -- vulnerabilities, auth gaps, data exposure | **Compliance** -- GDPR, SOC2, contractual data handling |
| **Scaling** -- performance bottlenecks, resource exhaustion | **Reputational** -- customer trust, public incidents |
| **Maintainability** -- code structure, docs, dependency health | **Financial** -- blocked fundraising, churn, downtime cost |
| **Technical Debt** -- deferred structural fixes (subsumed under Maintainability but surfaced separately to justify urgency) | |

Clean categories render as `.bubble.pass` with a "PASS" badge. Do not silently omit clean areas.

## Size Categorisation

Every finding in the Founder Report must be tagged with exactly one size category:

| Category | Definition | Requires Solution Design |
|---|---|---|
| **Bugfix** | A single, bounded fix with no structural changes. One file, one function, one line. | No |
| **Small Change** | A contained change affecting 2-5 files. No new dependencies or architecture shifts. | No |
| **Medium Change** | A cross-module change requiring coordination across 5-15 files. May introduce new patterns. | No, but recommended |
| **Large Feature or Migration** | Structural refactoring, framework migration, or multi-service changes. >15 files or >500 lines delta. | **Yes** -- must produce a solution design document before coding |

Render the size category as a `.tag` next to the severity badge.

## Scoring Rubric

Do not fabricate health scores. Compute category scores from the actual findings counts.

### Category Score Formula

```
deductions = (P0_count * 12) + (P1_count * 7) + (P2_count * 3)
deductions = min(deductions, 55)  -- hard cap to prevent floor-hitting
score = 100 - deductions
```

- A single P0 drops a category by 12 points (to 88).
- Two P0 plus three P1 drops it by 45 (to 55).
- The only way below 50 is if raw deductions exceed 55 (hard cap), roughly equivalent to 4+ P0 or 7+ P1.

### Weights (8 categories)

| Category | Weight |
|---|---|
| Security | 25% |
| Architecture | 20% |
| Code Quality | 15% |
| Scaling | 15% |
| Maintainability | 10% |
| Technical Debt | 5% |
| Dependency Health | 5% |
| Testing | 5% |

Compute the **Overall Score** as a weighted average. Grade mapping: ≥90 A, ≥75 B, ≥60 C, ≥50 D, <50 F.

### Rendering Rule

In the Founder Report, each category bar must carry a `title` or tooltip that shows: `(1 P0, 2 P1, 0 P2 → 74/100)`. The number is never bare.

### Scripted Computation (preferred)

Instead of asking the LLM to compute scores, emit a JSON snippet of P0/P1/P2 counts and pipe it through the provided scoring script:

```bash
cat scores.json | uv run "${CLAUDE_PLUGIN_ROOT}/scripts/compute_scores.py"
```

`${CLAUDE_PLUGIN_ROOT}/scripts/html_to_pdf.py` converts a finished HTML report to an A4 PDF and requires playwright.

**Input JSON shape:** Provide counts for any subset of the 8 categories. An omitted category defaults to zero findings (score 100), and the script lists it under `defaulted` in its output, so a partial payload stays auditable. Category names are case-sensitive and must match one of the 8 exactly. An unrecognised name is a hard error, not a silently ignored key. The eight names are exactly: `Security`, `Architecture`, `Code Quality`, `Scaling`, `Maintainability`, `Technical Debt`, `Dependency Health`, `Testing` (lowercase `"security"`, for example, is rejected).

```json
{
  "Security":          {"P0": 2, "P1": 3, "P2": 1},
  "Architecture":      {"P0": 0, "P1": 2, "P2": 1},
  "Code Quality":      {"P0": 0, "P1": 0, "P2": 0},
  "Scaling":           {"P0": 0, "P1": 1, "P2": 0},
  "Maintainability":   {"P0": 0, "P1": 0, "P2": 0},
  "Technical Debt":    {"P0": 0, "P1": 0, "P2": 0},
  "Dependency Health": {"P0": 0, "P1": 0, "P2": 0},
  "Testing":           {"P0": 0, "P1": 0, "P2": 0}
}
```

**Output JSON shape:** `category_scores` (deductions, raw, capped boolean, score, tooltip). `overall` (weighted_score, grade, formula). `defaulted` (the list of categories omitted from the input). If the report generator states "eight categories assessed," it must reconcile that claim against `defaulted`. A category that defaulted was not scanned. Reporting it as a clean pass would be a false assurance in a security-bearing report.

If the script is unavailable, fall back to manual computation.

## Domain-Driven Design Assessment

In Review and Maintenance modes, run a lightweight DDD boundary check in the Architecture section:

1. **Scan import graphs.** Flag a `PLAN`-severity architecture finding if any module is both imported by 8+ domain subdirectories and imports back from 8+ subdirectories. This is bidirectional coupling, or a god class.
2. **Scan term overloading.** Flag a `PLAN`-severity architecture finding if the same symbol (for example, `Bank`, `Entity`, `User`) appears in more than 100 cross-module references. It must also show 2 or more semantically distinct usage patterns, for example aggregate root versus database row versus configuration namespace.
3. **Scan schema leakage.** Flag a `PLAN`-severity architecture finding if a domain package imports another's `storage`, `models`, or `schema` module directly. This bypasses an explicit contract or domain event.
4. **Scan for anti-corruption layers.** Flag a `PLAN`-severity architecture finding if subdomains communicate through a shared database schema, instead of domain events, messages, or explicit adapter interfaces.

If any of checks 1-4 trigger, surface a dedicated DDD finding. Recommended remediation: produce a bounded-context glossary and a context map before you decompose god classes or extract services.

## Historical Trending

For Maintenance mode, scan `docs/architecture/review/` (never the repo unbounded; see the Prior scan detection rule under Maintenance Mode above) for prior `architecture-review-YYYY-MM-DD-*.html` files. Sort them by the date in the filename. Compare with the most recent prior scan:
- **NEW** -- a finding not present in the prior scan
- **ESCALATED** -- severity increased since the prior scan
- **STABLE** -- same severity, still present
- **RESOLVED** -- present in the prior scan, absent now

Render the comparison in a table with color-coded status tags. Mark prior scan findings with no current match as "RESOLVED." Mark current findings with no prior match as "NEW."

## Security in Review and Maintenance

Review and Maintenance modes **must** load `corpus/principles/security/*`. This is not optional. The skill's bundled corpus includes 14 dedicated security principle cards. They cover tenant isolation, input validation, secrets management, API security, supply chain, cloud and platform concerns, layer boundaries, XSS/CSRF/CSP, SSRF and deserialization, cryptographic key management, RBAC/ABAC, audit logging, frontend security, and file upload and API hardening. Load all 14 files for any review or maintenance task.

## Quick Reference

| File | Purpose |
|---|---|
| `references/corpus-index.md` | Symptom-keyed index to ~170 corpus YAML files. Read this first before loading any corpus. |
| `references/stacks/README.md` | Stack card contract: detection precedence, card fields, STUB convention. Per-stack cards (`python-fastapi`, `react-typescript`, `nextjs`, `generic`) live beside it. |
| `references/decision-records.md` | Decisions mode: 42010 record schema, state machine + legal transitions, delivers facet, integrity rules |
| `references/architecture-documentation.md` | Describe mode: bounded-context authoring procedure (canvas, boundary record, verification discipline) |
| `references/divergent-exploration.md` | Diverge/focus engine used by design, review, and debug modes: pre-flight abort gate, three frame catalogues, separate critic pass (scores, traps, agreement, starred survivors), output schema |
| `references/templates/adr-template.md` | Canonical ADR skeleton — scripts validate against this shape |
| `references/templates/canvas-template.md` | Canonical Bounded Context Canvas skeleton (8 sections + C2/C3) |
| `references/templates/boundary-template.yaml` | Canonical machine-diffable boundary record schema |
| `references/reports/architecture-review-TECHNICAL-TEMPLATE.html` | Visual reference for Technical Report layout, severity bubbles, evidence blocks, module tables |
| `references/reports/architecture-review-FOUNDER-TEMPLATE.html` | Visual reference for Founder Report layout, score bars, impact tags, AI prompt blocks, phased plan |
| `${CLAUDE_PLUGIN_ROOT}/scripts/compute_scores.py` | Deterministic scoring engine. Pipe P0/P1/P2 counts JSON → get exact scores and grades. |
| `${CLAUDE_PLUGIN_ROOT}/scripts/html_to_pdf.py` | Converts a finished HTML report to an A4 PDF. Requires playwright. |
| `references/saas-checklist.md` | SaaS codebase review checklist — detection commands, remediation patterns, 5-phase scanner pipeline |
| `references/harness-security.md` | LLM-harness security detection rules |
| `references/agent-legible-principles.md` | 4 agent-legibility principles with before/after examples |
| `references/mechanical-enforcement.md` | 5 grep-checkable CI rules |
| `references/book-index.md` | Catalog of 14 vendored books. Load at most one per task (Tier 2 fallback). |
