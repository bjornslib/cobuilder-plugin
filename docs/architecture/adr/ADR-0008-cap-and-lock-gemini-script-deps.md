---
# --- doc-gardener required frontmatter ---
title: "ADR-0008 — Cap and lock third-party dependencies in the three Gemini-calling scripts"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0008
name: "Cap and lock third-party dependencies in the three Gemini-calling scripts"
state: approved
groups: []
approved_by: "merge of PR #5"
problem: "export_artifact.py, generate_audio.py, and generate_prompts.py declare PEP 723 dependencies (pillow, google-genai, python-dotenv) with no upper version bound. Two of the three read GEMINI_API_KEY and send authenticated requests to Google, so an untested major release of any dependency could load silently on the next uv run, with the key already resident in process memory, and no lockfile pinned the resolved versions or their transitive packages."
decision: "Add upper bounds to each dependency (pillow<13, google-genai<2, python-dotenv<2) and generate a uv lockfile beside each of the three scripts (scripts/<name>.py.lock), pinning every transitive package with a hash. The other eight scripts in the plugin use only the standard library and need neither bound nor lockfile."
alternatives:
- option: "Leave dependencies unbounded, matching the plugin's existing PEP 723 scripts"
  rejected_because: "An unbounded dependency on a script that authenticates to an external API with a live secret can silently pick up a compromised or breaking major release on the very next run."
- option: "Pin exact versions in the PEP 723 header instead of adding a lockfile"
  rejected_because: "A version pin alone does not pin or hash transitive dependencies, so a compromised transitive package could still load; a lockfile is what makes a tampered resolution fail closed instead of executing."
forces:
- "generate_prompts.py and generate_audio.py send the user's GEMINI_API_KEY to Google on every call — a compromised or unexpectedly-behaving dependency has a live credential to work with."
- "uv 0.5.14 (the version available when the version caps were first added) has no `uv lock --script` subcommand, so the caps landed one commit ahead of the lockfiles, after an upgrade to uv 0.12.1 made per-script locking possible."
- "Locking only the three scripts that declare third-party dependencies keeps the other eight, stdlib-only scripts free of lockfile maintenance they don't need."
related_decisions: []
related_concerns: []
history:
- state: decided
  date: unrecorded
  source: .cobuilder-architect/self/data/adrs.json
  note: "Retro-extracted from the self-bundle."
- state: approved
  date: "2026-08-05"
  by: "merge of PR #5"
  note: "Approved by the merge that shipped the decision."
maps_to:
  district: scripts
  unanchored: true
  modules:
  - scripts
  rule: "The three Gemini-calling scripts declare upper bounds and a hash-pinned lockfile."
delivers:
  capability: "A `uv run` of any of the three key-handling scripts resolves to the same, hash-verified set of packages every time, and fails closed rather than silently executing a tampered or unexpectedly major-bumped dependency."
  benefit: "The blast radius of a supply-chain compromise in pillow, google-genai, or python-dotenv is contained to versions the maintainer has actually reviewed, on the two scripts that hold a live external credential."
  beneficiary:
  - operator
  - developer
source_pr: 5
provenance: inferred
---

## Context

Three of the plugin's eleven PEP 723 scripts declare third-party dependencies. Two of those three (generate_prompts.py, generate_audio.py) read GEMINI_API_KEY and call Google's API on every run; the third (export_artifact.py) depends on pillow alone, for image recompression. None had an upper version bound or a lockfile.

## Options considered

1. Leave dependencies unbounded — rejected, given the live credential two of the three scripts hold.
2. Exact-pin versions in the PEP 723 header, no lockfile — rejected, does not pin or hash transitive packages.
3. Chosen: upper-bound each direct dependency, and lock all three scripts once uv 0.12.1 made `uv lock --script` available.

## Decision

pillow<13 (resolves to 12.3.0), google-genai<2 (resolves to 1.75.0), python-dotenv<2 (resolves to 1.2.2). Each of the three scripts gets a sibling .lock file pinning every transitive package with a hash. Refresh a lockfile with `uv lock --script scripts/<name>.py` after any change to that script's dependency block.

## Consequences

A `uv run` against a tampered or altered lockfile now fails the hash check instead of executing. The other eight, stdlib-only scripts carry no lockfile and need none.

## Value delivered

Removes the single largest unreviewed-upgrade surface on the two scripts that hold a live Google API credential.

## Maps to

scripts
