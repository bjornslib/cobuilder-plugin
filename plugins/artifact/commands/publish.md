---
title: "Odyssey: Publish PR Stories"
status: active
type: command
last_verified: 2026-07-22
---

# Odyssey: Publish PR Stories

Flattens already-generated PRs into self-contained Claude Artifacts — one per
PR, plus an auto-updating index artifact linking to every PR published so far
for this bundle.

Invoke the `artifact` skill in publish mode, forwarding any arguments the user
supplied after `/artifact:publish` (`--repo <path>`, `--store local|central`,
`--prs`, `--format`, `--force`):

```
Skill("artifact", args="publish $ARGUMENTS")
```

## Requirements

- The PR(s) must already exist in the bundle's `data/story.json` — run
  `/pr:review --prs <N>` in the `pr` plugin first
  if not.
- Publishing needs the `Artifact` tool, which requires a `/login` session on
  a paid plan (Pro/Max/Team/Enterprise) — not an API-key or cloud-credential
  session. If it's unavailable, the flattened export files are still written
  to `<bundle-dir>/exports/` and usable another way.
- No `GEMINI_API_KEY` needed — publish mode only repackages what
  baseline/review already produced.

## Formats

`--format artifact` (default) is the only implemented target today.
`--format notion` is accepted but not yet implemented — the skill reports
that clearly rather than silently publishing as an artifact instead.

## Staleness

Re-running `/artifact:publish` for a PR that hasn't changed since its last
publish reports "already up to date" and skips re-publishing it — no wasted
Artifact calls. A PR is considered changed if its underlying commit moved
(new commits landed on an open PR) or its narrative/ADR content was
re-authored at the same commit. `--force` republishes regardless.

## Examples

```
/artifact:publish --prs 73
/artifact:publish --prs 73,75
/artifact:publish --prs 73 --force
/artifact:publish --repo ~/code/other-project --prs 12
```
