# Assessment — Submit mode — author interview and architecture assessment

**Verdict:** Concerns  
**Risk tier:** Architectural  
**Stage:** pre-merge

## Summary

The change adds a fifth mode that captures author intent before a PR opens, assesses the change against the bundle, and then opens the PR. It reuses the open-PR discovery, the migration guard, and the ADR record shape rather than duplicating them, and it activates a consumer contract the stack cards already declared. Two costs are real and accepted: story.json grows, and the plugin takes its first outward-facing action.

## Question 1 — is this sensible?

Yes, on both halves. The stated problem is real and visible in the codebase, not hypothetical: decision-records-lite.md §3.4 already documents the escape hatch that exists because intent is lost at submit time. The change also belongs at this layer. Intent capture has to live where the diff and the baseline both are, and that is the odyssey skill.

Evidence: `skills/odyssey/references/decision-records-lite.md:74` `skills/odyssey/references/stacks/README.md`

## Question 2 — maintainability and readability

Helps, on balance. The intent block removes a whole category of inference from generate mode, and the alternatives shape matches adrs.json exactly, so an interviewed alternative moves into an ADR with no translation layer. The cost is that story.json now carries two more authored blocks, and one of them can be large.

**Constraint introduced:** Submit mode owns `intent` and `assessment` on a timeline entry. Generate mode reads them and never overwrites them, the same discipline extract_story.py already applies to authored narrative. Both fields are in AUTHORED_TIMELINE_FIELDS, so any future migration that touches either one must declare it or the guard aborts the run.

Evidence: `scripts/migrate_bundle.py:69` `scripts/extract_story.py`

## Question 3 — new pattern, duplicate, or reinvention?

**New pattern, and it earns its place**

The mode is new to this plugin, and it does not duplicate anything in the bundle. It is close to a pattern the repo already designed and never wired: stacks/README.md's Card Fields table names `## Boundary Rules` as consumed by "review findings" and `## Review Checks` as consumed by "review/maintenance", for a review mode that README.md's extraction manifest records as deliberately excluded. This change consumes those sections rather than inventing a parallel rubric, which is why it reads as activation rather than reinvention. What it adds that the excluded mode did not have is author-side intent capture.

Evidence: `skills/odyssey/references/stacks/README.md` `README.md:334`

## Will we regret this?

The regret case is a mode that ships and nobody runs twice, because the interview asks generic questions and the assessment restates the diff. That failure is invisible in code review and only shows up in use, which is why interview-guide.md §2 puts the evidence-first rule ahead of everything else and caps the question count. The second regret case is smaller and reversible: story.json grows past comfort, and the fix is a separate file with a proper migration ladder. The outward-facing PR creation is the change hardest to walk back, because it sets a precedent for what this plugin is allowed to do. That one is worth holding the line on — opening the PR the author asked for is the whole scope, and comments, body edits, labels, and merges stay out.

## Findings

| Severity | Finding | Evidence |
|---|---|---|
| concern | story.json carries assessment findings inline, and grows with every reviewed PR | `.prodyssey/self/data/story.json` |
| concern | SKILL.md's preamble calls this a read-only, generate-only instrument, and submit mode pushes a branch and opens a PR | `skills/odyssey/SKILL.md:20` |
| note | adrs.json still has no migration ladder and no authored-field guard | `CLAUDE.md:284` |
| note | detect_default_branch leaked git's `fatal:` to stderr on every call in a repo with no origin/HEAD symref | `scripts/extract_diffs.py:96` |

**Suggestions**

- **story.json carries assessment findings inline, and grows with every reviewed PR** — Accept for now. The fix, if it becomes a problem, is a separate file with a migration ladder — not a second adrs.json.
- **SKILL.md's preamble calls this a read-only, generate-only instrument, and submit mode pushes a branch and opens a PR** — Reword the preamble and the Notes invariant so the claim stays true, and keep the confirmation step mandatory.
- **adrs.json still has no migration ladder and no authored-field guard** — Unchanged by this PR. Storing intent and assessment on the timeline entry avoids adding a second file with the same gap.
- **detect_default_branch leaked git's `fatal:` to stderr on every call in a repo with no origin/HEAD symref** — Fixed in this change, in both copies of the deliberately duplicated helper.

## Boundary checks

| Result | Rule | Source | Evidence |
|---|---|---|---|
| pass | Inner layers never import outer layers (generic.md dependency rule) | `stacks/generic.md` | `render_review.py imports only stdlib; no script imports the skill or the viewer` |
| pass | Config crosses into code in one place | `stacks/generic.md` | `SCHEMA_VERSION and CURRENT_BUNDLE_FORMAT stay in scripts/_bundle_meta.py; no new literal added elsewhere` |
| pass | Scripts move data, Claude judges (repo-local rule, CLAUDE.md) | `CLAUDE.md` | `render_review.py renders; it makes no verdict and calls no service` |

## District delta

- `scripts`: 12 -> 13 files
- `skills`: 50 -> 53 files
- `commands`: 4 -> 5 files

---

_Generated by prodyssey submit mode on 2026-08-04._
