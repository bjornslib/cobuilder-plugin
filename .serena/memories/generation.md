# Generation pipeline

`SKILL.md` is the source of truth for procedure — skim before changing orchestration behavior.
- Hard prereq gate runs before anything generative: git repo, `uv` on PATH, `GEMINI_API_KEY`.
- `baseline` mode derives `<bundle-dir>/inventory.yaml` + world districts.
- `generate` mode is per-PR and resumable: `verify_bundle.py` decides which stages are already `"ok"` so a killed sweep can be re-invoked without regenerating completed narrative/art/audio (`--force` overrides).
- Narrative authoring and ADR extraction are Claude judgment work done directly against `data/story.json` / `data/adrs.json` — never delegated to a script. Scripts only move data (diffs, prompts, audio, verification).
- Scripts are PEP 723 (`uv run script.py` resolves deps like `google-genai`, `pillow`, `python-dotenv` inline — no venv, no requirements.txt).
- `extract_story.py` never overwrites authored narrative fields for PRs already in story.json — new PRs get a minimal stub; re-running is safe.
- `story.json`'s `meta.schema_version` is currently `"1.0"`; `verify_bundle.py` gates on it (`SCHEMA_VERSION_KNOWN`).
- `--repo <path>` (skill + all 3 commands) targets any local checkout, not just the session's own cwd.