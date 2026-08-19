# Submit mode — author interview and architecture assessment

## Problem

Prodyssey reconstructs author intent from merged diffs, long after the author forgot it. That is expensive, and it is lossy: decision-records-lite.md §3.4 carries an explicit escape hatch for the case where no rejected alternative survives in the record, because the intent was lost when the PR was submitted. Meanwhile PR review itself has moved. Writing code is cheap now, verifying it is not, and a diff can look intentional while carrying almost no human intent.

The bundle already holds the three things a reviewer needs and a generic diff-reading tool does not have: the district map in inventory.yaml, every structural decision in adrs.json, and the narrated history of how the repo got here. Nothing consumed them at review time. The stack cards even declare the consumer contract already, in stacks/README.md, and it has been dormant since the extraction.

## Why this approach

A fifth mode, `submit`, inside the odyssey skill rather than a separate skill, because it needs the bundle, the baseline, and the decision history. The pre stage reads the evidence, interviews the author for only what the evidence cannot settle, assesses the change against the bundle, and then opens the pull request with the generated description as its body. The post stage compares what shipped against what the author claimed. The captured `intent` then feeds generate mode, so narrative and ADR authoring stop guessing.

## Alternatives considered

- **Keep review as a separate skill in the plugin** — rejected because the whole value is reviewing against the accumulated odyssey, which means sharing Hub resolution, the bundle dir, migration, and verification with the other four modes.
- **Target only an existing open PR number** — rejected because the author wants the interview before submitting, and the existing open-PR path already requires the PR to exist on GitHub first.
- **Let a working-branch run write a synthetic PR key into story.json** — rejected because story.json keys on an integer `pr`, and a synthetic key would leak into verify_bundle.py, record_publish.py, the viewer, and the publish manifest.
- **End a working-branch run at a dead-end export directory, and require a second run once the PR exists** — rejected because the author pointed out this leaves the PR-number hole open; ending the interview by opening the PR earns a real number instead of inventing one.
- **Post the assessment to GitHub as a PR comment, behind a flag** — rejected because the author asked for local output written into the repo the user points at; opening the PR is the only outward action the mode takes.
- **Add a fifth level to the viewer rail** — rejected because it touches renderMainContent, deriveLevelContent, audio derivation, and the comment-tagging chip, and it changes what "four-level odyssey" means across every doc.
- **Store the assessment in a new top-level reviews.json** — rejected because adrs.json already carries the no-migration-ladder debt, and a second such file doubles it; the timeline entry gets the guard for free.

## Out of scope

- Lint-grade findings — missing null checks, naming, unhandled error paths, test-coverage gaps. Commodity work that buries the judgment it is mixed with.
- Any score, grade, or pass rate.
- Any merge gate. A `rework` verdict does not block PR creation.
- The ~170-YAML principle corpus from the parent skill. The stack cards' `## Corpus Load` sections point at paths this plugin does not ship.
- A migration ladder for adrs.json. Still absent, still known.

## Risks

- The interview is the product. Generic questions make this a worse version of a generic AI reviewer.
- story.json grows. An assessment with findings is much larger than a tagline.
- Opening a PR is the first outward-facing action this plugin takes, and it contradicts the read-only claim in SKILL.md's preamble unless that preamble is reworded.
- The duplicate and reinvention check is only as good as the bundle. A repo with two generated PRs cannot answer it.

## How this was tested

migrate_bundle.py --dry-run on all three committed bundles: one-line diff each, zero authored-field guard violations. verify_bundle.py required-failure set compared against master for .prodyssey/self: identical, so the new keys add no regression. cobuilder-harness required-failure count 86 on master and 86 on this branch. extract_diffs.py --branch cross-checked against `git diff --shortstat`: 99 files, +26559/-335, exact match. Error paths exercised: --prs with --branch, neither flag, a branch with no commits beyond its base.

## Where to focus

- references/interview-guide.md §2 and §3. If the evidence-first rule and the question budget do not hold up, nothing downstream matters.
- The confirmation step before push and PR creation. It is the only thing standing between this mode and an unwanted public action.
- verify_bundle.py's optional-by-default treatment of intent and assessment. A bundle generated before this mode existed must not start failing.

---

_Authorship: agent-generated._
