# Test plan for scripts/

This plan proposes a pytest suite for the 11 PEP-723 scripts in
`scripts/`. No test suite exists for this directory today. The only test
file in the repo, `.claude/skills/ste-writing/test_ste_lint.py`, covers an
unrelated linter. This plan follows its style. It uses plain pytest, and
no fixture framework beyond the standard library.

This document proposes tests. It does not write the suite. A human must
approve this plan before any test file lands.

## 1. Import strategy and directory layout

Each script has no package, no `__init__.py` file, and no
`pyproject.toml` file. Every script imports `_bundle_meta` through the
same fixed idiom:

```python
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _bundle_meta import SCHEMA_VERSION
```

`test_ste_lint.py` already sets a pattern this plan can reuse.
`importlib.util.spec_from_file_location` loads a script by path, not by
package name. This plan adopts that pattern for two reasons.

First, several scripts share function names across files, for example
`resolve_repo`, `rewrite_manifest`, and `run_git`. A plain
`import extract_story` next to `import extract_diffs` in one test session
risks a name clash later, for example if a test does `from x import *`.
Second, `spec_from_file_location` needs no change to `sys.path` for the
test itself. Tests stay next to the module under test, and add no global
import state that test order could depend on.

Each script under test still runs its own `sys.path.insert(0, ...)` line
at import time, pointing at `scripts/`. That line is safe to run twice,
so `conftest.py` does not need to suppress it.

Below is `tests/conftest.py`, placed next to `scripts/`.

```python
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"


def load_script(name: str):
    """Load scripts/<name>.py as an importable module object, isolated by
    path rather than by package name. Mirrors the spec_from_file_location
    pattern that test_ste_lint.py already uses for ste-lint.py."""
    path = SCRIPTS_DIR / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None, f"cannot load {path}"
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module  # lets the module run its own self-import calls
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="session")
def bundle_meta():
    return load_script("_bundle_meta")


@pytest.fixture(scope="session")
def migrate_bundle():
    return load_script("migrate_bundle")


@pytest.fixture(scope="session")
def extract_story():
    return load_script("extract_story")


@pytest.fixture(scope="session")
def extract_diffs():
    return load_script("extract_diffs")


@pytest.fixture(scope="session")
def build_diagrams():
    return load_script("build_diagrams")


@pytest.fixture(scope="session")
def verify_bundle():
    return load_script("verify_bundle")


@pytest.fixture(scope="session")
def export_artifact():
    return load_script("export_artifact")
```

Each fixture loads once per test session. A script module holds no
mutable global state between calls, so reuse across tests stays safe. A
test that needs `generate_prompts` or `generate_audio` calls
`load_script("generate_prompts")` directly, inside a test marked
`pillow` or `geminidep`. It does not use a session fixture. This way, an
environment without those packages installed never triggers that import
at collection time.

### Why not turn scripts/ into a package

A package with `__init__.py` would still need a `pyproject.toml` file or
a `conftest.py` path hack. It would also break a deliberate design
choice recorded in `CLAUDE.md`. These files run stand-alone, under
`uv run <script>.py`, never as `python -m scripts.foo`. A test suite must
not push the source layout toward a shape the plugin does not want.

## 2. Fixture design

### 2.1 Git repo fixture

Some scripts call `git` directly. This plan builds a real throwaway repo
with `git init` inside `tmp_path`, rather than mocking `subprocess.run`.
Three reasons support this choice.

First, the commit-discovery regexes in `extract_story.py` and
`extract_diffs.py` read real merge-commit subjects, real
`--first-parent` traversal order, and real `git diff --stat` output. A
mock would reimplement the output format of git inside the test. That
risks pinning a guess at the format, not the real behavior of git. Second, only a
real `git merge --no-ff` command produces a true merge commit with two
real parents, needed to exercise the parent-1/parent-2 boundary in
`get_size()` and `get_touched()`. Third, a throwaway repo takes under
100 ms per test on local disk and needs no network access. The added
cost does not offset the risk a mock would carry.

```python
# tests/conftest.py (continued)
import subprocess

GIT_ENV_ARGS = [
    "-c", "user.name=Test User",
    "-c", "user.email=test@example.com",
    "-c", "commit.gpgsign=false",
]


def _git(repo: Path, *args: str) -> str:
    return subprocess.check_output(
        ["git", "-C", str(repo), *args], text=True
    )


@pytest.fixture
def git_repo(tmp_path):
    """A real git repo at tmp_path/repo. It uses a fixed author and
    committer identity, so the test does not depend on the global git config of
    the running machine."""
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.check_call(["git", "-C", str(repo), "init", "-q", "-b", "main"])
    subprocess.check_call(
        ["git", "-C", str(repo)] + GIT_ENV_ARGS
        + ["commit", "--allow-empty", "-q", "-m", "init"]
    )
    return repo


def make_merged_pr(repo: Path, pr_num: int, branch_files: dict[str, str]) -> str:
    """Creates a feature branch, writes branch_files, merges the branch
    into main with --no-ff, and returns the short hash of the merge commit.
    This mirrors the shape of a PR that GitHub merges, the shape
    MERGE_PR_RE in extract_story.py expects to find."""
    branch = f"feature/pr-{pr_num}"
    _git(repo, "checkout", "-q", "-b", branch)
    for rel_path, content in branch_files.items():
        full = repo / rel_path
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(content)
        _git(repo, "add", rel_path)
    subprocess.check_call(
        ["git", "-C", str(repo)] + GIT_ENV_ARGS
        + ["commit", "-q", "-m", f"add files for pr {pr_num}"]
    )
    _git(repo, "checkout", "-q", "main")
    subject = f"Merge pull request #{pr_num} from example/{branch}"
    subprocess.check_call(
        ["git", "-C", str(repo)] + GIT_ENV_ARGS
        + ["merge", "--no-ff", "-q", "-m", subject, branch]
    )
    return _git(repo, "rev-parse", "--short", "HEAD").strip()
```

### 2.2 Bundle-dir fixture

A bundle directory holds plain files on disk. This plan builds it with
`tmp_path` and `Path.write_text`, with no git step involved. The
`bundle_dir` fixture returns an empty `tmp_path / "bundle"` directory.
Tests write `data/story.json`, `bundle.json`, or `data/diagrams/*.mmd`
directly, using the golden fixture below, rather than running
`extract_story.py` first. This keeps each migration or verify test
independent of any bug in extraction.

```python
@pytest.fixture
def bundle_dir(tmp_path):
    d = tmp_path / "bundle"
    d.mkdir()
    return d
```

### 2.3 Golden story.json fixture

This fixture defines a minimal, valid, schema-1.1 `story.json` file with
one PR. Every authored field appears at least once, so
`harvest_authored()` and the migration guard each have a value to check
for change.

```python
def leaf_keys(obj) -> set[str]:
    """Walk a story-shaped dict and return the set of leaf key names.

    A leaf is any key whose value is not a dict, plus recursion into
    lists of dicts, for example each entry of `world.districts` or
    `timeline`. The rule for OPAQUE is not "this key holds a dict or a
    list of dicts". The rule is that `harvest_authored()` already
    harvests each of these fields as one whole value. This walker must
    not open them, or it invents leaf names the guard never produces.
    `size` and `touched` are each a single derived blob keyed by dynamic
    data, district IDs for `touched`. `beats`, `groups`, `forces`,
    `alternatives`, and `consequences` are each one authored list that
    `AUTHORED_LEVEL_FIELDS` names whole, so an edit inside one entry, for
    example a `beats[0].text` value, already changes the harvested blob
    and the guard already sees it."""
    OPAQUE = {"size", "touched", "beats", "groups", "forces",
              "alternatives", "consequences"}
    leaves: set[str] = set()
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in OPAQUE:
                leaves.add(key)
            elif isinstance(value, dict):
                leaves |= leaf_keys(value)
            elif isinstance(value, list) and value and all(
                isinstance(v, dict) for v in value
            ):
                for item in value:
                    leaves |= leaf_keys(item)
            else:
                leaves.add(key)
    return leaves


@pytest.fixture
def golden_story() -> dict:
    return {
        "meta": {
            "repo": "example-repo",
            "generated": "2026-01-01",
            "schema_version": "1.1",
            "title": "example-repo — Codebase Odyssey",
            "description": "A test fixture repo.",
            "levels": ["PR Landscape", "Problem & Solution", "Architecture", "File Changes"],
        },
        "world": {
            "districts": [
                {"id": "src", "label": "Source", "kind": "code", "files": 3, "blurb": "Main source tree."}
            ]
        },
        "timeline": [
            {
                "pr": 1,
                "date": "2026-01-01",
                "title": "Add widget",
                "tagline": "The widget arrives.",
                "depth": "full",
                "size": {"files": 2, "adds": 10, "dels": 1},
                "touched": {"src": 2},
                "levels": {
                    "landscape": {"narration": "Landscape narration.", "voice": "Landscape voice."},
                    "problem_solution": {"problem": "No widget.", "solution": "Add one.", "narration": "n"},
                    "architecture": {"narration": "n", "groups": ["src"]},
                    "file_changes": {"narration": "n", "detail": "d"},
                },
                "status": "merged",
                "commit": "abc1234",
            }
        ],
    }
```

## 3. Prioritized test inventory

Test IDs follow the pattern `test_<script>_<NN>`. "Fails today" marks a
regression test. It must fail against the current code, and prove the
bug this plan names in its brief.

| test id | target function | what it pins | why it matters | fails today |
|---|---|---|---|---|
| `test_migrate_01_guard_blocks_undeclared_change` | `run_guard()` | A migration that changes an authored field outside its `touches` set reports a violation and writes nothing | Protects paid Gemini art and TTS content from silent loss | no |
| `test_migrate_02_guard_passes_declared_change` | `run_guard()` | A migration that changes a field inside `touches` reports zero violations | Confirms the guard does not fail closed on everything | no |
| `test_migrate_03_harvest_authored_classifies_every_leaf` | `harvest_authored()` | Every leaf key in the golden `story.json` fixture appears in the authored tuples, or in a separate derived-leaf list, with no key left in neither | The single most valuable test in this plan, see 3.1 below | no |
| `test_migrate_03b_harvest_authored_classifies_real_bundle` | `harvest_authored()` | The same completeness check as `test_migrate_03`, run against the real `.prodyssey/self/data/story.json` instead of the golden fixture | The golden fixture pins the contract by hand. The production variant catches drift in real data that a hand-built fixture cannot show. Only this variant found the `adrs` gap that commit 3711eaa fixed, see 3.1 below | no |
| `test_migrate_04_full_run_aborts_no_disk_write` | `main()`, run through `subprocess` | A migration bug that violates `touches` leaves `story.json` byte-identical on disk, and the process exits with code 1 | Proves the "no write" failure mode `CLAUDE.md` describes | no |
| `test_migrate_05_backup_written_on_success` | `main()` | A successful migration writes `.migration-backup/<date>-schema-<from>.json`, and its bytes match the pre-migration file | The backup is the only recovery path, so it must exist | no |
| `test_migrate_06_viewer_refresh_unconditional` | `refresh_viewer()` | A bundle whose viewer file differs from the copy the plugin ships, but whose `bundle_format` already sits current, still gets its viewer overwritten | Regression guard for the exact bug the docstring names | no |
| `test_extract_story_01_second_run_preserves_authored` | `build_new_story()` | Running the script twice against the same repo and existing `story.json` leaves `tagline`, `depth`, and the `narration` field of every level unchanged | A core safety property the conventions section of `CLAUDE.md` names | no |
| `test_extract_story_02_refreshes_mechanical_fields` | `build_new_story()` | `date`, `size`, `touched`, `status`, and `commit` update on a second run, when the underlying commit changed | Separates "preserved" fields from "always fresh" ones | no |
| `test_extract_story_03_new_pr_gets_stub` | `build_new_story()` | A PR that git discovers, but that `story.json` does not yet list, gets `depth: "summary"` and an empty `levels` dict | Pins the contract for a fresh PR entry | no |
| `test_extract_story_04_parse_inventory_contexts` | `parse_inventory_contexts()` | A well-formed `inventory.yaml` file, with a `contexts:` key, a nested `paths:` list, and a quoted `summary:` value, parses into the expected list of dicts | The only hand-written YAML parser in the repo, and easy to regress silently | no |
| `test_extract_story_05_merge_and_squash_dedup` | `discover_prs()` | A PR that shows up under both a merge-commit trailer and a squash-style subject line resolves once, and the merge entry wins | The dict-overwrite order in `combined_by_num` carries real weight and has no test today | no |
| `test_extract_diffs_01_truncates_at_4000_lines` | `split_diff_by_file()` | A synthetic file diff over 4000 lines gets capped at 4000 lines, plus the truncation marker | Pins the exact boundary the brief names | no |
| `test_extract_diffs_02_truncates_at_200kb` | `split_diff_by_file()` | A diff under 4000 lines, but over 200KB packed onto very few lines, truncates on the byte cap instead | Pins the belt-and-suspenders byte cap | no |
| `test_extract_diffs_03_skips_exports_html` | `split_diff_by_file()` | A path that matches `exports/*.html` gets the generated-export note in place of its real diff body | Regression guard for a rule that a later refactor could drop by accident | no |
| `test_export_artifact_01_escape_script_close_roundtrip` | `escape_script_close()` | A diff string that contains a literal closing script tag comes back escaped, and does not end the wrapping inline script block early | Names the exact risk in the brief. A real HTML-diff PR would otherwise break every exported artifact silently | no |
| `test_export_artifact_02_compute_source_hash_stable` | `compute_source_hash()` | The same entry, ADR, diff, and diagram input always yields the same hash across two calls, and a changed diagram source changes the hash | The backbone of the "unchanged" skip logic in the publish pipeline | no |
| `test_export_artifact_03_compression_tier_budget_loop` | the tier loop in `main()`, exercised through `render_for_pr()` | A hero PNG large enough to exceed `--max-bytes` at the first tier retries at tier two, then tier three, before the export drops audio | Pins the retry order `CLAUDE.md` names | no |
| `test_build_diagrams_01_comment_unbalanced_bracket_false_fail` | `validate_file()` | A file whose only unbalanced bracket sits inside a comment line still passes validation | Regression guard for a bug this repo already had and fixed, in commit 4e8356f. `validate_file()` now calls `check_balance()` on the output of `strip_comments()`, not on the raw file, so a bracket inside a `%%` comment no longer trips the check | no |
| `test_build_diagrams_02_wrong_type_reported` | `validate_file()` | A level-one file whose first content line is not `C4Container` reports the expected problem string | Confirms the type check works, independent of the comment-handling test above | no |
| `test_build_diagrams_03_hash_in_c4_title_rejected` | `check_c4_title()` | A title line that reads `PR #1` outside quotation marks gets flagged. A title line that reads `PR "#1"` in quotation marks does not | The docstring of the script names this as the most likely cause of a broken diagram | no |
| `test_manifest_01_three_scripts_agree` | `rewrite_manifest()` in three separate scripts | Given identical files on disk under `assets/`, `data/diffs-pr*.js`, and `data/diagrams/*.mmd`, all three scripts write byte-identical `manifest.js` output | Regression test for the bug the brief names. The copy of this function inside `generate_prompts.py` omits the `diagrams` key | yes |
| `test_verify_bundle_01_art_image_diagram_optional` | `optional_prefixes_for_art()` | The `image` value marks `diagram.*` optional and `asset.*` required. The `diagram` value swaps that. The `both` value marks nothing optional | Named directly in the brief | no |
| `test_verify_bundle_02_all_ok_respects_optional` | `all_ok()` | A results dict with a failing `diagram.level-1` key passes under the optional prefixes of the `image` value, and fails under those of `both` | Confirms the two functions compose correctly together, not only alone | no |
| `test_verify_bundle_03_schema_mismatch_detected` | `check_bundle_json()` | A `bundle.json` file whose `schema_version` disagrees with the `meta.schema_version` field of `story.json` reports a mismatch string naming both values | Names the exact failure mode the migration script warns about in its own comments | no |
| `test_export_index_01_renders_pending_and_published` | `render_card()` | A PR entry with no artifact URL renders "Not yet published". A PR entry with a URL renders a working link | The only test this script needs. Pure string templating carries low risk | no |
| `test_record_publish_01_pr_target_writes_url_and_timestamp` | `main()`, run through `subprocess` | Passing a PR target and a URL sets the artifact URL of that PR and a fresh timestamp, and leaves every other key untouched | A simple script, but the one write step no other script can substitute for | no |

This plan proposes 25 tests, spread across eight test files. Seven files
match one script each. One shared file,
`test_manifest_agreement.py`, holds the three-way comparison test. This
count excludes the Gemini-calling code paths in `generate_prompts.py` and
`generate_audio.py`, and the `--strict` mermaid-cli path in
`build_diagrams.py`. Phase 3 below, and the "not tested" section, cover
why.

### 3.1 Why test_migrate_03 matters most

`harvest_authored()` reads four hardcoded field-name tuples:
`AUTHORED_TIMELINE_FIELDS`, `AUTHORED_DISTRICT_FIELDS`,
`AUTHORED_LEVEL_FIELDS`, and `AUTHORED_META_FIELDS`. Say a future PR adds
a new field to `story.json`, for example a `mood` tag on a level.
`harvest_authored()` cannot see that field until someone also adds its
name to the matching tuple by hand. A migration that overwrites `mood`
then passes the guard with zero violations, because the guard never
harvested `mood` in the first place.

An earlier draft of this plan wrote this test as a canary. That draft
built a `story.json` file with one authored field left out of all four
tuples, then asserted that the guard did NOT catch a migration that
deleted the field. That design is wrong. It asserts the bug stays in
place, so a future engineer who widens `harvest_authored()` and closes
the blind spot makes the test suite go red, not green. A good change
should never need an edit to a test that explains away the improvement
it caused.

This plan instead writes a completeness test. It checks every leaf key
in the golden `story.json` fixture against the union of two independent
lists: the four `AUTHORED_*_FIELDS` tuples inside `harvest_authored()`,
and a second, separate list, `DERIVED_LEAVES`, that this test defines
for itself. A key in neither list fails the test. This is not circular.
A test that compared the tuples only against themselves could never
catch a missing field, because a missing field is by definition absent
from the thing being checked against itself. Comparing against the
golden fixture instead means a brand-new key that appears in the data,
but in neither list, has nowhere left to hide.

```python
def test_migrate_03_harvest_authored_classifies_every_leaf(migrate_bundle, golden_story):
    """Every leaf in the golden story.json must be classified, as authored
    or as derived. A key in neither list fails here. Add it to an
    AUTHORED_* tuple in migrate_bundle.py if a human wrote it, or to
    DERIVED_LEAVES below if a script computes it."""
    DERIVED_LEAVES = {"pr", "date", "size", "touched", "status", "commit",
                      "files", "id", "repo", "generated", "schema_version",
                      "levels"}
    harvested = {p.rsplit(".", 1)[-1]
                 for p in migrate_bundle.harvest_authored(golden_story)}
    unclassified = leaf_keys(golden_story) - harvested - DERIVED_LEAVES
    assert not unclassified, f"unclassified field(s): {sorted(unclassified)}"
```

`leaf_keys()`, defined in `tests/conftest.py` alongside the fixtures (see
section 2.3), walks the golden fixture on its own, with no reference to
`harvest_authored()` at all. It fails closed. A future PR that adds a new
authored field to `story.json`, but forgets to add that field's name to
an `AUTHORED_*_FIELDS` tuple, now fails this test immediately, instead of
passing silently while a migration overwrites paid, irreplaceable
content. This is why the test earns its place as the single most
valuable one in this plan. It does not depend on a maintainer remembering
to update it. It fails on its own the moment the real gap it exists to
catch opens up.

#### 3.1.1 This test already found two real gaps

Before anyone wrote a line of this test, a manual run of its logic
against the real, production `.prodyssey/self/data/story.json` surfaced
two authored fields with no guard: `timeline[].adrs` and
`districts[].root_paths`. Commit 3711eaa added both fields to their
`AUTHORED_*_FIELDS` tuples and closed the gap. This is the argument for
the test in one sentence. Run by hand against production data, and before
the code existed as a test, it found a real defect.

## 4. Phasing

**Phase 1, stdlib-only, no git, no fixtures beyond tmp_path.** Cover
`validate_file()`, `check_balance()`, and `check_c4_title()` in
`build_diagrams.py`. Cover `optional_prefixes_for_art()` and `all_ok()`
in `verify_bundle.py`. Cover `escape_script_close()` in
`export_artifact.py`. Each of these is a pure function over strings and
dicts. This phase needs no fixture design first, so it proves the
`conftest.py` import strategy at low cost. It also guards the fixed
comment-bracket bug against a future regression, and it catches the
still-open manifest-drift bug, at the lowest cost too.

**Phase 2, the migration guard and the golden fixture.** Cover
`run_guard()` and `harvest_authored()` in `migrate_bundle.py`, built on
the golden `story.json` fixture from section 2.3. This phase runs
second, not first, because it holds the highest value in this whole
plan, but it needs the fixture in place first. The manifest agreement
test in Phase 3 reuses that same fixture later.

**Phase 3, git-repo-backed tests.** Cover `build_new_story()` and
`discover_prs()` in `extract_story.py`. Cover `split_diff_by_file()`'s
boundary cases in `extract_diffs.py`, fed by real diff output. Cover the
three-way manifest agreement test. This phase needs the `git_repo` and
`make_merged_pr` fixtures from section 2.1, the most setup-heavy part of
this plan, so it runs after the cheaper phases above prove the harness
works.

**Phase 4, pillow-dependent tests, marked and skippable.** Cover
`compress_png_to_jpeg()` and the compression-tier budget loop in
`export_artifact.py`, both of which need `pillow` installed at
collection time. Mark these `@pytest.mark.pillow`, and guard the import
with `pytest.importorskip("PIL")` inside the test body, not at module
level. This way, `pytest scripts/tests/` still collects and runs every
other file when `PIL` is absent.

## 5. What this plan does not test

- **The real Gemini API calls in `generate_prompts.py --generate` and in
  `generate_audio.py`.** Calling the real API costs money, and needs
  network access, both against the constraints of this brief.
  `build_prompts()` in `generate_prompts.py`, the prompt-text assembly
  step with no API call inside it, is a candidate for a later phase, not
  this one, once the manifest-bug fix lands and settles the shape of that
  file.
- **The `npx @mermaid-js/mermaid-cli` path behind `--strict` in
  `build_diagrams.py`.** This step shells out to Node tooling the
  plugin does not require, and the script already degrades to a skip
  note when `npx` is absent. A test here would pin the exact error text of a third-party CLI,
  something outside the control of this repo.
  - **The viewer file, `viewer/index.html`.** It has no test harness of
  its own in this repo, and this plan covers `scripts/` only. A future
  plan for browser-level testing, for example with Playwright, is a
  separate proposal.
- **The `gh pr view` fallback path in `extract_story.py` and
  `extract_diffs.py`.** This path needs either a real,
  authenticated `gh` binary, or a mock of its JSON output. A mock would
  pin a guess this repo makes at that JSON shape, not the real behavior of
  `gh`. This plan defers that work until a fixture strategy for `gh`
  itself gets agreed on, separately from this plan.
- **CI-only concerns, such as installing Node or mermaid-cli.** Out of
  scope, for the same reason as the `--strict` path above.
- **Pixel-level checks on `export_index.py`'s rendered page.** The
  card-rendering test in section 3 checks for the presence of links and
  status badges, not for visual layout. A screenshot-diff test would
  cost more than the risk of this script justifies.

## 6. CI wiring

`uv run` already resolves the inline PEP-723 dependencies of each script with
no venv step. The workflow below installs `uv`, then runs `pytest`
alongside the Phase 4 dependencies this plan marks optional. Below is a
proposed `.github/workflows/test.yml` file.

```yaml
name: scripts tests
on:
  pull_request:
    paths:
      - "scripts/**"
      - "tests/**"
  push:
    branches: [master]
    paths:
      - "scripts/**"
      - "tests/**"

jobs:
  pytest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install uv
        uses: astral-sh/setup-uv@v3
      - name: Configure git identity for throwaway repo fixtures
        run: |
          git config --global user.name "CI"
          git config --global user.email "ci@example.com"
      - name: Run scripts/ test suite
        run: >
          uv run --with pytest --with pillow
          python -m pytest tests/ -v
```

The command `uv run --with pytest --with pillow` installs both packages
into a throwaway environment for this one run, with no committed
`requirements.txt` file. This keeps the Phase 4 pillow tests runnable in
CI. Every stdlib-only test in Phases 1 through 3 needs neither flag to
pass on a local machine. The command omits `google-genai` and
`python-dotenv` on purpose, to match the decision in section 5 to skip
any test that would import them.

The `paths:` filter on both triggers means this workflow never runs on a
docs-only or narrative-only PR. A `story.json` narrative edit, or a
change under `references/*.md`, touches neither `scripts/` nor `tests/`.
