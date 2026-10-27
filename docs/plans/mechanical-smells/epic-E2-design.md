# Epic Technical Solution Design: E2 — repo-findings

Feature: mechanical-smells
Epic ID: E2

## Scope and Intent

This epic clears the habit-hooks findings outside the viewer. A scan on 2026-10-27 finds
734 findings in 130 files. The scan after epic E1 counts more than the 703 that the
catalog listed at the start, because the merge of `master` and the new E1 test helpers
added files. The nine slices cut the findings by area and by smell. Structure comes
first, then duplicated code, and comments come last.

The epic ends when `habit-sensors` reports no finding outside the viewer, apart from the
recorded residuals and the kept why-comments. The Python suite, the viewer suite, and
the memory plugin tests pass. Each script keeps its command line, and each moved name
stays importable from its old module.

The epic does not change behavior. No script prints different output, and no hook acts
in a different way. The epic does not touch the viewer, which epic E1 closed.

## Counts and Files Touched

The counts come from `habit-sensors --all` on 2026-10-27. Each slice takes its count
again at its start, because an earlier slice removes some findings by side effect.

| Slice | Area | Files | Findings | Smells |
|---|---|---|---|---|
| 8 | `shared/*.py` and `shared/tracker_port/*.py` | 11 | 25 | 9 oversized-file, 6 high-complexity, 5 swallowed-exception, 3 too-many-parameters, 1 oversized-function, 1 unused-variable |
| 9 | `plugins/*/scripts/*.py`, `.claude/**`, and `docs/**/probe_repo.py` | 18 | 39 | 14 oversized-file, 9 high-complexity, 7 swallowed-exception, 4 oversized-function, 2 too-many-parameters, 2 unused-import, 1 unused-variable |
| 10 | The root `tests/*.py` files | 30 | 45 | 26 oversized-file, 8 unused-import, 6 unused-variable, 3 high-complexity, 1 oversized-function, 1 too-many-parameters |
| 11 | `plugins/cobuilder-memory/hooks/*` | 7 | 34 | 17 oversized-function, 6 explicit-any, 5 too-many-parameters, 4 oversized-file, 2 high-complexity |
| 12 | The memory test support and the six smaller memory test files | 7 | 128 | 89 explicit-any, 21 oversized-function, 17 duplicated-code, 1 high-complexity |
| 13 | `tests/pane.test.ts` and `tests/run.test.ts` in the memory plugin | 2 | 155 | 62 explicit-any, 47 duplicated-code, 40 oversized-function, 4 oversized-file, 2 too-many-parameters |
| 14 | Duplicated Python code, in scripts and root tests | 39 | 118 | 118 duplicated-code |
| 15 | Duplicated prose in the stack references and the tracker guide | 14 | 44 | 44 duplicated-code |
| 16 | Comments outside the viewer | 18 | 146 | 146 non-essential-comment |
| | **Total** | | **734** | |

New files:

- `tests/test_repo_habit_clean.py` and `tests/_repo_habit_slices.py`: the sensor check for
  this epic. They follow `tests/test_viewer_habit_clean.py`, and they reuse its helpers.
- `tests/test_python_tests_preserved.py` and `tests/fixtures/python_test_names.json`: the
  guard for slice 10. It pins every test function name and parameter id, and the count of
  `assert` statements.
- `tests/test_python_exports.py` and `tests/fixtures/python_exports.json`: the export pin
  for the Python modules that slices 8 to 10 split.
- `tests/test_script_cli_stable.py` and `tests/fixtures/script_help.json`: the command
  line pin. It holds the `--help` text of each script under `shared/` and
  `plugins/*/scripts/`.
- `tests/test_memory_tests_preserved.py` and `tests/fixtures/memory_test_names.json`: the
  guard for slices 12 and 13. It pins the 76 test names of the memory plugin.
- `docs/architecture/designs/mechanical-smells/kept-comments/slice16-*.md`: the kept
  why-comment tables of slice 16.

## Types & Signatures

The contract is the module surface and the command line. A split follows the rule of
epic E1: a moved unit keeps its name, and the original module re-exports it.

| Surface | Pinned by | Rule |
|---|---|---|
| The public names of each split Python module (top-level `def`, `class`, and assigned names) | `tests/fixtures/python_exports.json` | A name that exists at the start of the slice still imports from the old module |
| The `--help` text of each script | `tests/fixtures/script_help.json` | The text stays byte-equal, so no option moves or changes |
| The exit code and the JSON shape of `tracker.py` operations | The existing tracker contract tests | They stay green |
| The names of the memory hook exports and the memory test names | `tests/fixtures/memory_test_names.json`, and `tsc -p plugins/cobuilder-memory --noEmit` | A hook export keeps its name. The 76 test names stay |

```python
# tests/_repo_habit_slices.py: one key per slice, the same shape as the viewer table
SLICES: dict[int, list[str]] = {8: ["shared/ledger.py", ...], ...}
IGNORED_SMELLS: dict[int, set[str]] = {8: {"duplicated-code", "non-essential-comment"}, ...}
```

```ts
// plugins/cobuilder-memory/hooks: a typed seam replaces each `any`
type HookEvent = { tool: string; args: Record<string, unknown> }
```

## Slice Decomposition

| Slice | Ends with | Depends on |
|---|---|---|
| 8 | The 11 files of `shared/` report no finding, other than `duplicated-code` and `non-essential-comment`. The sensor check, the export pin, and the command-line pin exist and pass. | none |
| 9 | The 18 plugin script files report no finding, other than `duplicated-code` and `non-essential-comment`. Each script keeps its `--help` text. | 8 |
| 10 | The 30 root test files report no finding, other than `duplicated-code` and `non-essential-comment`. Every test name and assert stays. | 9 |
| 11 | The 7 memory hook files report no finding, other than `non-essential-comment`. `tsc` and the plugin tests pass. | 8 |
| 12 | The memory test support and the 6 smaller test files report no finding, other than `non-essential-comment`. The test names stay. | 11 |
| 13 | `pane.test.ts` and `run.test.ts` report no finding, other than `non-essential-comment`. The test names stay. | 12 |
| 14 | The Python files report no `duplicated-code` finding. Every test name and every `--help` text stays. | 10 |
| 15 | The stack references and the tracker guide report no `duplicated-code` finding. Each reader still finds each rule. | 14 |
| 16 | The files outside the viewer report no comment finding beyond the kept-comments records. The code is unchanged once comments are stripped. The sample reviews pass. | 13, 15 |

Slices 8 to 13 ignore `duplicated-code` in the Python files, and they must not raise its
count. Slices 8 to 15 ignore `non-essential-comment`, and they must not raise its count.
Slice 13 and slice 12 own the duplicated code of the memory test files, because the split
of those files removes it. Slice 14 owns the other duplicated code.

The order is two chains. The Python chain runs 8, 9, 10, 14. The memory chain runs 11,
12, 13. Slice 15 and slice 16 close the epic. Slice 8 is the tracer bullet. It proves the
sensor check, the export pin, and the command-line pin on the scripts that every other
script uses.

Comment findings follow the decision on record of epic E1 (2026-10-27, the engineer).
Slice 16 reviews each flagged comment. It deletes a comment that restates the code, a
divider, and dead code. It keeps a comment that explains why, reworded shorter where that
helps, and it records the kept count per file in
`docs/architecture/designs/mechanical-smells/kept-comments/`.

## Test Plan

- **Sensor check, RED for every slice.** `tests/test_repo_habit_clean.py` runs
  `habit-sensors --file <path>` for each file of a slice. It keeps the issues whose
  `details.file` is that file, because jscpd reports repo-wide clusters in `--file` mode.
  Slices 8 to 13 fail while any finding other than the ignored smells remains. Slice 14
  and slice 15 fail while a `duplicated-code` finding remains. Slice 16 fails when a file
  has more comment findings than its kept-comments record. Each check also fails when the
  ignored counts of a slice file rise. RED adds the entry for its slice.
- **Export pin and command-line pin, guards, not RED tests.** They pass before GREEN. They
  fail when a split drops a name or moves an option.
- **Behavior.** The Python suite stays green after each slice, including the slow
  tracker contract tests before the epic closes. The viewer suite stays green, because
  the viewer reads some scripts through the build. `claude plugin test
  plugins/cobuilder-memory` and `npx tsc -p plugins/cobuilder-memory --noEmit` stay
  green after slices 11 to 13.
- **Test preservation.** Slices 10, 12, and 13 split test files. Each keeps every test
  name and every assertion. The guards pin names and counts, as slice 5 of epic E1 did.
- **Mutation proof.** The validator breaks one function in a split module and one in a
  split test target. The same tests fail before and after the slice.
- **Comment guard and samples.** Slice 16 adds a code guard like
  `tests/test_viewer_comments_only.py`. It hashes the Python code with comments removed
  (through `ast.unparse`), and the TypeScript code through esbuild. The reviewer samples
  at least 20 deleted and 20 kept comments with a fixed seed.
- **Residuals.** A 13-to-30-line `oversized-function` unit may stay only in a test file,
  when it is one test case or one setup unit. The catalog section 7 lists it with its
  file and unit.

## Risks & Open Questions

- **Scripts run as commands.** A PEP 723 script has its dependency header and its
  `__main__` block. A split must keep the header on the entry file, and each new module
  must import without the script's own dependencies. The command-line pin catches an
  option that moved. It does not catch a script that fails to start, so the validator
  runs each changed script with `--help` and one real call where a safe call exists.
- **Import paths of scripts.** The tests import scripts through `sys.path` entries. A new
  module sits next to the old one, so the old import still works. A plugin vendors
  `shared/` as a symlink, so a new file in `shared/` reaches every plugin. That is wanted,
  and the packaging tests check it.
- **Swallowed exceptions.** The catalog said to narrow each catch, or to record a
  `noqa` with a reason. Epic E1 forbids suppression, so this design chooses narrowing
  only. A hook that must not fail the host (`deny-git-stash.py`) catches the exact
  exceptions it can see. If one `except Exception` must stay, it needs an explicit
  decision from the engineer at the gate, and the catalog would list it as a recorded
  residual of a new kind.
- **Memory types.** The 157 `explicit-any` findings sit mostly in test fakes. The
  `claude-code/testing` module types come from `types/index.d.ts`. A typed seam may need a
  new type in that file. A type change must not change the plugin's runtime hooks.
- **Duplicated code across two plugins.** The architect and pr plugins hold copies of the
  same stack references. Slice 15 may move one copy into `shared/` and link it from both
  plugins, as ADR-0017 does for other shared files. It may also keep the copies and make
  the text differ on purpose. The slice records the choice in the catalog. It also
  carries an open question: which reader owns the text.
- **Slice 10 is large.** It holds 30 files with 26 files over 200 lines. A split moves
  tests into new files. If RED finds two end states, the slice splits at a later gate.
- **Test names in Python.** A pytest node id holds the module path, so a split changes
  it. The guard pins the function name and the parameter id, not the module.
- **Comment review is a judgment.** The reviewer sample is the only check on it.
- **Another session edits the same files.** The primary checkout and other branches may
  change scripts and tests. The merge order decides the conflicts. The derived index files
  always conflict, and `build_index.py` rebuilds them.
