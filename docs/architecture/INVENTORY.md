# Architecture documentation inventory

Tracks the documentation status of each bounded context under
`docs/architecture/contexts/`, per `skills/architecture/references/standard.md` §8.

## Contexts

| Context | Status | canvas.md | boundary.yaml | Governing ADRs | Last verified |
|---|---|---|---|---|---|
| `cobuilder-packaging` | documented | yes | yes | ADR-0016 (tentative), ADR-0017 (tentative) | 2026-08-21 |

## `cobuilder-packaging` — findings

Documented by Describe mode on 2026-08-21. Module list: `.claude-plugin/`, `commands/`,
five skill directories (`architecture`, `odyssey`, `mermaid`, `ste-writing`,
`collaborate-with-user`), `scripts/` (18 PEP-723 files), and `viewer/index.html`. This is
the current single-plugin shape (`cobuilder-architect` v0.4.0), not the five-plugin shape
ADR-0016 proposes -- that split has not happened yet.

**ADR unblock.** ADR-0016 and ADR-0017 were both stuck at `state: tentative` because no
`boundary.yaml` existed for `cobuilder-packaging`. This context bundle exists now, so both
ADRs can move toward `approved` as a separate, human decision. Neither ADR was edited by
this pass.

**Smells found (ADR candidates), all verified by grep, none fixed here:**

1. `skills/architecture/SKILL.md:83-84` hardcodes the path `skills/odyssey/SKILL.md`
   inside Design mode's Hub-resolution step.
2. `skills/odyssey/SKILL.md:32-33` hardcodes the path `skills/architecture/SKILL.md` when
   pointing at Design mode. The coupling in (1) and (2) runs both directions.
3. `scripts/build_designs.py:299`, `scripts/build_adrs.py:217`, and
   `scripts/validate_decision_state.py:433` embed the literal path
   `skills/architecture/references/...` inside a validation-failure error message.
4. `scripts/build_diagrams.py:9,273`, `scripts/render_review.py:9`, and
   `scripts/verify_bundle.py:86` embed the literal path `skills/odyssey/references/...`
   in comments or error text.

None of the four break anything today -- all five skills and all 18 scripts still ship
inside one plugin (`cobuilder-architect`). All four become real violations of ADR-0016's
invariant ("no plugin reads or imports another plugin's files") the day
`architecture` and `odyssey` ship as separate plugins, because a path reference into a
sibling plugin's cache does not resolve. Recorded in `boundary.yaml`'s
`forbidden_dependencies`, each marked `SMELL`, with a `why`.

**Verified absence (not a smell -- confirms a rule holding):** `viewer/index.html` never
imports or executes anything under `scripts/`. Its one mention of `scripts/` (line 854) is
a code comment, not a live reference the browser resolves.

**Confirmed not yet implemented:** ADR-0017's `require_compatible()` gate function does
not exist in `scripts/_bundle_meta.py`. The file holds only the three version constants
described in ADR-0017's own Context section. This is a design that has not been built, not
a drift finding.

**Left unverified, and left out of the boundary record:**

- Whether the symlink-dereference mechanism ADR-0017 proposes for a marketplace-root
  `shared/` directory actually works for a directory of Python files, as opposed to a
  skill's `references/` directory (the only case Claude Code's own docs confirm). ADR-0017
  itself already flags this as unverified before implementation. This canvas does not
  re-verify it, because `shared/` does not exist yet -- there is no code to check.
- Any cross-plugin edge, because only one plugin exists in this repository today. The
  `forbidden_dependencies` entry for "another plugin's files" is recorded pre-emptively
  from the ADR-0016 invariant, not from an observed violation.
