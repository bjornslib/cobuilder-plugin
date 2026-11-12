# Epic Technical Solution Design: E4 — VALIDATE evidence and the Structure block

Feature: structure-coaching
Epic ID: E4

## Scope and Intent

E4 gives VALIDATE evidence about the structure of the slice diff, and VALIDATE judges it beside the score. A script writes one evidence packet. It reports facts and no verdict. VALIDATE labels each finding and writes three judgments in a `### Structure` block outside `overall_score`. The vocabulary agent judges the vocabulary leads, because it is the one judge of names (ADR-0048 decision 15).

Slice 8 is the tracer. It carries one signal, Python contract drift, plus the boundary edges of E1, from the script to the block. Slice 11 adds each VALIDATE signal that the spike keeps. Slice 12 adds the vocabulary leads.

## Files Touched

- `shared/structure_evidence.py` (new, slice 8): the command, the slice diff, and the packet. PEP 723 header with `tree-sitter`, `tree-sitter-typescript`, and `pyyaml`. VALIDATE runs it with `uv run`.
- `shared/structure_drift.py` (new, slice 8): the public surface of a Python file with `ast`, and the drift events. Standard library only.
- `shared/structure_vocabulary.py` (new, slice 12): the glossary index and the leads.
- One module for each kept spike signal (slice 11), such as `shared/structure_cochange.py`.
- `plugins/implement/agents/validate.md` (slice 8): the step that runs the script and writes the block.
- `plugins/implement/skills/build/references/structure-judgment.md` (new, slice 8): the decision questions for VALIDATE. Judgment lives in a reference, not in the script.
- `plugins/implement/skills/build/references/slice-loop.md` (slice 8): record the slice base before RED, and pass the script path, the base, and the packet path to VALIDATE and VOCABULARY.
- `plugins/implement/agents/vocabulary.md` (slice 12): read the leads, and one rule for AVOID.
- `tests/test_structure_evidence.py`, `tests/test_structure_drift.py`, `tests/test_structure_vocabulary.py` (new)

## Types & Signatures

```python
# shared/structure_drift.py
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

# shared/structure_vocabulary.py
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

Each VALIDATE signal that the spike keeps gets one module, and one key in `findings`. The candidates are TypeScript contract drift with tree-sitter, a missing co-change partner, duplicated code, and consumer locality. `spike-signals.md` gives the algorithm, the defaults, and the filters for each kept signal. Consumer locality goes in `evidence`, never in `findings`, because it is evidence for the cohesion judgment only.

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

1. **Slice 8, the tracer.** Depends on E3. C1 to C5. Ends with a packet on a fixture repo and a blind VALIDATE that writes the block.
2. **Slice 11.** Depends on slice 8. C6. Ends with each kept signal on a fixture repo.
3. **Slice 12.** Depends on slice 11. C7. Ends with the leads in the packet and a blind vocabulary agent that judges them.

## Test Plan

Each case builds a `tmp_path` git repo with a base commit and a work-tree change.

- `test_structure_drift.py`: each of the eight event kinds from a before and after source. A private name gives no event. A syntax error gives `{}`.
- `test_structure_evidence.py`: an added, a modified, and an untracked file land in the right list. A changed raise gives one event with an untouched caller. A moved function gives no event. A boundary edge in an added line gives a finding, and the same text in an old line gives none. A bad base gives a `not_analysed` line and exit 0. The packet file has the C4 keys.
- Slice 11: one test file for each kept signal, with the false-positive filter that the spike names.
- `test_structure_vocabulary.py`: the index reads a synthetic glossary. A name with an avoided word gives a candidate with its reason. `also_defined` is true for a word that is another term. A missing glossary gives a `not_analysed` line.
- Blind passes: VALIDATE on a fixture slice for slice 8, and the vocabulary agent on a fixture slice for slice 12. Each transcript stays in the slice evidence.

## Risks & Open Questions

- `uv run` with tree-sitter needs a network on its first run. C5 states the fallback.
- The caller list matches names, so a common name such as `main` gives a long list. The cap of 10 and `callers_total` keep the packet small, and VALIDATE judges.
- The slice base depends on the main agent. When it does not record one, the merge-base gives a larger diff that holds earlier slices.
- Slice 11 depends on the spike. When the spike keeps no VALIDATE signal, slice 11 has no work and the engineer skips it with `skip-slice`.
