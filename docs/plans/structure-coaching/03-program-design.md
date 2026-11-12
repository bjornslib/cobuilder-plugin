# Program Design: Structure signals coach GREEN, and VALIDATE reports them beside the slice score

Memory before Gate 3: absent. The `consult` tool answered that the Hindsight server is not found.

## Files

| File | New or changed | Reason |
|---|---|---|
| `shared/structure_signals.py` | New | The three signals and the new-file rule. Standard library only, so the coach can import it without `uv`. About 180 lines. |
| `shared/structure-messages.json` | New | The approved message template for each signal. Data, not prose that steers the script. |
| `plugins/implement/scripts/structure_runner.py` | New | The bridge between the coach and the script: wording, the session record, and the text. `habit_coach.py` already has 240 lines, so the new code goes here. |
| `plugins/implement/scripts/habit_coach.py` | Changed | Skips habit-hooks for an extension outside `SOURCE_EXTENSIONS`, calls the second runner, and joins the two texts. About 15 new lines. |
| `plugins/implement/scripts/agent_use.py` | New | The agent-use check for one slice. `verify_gate.py` has 569 lines, so the check goes in its own module. |
| `plugins/implement/scripts/verify_gate.py` | Changed | A `--slice <N>` option that runs only the agent-use check. |
| `plugins/implement/agents/validate.md` | Changed | The `### Structure` block step and its format. VALIDATE runs `structure_signals.py --file` on the new files of the slice. |
| `plugins/implement/skills/build/references/slice-loop.md` | Changed | Stronger agent-use text, the check before a slice closes, and the structure script path in the VALIDATE spawn message. |
| `plugins/implement/skills/build/SKILL.md` | Changed | One line that points to the check in the slice loop. |
| `plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/SKILL.md` | Changed | A step that writes the default config, after the engineer approves it. |
| `tests/test_structure_signals.py` | New | Synthetic folder trees in `tmp_path` git repos. |
| `tests/test_structure_runner.py` | New | Wording, the session record, and no repeat. |
| `tests/test_habit_coach.py` | Changed | New cases for an unscanned extension and for the joined text. The existing tests stay. |
| `tests/test_agent_use.py` | New | The four cases of the effect check. |
| `docs/plans/structure-coaching/evaluation.md` | New | The replay record (E5). |
| `plugin.json` and `marketplace.json` of `implement` and `cobuilder-full-lifecycle` | Changed | The version bump, so installed copies get the change. |

## Types & signatures

`shared/structure_signals.py`:

```python
@dataclass(frozen=True)
class Config:                       # defaults and evidence: epic-E1-design.md A1 to A7
    folder_limit: int | None        # default 15; None means percentile only
    percentile: int                 # default 90
    min_folders: int                # default 10
    cluster_min: int                # default 3
    generic_names: frozenset[str]   # default: utils, util, helpers, helper, common, misc, manager, base
    excluded_stems: frozenset[str]  # default: a, an, the, index, main, init
    excluded_paths: tuple[str, ...] # default: .*/**, docs/**, **/fixtures/**, and four more
    test_prefixes: tuple[str, ...]  # default: ("test_", "test-")
    test_suffixes: tuple[str, ...]  # default: (".test", ".spec", "_test")
    problem: str | None             # why the config file was not used, or None

@dataclass(frozen=True)
class Finding:
    signal: str        # "crowded-folder" | "name-stem-cluster" | "generic-name"
    path: str          # repo-relative path of the written file
    folder: str        # repo-relative folder
    facts: dict[str, int | str]   # such as {"count": 24, "limit": 11}

    def key(self) -> str: ...     # signal + folder + stem, for the session record

@dataclass(frozen=True)
class Report:
    findings: tuple[Finding, ...]
    not_analysed: tuple[str, ...] # excluded paths and reasons

def load_config(root: Path) -> Config: ...         # missing or bad file gives the defaults
def repo_files(root: Path) -> list[str]: ...        # git ls-files --cached --others --exclude-standard
def excluded_by(rel: str, config: Config) -> str | None: ...   # the matching glob
def new_files(root: Path) -> frozenset[str]: ...    # untracked, staged added, added since merge-base
def folder_counts(files: list[str]) -> dict[str, int]: ...
def folder_limit(counts: dict[str, int], config: Config) -> int | None: ...
def split_tokens(stem: str) -> list[str]: ...
def is_test_name(name: str, config: Config) -> bool: ...
def crowded_folder(rel: str, files: list[str], counts: dict[str, int], limit: int) -> Finding | None: ...
def stem_cluster(rel: str, files: list[str], config: Config) -> Finding | None: ...
def generic_name(rel: str, config: Config) -> Finding | None: ...
def signals_for(path: str, root: Path, config: Config) -> Report: ...
def main(argv: list[str]) -> int: ...   # --file <path> (repeatable), --survey, --defaults; prints JSON
```

`plugins/implement/scripts/structure_runner.py`:

```python
def load_messages(path: Path) -> dict[str, str]: ...
def render(finding: Finding, messages: dict[str, str]) -> str: ...
def seen_keys(session_id: str | None) -> set[str]: ...
def remember(session_id: str | None, keys: set[str]) -> None: ...
def run(path: str, session_id: str | None) -> tuple[int, str]: ...  # (1, text) or (0, "")
```

`plugins/implement/scripts/habit_coach.py`:

```python
def scanned(path: str) -> bool: ...   # extension in SOURCE_EXTENSIONS
def main(stdin, stdout, runner=run_habit_hooks, structure=structure_runner.run, argv=None) -> int: ...
```

`plugins/implement/scripts/agent_use.py`:

```python
def check_slice(plan_dir: Path, rubrics_dir: Path, slice_id: int) -> str: ...  # "ok" or a reason
```

The effect that `check_slice` reads is an open decision. Slice 6 settles it from the spike, as ADR-0048 decision 9 says.

## Call stack

GREEN write:

```
habit_coach.main
├── is_green, target_path
├── scanned(path) ? run_habit_hooks(path) : (0, "")
├── structure_runner.run(path, payload["session_id"])
│   ├── structure_signals.load_config(root)
│   ├── structure_signals.signals_for(path, root, config)
│   │   ├── new_files(root)   # returns early when path is not new
│   │   ├── crowded_folder / stem_cluster / generic_name
│   ├── seen_keys / render / remember
└── render(code, joined_message) -> additionalContext JSON, exit 0
```

VALIDATE, after it scores the rubric (E4):

```
VALIDATE
├── git diff of the slice -> the files that the slice added
├── python3 <structure script> --file <f1> --file <f2> ...   # path from the spawn message
│   └── signals_for(f, root, config) for each file -> JSON
└── writes ### Structure: each finding confirmed or dismissed, then
    contract drift, cohesion, and each new dependency against boundary.yaml
```

VALIDATE runs `structure_signals.py`, not `structure_runner.py`. The runner exists for the coach: the wording and the session record. VALIDATE needs the plain findings, and it judges them itself. The build skill puts the absolute script path in the spawn message, so `validate.md` names no plugin path.

Slice close:

```
main agent -> verify_gate.py --plan <dir> --slice <N>
└── agent_use.check_slice(plan_dir, rubrics_dir, N) -> "ok" | reason, exit 0 or 1
```

## Test plan

| Test file | Cases |
|---|---|
| `test_structure_signals.py` | The cases in the test plan of `epic-E1-design.md`, one or more for each step A1 to A8. |
| `test_structure_runner.py` | Each signal renders with its template. A second call in the same session gives no text. A new session gives the text again. A missing `session_id` gives the text with no record. A bad record file does not raise. |
| `test_habit_coach.py` | A `.go` file gives a structure message and no habit-hooks call. A `.py` file gives the joined text. The coach still returns 0. The existing cases, which include the two cases where the hook must not run `uv`, still pass. |
| `test_agent_use.py` | No attempt file fails. A pass at attempt 1 passes. A workflow-mode slice passes. A slice that the main agent wrote fails. |
| Blind passes | The coaching language (slice 3), the loop text (slice 7), and the Structure block (slice 8). Each transcript stays in the slice evidence. |

Test rules from the repo: test effects and structure, not wording. Use `tmp_path` git repos for the folder trees. Do not run a real `bd` in the fast suite.

## Least confident decisions

1. **The agent-use effect.** It is still open. The VALIDATE attempt file cannot see a main agent that writes the code and then spawns only VALIDATE.
2. **The percentile on small repos.** The 90th percentile of a repo with eight folders is a weak base. The engineer limit may need to be the main rule.
3. **The import path from the coach to `shared/`.** The coach reaches the script through the `plugins/implement/shared` symlink. A cache install must keep that symlink.
4. **The no-repeat key.** A key of signal, folder, and stem may hide a second real problem in the same folder.
5. **The cost per write.** One write runs git about five times. On this repo the calls take about 180 ms in total. The spike measures one real write.
6. **The generic-name source.** ADR-0048 decision 2 starts the list from the `_Avoid_` terms of the glossary. Those terms give false signals, such as `reader.py`. The E1 design uses the config list only, until the engineer decides.
