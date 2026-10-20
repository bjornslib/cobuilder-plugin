# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6,<7"]
# ///
"""Command line port for workflow state. Each subcommand calls the configured tracker adapter.

Exit codes: 0 ok, 2 refused (no adapter, nothing written), 3 adapter error, 4 bad arguments.
Stdout always carries one JSON object. Failures also write one message to stderr.
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import sys
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from tracker_port.cli_operations import OPERATIONS
from tracker_port.config import require_adapter
from tracker_port.port import AdapterError, ArgumentError, NoAdapterError

EXIT_OK = 0
EXIT_REFUSED = 2
EXIT_ADAPTER = 3
EXIT_ARGUMENT = 4

DEFAULT_CONFIG = Path(".cobuilder") / "tracker.yaml"


def _fail(code: int, message: str) -> None:
    print(json.dumps({"ok": False, "exit": code, "error": message}, sort_keys=True))
    print(message, file=sys.stderr)
    sys.exit(code)


class _Parser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        _fail(EXIT_ARGUMENT, message)


def _to_json(value: Any) -> Any:
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return {f.name: _to_json(getattr(value, f.name)) for f in dataclasses.fields(value)}
    if isinstance(value, Mapping):
        return {key: _to_json(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_json(item) for item in value]
    return value


def _build_parser() -> argparse.ArgumentParser:
    parser = _Parser(prog="tracker.py", description="Read and write workflow state through the tracker port.")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG, help="path to tracker.yaml")
    parser.add_argument("--state-file", type=Path, help="state file for the fake adapter; overrides the config")
    subparsers = parser.add_subparsers(dest="operation", required=True, parser_class=_Parser)
    for name, (add_arguments, _call) in OPERATIONS.items():
        add_arguments(subparsers.add_parser(name))
    return parser


def main(argv: list[str] | None = None) -> int:
    namespace = _build_parser().parse_args(argv)
    _add_arguments, call = OPERATIONS[namespace.operation]
    try:
        adapter = require_adapter(namespace.config.resolve(), Path.cwd(), namespace.state_file)
        result = call(adapter, namespace)
    except NoAdapterError as exc:
        _fail(EXIT_REFUSED, str(exc))
    except ArgumentError as exc:
        _fail(EXIT_ARGUMENT, str(exc))
    except AdapterError as exc:
        _fail(EXIT_ADAPTER, str(exc))
    payload: dict[str, Any] = {"ok": True, "result": _to_json(result)}
    # A seed reports each plan it could not read. Other operations have no seed conflicts.
    seed_conflicts = getattr(adapter, "seed_conflicts", None)
    if seed_conflicts is not None:
        payload["conflicts"] = seed_conflicts
    print(json.dumps(payload, indent=2, sort_keys=True))
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
