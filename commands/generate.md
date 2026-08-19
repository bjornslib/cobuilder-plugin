---
title: "Odyssey: Generate PR Stories"
status: active
type: command
last_verified: 2026-07-20
---

# Odyssey: Generate PR Stories

Runs the full per-PR sweep — narrative, ADR retro-extraction, scene art, and
voice narration — into the `.cobuilder-architect/` bundle. If no baseline exists yet,
one is derived automatically first.

Invoke the `odyssey` skill in generate mode, forwarding any arguments the user
supplied after `/cobuilder-architect:generate` (`--repo`, `--prs`, `--latest`, `--force`,
`--voice`, `--art`, `--style`). `--repo <path>` targets any local checkout —
not just the repo this session is running in (the skill will ask for
`/add-dir` if it lacks read access there):

```
Skill("odyssey", args="generate $ARGUMENTS")
```

Where the bundle lands depends on what's being analyzed: self-analysis (no
`--repo`, or `--repo` pointing at this same repo) stores it at
`<hub>/.cobuilder-architect/self/`, committed alongside the code it narrates, while a
foreign repo passed via `--repo` stores it instead in a central per-hub
cache (`<hub>/.cobuilder-architect/<repo-slug>/`) so foreign checkouts are never
written into. Pass `--store local` or `--store central` to override that
automatic choice.

## Default PR selection

If the user doesn't pass `--prs`, `--latest`, or a range (`N..M`), the skill
discovers PRs via merge commits / squash `(#N)` markers (falling back to `gh`
if needed), proposes the **last 10 discovered PRs**, and confirms the list
with the user before running anything — it never silently sweeps an
unconfirmed PR list.

## Visual family: `--art`

`--art both|diagram|image` picks which visual family the sweep produces for
levels 1 through 3 (level 4 has neither). Default: `both`.

- `both` — authors Mermaid diagrams and generates Gemini scene art.
- `diagram` — authors Mermaid diagrams only. Skips the Gemini scene-art
  stage, so no image-generation calls run.
- `image` — generates Gemini scene art only. Matches behavior before
  diagrams existed.

## Examples

```
/cobuilder-architect:generate --prs 73,75
/cobuilder-architect:generate --latest
/cobuilder-architect:generate --prs 12..18
/cobuilder-architect:generate --force
/cobuilder-architect:generate --repo ~/code/other-project --prs 42
/cobuilder-architect:generate --prs 79 --style ste
/cobuilder-architect:generate --prs 79 --art diagram
```
