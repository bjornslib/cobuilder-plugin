"""Tests for the import reader and the boundary edge, slice 10 of structure-coaching (E1).

The slice reads the references of one file. A reference is an import or a path
string. The tests cover the import groups of a crowded folder, the boundary
edge, the not_analysed lines, the stdlib-only rule, and the --file report. The
design is in epic-E1-design.md, steps A9 and A10.

Each case builds a git repo in tmp_path with synthetic boundary records.
No case reads this repository.

Run with: uv run pytest tests/test_structure_boundary.py -q
"""
from __future__ import annotations

import ast
import importlib.util
import json
import posixpath
import re
import subprocess
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED = REPO_ROOT / "shared"
STRUCTURE_SIGNALS_PATH = SHARED / "structure_signals.py"
STRUCTURE_DIR = SHARED / "structure"
BOUNDARY_PATH = STRUCTURE_DIR / "boundary.py"
PUBLIC_NAMES = ("references", "import_groups", "read_boundaries", "context_of", "boundary_edges")
MOVED_MODULES = ("config.py", "folders.py", "git.py", "names.py", "types.py")
COMMIT_OPTIONS = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")
NAME_TOKEN = re.compile(r"[A-Za-z_][A-Za-z0-9_./-]*")
TSCONFIG_WITH_COMMENTS = """{
  // The alias maps the at sign to the source folder.
  "compilerOptions": {
    /* A block comment that the reader must drop. */
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
"""


# ---------------------------------------------------------------------------
# Helpers: the entry module, the git repos, the records, and the facts
# ---------------------------------------------------------------------------


def _load_structure_signals() -> ModuleType:
    """Return the entry module. Fail with an assertion when the file does not exist."""
    assert STRUCTURE_SIGNALS_PATH.exists(), f"missing {STRUCTURE_SIGNALS_PATH}"
    spec = importlib.util.spec_from_file_location("structure_signals", STRUCTURE_SIGNALS_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    # Register the module first. Dataclasses look up their module by name.
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _api(signals: ModuleType, name: str) -> Any:
    """Return a public name of the entry module. Fail with an assertion when there is none."""
    assert hasattr(signals, name), f"structure_signals has no public name {name!r} yet"
    return getattr(signals, name)


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True)


def _new_repo(tmp_path: Path) -> Path:
    """Return an empty repo whose HEAD names main, so the default branch is known."""
    repo = tmp_path / "repo"
    repo.mkdir()
    repo = repo.resolve()
    _git(repo, "init", "-q")
    _git(repo, "symbolic-ref", "HEAD", "refs/heads/main")
    return repo


def _write(repo: Path, rel: str, text: str | bytes = "content\n") -> Path:
    target = repo / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(text, bytes):
        target.write_bytes(text)
    else:
        target.write_text(text)
    return target


def _tree(tmp_path: Path, files: dict[str, str | bytes]) -> Path:
    """Return a repo on main whose first commit holds each file with its text."""
    repo = _new_repo(tmp_path)
    for rel, text in files.items():
        _write(repo, rel, text)
    _git(repo, "add", "-A")
    _git(repo, *COMMIT_OPTIONS, "commit", "-q", "-m", "base")
    return repo


def _record(
    context: str,
    path: str,
    allowed: tuple[str, ...],
    forbidden: tuple[tuple[str, str], ...] = (),
) -> str:
    """Return a boundary record in the shape of the records of this repository."""
    lines = [
        f"# Boundary record for the {context} bounded context. Synthetic, for one test.",
        "",
        f"id: {context}",
        f"path: {path}",
        f'name: "{context}: a synthetic bounded context"',
        "verified_at: 0000000000000000000000000000000000000000",
        "",
        "public_interface:",
        "  - api.py",
        "",
        "allowed_dependencies:",
        *(f"  - {name}" for name in allowed),
    ]
    if forbidden:
        lines += ["", "forbidden_dependencies:"]
        for target, why in forbidden:
            lines += [f'  - target: "{target}"', f'    why: "{why}"']
    lines += ["", "governed_by:", "  - ADR-0048", ""]
    return "\n".join(lines)


def _records(orders_forbidden: tuple[tuple[str, str], ...] = ()) -> dict[str, str]:
    """Return the boundary records of four synthetic contexts. Orders may name forbidden targets."""
    return {
        "docs/architecture/contexts/orders/boundary.yaml": _record(
            "orders", "orders", ("billing",), orders_forbidden
        ),
        "docs/architecture/contexts/billing/boundary.yaml": _record(
            "billing", "billing", ("shipping",)
        ),
        "docs/architecture/contexts/shipping/boundary.yaml": _record(
            "shipping", "shipping", ("billing",)
        ),
        "docs/architecture/contexts/plugin-host/boundary.yaml": _record(
            "plugin-host", "plugins", ("shipping",)
        ),
    }


def _targets() -> dict[str, str]:
    """Return the committed files that the path strings and the imports of the tests name."""
    return {
        "billing/ledger.py": "LEDGER = 1\n",
        "billing/legacy/old_ledger.py": "OLD = 1\n",
        "shipping/labels.py": "LABELS = 1\n",
        "plugins/cache/install/tool.py": "CACHE = 1\n",
        "plugins/other/tool.py": "TOOL = 1\n",
    }


def _boundary_tree(
    tmp_path: Path,
    orders_forbidden: tuple[tuple[str, str], ...] = (),
    extra: dict[str, str | bytes] | None = None,
) -> Path:
    """Return a repo with the synthetic records, the target files, and one committed orders file."""
    files: dict[str, str | bytes] = {
        **_records(orders_forbidden),
        **_targets(),
        "orders/keep.py": "KEEP = 1\n",
    }
    files.update(extra or {})
    return _tree(tmp_path, files)


def _group_tree(tmp_path: Path) -> Path:
    """Return a repo whose pkg/tools folder holds five files. Alpha and beta import each other."""
    return _tree(tmp_path, {
        "pkg/tools/alpha.py": "from .beta import value\n",
        "pkg/tools/beta.py": "from .alpha import other\n",
        "pkg/tools/delta.py": "VALUE = 1\n",
        "pkg/tools/widget_one.py": "WIDGET = 1\n",
        "pkg/tools/widget_two.py": "WIDGET = 2\n",
    })


def _run_script(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    """Run the script by its absolute path, from the tmp repo, so it reads only that repo."""
    return subprocess.run(
        ["python3", str(STRUCTURE_SIGNALS_PATH), *args],
        cwd=repo,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _json_out(result: subprocess.CompletedProcess[str]) -> Any:
    """Return the parsed stdout. Fail with an assertion that shows what the run printed."""
    assert result.returncode == 0, f"exit {result.returncode}: {result.stderr.strip()[-300:]}"
    try:
        return json.loads(result.stdout)
    except ValueError as error:
        assert False, f"stdout is not JSON ({error}): {result.stdout[:200]!r}"


def _crowded(report: Any) -> list[Any]:
    return [finding for finding in report.findings if finding.signal == "crowded-folder"]


def _boundary(report: Any) -> list[Any]:
    return [finding for finding in report.findings if finding.signal == "boundary-edge"]


def _fact(finding: Any, key: str) -> Any:
    """Return one fact of a finding. Fail with an assertion when the fact has no such key."""
    assert key in finding.facts, (
        f"the {finding.signal} finding has no {key!r} fact: {finding.facts!r}"
    )
    return finding.facts[key]


def _edges_at(report: Any, line: int) -> list[Any]:
    """Return the boundary-edge findings that name the given line of the new file."""
    return [finding for finding in _boundary(report) if int(_fact(finding, "line")) == line]


def _as_text(refs: list[Any]) -> str:
    """Return each reference as text. A test looks for a repo path in the text."""
    return "\n".join(str(ref) for ref in refs)


def _stems(value: Any) -> set[str]:
    """Return the file stems that a value names. The value may nest lists, dicts, and strings."""
    if value is None:
        return set()
    if isinstance(value, dict):
        value = list(value.values())
    if isinstance(value, (list, tuple, set, frozenset)):
        found: set[str] = set()
        for item in value:
            found |= _stems(item)
        return found
    tokens = NAME_TOKEN.findall(str(value))
    return {posixpath.splitext(posixpath.basename(token))[0] for token in tokens}


def _groups(components: Any) -> list[set[str]]:
    """Return the stems of each group that a components value names."""
    if components is None:
        return []
    if isinstance(components, str):
        parts: list[Any] = re.split(r"[;|]", components)
    elif isinstance(components, dict):
        parts = list(components.values())
    else:
        parts = list(components)
    groups = [_stems(part) for part in parts]
    return [group for group in groups if group]


# ---------------------------------------------------------------------------
# The entry point and the module layout
# ---------------------------------------------------------------------------


def test_entry_point_reexports_the_boundary_names():
    signals = _load_structure_signals()

    missing = [name for name in PUBLIC_NAMES if not callable(getattr(signals, name, None))]

    assert not missing, f"structure_signals must re-export these names: {missing}"


def test_helper_modules_move_into_the_structure_folder():
    expected = ("boundary.py", *MOVED_MODULES)
    missing = [name for name in expected if not (STRUCTURE_DIR / name).is_file()]
    left_behind = [
        f"structure_{name}" for name in MOVED_MODULES if (SHARED / f"structure_{name}").exists()
    ]

    assert not missing, f"missing from shared/structure: {missing}"
    assert not left_behind, f"the flat helper files must move, not stay: {left_behind}"


def test_boundary_and_structure_modules_import_only_the_standard_library():
    assert BOUNDARY_PATH.is_file(), f"missing {BOUNDARY_PATH}"
    local = {"structure"} | {path.stem for path in SHARED.glob("structure_*.py")}
    for path in [STRUCTURE_SIGNALS_PATH, *sorted(STRUCTURE_DIR.glob("*.py"))]:
        for name, level in _imports(path):
            if level == 0 and name:
                assert name in sys.stdlib_module_names or name in local, (
                    f"{path.name} imports {name!r}, which is neither stdlib nor a structure module"
                )


def _imports(path: Path) -> list[tuple[str, int]]:
    """Return the top module name and the relative level of each import in a file."""
    found: list[tuple[str, int]] = []
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            found.extend((alias.name.split(".")[0], 0) for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            found.append(((node.module or "").split(".")[0], node.level))
    return found


# ---------------------------------------------------------------------------
# The import groups of a crowded folder
# ---------------------------------------------------------------------------


def test_crowded_finding_names_the_import_group_of_siblings_that_import_each_other(tmp_path):
    signals = _load_structure_signals()
    repo = _group_tree(tmp_path)
    new = _write(repo, "pkg/tools/zeta.py", "from .alpha import value\n")

    report = signals.signals_for(str(new), repo, signals.Config(folder_limit=3))

    crowded = _crowded(report)
    assert len(crowded) == 1, f"expected one crowded-folder finding, got {report.findings!r}"
    groups = _groups(_fact(crowded[0], "components"))
    assert any({"alpha", "beta"} <= group for group in groups), (
        f"no group holds alpha and beta: {groups!r}"
    )
    assert not any("delta" in group for group in groups), (
        f"delta imports nothing, so it forms no group: {groups!r}"
    )


def test_crowded_finding_names_the_name_families_and_the_import_groups_together(tmp_path):
    signals = _load_structure_signals()
    repo = _group_tree(tmp_path)
    new = _write(repo, "pkg/tools/zeta.py", "from .alpha import value\n")

    crowded = _crowded(signals.signals_for(str(new), repo, signals.Config(folder_limit=3)))

    assert len(crowded) == 1, "expected one crowded-folder finding"
    families = str(_fact(crowded[0], "families"))
    assert re.search(r"widget \(2\)", families), f"the name families were {families!r}"
    groups = _groups(_fact(crowded[0], "components"))
    assert any({"alpha", "beta"} <= group for group in groups), (
        f"the import groups were {groups!r}"
    )


def test_new_file_that_imports_a_group_names_that_group_as_its_nearest_group(tmp_path):
    signals = _load_structure_signals()
    repo = _group_tree(tmp_path)
    new = _write(repo, "pkg/tools/zeta.py", "from .alpha import value\n")

    crowded = _crowded(signals.signals_for(str(new), repo, signals.Config(folder_limit=3)))

    assert len(crowded) == 1, "expected one crowded-folder finding"
    nearest = _fact(crowded[0], "nearest_group")
    assert nearest is not None, "zeta imports alpha, so it joins the group of alpha and beta"
    assert {"alpha", "beta"} <= _stems(nearest), f"nearest_group names {nearest!r}"


def test_new_file_that_joins_no_group_has_a_null_nearest_group(tmp_path):
    signals = _load_structure_signals()
    repo = _group_tree(tmp_path)
    new = _write(repo, "pkg/tools/iota.py", "VALUE = 2\n")

    crowded = _crowded(signals.signals_for(str(new), repo, signals.Config(folder_limit=3)))

    assert len(crowded) == 1, "expected one crowded-folder finding"
    assert "nearest_group" in crowded[0].facts, f"no nearest_group fact: {crowded[0].facts!r}"
    assert crowded[0].facts["nearest_group"] is None, "iota joins no group, so the value is null"


def test_folder_over_the_sibling_parse_cap_gives_families_only_and_a_not_analysed_line(tmp_path):
    signals = _load_structure_signals()
    config = signals.Config(folder_limit=3)
    files: dict[str, str | bytes] = {
        "pkg/small/alpha.py": "from .beta import value\n",
        "pkg/small/beta.py": "from .alpha import other\n",
        "pkg/small/delta.py": "VALUE = 1\n",
        "pkg/big/widget_00.py": "from .widget_01 import value\n",
        "pkg/big/widget_01.py": "from .widget_00 import other\n",
    }
    files.update({f"pkg/big/widget_{index:02d}.py": "VALUE = 0\n" for index in range(2, 75)})
    repo = _tree(tmp_path, files)
    control_new = _write(repo, "pkg/small/zeta.py", "from .alpha import value\n")
    big_new = _write(repo, "pkg/big/widget_75.py", "VALUE = 75\n")

    control = _crowded(signals.signals_for(str(control_new), repo, config))
    assert len(control) == 1, "control: the folder under the cap is crowded"
    control_groups = _groups(_fact(control[0], "components"))
    assert any({"alpha", "beta"} <= group for group in control_groups), (
        f"control: under the cap the pair forms a group, got {control_groups!r}"
    )

    report = signals.signals_for(str(big_new), repo, config)

    crowded = _crowded(report)
    assert len(crowded) == 1, f"expected one crowded-folder finding, got {report.findings!r}"
    families = str(_fact(crowded[0], "families"))
    assert re.search(r"widget \(76\)", families), f"the name families were {families!r}"
    components = crowded[0].facts.get("components")
    assert not components, f"above the cap the import groups are not read, got {components!r}"
    assert any("pkg/big" in line or "60" in line for line in report.not_analysed), (
        f"the report must say that the folder was not parsed, got {report.not_analysed!r}"
    )


# ---------------------------------------------------------------------------
# The references of one file
# ---------------------------------------------------------------------------


def test_python_relative_import_resolves_to_the_sibling_file(tmp_path):
    signals = _load_structure_signals()
    repo = _tree(tmp_path, {"pkg/tools/beta.py": "VALUE = 1\n"})
    new = _write(repo, "pkg/tools/alpha.py", "from .beta import value\n")

    refs = list(_api(signals, "references")(str(new), repo))

    assert "pkg/tools/beta.py" in _as_text(refs), f"the import must resolve to beta, got {refs!r}"


@pytest.mark.parametrize(
    "statement",
    [
        "import { helper } from './model';\n",
        "export { helper } from './model';\n",
        "const model = import('./model');\n",
        "const model = require('./model');\n",
    ],
    ids=["import", "export", "dynamic-import", "require"],
)
def test_typescript_relative_spec_resolves_to_the_repo_file(tmp_path, statement):
    signals = _load_structure_signals()
    repo = _tree(tmp_path, {"src/app/model.ts": "export const helper = 1;\n"})
    new = _write(repo, "src/app/view.ts", statement)

    refs = list(_api(signals, "references")(str(new), repo))

    assert "src/app/model.ts" in _as_text(refs), f"the spec must resolve to model.ts, got {refs!r}"


def test_typescript_alias_from_tsconfig_resolves_when_the_tsconfig_has_comments(tmp_path):
    signals = _load_structure_signals()
    repo = _tree(tmp_path, {
        "tsconfig.json": TSCONFIG_WITH_COMMENTS,
        "src/lib/store.ts": "export const store = 1;\n",
    })
    new = _write(repo, "src/app/view.ts", "import { load } from '@/lib/store';\n")

    refs = list(_api(signals, "references")(str(new), repo))

    assert "src/lib/store.ts" in _as_text(refs), f"the alias must resolve to store.ts, got {refs!r}"


def test_path_string_resolves_to_the_path_it_names(tmp_path):
    signals = _load_structure_signals()
    repo = _boundary_tree(tmp_path)
    new = _write(repo, "orders/checkout.py", 'LEDGER = "billing/ledger.py"\n')

    refs = list(_api(signals, "references")(str(new), repo))

    assert "billing/ledger.py" in _as_text(refs), f"the path string must resolve, got {refs!r}"


@pytest.mark.parametrize(
    ("name", "statement"),
    [
        ("orders/checkout.py", "import os\nfrom requests import Session\n"),
        ("src/app/view.ts", "import React from 'react';\n"),
    ],
    ids=["python", "typescript"],
)
def test_external_import_gives_no_reference(tmp_path, name, statement):
    signals = _load_structure_signals()
    repo = _tree(tmp_path, {"keep/keep.py": "KEEP = 1\n"})
    new = _write(repo, name, statement)

    refs = list(_api(signals, "references")(str(new), repo))

    assert refs == [], f"an external import names no repo file, got {refs!r}"


def test_parse_error_gives_no_reference_and_one_not_analysed_line(tmp_path):
    signals = _load_structure_signals()
    repo = _boundary_tree(tmp_path)
    new = _write(repo, "orders/broken_syntax.py", "def broken(:\n    pass\n")

    refs = list(_api(signals, "references")(str(new), repo))
    report = signals.signals_for(str(new), repo, signals.Config())

    assert refs == [], f"a file that does not parse gives no reference, got {refs!r}"
    named = [line for line in report.not_analysed if "broken_syntax.py" in line]
    assert len(named) == 1, (
        f"expected one not_analysed line for the file, got {report.not_analysed!r}"
    )


# ---------------------------------------------------------------------------
# The boundary edge
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("statement", "needle"),
    [
        ('LABEL = "shipping/labels.py"\n', "shipping/labels.py"),
        ("from shipping.labels import make\n", "shipping.labels"),
    ],
    ids=["path-string", "import"],
)
def test_reference_to_a_context_outside_allowed_gives_an_outside_allowed_finding(
    tmp_path, statement, needle
):
    signals = _load_structure_signals()
    repo = _boundary_tree(tmp_path)
    new = _write(repo, "orders/checkout.py", '"""Checkout."""\n' + statement)

    report = signals.signals_for(str(new), repo, signals.Config())

    edges = _boundary(report)
    assert len(edges) == 1, f"expected one boundary-edge finding, got {report.findings!r}"
    finding = edges[0]
    assert finding.path == "orders/checkout.py", f"the finding names {finding.path!r}"
    assert int(_fact(finding, "line")) == 2, f"the finding names line {_fact(finding, 'line')!r}"
    assert needle in str(_fact(finding, "text")), f"the text was {_fact(finding, 'text')!r}"
    assert _fact(finding, "from_context") == "orders"
    assert _fact(finding, "to_context") == "shipping"
    assert _fact(finding, "kind") == "outside-allowed"
    assert _fact(finding, "in_comment") is False
    rule = _fact(finding, "rule")
    assert isinstance(rule, str) and rule.strip(), f"the finding must name its rule, got {rule!r}"


def test_path_in_a_comment_is_flagged_as_in_comment_and_a_path_in_code_is_not(tmp_path):
    signals = _load_structure_signals()
    repo = _boundary_tree(tmp_path)
    new = _write(repo, "orders/checkout.py", (
        '"""Checkout."""\n'
        '# Labels come from "shipping/labels.py" for now.\n'
        'LABEL = "shipping/labels.py"\n'
    ))

    report = signals.signals_for(str(new), repo, signals.Config())

    commented = _edges_at(report, 2)
    coded = _edges_at(report, 3)
    assert len(commented) == 1, f"expected a finding at the comment, got {report.findings!r}"
    assert _fact(commented[0], "in_comment") is True
    assert len(coded) == 1, f"expected a finding at the code line, got {report.findings!r}"
    assert _fact(coded[0], "in_comment") is False


def test_path_that_matches_a_forbidden_glob_gives_a_forbidden_glob_finding(tmp_path):
    signals = _load_structure_signals()
    repo = _boundary_tree(
        tmp_path, orders_forbidden=(("billing/legacy/**", "Synthetic rule for one test."),)
    )
    new = _write(
        repo, "orders/checkout.py", '"""Checkout."""\nOLD = "billing/legacy/old_ledger.py"\n'
    )

    report = signals.signals_for(str(new), repo, signals.Config())

    globbed = [
        finding for finding in _edges_at(report, 2) if _fact(finding, "kind") == "forbidden-glob"
    ]
    assert len(globbed) == 1, (
        f"expected one forbidden-glob finding at line 2, got {report.findings!r}"
    )
    assert "billing/legacy/old_ledger.py" in str(_fact(globbed[0], "text"))
    assert _fact(globbed[0], "from_context") == "orders"
    rule = _fact(globbed[0], "rule")
    assert isinstance(rule, str) and rule.strip(), f"the finding must name its rule, got {rule!r}"


def test_prose_forbidden_target_gives_no_finding_while_a_glob_target_still_does(tmp_path):
    signals = _load_structure_signals()
    repo = _boundary_tree(tmp_path, orders_forbidden=(
        ("direct SQL queries from the checkout code", "Synthetic prose rule for one test."),
        ("billing/legacy/**", "Synthetic rule for one test."),
    ))
    new = _write(repo, "orders/checkout.py", (
        '"""Checkout."""\n'
        'LEDGER = "billing/ledger.py"\n'
        'OLD = "billing/legacy/old_ledger.py"\n'
    ))

    report = signals.signals_for(str(new), repo, signals.Config())

    glob_kinds = [_fact(finding, "kind") for finding in _edges_at(report, 3)]
    assert glob_kinds == ["forbidden-glob"], (
        f"control: the glob target must give one finding at line 3, got {glob_kinds!r}"
    )
    assert _edges_at(report, 2) == [], "a prose target gives no finding for billing/ledger.py"


def test_reference_to_an_allowed_context_gives_no_boundary_finding(tmp_path):
    signals = _load_structure_signals()
    repo = _boundary_tree(tmp_path)
    new = _write(repo, "orders/checkout.py", (
        '"""Checkout."""\n'
        'LEDGER = "billing/ledger.py"\n'
        'LABELS = "shipping/labels.py"\n'
    ))

    report = signals.signals_for(str(new), repo, signals.Config())

    assert _edges_at(report, 3), "control: the shipping path gives a finding at line 3"
    assert _edges_at(report, 2) == [], "billing is in allowed_dependencies, so line 2 gives none"


def test_plugins_cache_string_gives_no_boundary_finding_and_another_plugin_path_does(tmp_path):
    signals = _load_structure_signals()
    repo = _boundary_tree(tmp_path)
    new = _write(repo, "orders/checkout.py", (
        '"""Checkout."""\n'
        'CACHE = "plugins/cache/install/tool.py"\n'
        'TOOL = "plugins/other/tool.py"\n'
    ))

    report = signals.signals_for(str(new), repo, signals.Config())

    assert _edges_at(report, 3), (
        "control: a plugins path outside allowed_dependencies gives a finding"
    )
    assert _edges_at(report, 2) == [], "a reference to plugins/cache/ gives no finding"


def test_edit_to_an_old_file_gives_no_boundary_finding(tmp_path):
    signals = _load_structure_signals()
    old_text = '"""Checkout."""\nLABELS = "shipping/labels.py"\n'
    repo = _boundary_tree(tmp_path, extra={"orders/checkout.py": old_text})
    control_new = _write(repo, "orders/checkout_copy.py", old_text + "NOTE = 1\n")
    control = _boundary(signals.signals_for(str(control_new), repo, signals.Config()))
    assert len(control) == 1, "control: a new file with the same path string gives a finding"
    edited = _write(repo, "orders/checkout.py", old_text + "NOTE = 2\n")

    report = signals.signals_for(str(edited), repo, signals.Config())

    assert _boundary(report) == [], "an edit to an old file gives no boundary finding"


# ---------------------------------------------------------------------------
# The not_analysed lines: no context, an unreadable record, and a parse error
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "rel",
    ["scratch/loose_notes.py", "orders_archive/legacy_ledger.py"],
    ids=["folder-with-no-record", "folder-named-like-a-record"],
)
def test_file_with_no_context_gives_a_not_analysed_line_that_names_the_file(tmp_path, rel):
    signals = _load_structure_signals()
    repo = _boundary_tree(tmp_path)
    new = _write(repo, rel, '"""Notes."""\nNOTE = 1\n')

    report = signals.signals_for(str(new), repo, signals.Config())

    named = [line for line in report.not_analysed if Path(rel).name in line]
    assert named, (
        f"a file with no context must give a not_analysed line, got {report.not_analysed!r}"
    )
    assert _boundary(report) == [], "a file with no context gives no boundary finding"


def test_unreadable_record_gives_a_not_analysed_line_and_the_other_records_still_work(tmp_path):
    signals = _load_structure_signals()
    repo = _boundary_tree(tmp_path, extra={
        "docs/architecture/contexts/broken/boundary.yaml": b"\xff\xfe\x00 not text \x80\n",
    })
    new = _write(repo, "orders/checkout.py", '"""Checkout."""\nLABELS = "shipping/labels.py"\n')

    report = signals.signals_for(str(new), repo, signals.Config())

    named = [line for line in report.not_analysed if "broken" in line]
    assert named, f"an unreadable record must give a not_analysed line, got {report.not_analysed!r}"
    assert _edges_at(report, 2), "control: the other records still give a finding at line 2"


# ---------------------------------------------------------------------------
# The command: one not_analysed line for each glob, with the sum of its files
# ---------------------------------------------------------------------------


def test_two_excluded_files_under_one_glob_print_one_not_analysed_line_with_the_sum(tmp_path):
    repo = _tree(tmp_path, {"keep/keep.py": "KEEP = 1\n"})
    first = _write(repo, "plugins/x/docs/alpha.md", "# Alpha\n")
    second = _write(repo, "plugins/x/docs/beta.md", "# Beta\n")

    data = _json_out(_run_script(repo, "--file", str(first), "--file", str(second)))

    lines = [line for line in data["not_analysed"] if "**/docs/**" in line]
    assert len(lines) == 1, f"expected one line for **/docs/**, got {data['not_analysed']!r}"
    assert re.search(r"\b2\b", lines[0]), f"the one line must sum the 2 files, got {lines[0]!r}"
