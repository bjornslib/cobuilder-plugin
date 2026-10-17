Kind: test-suite

# Rubric: Slice 4 — Command prints JSON and exit codes

Feature: beads-storage
Epic: E1
Slice goal: `shared/tracker.py list-programs` prints the corpus as JSON, and the CLI test shows exit codes 0, 2, 3, and 4.
Test command: `uv run pytest tests/test_tracker_cli.py -q && uv run pytest tests -q`

## Criteria

### C1 — The read command prints the corpus as JSON [CRITICAL]
**Must be true:** `uv run shared/tracker.py list-programs` with a config that names the fixture corpus prints a JSON list. The list holds the program `demo`. The exit code is 0.
**Evidence to check:**
- `uv run pytest tests/test_tracker_cli.py::test_list_programs_prints_json -q` passes.
- Run the command by hand against the fixture corpus. Pipe the output into `python -m json.tool`. It parses. Record the exit code.
**Scoring:**
- 1.0 — the output parses as a JSON list with `demo`, and the exit code is 0.
- 0.5 — the output parses, but the exit code or the content is wrong.
- 0.0 — the output does not parse, or the command fails.

### C2 — No adapter gives exit 2 and changes no file [CRITICAL]
**Must be true:** a write subcommand run with no `.cobuilder/tracker.yaml` exits 2 and changes no file.
**Evidence to check:**
- `uv run pytest tests/test_tracker_cli.py::test_write_without_config_exits_2 -q` passes.
- Run `uv run shared/tracker.py set-slice-state demo-E1-s3 closed` by hand in a directory with no config. Record the exit code and the stderr text. Compare `git status --porcelain` before and after.
**Scoring:**
- 1.0 — exit 2, a stderr message that names the missing adapter, and no changed file.
- 0.0 — any other exit code, or any changed file.

### C3 — A missing corpus gives exit 3 [CRITICAL]
**Must be true:** a config that names a missing corpus directory makes the command exit 3, with an error message on stderr.
**Evidence to check:**
- `uv run pytest tests/test_tracker_cli.py::test_adapter_error_exits_3 -q` passes.
- Run the command by hand with a config that names `/nonexistent/corpus`. Record the exit code.
**Scoring:**
- 1.0 — exit 3, and a message on stderr.
- 0.0 — any other exit code.

### C4 — Bad arguments give exit 4
**Must be true:** `get-slice` with no id exits 4 and prints a usage message.
**Evidence to check:**
- `uv run pytest tests/test_tracker_cli.py::test_bad_arguments_exit_4 -q` passes.
- Run `uv run shared/tracker.py get-slice` by hand. Record the exit code.
**Scoring:**
- 1.0 — exit 4, and a usage message.
- 0.0 — any other exit code.

### C5 — The command reads through the port only
**Must be true:** `shared/tracker.py` loads its adapter through `load_adapter` in `shared/tracker_port/config.py`. It does not open the corpus files or the plans files itself.
**Evidence to check:**
- Read `shared/tracker.py`. Search for `open(`, `json.load`, and `Path(` calls that read corpus or plans files. None appears outside the port package.
- Read the import block. It imports `tracker_port`, and it does not import `fake` or `files` directly.
**Scoring:**
- 1.0 — the command uses `load_adapter` only, and the import block names no adapter module.
- 0.5 — the command uses `load_adapter`, but it imports an adapter module directly.
- 0.0 — the command reads the corpus or the plans files itself.

### C6 — The command file carries the PEP 723 header
**Must be true:** `shared/tracker.py` starts with a PEP 723 `# /// script` block that names its Python version and its dependencies.
**Evidence to check:**
- Read the first 10 lines of `shared/tracker.py`. The block opens and closes with `# ///` lines.
- Run `uv run shared/tracker.py --help`. It exits 0, which shows that `uv` reads the header.
**Scoring:**
- 1.0 — the header is present, and `--help` exits 0.
- 0.0 — the header is missing, or `--help` fails.

## Regression check
- All tests from slices 1 to 3 still pass (`uv run pytest tests/test_tracker_contract.py tests/test_tracker_projector.py tests/test_tracker_files.py -q`).
- No existing test under `tests/` fails after this slice (`uv run pytest tests -q`).
- `tests/test_script_references.py` passes. It allows plugin markdown to name `shared/<name>.py` only through `uv run ... shared/<name>.py`.

## Out of scope — do not penalise
- The write subcommands beyond the no-adapter refusal (E2, E3, and E4).
- The usage reference text (slice 5).
- The `doctor` subcommand and the `capabilities` subcommand (E2).
