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

One case shells out to pytest and runs this file again. The nested command
deselects that case, and the case fails at nesting depth 1 or deeper. The
process tree is therefore bounded. A nested run that could re-collect its own
parent would grow without limit, and a test that can spawn an unbounded
process tree is a defect, even when each of its own cases passes.

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

# The nested run of this file sets this variable to its nesting depth. The
# case that starts the nested run refuses to run at depth 1 or deeper. The
# refusal is a hard failure, not a skip. A silent skip is what let an earlier
# wiring mistake grow a runaway process tree.
NESTED_DEPTH_ENV = "COBUILDER_VIEWER_BUILD_NESTED_DEPTH"

# The nesting case, by name and by node id. The nested command deselects it
# twice, so the inner run cannot collect it. pytest reports node ids relative
# to the root directory, even when the target is an absolute path. The node id
# below is therefore built from the file's path under the repository root.
NESTING_CASE_NAME = "test_a_checkout_without_node_skips_rather_than_fails"
NESTING_NODE_ID = (
    f"{Path(__file__).resolve().relative_to(REPO_ROOT).as_posix()}"
    f"::{NESTING_CASE_NAME}"
)


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


def resolvable_git() -> tuple[str | None, str]:
    """Return the git executable that runs here, or None and the reason.

    The executable is resolved once, here, and the caller then uses the
    absolute path it returns. The nested run in
    test_a_checkout_without_node_skips_rather_than_fails installs a PATH of
    `<tmp>:/usr/bin:/bin`, so a bare "git" resolves to /usr/bin/git there. On
    an arm64 host that file is the xcrun shim, and an x86_64 process cannot
    load the arm64-only libxcrun the shim needs. A git that cannot answer must
    never be read as "the lockfile is untracked", so the probe below decides.
    """
    found = shutil.which("git")
    if found is None:
        return None, "no git is on PATH, so the lockfile's tracking cannot be read"
    probe = subprocess.run([found, "--version"], capture_output=True, text=True)
    if probe.returncode != 0:
        lines = (probe.stderr or probe.stdout).strip().splitlines()
        detail = lines[-1].strip() if lines else "no output"
        return None, (
            f"the git at {found} cannot run here, so the lockfile's tracking "
            f"cannot be read ({detail})"
        )
    return found, ""


def required_git() -> str:
    """Return the git executable that runs here, or skip this case.

    The skip reason names the resolved path and the host's fault. The type
    here is str, and not str | None, so the call site hands a narrowed value
    to subprocess.run. The assertion states that narrowing for a checker that
    cannot see that pytest.skip never returns.
    """
    git, problem = resolvable_git()
    if git is None:
        pytest.skip(problem)
    assert git is not None, problem
    return git


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

    The three assertions above the last one read files and shell out to
    nothing, so every host runs them. Only the last check needs git. It
    resolves the executable with required_git(), calls it by absolute path,
    and skips where that executable cannot run. This case reads no npm, so it
    runs on a checkout that never installed Node.
    """
    assert LOCKFILE.is_file(), (
        "plugins/artifact/viewer/package-lock.json is absent. One lockfile is "
        "what fixes the dependencies two builds share."
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

    # The tracking check runs last, because it is the only check here that
    # needs git. The three assertions above read files and shell out to
    # nothing, so a host whose git cannot execute still gets all three. The
    # skip below then removes this one check alone. Nothing follows it.
    git = required_git()

    tracked = subprocess.run(
        [git, "ls-files", "--error-unmatch", LOCKFILE.relative_to(REPO_ROOT).as_posix()],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    assert tracked.returncode == 0, (
        "plugins/artifact/viewer/package-lock.json exists but git does not track "
        "it. A lockfile outside version control pins nothing."
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

    Three facts keep the nested run bounded. The nested command filters this
    case out twice, once with -k and once with --deselect, so the inner run
    never collects it. The command also records its nesting depth in
    NESTED_DEPTH_ENV. This case then fails at depth 1 or deeper, so a broken
    filter stops the run instead of recursing.
    """
    depth = int(os.environ.get(NESTED_DEPTH_ENV) or "0")
    if depth >= 1:
        pytest.fail(
            f"this case was reached at nesting depth {depth}, so the nested "
            f"command did not deselect it. The command filters it with both "
            f"-k and --deselect. Refusing to start another nested run, because "
            f"a test that can spawn an unbounded process tree is a defect."
        )

    path = f"{tmp_path}:/usr/bin:/bin"
    if shutil.which("npm", path=path) is not None:
        pytest.skip("the system PATH holds an npm, so node absence cannot be staged")

    # The deselect is the ceiling in practice. The -k filter states the same
    # exclusion in plain language, so a reader sees why this case never runs
    # in the inner process. pytest counts the two filters as one deselection,
    # because both name the same case.
    nested_command = [
        sys.executable,
        "-m",
        "pytest",
        str(Path(__file__).resolve()),
        "-v",
        "-rs",
        "-k",
        f"not {NESTING_CASE_NAME}",
        "--deselect",
        NESTING_NODE_ID,
    ]
    result = subprocess.run(
        nested_command,
        cwd=REPO_ROOT,
        env={**os.environ, "PATH": path, NESTED_DEPTH_ENV: str(depth + 1)},
        capture_output=True,
        text=True,
        timeout=BUILD_TIMEOUT_S,
    )

    assert result.returncode == 0, (
        f"the run without npm exited {result.returncode}\n"
        f"--- command ---\n{' '.join(nested_command)}\n"
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
    assert "deselected" in summary, (
        f"the nested run reported {summary!r}, so its filter did not exclude "
        f"{NESTING_NODE_ID}. A nested run that collects this case can recurse."
    )


# ---- 5. the build owns the committed file (slice 3) ----
#
# E2's slice 3. From here on `plugins/artifact/viewer/index.html` is a build
# output, and the cases below hold it to the build. A hand edit to that file
# fails test_build_reproduces_the_committed_viewer, which names the first byte
# that differs.
#
# The cases come from the epic design's Test Plan, in its own order. Three of
# them run the build, so they carry the skip guard above. Two read
# vite.config.ts, need no Node, and run on every checkout.

EXPORT_ARTIFACT = REPO_ROOT / "plugins" / "artifact" / "scripts" / "export_artifact.py"
EXPORT_DIR = EXPORT_ARTIFACT.parent


def committed_bytes() -> bytes:
    """The committed viewer: plugins/artifact/viewer/index.html.

    Read before a build runs, because the build writes that same file from slice
    3 on. The bytes read here are what the build must reproduce.
    """
    assert INDEX_HTML.is_file(), (
        f"{INDEX_HTML.relative_to(REPO_ROOT).as_posix()} is absent. It is the file "
        "the build writes, and the file this guard holds to the build."
    )
    return INDEX_HTML.read_bytes()


def marker_names() -> list[str]:
    """The marker names export_artifact.py matches, read from the exporter itself.

    The exporter holds its marker list as module data, so this reads that data
    and not a literal list kept here. A name added to the exporter joins
    test_every_marker_name_survives_a_build with no edit to this file.
    """
    if str(EXPORT_DIR) not in sys.path:
        sys.path.insert(0, str(EXPORT_DIR))
    import export_artifact

    markers = getattr(export_artifact, "MARKERS", None)
    assert markers, (
        "export_artifact.py exposes no MARKERS data, so the names the exporter "
        "matches a viewer by cannot be read from it."
    )
    names: list[str] = []
    for entry in markers:
        if isinstance(entry, str):
            names.append(entry)
        elif isinstance(entry, dict):
            names.append(entry["name"])
        else:
            names.append(entry.name)
    return names


def assert_bytes_match(built: bytes, expected: bytes, label: str) -> None:
    """Fail when the build's bytes differ from `expected`, and name the offset.

    One comparison serves both cases below: the case that holds the committed
    file to the build, and the case that proves that comparison can fail.
    """
    offset = first_difference(built, expected)
    assert offset is None, (
        f"{label} differs from the build\n"
        f"  build:    {describe(built)}\n"
        f"  expected: {describe(expected)}\n"
        f"  first differing offset: {offset}"
    )


# ---- 5a. the build writes the committed file (slice 3, C1) ----

@needs_npm
def test_build_reproduces_the_committed_viewer():
    """A fresh build writes plugins/artifact/viewer/index.html byte for byte.

    The committed bytes are read first, then the build runs, then the two are
    compared. A difference means the committed file is not what the build
    produces, so the shipped viewer and the source have parted.
    """
    expected = committed_bytes()
    assert_bytes_match(run_build(), expected, "the committed viewer")


@needs_npm
def test_editing_the_output_fails_the_test(tmp_path):
    """The guard can fail, and its failure names the edited byte's offset.

    A guard that never fails proves nothing, so this case gives the comparison
    something it must catch: one flipped byte, in a TEMPORARY COPY. The
    committed file is read and never written. The last assertion re-reads it,
    so a case that reached outside tmp_path fails here instead of passing.
    """
    source = committed_bytes()
    at = len(source) // 2
    edited = bytearray(source)
    edited[at] ^= 0x01
    assert bytes(edited) != source, "the edit changed no byte"

    copy = tmp_path / "index.html"
    copy.write_bytes(bytes(edited))

    built = run_build()

    with pytest.raises(AssertionError) as caught:
        assert_bytes_match(
            built, copy.read_bytes(), "an edited copy of the committed viewer"
        )
    message = str(caught.value)

    reported = re.search(r"first differing offset:\s*(\d+)", message)
    assert reported is not None, (
        "the guard failed without naming the first differing offset\n"
        f"--- failure message ---\n{message}"
    )
    assert int(reported.group(1)) == at, (
        f"offset {at} holds the one edited byte, and the guard named offset "
        f"{reported.group(1)} instead\n--- failure message ---\n{message}"
    )

    assert INDEX_HTML.read_bytes() == source, (
        "this case left the committed viewer changed. The edit belongs in the "
        "temporary copy alone. A difference here means this case wrote outside "
        "tmp_path, or that the build rewrote the committed file with bytes other "
        "than the ones it had read."
    )


# ---- 5b. every marker name reaches the output (slice 3, C5) ----

@needs_npm
def test_every_marker_name_survives_a_build():
    """Every name export_artifact.py matches appears in the build's output.

    The names come from the exporter, so this case measures the build against
    whatever the exporter carries. A name the build rewrites away stops a
    publish, and no other case here would notice.
    """
    names = marker_names()
    assert names, "export_artifact.py carries no marker name"

    text = run_build().decode("utf-8", errors="replace")
    missing = [name for name in names if name not in text]
    assert not missing, (
        "the build dropped marker names that export_artifact.py matches: "
        f"{', '.join(missing)}\n"
        "Each marker must survive the build, or a publish stops at that marker."
    )


# ---- 5c. the output directory is the plugin root (slice 3, C1 and C3) ----

def test_out_dir_is_the_plugin_root():
    """vite.config.ts writes the plugin root, and not a scratch `dist`.

    Vite resolves `build.outDir` against `root`, which is `src`, so the plugin
    root is `..` from there. An edit that restores `../dist` puts the build back
    on a directory no reader of the repository sees.
    """
    root = config_value("root", "src")
    out_dir = config_value("outDir", "")
    assert out_dir, (
        "vite.config.ts carries no quoted build.outDir, so the build's output "
        'directory cannot be read. Slice 3 requires `outDir: ".."`.'
    )

    resolved = (VIEWER / root / out_dir).resolve()
    assert resolved == VIEWER.resolve(), (
        f"vite.config.ts resolves its build output to {resolved}, and the plugin "
        f"root is {VIEWER}. The build must write the committed viewer in place."
    )
    assert resolved != (VIEWER / "dist").resolve(), (
        "vite.config.ts still writes its build to the scratch directory "
        f"{(VIEWER / 'dist').relative_to(REPO_ROOT).as_posix()}, which no commit sees."
    )


def test_the_build_does_not_empty_the_plugin_root():
    """`emptyOutDir` is false, because the output directory is the plugin root.

    The plugin root holds package.json, src/, and node_modules/. A build that
    empties its own output directory deletes the project it built from.
    """
    declared = re.search(
        r"\bemptyOutDir\s*:\s*(true|false)", VITE_CONFIG.read_text(encoding="utf-8")
    )
    assert declared is not None, (
        "vite.config.ts declares no literal build.emptyOutDir, so whether the "
        "build empties the plugin root is unsettled. Slice 3 requires false."
    )
    assert declared.group(1) == "false", (
        "vite.config.ts sets build.emptyOutDir to true, and the build's output "
        "directory is the plugin root. A build would delete package.json and src/."
    )
    for needed in (PACKAGE_JSON, VIEWER / "src"):
        assert needed.exists(), (
            f"{needed.relative_to(REPO_ROOT).as_posix()} is absent, so the plugin "
            "root has already lost a directory the build would empty."
        )


# ---- 5d. the shipped file reads its data beside itself (slice 3, C1) ----

@needs_npm
def test_the_built_file_asks_for_its_data_at_a_relative_path():
    """The build's output carries no absolute `/bundle/` data base.

    The dev server mounts a bundle at `/bundle/`. The shipped file sits inside a
    bundle at `viewer/index.html`, with its data beside it at `../data/`, so a
    built file that asks for `/bundle/data/index.json` 404s on its own data.

    This case reads the build's OUTPUT, not the source, so the source may keep
    the dev path. It is about what ships.
    """
    text = run_build().decode("utf-8", errors="replace")

    assert "/bundle/" not in text, (
        "the build's output carries the literal /bundle/, so the shipped file "
        "asks for its data at the dev server's mount. Served inside a bundle at "
        "viewer/index.html, that path 404s on ../data/.\n"
        f"  occurrences: {text.count('/bundle/')}"
    )

    for found in re.finditer(r"[\"']((?:[^\"'\\]|\\.)*data/[^\"']*)[\"']", text):
        url = found.group(1)
        assert not url.startswith("/"), (
            f"the build's output asks for {url!r}, which is absolute. The data "
            "sits beside the shipped file, at ../data/."
        )
