# Program design: Interaction design gate

## Files

### New

- `plugins/implement/skills/design-to-code/SKILL.md`
- `plugins/implement/skills/design-to-code/references/jsonc-schema.md`
- `plugins/implement/skills/design-to-code/references/research-workflow.md`
- `plugins/implement/skills/design-to-code/references/shadcn-patterns.md`
- `plugins/implement/skills/design-to-code/references/implementation-rules.md`
- `plugins/implement/skills/design-to-code/templates/interaction-design.md`
- `plugins/implement/skills/design-to-code/examples/workflow-matrix-interaction-design.md`
- `plugins/implement/skills/design-to-code/examples/voice-dashboard.jsonc`
- `tests/test_design_to_code_skill.py`
- `tests/test_gate_2b.py`
- `docs/plans/interaction-design-gate/interaction-design.md`. The plan's own
  artifact. It is written only if Gate 2b applies, and it does not apply, so
  this file is not created.

### Modified

| File | Change |
|---|---|
| `plugins/implement/scripts/verify_gate.py` | A `2b` group and its status regex. The docstring and the `--json` payload gain the `2b` key. |
| `shared/build_index.py` | `STATUS_GATE_RE` accepts a `2b` label. A new `interaction_design` array. `resolve_feature_gates()` writes a string `n`. |
| `plugins/artifact/scripts/build_builds_view.py` | `GATE_LINE` accepts `2b`. `GATE_DOCS` gains a `2b` key. `current_doc()` treats `n/a` as done. |
| `plugins/implement/skills/build/SKILL.md` | The `## Gate 2b` section. The `2b` line in the `00-status.md` template. The resume rule. |
| `plugins/implement/skills/build/references/rubric-authoring.md` | §4 gains both artifacts as derivation sources. |
| `plugins/implement/skills/build/references/slice-loop.md` | RED reads both documents. VALIDATE's front-end criteria name a browser check. |
| `plugins/implement/commands/start.md` | The "What this writes" list. |
| `plugins/implement/.claude-plugin/plugin.json` | `version` 0.1.0 to 0.2.0. |
| `tests/test_pillar_boundaries.py` | `KNOWN_OTHER_SKILLS` gains `design-to-code`. |

### Deleted

Three files of the upstream five-step skill do not travel. Each one serves the
product brief, which Gate 1 owns.

- `templates/brief-template.md`
- `templates/prd.md`
- `examples/workflow-matrix-prd.md`

## Types & signatures

### `plugins/implement/scripts/verify_gate.py`

```python
# The 00-status.md Gate 2b line, e.g.:
#   - Gate 2b — Interaction design: pending | APPROVED 2026-09-14 | n/a (no UI) — Screens: "..."
STATUS_2B_RE = re.compile(
    r"^\s*-\s*Gate\s*2b\b.*?:\s*(APPROVED\b.*|pending|in progress|n/a.*)\s*$",
    re.IGNORECASE,
)

# The load-bearing headings of templates/interaction-design.md. Each one
# carries a concept that no other approved document states.
REQUIRED_INTERACTION_SECTIONS = [
    "## 2. Information Architecture",
    "### 2.3 Declared Defaults",
    "### 3.2 Component States",
    "### 3.3 Visibility Gating",
    "### 4.1 Transition Table",
    "### 4.2 Timing Tokens",
    "### 11.2 Hit Targets",
    "### 11.3 Scroll Ownership",
]


def check_2b_status(status_text: str | None) -> str:
    """Return "ok", "n/a", or "pending" for the 2b line in 00-status.md.

    A status file with no 2b line returns "n/a". The gate is newer than those
    files, so their silence means "this gate did not exist", not "this gate is
    waiting". A 2b line that is present and unapproved returns "pending".
    """


def check_interaction_sections(text: str) -> str:
    """Return "ok", or "incomplete:<missing,...>". Mirrors
    check_design_sections()."""


def check_2b(plan_dir: Path, status_text: str | None) -> dict[str, str]:
    """Return the 2b group.

    Keys:
      interaction.file      "ok" | "missing" | "n/a"
      interaction.sections  "ok" | "incomplete:<...>" | "missing" | "n/a"
      ui_spec.file          "ok" | "missing" | "n/a"
      interaction.approved  "ok" | "pending" | "n/a"
    """
```

`is_ok()` already accepts `"n/a"`, so no change is needed there. The `--json`
payload gains `"2b": results`. The exit rule stays: exit 0 only when every key
is ok or n/a.

### `shared/build_index.py`

```python
# Was: r"^-\s*Gate\s*(\d+)\s*[—–-]\s*([^:]+):\s*(.+)$"
# The label group now accepts a letter suffix, so "Gate 2b" parses.
STATUS_GATE_RE = re.compile(r"^-\s*Gate\s*(\d+\w?)\s*[—–-]\s*([^:]+):\s*(.+)$")


def discover_interaction_design_docs(repo: Path) -> list[dict]:
    """Project docs/plans/<slug>/interaction-design.md into entities.

    Mirrors discover_plan_gate_docs() under ADR-0022. Returns one entity per
    plan that carries the file. The entity carries feature_slug, gate, title,
    state, source_path, and body_md.
    """


def resolve_feature_gates(repo: Path) -> dict[str, list[dict]]:
    """Unchanged contract. `n` becomes a string for every gate, not only 2b,
    so one type serves the whole array."""
```

### `plugins/artifact/scripts/build_builds_view.py`

```python
# Was: re.compile(r"- Gate (\d) — ([^:]+): (.+)")
GATE_LINE = re.compile(r"- Gate (\d\w?) — ([^:]+): (.+)")

GATE_DOCS = {
    "1": ["01-product.md"],
    "2": ["02-architecture.md", "02a-artifact-map.md",
          "02b-view-designs.md", "02c-record-model.md"],
    "2b": ["interaction-design.md"],
    "3": ["03-program-design.md"],
    "4": ["04-slices.md", "rubric-manifest"] + [...],
}


def current_doc(gates: list[dict]) -> tuple[str, str, bool]:
    """A gate counts as done when its state starts with "APPROVED" or with
    "n/a". The second test is new: an "n/a" gate needs no answer, so the page
    must not open on it."""
```

### `tests/test_gate_2b.py`

```python
def test_missing_2b_line_is_n/a(tmp_path): ...
def test_pending_2b_line_fails(tmp_path): ...
def test_approved_2b_line_passes_with_both_files(tmp_path): ...
def test_approved_2b_line_fails_when_a_section_is_absent(tmp_path): ...
def test_n/a_2b_line_passes_without_any_artifact(tmp_path): ...
def test_two_historical_plans_still_pass(): ...
```

### `tests/test_design_to_code_skill.py`

```python
def test_skill_frontmatter_parses(): ...
def test_overview_names_three_steps(): ...
def test_every_relative_path_cited_resolves(): ...
def test_removed_brief_files_are_not_cited(): ...
def test_no_product_brief_terminology(): ...
```
