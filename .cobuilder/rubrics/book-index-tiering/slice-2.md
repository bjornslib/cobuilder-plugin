# Rubric: Slice 2 — security corpus applicability read (ADR-0021 addendum)

Feature: book-index-tiering
Epic: E1
Slice goal: Review mode's rewritten security-corpus step (SKILL.md "Security
in Review and Maintenance") is actually followed by a fresh agent doing a
realistic review task, with the correct default-to-full bias on ambiguity.
Test command: none — behavioral rubric, same class of change as slice-1.

Written before the blind pass ran. Not shown to the blind agent.

## Criteria

### C1 — All 14 files get at least a partial read [CRITICAL]
**Must be true:** the agent's Read tool calls include all 14
`references/corpus/principles/security/*.yaml` files, each with either a
truncated read (limit ~30 lines) or a full read. No category is silently
skipped entirely.
**Score:** 1.0 if all 14 appear at least once. 0.0 if any is missing.

### C2 — The truncated-read files stop near the summary boundary
**Must be true:** for a file read with a limit (not full), the limit is
in the neighborhood of the file's actual metadata+summary boundary (17-24
lines across the real files).
**Score:** 1.0 if all truncated reads land within roughly 20-40 lines.

### C3 — At least one file is read in full and at least one stays truncated
**Must be true:** given a realistic review task, the agent discriminates —
not all 14 full, not all 14 truncated.
**Score:** 1.0 if both counts are >=1.

### C4 — Escalation reasoning is stated per file, not silent
**Must be true:** for each file's disposition (full or truncated), the
agent's output states why, tied to the actual codebase.
**Score:** 1.0 if stated for all 14. 0.5 if stated for most.

### C5 — Ambiguity defaults to full, not to skipping [CRITICAL]
**Must be true:** any category the agent itself describes as ambiguous
gets escalated to a full read, not left truncated.
**Score:** 1.0 if every hedged case was escalated to full. 0.0 if any
hedged case was left truncated.

**Pass threshold:** C1 and C5 are CRITICAL.

## Scores — attempt 1

| Criterion | Score | Note |
|---|---|---|
| C1 | 1.0 | All 14 files read with `limit=30` in pass 1, none skipped. |
| C2 | 1.0 | Uniform `limit=30`, comfortably covering the real 17-24 line boundary. |
| C3 | 1.0 | 7 files escalated to full (`frontend_security`, `xss_csrf_csp`, `secrets_management`, `input_validation`, `layer_boundaries`, `supply_chain`, `audit_logging`); 7 stayed truncated (`api_security`, `cloud_platform`, `crypto_key_management`, `file_upload_api_hardening`, `rbac_abac`, `ssrf_deserialization`, `tenant_isolation`). |
| C4 | 1.0 | One sentence per file, all 14, each grounded in a specific grep/find check against this repo rather than assumption. |
| C5 | 1.0 | `input_validation.yaml` explicitly called "ambiguous enough to escalate," and was escalated to full — the exact case this criterion tests. |

**Result: 5/5, both CRITICAL criteria pass on attempt 1.** No re-run needed.
The agent's applicability calls were independently well-evidenced (e.g.
ruling out `tenant_isolation` on "no multi-tenant data store," ruling out
`ssrf_deserialization` on a `grep` finding no `yaml.load`/`pickle.load` and
no server-side fetch of user-supplied URLs), which exceeds what the rubric
required but is a strong positive signal about the rule's followability.
See `evidence/slice-2-attempt-1.md` for the full transcript.
