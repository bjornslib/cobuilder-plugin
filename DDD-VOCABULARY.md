# DDD Vocabulary

This file is the one glossary for this repository. Code, districts, files,
classes, methods, and prose must use the names defined here.

This glossary follows the format of Matt Pocock's `domain-modeling` skill
(https://github.com/mattpocock/skills), merged with this repository's
bounded-context canvases under `docs/architecture/contexts/`.

How to use this glossary:

- Use one name for one concept. Do not invent a second name for a term
  already defined here.
- A term belongs to exactly one bounded context or district. Find its
  section before you add a new one.
- Add a term when an interview or a design resolves it, not before.
- List a rejected synonym under `_Avoid_` on the entry it lost to.
- A homonym gets one entry per context. Each entry names the other context.

## cobuilder-packaging

<a id="plugin"></a>
**Plugin** (`cobuilder-packaging`):
The single installable unit declared in a `.claude-plugin/plugin.json` manifest. Five plugins exist today under `plugins/`: `architect`, `pr`, `artifact`, `implement`, and the umbrella `cobuilder-full-lifecycle`.

<a id="command"></a>
**Command** (`cobuilder-packaging`):
A thin dispatcher file under a plugin's `commands/*.md`. Its only job is one `Skill(...)` call into that same plugin.

<a id="skill"></a>
**Skill** (`cobuilder-packaging`):
An auto-discovered directory under a plugin's `skills/`. `mermaid` and `ste-writing` are shared skills, vendored by symlink into every plugin that needs them.

<a id="script"></a>
**Script** (`cobuilder-packaging`):
A standalone PEP-723 `uv run` Python file under a plugin's `scripts/`, or under the marketplace-root `shared/` directory. It runs with no `venv` and no `requirements.txt`.

<a id="bundle"></a>
**Bundle** (`cobuilder-packaging`):
The derived output directory tree for one target repo, either `<target>/.cobuilder-architect/self/` or `<hub>/.cobuilder-architect/<repo-slug>/`. Scripts write it and the viewer reads it.

<a id="vendoring"></a>
**Vendoring** (`cobuilder-packaging`):
The mechanism, decided in ADR-0017, that shares code between the five plugins: a `shared/` directory at the marketplace root, symlinked into each plugin's own root and dereferenced into that plugin's install cache.

## Cross-cutting
