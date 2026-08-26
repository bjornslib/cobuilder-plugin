# PR #17 — Rename plugins to drop the cobuilder- prefix; fix Mermaid click/copy-paste in the feedback drawer

## Problem

The plugin family's slash commands repeated the repo's own cobuilder- prefix on every plugin name (/cobuilder-architect:design, /cobuilder-pr:generate, ...), making them harder to remember and type than they needed to be.

Noticed through day-to-day use of the plugin. A second, unrelated friction surfaced the same way, through the author's own manual testing of the viewer: clicking a Mermaid diagram opened the feedback drawer instead of just panning/zooming it, and copy/paste inside that drawer was not explicitly guaranteed.

## Why this approach

Renamed the four non-umbrella plugins (cobuilder-architect, cobuilder-pr, cobuilder-artifact, cobuilder-implement) to drop the cobuilder- prefix in their plugin.json name field and plugins/ directory, since the repo itself (cobuilder-plugin) already carries that prefix. cobuilder-full-lifecycle keeps its name, because it is the umbrella plugin the repo's own prefix already names. Fixed several commands and skill files that had documented themselves under the wrong plugin's prefix since before the five-way split (a leftover from when everything lived in one plugin). Wired implement mode to check for an existing /architect:design record before Gate 1 and ground the epic slugs in it when one exists, per ADR-0013, which nothing had done before. Separately, excluded the Mermaid diagram viewport from the click-to-open-feedback-drawer handler, and made the comments drawer explicitly declare copy/paste-friendly text selection.

## Alternatives considered

- **Keep the plugin command namespace as-is and accept the cobuilder- repetition** — rejected because Defeats the stated goal: the point was to make commands easier to remember and type.
- **Rename all five plugins, including the umbrella cobuilder-full-lifecycle** — rejected because The umbrella plugin's name is the family/repo identity itself, so it keeps the prefix the other four are shedding.
- **Consolidate each plugin's several mode-commands into one command per plugin (e.g. a single architect.md dispatching on its first argument) to get a literal bare short name** — rejected because Investigation confirmed Claude Code always namespaces a command as /<plugin-name>:<command-name>, with no override -- consolidating would not produce a truly bare command, so renaming the plugin identity itself was the simpler, sufficient fix.

## Out of scope

- Renaming the .cobuilder-architect/ bundle directory convention -- a separate, unrelated concept that happens to share a string with the old plugin name
- Rewriting historical ADRs, designs, or pull-request records to use the new plugin names
- Auditing every other pre-existing cross-plugin reference bug beyond the ones directly intersecting the renamed lines
- Writing a new ADR to record this naming-convention change

## Risks

- A stale installed plugin cache still resolves the old cobuilder-pr/cobuilder-architect names until the marketplace is refreshed or reinstalled
- The generators map key in bundle.json intentionally still reads "cobuilder-architect" for historical bundles -- a future reader unfamiliar with that distinction could mistake it for a missed rename

## How this was tested

Ran the full pytest suite (309/313 passing; the 4 failures are a pre-existing local Pillow architecture mismatch unrelated to this change). Smoke-tested scripts/export-agent-skills.sh against the renamed architect plugin. Ran shared/migrate_bundle.py (dry-run, then for real) against the self-bundle to confirm the viewer-refresh path fix and that no unexpected bundle.json changes occurred.

## Where to focus

- The disambiguation of which plugin actually owns each renamed slash command -- several were previously mis-attributed pre-split leftovers
- The new design-mode-record step added to implement mode's SKILL.md

---

_Authorship: agent-generated._
