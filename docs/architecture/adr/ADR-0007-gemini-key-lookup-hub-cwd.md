---
# --- doc-gardener required frontmatter ---
title: "ADR-0007 — Anchor the GEMINI_API_KEY / .env lookup to the hub's cwd, never to a --repo target"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0007
name: "Anchor the GEMINI_API_KEY / .env lookup to the hub's cwd, never to a --repo target"
state: approved
groups: []
approved_by: "merge of PR #5"
problem: "generate_prompts.py and generate_audio.py called load_dotenv(repo / \".env\"), where repo is whatever path --repo passes. load_dotenv merges every assignment in that file into os.environ (subject only to override=False protecting a variable already set), so a foreign, untrusted --repo target's .env could set HTTPS_PROXY, HTTP_PROXY, REQUESTS_CA_BUNDLE, SSL_CERT_FILE, or any GOOGLE_*/GEMINI_* variable the google-genai SDK reads, and capture the session's own GEMINI_API_KEY on the next request."
decision: "Both scripts call load_dotenv(find_dotenv(usecwd=True)) with no path argument, which searches upward from the process's current working directory instead of the target repo or the script's own directory. Since SKILL.md always runs these scripts from inside the hub, this resolves the hub's own .env and never touches the target's."
alternatives:
- option: "load_dotenv(repo / \".env\") — the original code"
  rejected_because: "Treats the analyzed repo as a trusted source of environment configuration, when --repo is explicitly documented as pointing at foreign, untrusted checkouts."
- option: "load_dotenv() with no arguments (python-dotenv's plain default)"
  rejected_because: "find_dotenv()'s default is usecwd=False, which walks up from the calling frame's own file — the scripts' directory under scripts/, not the working directory. That happens to work only in this dev checkout because the scripts live inside the hub; for an installed plugin, CLAUDE_PLUGIN_ROOT sits under ~/.claude/plugins/cache/, nowhere near the user's repo, so the key would never be found even when the user placed it exactly where README.md and SKILL.md say to."
forces:
- "--repo is documented to accept any local checkout, including ones the user does not control or trust."
- "SKILL.md's own Step 0 prereq gate already states the key belongs to <hub>, never <target> — the fix has to make the code match that documented boundary, not just patch the immediate leak."
- "python-dotenv's find_dotenv() has two different default search origins (usecwd=False walks from the caller's file; usecwd=True walks from the process cwd) that look interchangeable but are not, once scripts run from an installed plugin path instead of a dev checkout."
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
  rule: "Gemini .env lookup walks from the hub cwd and never from a --repo target."
delivers:
  capability: "A --repo target can never influence which environment variables the session's own API calls run with, regardless of what that target's .env contains."
  benefit: "The user's GEMINI_API_KEY, and any other environment variable an untrusted repo could otherwise poison (HTTPS_PROXY, SSL_CERT_FILE, etc.), stays confined to the hub the user actually controls."
  beneficiary:
  - operator
  - developer
source_pr: 5
provenance: inferred
---

## Context

generate_prompts.py and generate_audio.py both authenticate to Google's Gemini API using GEMINI_API_KEY, and both previously loaded that key's .env file from the --repo target rather than the hub. --repo is documented (SKILL.md's Target resolution section) to accept any local checkout, which by construction includes repos the user does not control.

## Options considered

1. Original: load_dotenv(repo / ".env") against the target — rejected, trusts an untrusted repo's file to set process environment variables.
2. load_dotenv() with no path — rejected, python-dotenv's usecwd=False default resolves relative to the scripts' own directory, which only coincides with the hub in a dev checkout, not an installed plugin.
3. Chosen: load_dotenv(find_dotenv(usecwd=True)) — resolves from the process working directory, which SKILL.md's procedure always leaves at the hub before invoking any script.

## Decision

Anchor .env resolution to cwd via find_dotenv(usecwd=True) at all three call sites, and never construct a path into --repo target for this purpose. SKILL.md's Step 0 prereq gate now states the cwd constraint explicitly.

## Consequences

A foreign --repo target's .env is now fully inert as far as this plugin's own process environment is concerned. Verified against a hostile fixture repo whose .env set a decoy GEMINI_API_KEY plus HTTPS_PROXY and a marker variable — none of it reached os.environ regardless of --repo target.

## Value delivered

Closes a credential-exfiltration path that existed for any user who pointed --repo at a repo they didn't fully trust.

## Maps to

scripts
