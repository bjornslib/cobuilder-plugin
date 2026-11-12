# Epic Technical Solution Design: E4 — VALIDATE evidence and the Structure block

Feature: structure-coaching
Epic ID: E4

## Scope and Intent

E4 gives VALIDATE evidence about the structure of the slice diff, and VALIDATE judges it beside the score. A script writes one evidence packet. It reports facts and no verdict. VALIDATE labels each finding and writes three judgments in a `### Structure` block outside `overall_score`. The vocabulary agent judges the vocabulary leads, because it is the one judge of names (ADR-0048 decision 15).

Slice 8 is the tracer. It carries one signal, Python contract drift, plus the boundary edges of E1, from the script to the block. Slice 11 adds each VALIDATE signal that the spike keeps. Slice 12 adds the vocabulary leads.

## Files Touched

- `shared/structure_evidence.py` (new, slice 8): the command, the slice diff, and the packet. PEP 723 header with `pyyaml`. The spike dropped TypeScript drift, so the first version needs no tree-sitter. VALIDATE runs it with `uv run`.
- `shared/structure/drift.py` (new, slice 8): the public surface of a Python file with `ast`, and the drift events. Standard library only.
- `shared/structure/vocabulary.py` (new, slice 12): the glossary index and the leads.
- `shared/structure/duplicates.py` (new, slice 11): the duplicated-code index, shared with E6.
- `shared/structure/locality.py` (new, slice 11): consumer locality from the import graph, shared with E6.
- `plugins/implement/agents/validate.md` (slice 8): the step that runs the script and writes the block.
- `plugins/implement/skills/build/references/structure-judgment.md` (new, slice 8): the decision questions for VALIDATE. Judgment lives in a reference, not in the script.
- `plugins/implement/skills/build/references/slice-loop.md` (slice 8): record the slice base before RED, and pass the script path, the base, and the packet path to VALIDATE and VOCABULARY.
- `plugins/implement/agents/vocabulary.md` (slice 12): read the leads, and one rule for AVOID.
- `tests/test_structure_evidence.py`, `tests/test_structure_drift.py`, `tests/test_structure_vocabulary.py` (new)

## Types & Signatures

```python
# shared/structure/drift.py
@dataclass(frozen=True)
class Surface:              # one public symbol
    name: str               # "f" or "Class.method"
    req: tuple[str, ...]; opt: tuple[str, ...]
    kw_req: tuple[str, ...]; kw_opt: tuple[str, ...]
    defaults: tuple[str, ...]     # ast.unparse of each default
    ret: str | None               # ast.unparse of the return annotation
    raises: frozenset[str]; catches: frozenset[str]

def public_surface(source: str) -> dict[str, Surface]: ...   # SyntaxError gives {}
def drift_events(before: dict[str, Surface], after: dict[str, Surface]) -> list[dict]: ...

# shared/structure_evidence.py
def slice_files(root: Path, base: str) -> dict[str, list[str]]: ...   # {"added": [...], "modified": [...]}
def added_lines(root: Path, base: str, path: str) -> list[int]: ...
def callers_untouched(root: Path, symbol: str, diff_files: set[str], cap: int = 10) -> list[str]: ...
def build_packet(root: Path, base: str) -> dict: ...
def main(argv: list[str]) -> int: ...   # --base <sha>, --out <path>; prints the packet path

# shared/structure/vocabulary.py
def glossary_index(root: Path) -> list[dict]: ...   # term, context, avoid: [{word, reason}]
def vocabulary_leads(names: list[str], index: list[dict]) -> dict: ...
```

## Algorithms

### C1. The slice base and the slice diff

1. Before RED starts, the main agent records `git rev-parse HEAD` as the slice base. `slice-loop.md` names this step.
2. The main agent passes `--base <sha>` in the VALIDATE spawn message. When it is absent, the script uses the merge-base with the default branch, as E1 A2 finds it.
3. `slice_files` runs `git diff -z --name-status --no-renames <base>` for the work tree, and adds each untracked file from `git ls-files --others --exclude-standard`. Status `A` and untracked files are `added`. Status `M` is `modified`. The excluded paths of E1 A1 apply.
4. `added_lines` reads `git diff -U0 <base> -- <path>` and keeps the line numbers of each `+` hunk.

### C2. Python contract drift (slice 8)

For each modified `.py` file that is not a test name:

1. Read the file at the base with `git show <base>:<path>`, and read the work tree file.
2. `public_surface` keeps each module-level function, each public method of a module-level class, and `__init__`. A name with a leading `_` is private, except `__init__`. For each symbol, it keeps the parameter lists, the defaults, the return annotation, the names in each `raise`, and the types in each `except`.
3. `drift_events` compares the two sides and gives one event for each change: `new-required-param`, `param-removed`, `param-order`, `default-changed`, `return-changed`, `raises-changed`, `catches-changed`, and `removed`.
4. Move filter: a `removed` symbol that another file of the work tree defines gets `moved_to` and no event.
5. `callers_untouched` lists each file outside the diff that holds the last part of the symbol name as a whole word, up to 10 files. The packet also gives `callers_total`.
6. Each event has a `class`: `input` for parameters and defaults, `output` for the return, and `error` for raises and catches.

Evidence from the research replay on this repo: 35 events in 250 commits after the move filter, at about 0.06 s for each commit. A raise that moved into a helper gives a false `raises-changed`. VALIDATE reads the helper and judges.

### C3. Boundary edges on the diff (slice 8)

The script runs E1 A9 and A10 on each added file, and on the added lines of each modified file. It also lists, for each touched context, each `forbidden_dependencies` target that is prose, as `boundary_rules_for_agent`. VALIDATE judges those rules against the diff. When `pyyaml` loads, the script reads each record in full. Else it uses the E1 line reader.

### C4. The packet

```json
{
  "schema": 1,
  "base": "<sha>",
  "files": {"added": [], "modified": []},
  "findings": [{"signal": "contract-drift", "path": "", "facts": {}}],
  "evidence": {"boundary_rules_for_agent": [], "vocabulary": {}},
  "not_analysed": []
}
```

The script writes the packet to the `--out` path: `.cobuilder/rubrics/<slug>/evidence/slice-<N>-packet.json`. Git ignores that folder. A git error, a parse error, or a failed import gives no finding and one `not_analysed` line. The script exits 0 in each case, and 2 for a usage error.

### C5. The Structure block (slice 8)

`validate.md` gets one step after the rubric score. VALIDATE runs the script with the path, the base, and the out path from the spawn message. Then it reads `structure-judgment.md` and writes the block:

```
### Structure

Script: <n> findings, <m> not analysed.

- [confirmed|accepted|dismissed] <signal> <path or symbol>
  Evidence: <file:line or packet fact>
  Reason: <one line>

Contract drift: <none | each symbol, with the caller at risk>
Cohesion: <one line for each added file: its reason to change, and fits | does not fit>
Dependencies: <none | each new edge, with the boundary rule it meets or breaks>
```

The labels are fixed, so E5 can count them. When `uv run` fails, VALIDATE writes the block from the diff alone and names the failure on the `Script:` line. A FAIL passes the block to the feedback file, as the Vocabulary block goes today. Slice 3 (E2) owns the wording of this format. Slice 8 uses it.

### C6. Spike signals (slice 11)

The agencheck spike (`spike-signals.md`) kept two VALIDATE signals and dropped two.

| Signal | Result on agencheck | Decision |
|---|---|---|
| Duplicated code | 26 change findings after filters A and B, precision 92% | Slice 11, in `findings` |
| Consumer locality | 16 findings, 3 `act`, 13 `keep`, 0 `false` | Slice 11, in `evidence` only |
| TypeScript contract drift | 0 `act` in 30 labels. The project compiler covers it | Dropped |
| Missing co-change partner | 1 `act` in 19, and 2 in 20 | Dropped from VALIDATE. E6 keeps the pair table |

**Duplicated code** (`duplicate-block`):

1. Take the product code files: code files that are not test names.
2. Strip each line. Drop a line with fewer than 4 characters, and a line that starts with `#`, `//`, `*`, `/*`, `import `, `from `, `export {`, `}`, `)`, or `]`.
3. Replace each string literal with `S` and each number with `0`. Make each run of white space one space.
4. Hash each window of `dup_window` lines (6) with `dup_min_chars` characters or more (120).
5. Filter A: a window needs 4 or more distinct lines. Filter B: drop a window with 4 or more lines of the form `name=value,` or `name: type,`.
6. A duplicate window is a hash in two files or more. Merge windows that follow each other in both files into one block.
7. Keep a block only when its lines in the slice file all lie in an added range of C1. One finding is one pair of a slice file and another file. When both files are in the slice, keep one finding for the pair.

`facts`: `lines`, `other`, `other_lines`, and `size`. Cost on agencheck: 0.33 s for the index of 791 files.

**Consumer locality** (`evidence.consumer_locality`):

1. Build the import graph of the code files with the reader of E1 A9.
2. For each added product file, take its product importers. The fact holds when two or more importers exist, all in one folder that is neither the folder of the file nor an ancestor of it.
3. Drop it when that consumer folder imports 3 or more files of the folder of the file. This layer filter removed 6 `keep` findings and no `act` on agencheck.
4. Give `importers_by_folder` and `sole_consumer_folder`. VALIDATE uses it only for the cohesion judgment.

Cost on agencheck: 0.9 s for the graph of 1,285 code files.

### C7. Vocabulary leads (slice 12)

1. `glossary_index` reads each entry of `DDD-VOCABULARY.md`: the term, its context, and each `_Avoid_` word with the reason text of the entry. No glossary gives an empty index and a `not_analysed` line.
2. The names are the stems of each added or renamed file and folder, and each added public symbol from C2.
3. `vocabulary_leads` splits each name with E1 A5 and gives:
   - `avoid_candidates`: each name with a token that is an avoided word, with the entry, the reason, `also_defined` (the word is the term of another entry), and `in_entry_context`.
   - `defined_terms_used`: each glossary term in a name, with `cross_context` when the context of the term differs from the context of the path.
   - `new_tokens`: each token that no term and no existing file name holds.
4. The packet puts the leads in `evidence.vocabulary`. The build skill passes the packet path to the vocabulary agent.
5. `vocabulary.md` gets one rule: "A candidate is a lead. Tag `[AVOID]` only when the name means the concept of the entry that the word lost to." The agent still reads the whole glossary, and its three tags do not change.

Evidence on this repo: a plain match gave 25 hits and none was real. Five of the six words are terms of another entry, which `also_defined` shows.

## Slice Decomposition

1. **Slice 8, the tracer.** Depends on E3. C1 to C5. Test the move filter of C2 against a real `git grep`, because the spike found that a first pattern matched nothing. Ends with a packet on a fixture repo and a blind VALIDATE that writes the block.
2. **Slice 11.** Depends on slice 8. C6. Ends with each kept signal on a fixture repo.
3. **Slice 12.** Depends on slice 11. C7. Ends with the leads in the packet and a blind vocabulary agent that judges them.

## Test Plan

Each case builds a `tmp_path` git repo with a base commit and a work-tree change.

- `test_structure_drift.py`: each of the eight event kinds from a before and after source. A private name gives no event. A syntax error gives `{}`.
- `test_structure_evidence.py`: an added, a modified, and an untracked file land in the right list. A changed raise gives one event with an untouched caller. A moved function gives no event. A boundary edge in an added line gives a finding, and the same text in an old line gives none. A bad base gives a `not_analysed` line and exit 0. The packet file has the C4 keys.
- `test_structure_duplicates.py` and `test_structure_locality.py` (slice 11): a copied block of 8 lines in an added file gives one finding. A row-of-literals block and a named-argument block give none (filters A and B). A copy in an old line gives none. A pair of two slice files gives one finding. A file with two importers in one other folder gives the locality fact. The layer filter drops it when that folder imports 3 files of its folder.
- `test_structure_vocabulary.py`: the index reads a synthetic glossary. A name with an avoided word gives a candidate with its reason. `also_defined` is true for a word that is another term. A missing glossary gives a `not_analysed` line.
- Blind passes: VALIDATE on a fixture slice for slice 8, and the vocabulary agent on a fixture slice for slice 12. Each transcript stays in the slice evidence.

## Risks & Open Questions

- `uv run` with PyYAML needs a network on its first run. C5 states the fallback.
- The caller list matches names, so a common name such as `main` gives a long list. The cap of 10 and `callers_total` keep the packet small, and VALIDATE judges.
- The slice base depends on the main agent. When it does not record one, the merge-base gives a larger diff that holds earlier slices.
- Each filter of slice 11 was tested on agencheck only, after the false findings were seen. A filter can overfit, and E5 labels the findings again.
