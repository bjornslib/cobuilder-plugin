"""Slice 5 of structure-coaching: the install writes the default config.

The cobuilder-setup skill writes .cobuilder/structure-signals.json after the
engineer approves it. The coach reads that file on the next GREEN write.
These cases check the script output, a real coach run, the skill references,
and the plugin versions. They do not check the wording of the skill.
"""
from __future__ import annotations

import dataclasses
import importlib.util
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from types import ModuleType

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
STRUCTURE_SIGNALS_PATH = REPO_ROOT / "shared" / "structure_signals.py"
HABIT_COACH_PATH = REPO_ROOT / "plugins" / "implement" / "scripts" / "habit_coach.py"
LIFECYCLE_PLUGIN = REPO_ROOT / "plugins" / "cobuilder-full-lifecycle"
SETUP_SKILL_PATH = LIFECYCLE_PLUGIN / "skills" / "cobuilder-setup" / "SKILL.md"
CONFIG_REL = Path(".cobuilder") / "structure-signals.json"
OLD_COMMIT = "777ab1fc89836cbc88ec207084a4f3142ca6575a"
COMMIT_OPTIONS = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")
FOLDER = "src/ledger"
COMMITTED_NAMES = [
    "ledger.py", "quota.py", "router.py", "tariff.py",
    "vendor.py", "zone.py", "basin.py", "cargo.py",
]
NEW_NAME = "lantern.py"
CHANGED_LIMIT = 7


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_signals() -> ModuleType:
    """Import shared/structure_signals.py as a module."""
    assert STRUCTURE_SIGNALS_PATH.exists(), f"missing {STRUCTURE_SIGNALS_PATH}"
    spec = importlib.util.spec_from_file_location("structure_signals_install", STRUCTURE_SIGNALS_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _run_defaults() -> str:
    """Return the text that structure_signals.py --defaults prints."""
    proc = subprocess.run(
        [sys.executable, str(STRUCTURE_SIGNALS_PATH), "--defaults"],
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert proc.returncode == 0, f"--defaults exited {proc.returncode}: {proc.stderr!r}"
    return proc.stdout


def _write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


def _committed_repo(tmp_path: Path) -> Path:
    """Return a git repo whose FOLDER holds COMMITTED_NAMES in one commit."""
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True, capture_output=True)
    for name in COMMITTED_NAMES:
        _write(repo / FOLDER / name, "x = 1\n")
    _git(repo, "add", "-A")
    _git(repo, *COMMIT_OPTIONS, "commit", "-q", "-m", "base")
    return repo.resolve()


def _clean_habit_hooks(tmp_path: Path) -> Path:
    """Return a folder with a habit-hooks stub that prints a blank line and exits 0."""
    bin_dir = tmp_path / "clean-bin"
    bin_dir.mkdir()
    stub = bin_dir / "habit-hooks"
    stub.write_text("#!/bin/sh\nprintf '%s\\n' ''\nexit 0\n")
    stub.chmod(0o755)
    return bin_dir


def _coach(repo: Path, bin_dir: Path, path: Path) -> subprocess.CompletedProcess:
    """Run habit_coach.py the way the hook does, for one GREEN write of path."""
    env = dict(os.environ)
    env["PATH"] = f"{bin_dir}{os.pathsep}{os.environ.get('PATH', '')}"
    payload = {
        "agent_type": "implement:green",
        "tool_name": "Write",
        "tool_input": {"file_path": str(path)},
    }
    return subprocess.run(
        [sys.executable, str(HABIT_COACH_PATH)],
        cwd=str(repo),
        env=env,
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        timeout=60,
    )


def _context(stdout: str) -> str:
    assert stdout.strip(), "expected a coach message on stdout, got nothing"
    return json.loads(stdout.strip())["hookSpecificOutput"]["additionalContext"]


def _numbers(text: str, repo: Path) -> set[int]:
    """Return the integers in text. The temp path of the repo has digits, so it goes first."""
    return {int(found) for found in re.findall(r"\d+", text.replace(str(repo), ""))}


# ---------------------------------------------------------------------------
# Case 1: the output of --defaults is a config that load_config reads
# ---------------------------------------------------------------------------


def test_defaults_written_to_the_config_path_load_with_no_problem_and_default_fields(tmp_path):
    repo = _committed_repo(tmp_path)
    _write(repo / CONFIG_REL, _run_defaults())
    signals = _load_signals()

    loaded = signals.load_config(repo)

    assert loaded.problem is None, f"the config read with a problem note: {loaded.problem!r}"
    default = signals.Config()
    for field in dataclasses.fields(signals.Config):
        got = getattr(loaded, field.name)
        want = getattr(default, field.name)
        assert got == want, f"field {field.name!r} is {got!r}, the default is {want!r}"


# ---------------------------------------------------------------------------
# Case 2: the next GREEN write reads the installed config
# ---------------------------------------------------------------------------


def test_next_green_write_uses_the_folder_limit_from_the_installed_config(tmp_path):
    repo = _committed_repo(tmp_path)
    new = _write(repo / FOLDER / NEW_NAME, "x = 1\n")
    bin_dir = _clean_habit_hooks(tmp_path)
    count = len(COMMITTED_NAMES) + 1

    before = _coach(repo, bin_dir, new)
    assert before.returncode == 0, f"stdout={before.stdout!r} stderr={before.stderr!r}"
    assert before.stdout.strip() == "", "control: the default limit must not flag nine files"

    config = json.loads(_run_defaults())
    config["folder_limit"] = CHANGED_LIMIT
    _write(repo / CONFIG_REL, json.dumps(config, indent=2))

    after = _coach(repo, bin_dir, new)
    assert after.returncode == 0, f"stdout={after.stdout!r} stderr={after.stderr!r}"
    context = _context(after.stdout)
    assert FOLDER in context, f"the message does not name the folder: {context!r}"
    numbers = _numbers(context, repo)
    assert {CHANGED_LIMIT, count} <= numbers, (
        f"expected the limit {CHANGED_LIMIT} and the count {count} in the message: {context!r}"
    )


# ---------------------------------------------------------------------------
# Case 3: the cobuilder-setup skill names the script, its flags, and the config
# ---------------------------------------------------------------------------


def _setup_text() -> str:
    assert SETUP_SKILL_PATH.exists(), f"missing {SETUP_SKILL_PATH}"
    return SETUP_SKILL_PATH.read_text(encoding="utf-8")


def test_setup_skill_names_the_script_both_flags_and_the_config_path():
    text = _setup_text()
    for needle in ("structure_signals.py", "--defaults", "--survey", ".cobuilder/structure-signals.json"):
        assert needle in text, f"cobuilder-setup SKILL.md does not name {needle!r}"


def test_setup_skill_script_path_resolves_to_the_real_script_under_the_plugin():
    refs = re.findall(
        r'\$\{CLAUDE_PLUGIN_ROOT\}/(shared/[^\s`"()<>]*structure_signals\.py)',
        _setup_text(),
    )
    assert refs, "cobuilder-setup SKILL.md names no ${CLAUDE_PLUGIN_ROOT}/shared/.../structure_signals.py path"
    real_script = (REPO_ROOT / "shared" / "structure_signals.py").resolve()
    for rel in refs:
        resolved = (LIFECYCLE_PLUGIN / rel).resolve()
        assert resolved.is_file(), f"{rel} is not a file under the cobuilder-full-lifecycle plugin"
        assert resolved == real_script, f"{rel} resolves to {resolved}, not {real_script}"


# ---------------------------------------------------------------------------
# Case 4: the skill holds no second copy of the defaults
# ---------------------------------------------------------------------------


def test_setup_skill_holds_no_second_copy_of_the_default_names_or_globs():
    text = _setup_text()
    assert "structure_signals.py" in text and "--defaults" in text, (
        "the skill must name the defaults script first, or this check proves nothing"
    )
    defaults = _load_signals().Config()
    # An angle-bracket placeholder, such as <base>, is not a copy of a default name.
    prose = re.sub(r"<[^<>\n]*>", " ", text)
    for name in sorted(defaults.generic_names):
        assert not re.search(rf"(?<![\w-]){re.escape(name)}(?![\w-])", prose), (
            f"the skill holds the default generic name {name!r}"
        )
    for glob in defaults.excluded_paths:
        assert glob not in text, f"the skill holds the default excluded path {glob!r}"


# ---------------------------------------------------------------------------
# Case 5: the plugin versions are past 777ab1f and match the marketplace
# ---------------------------------------------------------------------------


def _at_old_commit(rel: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "show", f"{OLD_COMMIT}:{rel}"],
        capture_output=True,
        text=True,
        check=True,
    )
    return proc.stdout


def _market_version(text: str, name: str) -> str:
    entries = json.loads(text)["plugins"]
    return next(entry["version"] for entry in entries if entry["name"] == name)


def _semver(version: str) -> tuple[int, ...]:
    assert re.fullmatch(r"\d+\.\d+\.\d+", version), f"not MAJOR.MINOR.PATCH: {version!r}"
    return tuple(int(part) for part in version.split("."))


@pytest.mark.parametrize("name", ["implement", "cobuilder-full-lifecycle"])
def test_plugin_and_marketplace_versions_are_bumped_past_777ab1f(name):
    manifest = f"plugins/{name}/.claude-plugin/plugin.json"
    market = ".claude-plugin/marketplace.json"
    now = json.loads((REPO_ROOT / manifest).read_text(encoding="utf-8"))["version"]
    then = json.loads(_at_old_commit(manifest))["version"]
    market_now = _market_version((REPO_ROOT / market).read_text(encoding="utf-8"), name)
    market_then = _market_version(_at_old_commit(market), name)

    assert _semver(now) > _semver(then), f"{name} plugin.json is still {now}, as at 777ab1f"
    assert _semver(market_now) > _semver(market_then), (
        f"{name} marketplace entry is still {market_now}, as at 777ab1f"
    )


@pytest.mark.parametrize("name", ["implement", "cobuilder-full-lifecycle"])
def test_plugin_json_and_marketplace_versions_match(name):
    manifest = f"plugins/{name}/.claude-plugin/plugin.json"
    market = ".claude-plugin/marketplace.json"
    now = json.loads((REPO_ROOT / manifest).read_text(encoding="utf-8"))["version"]
    market_now = _market_version((REPO_ROOT / market).read_text(encoding="utf-8"), name)

    assert now == market_now, f"{name}: plugin.json has {now}, marketplace.json has {market_now}"
