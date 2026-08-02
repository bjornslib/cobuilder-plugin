# Writing conventions

Technical prose defaults to ASD-STE100 Issue 9 Simplified Technical English (STE): README.md, CLAUDE.md, `skills/odyssey/references/*.md`, commit/PR bodies. Invoke `Skill("ste-writing")` for rules; check drafts with `python3 .claude/skills/ste-writing/ste-lint.py <file>` (lower score = fewer violations per 100 words; linter checks rules only, not full ASD-STE100 dictionary compliance).

Carve-out: authored PR narrative inside story.json does NOT follow STE — its register comes from `--style kleppmann|ste` (default kleppmann); see `skills/odyssey/references/story-mode.md` §3.

`ste-writing` skill lives under `.claude/skills/` on purpose and does NOT ship with the plugin — install of prodyssey@prodyssey gets exactly one skill (odyssey), matching minimal install surface (no agents/hooks/MCP servers, so the plugin never touches another session's permission surface).

Everything judgment-shaped (narrative voice, register, what counts as a decision worth an ADR) lives in `references/*.md` prose, loaded on demand — never hardcoded in scripts or the skill body.