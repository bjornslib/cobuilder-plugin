"""Tests for the coaching language, slice 3 of structure-coaching (E2).

The slice writes shared/structure-messages.json, a header and one template for each
coach signal, and the Structure block format in structure-judgment.md. The tests check
each template against the facts of real findings, not the wording. Each signal kind
comes from one synthetic git repo in tmp_path. No case reads this repository for data.
Run with: uv run pytest tests/test_structure_messages.py -q
"""
from __future__ import annotations

import importlib.util
import json
import string
import subprocess
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
STRUCTURE_SIGNALS_PATH = REPO_ROOT / "shared" / "structure_signals.py"
MESSAGES_PATH = REPO_ROOT / "shared" / "structure-messages.json"
JUDGMENT_PATH = REPO_ROOT / "plugins/implement/skills/build/references/structure-judgment.md"
COMMIT_OPTIONS = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")
COACH_KINDS = ("crowded-folder", "name-stem-cluster", "generic-name", "boundary-edge")


def _load_structure_signals() -> ModuleType:
    """Return the entry module, loaded by path. Fail with an assertion when it is missing."""
    assert STRUCTURE_SIGNALS_PATH.exists(), f"missing {STRUCTURE_SIGNALS_PATH}"
    spec = importlib.util.spec_from_file_location("structure_signals", STRUCTURE_SIGNALS_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    # Register the module first. Dataclasses look up their module by name.
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True)


def _write(repo: Path, rel: str, text: str) -> Path:
    target = repo / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text)
    return target


def _committed_repo(parent: Path, files: dict[str, str]) -> Path:
    """Return a repo on main whose first commit holds each file with its text."""
    repo = (parent / "repo").resolve()
    repo.mkdir()
    _git(repo, "init", "-q")
    _git(repo, "symbolic-ref", "HEAD", "refs/heads/main")
    for rel, text in files.items():
        _write(repo, rel, text)
    _git(repo, "add", "-A")
    _git(repo, *COMMIT_OPTIONS, "commit", "-q", "-m", "base")
    return repo


def _record(context: str, allowed: str) -> str:
    return f"id: {context}\npath: {context}\nallowed_dependencies:\n  - {allowed}\n"


def _crowded_case(parent: Path) -> tuple[Path, Path]:
    """A folder of five committed files. Alpha and beta import each other."""
    repo = _committed_repo(parent, {
        "pkg/tools/alpha.py": "from .beta import value\n",
        "pkg/tools/beta.py": "from .alpha import other\n",
        "pkg/tools/delta.py": "VALUE = 1\n",
        "pkg/tools/widget_one.py": "WIDGET = 1\n",
        "pkg/tools/widget_two.py": "WIDGET = 2\n",
    })
    return repo, _write(repo, "pkg/tools/zeta.py", "from .alpha import value\n")


def _cluster_case(parent: Path) -> tuple[Path, Path]:
    """Two committed siblings that share a first name token with the new file."""
    repo = _committed_repo(parent, {
        "services/billing_invoice.py": "INVOICE = 1\n",
        "services/billing_refund.py": "REFUND = 1\n",
    })
    return repo, _write(repo, "services/billing_tax.py", "TAX = 1\n")


def _generic_case(parent: Path) -> tuple[Path, Path]:
    """A new file whose stem is on the generic-names list."""
    repo = _committed_repo(parent, {"src/keep.py": "KEEP = 1\n"})
    return repo, _write(repo, "src/utils.py", "UTILS = 1\n")


def _boundary_case(parent: Path) -> tuple[Path, Path]:
    """Orders may name billing only. The new orders file imports shipping."""
    repo = _committed_repo(parent, {
        "docs/architecture/contexts/orders/boundary.yaml": _record("orders", "billing"),
        "docs/architecture/contexts/shipping/boundary.yaml": _record("shipping", "billing"),
        "shipping/labels.py": "LABELS = 1\n",
        "orders/keep.py": "KEEP = 1\n",
    })
    return repo, _write(repo, "orders/checkout.py", "from shipping.labels import make\n")


@pytest.fixture(scope="module")
def real_findings(tmp_path_factory) -> dict[str, list[Any]]:
    """Return the findings, grouped by signal, from the four repos. The folder limit is three."""
    signals = _load_structure_signals()
    found: dict[str, list[Any]] = {}
    for case in (_crowded_case, _cluster_case, _generic_case, _boundary_case):
        repo, new = case(tmp_path_factory.mktemp(case.__name__.strip("_")))
        report = signals.signals_for(str(new), repo, signals.Config(folder_limit=3))
        for finding in report.findings:
            found.setdefault(finding.signal, []).append(finding)
    return found


def _messages() -> dict[str, Any]:
    """Return the parsed messages file. Fail with an assertion when it is missing or not JSON."""
    assert MESSAGES_PATH.is_file(), f"missing {MESSAGES_PATH}"
    try:
        data = json.loads(MESSAGES_PATH.read_text(encoding="utf-8"))
    except ValueError as error:
        assert False, f"{MESSAGES_PATH.name} is not JSON: {error}"
    assert isinstance(data, dict), f"{MESSAGES_PATH.name} must hold a JSON object"
    return data


def _template(messages: dict[str, Any], key: str) -> str:
    """Return one template. Fail with an assertion when the key is missing or empty."""
    assert key in messages, f"{MESSAGES_PATH.name} has no {key!r} key"
    assert isinstance(messages[key], str) and messages[key].strip(), f"{key!r} must be text"
    return messages[key]


def _findings_of(real: dict[str, list[Any]], kind: str) -> list[Any]:
    """Return the real findings of one kind. Fail with an assertion when there are none."""
    found = real.get(kind, [])
    assert found, f"the script emitted no {kind!r} finding for the synthetic repos"
    return found


def _placeholders(template: str) -> set[str]:
    """Return the field names of a template. Fail with an assertion when it does not parse."""
    try:
        fields = list(string.Formatter().parse(template))
    except ValueError as error:
        assert False, f"not a format string ({error}): {template!r}"
    return {name for _, name, _, _ in fields if name is not None}


def _render(template: str, values: dict[str, Any]) -> None:
    """Render the template with the values. Fail with an assertion when rendering raises."""
    try:
        template.format_map(values)
    except (AttributeError, IndexError, KeyError, TypeError, ValueError) as error:
        assert False, f"does not render with {sorted(values)} ({error!r}): {template!r}"


def test_messages_file_has_a_header_and_a_template_for_each_emitted_kind(real_findings):
    messages = _messages()
    emitted = sorted(real_findings)
    assert set(COACH_KINDS) <= set(emitted), f"the repos must emit each kind, got {emitted}"
    keys = ["header", *emitted]
    missing = [key for key in keys if key not in messages]
    assert not missing, f"{MESSAGES_PATH.name} has no key for: {missing}"
    for key in keys:
        _template(messages, key)


@pytest.mark.parametrize("kind", COACH_KINDS)
def test_template_placeholders_are_facts_of_the_real_finding(real_findings, kind):
    template = _template(_messages(), kind)
    for finding in _findings_of(real_findings, kind):
        allowed = {*finding.facts, "path", "folder"}
        unknown = sorted(_placeholders(template) - allowed)
        assert not unknown, f"the {kind} template uses {unknown}, not in {sorted(allowed)}"


@pytest.mark.parametrize("key", ["header", *COACH_KINDS])
def test_template_renders_with_the_facts_of_each_real_finding(real_findings, key):
    template = _template(_messages(), key)
    kinds = COACH_KINDS if key == "header" else (key,)
    for kind in kinds:
        for finding in _findings_of(real_findings, kind):
            _render(template, {**finding.facts, "path": finding.path, "folder": finding.folder})


def test_header_uses_only_the_path_placeholder():
    header = _template(_messages(), "header")
    assert _placeholders(header) == {"path"}, f"the header uses {sorted(_placeholders(header))}"
    assert "\n" not in header.strip(), "the header must be one line"


def test_structure_judgment_reference_file_exists():
    assert JUDGMENT_PATH.is_file(), f"missing {JUDGMENT_PATH}"
