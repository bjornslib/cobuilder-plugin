"""CLI contract for shared/tracker.py: a read never opens the live plans.

A spy audit hook records each file that the command opens.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

import _tracker_cli_support as support

TRACKER_CLI = support.TRACKER_CLI
CORPUS_DIR = support.FIXTURES / "corpus"
PLANS_DIR = support.FIXTURES / "plans"
_cfg = support.fake_config
_cli = support.cli
_payload = support.ok


SPY_SOURCE = '''
import json
import runpy
import sys

opened = []
sys.addaudithook(lambda event, args: opened.append(str(args[0])) if event == "open" else None)
cli, out, *rest = sys.argv[1:]
sys.path.insert(0, cli.rsplit("/", 1)[0])
sys.argv = [cli, *rest]
code = 0
try:
    runpy.run_path(cli, run_name="__main__")
except SystemExit as exc:
    code = exc.code if isinstance(exc.code, int) else 1
finally:
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(opened, handle)
sys.exit(code)
'''


def _spy_opens(tmp_path: Path, config: Path, *argv: str) -> list[str]:
    # The spy records every file the CLI opens, then the test reads that list.
    spy = tmp_path / "spy.py"
    spy.write_text(SPY_SOURCE, encoding="utf-8")
    out = tmp_path / "opens.json"
    result = subprocess.run(
        ["uv", "run", "python", str(spy), str(TRACKER_CLI), str(out), "--config", str(config), *argv],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(out.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "argv",
    [["list-programs"], ["next-ready", "--kind", "slice", "--under", "demo-E1"]],
    ids=["list-programs", "next-ready"],
)
def test_read_path_never_opens_docs_plans(tmp_path: Path, argv: list[str]) -> None:
    opens = _spy_opens(tmp_path, _cfg(tmp_path), *argv)
    assert any("corpus" in path for path in opens), "the fake adapter reads the corpus"
    assert [path for path in opens if "docs/plans" in path] == []
