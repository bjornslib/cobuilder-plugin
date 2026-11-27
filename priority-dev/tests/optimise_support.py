"""Helpers for the slice 18 RED tests: the optimiser comparison.

Every session, label, brief, and optimiser run here is made up or
stubbed. No helper makes a model call and none reads real text.
"""
from __future__ import annotations

import contextlib
import importlib
import importlib.util
import io
import json
import sys
from pathlib import Path

import pytest

from eval_support import write_eval_world
from probe_support import PRIORITY_DEV

if str(PRIORITY_DEV / "src") not in sys.path:
    sys.path.insert(0, str(PRIORITY_DEV / "src"))

OPTIMISERS = ("gepa", "miprov2", "bootstrap")
OPTIMISE_MODULES = (
    "priority.optimisation",
    "priority.evaluation.optimise",
    "priority.optimise",
)
CLASS_BY_OPTIMISER = {
    "gepa": "GEPA",
    "miprov2": "MIPROv2",
    "bootstrap": "BootstrapFewShot",
}

BUDGET = 5
SEED = 7

REPORT_RELATIVE = Path("probes") / "optimiser-report.md"


def require(module: str):
    """Import the module, or fail on an assertion when it does not exist yet."""
    try:
        found = importlib.util.find_spec(module)
    except ModuleNotFoundError:
        found = None
    assert found is not None, f"the module {module} does not exist yet"
    return importlib.import_module(module)


def require_optimise():
    """The optimise module under any accepted name, or an assertion failure."""
    for name in OPTIMISE_MODULES:
        try:
            found = importlib.util.find_spec(name)
        except ModuleNotFoundError:
            found = None
        if found is not None:
            return importlib.import_module(name)
    tried = ", ".join(OPTIMISE_MODULES)
    assert False, f"no optimise module exists yet (tried {tried})"


def teleprompter_available(optimiser: str) -> bool:
    """Whether the dspy teleprompter for one optimiser imports. Import only."""
    try:
        module = importlib.import_module("dspy.teleprompt")
    except ImportError:
        return False
    return hasattr(module, CLASS_BY_OPTIMISER[optimiser])


def require_teleprompter(optimiser: str) -> None:
    """Skip the test when the teleprompter import is missing. Never fail."""
    if not teleprompter_available(optimiser):
        pytest.skip(f"dspy has no {CLASS_BY_OPTIMISER[optimiser]} teleprompter here")


def optuna_available() -> bool:
    """Whether the optuna extra is present. Import check only, no install."""
    return importlib.util.find_spec("optuna") is not None


class StubCompiledProgram:
    """Stand in for a compiled interpreter. It saves made-up JSON."""

    def __init__(self, optimiser: str, seed: int) -> None:
        self.optimiser = optimiser
        self.seed = seed

    def save(self, path) -> str:
        """Write the stub program JSON and return its path."""
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(
            json.dumps(
                {"optimiser": self.optimiser, "seed": self.seed, "made_up": True},
                indent=2,
            )
            + "\n"
        )
        return str(target)


class StubTeleprompter:
    """Stand in for a dspy teleprompter. It records settings and inputs."""

    def __init__(self, optimiser: str, registry: list, **settings) -> None:
        self.optimiser = optimiser
        self.registry = registry
        self.settings = settings
        registry.append({"settings": dict(settings), "inputs": []})

    def compile(self, *args, **kwargs):
        """Record one compile call and return a stub compiled program."""
        self.registry[-1]["inputs"].append({"args": args, "kwargs": kwargs})
        seed = self.settings.get("seed", SEED)
        return StubCompiledProgram(self.optimiser, seed)


def install_stub_teleprompters(monkeypatch) -> dict:
    """Replace each dspy teleprompter with a stub factory. Return the calls."""
    import dspy
    import dspy.teleprompt as teleprompt

    calls: dict = {name: [] for name in OPTIMISERS}
    for optimiser in OPTIMISERS:
        class_name = CLASS_BY_OPTIMISER[optimiser]

        def factory(*args, _name=optimiser, **kwargs):
            return StubTeleprompter(_name, calls[_name], **kwargs)

        monkeypatch.setattr(teleprompt, class_name, factory)
        monkeypatch.setattr(dspy, class_name, factory, raising=False)
    return calls

def block_live_calls(monkeypatch) -> None:
    """Fail any test that reaches for the real model key."""
    config = require("priority.config")
    monkeypatch.setattr(
        config,
        "load_key",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            AssertionError("a test reached for the real key")
        ),
    )


def run_optimise(monkeypatch, tmp_path: Path, optimiser: str, extra_args=(),
                 break_teleprompter: str | None = None):
    """Run `priority optimise` in process with stub teleprompters.

    Return the exit code, the printed text, the split parts, the stub
    calls, and the world paths. The SystemExit guard covers the run
    before the `optimise` subcommand exists, so the tests fail on their
    assertions and not on the missing parser. The optional
    `extra_args` list appends CLI flags after the stated settings.
    When `break_teleprompter` names an optimiser, its teleprompter
    reads as missing, so the run must skip it with a clear message.
    """
    manifest_path, labels_path, real_dir, parts = write_eval_world(tmp_path)
    calls = install_stub_teleprompters(monkeypatch)
    block_live_calls(monkeypatch)
    if break_teleprompter is not None:
        import dspy.teleprompt as teleprompt

        monkeypatch.setattr(
            teleprompt, CLASS_BY_OPTIMISER[break_teleprompter], None
        )
    monkeypatch.chdir(tmp_path)
    from priority.cli import main

    argv = [
        "optimise",
        "--optimiser", optimiser,
        "--manifest", str(manifest_path),
        "--labels", str(labels_path),
        "--real-dir", str(real_dir),
        "--budget", str(BUDGET),
        "--seed", str(SEED),
        *extra_args,
    ]
    out = io.StringIO()
    code = None
    with contextlib.suppress(SystemExit):
        with contextlib.redirect_stdout(out):
            code = main(argv)
    return code, out.getvalue(), parts, calls, manifest_path, labels_path, real_dir


def input_blob(calls: dict, optimiser: str) -> str:
    """The recorded optimiser inputs as plain text for id searches."""
    return repr(calls.get(optimiser, []))


def read_report(tmp_path: Path) -> str:
    """The optimiser report text, or an assertion failure when missing."""
    path = tmp_path / REPORT_RELATIVE
    assert path.is_file(), f"optimise wrote no {REPORT_RELATIVE}"
    return path.read_text()


def saved_programs(tmp_path: Path, known=()) -> list:
    """Program files under the work folder, without the manifest inputs."""
    skip = {Path(path).resolve() for path in known}
    return sorted(
        path for path in tmp_path.rglob("*.json") if path.resolve() not in skip
    )


def run_eval_with_program(
    monkeypatch, manifest_path: Path, labels_path: Path, real_dir: Path, program
):
    """Run `priority eval` with one saved program and a stub interpreter."""
    from eval_support import StubInterpreter, metric_api, stub_predictions_for

    metric_api()
    interpreter = require("priority.interpreter")
    block_live_calls(monkeypatch)
    monkeypatch.setattr(
        interpreter,
        "Interpreter",
        lambda *args, **kwargs: StubInterpreter(
            stub_predictions_for(manifest_path, labels_path)
        ),
    )
    from priority.cli import main

    out = io.StringIO()
    code = None
    with contextlib.suppress(SystemExit):
        with contextlib.redirect_stdout(out):
            code = main(
                [
                    "eval",
                    "--split", "holdout",
                    "--manifest", str(manifest_path),
                    "--labels", str(labels_path),
                    "--real-dir", str(real_dir),
                    "--program", str(program),
                ]
            )
    return code, out.getvalue()
