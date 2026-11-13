"""Tests for the vocabulary leads of the evidence packet, slice 12 of structure-coaching (E4).

The glossary index reads each entry of DDD-VOCABULARY.md. The leads name each new name that
holds an avoided word, a defined term, or a token that no term and no file name holds. They go
in evidence.vocabulary of the packet, and never in findings. Each packet case builds a git repo
in tmp_path. The reference cases check that a name exists in a file, never the wording.

Run with: uv run pytest tests/test_structure_vocabulary.py -q
"""
from __future__ import annotations

import ast
import importlib
import importlib.util
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED = REPO_ROOT / "shared"
VOCAB_PATH = SHARED / "structure" / "vocabulary.py"
EVIDENCE_PATH = SHARED / "structure_evidence.py"
VOCAB_AGENT = REPO_ROOT / "plugins" / "implement" / "agents" / "vocabulary.md"
SLICE_LOOP = REPO_ROOT / "plugins" / "implement" / "skills" / "build" / "references" / "slice-loop.md"
COMMIT = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit")
LIB_OLD = "def load():\n    return 1\n"
LIB_NEW = LIB_OLD + "\n\ndef task_queue():\n    return 2\n\n\ndef _task_helper():\n    return 3\n"
GLOSSARY = """\
## implement

<a id="slice"></a>
**Slice** (`implement`):
One vertical unit of an epic's build.
_Avoid_: task (a slice ends in a state a reader can see, and a task need not), epic (a slice belongs to one epic)

<a id="epic"></a>
**Epic** (`implement`):
One unit inside a design.

## alpha

<a id="ledger"></a>
**Ledger** (`alpha`):
A record of postings.
_Avoid_: book (a ledger keeps postings, and a book is paper)
"""


def _api(name: str) -> Any:
    """Return a public name of structure/vocabulary.py. Fail with an assertion when either is absent."""
    assert VOCAB_PATH.is_file(), f"no file at {VOCAB_PATH}: slice 12 creates this module"
    if str(SHARED) not in sys.path:
        sys.path.insert(0, str(SHARED))
    module = importlib.import_module("structure.vocabulary")
    assert hasattr(module, name), f"structure/vocabulary.py has no {name!r} yet"
    return getattr(module, name)


def _packet(repo: Path, base: str) -> dict[str, Any]:
    """Return the packet that build_packet makes, from the real structure_evidence.py."""
    assert EVIDENCE_PATH.is_file(), f"no file at {EVIDENCE_PATH}"
    spec = importlib.util.spec_from_file_location("structure_evidence_vocab", EVIDENCE_PATH)
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


def _scenario(tmp_path: Path, base: dict[str, str], work: dict[str, str]) -> tuple[Path, dict[str, Any]]:
    """Commit the base files, write the work-tree files, and return the repo with its packet."""
    repo = (tmp_path / "repo").resolve()
    repo.mkdir()
    _git(repo, "init", "-q")
    _git(repo, "symbolic-ref", "HEAD", "refs/heads/main")
    _write(repo, base)
    _git(repo, "add", "-A")
    _git(repo, *COMMIT, "-q", "-m", "base")
    base_sha = _git(repo, "rev-parse", "HEAD")
    _write(repo, work)
    return repo, _packet(repo, base_sha)


def _base(extra: dict[str, str] | None = None) -> dict[str, str]:
    """Return the base files: the glossary, a boundary record for each context, one file per folder."""
    files = {
        "DDD-VOCABULARY.md": GLOSSARY,
        "docs/architecture/contexts/implement/boundary.yaml": "id: implement\npath: implement\n",
        "docs/architecture/contexts/alpha/boundary.yaml": "id: alpha\npath: alpha\n",
        "implement/base.py": "BASE = 1\n",
        "alpha/base.py": "BASE = 1\n",
    }
    return {**files, **(extra or {})}


def _field(mapping: Any, key: str) -> Any:
    """Return one key of a dict. Fail with an assertion when the mapping has no such key."""
    assert isinstance(mapping, dict) and key in mapping, f"no {key!r} key in {mapping!r}"
    return mapping[key]


def _vocab(packet: dict[str, Any]) -> dict[str, Any]:
    return _field(_field(packet, "evidence"), "vocabulary")


def _about(items: Any, name: str) -> list[Any]:
    """Return the items of a list whose text names the given name."""
    assert isinstance(items, list), f"expected a list, got {items!r}"
    return [item for item in items if name in str(item)]


def _quoted(item: Any, text: str) -> bool:
    """Return True when the text is one whole string value inside the item, without regard to case."""
    return f"'{text.lower()}'" in str(item).lower()


def test_glossary_index_reads_each_term_context_and_avoided_word_with_its_reason(tmp_path):
    repo, _ = _scenario(tmp_path, _base(), {})
    index = _api("glossary_index")(repo)
    assert isinstance(index, list), f"glossary_index gives {type(index).__name__}, not a list"
    entries = {str(_field(item, "term")).lower(): item for item in index}
    assert set(entries) == {"slice", "epic", "ledger"}, f"the terms are {sorted(entries)}"
    assert str(_field(entries["slice"], "context")) == "implement"
    assert str(_field(entries["ledger"], "context")) == "alpha"
    avoid = _field(entries["slice"], "avoid")
    assert isinstance(avoid, list), f"avoid is not a list: {avoid!r}"
    reasons = {str(_field(item, "word")).lower(): str(_field(item, "reason")) for item in avoid}
    assert set(reasons) == {"task", "epic"}, f"the avoided words are {sorted(reasons)}"
    assert "a task need not" in reasons["task"], f"the task reason is cut short: {reasons['task']!r}"
    assert "belongs to one epic" in reasons["epic"], f"the epic reason is cut short: {reasons['epic']!r}"
    assert _field(entries["epic"], "avoid") == [], "the Epic entry has no _Avoid_ words"


def test_no_glossary_gives_an_empty_index_and_a_not_analysed_line(tmp_path):
    base = {"implement/base.py": "BASE = 1\n"}
    repo, packet = _scenario(tmp_path, base, {"implement/fresh.py": "FRESH = 1\n"})
    assert _api("glossary_index")(repo) == [], "without a glossary the index must be empty"
    named = [line for line in packet["not_analysed"] if re.search("glossary|vocabulary", line, re.I)]
    assert named, f"no not_analysed line names the glossary: {packet['not_analysed']}"
    vocab = _vocab(packet)
    assert not vocab.get("avoid_candidates") and not vocab.get("defined_terms_used"), f"leads: {vocab}"


@pytest.mark.parametrize(
    ("rel", "word", "reason", "flags"),
    [
        ("implement/task_runner.py", "task", "a task need not", (False, True)),
        ("implement/epic_board.py", "epic", "belongs to one epic", (True, True)),
        ("alpha/task_runner.py", "task", "a task need not", (False, False)),
    ],
    ids=["same-context", "epic-is-a-term", "other-context"],
)
def test_an_avoided_word_in_a_new_name_gives_a_candidate_with_its_entry_and_flags(
    tmp_path, rel, word, reason, flags
):
    _, packet = _scenario(tmp_path, _base(), {rel: "RUN = 1\n"})
    stem = Path(rel).stem
    found = _about(_field(_vocab(packet), "avoid_candidates"), stem)
    assert len(found) == 1, f"expected one avoid candidate for {stem}, got {found}"
    candidate = found[0]
    assert _quoted(candidate, word), f"the candidate does not hold the word {word!r}: {candidate}"
    assert _quoted(candidate, "slice"), f"the candidate does not name its entry Slice: {candidate}"
    assert reason in str(candidate), f"the candidate has no reason {reason!r}: {candidate}"
    also_defined, in_context = flags
    assert _field(candidate, "also_defined") is also_defined, f"also_defined is wrong: {candidate}"
    assert _field(candidate, "in_entry_context") is in_context, f"in_entry_context is wrong: {candidate}"


@pytest.mark.parametrize(
    ("rel", "cross"),
    [("alpha/slice_loader.py", True), ("implement/slice_loader.py", False)],
    ids=["term-in-another-context", "term-in-its-context"],
)
def test_a_name_with_a_defined_term_gives_a_defined_terms_used_entry(tmp_path, rel, cross):
    _, packet = _scenario(tmp_path, _base(), {rel: "LOAD = 1\n"})
    found = _about(_field(_vocab(packet), "defined_terms_used"), "slice_loader")
    assert len(found) == 1, f"expected one defined_terms_used entry, got {found}"
    assert _quoted(found[0], "slice"), f"the entry does not name the term Slice: {found[0]}"
    assert _field(found[0], "cross_context") is cross, f"cross_context is wrong: {found[0]}"


def test_a_token_that_no_term_or_file_name_holds_is_a_new_token(tmp_path):
    base = _base({"gizmo_old.py": "OLD = 1\n"})
    _, packet = _scenario(tmp_path, base, {"implement/slice_zebra_gizmo.py": "NEW = 1\n"})
    tokens = _field(_vocab(packet), "new_tokens")
    assert _quoted(tokens, "zebra"), f"zebra is in no term and no file name, so it is new: {tokens}"
    assert not _quoted(tokens, "slice"), f"slice is a defined term, so it is not new: {tokens}"
    assert not _quoted(tokens, "gizmo"), f"gizmo is in a file name of the base, so it is not new: {tokens}"


@pytest.mark.parametrize("modified", [True, False], ids=["modified-file", "added-file"])
def test_an_added_public_symbol_is_a_name_and_a_private_symbol_is_not(tmp_path, modified):
    base = _base({"implement/lib.py": LIB_OLD}) if modified else _base()
    _, packet = _scenario(tmp_path, base, {"implement/lib.py": LIB_NEW})
    candidates = _field(_vocab(packet), "avoid_candidates")
    found = _about(candidates, "task_queue")
    assert len(found) == 1, f"expected one candidate for the added symbol task_queue, got {found}"
    assert _quoted(found[0], "task"), f"the candidate does not hold the word task: {found[0]}"
    assert _about(candidates, "_task_helper") == [], "a private symbol gives a lead"


def test_an_old_unchanged_name_gives_no_lead(tmp_path):
    base = _base({"task_legacy.py": "def task_legacy_run():\n    return 1\n"})
    _, packet = _scenario(tmp_path, base, {"implement/task_runner.py": "RUN = 1\n"})
    vocab = _vocab(packet)
    assert _about(_field(vocab, "avoid_candidates"), "task_runner"), "the new name gives no lead"
    assert "task_legacy" not in str(vocab), f"an old unchanged name gives a lead: {vocab}"


def test_leads_go_in_evidence_vocabulary_and_never_in_findings(tmp_path):
    _, packet = _scenario(tmp_path, _base(), {"implement/task_runner.py": "RUN = 1\n"})
    assert "task_runner" in str(_vocab(packet)), "the lead is not in evidence.vocabulary"
    assert "task_runner" not in str(packet["findings"]), f"a lead is in findings: {packet['findings']}"


def test_the_vocabulary_agent_names_the_packet_or_the_vocabulary_evidence():
    assert VOCAB_AGENT.is_file(), f"missing {VOCAB_AGENT}"
    text = VOCAB_AGENT.read_text(encoding="utf-8")
    assert "packet" in text.lower() or "evidence.vocabulary" in text, (
        "vocabulary.md names neither the packet nor evidence.vocabulary"
    )


def test_the_slice_loop_passes_the_packet_path_in_the_vocabulary_spawn():
    assert SLICE_LOOP.is_file(), f"missing {SLICE_LOOP}"
    blocks = re.split(r"\n\s*\n", SLICE_LOOP.read_text(encoding="utf-8"))
    spawns = [block for block in blocks if "implement:vocabulary" in block]
    assert spawns, "slice-loop.md does not name the implement:vocabulary spawn"
    assert any("packet" in block.lower() for block in spawns), (
        "no paragraph that spawns implement:vocabulary names the packet"
    )


def test_the_vocabulary_module_imports_the_standard_library_only():
    assert VOCAB_PATH.is_file(), f"no file at {VOCAB_PATH}"
    names: list[str] = []
    for node in ast.walk(ast.parse(VOCAB_PATH.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            names += [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom) and node.level == 0:
            names.append(node.module or "")
    outside = [name for name in names if name.split(".")[0] not in sys.stdlib_module_names]
    assert not outside, f"the module imports outside the standard library: {outside}"
