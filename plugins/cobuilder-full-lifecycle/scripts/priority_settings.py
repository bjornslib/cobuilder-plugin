#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Set the cobuilder-priority reader options in the user settings.

The script reads the installed-plugins file first. When cobuilder-priority is
absent, it prints status "absent" and writes nothing. Otherwise it checks the
priority-dev checkout, and it plans three options: priority_dev_dir, program,
and timeout_seconds. It writes only with --write, and only when a value changes.
It never adds or changes llm_api_key.

Prints one JSON object with a status of absent, planned, unchanged, or written.
Exits with:
- 0 for every status above
- 1 when the settings file is not a JSON object
- 2 when the plugin is installed and the priority-dev dir is not given, is
  missing, or has no program file

Usage:
    uv run priority_settings.py --settings ~/.claude/settings.json \\
        --installed-plugins ~/.claude/plugins/installed_plugins.json \\
        [--priority-dev-dir <path>] [--write]
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any, NoReturn

KEY = "cobuilder-priority@cobuilder-plugin"
PROGRAM = "probes/programs/gepa-armC3s-seeded-budget5-seed7.json"
TIMEOUT_SECONDS = 180


def fail(message: str, code: int) -> NoReturn:
    print(message, file=sys.stderr)
    sys.exit(code)


def expanded(value: str) -> Path:
    return Path(value).expanduser()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--settings", required=True, type=expanded, help="The user settings file")
    parser.add_argument("--installed-plugins", required=True, type=expanded, help="The installed-plugins file")
    parser.add_argument("--priority-dev-dir", type=expanded, help="A priority-dev checkout. Needed only when the plugin is installed.")
    parser.add_argument("--write", action="store_true", help="Write the change. Without it, the run is a dry run.")
    return parser.parse_args()


def read_json(path: Path, default: dict) -> dict:
    """Return the JSON object at path, or default when the file is missing."""
    if not path.is_file():
        return default
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"{path} is not valid JSON: {exc}", 1)
    if not isinstance(data, dict):
        fail(f"{path} is not a JSON object", 1)
    return data


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def is_installed(installed_path: Path) -> bool:
    return KEY in read_json(installed_path, {}).get("plugins", {})


def check_priority_dev(priority_dev: Path | None) -> Path:
    if priority_dev is None:
        fail("cobuilder-priority is installed: give --priority-dev-dir", 2)
    priority_dev = priority_dev.absolute()
    if not (priority_dev / PROGRAM).is_file():
        fail(f"{priority_dev} is not a priority-dev checkout: {PROGRAM} is missing", 2)
    return priority_dev


def planned_options(priority_dev: Path) -> dict:
    return {
        "priority_dev_dir": str(priority_dev),
        "program": PROGRAM,
        "timeout_seconds": TIMEOUT_SECONDS,
    }


def emit(status: str, options: dict | None = None) -> None:
    payload: dict[str, Any] = {"status": status, "key": KEY}
    if options is not None:
        payload["options"] = options
    print(json.dumps(payload, indent=2))


def main() -> None:
    args = parse_args()
    if not is_installed(args.installed_plugins):
        emit("absent")
        return

    priority_dev = check_priority_dev(args.priority_dev_dir)
    wanted = planned_options(priority_dev)
    settings = read_json(args.settings, {})
    entry = settings.setdefault("pluginConfigs", {}).setdefault(KEY, {})
    current = entry.get("options", {})
    if not isinstance(current, dict):
        fail(f"{args.settings}: the options of {KEY} are not a JSON object", 1)

    if all(current.get(name) == value for name, value in wanted.items()):
        emit("unchanged", wanted)
        return
    if not args.write:
        emit("planned", wanted)
        return

    entry["options"] = {**current, **wanted}
    write_json(args.settings, settings)
    emit("written", wanted)


if __name__ == "__main__":
    main()
