# Architecture documentation inventory

Tracks the documentation status of each bounded context under
`docs/architecture/contexts/`, per `skills/architecture/references/standard.md` §8.

## Contexts

| Context | Status | canvas.md | boundary.yaml | Governing ADRs | Last verified |
|---|---|---|---|---|---|
| `cobuilder-packaging` | documented | yes | yes | ADR-0016 (approved), ADR-0017 (approved), ADR-0024 (approved) | 2026-10-08 |
| `architect` | documented | yes | yes | none anchored (see findings) | 2026-10-08 |
| `pr` | documented | yes | yes | none anchored (see findings) | 2026-10-08 |
| `artifact` | documented | yes | yes | none anchored (see findings) | 2026-10-08 |
| `implement` | documented | yes | yes | none anchored (see findings) | 2026-10-08 |
| `shared` | documented | yes | yes | none anchored (see findings) | 2026-10-08 |

All six records carry `verified_at: d086be981401779ba4691faed31a6f64598df589`.

## Findings of 2026-10-08

Describe mode ran over the whole repo. It documented five new contexts and re-verified
`cobuilder-packaging`. Every rule below was checked with grep against Python imports,
`Skill(...)` calls, path strings, and symlinks. Nothing was fixed. Each smell is an ADR
candidate.

**Rules that hold (verified):**

- No Python import crosses a plugin boundary. Plugins import only `shared/` modules,
  through the symlink `plugins/<name>/shared`.
- Only `plugins/implement` has `agents/` and `hooks/`. No plugin ships an MCP server.
- The viewer source has no live reference to a script or a plugin path.
- Each command makes its `Skill(...)` calls into its own plugin. The one exception is
  `implement` `debug` (smell 6).
- `ADR-0017`'s `require_compatible` gate exists at `shared/_bundle_meta.py` line 84. The
  2026-08-21 finding that it was absent is out of date.

**Smells found (ADR candidates):**

1. `architect` reads the `pr` odyssey skill's `SKILL.md` and reference files by name:
   10 mentions in `design-mode.md`, 8 in `SKILL.md`, 1 in `decision-records.md`. The `pr`
   plugin is not in the `architect` manifest.
2. `pr` cites the `architect` architecture skill's `references/decision-records.md` and
   templates in `decision-records-lite.md`, `adr-template.md`, and `SKILL.md`.
3. `pr` calls `Skill("architect:architecture")` but its `plugin.json` lists only
   `artifact` as a dependency.
4. `shared/migrate_bundle.py` probes `plugins/artifact/viewer/index.html` and the sibling
   artifact install cache. A base layer names a plugin path.
5. Comments name plugin paths: `shared/_bundle_meta.py:32`, `shared/slice_table.py:23-24`,
   and `plugins/implement/scripts/verify_gate.py:98-100`.
6. Cross-plugin `Skill(...)` names carry no plugin prefix: `implement` `commands/debug.md`
   line 26 (`architecture`), and the `cobuilder-artifacts` calls in `architect` and
   `implement`.
7. `.claude-plugin/marketplace.json` lists `artifact` twice.
8. All ADRs that carry a `maps_to.context` name `cobuilder-packaging`, and ADR-0016 lists
   root paths that no longer exist. No ADR anchors to the five new contexts, so their
   `governed_by` lists are empty.

**Resolved since 2026-08-21:** the four smells about `skills/odyssey` and
`skills/architecture` paths in script error text no longer match any file.

## Earlier findings for `cobuilder-packaging` (2026-08-21, kept as history)

Documented by Describe mode on 2026-08-21. Module list: `.claude-plugin/`, `commands/`,
five skill directories (`architecture`, `odyssey`, `mermaid`, `ste-writing`,
`collaborate-with-user`), `scripts/` (18 PEP-723 files), and `viewer/index.html`. This is
the current single-plugin shape (`cobuilder-architect` v0.4.0), not the five-plugin shape
ADR-0016 proposes -- that split has not happened yet.

**ADR unblock.** ADR-0016 and ADR-0017 were both stuck at `state: tentative` because no
`boundary.yaml` existed for `cobuilder-packaging`. This context bundle exists now, so both
ADRs can move toward `approved` as a separate, human decision. Neither ADR was edited by
this pass.

**Update on 2026-09-14, which was not a re-verification.** Two things changed since the
pass above. First, ADR-0016 and ADR-0017 both reached `state: approved`, and ADR-0024
reached `state: approved` and added itself to `boundary.yaml`'s `governed_by` list. The
table above now names all three. Second, the plugin split happened. The findings below
describe `cobuilder-architect` v0.4.0 as one plugin, and the repo now holds five:
`architect`, `implement`, `pr`, `artifact`, and `cobuilder-full-lifecycle`. Describe mode
did not run on 2026-09-14, so every finding below stays unchecked against the new shape.
Treat the four smells as leads, not as current facts.

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
