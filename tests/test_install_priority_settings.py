"""The umbrella install writes the reader settings when cobuilder-priority is installed (slice E1.5).

The script runs as a subprocess, the way the install step runs it. Each test works in tmp_path.
The checks read the JSON that the script prints and the settings file that it writes.

Run with: uv run pytest tests/test_install_priority_settings.py -q
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "plugins/cobuilder-full-lifecycle/scripts/priority_settings.py"
SKILL = ROOT / "plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/SKILL.md"
KEY = "cobuilder-priority@cobuilder-plugin"
PROGRAM = "probes/programs/gepa-armC3s-seeded-budget5-seed7.json"
OTHER_KEY = "other@cobuilder-plugin"


def base_settings() -> dict:
    """A settings file with unrelated keys and one other plugin entry."""
    return {
        "model": "opus",
        "env": {"FOO": "bar"},
        "pluginConfigs": {OTHER_KEY: {"options": {"keep": True}}},
    }


def expected_options(priority_dev: Path) -> dict:
    """The three fields that the install writes."""
    return {
        "priority_dev_dir": str(priority_dev),
        "program": PROGRAM,
        "timeout_seconds": 180,
    }


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def make_priority_dev(tmp_path: Path) -> Path:
    """A priority-dev checkout that holds the program file."""
    root = tmp_path / "priority-dev"
    program = root / PROGRAM
    program.parent.mkdir(parents=True, exist_ok=True)
    program.write_text('{"name": "gepa-armC3s"}\n', encoding="utf-8")
    return root


def make_installed(tmp_path: Path, *, with_priority: bool) -> Path:
    """An installed_plugins.json file, with or without cobuilder-priority."""
    plugins = {
        "architect@cobuilder-plugin": [
            {"scope": "project", "installPath": "/x/architect", "version": "0.1.0"}
        ],
    }
    if with_priority:
        plugins[KEY] = [
            {"scope": "user", "installPath": "/x/priority", "version": "0.1.0"}
        ]
    path = tmp_path / "installed_plugins.json"
    write_json(path, {"version": 2, "plugins": plugins})
    return path


def run_script(settings: Path, installed: Path, priority_dev: Path | None, *, write: bool = False):
    """Run the install script with uv. Dry run unless write is True."""
    assert SCRIPT.is_file(), f"missing {SCRIPT.relative_to(ROOT)}"
    cmd = [
        "uv", "run", str(SCRIPT),
        "--settings", str(settings),
        "--installed-plugins", str(installed),
    ]
    if priority_dev is not None:
        cmd += ["--priority-dev-dir", str(priority_dev)]
    if write:
        cmd.append("--write")
    return subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT, timeout=120)


def test_absent_plugin_writes_nothing(tmp_path):
    """With the plugin absent, the step reports absent and keeps the settings bytes."""
    priority_dev = make_priority_dev(tmp_path)
    settings = tmp_path / "settings.json"
    write_json(settings, base_settings())
    installed = make_installed(tmp_path, with_priority=False)
    before = settings.read_bytes()

    proc = run_script(settings, installed, priority_dev, write=True)

    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout)
    assert out["status"] == "absent"
    assert out["key"] == KEY
    assert settings.read_bytes() == before


def test_dry_run_plans_the_change_and_writes_nothing(tmp_path):
    """A dry run prints the planned options and keeps the settings bytes."""
    priority_dev = make_priority_dev(tmp_path)
    settings = tmp_path / "settings.json"
    write_json(settings, base_settings())
    installed = make_installed(tmp_path, with_priority=True)
    before = settings.read_bytes()

    proc = run_script(settings, installed, priority_dev)

    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout)
    assert out["status"] == "planned"
    assert out["key"] == KEY
    assert out["options"] == expected_options(priority_dev)
    assert settings.read_bytes() == before


def test_write_sets_three_fields_and_keeps_other_keys(tmp_path):
    """A write sets the three fields, keeps the other keys, and adds no llm_api_key."""
    priority_dev = make_priority_dev(tmp_path)
    settings = tmp_path / "settings.json"
    write_json(settings, base_settings())
    installed = make_installed(tmp_path, with_priority=True)

    proc = run_script(settings, installed, priority_dev, write=True)

    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout)
    assert out["status"] == "written"
    data = json.loads(settings.read_text(encoding="utf-8"))
    options = data["pluginConfigs"][KEY]["options"]
    assert options == expected_options(priority_dev)
    assert "llm_api_key" not in options
    assert data["model"] == "opus"
    assert data["env"] == {"FOO": "bar"}
    assert data["pluginConfigs"][OTHER_KEY] == {"options": {"keep": True}}


def test_second_write_changes_nothing(tmp_path):
    """A second write reports unchanged and keeps the settings bytes."""
    priority_dev = make_priority_dev(tmp_path)
    settings = tmp_path / "settings.json"
    write_json(settings, base_settings())
    installed = make_installed(tmp_path, with_priority=True)
    first = run_script(settings, installed, priority_dev, write=True)
    assert first.returncode == 0, first.stderr
    after_first = settings.read_bytes()

    proc = run_script(settings, installed, priority_dev, write=True)

    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout)
    assert out["status"] == "unchanged"
    assert settings.read_bytes() == after_first


def test_write_keeps_existing_api_key(tmp_path):
    """An llm_api_key already in the options survives the write."""
    priority_dev = make_priority_dev(tmp_path)
    settings = tmp_path / "settings.json"
    settings_data = base_settings()
    settings_data["pluginConfigs"][KEY] = {
        "options": {
            "llm_api_key": "test-key-kept",
            "priority_dev_dir": "/old/checkout",
            "timeout_seconds": 60,
        }
    }
    write_json(settings, settings_data)
    installed = make_installed(tmp_path, with_priority=True)

    proc = run_script(settings, installed, priority_dev, write=True)

    assert proc.returncode == 0, proc.stderr
    data = json.loads(settings.read_text(encoding="utf-8"))
    assert data["pluginConfigs"][KEY]["options"] == {
        **expected_options(priority_dev),
        "llm_api_key": "test-key-kept",
    }


@pytest.mark.parametrize("case", ["dir_missing", "program_missing"])
def test_bad_priority_dev_dir_exits_2_and_writes_nothing(tmp_path, case):
    """A priority-dev dir that is missing, or lacks the program file, exits 2 and writes nothing."""
    if case == "dir_missing":
        priority_dev = tmp_path / "no-such-checkout"
    else:
        priority_dev = tmp_path / "empty-checkout"
        priority_dev.mkdir()
    settings = tmp_path / "settings.json"
    write_json(settings, base_settings())
    installed = make_installed(tmp_path, with_priority=True)
    before = settings.read_bytes()

    proc = run_script(settings, installed, priority_dev, write=True)

    assert proc.returncode == 2, f"expected exit 2, got {proc.returncode}"
    assert proc.stderr.strip(), "expected a message on stderr"
    assert settings.read_bytes() == before


def test_write_creates_missing_settings_file(tmp_path):
    """A write creates a settings file that does not exist, with only pluginConfigs."""
    priority_dev = make_priority_dev(tmp_path)
    settings = tmp_path / "settings.json"
    assert not settings.exists()
    installed = make_installed(tmp_path, with_priority=True)

    proc = run_script(settings, installed, priority_dev, write=True)

    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout)
    assert out["status"] == "written"
    assert settings.is_file()
    data = json.loads(settings.read_text(encoding="utf-8"))
    assert set(data) == {"pluginConfigs"}
    assert set(data["pluginConfigs"]) == {KEY}
    assert data["pluginConfigs"][KEY]["options"] == expected_options(priority_dev)


def test_setup_skill_names_the_script():
    """The setup skill names the install script by its file name."""
    assert SKILL.is_file(), f"missing {SKILL.relative_to(ROOT)}"
    text = SKILL.read_text(encoding="utf-8")
    assert "priority_settings.py" in text, "the setup skill never names priority_settings.py"


def test_absent_plugin_needs_no_priority_dev_dir(tmp_path):
    """With the plugin absent, the step reports absent before it asks for a priority-dev dir."""
    settings = tmp_path / "settings.json"
    installed = make_installed(tmp_path, with_priority=False)

    proc = run_script(settings, installed, None)

    assert proc.returncode == 0, proc.stderr
    assert json.loads(proc.stdout)["status"] == "absent"
    assert not settings.exists()


def test_installed_plugin_without_priority_dev_dir_exits_2(tmp_path):
    """With the plugin installed and no priority-dev dir, the step stops and writes nothing."""
    settings = tmp_path / "settings.json"
    installed = make_installed(tmp_path, with_priority=True)

    proc = run_script(settings, installed, None, write=True)

    assert proc.returncode == 2
    assert "--priority-dev-dir" in proc.stderr
    assert not settings.exists()


@pytest.mark.parametrize("content", ["null", '{"pluginConfigs": {"cobuilder-priority@cobuilder-plugin": {"options": null}}}'])
def test_settings_that_are_not_objects_fail_cleanly(tmp_path, content):
    """A settings file that is not a JSON object gives exit 1 and a message, not a traceback."""
    priority_dev = make_priority_dev(tmp_path)
    settings = tmp_path / "settings.json"
    settings.write_text(content, encoding="utf-8")
    installed = make_installed(tmp_path, with_priority=True)

    proc = run_script(settings, installed, priority_dev, write=True)

    assert proc.returncode == 1
    assert "Traceback" not in proc.stderr
    assert settings.read_text(encoding="utf-8") == content
