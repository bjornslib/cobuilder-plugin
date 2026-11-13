"""Tests for the duplicate-block finding of the evidence packet, slice 11 of structure-coaching (E4).

A duplicate-block finding names a slice file, the other file, and the lines of each side. A
block is a run of 6-line windows of 120 characters or more, after the string and number rules.
Filter A drops rows of literals, and filter B drops calls with named arguments. A product copy
gives a finding. A test file copy and a copy in old unchanged lines give none. A case that
expects no finding also builds a copy that must give one, so it fails on its assertion until
the rule exists. The design is in epic-E4-design.md, step C6.

Run with: uv run pytest tests/test_structure_duplicates.py -q
"""
from __future__ import annotations

import ast
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
EVIDENCE_PATH = REPO_ROOT / "shared" / "structure_evidence.py"
SIGNALS_PATH = REPO_ROOT / "shared" / "structure_signals.py"
DUPLICATES_PATH = REPO_ROOT / "shared" / "structure" / "duplicates.py"
CONTRACT_KEYS = ("schema", "base", "files", "findings", "evidence", "not_analysed")
GIT = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")

# The preface holds no code line. The block starts at line 3 of the old file and at line 4
# of the new file, so a finding must name those lines.
PREFACE_OLD = "import logging\n\n"
PREFACE_NEW = "import logging\nimport json\n\n"
BLOCK = """def build_summary(order_rows, configured_threshold):
    running_total = accumulate_weights(order_rows)
    if running_total > configured_threshold:
        escalate_to_review(order_rows, running_total)
    summary_label = format_summary_label(running_total)
    cache_store.put(summary_label, running_total)
    audit_log.record_event("summary built", summary_label)
    return summary_label
"""
OTHER_BLOCK = """def render_invoice(invoice_lines, currency_code):
    subtotal_amount = sum_line_amounts(invoice_lines)
    tax_amount = compute_tax_amount(subtotal_amount, currency_code)
    total_amount = subtotal_amount + tax_amount
    invoice_text = format_invoice_text(total_amount, currency_code)
    ledger_store.append(invoice_text, total_amount)
    mailer.send_invoice(invoice_text, currency_code)
    return total_amount
"""
# Each row normalizes to the same 25 characters, so every window holds one or two distinct lines.
ROWS_BLOCK = """OPTION_ROWS = [
    ("alpha", "Alpha status label", "amber", "pending review", "reviewer", "a-1", 1, 10),
    ("beta", "Beta status label", "green", "approved entry", "auditor", "b-2", 2, 20),
    ("gamma", "Gamma status label", "red", "rejected entry", "manager", "g-3", 3, 30),
    ("delta", "Delta status label", "grey", "archived entry", "clerk", "d-4", 4, 40),
    ("epsilon", "Epsilon status label", "blue", "queued entry", "agent", "e-5", 5, 50),
    ("zeta", "Zeta status label", "pink", "closed entry", "owner", "z-6", 6, 60),
    ("eta", "Eta status label", "teal", "open entry", "guest", "h-7", 7, 70),
    ("theta", "Theta status label", "gold", "stale entry", "bot", "t-8", 8, 80),
]
"""
# Every window holds six distinct lines, and at least four of them have the form name=value,.
NAMED_BLOCK = """def send_request(url):
    response = build_request(
        method_name=requested_method_name,
        target_url=resolved_target_url,
        header_map=default_header_map,
        timeout_seconds=configured_timeout,
        retry_count=configured_retry_count,
        verify_flag=tls_verify_flag,
    )
    return response
"""


def _load_evidence() -> ModuleType:
    """Return the entry module, loaded by its path. Fail with an assertion when it is missing."""
    assert EVIDENCE_PATH.exists(), f"missing {EVIDENCE_PATH}"
    spec = importlib.util.spec_from_file_location("structure_evidence_under_test", EVIDENCE_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module  # dataclasses look up their module by name
    spec.loader.exec_module(module)
    return module


def _get(mapping: Any, key: str) -> Any:
    """Return one key of a dict. Fail with an assertion when the key is missing."""
    assert isinstance(mapping, dict) and key in mapping, f"no {key!r} key in {mapping!r}"
    return mapping[key]


def _git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args], check=True, capture_output=True, text=True
    )
    return result.stdout.strip()


def _put(repo: Path, files: dict[str, str]) -> None:
    for rel, text in files.items():
        target = repo / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")


def _packet(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, base: dict[str, str], new: dict[str, str]
) -> dict[str, Any]:
    """Commit the base files, add the new files, run the script, and return the packet it writes."""
    repo = tmp_path.resolve() / "repo"
    repo.mkdir()
    _git(repo, "init", "-q")
    _git(repo, "symbolic-ref", "HEAD", "refs/heads/main")
    _put(repo, base)
    _git(repo, "add", "-A")
    _git(repo, *GIT, "commit", "-q", "-m", "base")
    base_sha = _git(repo, "rev-parse", "HEAD")
    _put(repo, new)
    out = tmp_path / "packet.json"
    monkeypatch.chdir(repo)
    module = _load_evidence()
    assert hasattr(module, "main"), "structure_evidence.py has no main function"
    assert module.main(["--base", base_sha, "--out", str(out)]) == 0, "the script must exit 0"
    assert out.is_file(), f"no packet file at {out}"
    packet = json.loads(out.read_text(encoding="utf-8"))
    missing = [key for key in CONTRACT_KEYS if key not in packet]
    assert not missing, f"the packet has no {missing}"
    return packet


def _findings(packet: dict[str, Any], signal: str) -> list[dict[str, Any]]:
    return [item for item in _get(packet, "findings") if item.get("signal") == signal]


def _pairs(findings: list[dict[str, Any]]) -> list[tuple[Any, Any]]:
    """Return the (slice file, other file) pair of each finding, in order."""
    return [(_get(item, "path"), _get(_get(item, "facts"), "other")) for item in findings]


def _span(value: Any) -> tuple[int, int]:
    """Return the first and the last line number that a lines value names."""
    numbers = [int(number) for number in re.findall(r"\d+", json.dumps(value))]
    assert numbers, f"no line number in {value!r}"
    return min(numbers), max(numbers)


def _imports(path: Path) -> list[tuple[str, int]]:
    """Return the top module name and the relative level of each import in a file."""
    found: list[tuple[str, int]] = []
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            found.extend((alias.name.split(".")[0], 0) for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            found.append(((node.module or "").split(".")[0], node.level))
    return found


def test_a_copied_block_in_an_added_file_names_the_other_file_and_its_lines(tmp_path, monkeypatch):
    packet = _packet(
        tmp_path, monkeypatch,
        {"old/module.py": PREFACE_OLD + BLOCK},
        {"new/feature.py": PREFACE_NEW + BLOCK},
    )
    dups = _findings(packet, "duplicate-block")
    assert len(dups) == 1, f"expected one duplicate-block finding, got {dups}"
    assert _get(dups[0], "path") == "new/feature.py", f"finding: {dups[0]}"
    facts = _get(dups[0], "facts")
    assert _get(facts, "other") == "old/module.py", f"facts: {facts}"
    assert _span(_get(facts, "lines")) == (4, 11), f"lines: {facts}"
    assert _span(_get(facts, "other_lines")) == (3, 10), f"other_lines: {facts}"
    assert _get(facts, "size") == 8, f"size: {facts}"


@pytest.mark.parametrize(
    "block", [ROWS_BLOCK, NAMED_BLOCK], ids=["filter-A-rows", "filter-B-named-arguments"]
)
def test_a_block_that_filter_a_or_b_drops_gives_no_finding_and_a_real_copy_still_gives_one(
    tmp_path, monkeypatch, block
):
    packet = _packet(
        tmp_path, monkeypatch,
        {"pkg/filtered_old.py": block, "pkg/real_old.py": PREFACE_OLD + BLOCK},
        {"pkg/filtered_new.py": block, "pkg/real_new.py": PREFACE_NEW + BLOCK},
    )
    pairs = _pairs(_findings(packet, "duplicate-block"))
    assert ("pkg/real_new.py", "pkg/real_old.py") in pairs, f"the real copy gives no finding: {pairs}"
    filtered = [pair for pair in pairs if "pkg/filtered_new.py" in pair]
    assert not filtered, f"the filtered copy gives a finding: {pairs}"


def test_a_copy_in_old_unchanged_lines_of_a_modified_file_gives_no_finding(tmp_path, monkeypatch):
    source = PREFACE_OLD + BLOCK + "STATUS = 'ready'\n"
    packet = _packet(
        tmp_path, monkeypatch,
        {
            "pkg/source.py": source,
            "pkg/mirror.py": PREFACE_OLD + BLOCK,
            "pkg/library.py": PREFACE_OLD + OTHER_BLOCK,
        },
        {"pkg/source.py": source + "\n" + OTHER_BLOCK},
    )
    dups = _findings(packet, "duplicate-block")
    assert _pairs(dups) == [("pkg/source.py", "pkg/library.py")], f"expected only the added copy: {dups}"
    assert _span(_get(_get(dups[0], "facts"), "lines")) == (13, 20), f"finding: {dups[0]}"


def test_two_added_files_that_copy_each_other_give_one_finding_for_the_pair(tmp_path, monkeypatch):
    packet = _packet(
        tmp_path, monkeypatch,
        {"anchor.py": "ANCHOR = 1\n"},
        {"pkg/first.py": PREFACE_OLD + BLOCK, "pkg/second.py": PREFACE_NEW + BLOCK},
    )
    dups = _findings(packet, "duplicate-block")
    assert len(dups) == 1, f"expected one finding for the pair, got {dups}"
    pair = {_get(dups[0], "path"), _get(_get(dups[0], "facts"), "other")}
    assert pair == {"pkg/first.py", "pkg/second.py"}, f"the pair is {pair}"


def test_a_copy_in_a_test_file_gives_no_finding_and_a_product_copy_does(tmp_path, monkeypatch):
    packet = _packet(
        tmp_path, monkeypatch,
        {"pkg/source.py": PREFACE_OLD + BLOCK},
        {"tests/test_source_copy.py": PREFACE_NEW + BLOCK, "pkg/copy_new.py": PREFACE_NEW + BLOCK},
    )
    pairs = _pairs(_findings(packet, "duplicate-block"))
    assert pairs == [("pkg/copy_new.py", "pkg/source.py")], f"expected the product copy only: {pairs}"


def test_dup_window_and_dup_min_chars_default_to_6_and_120_in_the_structure_config(tmp_path):
    assert SIGNALS_PATH.is_file(), f"missing {SIGNALS_PATH}"
    result = subprocess.run(
        [sys.executable, str(SIGNALS_PATH), "--defaults"],
        cwd=tmp_path, capture_output=True, text=True, timeout=60, check=False,
    )
    assert result.returncode == 0, f"--defaults exited {result.returncode}: {result.stderr}"
    defaults = json.loads(result.stdout)
    assert "dup_window" in defaults, f"no dup_window in {sorted(defaults)}"
    assert defaults["dup_window"] == 6, f"dup_window is {defaults['dup_window']}"
    assert "dup_min_chars" in defaults, f"no dup_min_chars in {sorted(defaults)}"
    assert defaults["dup_min_chars"] == 120, f"dup_min_chars is {defaults['dup_min_chars']}"


def test_a_slice_with_no_code_file_gives_no_duplicate_finding_and_keeps_every_key(tmp_path, monkeypatch):
    packet = _packet(
        tmp_path, monkeypatch,
        {"pkg/one.py": PREFACE_OLD + BLOCK, "pkg/two.py": PREFACE_OLD + BLOCK},
        {"notes/readme.md": "# Notes\n"},
    )
    assert not _findings(packet, "duplicate-block"), f"a markdown slice gives: {packet['findings']}"
    evidence = _get(packet, "evidence")
    assert _get(evidence, "consumer_locality") == [], f"a markdown slice gives entries: {evidence}"


def test_the_duplicates_module_imports_only_the_standard_library():
    assert DUPLICATES_PATH.is_file(), f"missing {DUPLICATES_PATH}: slice 11 creates this module"
    for name, level in _imports(DUPLICATES_PATH):
        if level == 0 and name:
            assert name in sys.stdlib_module_names or name == "structure", (
                f"duplicates.py imports {name!r}, which is neither stdlib nor a structure module"
            )
