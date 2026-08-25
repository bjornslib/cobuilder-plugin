---
title: "Baseline Derivation — describe-lite reference"
type: reference
status: active
last_verified: 2026-07-20
owner: bjoerns
---

# Baseline Derivation — describe-lite reference

How to derive an architecture baseline for a foreign repo with zero existing
architecture docs: a district map plus a flat `inventory.yaml`, written into
`<bundle-dir>/`. This is the *describe-lite* mode. It keeps the parent
skill's verification discipline (never assert an unverified boundary). It
drops the full per-context artifact set (`canvas.md`, `boundary.yaml`,
governed ADRs), because that set assumes you maintain the target repo.

## 1. Verification discipline — ground every claim in code

**Never write a district summary or boundary claim you have not checked.**
Before writing anything, run real commands against `<target>`:

```bash
# 1. Enumerate top-level structure
git -C <target> ls-files | cut -d/ -f1 | sort | uniq -c | sort -rn

# 2. Per candidate district: file count and rough size
find <target>/<dir> -type f | wc -l

# 3. Real outbound edges: what does this dir import from other top-level dirs?
grep -rhE "^(from|import) |require\(" <target>/<dir> | sort -u

# 4. Real inbound edges: who imports this dir?
grep -rl "<dir-name>" <target> --include="*.py" --include="*.ts" --include="*.tsx" | grep -v "^<target>/<dir>"
```

If you cannot verify an import edge in both directions, do not claim it.
Describe the district by what it contains, not by a boundary relationship you
have not checked.

## 2. Stack detection

Before clustering districts, match the repo against `references/stacks/`
using the detection precedence in `references/stacks/README.md`:

1. Evaluate cards most-specific first (framework before language — `nextjs`
   before `react-typescript`).
2. First card whose `## Detect` markers all match wins.
3. `generic.md` is the fallback.
4. Polyglot repos: load one card per matched sub-tree, scoped to that
   sub-tree. For example, a FastAPI backend dir gets `python-fastapi.md`,
   and a React frontend dir gets `react-typescript.md`.

Record the matched stack(s) — they inform the district `kind` classification
in §3 and give downstream story authoring (`story-mode.md`) the right
vocabulary for architectural weight.

## 3. District heuristic

1. **Candidate districts** = top-level dirs from `git -C <target> ls-files`
   with **≥3 tracked files**. Merge trivial dirs (config-only, single-file,
   `.github/`-style tooling shells) into a neighboring district or a catch-all
   `tooling` district rather than giving them their own entry.

2. **Classify `kind`** per district, one of: `core`, `tooling`, `quality`,
   `knowledge`, `product`, `governance`, `unknown`. Base the call on what the
   directory's files actually are (verified in §1), not on the directory
   name alone. A `lib/` full of test fixtures is `quality`, not `core`.

3. **Claude authors** `label` (short, human-readable name — not the raw dir
   path) and a one-line `blurb` per district, grounded in the verified
   contents and import edges. Do not invent behavior the files do not show.

4. **Degrade honestly**:
   - Monorepos with package manifests scattered across many dirs: cluster at
     the manifest boundary (`package.json`, `pyproject.toml`, `go.mod`). Cap
     at **≤12 districts**, and merge the smallest into siblings if over.
   - Repos with **<20 tracked files total**: single district covering the
     whole repo.
   - Docs-only or asset-only repos (no code files matched by any stack card):
     bucket by file type (`docs`, `assets`, `config`). Set
     `map_quality: low` on the district-map output, so downstream consumers
     know not to over-trust it.

## 3a. District sensitivity (optional)

Generate mode reads an optional `sensitivity` field on each district to set a
change's risk tier. Author it here, where the district's real contents are
already verified, instead of leaving generate mode to guess from path names.

Three values:

| Value | Assign it when the district holds |
|---|---|
| `sensitive` | authentication, authorization, permissions, billing or payments, data deletion, database migrations, infrastructure, or a security boundary |
| `architectural` | a module boundary, a dependency direction, a public interface, or a cross-cutting pattern that other districts depend on |
| `routine` | everything else |

**Assign it from the files, not from the name.** A district called `auth` that
holds only login-page copy is `routine`. A district called `utils` that holds
the token verifier is `sensitive`. This is the same §1 discipline: check
before you claim.

The field is optional, and omitting it costs little. Generate mode falls back to
reading the diff directly when a district carries no value, and
`references/review-mode.md` §4 holds that fallback. A bundle written before
this field existed keeps working.

## 4. Writing the outputs

### `world.districts` in `data/story.json`

Write each district directly into the `world.districts` array of
`story.json`. If `story.json` does not exist yet, create the seed via
`extract_story.py` first — see SKILL.md Baseline mode step 1. Shape:

```json
{
  "id": "<slug>",
  "label": "<authored label>",
  "kind": "core|tooling|quality|knowledge|product|governance|unknown",
  "blurb": "<one-line, grounded in verified contents>",
  "root_paths": ["<dir>", "..."],
  "sensitivity": "routine|architectural|sensitive"
}
```

`sensitivity` is optional — see §3a. Leave the key out rather than defaulting
it to `routine`, so an absent value stays distinguishable from a judged one.

Never overwrite a district entry that already has human-authored fields — a
`blurb` that does not match the auto-generated pattern. Treat existing
non-placeholder text as authored, and leave it, per the same discipline
`extract_story.py` applies to narrative fields.

### `<bundle-dir>/inventory.yaml`

```yaml
generated: <ISO date>
provenance: inferred
contexts:
  - id: <slug>
    label: <authored label>
    paths: [<dir>, ...]
    summary: <one-line, grounded in verified contents>
    sensitivity: routine|architectural|sensitive   # optional, see §3a
```

`contexts[].id` matches `world.districts[].id` in `story.json`. This is the
join key `decision-records-lite.md`'s `maps_to` anchors against, and what ADR
retro-extraction cites when a decision affects a given district.

## 5. Surfacing smells (lite)

While verifying imports (§1), you may find real problems — circular
dependencies, or a district that clearly should not import something. Do not
silently fold these into a clean-looking district blurb. Note them in the
district's `blurb`, or as a short aside when authoring PR-level architecture
narrative (`story-mode.md` level 3), if a PR touches the smell. Do not build
a `boundary.yaml`, a forbidden-dependency list, or a SMELL-tagged rule
registry. That is full describe-mode machinery, and this lite mode does not
carry it.

## 6. When to re-run

Baseline is idempotent and safe to re-run any time. It refreshes districts
and inventory in place, without touching per-PR narrative or ADR data. The
`review` mode in SKILL.md warns when the baseline is more than 200 commits
behind `HEAD`. Re-run baseline explicitly if that warning fires, and the repo
has grown new top-level districts since.
