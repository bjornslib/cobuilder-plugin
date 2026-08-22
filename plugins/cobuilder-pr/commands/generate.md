---
title: "Odyssey: Generate PR with Review"
status: active
type: command
last_verified: 2026-08-21
---

# Odyssey: Generate PR with Review

Interviews the author of a change, assesses the change against the bundle, and
opens the pull request with the generated description as its body. Answers three
questions a diff cannot: is this sensible, does it help or hurt maintainability,
and does it introduce a valuable pattern or duplicate one the repo already has.
The captured intent stays in `.cobuilder-architect/`, so `/cobuilder-architect:review` later reads
what the author said instead of inferring it.

Invoke the `odyssey` skill in generate mode, forwarding any arguments the user
supplied after `/cobuilder-architect:generate` (`--repo <path>`, `--store local|central`,
`--prs`, `--stage pre|post`, `--branch <ref>`, `--base <branch>`, `--draft`,
`--no-create`, `--non-interactive`):

```
Skill("odyssey", args="generate $ARGUMENTS")
```

Run it with no arguments on a branch that has no PR yet, and it interviews you
and opens the PR. Run it with `--prs <N>` against an open PR, and it assesses
that PR without creating anything.

## What this opens

This is the one command in the plugin that acts outside `.cobuilder-architect/`. On a
branch with no pull request, it pushes the branch and runs `gh pr create` —
after showing you the description, the base branch, and the verdict, and asking
first. Nothing is pushed or opened without that confirmation.

It does nothing else on GitHub. No comments, no edits to an existing PR body, no
labels, no reviewers, no merges. `--no-create` stops before the push and leaves
the description and the assessment in `docs/pull-requests/branch-<slug>/`.

## Stages

`--stage pre` (default) runs before the merge: interview, assess, open the PR.

`--stage post` runs after it, and compares what actually shipped against what
the author said before it shipped — scope that was declared out and touched
anyway, risks that never got a guard, rejected options the merged code adopted.
It never rewrites the intent captured earlier.

## Requirements

- A git repo, `uv` on PATH, and `gh` authenticated if you want the PR opened.
  Without `gh`, the command still writes both markdown files and prints the
  `gh pr create` line for you to run.
- No `GEMINI_API_KEY`. Generate mode generates no art and no audio.
- A baseline helps and is not required. The duplicate-or-reinvention check reads
  `inventory.yaml` and `data/adrs.json`, so a bundle with little history reports
  "insufficient history" rather than guessing.

## Verdicts

`sound`, `concerns`, or `rework`. A `rework` verdict never blocks the PR — it is
reported, and you decide whether to open it, open it as a draft, or fix first.

## Examples

```
/cobuilder-architect:generate
/cobuilder-architect:generate --draft
/cobuilder-architect:generate --no-create
/cobuilder-architect:generate --base develop
/cobuilder-architect:generate --prs 73
/cobuilder-architect:generate --prs 73 --stage post
/cobuilder-architect:generate --repo ~/code/other-project --prs 12
```
