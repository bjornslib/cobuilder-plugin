"""Tests for the vocabulary leads of one name, slice 18 of structure-coaching (E9).

A file and a function of one name both give the name. Each list of evidence.vocabulary must
give that name once. Two names, or one name in two files, must keep one lead each. The packet
cases build a git repo in tmp_path. The unit cases call vocabulary_leads with a small index.

Run with: uv run pytest tests/test_structure_vocabulary_duplicates.py -q
"""
from __future__ import annotations

import importlib
import importlib.util
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED = REPO_ROOT / "shared"
VOCAB_PATH = SHARED / "structure" / "vocabulary.py"
EVIDENCE_PATH = SHARED / "structure_evidence.py"
COMMIT = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit")
LIST_KEYS = ("avoid_candidates", "defined_terms_used", "new_tokens")
ONE_EACH = {"avoid_candidates": 1, "defined_terms_used": 1, "new_tokens": 1}
GLOSSARY = """\
## implement

<a id="issue"></a>
**Issue** (`implement`):
One recorded problem that a person can close.
_Avoid_: invoice (an invoice is a bill that a customer pays)
"""
BASE = {
    "DDD-VOCABULARY.md": GLOSSARY,
    "docs/architecture/contexts/implement/boundary.yaml": "id: implement\npath: implement\n",
    "implement/base.py": "BASE = 1\n",
}
INDEX = [{
    "term": "Issue",
    "context": "implement",
    "avoid": [{"word": "invoice", "reason": "an invoice is a bill that a customer pays"}],
}]


def _api(name: str) -> Any:
    """Return a public name of structure/vocabulary.py. Fail with an assertion when it is absent."""
    assert VOCAB_PATH.is_file(), f"no file at {VOCAB_PATH}"
    if str(SHARED) not in sys.path:
        sys.path.insert(0, str(SHARED))
    module = importlib.import_module("structure.vocabulary")
    assert hasattr(module, name), f"structure/vocabulary.py has no {name!r}"
    return getattr(module, name)


def _packet(repo: Path, base: str) -> dict[str, Any]:
    """Return the packet that build_packet makes, from the real structure_evidence.py."""
    spec = importlib.util.spec_from_file_location("structure_evidence_duplicates", EVIDENCE_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.build_packet(repo, base)


def _git(repo: Path, *args: str) -> str:
    result = subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True)
    return result.stdout.strip()


def _write(repo: Path, files: dict[str, str]) -> None:
    for rel, text in files.items():
        (repo / rel).parent.mkdir(parents=True, exist_ok=True)
        (repo / rel).write_text(text, encoding="utf-8")


def _slice(tmp_path: Path, work: dict[str, str]) -> dict[str, Any]:
    """Commit the base files, write the slice files, and return the packet of the slice."""
    repo = (tmp_path / "repo").resolve()
    repo.mkdir()
    _git(repo, "init", "-q")
    _git(repo, "symbolic-ref", "HEAD", "refs/heads/main")
    _write(repo, BASE)
    _git(repo, "add", "-A")
    _git(repo, *COMMIT, "-q", "-m", "base")
    base_sha = _git(repo, "rev-parse", "HEAD")
    _write(repo, work)
    return _packet(repo, base_sha)


def _field(mapping: Any, key: str) -> Any:
    """Return one key of a mapping. Fail with an assertion when the key is absent."""
    assert isinstance(mapping, dict) and key in mapping, f"no {key!r} key in {mapping!r}"
    return mapping[key]


def _leads(packet: dict[str, Any]) -> dict[str, Any]:
    """Return the vocabulary block of the packet."""
    return _field(_field(packet, "evidence"), "vocabulary")


def test_a_file_and_a_function_of_one_name_give_one_lead_in_each_list(tmp_path):
    """The file and the function of issue_invoice give one lead in each list of the packet."""
    packet = _slice(tmp_path, {"implement/issue_invoice.py": "def issue_invoice():\n    ...\n"})
    leads = _leads(packet)
    counts = {key: len(_field(leads, key)) for key in LIST_KEYS}
    assert counts == ONE_EACH, (
        f"expected one lead in each list, got {counts}. The not_analysed lines: {_field(packet, 'not_analysed')}"
    )
    avoid = _field(leads, "avoid_candidates")[0]
    term = _field(leads, "defined_terms_used")[0]
    token = _field(leads, "new_tokens")[0]
    assert _field(avoid, "name") == "issue_invoice", f"the avoid lead is {avoid!r}"
    assert str(_field(term, "term")).lower() == "issue", f"the defined term lead is {term!r}"
    assert _field(token, "token") == "invoice", f"the new token lead is {token!r}"


@pytest.mark.parametrize(
    ("list_key", "field", "value", "names"),
    [
        ("new_tokens", "token", "invoice", {"issue_invoice", "invoice_total"}),
        ("avoid_candidates", "word", "invoice", {"issue_invoice", "invoice_total"}),
        ("defined_terms_used", "term", "Issue", {"issue_invoice", "issue_list"}),
    ],
    ids=["new-token", "avoided-word", "defined-term"],
)
def test_two_names_that_hold_one_word_keep_one_lead_each(tmp_path, list_key, field, value, names):
    """Two names that hold one word give one lead each in the list of that kind."""
    packet = _slice(tmp_path, {
        "implement/issue_invoice.py": "ISSUE = 1\n",
        "implement/invoice_total.py": "TOTAL = 2\n",
        "implement/issue_list.py": "LIST = 3\n",
    })
    leads = _field(_leads(packet), list_key)
    found = sorted(_field(lead, "name") for lead in leads if _field(lead, field) == value)
    assert found == sorted(names), f"the {list_key} leads for {value!r} name {found}, not {sorted(names)}"


def test_one_name_twice_in_one_file_gives_one_lead_in_each_list():
    """The same name in the same file, listed twice, gives one lead in each list."""
    names = [
        ("issue_invoice", "a/issue_invoice.py", "implement"),
        ("issue_invoice", "a/issue_invoice.py", "implement"),
    ]
    leads = _api("vocabulary_leads")(names, INDEX, [])
    counts = {key: len(_field(leads, key)) for key in LIST_KEYS}
    assert counts == ONE_EACH, f"one name listed twice gives {counts}, not one lead in each list"


def test_one_name_in_two_files_keeps_one_lead_per_file():
    """The same name in two files keeps one lead for each file in every list."""
    names = [
        ("issue_invoice", "a/issue_invoice.py", "implement"),
        ("issue_invoice", "b/issue_invoice.py", "implement"),
    ]
    leads = _api("vocabulary_leads")(names, INDEX, [])
    for key in LIST_KEYS:
        paths = sorted(_field(lead, "path") for lead in _field(leads, key))
        assert paths == ["a/issue_invoice.py", "b/issue_invoice.py"], f"{key} gives the paths {paths}"


def test_two_entries_that_avoid_one_word_keep_one_lead_each_for_one_name():
    """Two glossary entries that list one avoided word give two avoid leads for one name."""
    index = [
        {"term": "Issue", "context": "implement",
         "avoid": [{"word": "invoice", "reason": "a bill that a customer pays"}]},
        {"term": "Ticket", "context": "pr",
         "avoid": [{"word": "invoice", "reason": "a paper that a clerk files"}]},
    ]
    names = [("issue_invoice", "a/issue_invoice.py", "implement")]
    leads = _api("vocabulary_leads")(names, index, [])
    avoid = [lead for lead in _field(leads, "avoid_candidates") if lead["word"] == "invoice"]
    assert sorted(_field(lead, "entry") for lead in avoid) == ["Issue", "Ticket"], (
        f"the avoid leads for one name hold the entries {[lead['entry'] for lead in avoid]}"
    )
    assert sorted(_field(lead, "reason") for lead in avoid) == [
        "a bill that a customer pays", "a paper that a clerk files",
    ], f"the avoid leads lost a reason: {avoid}"
