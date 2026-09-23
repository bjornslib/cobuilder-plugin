"""Two builds of the viewer from one lockfile must write the same bytes.

Slice 2 of cobuilder-viewer/E2. The slice is a spike, and its evidence is a
measurement: two runs of `npm run build` in plugins/artifact/viewer/, and the
bytes each run writes. The guard slice 3 adds is only worth having while the
two runs agree, so the measurement comes first.

The claims pinned here are the slice's C1, C2, and C3:

1. two builds of one input produce identical bytes (C1)
2. the toolchain pins itself: a tracked lockfile and a declared Node version (C2)
3. the comparison can fail, and it names the first differing offset (C3)

Every case that shells out to npm carries a skip guard, so a checkout with no
Node still passes the suite. This repository's suite is Python, and none of its
other cases need Node.

Run with: uv run --with pytest pytest tests/test_viewer_build.py -v
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import warnings
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER = REPO_ROOT / "plugins" / "artifact" / "viewer"
VITE_CONFIG = VIEWER / "vite.config.ts"
PACKAGE_JSON = VIEWER / "package.json"
LOCKFILE = VIEWER / "package-lock.json"
NVMRC = VIEWER / ".nvmrc"
NODE_MODULES = VIEWER / "node_modules"
INDEX_HTML = VIEWER / "index.html"

BUILD_TIMEOUT_S = 600

# The nested run of this file sets this variable. The case that starts the
# nested run skips when it sees the variable, which stops the run recursing.
NESTED_PYTEST_ENV = "COBUILDER_VIEWER_BUILD_NESTED_RUN"


# ---- helpers ----

def missing_toolchain_reason() -> str | None:
    """Return why the build cannot run here, or None when it can.

    The two causes are named apart, so a skip says which one fired.
    """
    if shutil.which("npm") is None:
        return "npm is not on PATH, so the viewer build cannot run"
    if not NODE_MODULES.is_dir():
        return (
            f"{NODE_MODULES.relative_to(REPO_ROOT).as_posix()} is absent, so the "
            "viewer build cannot run. Run `npm ci` in that directory first."
        )
    return None


TOOLCHAIN_SKIP_REASON = (
    "npm or node_modules is absent, so the viewer build cannot run here"
)


def needs_npm(case):
    """Mark a case as one that shells out to npm, and guard it.

    Both the marker and the reason are read back by
    test_every_build_case_carries_the_skip_guard, so a future build case
    cannot ship without its guard.
    """
    case._needs_npm = True
    case._skip_reason = missing_toolchain_reason() or TOOLCHAIN_SKIP_REASON
    return pytest.mark.skipif(
        missing_toolchain_reason() is not None,
        reason=case._skip_reason,
    )(case)


def config_value(name: str, default: str) -> str:
    """Read a quoted string value from vite.config.ts.

    A plain read, not an import: this file never runs the config.
    """
    text = VITE_CONFIG.read_text(encoding="utf-8")
    match = re.search(rf"\b{name}\s*:\s*[\"']([^\"']+)[\"']", text)
    return match.group(1) if match else default


def build_output_file() -> Path:
    """Return the file the build writes.

    Vite resolves `build.outDir` against `root`, and `root` is `src`. Read the
    two values, so this file follows the output when slice 3 moves it to the
    plugin root.
    """
    root = config_value("root", "src")
    out_dir = config_value("outDir", "../dist")
    return (VIEWER / root / out_dir / "index.html").resolve()


def run_build() -> bytes:
    """Run the viewer build once and return the bytes it wrote."""
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=VIEWER,
        capture_output=True,
        text=True,
        timeout=BUILD_TIMEOUT_S,
    )
    assert result.returncode == 0, (
        f"npm run build failed with code {result.returncode}\n"
        f"--- stdout (tail) ---\n{result.stdout[-4000:]}\n"
        f"--- stderr (tail) ---\n{result.stderr[-4000:]}"
    )
    output = build_output_file()
    assert output.is_file(), (
        f"the build wrote no file at {output}. The build reads vite.config.ts's "
        "`build.outDir` against `root`."
    )
    return output.read_bytes()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def node_version() -> str:
    """Return the Node version that runs the build, or a dash when absent."""
    result = subprocess.run(
        ["node", "--version"], capture_output=True, text=True, timeout=60
    )
    return result.stdout.strip() or "unknown"


def describe(data: bytes) -> str:
    """One line of evidence: a byte count and a hash."""
    return f"{len(data)} bytes  sha256={sha256(data)}"


def first_difference(left: bytes, right: bytes) -> int | None:
    """Return the offset of the first differing byte, or None when equal.

    A length mismatch with a shared prefix reports the first offset past the
    shorter file, because that is where the two stop agreeing.
    """
    for offset, (one, other) in enumerate(zip(left, right)):
        if one != other:
            return offset
    if len(left) != len(right):
        return min(len(left), len(right))
    return None


# ---- 1. two builds produce the same bytes (C1) ----

@needs_npm
def test_two_builds_produce_the_same_bytes():
    """Build twice from one lockfile, and compare the two outputs.

    A difference means the byte-equal guard of slice 3 can never hold, and the
    message names the first offset where the two builds part.
    """
    first = run_build()
    second = run_build()
    offset = first_difference(first, second)

    warnings.warn(
        f"viewer build measurement: node {node_version()} | "
        f"build 1 {describe(first)} | "
        f"build 2 {describe(second)} | equal={offset is None}",
        UserWarning,
        stacklevel=1,
    )

    assert offset is None, (
        f"two builds of {build_output_file().relative_to(REPO_ROOT).as_posix()} "
        "differ, so a byte-equal guard cannot hold\n"
        f"  build 1: {describe(first)}\n"
        f"  build 2: {describe(second)}\n"
        f"  first differing offset: {offset}"
    )


# ---- 2. the toolchain is pinned and recorded (C2) ----

def test_the_toolchain_is_pinned_and_recorded():
    """The build pins its inputs: one lockfile, and one declared Node version.

    The files read here are plugins/artifact/viewer/package-lock.json,
    plugins/artifact/viewer/.nvmrc, and plugins/artifact/viewer/package.json.
    """
    assert LOCKFILE.is_file(), (
        "plugins/artifact/viewer/package-lock.json is absent. One lockfile is "
        "what fixes the dependencies two builds share."
    )
    tracked = subprocess.run(
        ["git", "ls-files", "--error-unmatch", LOCKFILE.relative_to(REPO_ROOT).as_posix()],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    assert tracked.returncode == 0, (
        "plugins/artifact/viewer/package-lock.json exists but git does not track "
        "it. A lockfile outside version control pins nothing."
    )

    locked = json.loads(LOCKFILE.read_text(encoding="utf-8"))
    assert locked.get("packages"), (
        "plugins/artifact/viewer/package-lock.json holds no resolved package map."
    )

    assert NVMRC.is_file(), (
        "plugins/artifact/viewer/.nvmrc is absent, so the Node version the build "
        "expects is unrecorded."
    )
    pinned = NVMRC.read_text(encoding="utf-8").strip()
    assert re.fullmatch(r"\d+(\.\d+){0,2}", pinned), (
        f"plugins/artifact/viewer/.nvmrc reads {pinned!r}, which names no Node version."
    )

    engines = json.loads(PACKAGE_JSON.read_text(encoding="utf-8")).get("engines", {})
    assert "node" in engines, (
        "plugins/artifact/viewer/package.json declares no engines.node. The pin "
        "must survive a reader who does not use nvm."
    )
    assert re.search(r"\d", str(engines["node"])), (
        f"engines.node reads {engines['node']!r}, which pins no Node major."
    )


# ---- 3. the comparison can fail, and it names the offset (C3) ----

def test_a_differing_byte_is_detected_at_a_named_offset():
    """A comparison that always reports equality is not a measurement.

    This case needs no build, so it runs on every checkout.
    """
    left = b"the viewer renders\n" * 4

    assert first_difference(left, left) is None, "identical bytes must compare equal"

    changed = bytearray(left)
    changed[7] = ord("X")
    offset = first_difference(left, bytes(changed))
    assert offset == 7, (
        f"one changed byte at offset 7 went unreported, and the comparison "
        f"returned {offset!r}"
    )

    assert first_difference(left, left + b"!") == len(left), (
        "a longer right-hand file must report the first offset past the shorter file"
    )
    assert first_difference(left[:0], left) == 0, (
        "an empty left-hand file must report offset 0"
    )


# ---- 4. the build cases skip rather than fail without Node ----

def test_every_build_case_carries_the_skip_guard():
    """A build case without a skip guard breaks a checkout that has no Node."""
    module = sys.modules[__name__]
    build_cases = [
        value
        for value in vars(module).values()
        if callable(value) and getattr(value, "_needs_npm", False)
    ]
    assert build_cases, (
        "no case is marked with needs_npm, so the run guard is untested."
    )

    for case in build_cases:
        marks = [mark for mark in getattr(case, "pytestmark", []) if mark.name == "skipif"]
        assert marks, f"{case.__name__} runs the build and carries no skip guard"
        reason = getattr(case, "_skip_reason", "")
        assert reason, f"{case.__name__} skips with no stated reason"
        assert "npm" in reason or "node_modules" in reason, (
            f"{case.__name__} skips with {reason!r}, which names neither the missing "
            "npm nor the missing node_modules"
        )

    assert "npm" in TOOLCHAIN_SKIP_REASON and "node_modules" in TOOLCHAIN_SKIP_REASON, (
        "the fallback skip reason names neither cause"
    )


def test_a_checkout_without_node_skips_rather_than_fails(tmp_path):
    """Run the file with no npm on PATH, and read the report.

    The suite stays green on a machine that never installed Node. This is the
    program design's stated requirement for this file.

    The inner run sets NESTED_PYTEST_ENV, and this case skips on that mark.
    Without it, the inner run would collect this case and run it again,
    without end.
    """
    if os.environ.get(NESTED_PYTEST_ENV) == "1":
        pytest.skip("this case is running inside its own nested run")

    path = f"{tmp_path}:/usr/bin:/bin"
    if shutil.which("npm", path=path) is not None:
        pytest.skip("the system PATH holds an npm, so node absence cannot be staged")

    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(Path(__file__).resolve()), "-v", "-rs"],
        cwd=REPO_ROOT,
        env={**os.environ, "PATH": path, NESTED_PYTEST_ENV: "1"},
        capture_output=True,
        text=True,
        timeout=BUILD_TIMEOUT_S,
    )

    assert result.returncode == 0, (
        f"the run without npm exited {result.returncode}\n"
        f"--- stdout (tail) ---\n{result.stdout[-4000:]}\n"
        f"--- stderr (tail) ---\n{result.stderr[-4000:]}"
    )
    assert "npm is not on PATH" in result.stdout, (
        "no case reported the missing npm as its skip reason\n"
        f"--- stdout (tail) ---\n{result.stdout[-4000:]}"
    )

    summary = result.stdout.strip().splitlines()[-1]
    assert "skipped" in summary and "failed" not in summary, (
        f"the run without npm reported {summary!r} instead of skips"
    )
