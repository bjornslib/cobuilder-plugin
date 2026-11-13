"""Tests for slice 4 of structure-coaching (E2): the coach wording and the session record.

The runner renders each coach finding with its template from shared/structure-messages.json.
It keeps a session record of the finding keys that a session showed. A second write in the
same session then gives no repeat. Each expected text is a template of that file, formatted
with the facts of a real finding from shared/structure_signals.py. Each folder tree is a
synthetic git repo in tmp_path. Each session record goes to a temp folder in tmp_path. The
tests read only the message file and the scripts of this repository. No test writes to the
real temp folder.

Run with: uv run pytest tests/test_structure_runner.py -q
"""
from __future__ import annotations

import importlib.util
import inspect
import json
import subprocess
import tempfile
from pathlib import Path
from types import ModuleType

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
RUNNER_PATH = REPO_ROOT / "plugins" / "implement" / "scripts" / "structure_runner.py"
SIGNALS_PATH = REPO_ROOT / "shared" / "structure_signals.py"
MESSAGES_PATH = REPO_ROOT / "shared" / "structure-messages.json"
COMMIT_OPTIONS = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")
RECORD_GLOB = "cobuilder-coach-*.json"
COACH_KINDS = ("crowded-folder", "name-stem-cluster", "generic-name", "boundary-edge")
FLAT_WORDS = (
    "apple", "banana", "cherry", "date", "elder", "fig", "grape", "honey", "iris", "jade",
    "kiwi", "lemon", "mango", "nut", "olive", "peach", "quince", "rose", "sage", "tulip", "umber",
)
BAD_RECORDS = [
    pytest.param("{not json", id="bad-json"),
    pytest.param("", id="empty-file"),
    pytest.param("null", id="null"),
    pytest.param('{"a": 1}', id="object"),
    pytest.param("[1, 2]", id="numbers"),
    pytest.param('"text"', id="string"),
    pytest.param('["ok", 3]', id="mixed-list"),
]


# ---------------------------------------------------------------------------
# Loading, temp folder, and checks that fail with an assertion
# ---------------------------------------------------------------------------


def _load(name: str, path: Path) -> ModuleType:
    """Load a module from its file. Fail with an assertion when the file is missing."""
    assert path.exists(), f"missing {path}"
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture()
def runner() -> ModuleType:
    return _load("structure_runner", RUNNER_PATH)


@pytest.fixture(scope="module")
def signals() -> ModuleType:
    return _load("structure_signals", SIGNALS_PATH)


@pytest.fixture(autouse=True)
def coach_temp(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Send each session record to a folder in tmp_path, never to the real temp folder."""
    temp = tmp_path / "coach-temp"
    temp.mkdir()
    monkeypatch.setenv("TMPDIR", str(temp))
    monkeypatch.setattr(tempfile, "tempdir", None)
    return temp


def _require(module: ModuleType, name: str) -> None:
    assert hasattr(module, name), f"structure_runner.{name} is missing"


def _require_params(func: object, count: int) -> None:
    params = inspect.signature(func).parameters
    assert len(params) == count, f"{func.__name__} takes {len(params)} parameters, not {count}"


# ---------------------------------------------------------------------------
# Synthetic repos and the expected text
# ---------------------------------------------------------------------------


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True)


def _write(repo: Path, rel: str, text: str = "X = 1\n") -> Path:
    """Write one file under repo. A file written after the first commit is a new file."""
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


def _crowded_files() -> dict[str, str]:
    """Twenty committed files in src/pkg. Twenty is the default folder limit."""
    return {f"src/pkg/mod_{index:02d}.py": "X = 1\n" for index in range(20)}


def _crowded_case(parent: Path) -> tuple[Path, Path]:
    repo = _committed_repo(parent, _crowded_files())
    return repo, _write(repo, "src/pkg/new_module.py")


def _cluster_case(parent: Path) -> tuple[Path, Path]:
    repo = _committed_repo(parent, {
        "services/billing_invoice.py": "INVOICE = 1\n",
        "services/billing_refund.py": "REFUND = 1\n",
    })
    return repo, _write(repo, "services/billing_tax.py")


def _generic_case(parent: Path) -> tuple[Path, Path]:
    repo = _committed_repo(parent, {"src/keep.py": "KEEP = 1\n"})
    return repo, _write(repo, "src/utils.py")


def _boundary_case(parent: Path) -> tuple[Path, Path]:
    """Orders may name billing only. The new orders file imports shipping."""
    repo = _committed_repo(parent, {
        "docs/architecture/contexts/orders/boundary.yaml": _record("orders", "billing"),
        "docs/architecture/contexts/shipping/boundary.yaml": _record("shipping", "billing"),
        "shipping/labels.py": "LABELS = 1\n",
        "orders/keep.py": "KEEP = 1\n",
    })
    return repo, _write(repo, "orders/checkout.py", "from shipping.labels import make\n")


CASE_BUILDERS = {
    "crowded-folder": _crowded_case,
    "name-stem-cluster": _cluster_case,
    "generic-name": _generic_case,
    "boundary-edge": _boundary_case,
}


class _Values(dict):
    """The names of one template. A name with no value reads as none."""

    def __missing__(self, key: str) -> str:
        return "none"


def _fact_text(value: object) -> object:
    """Return a fact as the template shows it. A missing, None, or empty fact reads as none."""
    return "none" if value is None or value == "" else value


def _messages() -> dict[str, str]:
    assert MESSAGES_PATH.is_file(), f"missing {MESSAGES_PATH}"
    return json.loads(MESSAGES_PATH.read_text(encoding="utf-8"))


def _body(messages: dict[str, str], finding: object) -> str:
    """Return the text of one finding: its template, formatted with the facts of the finding."""
    facts = {name: _fact_text(value) for name, value in finding.facts.items()}
    values = _Values({**facts, "path": finding.path, "folder": finding.folder})
    return messages[finding.signal].format_map(values)


def _header_tail(messages: dict[str, str]) -> str:
    """Return the part of the header after its path. Each write gives the same tail."""
    header = messages["header"]
    assert "{path}" in header, "the header must hold the {path} placeholder"
    return header.split("{path}", 1)[1]


def _findings(signals: ModuleType, repo: Path, new: Path) -> list:
    """Return the findings that the script gives for one written file."""
    return list(signals.signals_for(str(new), repo, signals.Config()).findings)


def _assert_shows(text: str, messages: dict[str, str], findings: list) -> None:
    """Assert that the text holds the template text of each finding."""
    assert findings, "the write gave no finding to show"
    for finding in findings:
        body = _body(messages, finding)
        assert body in text, f"the message lacks the {finding.signal} text: {body!r}"


def _record_keys(temp: Path, session: str) -> list:
    """Return the keys of one session record. Fail with an assertion when there is no record."""
    record = temp / f"cobuilder-coach-{session}.json"
    assert record.is_file(), f"no session record at {record}"
    return json.loads(record.read_text(encoding="utf-8"))


def _files_outside(root: Path, *inside: Path) -> set[Path]:
    """Return the files under root that none of the inside folders holds."""
    folders = {folder.resolve() for folder in inside}
    return {
        path for path in root.resolve().rglob("*")
        if path.is_file() and not folders.intersection(path.parents)
    }


@pytest.fixture(scope="module")
def real_findings(signals, tmp_path_factory) -> dict[str, list]:
    """Return the findings of each coach kind. Each kind comes from its own synthetic repo."""
    found: dict[str, list] = {}
    for kind, build in CASE_BUILDERS.items():
        repo, new = build(tmp_path_factory.mktemp(kind.replace("-", "_")))
        found[kind] = [item for item in _findings(signals, repo, new) if item.signal == kind]
        assert found[kind], f"the {kind} repo gave no {kind} finding"
    return found


# ---------------------------------------------------------------------------
# render(finding, messages): each signal uses its template from the file
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("kind", COACH_KINDS)
def test_render_fills_the_template_of_each_coach_signal(runner, real_findings, kind):
    _require(runner, "render")
    _require(runner, "load_messages")
    _require_params(runner.render, 2)
    messages = runner.load_messages(MESSAGES_PATH)
    finding = real_findings[kind][0]
    assert runner.render(finding, messages) == _body(_messages(), finding)


@pytest.mark.parametrize("state", ["missing", "none", "empty"])
def test_render_shows_none_for_a_missing_none_or_empty_fact(runner, signals, state):
    _require(runner, "render")
    _require(runner, "load_messages")
    _require_params(runner.render, 2)
    facts: dict[str, object] = {"count": 21, "limit": 20, "families": "mod (20)"}
    if state == "none":
        facts["components"] = None
    if state == "empty":
        facts["components"] = ""
    finding = signals.Finding("crowded-folder", "src/pkg/new_module.py", "src/pkg", facts)
    messages = runner.load_messages(MESSAGES_PATH)
    assert runner.render(finding, messages) == _body(_messages(), finding)


# ---------------------------------------------------------------------------
# run(path, session_id): the message text for one write
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("kind", COACH_KINDS)
def test_run_shows_each_coach_signal_with_its_template(runner, signals, tmp_path, kind):
    repo, new = CASE_BUILDERS[kind](tmp_path)
    messages = _messages()
    code, text = runner.run(str(new), None)
    assert code == 1, f"expected a message for the {kind} write, got code {code}"
    assert _header_tail(messages) in text, "the message has no header"
    findings = [item for item in _findings(signals, repo, new) if item.signal == kind]
    assert findings, f"the {kind} write gave no {kind} finding"
    _assert_shows(text, messages, findings)


def test_run_writes_the_header_once_for_two_findings_on_one_write(runner, signals, tmp_path):
    repo = _committed_repo(tmp_path, _crowded_files())
    new = _write(repo, "src/pkg/utils.py")
    messages = _messages()
    findings = _findings(signals, repo, new)
    assert sorted(item.signal for item in findings) == ["crowded-folder", "generic-name"], (
        f"the write must give two findings, got {[item.signal for item in findings]}"
    )
    code, text = runner.run(str(new), None)
    assert code == 1, f"expected a message, got code {code}"
    assert text.count(_header_tail(messages)) == 1, "the header must appear once for two findings"
    _assert_shows(text, messages, findings)


def test_run_gives_no_text_for_a_second_call_with_the_same_session(runner, tmp_path):
    _, new = _crowded_case(tmp_path)
    assert runner.run(str(new), "session-one")[0] == 1, "the first call must give a message"
    assert runner.run(str(new), "session-one") == (0, ""), "the second call repeated the message"


def test_run_gives_the_text_again_in_a_new_session(runner, signals, tmp_path):
    repo, new = _crowded_case(tmp_path)
    messages = _messages()
    runner.run(str(new), "session-one")
    code, text = runner.run(str(new), "session-two")
    assert code == 1, f"a new session must show the text again, got code {code}"
    _assert_shows(text, messages, _findings(signals, repo, new))


def test_run_without_a_session_id_shows_the_text_and_writes_no_record(
    runner, signals, tmp_path, coach_temp
):
    repo, new = _crowded_case(tmp_path)
    messages = _messages()
    findings = _findings(signals, repo, new)
    for _ in range(2):
        code, text = runner.run(str(new), None)
        assert code == 1, f"a missing session_id must still show the text, got code {code}"
        _assert_shows(text, messages, findings)
    assert sorted(coach_temp.glob(RECORD_GLOB)) == [], "a missing session_id must write no record"


def test_run_writes_a_session_id_with_parent_parts_inside_the_temp_folder_only(
    runner, tmp_path, coach_temp
):
    repo, new = _crowded_case(tmp_path)
    before = _files_outside(tmp_path, repo, coach_temp)
    code, _text = runner.run(str(new), "../../outside/escape")
    assert code == 1, f"expected a message for the new file, got code {code}"
    records = sorted(coach_temp.glob(RECORD_GLOB))
    assert len(records) == 1, f"expected one record in the temp folder, got {records!r}"
    after = _files_outside(tmp_path, repo, coach_temp)
    assert after == before, f"the run wrote outside the temp folder: {sorted(after - before)!r}"


@pytest.mark.parametrize("content", BAD_RECORDS)
def test_run_treats_a_bad_record_as_empty_and_does_not_raise(
    runner, signals, tmp_path, coach_temp, content
):
    repo, new = _crowded_case(tmp_path)
    messages = _messages()
    (coach_temp / "cobuilder-coach-bad-record.json").write_text(content, encoding="utf-8")
    code, text = runner.run(str(new), "bad-record")
    assert code == 1, f"a bad record must count as empty, got code {code}"
    _assert_shows(text, messages, _findings(signals, repo, new))
    assert runner.run(str(new), "bad-record") == (0, ""), "the record was not written after the bad read"


# ---------------------------------------------------------------------------
# The finding keys of the session record (E2 B3)
# ---------------------------------------------------------------------------


def test_run_keys_a_crowded_folder_once_per_folder(runner, signals, tmp_path, coach_temp):
    repo, first = _crowded_case(tmp_path)
    messages = _messages()
    code, text = runner.run(str(first), "folder-key")
    assert code == 1, f"expected a message for the first new file, got code {code}"
    _assert_shows(text, messages, _findings(signals, repo, first))
    assert "crowded-folder|src/pkg" in _record_keys(coach_temp, "folder-key")
    second = _write(repo, "src/pkg/new_other.py")
    assert runner.run(str(second), "folder-key") == (0, ""), (
        "a second new file in the same crowded folder repeated the folder"
    )


def test_run_keys_a_name_stem_cluster_by_folder_and_stem(runner, signals, tmp_path, coach_temp):
    repo, first = _cluster_case(tmp_path)
    messages = _messages()
    code, text = runner.run(str(first), "stem-key")
    assert code == 1, f"expected a message for the first new file, got code {code}"
    _assert_shows(text, messages, _findings(signals, repo, first))
    assert "name-stem-cluster|services|billing" in _record_keys(coach_temp, "stem-key")
    second = _write(repo, "services/billing_fee.py")
    assert runner.run(str(second), "stem-key") == (0, ""), (
        "a second file with the same stem in the same folder repeated the cluster"
    )


def test_run_keys_a_generic_name_by_its_path(runner, signals, tmp_path, coach_temp):
    repo = _committed_repo(tmp_path, {"src/keep.py": "KEEP = 1\n"})
    utils = _write(repo, "src/utils.py")
    helpers = _write(repo, "src/helpers.py")
    messages = _messages()
    code, text = runner.run(str(utils), "generic-key")
    assert code == 1, f"expected a message for utils.py, got code {code}"
    _assert_shows(text, messages, _findings(signals, repo, utils))
    code, text = runner.run(str(helpers), "generic-key")
    assert code == 1, f"a second generic name must still show, got code {code}"
    _assert_shows(text, messages, _findings(signals, repo, helpers))
    for finding in _findings(signals, repo, utils):
        assert _body(messages, finding) not in text, "the first generic name repeated"
    keys = _record_keys(coach_temp, "generic-key")
    assert {"generic-name|src/utils.py", "generic-name|src/helpers.py"} <= set(keys)
    assert runner.run(str(utils), "generic-key") == (0, ""), "the same generic path repeated"


def test_run_keys_a_boundary_edge_by_path_and_context(runner, signals, tmp_path, coach_temp):
    repo, new = _boundary_case(tmp_path)
    messages = _messages()
    code, text = runner.run(str(new), "edge-key")
    assert code == 1, f"expected a message for the boundary edge, got code {code}"
    _assert_shows(text, messages, _findings(signals, repo, new))
    assert "boundary-edge|orders/checkout.py|shipping" in _record_keys(coach_temp, "edge-key")
    assert runner.run(str(new), "edge-key") == (0, ""), "the same boundary edge repeated"


# ---------------------------------------------------------------------------
# The render rule for a fact that is missing, None, or empty, on real folders
# ---------------------------------------------------------------------------


def test_run_renders_no_name_family_and_no_group_as_none(runner, signals, tmp_path):
    repo = _committed_repo(tmp_path, {
        f"flat/{word}_part.py": "X = 1\n" for word in FLAT_WORDS[:20]
    })
    new = _write(repo, f"flat/{FLAT_WORDS[20]}_part.py")
    messages = _messages()
    findings = _findings(signals, repo, new)
    assert findings and findings[0].facts.get("families") == "", (
        "the flat folder must give an empty name family"
    )
    code, text = runner.run(str(new), None)
    assert code == 1, f"expected a message for the flat folder, got code {code}"
    _assert_shows(text, messages, findings)


def test_run_renders_the_groups_of_a_folder_over_the_parse_cap_as_none(runner, signals, tmp_path):
    repo = _committed_repo(tmp_path, {
        f"big/mod_{index:02d}.py": "X = 1\n" for index in range(61)
    })
    new = _write(repo, "big/new_module.py")
    messages = _messages()
    findings = _findings(signals, repo, new)
    assert findings and "components" not in findings[0].facts, (
        "a folder over the parse cap must give no groups fact"
    )
    code, text = runner.run(str(new), None)
    assert code == 1, f"expected a message for the large folder, got code {code}"
    _assert_shows(text, messages, findings)


def test_run_outside_a_git_repo_gives_no_text_and_does_not_raise(runner, tmp_path, monkeypatch):
    monkeypatch.setenv("GIT_CEILING_DIRECTORIES", str(tmp_path))
    loose = tmp_path / "loose"
    loose.mkdir()
    target = _write(loose, "a.py")
    assert runner.run(str(target), "outside-git") == (0, "")
