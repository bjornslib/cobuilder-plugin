"""Structure and effect checks for shared/tracker-usage.md.

The reference is the operator's guide to the tracker CLI. These checks read its
structure and run its examples. They never assert its wording.

Example format that the checks read from the reference:
- A fenced block whose info string starts with `console`.
- A command line `$ uv run shared/tracker.py <args>`. The script path names the
  repo's own script.
- Lines after a command are its expected stdout.
- A line `exit: N` after a command's output sets its expected exit code. Without
  it, the expected exit code is 0.
- A block whose info string holds `no-config` runs with no tracker.yaml.
  Every other block runs with a tracker.yaml that names the fake adapter over a
  copy of the corpus.
- Each block runs in its own tmp repo, in the order its commands appear.
- Output placeholders: a path under the tmp repo prints as `<repo>`, and an ISO
  timestamp prints as `<time>`.
"""

from __future__ import annotations

import re
import shlex
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DOC = REPO / "shared" / "tracker-usage.md"
TRACKER = REPO / "shared" / "tracker.py"
CORPUS_DIR = REPO / "tests" / "fixtures" / "tracker" / "corpus"

REQUIRED_OPERATIONS = {"doctor", "list-programs", "next-ready", "claim-slice", "set-slice-state"}
FENCE = re.compile(r"^```console([^\n]*)\n(.*?)^```[ \t]*$", re.M | re.S)
EXIT_LINE = re.compile(r"exit: (\d+)")
OPERATION_REF = re.compile(r"tracker\.py[ \t]+([a-z][a-z-]*)")
BD_COMMAND = re.compile(r"(?m)^(?:\$[ \t]+)?bd[ \t]|`bd[ \t]")
SUBCOMMAND_LIST = re.compile(r"\{([a-z][a-z0-9-]*(?:,[a-z][a-z0-9-]*)+)\}")
TIMESTAMP = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z)?")
SCRIPT_PREFIX = "uv run shared/tracker.py"


@dataclass(frozen=True)
class Command:
    args: tuple[str, ...]
    stdout: str
    exit_code: int


@dataclass(frozen=True)
class Block:
    no_config: bool
    commands: tuple[Command, ...]


def _doc_text() -> str:
    assert DOC.is_file(), f"{DOC.relative_to(REPO)} is missing"
    return DOC.read_text(encoding="utf-8")


def _parse_blocks(text: str) -> list[Block]:
    blocks: list[Block] = []
    for fence in FENCE.finditer(text):
        no_config = "no-config" in fence.group(1).split()
        commands: list[Command] = []
        pending: tuple[str, list[str]] | None = None
        exit_code = 0

        def close(pending: tuple[str, list[str]] | None, exit_code: int) -> None:
            if pending is None:
                return
            command_line, lines = pending
            if not command_line.startswith(SCRIPT_PREFIX):
                raise ValueError(f"example does not run the repo script: {command_line!r}")
            rest = command_line[len(SCRIPT_PREFIX) :]
            commands.append(
                Command(tuple(shlex.split(rest)), "\n".join(lines).strip(), exit_code)
            )

        for line in fence.group(2).splitlines():
            if line.startswith("$ "):
                close(pending, exit_code)
                pending = (line[2:].strip(), [])
                exit_code = 0
            elif (match := EXIT_LINE.fullmatch(line)) and pending is not None:
                exit_code = int(match.group(1))
            elif pending is not None:
                pending[1].append(line)
            elif line.strip():
                raise ValueError(f"output before the first command: {line!r}")
        close(pending, exit_code)
        blocks.append(Block(no_config, tuple(commands)))
    return blocks


def _help_subcommands() -> set[str]:
    out = subprocess.run(
        ["uv", "run", str(TRACKER), "--help"],
        cwd=REPO,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    ).stdout
    match = SUBCOMMAND_LIST.search(out)
    assert match, f"no subcommand list in tracker.py --help:\n{out}"
    return set(match.group(1).split(","))


def _operation(args: tuple[str, ...], subcommands: set[str]) -> str | None:
    # Global options come first, so the operation is the first token that names a subcommand.
    return next((arg for arg in args if arg in subcommands), None)


def _normalize(text: str, repo: Path) -> str:
    paths = {str(repo), str(repo.resolve())}
    for path in sorted(paths, key=len, reverse=True):
        text = text.replace(path, "<repo>")
    return TIMESTAMP.sub("<time>", text)


def _prepare_repo(repo: Path, no_config: bool) -> None:
    repo.mkdir(parents=True)
    if no_config:
        return
    shutil.copytree(CORPUS_DIR, repo / "corpus")
    (repo / ".cobuilder").mkdir()
    (repo / ".cobuilder" / "tracker.yaml").write_text(
        "adapter: fake\ncorpus: corpus\n", encoding="utf-8"
    )


def test_usage_doc_exists() -> None:
    assert _doc_text()


def test_examples_run_and_match_their_expected_output(tmp_path: Path) -> None:
    blocks = _parse_blocks(_doc_text())
    assert blocks, "shared/tracker-usage.md has no console examples"
    failures: list[str] = []
    for index, block in enumerate(blocks):
        repo = tmp_path / f"block-{index}"
        _prepare_repo(repo, block.no_config)
        for command in block.commands:
            proc = subprocess.run(
                ["uv", "run", str(TRACKER), *command.args],
                cwd=repo,
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            actual = _normalize(proc.stdout, repo).strip()
            label = f"block {index}: tracker.py {' '.join(command.args)}"
            if proc.returncode != command.exit_code:
                failures.append(f"{label}: exit {proc.returncode}, doc says {command.exit_code}")
            if actual != command.stdout:
                failures.append(f"{label}: stdout differs\n--- doc\n{command.stdout}\n--- actual\n{actual}")
    assert not failures, "\n\n".join(failures)


def test_required_examples_are_present() -> None:
    blocks = _parse_blocks(_doc_text())
    subcommands = _help_subcommands()
    commands = [command for block in blocks for command in block.commands]
    operations = {_operation(command.args, subcommands) for command in commands}
    missing = REQUIRED_OPERATIONS - operations
    assert not missing, f"no example runs: {sorted(missing)}"
    assert any(
        _operation(command.args, subcommands) == "set-slice-state" and "--state-file" in command.args
        for command in commands
    ), "no set-slice-state example uses --state-file"
    assert any(
        block.no_config and any(command.exit_code == 2 for command in block.commands)
        for block in blocks
    ), "no refused write with no config (exit 2) example"


def test_every_named_operation_is_a_subcommand() -> None:
    named = set(OPERATION_REF.findall(_doc_text()))
    unknown = named - _help_subcommands()
    assert not unknown, f"tracker.py names operations that --help does not list: {sorted(unknown)}"


def test_every_subcommand_is_documented() -> None:
    text = _doc_text()
    undocumented = [
        name
        for name in sorted(_help_subcommands())
        if not re.search(rf"tracker\.py[ \t]+{re.escape(name)}\b", text)
    ]
    assert not undocumented, f"--help lists operations the doc never names: {undocumented}"


def test_doc_names_no_bd_command() -> None:
    match = BD_COMMAND.search(_doc_text())
    assert match is None, f"the doc runs a bd command: {match.group(0)!r}"
