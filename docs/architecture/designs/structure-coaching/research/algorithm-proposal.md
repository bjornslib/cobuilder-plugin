# Structure-coaching algorithms: a proposal with calibration data

Date: 2026-11-12. Repo commit: `86f4295` on `design/structure-coaching`.
All numbers come from throwaway scripts in
`/private/tmp/claude-503/-Users-theb-Documents-Windsurf-cobuilder-plugin/9114643d-8786-4943-968a-920b67255846/scratchpad/fable/`.
The scripts read the repo only. They changed no repo file.

## 0. The short answer

The three current signals look at one file and one folder. The data says that this view is the weak one.
The strong evidence is in the change, not in the place.

1. **Keep the coach small.** Four cheap signals for a new file: crowded folder with named groups, name family, generic name, and a new one, twin name. Add one boundary check on the lines of the new file.
2. **Move the weight to VALIDATE.** Three new evidence sets carry most of the value: contract drift on public signatures, a missing co-change partner, and duplicated new code. Each one gives the agent a named symbol or a named file, not a metric.
3. **Drop the placement score.** I tested "which folder does this file belong to" two ways. The own folder was the best match for 47% of files by imports and 35% by name tokens. That is not good enough to coach with.
4. **Do not match `_Avoid_` words in a script.** A token match on file and folder names gave 25 hits and 0 true ones. The script builds a glossary index. The vocabulary agent stays the one judge.
5. **Use folder metrics (Cluster Factor, instability) for review mode only.** On this repo they flag "kind" folders such as `hooks/` and `scripts/`, and the Stable Dependencies check flags only parent-to-child imports.

Value per cost, best first:

| Rank | Signal | Runs at | Cost here | Findings here | First precision estimate |
|---|---|---|---|---|---|
| 1 | V1 Contract drift | VALIDATE | 0.06 s per commit | 35 events in 250 commits, after the move filter | High for input and error classes. Needs labels |
| 2 | V2 Missing co-change partner | VALIDATE | 81 ms git log + 15 ms | 51 warnings in 218 commits | 39% changed within 5 commits. Base rate 10% |
| 3 | P5/V5 Boundary edge | Coach and VALIDATE | 3 ms | 9 path strings, 0 bad imports | 6 of 9 match smells that `boundary.yaml` already records |
| 4 | V3 Duplicated new code | VALIDATE | 112 ms index | 50 file pairs, 71 blocks | Top hit is a real 63-line clone |
| 5 | P4 Twin name | Coach | 0 ms extra | 29 files, about 15 pairs | About 1 in 4. Cheap, and it asks a reuse question |
| 6 | P1 Crowded folder with groups | Coach | 2 to 34 ms | 5 code folders | Folder-level. One message per folder |
| 7 | P2 Name family, P3 Generic name | Coach | 0 ms extra | 60 and 1 | As in the E1 design |
| 8 | V4 Consumer locality | VALIDATE | graph, 550 ms | 6 and 10 | About 1 in 3. Evidence only, never a finding alone |
| 9 | R1 to R4 Folder metrics, hotspots | Review | 550 ms + git log | 34 folders | Mixed. Trend only |

## 1. What the calibration found

Set-up: 1,022 files after the default excluded paths. 620 code files: 262 Python and 358 TypeScript. 331 are product code and 289 are tests. A stdlib import parser (Python `ast`, one regex for TypeScript, the `@/` alias) resolved 1,614 edges in 550 ms. Two TypeScript specifiers did not resolve. History: 506 commits without merges.

The ratchet is simulated. "New" means added since the merge of PR #42 (`3c41034`, 2026-10-17): 755 files, 434 after excluded paths, 222 product code files. The counts use the tree at `HEAD`, not the tree at the time of each write. That inflates folder counts a little.

### 1.1 The three current signals

| Signal | Findings on 434 new files | Note |
|---|---|---|
| Crowded folder, limit 15 | 237 | 156 are test files. 127 sit in `tests/`. Six folders in total |
| Name-stem cluster | 60 | 23 in `shared/tracker_port` (`beads_*`, `fake_*`, `plan_*`) |
| Generic name | 1 | `sections/common.tsx` |

Two facts matter. First, 55% of new files fire the crowded signal, and two thirds of those are tests. `plugins/artifact/viewer/src/shell` has 65 files, but 46 are tests and only 19 are product code. Second, the count gives the agent no choice to make. `shared/tracker_port` has 40 files in one import component, with token families `beads` (14), `fake` (5), and `plan` (4). The families are the useful part.

### 1.2 Placement score (tested, then dropped)

Leave-one-out test on 331 product files. For each file, pick the folder that holds most of its import neighbours.

| Variant | Files with 3 or more neighbours | Own folder is top-1 | Flagged as misplaced |
|---|---|---|---|
| Imports the file makes (coach time) | 144 | 68 (47%) | 36 |
| Imports both ways (VALIDATE time) | 229 | 122 (53%) | 24, of which 18 point to a parent or child folder |
| Name tokens, IDF weighted | 259 | 91 (35%) | 36 |

A file imports its dependencies, and they live in a lower layer. So `verify_gate.py` "belongs" in `shared`, which is wrong. The token variant sends `shared/strip_goal_stage.py` to a viewer folder. I recommend no placement score in any phase.

One narrow form survives as evidence, **consumer locality**: a file whose importers all sit in one other folder that is not an ancestor. Six hits at `HEAD`. `shell/workDeck.ts` has 7 importers, all in `shell/drawer` (true). `shell/app/railKeys.ts` is used only by `app/state` (true). `Pager.tsx`, `TopBar.tsx`, and `sections.tsx` are entry components beside a folder of the same name (a convention). `panels/index.ts` is a barrel (false).

### 1.3 Folder metrics

Cluster Factor per folder, on product code, with the TurboMQ form: `CF = 2μ / (2μ + ε_out + ε_in)`.

| Folder | Files | μ | out | in | CF | My label |
|---|---|---|---|---|---|---|
| `viewer/src/shell` | 19 | 2 | 78 | 151 | 0.02 | True. 15 of 19 files import no sibling |
| `viewer/src/data` | 6 | 7 | 19 | 106 | 0.10 | Plausible. A facade over three sub-folders |
| `plugins/artifact/scripts` | 10 | 0 | 7 | 0 | 0.00 | False. Stand-alone CLI scripts |
| `plugins/pr/scripts` | 6 | 0 | 8 | 0 | 0.00 | False. Same reason |
| `shell/hooks`, `shell/pager` | 6, 5 | 0 | | | 0.00 | False. A folder of one kind of thing |
| `shared/tracker_port` | 40 | 123 | 7 | 8 | 0.94 | Cohesive, and also the most crowded |

Seven folders of three or more files fall under the 0.25 limit of the research spec. Two or three are real. A folder of one kind (hooks, scripts, ui atoms) has a low CF by design. Also, the most crowded code folder has the best CF. Crowding and cohesion are different axes.

Stable Dependencies check at folder level: 54 of 494 cross-folder edges go from a more stable to a less stable folder (`I` difference above 0.2). All 11 folder pairs are a parent that imports its own child folder. That is the normal direction in a nested tree. Mutual folder pairs: 14 of 99, and 12 are parent and child. Folder-level direction metrics give no usable signal on a nested tree. Direction belongs at context level, where `boundary.yaml` already states it.

### 1.4 Boundary edges

A 20-line stdlib reader gets `id`, `path`, `allowed_dependencies`, and each `forbidden_dependencies` target from the six `boundary.yaml` files in 1.7 ms.

- 18 import edges cross a context. All go to `shared`. None breaks `allowed_dependencies`.
- 33 forbidden targets exist. Only 7 are path globs that a script can check. The other 26 are prose, such as "bare Skill name 'architecture'". The agent must judge those.
- A scan for `plugins/<other>/` path strings in product code gives 9 hits in 6 files. Six are the smells that the boundary records already name by hand: `verify_gate.py:102`, `_bundle_meta.py:32`, `migrate_bundle.py:344` and `:577`, `slice_table.py:23`. Three are false (`plugins/cache`, the install cache).

In this repo the plugins couple through path strings and `Skill("...")` names, not through imports. An import-only parser finds nothing here. The path-string scan found what a human reviewer found.

### 1.5 Co-change

One `git log --name-only` call takes 81 ms. Commits with more than 30 files are skipped. For each of the last 218 usable commits, the script used only older history, and warned when a touched file `a` has a partner `b` that the commit did not touch.

| Support, confidence | Commits warned | Warnings | Partner changed within the next 5 commits |
|---|---|---|---|
| 3, 0.5 | 51% | 478 | 28% |
| 4, 0.6 | 29% | 157 | 30% |
| **5, 0.7** | **15%** | **51** | **39%** |
| 5, 0.8 | 10% | 29 | 45% |

Base rate: an untouched file with 5 or more past commits changes within the next 5 commits in 10.0% of cases (1,427 of 14,273). So the warning carries about a 4 times lift at support 5 and confidence 0.7. This is a proxy, not a label. A partner that did not change later can still be a real miss.

True examples: `tracker_port/port.py` changed without `fake.py` (8 of 8 past commits) and without `files.py` (6 of 8). Both partners changed within 5 commits. That is contract drift between a port and its adapters. Noise examples: the `plugin.json` version files of sibling plugins.

Cross-folder pairs that change together (support 4, Jaccard 0.5): 26. Five are a code file and its test, 14 are design records with their ADR, and about 6 are code, such as `slice-loop.md` with `slice-loop.js` and `verify_gate.py` with `shared/gate_status.py`. Low yield, so review mode only.

### 1.6 Contract drift

Python `ast` reads the public surface of each modified product file before and after: required and optional parameters, defaults, return annotation, the set of raised exceptions, and the set of caught exceptions. Replay on 250 commits took 16 s.

- 71 commits modify product Python. 22 commits hold 91 raw events.
- 58 events are "removed". A move filter (the name is defined in another file after the change) and a user filter (some file outside the commit still names it) leave 2, and both are `parse_args`, a false match on a common name.
- That leaves 10 parameter events and 23 error-handling events. 18 of the 23 have a referencing file outside the commit. Example: `BeadsAdapter.sync` raises `AdapterError` before and nothing after, with 5 untouched files that name `sync`.
- TypeScript, export names only, by regex: 243 removed exports in 6 commits. 239 are moves from the viewer split, 4 are dead, 0 are live. Name-level drift in TypeScript is empty. Signature-level drift needs a real parser.

A raise that moved into a helper shows as an error-class event and is a false positive. The agent must read the helper. That is a judgment, so it stays with the agent.

### 1.7 Duplication

Lines are normalised (strings to `S`, numbers to `0`, no imports, no comments), and each window of 6 lines with 120 or more characters is hashed. The index of 331 files takes 112 ms.

- 71 duplicate windows across files, in 50 file pairs.
- `pr/scripts/extract_diffs.py` and `extract_story.py` share about 63 lines. The six `pr/scripts` files share 10 to 14 lines pairwise. `artifact/scripts/export_artifact.py` shares a 9-line block with seven other scripts.
- `plugins/implement/scripts/tracker_sync_common.py` and `shared/tracker_port/sync_state.py` share 7 lines across a context boundary.

PEP 723 scripts repeat a preamble by design, so short blocks in `scripts/` folders are a known false-positive class. The 63-line pair is real.

### 1.8 Twin names and the glossary

Twin name: a new code file whose stem already exists in another folder. 29 files in about 15 pairs. `app/indexLoad.ts` (exports `useIndexState`) and `shell/hooks/indexLoad.ts` (exports `useIndexLoad`) do not import each other and both load the index. That is the reuse case the signal is for. `sections.tsx` exists in five folders as a role name, which is a convention.

Glossary: the parser reads 54 entries, 38 with `_Avoid_`, and 60 avoided words in 0.7 ms. A token match of the avoided words on file and folder names gives 25 hits: `Review` 9, `slice` 5, `ADR` 5, `epic` 3, `VALIDATE` 2, `reader` 1. None is a real violation. Five of the six words are also defined terms in another entry. A filter on the context path of the entry leaves 10 hits, and still none is real.

## 2. Signal catalogue

Common rules. Each signal emits evidence and no judgment. Each default is a config value in `.cobuilder/structure-signals.json`. A git error or a parse error gives no finding and one `not_analysed` line. Test names are as in E1 A5.

### Coach time: per write, new files only, standard library only

**P1. Crowded folder with groups** (replaces E1 signal 1)

- Targets: flat packing.
- Inputs: the file list of E1 A1, the written path.
- Steps:
  1. Count the **non-test** files in each folder. The limit is `max(folder_limit, p90)` over those counts. Default `folder_limit` is 15. Here p90 is 14.
  2. The signal fires when the written file is new, is not a test, and its folder count is over the limit.
  3. Build the groups of the folder. A token family is two or more siblings with the same first token. An import component is a connected set of siblings, from a parse of the siblings only. Parse at most `sibling_parse_max` files (default 60). Above that, emit token families only and say so.
  4. Emit `count`, `limit`, `families` (name and size), `components` (size and up to five names), `singletons`, and `nearest_group`: the family or component that the written file joins, or `null`.
- Cost: 34 ms for 40 Python siblings with `ast`, 2 ms for 65 TypeScript siblings with a regex.
- Ratchet: new files only. The key is `crowded-folder|<folder>`, so one message per folder per session.
- False positives: a reference collection, a folder of one kind (`components/ui`), a framework folder. The excluded paths cover them.
- Decision for GREEN: "This folder holds N files in these groups. Does the new file belong to one group? If yes, do you move that group to a sub-folder now, or keep the layout and say why?"
- Effect on this repo: `tests/` (179) and the 46 tests of `shell` no longer count. Five code folders stay over the limit: `tracker_port` 40, `change` 21, `app` 19, `shell` 19, `shared` 19.

**P2. Name family** (E1 signal 2, unchanged). When P1 fires for the same folder, the runner merges P2 into the P1 message, because the family is one of the P1 groups.

**P3. Generic name** (E1 signal 3). The list comes from the config only. It does not start from `_Avoid_`. See 3.3.

**P4. Twin name** (new)

- Targets: missed reuse, and two names for one concept.
- Steps: the written file is new, is code, and is not a test. Its lower-case stem equals the stem of one or more other non-test code files. Skip the stems in `twin_excluded_stems` (default `index`, `__init__`, `main`, `types`, `conftest`). Emit up to three twin paths. Emit `same_context: true` when a twin sits under the same `boundary.yaml` path.
- Cost: none beyond the file list.
- False positives: a role name that each folder repeats on purpose (`sections.tsx`, `types.ts`). The engineer adds it to the excluded stems.
- Decision: "A file named X exists at Y. Is yours the same concept? If yes, extend or import Y. If no, pick a name that says the difference."

**P5. Boundary edge** (new, a minimal part of E7 pulled forward)

- Targets: a dependency across a bounded context.
- Inputs: the text of the written file, and each `docs/architecture/contexts/*/boundary.yaml`, read with a line reader for `id`, `path`, `allowed_dependencies`, and the `target` and `from` of each `forbidden_dependencies` entry.
- Steps:
  1. The context of a file is the boundary `path` that is its longest prefix. No context gives no finding and a `not_analysed` line.
  2. Collect the outgoing references of the file: resolved imports (Python `ast`, a regex for TypeScript and JavaScript), and each literal string that starts with the `path` of another context.
  3. A reference is `outside-allowed` when its target context is not in `allowed_dependencies`. A reference is `forbidden-glob` when it matches a forbidden target that is a path glob.
  4. Emit each hit with the line number, the line text, the rule text (`why`), and `in_comment: true|false`.
- Cost: 1.7 ms to read six records, about 1 ms to parse one file.
- Ratchet: at coach time, the whole new file. At VALIDATE, also the added lines of each modified file.
- False positives: a path in a comment or a docstring, the install-cache path `plugins/cache/`, a test that names a path on purpose.
- Decision: "This line names context B from context A, and the record of A does not allow it. Do you go through the public interface of B, move the code to `shared`, or is the rule out of date?"
- This is an import check in the first version, which `intent.json` puts out of scope. See section 6.

### VALIDATE time: per slice, on the diff against the merge-base

**V1. Contract drift** (highest value)

- Targets: silent drift in inputs, outputs, and error handling. The CodeThread result (odds ratio 1.83) is the only behaviour-linked predictor in the research.
- Inputs: each product file with status `M` in the slice diff, before (`git show <merge-base>:<path>`) and after.
- Steps:
  1. Read the public surface of each side. A public symbol is a module-level function, a public class method, or `__init__`, with no leading underscore. For each: `req`, `opt`, `kw_req`, `kw_opt`, `defaults`, `ret`, `raises` (names in `raise`), `catches` (types in `except`).
  2. Emit one event per change: `new-required-param`, `param-removed`, `param-order`, `default-changed`, `return-changed`, `raises-changed`, `catches-changed`, `removed`.
  3. Move filter: drop `removed` when another file defines the name after the change. Mark it `moved_to`.
  4. For each event, list `callers_untouched`: files outside the diff that hold the name as a whole word. Cap the list at ten.
  5. Class: `input`, `output`, or `error`.
- Python uses `ast`. For TypeScript, use tree-sitter in the VALIDATE script. See section 5.
- Cost: 0.06 s per commit in the replay.
- Ratchet: an event exists only when the slice changed the symbol. Legacy code gives nothing.
- False positives: a raise that moved into a helper, a common name such as `parse_args` or `main` in the caller list, a symbol that is public by name but used in one file.
- Decision for VALIDATE, per event: "Did the contract really change for a caller? If yes, did the slice update or test each untouched caller? Does the rubric or the design name this change?"

**V2. Missing co-change partner**

- Targets: an incomplete change. A port without its adapters, code without its usage document.
- Inputs: one `git log --no-merges --name-only --no-renames` on the merge-base, and the file set of the slice.
- Steps: skip commits with more than `cochange_max_files` (30). `count(a)` is the commits that touch `a`. `support(a,b)` is the commits that touch both. For each slice file `a` with `count(a) >= 5`, emit each `b` outside the slice with `support >= 5` and `support / count(a) >= 0.7`. Emit `support`, `count`, and the subjects of the last two shared commits.
- Drop a partner that matches `cochange_ignored` (default `**/plugin.json`, `**/marketplace.json`, lock files, generated files).
- Cost: about 100 ms.
- Ratchet: fires only for files the slice touches. A young repo, or a new file, has no history and gives nothing. Say so in `not_analysed`.
- False positives: version files, a pair that co-changed during one long epic and is now stable, a bulk format commit under the size cap.
- Decision: "File B changed with A in s of n past commits. Does this slice need a change in B? If not, say why in one line."

**V3. Duplicated new code**

- Targets: missed reuse.
- Steps: normalise lines as in 1.7. Hash each window of `dup_window` lines (6) with `dup_min_chars` or more (120). Index all product code. For each file the slice added, and for the added line ranges of each modified file, report each other file that shares a window. Merge adjacent windows into one block with both line ranges.
- Cost: 112 ms for the index.
- Ratchet: only blocks whose new side is in the slice diff.
- False positives: the PEP 723 preamble, argparse set-up, JSX prop lists, a test fixture.
- Decision: "These N lines also exist at Y. Do you import Y, extract both to one place, or is the copy on purpose (a stand-alone script)?"

**V4. Consumer locality** (evidence for the cohesion judgment, never a finding alone)

- Steps: build the import graph once (550 ms). For each file the slice added, emit `importers_by_folder`, `imports_by_folder`, `sibling_edges`, and two flags. `sole_consumer_folder` is set when two or more importers all sit in one folder that is neither the folder of the file nor an ancestor of it. `no_sibling_edge` is set when the folder has four or more product files, the file has two or more neighbours, and none is a sibling.
- False positives: an entry component beside its folder, a barrel file, a folder of one kind.

**V5. Boundary edge on the slice diff.** The same algorithm as P5, for each new file and for the added lines of each modified file.

**V6. Vocabulary candidates.** See 3.3. Evidence for the vocabulary agent, not for VALIDATE.

### Review time: per repo (E6)

- **R1. Folder table.** For each folder with three or more product code files: `n`, `μ`, `ε_out`, `ε_in`, `CF`, instability `I = ε_out / (ε_out + ε_in)`, component count, and test share. Review mode shows the table and the change since the last report. No fixed CF limit. The agent reads the lowest rows and the rows that fell.
- **R2. Context direction.** Cross-context edges against `boundary.yaml`, as one table. This feeds the E7 diagram.
- **R3. Cross-folder co-change pairs.** Support 4 and Jaccard 0.5, without code-and-test pairs.
- **R4. Hotspot order.** Sort the findings by the commit count of the target in the last 90 days. No formula with weights.

### Dropped, with the reason

| Candidate | Reason |
|---|---|
| Placement affinity by imports or tokens | 47% and 35% top-1 on this repo |
| "Stranger" file (no token or import link to a sibling) | 24 hits, about 4 real. Folders of one kind dominate |
| Stable Dependencies check between folders | All 11 flagged pairs are parent to child |
| CF limit 0.25 as a finding | 4 of 7 flagged folders are false |
| `_Avoid_` match as a finding | 0 of 25 |
| UIOD and DIOE | Formula not verified. Mutual folder pairs give nothing here |
| Hotspot Priority Score | Weights and form have no source |
| Fixed limit of 10 files, "Rule of Seven" | No source, as the earlier synthesis found |

## 3. The neuro-symbolic split

### 3.1 What the script emits

One packet shape for every caller. The coach gets the `coach` signals for one path. VALIDATE gets all of them for the slice.

```json
{
  "schema": 1,
  "base": "<merge-base sha>",
  "files": {"added": ["..."], "modified": ["..."]},
  "findings": [
    {"signal": "crowded-folder", "path": "shared/tracker_port/beads_x.py", "folder": "shared/tracker_port",
     "facts": {"count": 41, "limit": 15,
               "families": [{"token": "beads", "size": 15}, {"token": "fake", "size": 5}],
               "components": [{"size": 41, "examples": ["beads.py", "port.py"]}],
               "singletons": 0, "nearest_group": "beads"}},
    {"signal": "twin-name", "path": "...", "facts": {"stem": "indexload", "twins": ["plugins/.../hooks/indexLoad.ts"], "same_context": true}},
    {"signal": "boundary-edge", "path": "...", "facts": {"line": 102, "text": "...", "from_context": "implement",
               "to_context": "artifact", "kind": "forbidden-glob", "rule": "<why text>", "in_comment": true}},
    {"signal": "contract-drift", "path": "shared/tracker_port/beads.py",
     "facts": {"symbol": "BeadsAdapter.sync", "class": "error", "kind": "raises-changed",
               "before": ["AdapterError"], "after": [], "moved_to": null,
               "callers_untouched": ["shared/tracker.py", "..."], "callers_total": 6}},
    {"signal": "missing-partner", "path": "shared/tracker_port/port.py",
     "facts": {"partner": "shared/tracker_port/fake.py", "support": 8, "count": 8, "last_subjects": ["...", "..."]}},
    {"signal": "duplicate-block", "path": "...", "facts": {"lines": [40, 102], "other": "...", "other_lines": [38, 100], "size": 63}}
  ],
  "evidence": {
    "consumer_locality": [{"path": "...", "importers_by_folder": {"...": 7}, "sibling_edges": 0, "sole_consumer_folder": "..."}],
    "boundary_rules_for_agent": [{"context": "implement", "target": "bare Skill name 'architecture' ...", "why": "..."}],
    "vocabulary": {"names": [], "avoid_candidates": [], "defined_terms_used": [], "new_tokens": []}
  },
  "not_analysed": ["docs/** (12 files)", "missing-partner: file has no history"]
}
```

The script never writes a severity, a verdict, or advice. `boundary_rules_for_agent` lists the forbidden targets that are prose, for each touched context, so the agent reads them and the script does not pretend to check them.

### 3.2 Who reads what, and what each one decides

| Reader | Gets | Decides | Does not decide |
|---|---|---|---|
| GREEN, through the coach | P1 to P5 for the written file, as a message with fact, reason, decision, and two choices (E2 B1) | Move now, or keep and give one line of reason in the GREEN report | Anything about the diff as a whole |
| VALIDATE | The full packet, the diff, the touched `boundary.yaml` files | One judgment per finding, then three block judgments | Names against the glossary. It cites the Vocabulary block |
| VOCABULARY | `evidence.vocabulary` and the glossary | AVOID, UNDEFINED, CONFLICT, as today | Structure |
| Review and maintenance (E6) | R1 to R4 and the trend | Which rows are debt, in what order | |

Decision questions for VALIDATE. The reference file holds them, not the script.

1. **For each finding:** Is the fact true in the code? Does it matter for the next reader? Label it `confirmed`, `accepted` (true, and the slice has a good reason), or `dismissed` (false or not relevant), with one line of reason and one `file:line`.
2. **Contract drift:** For each `contract-drift` event, did a caller-visible contract change? Is each untouched caller safe? Then read the diff once for drift the script cannot see: a changed dict key, a changed file format, a changed exit code.
3. **Cohesion:** For each added file, name the one reason it has to change. Does that reason match its folder? Use `consumer_locality`, `nearest_group`, and `duplicate-block`. A file that splits a function only to pass a size limit is a Modular Mirage: say so.
4. **Dependencies:** For each `boundary-edge`, and for each prose rule in `boundary_rules_for_agent`, does the diff break the rule? Name each new dependency the script could not see, such as a `Skill("...")` call or a subprocess path.

Output format of the block. The labels are fixed, so E5 can count them.

```
### Structure

Script: <n> findings, <m> not analysed.

- [confirmed|accepted|dismissed] <signal> <path or symbol>
  Evidence: <file:line or packet fact>
  Reason: <one line>

Contract drift: <none | list of symbols, each with the caller that is at risk>
Cohesion: <one line per added file: its reason to change, and fits | does not fit>
Dependencies: <none | each new edge, with the boundary rule it meets or breaks>
```

The block stays outside `overall_score`, as ADR-0048 decision 8 says.

### 3.3 Vocabulary: how the script and the agents share the work

The `_Avoid_` words are rejected synonyms for one concept. Whether a name means that concept is a judgment. So:

1. **The script parses, and does not match for a verdict.** `glossary_index(root)` reads each entry: `term`, `context`, `avoid: [{word, reason}]`. For each added or renamed path, and each added public symbol, it emits:
   - `names`: the name and its tokens.
   - `avoid_candidates`: `{name, word, entry, context, reason, also_defined}` when the tokens hold an avoided word. `also_defined` is true when the word is itself a term of another entry (`slice`, `epic`, `Review`, `ADR`, `VALIDATE` here). `in_entry_context` is true when the path lies under the context of the entry.
   - `defined_terms_used`: `{name, term, context, path_context}`, with `cross_context: true` when the two differ. This is the lead for a CONFLICT.
   - `new_tokens`: tokens that no glossary term and no existing file name holds. This is the lead for UNDEFINED.
2. **The vocabulary agent stays the one judge.** It still reads `DDD-VOCABULARY.md` in full, as its step 1 says. The packet replaces its own grep for names, and it adds the reason text beside each candidate. Its three tags and its block do not change. Add one rule to its body: "A candidate is a lead. Tag `[AVOID]` only when the name means the concept of the entry it lost to."
3. **VALIDATE does not judge names.** Its cohesion judgment may cite a `[CONFLICT]` from the Vocabulary block. One judge per question keeps the two blocks from a conflict.
4. **The coach says nothing about `_Avoid_` words.** With 0 true hits in 25, a coach message would teach GREEN to ignore the coach. GREEN gets P3 (generic name, from the config) and P4 (twin name) only. A failed attempt already passes the Vocabulary block to the next GREEN attempt.
5. **ADR-0048 decision 2 needs an amendment.** It says that the generic list starts from the `_Avoid_` terms. The data does not support that. The two checks still use one glossary: the script indexes it, and the agent judges with it.

Open point: the vocabulary agent may read no file under `.cobuilder/` except its evidence file. So the build skill passes the packet path in the spawn message, or VALIDATE and VOCABULARY each run the script. I recommend the spawn message.

## 4. Phasing

| Epic | Proposal | Change against the plan |
|---|---|---|
| **E1** Script | Slice 1 unchanged, but count non-test files. Slice 2: P2, P3, P4, and the P1 groups. Split the code: `shared/structure_signals.py` (file list, ratchet, P1 to P4, about 200 lines) and `shared/structure_boundary.py` (the boundary reader and P5). Both standard library only | Adds P4 and the groups. Adds P5 if the engineer accepts the scope change |
| **E2** Coach | Message templates for P1 (with groups), P2, P3, P4, P5. Keys: `twin-name|<stem>`, `boundary-edge|<path>|<to_context>` | Two more templates |
| **E4** VALIDATE | New `shared/structure_evidence.py`, run with `uv run`: V1, V2, V3, V4, V5, V6, and the packet. The decision questions go in a reference file that `validate.md` names. The vocabulary agent gets one rule and the packet path | Most of the new value lands here. E4 grows from one slice to about three: packet with V1, then V2 and V3, then the block and the vocabulary hand-over |
| **E5** Replay | Label each signal with the protocol below. Decide which signals stay, and which enter the score | Adds a per-signal protocol and a history replay that needs no agent run |
| **E6** Review | R1 to R4 with trend. Reuses the E4 graph | As planned |
| **E7** Import graph | The diagram, more languages, and a check that replaces the judgment. Reuses the P5 reader and the V4 graph | Smaller. Its parser core arrives in E1 and E4 |

Pull forward: P5 and V5 (boundary), the stdlib import graph for V4. Defer: R1 to R4, the diagram. Drop: the items in the table at the end of section 2.

**E5 label protocol.** One unit is one finding. Three labels: `act` (true, and the agent should change the code), `keep` (true, and the current code is right for a stated reason), `false` (the fact is wrong or has no meaning). Precision is `(act + keep) / all`. Act rate is `act / all`. A signal needs both numbers, because a signal with high precision and no `act` only adds reading. Label 30 findings per signal, or all when fewer exist. Two people label 10 of them, and the agreement is reported. The earlier synthesis cites a bar of 50% precision from the Entropy project. I did not check that number at its source, so treat the bar as an engineer decision.

Two replays exist. The agent replay of ADR-0048 decision 10 measures behaviour. A history replay runs `structure_evidence.py` on each past merged PR as a "slice" and needs no agent, so it gives the precision numbers at low cost. V2 also has the automatic proxy of 1.5.

## 5. The standard-library rule, and where a library pays

The engineer said during this work that the rule can give way when a library adds significant value. My reading of the data:

- `hooks.json` already starts `habit_coach.py` with `uv run`, and the script declares no dependencies. The two tests check that the coach does not start `uv` itself. A dependency in the PEP 723 header would not break those two tests.
- Measured here, warm: `uv run` of a script with `tree-sitter` and `tree-sitter-typescript` takes 0.07 s in total. A bare `python3 -c` on this machine takes 0.12 s. So a warm start costs nothing. The first run must download wheels, and it fails without a network.
- The hook runs on each Write and Edit of each session, before the GREEN filter. A failed resolve would then touch every session, not only GREEN.
- The coach signals do not need a library. The regex resolved all but 2 TypeScript specifiers, and the boundary reader needs four keys.

**Recommendation.** Keep the hook and `structure_signals.py` on the standard library. Not because of the rule, but because no coach signal gains from a library. Use libraries in `structure_evidence.py`, which VALIDATE runs with `uv run`: `tree-sitter` with `tree-sitter-typescript` for V1 in TypeScript, and `PyYAML` for a full read of `boundary.yaml`. That is where the value is: 358 of 620 code files are TypeScript, and name-level drift found 0 real events there, so V1 covers under half the code without a parser. Tree-sitter parsed 332 viewer files in 155 ms. It also gives Java, PHP, and Ruby later with one more wheel each.

ADR-0048 rejected "run the script from the coach with uv run". This recommendation does not revive it. If the engineer wants TypeScript drift at coach time, that would revive it, and I advise against it: drift is a property of the finished diff, not of one write.

## 6. Risks, conflicts with the record, and what I could not verify

**Conflicts with ADR-0048 and `intent.json`. Each needs an engineer decision.**

1. P5 and V5 are an import check against `forbidden_dependencies` in the first version. `intent.json` lists that as out of scope, and decision 12 puts the parser in E7. The rejected alternative named dependency-cruiser and import-linter, with the reasons "two tool dependencies" and "two languages only". P5 has neither problem: it uses no tool, and the path-string scan works in each language. It is still a scope change.
2. V1, V2, and V3 fire for modified files. Decision 3 says a signal fires only for a new file. The spirit holds, because each event exists only when the slice changed the symbol or the lines. The wording needs an amendment: "new files for the coach, the slice diff for VALIDATE".
3. Decision 2 starts the generic list from `_Avoid_`. Section 3.3 argues against it with data.
4. Decision 1 names one script. The proposal has three files, because of the 200-line limit. "One source of each signal" still holds.
5. V2 reads git history. No decision forbids it, and no decision names it.

**Risks.**

- One repo. Every number here comes from this repo, which is small, young, and has an unusual shape: plugins that couple through strings, and stand-alone scripts. A layered web app can differ. The twin-name and co-change limits are the least portable.
- The labels in section 1 are mine, from names and imports, without a deep read of each file. Treat each precision as a first estimate.
- The ratchet simulation uses the `HEAD` tree. A commit is not a slice. The co-change proxy undercounts real misses and counts a late fix as a hit.
- Co-change needs history. A new target repo gives nothing for weeks.
- GREEN can answer a duplicate-block finding with a shared helper named `utils`. P3 then fires. The messages must name that trap.
- With five coach signals and no cap, a first write into `tracker_port` can give three messages. The merge of P2 into P1 lowers that. The replay must watch it.
- The caller list of V1 is a whole-word grep. Common names (`sync`, `main`, `run`) inflate it. A name with fewer than five characters should show the count only.
- The line-based boundary reader breaks if the YAML layout changes, for example a flow list for `allowed_dependencies`. The VALIDATE script should use PyYAML, and a test should hold the two readers to the same result on the six real records.
- More VALIDATE reading means more tokens per slice. The packet must stay small: cap each list and state the cut.

**Citations and formulas: what I checked.**

| Item in the research spec | Result |
|---|---|
| Pourasghar, Izadkhah, Akhtari, ACM TOSEM 34(6), DOI 10.1145/3707452 | Exists (Crossref). Published 2025-07-02. Full title ends "…in Software Modularization Process for Better Code Comprehensibility". The abstract names the two criteria in words |
| The DIOE formula, and "up to 26 percentage points" | **Not verified.** I read the abstract only. Do not build on the formula |
| "90+ systems" for the same paper | Not verified, as before |
| Raji and Montazeri, arXiv 1812.01061 | Exists. Four pages, a preprint, not peer-reviewed. I read it. The directed Q formula is its Eq. 5 |
| "Newman and Girvan's formulation" for directed Q | **Wrong attribution.** The paper credits the directed form to Arenas et al. (2007). Newman and Girvan is the undirected form |
| "Mathematical proofs demonstrate that refactoring … maximizes Q" | **Overstated.** The paper proves one proposition for one move of one class between two border nodes, plus one worked example. My folder-level data in 1.3 shows the idea does not carry to a nested folder tree |
| Cluster Factor and MQ (Mitchell and Mancoridis, Bunch) | The formula matches the TurboMQ form as I know it. I did not open the 2006 paper. The **code** in the spec does not match its own formula: it counts outgoing edges only, and it counts each external package as coupling |
| ClassLAR, arXiv 2512.15980 | Exists. It recovers Java modules from fully-qualified class names with a language model. It does not extend the Cluster Factor, as the spec text suggests |
| "AI-Generated Smells", arXiv 2605.02741 (Zhu, Tsantalis, Rigby) | Exists. The abstract names a "Volume-Quality Inverse Law". The term "Modular Mirage" is **not in the abstract**. I did not read the body |
| Thresholds: 10 files, CF below 0.25, more than 2 entry points, 500 lines, RFC and WMC limits | No source in the spec. On this repo the 10-file rule flags 10 of 71 code folders, and CF 0.25 is wrong for 4 of 7 |
| Hotspot Priority Score, with weights 3, 2, 1, `ln`, and square root | No source. Tornhill's work supports "rank by change frequency", not this formula |
| "Maintainers ignore roughly one-third of raw warnings" | No source given. Not verified |
| "Issue localization blindness" as a named finding | No source given. Not verified |
| The reference engine `refactor_engine.py` | Not usable as written. It needs `networkx`. It treats each Python import that is not relative as an external package: here that loses the 500 edges from files with absolute imports, of 629 resolved Python edges. It misses the `@/` alias: 236 of 1,015 TypeScript specifiers. Both errors lower each CF |
| "Is Agent Code Less Maintainable Than Human Code?" (ICML 2026), SWE-CI arXiv 2603.03823 | Not checked in this work |
| The 83.3%, 28.9%, 5.6% and odds ratio 1.83 figures | Taken from the earlier synthesis. Not checked again here |

**What I would keep from the research spec:** the graph model as a frame (files and import edges only), the Cluster Factor as a review-time table without a limit, the idea of ranking by churn, and the neuro-symbolic protocol of its section 5. The "deletion simulation" question is a good prompt for the review agent. **What I would not keep:** each fixed threshold, the severity labels, the Hotspot Priority Score, DIOE until someone reads the paper, and the reference script.

## 7. Decisions for the engineer

1. Accept P5 and V5 (a minimal boundary check now), which changes the scope in `intent.json`? I recommend yes.
2. Amend the ratchet wording to "new files for the coach, the slice diff for VALIDATE"? I recommend yes. Without it, V1 to V3 cannot exist.
3. Amend decision 2, so the generic list does not start from `_Avoid_`, and the vocabulary agent stays the one judge of names? I recommend yes.
4. Let `structure_evidence.py` use `uv run` with tree-sitter and PyYAML, and keep the hook on the standard library? I recommend yes.
5. Grow E4 from one slice to about three? I recommend yes. The alternative is to ship V1 alone in E4 and put V2 and V3 after E5.
6. Count non-test files only in the crowded-folder signal? I recommend yes.
