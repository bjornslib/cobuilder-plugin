# Signal spike on agencheck

Date: 2026-11-12. Author: Fable 5.2, as an agent. Status: for engineer review.

This file is the result of the spike in `docs/architecture/designs/structure-coaching/research/signal-recommendation.md`.
The spike ran each uncertain structure signal on a second repository.
An agent set each label. The engineer has not checked a label yet.

## Setup

| Fact | Value |
|---|---|
| Repository | `zenagent`, folder `agencheck/` |
| Commit | `1a3cc7177c8ebb68e13d8309bee7d427a8f8b807`, 2026-07-29, the merge of PR #295 |
| How the spike read it | A local clone in the scratch folder, with a detached checkout. The spike wrote nothing to `~/Documents/Windsurf/zenagent` |
| Tracked files in `agencheck/` | 5,006 |
| Files after the default excluded paths | 3,841 in 442 folders |
| Excluded by each default glob | `.*/**` 929, `docs/**` 126, `**/migrations/**` 102, `**/fixtures/**` 5, `**/generated/**` 1 |
| Code files | 1,285: 662 `.py`, 333 `.tsx`, 265 `.ts`, 23 `.js`, 2 `.mjs` |
| Product code files | 791: 348 `.py`, 274 `.tsx`, 160 `.ts`, 9 other |
| Test code files | 494 |
| History | 2,935 commits without merges touch `agencheck/`, from 2025-06 to 2026-05 |
| Import graph | 2,052 edges in 1077 ms. 44 TypeScript specifiers did not resolve. 132 Python imports had more than one target |
| Tools | Python 3.11.11, git 2.40.0, uv 0.12.1, tree-sitter 0.26.1, tree-sitter-typescript 0.23.2 |

Short path names in the tables: `SA` is `agencheck-support-agent`, `FE` is `agencheck-support-frontend`, `CA` is `agencheck-communication-agent`, and `VA` is `agencheck-communication-agent/livekit_prototype/cli_poc/voice_agent`.
Each path is relative to `agencheck/`.

A test file has a test name (`test_x.py`, `x.test.ts`, `x.spec.ts`), is `conftest.py`, or sits below a folder named `tests`, `__tests__`, `test`, `e2e`, or `acceptance-tests`.
Product code is each code file that is not a test file.

### The ten pull requests

The first-parent line of the commit has merge commits with the subject "Merge pull request". The spike used these merge commits. It did not use squash commits.
The two newest merges, #295 and #294, touch no file in `agencheck/`. The list is the last ten merges that touch `agencheck/`.
One slice diff is `git diff <merge>^1 <merge> -- agencheck`, with `--no-renames`.
A new file has status `A` in one of the ten diffs and still exists at the spike commit. No excluded path matches it.

| PR | Merge | Date | Branch | Added | Modified | Deleted | New files kept | New product code |
|---|---|---|---|---|---|---|---|---|
| #293 | `22c7a5cea` | 2026-05-08 | `claude/verifier-callback-page-zOulU` | 31 | 3 | 0 | 31 | 15 |
| #292 | `fef59f78a` | 2026-04-14 | `claude/review-python-codebase-pQngW` | 11 | 4 | 1 | 11 | 11 |
| #291 | `1fd6d911f` | 2026-04-13 | `feat/storage-s3-generate-test-data` | 0 | 1 | 0 | 0 | 0 |
| #288 | `dba16f5ad` | 2026-04-08 | `refactor/agent-py-modular-split` | 11 | 3 | 0 | 11 | 11 |
| #287 | `ab2199b43` | 2026-04-08 | `feat/storage-s3-generate-test-data` | 15 | 2 | 0 | 13 | 2 |
| #284 | `da00e3d7c` | 2026-04-07 | `feat/voice-agent-refinement-sd001` | 0 | 6 | 0 | 0 | 0 |
| #281 | `cc090dd6c` | 2026-04-07 | `feat/voice-agent-refinement-sd001` | 1 | 5 | 44 | 1 | 0 |
| #280 | `23aab8c7d` | 2026-04-07 | `feature/PRD-RECORDING-STORAGE-001` | 4 | 4 | 0 | 4 | 0 |
| #278 | `ab9490dfe` | 2026-04-06 | `feat/shared-models-e1-e2-rebase` | 4 | 25 | 0 | 3 | 0 |
| #273 | `d900c7fba` | 2026-04-02 | `chore/architecture-documentation-and-cleanup` | 0 | 0 | 862 | 0 | 0 |

Total: 74 new files, 48 code files, 39 product code files.
PR #273 only deletes files. The first-parent line also has commits with no pull request, and their files are not new files here.
`--no-renames` makes a moved file a new file. That fits the coach, because the file is new in its folder.

### Ranking in the whole-repository view

The recommendation ranks by the change count of the last 90 days. At this commit, that window has 3 commits without merges in `agencheck/`, and 43 of 1,285 code files have a count above 0.
So the spike ranked by the 90-day count, then by the 365-day count, then by the path. Most ranks come from the 365-day count.

### Signals that could not run

- **3 Boundary edge.** No `boundary.yaml` exists in any folder of the repository at this commit. This is still true.
- **10 Vocabulary leads.** No `DDD-VOCABULARY.md` exists. `documentation/codebase_documentation/reference/GLOSSARY.md` exists, but it has plain definitions and no `_Avoid_` entry. This is still true.

## Summary

The rule: a signal is KEPT when precision is 50% or more, and one label or more is `act`. Precision is `(act + keep) / labelled`.

| Signal | View | Findings | Labelled | act / keep / false | Precision | Run time | Result |
|---|---|---|---|---|---|---|---|
| 1 Contract drift, Python | Change, ten PRs | 8 | 8 | 3 / 5 / 0 | 100% | 3.7 s for ten PRs | Build signal. It works |
| 1 Contract drift, Python | Whole, drift since `d900c7fba^1` | 5 | 5 | 2 / 3 / 0 | 100% | 3.5 s | Build signal. It works |
| 1b Contract drift, TypeScript | Change, ten PRs | 0 | 0 | 0 / 0 / 0 | none | 0.9 s for ten PRs | No finding |
| 1b Contract drift, TypeScript | Change, replay on 80 PRs | 75 | 26 | 0 / 20 / 6 | 77% | 15 s for 80 PRs | DROPPED: no `act` |
| 1b Contract drift, TypeScript | Whole, drift since `d900c7fba^1` | 4 | 4 | 0 / 2 / 2 | 50% | 0.8 s | DROPPED: no `act` |
| 2 Missing co-change partner | Change, ten PRs | 0 | 0 | 0 / 0 / 0 | none | 4.6 s for ten PRs | No finding |
| 2 Missing co-change partner | Change, replay on 65 PRs, support 4, confidence 0.6 | 19 | 19 | 1 / 0 / 18 | 5% | 20 s for 65 PRs | DROPPED |
| 2 Missing co-change partner | Change, replay on 250 commits, default limits | 20 | 20 | 2 / 0 / 18 | 10% | 0.3 s | DROPPED |
| 2 Missing co-change partner | Whole, pairs in different folders | 14 | 14 | 7 / 7 / 0 | 100% | 0.3 s | KEPT |
| 4 Duplicated code | Change, ten PRs | 35 | 35 | 14 / 10 / 11 | 69% | 5.0 s for ten PRs | KEPT |
| 4 Duplicated code | Whole, file pairs | 360 | 15 | 10 / 3 / 2 | 87% | 0.33 s | KEPT |
| 5 Twin name | Change, ten PRs | 14 | 14 | 0 / 0 / 14 | 0% | under 1 ms | DROPPED |
| 5 Twin name | Whole, stems | 42 | 42 | 19 / 4 / 19 | 55% | under 1 ms | KEPT |
| 8 Consumer locality | Whole (4 are also in the change view) | 16 | 16 | 3 / 13 / 0 | 100% | 0.9 s for the graph, 1 ms after | KEPT |
| 6 Crowded folder with groups | Whole, folders over 20 files | 26 | 26 | 5 / 18 / 3 | 88% | 1 ms for counts, 0.3 s for groups | Build signal. It works |
| 6 Crowded folder with groups | Change, ten PRs | 6 files in 1 folder | 1 | 1 / 0 / 0 | 100% | as above | Build signal. It works |
| 7 Name family | Whole and change | 181 and 4 | 34 | 6 / 12 / 16 | 53% | 11 ms | Build signal. It needs two filters |
| 7 Generic name | Whole and change | 1 and 0 | 1 | 0 / 0 / 1 | 0% | as above | Build signal. One finding only |

What the table says for the five spike signals:

1. **1b Contract drift for TypeScript: DROPPED.** Precision is 73% on 30 labels, but no label is `act`. The project builds with `strict` type checks, so the compiler already finds a caller that breaks.
2. **2 Missing co-change partner: DROPPED for the change view, KEPT for the whole-repository view.** The ten PRs gave no finding. A replay on 65 PRs gave 5% precision. The pair table for review mode gave 100% with 7 `act`.
3. **4 Duplicated code: KEPT in both views.** 69% and 87%. Two filters remove 9 of the 11 false findings in the change view.
4. **5 Twin name: DROPPED for the change view, KEPT for the whole-repository view.** The change view has 0%. 13 of its 14 findings are Next.js file names. The whole view has 55% with 19 `act`.
5. **8 Consumer locality: KEPT.** 100% precision with 3 `act`. Most findings are `keep`, so it stays evidence and not a finding of its own.

On all labels of a signal together, signal 2 has 32% and signal 5 has 41%. Both pass only in the whole-repository view.

## Signal 1: Contract drift, Python (`ast`)

Build signal. The spike ran it to show that it works outside `cobuilder-plugin`.

**Algorithm as run.**

1. Take each product `.py` file with status `M` in the slice diff. Read both sides with `git show`.
2. Parse each side with `ast`. A public symbol is a module-level function, a class, or a class method, with no leading underscore. `__init__` is public. Drop `self` and `cls`.
3. For each function, record the required, optional, and keyword-only parameters, and the default values. Record the return annotation, the names in `raise`, and the types in `except`.
4. Emit one event for each difference: `removed`, `new-required-param`, `param-removed`, `param-order`, `default-changed`, `return-changed`, `raises-changed`, `catches-changed`.
5. Move filter: drop a `removed` event when another `.py` file at the new commit has a `def` or `class` line with the name.
6. User filter: drop a `removed` event when no file outside the diff holds the name as a whole word.
7. List the untouched callers: each `.py` file outside the diff that holds the short name as a whole word (`git grep -lw`).

**Result.** The ten PRs modify 27 product Python files. They give 32 raw events. 25 are `removed`: the move filter drops 20, and the user filter drops 4. 8 events stay.
The whole-repository view is one diff from `d900c7fba^1` to the spike commit: 5 events, and 4 of them are also in the change view.
A replay on 80 PR merges gave 106 raw events and 65 after the filters. The spike did not label those.

Two events are real breaks that the PR merged:

- PR #281 removed the class `WorkHistoryAgent` from `VA/agent.py`. `VA/__init__.py` line 11 still had `from .agent import WorkHistoryAgent, entrypoint` at the merge.
- PR #280 removed four parameters from `write_results_to_case`. `VA/helpers/post_call_processor.py` lines 239 to 246 still passed them at the merge.

**False-positive patterns.** None among the 9 labels. Two notes:

- The first version of the move filter used `\s` and `\b` with `git grep -E`, and it matched nothing. The pattern needs POSIX classes such as `[[:space:]]`. A test must cover this.
- The caller list for a common name is long. `entrypoint` had 6 untouched files, and none calls the function.

**Run time.** 3.7 s for ten PRs, and 1.7 s for the slowest. `git show` and `git grep` take most of it. A parse of all 348 product files takes 0.45 s.

Line numbers are those of the file at the merge commit. For a `removed` event, the line is that of the old side.

| # | PR and merge | Path and line | Symbol | Event | Before -> after | Untouched product callers | Label | Reason | Check |
|---|---|---|---|---|---|---|---|---|---|
| 1 | #292 `fef59f78a` | `CA/main.py`:186 | `execute_claude_agent` | catches-changed | `Exception,FileNotFoundError,json.JSONDecodeError -> Exception,FileNotFoundError,OSError,json.JSONDecodeError` | 0 | keep | The function now also catches OSError. No other file names it. | check |
| 2 | #292 `fef59f78a` | `SA/api/routers/verification.py`:31 | `validate_verification_token` | new-required-param | `-> request` | 0 | keep | A route handler gained a request parameter. FastAPI supplies it. | check |
| 3 | #284 `da00e3d7c` | `VA/verification_agents.py`:1508 | `VerificationAgent.on_user_turn_completed` | catches-changed | `Exception -> (ValueError, AttributeError),Exception` | 0 | keep | One more except clause in a method that the framework calls. | check |
| 4 | #281 `cc090dd6c` | `VA/agent.py`:435 | `WorkHistoryAgent` | removed | `->` | 1 | act | The PR removed the class. __init__.py line 11 of the package still imported it. | check |
| 5 | #281 `cc090dd6c` | `VA/agent.py`:476 | `entrypoint` | catches-changed | `(json.JSONDecodeError, AttributeError),Exception,FileNotFoundError,Val -> (json.JSONDecodeError, AttributeError),Exception,httpx.HTTPError,json.` | 5 | keep | The entry point lost two except clauses. The framework calls it. | check |
| 6 | #280 `23aab8c7d` | `VA/helpers/write_verification_results.py`:152 | `VerificationResultsWriter.write_results_to_case` | param-removed | `call_recording_url,call_transcript_url,call_recording_s3_key,call_tran ->` | 2 | act | Four parameters left the method. post_call_processor.py line 239 still passed them. | check |
| 7 | #280 `23aab8c7d` | `VA/helpers/write_verification_results.py`:274 | `write_results_to_case` | param-removed | `call_recording_url,call_transcript_url,call_recording_s3_key,call_tran ->` | 2 | act | Same change in the module function. Same untouched caller. | check |
| 8 | #278 `ab9490dfe` | `VA/agent.py`:1795 | `on_session_end` | catches-changed | `Exception -> Exception,RuntimeError` | 5 | keep | One more except clause. | check |
| 9 | whole | `SA/helpers/work_history_case.py`:276 | `WorkHistoryCaseService.create_work_history_case` | catches-changed | `asyncpg.UniqueViolationError -> ` | 0 | keep | The method lost one except clause, with the code that raised the error. | check |

## Signal 1b: Contract drift, TypeScript (tree-sitter)

**Algorithm as run.** The script runs with `uv run --with tree-sitter --with tree-sitter-typescript`.

1. Take each product `.ts`, `.tsx`, `.js`, `.jsx`, or `.mjs` file with status `M` in the slice diff. Parse both sides. Use the `tsx` grammar for `.tsx` and `.js`, and the `typescript` grammar for `.ts`.
2. The public surface is each exported declaration: `export function`, `export const f = (...) =>`, `export class` with its public methods, `export interface`, `export type`, `export enum`, `export default`, and each name in `export { a, b }`.
3. For a function, record each parameter: name, required or not, and type text. Record the return type text, the names in `throw`, and the count of `catch` clauses. A parameter with a destructuring pattern gets the name of its position.
4. For an interface or an object type, record each member: name, optional or not, type text. For another type alias, record the type text.
5. Emit one event for each difference: `removed`, `kind-changed`, `new-required-param`, `param-removed`, `param-now-required`, `param-type-changed`, `param-order`, `return-changed`, `throws-changed`, `catch-changed`, `member-added-required`, `member-removed`, `member-now-required`, `member-now-optional`, `member-type-changed`, `type-changed`, `enum-member-removed`.
6. Apply the move filter and the user filter of signal 1 to `removed`. List the untouched callers with `git grep -lw` on the short name.

**Result.** The ten PRs modify 16 product TypeScript files and give 0 events. The whole-repository diff gives 4 events.
Because that is too few to judge, the spike replayed the change view on 80 PR merges of the first-parent line. It skipped 8 merges with more than 300 files.
The replay gave 81 raw events and 75 after the filters, in 20 PRs, on 41 symbols. The labels cover the 4 whole-view events and 26 replay events, sampled evenly by date.

No labelled event is `act`. The agent then read the 26 replay events that were not in the sample and that have an untouched product caller. None of them breaks a caller.
The reason is in the project: `tsconfig.json` sets `strict`, and `next.config.ts` does not turn off build errors. The compiler stops a caller that does not fit. Python has no such check, and signal 1 found two breaks there.

**False-positive patterns in the 30 labels.**

| Pattern | Labelled | Share of the 75 replay events | Filter |
|---|---|---|---|
| A rename of a positional parameter shows as `param-removed`, alone or with `new-required-param` | 3 | 6 `param-removed` events | Compare parameters by position for TypeScript. Emit no event when only the name changes |
| A `try` or a `throw` inside a nested callback counts for the component | 4 | 8 of 18 error events are on a component | Do not read nested functions for `throws` and `catch` |
| A `const` arrow function became a `function` | 1 | 1 | Treat both as a function |

One interface gave 18 events in one PR, each for one member that gained `null`. One finding for each symbol, with a member list, is the better unit.

**Run time.** The import of tree-sitter and two parsers takes 34 ms when warm. A parse of all 443 product TypeScript files takes 0.41 s. Ten PRs take 0.9 s. Six files have a local parse error, and tree-sitter still returns the rest of the file.

The line is that of the symbol, in the file at the merge commit. For the whole view, it is the line at the spike commit.

| # | View or PR | Path and line | Symbol | Event | Before -> after | Untouched product callers | Label | Reason | Check |
|---|---|---|---|---|---|---|---|---|---|
| 1 | whole | `FE/types/case.ts`:47 | `TimelineEntry` | member-added-required | `-> attempt_count` | 1 | keep | A real new member. The API response fills it, and no code builds the object by hand. | check |
| 2 | whole | `FE/types/case.ts`:47 | `TimelineEntry` | member-added-required | `-> attempts` | 1 | keep | Same change as row 1. |  |
| 3 | whole | `FE/app/api/verifications/[taskId]/transcript/route.ts`:17 | `GET` | new-required-param | `-> req` | 30 | false | The parameter _req became req. A rename of a positional parameter is not drift. | check |
| 4 | whole | `FE/app/api/verifications/[taskId]/transcript/route.ts`:17 | `GET` | param-removed | `_req ->` | 30 | false | Same rename as row 3. |  |
| 5 | #232 `27e66909e` | `FE/app/verify-check/[task_id]/_components/FormEventEmitter.tsx`:6 | `FormEventPayload` | member-removed | `candidate_claimed ->` | 0 | keep | A real removal. Each user is in the PR. |  |
| 6 | #232 `27e66909e` | `FE/app/verify-check/[task_id]/_hooks/useAgentMessages.ts`:7 | `useAgentMessages` | catch-changed | `1 -> 0` | 0 | false | The try block sat in a callback inside the hook. The PR rewrote the hook. | check |
| 7 | #228 `8c34a7d26` | `FE/app/check-sla-configuration/_components/EditStepModal.tsx`:61 | `EditStepModal` | catch-changed | `1 -> 0` | 1 | false | A try block inside an event handler of a component. |  |
| 8 | #228 `8c34a7d26` | `FE/lib/api/check-sequence.ts`:66 | `ResolvedSequence` | member-now-required | `customer_id -> customer_id` | 1 | keep | A real change. The one untouched user does not read the member. |  |
| 9 | #228 `8c34a7d26` | `FE/lib/api/check-sequence.ts`:66 | `ResolvedSequence` | member-type-changed | `resolution_chain: string[] -> resolution_chain: string` | 1 | keep | A real type change from string[] to string. The one untouched user does not read it. | check |
| 10 | #228 `8c34a7d26` | `FE/stores/slices/slaConfigurationSliceV32.ts`:72 | `SLAConfigurationStateV32` | member-removed | `apiLoaded ->` | 1 | keep | A real removal. The one untouched user does not read the member. | check |
| 11 | #226 `3fd5a7486` | `FE/lib/api/work-history.ts`:555 | `getVerificationRecording` | param-removed | `auth ->` | 1 | false | The parameter auth became _auth. The caller still passes it. | check |
| 12 | #128 `bdccb6984` | `FE/lib/verification-tool-helpers.ts`:53 | `VerificationResult` | member-type-changed | `verification_status: 'verified' \| 'pending' \| 'unverified' \| -> verification_status: 'verified' \| 'pending' \| 'in_progress'` | 0 | keep | The union gained two values. The one untouched user is a test. |  |
| 13 | #106 `caab78e5f` | `FE/hooks/useAGUIContactAgent.ts`:57 | `UseAGUIContactAgentOptions` | member-type-changed | `onSuccess: () => void -> onSuccess: (result?: any) => void` | 0 | keep | The callback gained an optional argument. Old callers still fit. |  |
| 14 | #97 `15c2af231` | `FE/lib/verification-status-utils.ts`:32 | `StatusConfig` | member-type-changed | `icon: string -> icon: React.ComponentType<{ className?: string }>` | 0 | keep | A real type change. Each user is in the PR. |  |
| 15 | #96 `eaa7a7747` | `FE/components/ui/sheet.tsx`:8 | `Sheet` | kind-changed | `const -> function` | 5 | false | A const arrow function became a function declaration. The component did not change for a caller. | check |
| 16 | #96 `eaa7a7747` | `FE/hooks/useAGUIContactAgent.ts`:57 | `UseAGUIContactAgentOptions` | member-type-changed | `database_id: number -> database_id: number \| null` | 0 | keep | The type gained null. Each user is in the PR. |  |
| 17 | #96 `eaa7a7747` | `FE/types/university-contacts.ts`:4 | `UniversityContact` | member-type-changed | `verification_status: 'pending' \| 'verified' \| 'in_progress'  -> verification_status: 'pending' \| 'verified' \| 'unverified' \|` | 11 | keep | The union lost two values. No untouched product file compares with them. | check |
| 18 | #93 `82b3ff66f` | `FE/stores/types/index.ts`:186 | `UISlice` | member-added-required | `-> openSheet` | 2 | keep | A real new member of a store slice. |  |
| 19 | #87 `7a4cd4e9b` | `FE/components/university/UniversityContactModal.tsx`:273 | `UniversityContactModal` | throws-changed | `-> Error` | 2 | false | The throw sits in a fetch callback inside the component. |  |
| 20 | #76 `d3ac8fe58` | `FE/types/university-contacts.ts`:4 | `UniversityContact` | member-now-optional | `name -> name` | 2 | keep | The member became optional. The untouched hook does not read it. | check |
| 21 | #76 `d3ac8fe58` | `FE/types/university-contacts.ts`:4 | `UniversityContact` | member-type-changed | `department: string -> department: string \| null` | 2 | keep | The type gained null. Same PR and interface as row 20. |  |
| 22 | #76 `d3ac8fe58` | `FE/types/university-contacts.ts`:4 | `UniversityContact` | member-type-changed | `website: string -> website: string \| null` | 2 | keep | The type gained null. |  |
| 23 | #76 `d3ac8fe58` | `FE/types/university-contacts.ts`:4 | `UniversityContact` | member-type-changed | `region: string -> region: string \| null` | 2 | keep | The type gained null. |  |
| 24 | #76 `d3ac8fe58` | `FE/types/university-contacts.ts`:4 | `UniversityContact` | member-type-changed | `contact_notes: string -> contact_notes: string \| null` | 2 | keep | The type gained null. |  |
| 25 | #76 `d3ac8fe58` | `FE/types/university-contacts.ts`:4 | `UniversityContact` | member-type-changed | `source: string -> source: string \| null` | 2 | keep | The type gained null. |  |
| 26 | #76 `d3ac8fe58` | `FE/types/university-contacts.ts`:4 | `UniversityContact` | member-type-changed | `physical_address: string -> physical_address: string \| null` | 2 | keep | The type gained null. |  |
| 27 | #71 `78ff53297` | `FE/components/assistant-ui/thread.tsx`:31 | `Thread` | catch-changed | `1 -> 0` | 29 | false | A try block inside a callback of a component. |  |
| 28 | #60 `dfde6299e` | `FE/app/hooks/useThreadAPI.ts`:389 | `refreshThreadList` | catch-changed | `0 -> 1` | 0 | keep | The function now catches its errors. That is a real change for a caller. | check |
| 29 | #60 `dfde6299e` | `FE/stores/types/index.ts`:108 | `ThreadSlice` | member-added-required | `-> updateThreadId` | 2 | keep | A real new member of a store slice. |  |
| 30 | #51 `b619f962e` | `FE/app/MyRuntimeProviderSSE.tsx`:301 | `MyRuntimeProviderSSE` | param-removed | `#0 ->` | 0 | keep | The component lost its props parameter. No untouched file uses it. |  |

## Signal 2: Missing co-change partner

**Algorithm as run.**

1. Run one `git log --no-merges --name-only --no-renames` for the paths in `agencheck/`. Drop the excluded paths. Skip a commit with more than 30 files. 2,570 of 2,935 commits stay.
2. `count(a)` is the number of commits that touch `a`. `support(a, b)` is the number that touch both.
3. Change view: the history is the log of `<merge>^1`. For each file `a` of the slice with `count(a) >= 5`, find each `b` outside the slice with `support >= 5` and `support / count(a) >= 0.7`. `b` must exist at the merge. Drop `b` when it matches the ignore list (lock files, `plugin.json`, `marketplace.json`). One finding is one pair of slice and partner.
4. Whole-repository view: each pair in different folders, both present at the spike commit, with `support >= 5` and Jaccard `support / (count(a) + count(b) - support) >= 0.5`.

**Result, change view.** The ten PRs gave 0 findings. Only 39 of the 1,030 touched paths had 5 or more earlier commits, and no partner passed the limits.
The spike then replayed the change view on 65 earlier PR merges with 100 files or fewer.

| Support, confidence | PRs with a finding | Findings | Partner changed in the next 5 commits |
|---|---|---|---|
| 3, 0.5 | 24 of 65 | 54 | 6 (11%) |
| 4, 0.6 | 11 of 65 | 19 | 3 (16%) |
| 5, 0.7 (default) | 3 of 65 | 4 | 2 (50%) |

The agent labelled the 19 findings at support 4 and confidence 0.6. One is `act` and 18 are `false`. Of the 4 at the default limits, one is `act`.
A commit is nearer to a slice than a PR. So the spike also replayed the last 250 commits at the default limits, as the proposal did. That gave 20 warnings in 15 commits. The partner changed in the next 5 commits for 4 of them (20%). The base rate is 2.2% (1,434 of 66,406). The agent labelled all 20: 2 `act` and 18 `false`.

**Result, whole-repository view.** 14 pairs in 5 groups. All are code pairs, and none is a code file with its test. 7 are `keep`: a page with its component, a router with its model and its service. 7 are `act`: files that hold copies of the same code and that change together.

**False-positive patterns in the change view.**

| Pattern | Count | Filter |
|---|---|---|
| The partner is a task list or a planning file (`Tasks.csv`, `Planning.md`) | 9 of 19 PR findings | Keep only a pair of two code files. This leaves 8 findings, and 1 is `act` |
| The touched file is a lock file (`uv.lock`) | 5 of 20 commit warnings | Apply the ignore list to the touched file also |
| The partner is a hub file that most commits touch (`page.tsx`, `agent.py`) | 6 of 20 commit warnings | None tested |
| An additive change, such as a new optional parameter or one more query column | 4 of 20 commit warnings | None. The agent must read the diff |

No tested filter lifts the change view to 50%.

**Run time.** The log takes 0.30 s and the pair counts take 24 ms. One PR in the replay takes 0.45 s, because it runs its own log.

Whole-repository view. A pair has no line number.

| # | File a | File b | Shared commits of count a and count b | Jaccard | Label | Reason | Check |
|---|---|---|---|---|---|---|---|
| 1 | `FE/app/aura-call/page.tsx` | `FE/components/aura-call/VoiceInterface.tsx` | 13 of 23 and 13 | 0.57 | keep | A page and its main component. The page imports the component. | check |
| 2 | `FE/app/checks-dashboard/cases/[id]/page.tsx` | `FE/components/case-detail/TimelineEvent.tsx` | 8 of 12 and 9 | 0.62 | keep | A page and one component of its feature. |  |
| 3 | `FE/app/checks-dashboard/cases/[id]/page.tsx` | `FE/lib/api/cases.ts` | 7 of 12 and 7 | 0.58 | keep | A page and its API client. | check |
| 4 | `FE/lib/api/cases.ts` | `FE/types/case.ts` | 6 of 7 and 10 | 0.55 | keep | An API client and its types. |  |
| 5 | `SA/models/check_sequence.py` | `SA/services/check_sequence_service.py` | 6 of 6 and 8 | 0.75 | keep | A model and its service. | check |
| 6 | `SA/api/routers/check_sequence.py` | `SA/services/check_sequence_service.py` | 5 of 6 and 8 | 0.56 | keep | A router and its service. |  |
| 7 | `SA/eddy_validate/dependencies.py` | `SA/user_chat/dependencies.py` | 7 of 9 and 9 | 0.64 | act | Two dependencies.py copies that the team must edit together. Similarity is 0.78. | check |
| 8 | `SA/api/routers/check_sequence.py` | `SA/models/check_sequence.py` | 5 of 6 and 6 | 0.71 | keep | A router and its model. |  |
| 9 | `FE/app/api/threads/[threadId]/exists/route.ts` | `FE/app/api/threads/[threadId]/messages/route.ts` | 6 of 6 and 7 | 0.86 | act | Four thread routes repeat the auth code and change together. No import links them. | check |
| 10 | `FE/app/api/threads/[threadId]/messages/route.ts` | `FE/app/api/threads/[threadId]/route.ts` | 6 of 7 and 6 | 0.86 | act | Same group as row 9. |  |
| 11 | `FE/app/api/threads/[threadId]/messages/route.ts` | `FE/app/api/threads/route.ts` | 6 of 7 and 9 | 0.6 | act | Same group as row 9. |  |
| 12 | `FE/app/api/threads/[threadId]/exists/route.ts` | `FE/app/api/threads/[threadId]/route.ts` | 6 of 6 and 6 | 1.0 | act | Same group as row 9. |  |
| 13 | `FE/app/api/threads/[threadId]/exists/route.ts` | `FE/app/api/threads/route.ts` | 6 of 6 and 9 | 0.67 | act | Same group as row 9. |  |
| 14 | `FE/app/api/threads/[threadId]/route.ts` | `FE/app/api/threads/route.ts` | 6 of 6 and 9 | 0.67 | act | Same group as row 9. |  |

Change view, replay on 65 PRs at support 4 and confidence 0.6. "Default" marks a finding that also passes support 5 and confidence 0.7.

| # | PR and merge | Touched file | Missing partner | Support | Default | Changed in next 5 | Label | Reason | Check |
|---|---|---|---|---|---|---|---|---|---|
| 1 | #291 `1fd6d911f` | `FE/types/case.ts` | `FE/app/checks-dashboard/cases/[id]/page.tsx` | 6 of 9 |  |  | false | The PR changed comments and field order in a type. The page needs no change. | check |
| 2 | #213 `257840fb3` | `documentation/prds/phase1-ue-b-email-first-pipeline.md` | `documentation/prds/phase1-ue-f-platform-infrastructure.md` | 4 of 5 |  |  | false | The PR renamed a term in two PRDs. The partner PRD does not hold the term. |  |
| 3 | #213 `257840fb3` | `documentation/prds/phase1-ue-a-workflow-config-sla.md` | `documentation/prds/phase1-ue-d-employer-contact-intelligence.md` | 4 of 6 |  |  | false | Same case as row 2. |  |
| 4 | #88 `07f2ce6e2` | `FE/app/api/university-contacts/[id]/additional/route.ts` | `FE/app/api/university-contacts/route.ts` | 4 of 5 |  |  | false | The PR rewrote one handler. The partner shares no changed code. |  |
| 5 | #76 `d3ac8fe58` | `SA/eddy_deep_research/models.py` | `SA/eddy_deep_research/orchestrator_agent.py` | 13 of 16 | yes | yes | act | A model field became optional. The partner still types it as str, and it changed in the next 5 commits. | check |
| 6 | #75 `61049c49f` | `SA/refresh_vectors.py` | `Tasks.csv` | 4 of 6 |  |  | false | The partner is a task list file. |  |
| 7 | #75 `61049c49f` | `SA/refresh_vectors.py` | `Planning.md` | 4 of 6 |  |  | false | The partner is a planning file. |  |
| 8 | #72 `7cc5d4f47` | `FE/stores/types/index.ts` | `FE/app/providers/ZustandRuntimeProvider.tsx` | 6 of 10 |  |  | false | The PR added an action to a type. The slice already held the code. | check |
| 9 | #72 `7cc5d4f47` | `FE/stores/types/index.ts` | `FE/stores/slices/threadSlice.ts` | 6 of 10 |  |  | false | Same case as row 8. |  |
| 10 | #71 `78ff53297` | `SA/refresh_vectors.py` | `Tasks.csv` | 4 of 5 |  |  | false | The partner is a task list file. |  |
| 11 | #71 `78ff53297` | `SA/refresh_vectors.py` | `Planning.md` | 4 of 5 |  |  | false | The partner is a planning file. |  |
| 12 | #67 `ace51328f` | `SA/refresh_vectors.py` | `Planning.md` | 4 of 4 |  |  | false | The partner is a planning file. |  |
| 13 | #67 `ace51328f` | `SA/refresh_vectors.py` | `Tasks.csv` | 4 of 4 |  |  | false | The partner is a task list file. |  |
| 14 | #66 `afc257223` | `SA/eddy_validate/local_vector_storage.py` | `Tasks.csv` | 5 of 6 | yes |  | false | The partner is a task list file. | check |
| 15 | #66 `afc257223` | `SA/eddy_validate/local_vector_storage.py` | `Planning.md` | 5 of 6 | yes |  | false | The partner is a planning file. |  |
| 16 | #62 `2a8372141` | `SA/eddy_validate/validation_agent.py` | `SA/eddy_validate/workflow.py` | 5 of 8 |  | yes | false | The PR changed one model name. The partner is a hub file. |  |
| 17 | #62 `2a8372141` | `SA/aura/aura_graph_v2.py` | `SA/enhanced_aura_orchestrator.py` | 4 of 6 |  |  | false | The PR changed model names. The partner needs no change. |  |
| 18 | #53 `2e3207dc5` | `Tasks_Archive.csv` | `Tasks.csv` | 20 of 20 | yes | yes | false | The partner is a task list file. |  |
| 19 | #53 `2e3207dc5` | `FE/app/components/chat/ThreadProvider.tsx` | `FE/app/hooks/useThreadAPI.ts` | 4 of 6 |  |  | false | The PR added a loading flag to a provider. The partner hook needs no change. |  |

Change view, replay on the last 250 commits at the default limits.

| # | Commit | Touched file | Missing partner | Support | Changed in next 5 | Label | Reason | Check |
|---|---|---|---|---|---|---|---|---|
| 1 | `46de14fb9` | `SA/services/check_sequence_service.py` | `SA/api/routers/check_sequence.py` | 5 of 6 |  | false | A new optional parameter in the service. |  |
| 2 | `46de14fb9` | `SA/services/check_sequence_service.py` | `SA/models/check_sequence.py` | 6 of 6 |  | false | A new optional parameter in the service. |  |
| 3 | `9796b9481` | `SA/services/check_sequence_service.py` | `SA/api/routers/check_sequence.py` | 5 of 7 |  | false | One more column in a query. |  |
| 4 | `9796b9481` | `SA/services/check_sequence_service.py` | `SA/models/check_sequence.py` | 6 of 7 |  | false | The model already has the field. |  |
| 5 | `c487f1a81` | `FE/stores/slices/verificationFormSlice.ts` | `FE/app/verify-check/[task_id]/page.tsx` | 7 of 9 |  | false | A new optional field. The partner is a hub page. |  |
| 6 | `14ba87fb9` | `FE/app/verify-check/[task_id]/_components/LiveFormCard.tsx` | `FE/app/verify-check/[task_id]/page.tsx` | 6 of 7 |  | false | An internal change. The partner is a hub page. |  |
| 7 | `b546b2b3c` | `VA/pyproject.toml` | `VA/requirements.txt` | 8 of 10 |  | act | pyproject.toml moved livekit to 1.4. requirements.txt still pins 1.3.6. | check |
| 8 | `4ee794cc7` | `FE/app/verify-check/[task_id]/_components/FormEventEmitter.tsx` | `FE/app/verify-check/[task_id]/page.tsx` | 6 of 6 |  | false | One more value in a union. The partner is a hub page. |  |
| 9 | `46bf0a075` | `VA/pyproject.toml` | `VA/requirements.txt` | 8 of 11 | yes | act | pyproject.toml changed a plugin. requirements.txt changed in the next 5 commits. |  |
| 10 | `d37ab1af2` | `VA/pyproject.toml` | `VA/agent.py` | 10 of 12 | yes | false | The partner is the hub file agent.py. |  |
| 11 | `1041bde65` | `VA/uv.lock` | `VA/pyproject.toml` | 9 of 9 |  | false | The touched file is a lock file. |  |
| 12 | `1041bde65` | `VA/uv.lock` | `VA/requirements.txt` | 7 of 9 |  | false | The touched file is a lock file. |  |
| 13 | `09552cbb1` | `VA/uv.lock` | `VA/agent.py` | 8 of 10 | yes | false | The touched file is a lock file. |  |
| 14 | `09552cbb1` | `VA/uv.lock` | `VA/pyproject.toml` | 9 of 10 |  | false | The touched file is a lock file. |  |
| 15 | `09552cbb1` | `VA/uv.lock` | `VA/requirements.txt` | 7 of 10 |  | false | The touched file is a lock file. |  |
| 16 | `a633fcd37` | `SA/tests/eddy_test_suite/analytics.py` | `SA/tests/eddy_test_suite/test_runner.py` | 5 of 7 |  | false | A lint fix of one import. |  |
| 17 | `80d411b95` | `SA/tests/eddy_test_suite/ground_truth_manager.py` | `SA/tests/eddy_test_suite/test_runner.py` | 6 of 8 |  | false | A lint fix of imports. |  |
| 18 | `663fdbf25` | `VA/helpers/post_call_processor.py` | `VA/agent.py` | 5 of 7 |  | false | The partner is the hub file agent.py. |  |
| 19 | `791d45023` | `FE/app/verify-check/[task_id]/_components/VerifyFieldRow.tsx` | `FE/app/verify-check/[task_id]/page.tsx` | 6 of 6 |  | false | The page already compares with the lower-case value. |  |
| 20 | `4f77ce1a0` | `FE/lib/api/cases.ts` | `FE/types/case.ts` | 5 of 5 | yes | false | The return type already allowed undefined. |  |

## Signal 4: Duplicated code

**Algorithm as run.**

1. Use product code files only. Split each file into lines. Strip each line.
2. Drop a line with fewer than 4 characters. Drop a line that starts with `#`, `//`, `*`, `/*`, `import `, `from `, `export {`, `}`, `)`, or `]`.
3. Replace each string literal with `S` and each number with `0`. Make each run of white space one space.
4. Hash each window of 6 lines with 120 characters or more. A duplicate window is a hash in two or more files.
5. Merge windows that follow each other in both files into one block, with the line range of each side.
6. Whole-repository view: one finding is one pair of files with one block or more.
7. Change view: build the index on the tree of the merge commit. Keep a block only when its lines in the slice file all lie in an added range of `git diff -U0`. One finding is one pair of slice file and other file. When both files are in the slice, keep one finding for the pair.

**Result.** Whole-repository view: 360 file pairs with 1,450 blocks, in 79 connected groups. The largest group has 30 files. 111 pairs are in one folder.
Change view: 52 raw findings and 35 after the pair rule. 21 of the 35 have both files in the same PR. 30 are on an added file and 5 on a modified file.
The labels cover all 35 change findings and 15 whole-view pairs, sampled evenly across the rank.

**False-positive patterns.**

| Pattern | Change view | Whole view | Filter | Removes |
|---|---|---|---|---|
| Rows of literals, such as `{ value: 'x', label: 'y' }`. Each row becomes the same text | 4, all `false` | 1 of 15 labels | A: a window needs 4 or more distinct lines | 4 change findings and 10 of 360 pairs |
| A call with named arguments, or a parameter list | 5, all `false` | 1 of 15 labels | B: drop a window with 4 or more lines of the form `name=value,` or `name: type,` | 5 change findings and 10 of 360 pairs |
| A constructor with the same shape and other strings | 1 | 0 | None tested | |
| Props of a library component | 1 | 0 | None tested | |

With filters A and B, the change view has 26 findings and precision 92%. No `act` or `keep` finding leaves. The whole view has 340 pairs.
The PEP 723 preamble of `cobuilder-plugin` does not exist here. The pattern of this repository is a mock decorator that each Prefect task file repeats, and that is a real copy.

**A unit problem.** One block in `k` files gives `k (k - 1) / 2` pairs. Four proxy routes gave 6 findings. The Prefect task folder gave 28 pairs. One finding for each group of files (a clone class) is the better unit for review mode.

**Run time.** The index of 791 files takes 0.33 s. One PR takes 0.5 s, and most of that reads the tree of the merge commit from git.

Change view. Line numbers are those of the file at the merge commit. "Both in PR" means that the PR also added or modified the other file.

| # | PR | Slice file and largest block | Other file and block | Lines covered | Both in PR | Label | Reason | Check |
|---|---|---|---|---|---|---|---|---|
| 1 | #293 | `FE/app/verifier-callback/[token]/page.tsx`:49-104 | `FE/app/verify-check-call-schedule/page.tsx`:49-104 | 337 | yes | act | The two new pages share 337 lines, such as the time-zone table at line 49. | check |
| 2 | #293 | `SA/api/routers/call_schedule.py`:244-261 | `SA/api/routers/verifier_callback.py`:282-300 | 155 | yes | act | The two new routers share 155 lines, such as the dial-code table. |  |
| 3 | #293 | `FE/app/api/call-schedule/call-now/route.ts`:11-28 | `FE/app/api/call-schedule/schedule/route.ts`:11-28 | 26 | yes | keep | Four thin proxy routes share a 12-line fetch block. One file for each route is the framework rule. | check |
| 4 | #293 | `FE/app/api/call-schedule/call-now/route.ts`:11-28 | `FE/app/api/verifier-callback/call-now/route.ts`:11-28 | 26 | yes | keep | Same clone class as row 3. |  |
| 5 | #293 | `FE/app/api/call-schedule/call-now/route.ts`:11-28 | `FE/app/api/verifier-callback/schedule/route.ts`:11-28 | 26 | yes | keep | Same clone class as row 3. |  |
| 6 | #293 | `FE/app/api/call-schedule/schedule/route.ts`:11-28 | `FE/app/api/verifier-callback/call-now/route.ts`:11-28 | 26 | yes | keep | Same clone class as row 3. |  |
| 7 | #293 | `FE/app/api/call-schedule/schedule/route.ts`:11-28 | `FE/app/api/verifier-callback/schedule/route.ts`:11-28 | 26 | yes | keep | Same clone class as row 3. |  |
| 8 | #293 | `FE/app/api/verifier-callback/call-now/route.ts`:11-28 | `FE/app/api/verifier-callback/schedule/route.ts`:11-28 | 26 | yes | keep | Same clone class as row 3. |  |
| 9 | #293 | `FE/app/verifier-callback/[token]/page.tsx`:50-58 | `FE/components/work-history/RequestFilters.tsx`:53-61 | 26 |  | false | Rows of option literals. Each row becomes the same text after the string rule. | check |
| 10 | #293 | `FE/app/verifier-callback/[token]/page.tsx`:50-56 | `FE/components/workflow-matrix/modals/IntervalSelect.tsx`:26-32 | 26 |  | false | Rows of option literals, as in row 9. |  |
| 11 | #293 | `FE/app/verify-check-call-schedule/page.tsx`:50-58 | `FE/components/work-history/RequestFilters.tsx`:53-61 | 26 |  | false | Rows of option literals, as in row 9. |  |
| 12 | #293 | `FE/app/verify-check-call-schedule/page.tsx`:50-56 | `FE/components/workflow-matrix/modals/IntervalSelect.tsx`:26-32 | 26 |  | false | Rows of option literals, as in row 9. |  |
| 13 | #293 | `FE/app/api/call-schedule/[taskUuid]/route.ts`:17-31 | `FE/app/api/verifier-callback/[token]/route.ts`:17-31 | 15 | yes | keep | Two thin GET proxy routes share 10 lines. |  |
| 14 | #293 | `FE/app/verifier-callback/confirmed/page.tsx`:9-16 | `FE/app/verify-check-call-schedule/confirmed/page.tsx`:39-46 | 8 | yes | keep | Two confirmation pages share an 8-line icon block. |  |
| 15 | #292 | `VA/verification_agents/chat_agents.py`:46-54 | `VA/verification_agents/navigation_agent.py`:51-59 | 15 | yes | false | Two constructors with the same shape. The log text differs before the string rule. |  |
| 16 | #292 | `VA/verification_agents/call_flow.py`:306-313 | `VA/verification_agents/closing_agent.py`:191-197 | 14 | yes | act | Two new agent files repeat the call-outcome read and the finalise step. |  |
| 17 | #292 | `VA/verification_agents/verification_agent.py`:195-201 | `VA/helpers/escalation.py`:45-51 | 14 |  | act | The field summary loop exists in the new agent file and in helpers/escalation.py. | check |
| 18 | #292 | `VA/verification_agents/navigation_agent.py`:314-326 | `VA/verification_agents/verification_agent.py`:549-561 | 13 | yes | keep | Two agents carry the same tool docstring. Both already call one shared function. | check |
| 19 | #292 | `VA/verification_agents/verification_agent.py`:196-201 | `VA/helpers/form_events.py`:172-177 | 12 |  | act | Same loop as row 17, in helpers/form_events.py. |  |
| 20 | #292 | `VA/verification_agents/closing_agent.py`:261-269 | `VA/helpers/egress_recording.py`:277-285 | 9 |  | act | The recording URL logic exists in the agent and in helpers/egress_recording.py. |  |
| 21 | #292 | `VA/verification_agents/call_flow.py`:316-321 | `VA/helpers/session_lifecycle.py`:250-255 | 6 |  | false | A call of _finalize_call with named arguments. It is a call site, not a copy of logic. | check |
| 22 | #292 | `VA/verification_agents/call_flow.py`:121-126 | `VA/verification_prompts.py`:2607-2612 | 6 |  | false | A list of six parameters in a signature. |  |
| 23 | #292 | `VA/verification_agents/closing_agent.py`:200-205 | `VA/helpers/session_lifecycle.py`:250-255 | 6 |  | false | A call of _finalize_call with named arguments. |  |
| 24 | #288 | `VA/entrypoints/chat.py`:197-209 | `VA/entrypoints/voice.py`:89-106 | 19 | yes | act | The two new entry points repeat the field-name rules. |  |
| 25 | #288 | `VA/entrypoints/chat.py`:84-97 | `VA/helpers/escalation.py`:200-214 | 14 | yes | act | The chat entry point repeats 14 lines of helpers/escalation.py. |  |
| 26 | #288 | `VA/helpers/escalation.py`:45-51 | `VA/verification_agents.py`:1407-1413 | 7 | yes | act | The split left the loop in the old file and in the new helper. |  |
| 27 | #288 | `VA/helpers/escalation.py`:46-51 | `VA/helpers/form_events.py`:172-177 | 6 | yes | act | Two new helpers repeat the same loop. |  |
| 28 | #288 | `VA/helpers/form_events.py`:172-177 | `VA/verification_agents.py`:1408-1413 | 6 | yes | act | The split left the loop in the old file and in the new helper. |  |
| 29 | #288 | `VA/helpers/session_lifecycle.py`:250-255 | `VA/verification_agents.py`:606-611 | 6 | yes | false | A call of _finalize_call with named arguments. |  |
| 30 | #287 | `SA/api/routers/generate_work_history_test_data.py`:128-134 | `SA/models/work_history.py`:868-874 | 7 |  | keep | A request model repeats two field definitions of the main model. |  |
| 31 | #284 | `FE/components/aura-call/VoiceInterface.tsx`:747-752 | `FE/components/university/UniversityContactSheet.tsx`:1850-1855 | 6 |  | false | Six animation props of a library component. |  |
| 32 | #278 | `VA/agent.py`:1686-1694 | `VA/agent-groq.py`:1251-1260 | 28 |  | act | The added lines also exist in agent-groq.py, a fork of agent.py. PR #281 deleted the fork later. |  |
| 33 | #278 | `VA/agent.py`:1686-1694 | `VA/agent-minimax.py`:1257-1266 | 28 |  | act | Same case with the fork agent-minimax.py. |  |
| 34 | #278 | `FE/components/work-history/RecentRequestsTable.tsx`:118-124 | `FE/components/work-history/RequestsTable.tsx`:261-267 | 7 | yes | act | The PR made the same change in two table components. | check |
| 35 | #278 | `VA/agent.py`:1872-1877 | `VA/verification_agents.py`:558-563 | 6 | yes | false | A call of _finalize_call with named arguments. |  |

Whole-repository view, 15 of 360, by rank. Line numbers are those of the spike commit.

| Rank | File a and largest block | File b and block | Lines covered | Label | Reason | Check |
|---|---|---|---|---|---|---|
| 1 | `VA/entrypoints/chat.py`:200-212 | `VA/entrypoints/voice.py`:91-108 | 13 | act | The two entry points repeat the field-name rules. |  |
| 25 | `SA/api/routers/work_history.py`:741-751 | `SA/services/check_sequence_service.py`:110-120 | 20 | act | A database pool set-up block. Eight or more files hold a copy. | check |
| 49 | `FE/app/api/outbound-call/route.ts`:14-22 | `FE/app/aura-call/page.tsx`:15-23 | 9 | act | An API route and a page each define the VerifyFields type. |  |
| 73 | `CA/helpers/build_job_metadata.py`:45-50 | `SA/models/work_history.py`:914-919 | 6 | false | A parameter list in a signature. |  |
| 97 | `SA/prefect_flows/flows/tasks/channel_dispatch.py`:80-99 | `SA/prefect_flows/flows/tasks/process_post_check.py`:52-70 | 27 | act | Each Prefect task file holds a copy of the mock decorator. 28 file pairs in one folder. | check |
| 121 | `SA/api/middleware/clerk_jwt_auth.py`:176-201 | `SA/api/routers/live_form.py`:125-150 | 65 | act | The pool set-up block again. |  |
| 145 | `FE/components/case-detail/VerificationComparisonTable.tsx`:10-15 | `FE/types/case.ts`:128-133 | 6 | keep | A component repeats six fields of a type from types/case.ts. |  |
| 169 | `SA/services/check_sequence_service.py`:110-120 | `SA/utils/clerk_billing.py`:196-207 | 19 | act | The pool set-up block again. |  |
| 193 | `SA/prefect_flows/flows/tasks/manual_review.py`:80-99 | `SA/prefect_flows/flows/tasks/sla_config.py`:88-107 | 38 | act | The Prefect mock decorator again. |  |
| 217 | `SA/prefect_flows/flows/email_outreach.py`:60-66 | `SA/prefect_flows/flows/tasks/dispatch_call.py`:44-51 | 24 | act | The Prefect mock decorator again. |  |
| 241 | `SA/user_chat/index_creator.py`:47-57 | `SA/user_chat/pdf_index_creator.py`:57-67 | 26 | act | Two index creators repeat the tag rules, 26 lines. |  |
| 265 | `VA/helpers/write_verification_results.py`:133-150 | `SA/helpers/employer_service.py`:150-167 | 59 | keep | A pool set-up block in two services. The services deploy apart. |  |
| 289 | `FE/app/verify-check-call-schedule/page.tsx`:50-56 | `FE/components/workflow-matrix/modals/IntervalSelect.tsx`:26-32 | 26 | false | Rows of option literals. |  |
| 313 | `CA/process_agent1_batch.py`:120-130 | `CA/process_first_10.py`:148-158 | 11 | keep | Two batch scripts in the service root that ran once. | check |
| 337 | `FE/app/verify-call/[task_id]/_components/FormFieldRow.tsx`:13-26 | `FE/app/verify-check/[task_id]/_components/FormFieldRow.tsx`:13-26 | 23 | act | The verify-call and verify-check routes hold equal components. |  |

## Signal 5: Twin name

**Algorithm as run.**

1. Use product code files only. The stem is the file name without its last suffix, in lower case.
2. Skip the stems `index`, `__init__`, `main`, `types`, and `conftest`. They hold 72 files here.
3. A twin group is a stem with two or more files. Whole-repository view: one finding for each group. Change view: one finding for each new product code file in a group.

**Result.** 42 groups with 159 files. Change view: 14 of 39 new product code files. The agent labelled all 56. The task asks for 30 at most, but the agent had the same evidence for each group.

- Change view: 13 of the 14 findings are the Next.js names `route.ts`, `page.tsx`, and `loading.tsx`. The other one is `models.py`. None is a real twin.
- Whole-repository view: 19 `act`, 4 `keep`, 19 `false`. 12 of the `act` groups come from two parallel routes, `verify-call` and `verify-check`, that hold copies of each component. Commit `48fd0adbf` (2026-02-26) added the second route. The coach signal fires at such a commit, but the ten PRs hold no such commit.

**False-positive patterns.**

| Pattern | Groups | Filter | Effect |
|---|---|---|---|
| A file name that the framework sets: `page`, `route`, `layout`, `loading`, `error` | 5 groups, 68 files, all `false` | Add the Next.js names to `twin_excluded_stems`: `page`, `route`, `layout`, `loading`, `error`, `not-found`, `template`, `default` | Change view: 14 to 1. Whole view: 42 to 37, precision 62% |
| One stem in Python and in TypeScript: `cases`, `billing`, `auth`, `contacts` | 4 groups: 3 `false`, 1 `keep` | Compare a file only with files of the same language family | With both filters: 33 groups, precision 67% |
| A role name that each Python service has: `agent`, `config`, `models`, `tools`, `app`, `state`, `workflow`, `agents`, `agent_prompts`, `ag_ui_routes` | 10 groups, all `false` | None tested. The engineer can add a stem to the excluded list | |

**Run time.** Under 1 ms after the file list. The file list takes 44 ms.

Change view. The line is that of the first definition in the file.

| # | PR | New file | Twins | Label | Reason | Check |
|---|---|---|---|---|---|---|
| 1 | #292 | `VA/verification_agents/models.py`:10 | 7, first `VA/livekit-plugins-smallestai/livekit/plugins/smallestai/models.py` | false | models.py is a role name. Eight packages have one, and the contents differ. | check |
| 2 | #293 | `FE/app/api/call-schedule/[taskUuid]/route.ts`:9 | 33, first `FE/app/api/aura-sessions/[id]/route.ts` | false | route.ts is a Next.js file name. | check |
| 3 | #293 | `FE/app/api/call-schedule/call-now/route.ts`:9 | 33, first `FE/app/api/aura-sessions/[id]/route.ts` | false | route.ts is a Next.js file name. |  |
| 4 | #293 | `FE/app/api/call-schedule/schedule/route.ts`:9 | 33, first `FE/app/api/aura-sessions/[id]/route.ts` | false | route.ts is a Next.js file name. |  |
| 5 | #287 | `FE/app/api/test-data/generate/route.ts`:12 | 33, first `FE/app/api/aura-sessions/[id]/route.ts` | false | route.ts is a Next.js file name. |  |
| 6 | #293 | `FE/app/api/verifier-callback/[token]/route.ts`:9 | 33, first `FE/app/api/aura-sessions/[id]/route.ts` | false | route.ts is a Next.js file name. |  |
| 7 | #293 | `FE/app/api/verifier-callback/call-now/route.ts`:9 | 33, first `FE/app/api/aura-sessions/[id]/route.ts` | false | route.ts is a Next.js file name. |  |
| 8 | #293 | `FE/app/api/verifier-callback/schedule/route.ts`:9 | 33, first `FE/app/api/aura-sessions/[id]/route.ts` | false | route.ts is a Next.js file name. |  |
| 9 | #293 | `FE/app/verifier-callback/[token]/loading.tsx`:3 | 4, first `FE/app/checks-dashboard/cases/[id]/loading.tsx` | false | loading.tsx is a Next.js file name. |  |
| 10 | #293 | `FE/app/verifier-callback/[token]/page.tsx`:111 | 21, first `FE/app/aura-call/page.tsx` | false | page.tsx is a Next.js file name. The duplicate signal reports the copied page. | check |
| 11 | #293 | `FE/app/verifier-callback/confirmed/page.tsx`:5 | 21, first `FE/app/aura-call/page.tsx` | false | page.tsx is a Next.js file name. |  |
| 12 | #293 | `FE/app/verify-check-call-schedule/confirmed/page.tsx`:6 | 21, first `FE/app/aura-call/page.tsx` | false | page.tsx is a Next.js file name. |  |
| 13 | #293 | `FE/app/verify-check-call-schedule/loading.tsx`:3 | 4, first `FE/app/checks-dashboard/cases/[id]/loading.tsx` | false | loading.tsx is a Next.js file name. |  |
| 14 | #293 | `FE/app/verify-check-call-schedule/page.tsx`:111 | 21, first `FE/app/aura-call/page.tsx` | false | page.tsx is a Next.js file name. |  |

Whole-repository view, by rank.

| # | Stem | Files | First files | Label | Reason | Check |
|---|---|---|---|---|---|---|
| 1 | `agent` | 3 | `VA/agent.py`:50, `SA/university_contact_manager/agent.py`:34, and 1 more | false | agent.py is a role name in three services. Similarity is 0.07 or less. |  |
| 2 | `config` | 4 | `VA/config.py`:49, `SA/config.py`:73, and 2 more | false | config.py is a role name in four services. |  |
| 3 | `work_history` | 2 | `SA/api/routers/work_history.py`:76, `SA/models/work_history.py`:43 | keep | A router and its model. The router imports the model. | check |
| 4 | `workflow` | 2 | `SA/eddy_validate/workflow.py`:88, `SA/user_chat/workflow.py`:90 | false | workflow.py is a role name in two services. |  |
| 5 | `agents` | 2 | `SA/eddy_validate/agents.py`:102, `SA/user_chat/agents.py`:95 | false | agents.py is a role name in two services. |  |
| 6 | `page` | 22 | `FE/app/verify-check/[task_id]/page.tsx`:74, `FE/app/university-contacts/page.tsx`:155, and 20 more | false | page.tsx is a Next.js file name, 22 files. |  |
| 7 | `thread` | 2 | `FE/components/assistant-ui/thread.tsx`:31, `FE/app/types/thread.ts`:14 | false | A component file and a types file. The contents have no relation. | check |
| 8 | `app` | 4 | `SA/eddy_deep_research/app.py`:53, `SA/eddy_validate/app.py`:85, and 2 more | false | app.py is a role name in four services. |  |
| 9 | `route` | 34 | `FE/app/api/livekit/token/route.ts`:10, `FE/app/api/verify/route.ts`:40, and 32 more | false | route.ts is a Next.js file name, 34 files. |  |
| 10 | `models` | 8 | `SA/eddy_validate/models.py`:22, `SA/eddy_deep_research/models.py`:40, and 6 more | false | models.py is a role name in eight packages. |  |
| 11 | `ag_ui_routes` | 2 | `SA/live_form_filler/ag_ui_routes.py`:25, `SA/university_contact_manager/ag_ui_routes.py`:30 | false | ag_ui_routes.py is a role name in two agent packages. Similarity is 0.07. |  |
| 12 | `dependencies` | 4 | `SA/dependencies.py`:94, `SA/eddy_validate/dependencies.py`:102, and 2 more | act | Three dependencies.py files share 11 or 12 of 14 functions. Similarity is 0.66 to 0.78. | check |
| 13 | `liveformcard` | 2 | `FE/app/verify-check/[task_id]/_components/LiveFormCard.tsx`:26, `FE/app/verify-call/[task_id]/_components/LiveFormCard.tsx`:22 | act | Two LiveFormCard components in the parallel routes verify-call and verify-check. |  |
| 14 | `cases` | 2 | `FE/lib/api/cases.ts`:74, `SA/models/cases.py`:19 | false | A TypeScript API client and a Python model in two services. |  |
| 15 | `check_sequence` | 2 | `SA/api/routers/check_sequence.py`:97, `SA/models/check_sequence.py`:25 | keep | A router and its model. The router imports the model. |  |
| 16 | `interpret_call_outcome` | 2 | `CA/helpers/interpret_call_outcome.py`:49, `VA/helpers/interpret_call_outcome.py`:49 | act | Two copies of interpret_call_outcome.py in two helper folders. Similarity is 0.97. | check |
| 17 | `agent_prompts` | 2 | `SA/eddy_validate/agent_prompts.py`:15, `SA/user_chat/agent_prompts.py`:8 | false | agent_prompts.py is a role name in two services. |  |
| 18 | `layout` | 5 | `FE/app/layout.tsx`:19, `FE/app/aura-call/layout.tsx`:8, and 3 more | false | layout.tsx is a Next.js file name. |  |
| 19 | `state` | 2 | `SA/university_contact_manager/state.py`:20, `SA/live_form_filler/state.py`:11 | false | state.py is a role name in two agent packages. |  |
| 20 | `tools` | 5 | `SA/user_chat/tools.py`:49, `SA/university_contact_manager/tools.py`:19, and 3 more | false | tools.py is a role name in five packages. |  |
| 21 | `callrecordingplayer` | 2 | `FE/components/work-history/CallRecordingPlayer.tsx`:26, `FE/components/case-detail/CallRecordingPlayer.tsx`:17 | act | Two CallRecordingPlayer components with different props. One concept has two implementations. | check |
| 22 | `transcriptpanel` | 2 | `FE/app/verify-call/[task_id]/_components/TranscriptPanel.tsx`:58, `FE/app/verify-check/[task_id]/_components/TranscriptPanel.tsx`:62 | act | Two TranscriptPanel components in the parallel routes. Similarity is 0.38. |  |
| 23 | `useformsse` | 2 | `FE/app/verify-call/[task_id]/_hooks/useFormSSE.ts`:37, `FE/app/verify-check/[task_id]/_hooks/useFormSSE.ts`:37 | act | Two useFormSSE hooks. Similarity is 0.98. |  |
| 24 | `callcontrolbar` | 2 | `FE/app/verify-call/[task_id]/_components/CallControlBar.tsx`:20, `FE/app/verify-check/[task_id]/_components/CallControlBar.tsx`:20 | act | Two CallControlBar files that are equal. No file imports the verify-check copy. |  |
| 25 | `employedyesnofield` | 2 | `FE/app/verify-call/[task_id]/_components/EmployedYesNoField.tsx`:13, `FE/app/verify-check/[task_id]/_components/EmployedYesNoField.tsx`:14 | act | Two EmployedYesNoField components. Similarity is 0.78. |  |
| 26 | `billing` | 2 | `SA/api/routers/billing.py`:38, `FE/app/types/billing.ts`:8 | keep | The TypeScript type mirrors the response model of the Python router. Both name BillingUsageResponse. | check |
| 27 | `verifiernameinput` | 2 | `FE/app/verify-call/[task_id]/_components/VerifierNameInput.tsx`:10, `FE/app/verify-check/[task_id]/_components/VerifierNameInput.tsx`:11 | act | Two VerifierNameInput components. Similarity is 0.68. |  |
| 28 | `auth` | 2 | `SA/app/auth.py`:27, `FE/app/types/auth.ts`:1 | false | A Python auth module and a TypeScript types file with no shared name. |  |
| 29 | `candidateinfoblock` | 2 | `FE/app/verify-check/[task_id]/_components/CandidateInfoBlock.tsx`:7, `FE/app/verify-call/[task_id]/_components/CandidateInfoBlock.tsx`:7 | act | Two CandidateInfoBlock components. Similarity is 0.67. |  |
| 30 | `contacts` | 2 | `SA/models/contacts.py`:54, `FE/stores/types/contacts.ts`:17 | false | A Python model and a TypeScript store type with no shared name. |  |
| 31 | `messagebubble` | 2 | `FE/app/verify-check/[task_id]/_components/MessageBubble.tsx`:10, `FE/app/verify-call/[task_id]/_components/MessageBubble.tsx`:10 | act | Two MessageBubble components. Similarity is 0.97. |  |
| 32 | `agencheck-extension-components` | 2 | `documentation/input/agencheck-extension-components.ts`:36, `documentation/input/browser-extension/agencheck-extension-components.ts`:36 | act | Two equal 1,144-line files in documentation/input. One is a copy. |  |
| 33 | `agencheck-extension-starter` | 2 | `documentation/input/agencheck-extension-starter.ts`:295, `documentation/input/browser-extension/agencheck-extension-starter.ts`:295 | act | Two equal 1,281-line files in documentation/input. One is a copy. |  |
| 34 | `connectionstatusbadge` | 2 | `FE/app/verify-call/[task_id]/_components/ConnectionStatusBadge.tsx`:11, `FE/app/verify-check/[task_id]/_components/ConnectionStatusBadge.tsx`:11 | act | Two equal ConnectionStatusBadge files. No file imports them. |  |
| 35 | `error` | 2 | `FE/app/verify-call/[task_id]/error.tsx`:9, `FE/app/verify-check/[task_id]/error.tsx`:9 | false | error.tsx is a Next.js file name. The two files are equal, and the duplicate signal reports that. |  |
| 36 | `formfieldrow` | 2 | `FE/app/verify-call/[task_id]/_components/FormFieldRow.tsx`:8, `FE/app/verify-check/[task_id]/_components/FormFieldRow.tsx`:8 | act | Two equal FormFieldRow files. |  |
| 37 | `formfieldtable` | 2 | `FE/app/verify-call/[task_id]/_components/FormFieldTable.tsx`:8, `FE/app/verify-check/[task_id]/_components/FormFieldTable.tsx`:8 | act | Two equal FormFieldTable files. No file imports the verify-check copy. |  |
| 38 | `livebadge` | 3 | `FE/app/verify-call/[task_id]/_components/LiveBadge.tsx`:3, `FE/app/verify-check/[task_id]/_components/LiveBadge.tsx`:3, and 1 more | act | Three LiveBadge components. Two are equal. |  |
| 39 | `loading` | 5 | `FE/app/checks-dashboard/cases/[id]/loading.tsx`:3, `FE/app/verifier-callback/[token]/loading.tsx`:3, and 3 more | false | loading.tsx is a Next.js file name. |  |
| 40 | `supabase` | 2 | `FE/app/types/supabase.ts`:1, `FE/types/supabase.ts`:4 | act | Two Database type files. app/types/supabase.ts has 1,890 lines and no importer. | check |
| 41 | `workflow-matrix` | 2 | `FE/lib/mock-data/workflow-matrix.ts`:28, `FE/types/workflow-matrix.ts`:21 | keep | Mock data and its types. The mock file imports the types file. |  |
| 42 | `threaderrorboundary` | 2 | `FE/app/components/chat/ThreadErrorBoundary.tsx`:25, `FE/components/assistant-ui/ThreadErrorBoundary.tsx`:14 | act | Two ThreadErrorBoundary classes in two component folders. Similarity is 0.40. |  |

## Signal 8: Consumer locality

**Algorithm as run.**

1. Build the import graph of all code files. Python: `ast`, with relative imports, and absolute imports through an index of path suffixes. When a suffix has more than one file, take the file that shares the longest path prefix with the importer. TypeScript: one regular expression for `import`, `export from`, `import()`, and `require()`. Resolve `./`, `../`, and `@/`. The root of `@/` is the folder of the nearest `tsconfig.json`.
2. For each product file, take its product importers. The signal fires when two or more importers exist, and all sit in one folder. That folder must not be the folder of the file or an ancestor of it.
3. Whole-repository view: each such file. Change view: each such file that is new.

**Result.** 16 findings among 791 product files. 4 are new files, all from PR #288. The agent labelled all 16: 3 `act`, 13 `keep`, 0 `false`.
The three `act` findings are feature code in a shared folder (`hooks/`, `utils/`, `app/hooks/`) that one feature folder uses.

**Patterns.** No finding is `false`. The `keep` findings follow one pattern: the file sits in a layer folder, and the consumer is the layer above. Examples: `helpers/` used from `entrypoints/`, `api/middleware/` used from `api/routers/`.
A tested filter: drop the finding when the consumer folder imports 3 or more files of the folder of the file. It removes 6 findings, all `keep`. The 10 that stay have 3 `act` and 7 `keep`.
The barrel file pattern of the proposal did not show here. The spike did not check a re-export through `__init__.py` or `index.ts`.

**Run time.** The graph takes 0.9 s for 1,285 code files. The signal takes 1 ms after that.

| # | File | Sole consumer folder | Importers | New | Label | Reason | Check |
|---|---|---|---|---|---|---|---|
| 1 | `VA/helpers/llm_factory.py`:1 | `VA/entrypoints` | 2, first at `VA/entrypoints/chat.py`:20 | yes | keep | A factory in the helper layer. The two entry points are the layer above it. | check |
| 2 | `VA/helpers/stt_factory.py`:1 | `VA/entrypoints` | 2, first at `VA/entrypoints/chat.py`:21 |  | keep | Same case as llm_factory.py. |  |
| 3 | `FE/hooks/useAGUIContactAgent.ts`:1 | `FE/components/university` | 5, first at `FE/components/university/AdditionalContactCard.tsx`:5 |  | act | A 470-line hook for one feature. Only the university contact sheet uses it. | check |
| 4 | `FE/types/university-contacts-validation.ts`:1 | `FE/components/university` | 5, first at `FE/components/university/AdditionalContactCard.tsx`:7 |  | keep | Zod schemas beside university-contacts.ts in types/. The types folder is the convention here. | check |
| 5 | `FE/utils/requestMessageBuilder.ts`:1 | `FE/components/university` | 4, first at `FE/components/university/AdditionalContactCard.tsx`:9 |  | act | A request builder for contact edits in a mixed utils folder. One feature folder uses it. | check |
| 6 | `VA/prompts/chat_prompts.py`:1 | `VA/verification_agents` | 2, first at `VA/verification_agents/chat_agents.py`:10 |  | keep | A prompts folder for the agents. The agents folder is the only user by design. |  |
| 7 | `SA/api/middleware/clerk_jwt_auth.py`:1 | `SA/api/routers` | 3, first at `SA/api/routers/check_sequence.py`:37 |  | keep | Middleware that the routers use. That is the layer order. | check |
| 8 | `FE/lib/adapters/checkSequenceToSLA.ts`:1 | `FE/stores/slices` | 2, first at `FE/stores/slices/slaConfigurationSlice.ts`:35 |  | keep | An adapter between the API client and the store. The header comment states this role. | check |
| 9 | `SA/config/prefect_config.py`:1 | `SA/scripts` | 2, first at `SA/scripts/rollback_to_legacy.py`:97 |  | keep | Prefect settings in config/. Two set-up scripts and the tests read them. | check |
| 10 | `SA/utils/token_validator.py`:1 | `SA/api/routers` | 2, first at `SA/api/routers/verification.py`:16 |  | keep | A token validator in utils/. Two routers use it. |  |
| 11 | `FE/app/verify/[task_id]/_types/index.ts`:1 | `FE/app/verify/[task_id]/_components` | 5, first at `FE/app/verify/[task_id]/_components/CandidateInfoCard.tsx`:4 |  | keep | Props types in the private _types folder of one route. The route keeps _components beside it. | check |
| 12 | `VA/helpers/form_events.py`:1 | `VA/entrypoints` | 2, first at `VA/entrypoints/chat.py`:23 | yes | keep | Same case as llm_factory.py. |  |
| 13 | `VA/helpers/metadata.py`:1 | `VA/entrypoints` | 2, first at `VA/entrypoints/chat.py`:19 | yes | keep | Same case as llm_factory.py. |  |
| 14 | `VA/helpers/room_utils.py`:1 | `VA/entrypoints` | 2, first at `VA/entrypoints/chat.py`:22 | yes | keep | Same case as llm_factory.py. |  |
| 15 | `FE/app/hooks/GridNavigationContext.tsx`:1 | `FE/app/check-sla-configuration/_components` | 2, first at `FE/app/check-sla-configuration/_components/SLACheckTypeGrid.tsx`:23 |  | act | A context for the SLA grid in app/hooks. Only the SLA route uses it and useRovingTabindex.ts. | check |
| 16 | `FE/types/supabase.ts`:1 | `FE/utils` | 5, first at `FE/utils/supabase-edge.ts`:4 |  | keep | Database types in types/. The five supabase clients in utils/ use them. | check |

## Signal 6: Crowded folder with groups

Build signal. The count holds every file that is not excluded, tests included. The limit is `max(20, p90)`.

**Algorithm as run.**

1. Count the files of each folder, direct children only. Here p50 is 3, p75 is 6, p90 is 14, and p95 is 25. So the limit is 20.
2. A folder with more than 20 files gives a finding. Change view: each new file in such a folder.
3. Groups: a token family is two or more siblings with the same first token, and test names do not count. An import group is a connected set of siblings in the import graph.

**Result.** 26 of 442 folders are over the limit. A limit of 15 gives 40. Change view: 6 new files, all in `SA/tests`, so one message.

- 12 of the 26 folders hold no code file: 9 documentation folders and 3 data folders. The default excluded path `docs/**` matches the top folder `docs` only. `documentation/` has 1,521 files, and a nested `docs/` folder has 53.
- 14 folders hold code. Their labels are 5 `act`, 9 `keep`, and 0 `false`.
- The families give a named choice in one of the five `act` folders: the service root `CA` has `qa` (12) and `transform` (5). The flat test folder `SA/tests` has no family, because test names do not count. It also has no import group.

**Patterns and a filter.** A folder with no code file is documentation or data here. A tested filter: no finding for a folder with no code file. It removes 12 findings: 9 `keep` and 3 `false`. An entry `documentation/**` in the excluded paths of this repository removes the 9 documentation folders also.
The default glob `.*/**` matches a dot folder at the top only. 57 kept files sit in a nested dot folder.

**Run time.** 1 ms for the counts. 0.3 s for the groups of all 26 folders, and 0.29 s of that is one folder with 799 files.

| # | Folder | Files | Code files | Largest families | Import groups | Label | Reason | Check |
|---|---|---|---|---|---|---|---|---|
| 1 | `documentation/scratch-pads` | 799 | 0 | central (285), phase (50), chat (31) | none | keep | 799 dated notes. A real crowd, in a documentation folder. | check |
| 2 | `SA/tests` | 139 | 135 | none | none | act | 133 test files in one flat folder. The team sorted the other test suite by domain in May. | check |
| 3 | `SA/eddy_validate` | 29 | 26 | validation (2) | 22 | keep | One service package. 22 files form one import group. | check |
| 4 | `SA` | 36 | 12 | dockerfile (4), env (3), observability (2) | 3 | act | The service root holds one-time scripts and four test files beside main.py. | check |
| 5 | `documentation/solution_designs` | 251 | 0 | university (28), chat (13), csv (11) | none | keep | 251 documents. |  |
| 6 | `SA/storage/sessions` | 110 | 0 | thread (110) | none | false | 110 thread JSON files. This is run-time data. | check |
| 7 | `CA` | 45 | 24 | qa (12), transform (5), aura (2) | 3 | act | The service root holds 12 qa files and 5 transform scripts. | check |
| 8 | `CA/helpers` | 36 | 33 | s (4), csv (2), enhance (2) | 13 | act | 33 code files with no common theme. 20 have no link to a sibling. | check |
| 9 | `SA/tests/eddy_test_suite` | 33 | 24 | pipeline (2), generate (2), quality (2) | 14, 9 | keep | A test suite with two import groups. |  |
| 10 | `SA/utils` | 31 | 30 | token (2), vector (2) | 8, 3, 2 | act | 30 code files with no common theme. 17 have no link to a sibling. | check |
| 11 | `FE` | 34 | 17 | playwright (8), jest (4), package (2) | none | keep | A project root with tool configuration files. |  |
| 12 | `documentation` | 70 | 0 | migration (9), ag (8), next (7) | none | keep | 70 documents. |  |
| 13 | `FE/components/ui` | 39 | 39 | country (2), moi (2), toggle (2) | 14, 3, 2 | keep | The shadcn/ui folder. One kind of file. | check |
| 14 | `documentation/prds` | 32 | 0 | phase (12), workflow (7), work (5) | none | keep | 32 documents. |  |
| 15 | `CA/validation_data_local` | 59 | 0 | batch (26), contacts (19), audit (2) | none | false | 59 data files. |  |
| 16 | `SA/storage/verification_data` | 89 | 0 | university (25), the (7), moscow (3) | none | false | 89 data files. |  |
| 17 | `CA/tests` | 26 | 23 | none | none | keep | A flat test folder with 20 tests. |  |
| 18 | `documentation/plans` | 36 | 0 | 2025 (34) | none | keep | 36 dated plans. |  |
| 19 | `FE/app/verify/[task_id]/_components` | 24 | 24 | voice (6), chat (2), field (2) | 19, 2 | keep | 24 components of one route. 19 form one import group. | check |
| 20 | `FE/documentation/solution_designs` | 42 | 0 | thread (8), adapter (7), aura (4) | none | keep | 42 documents. |  |
| 21 | `documentation/handoffs` | 25 | 0 | aura (5), epic (2), phase (2) | none | keep | 25 documents. |  |
| 22 | `FE/__tests__/chat-history-management/playwright` | 33 | 33 | none | none | keep | 33 test files of one kind. |  |
| 23 | `FE/__tests__/frontend` | 37 | 35 | none | none | keep | 35 test files of one kind. |  |
| 24 | `SA/documentation/solution_designs` | 26 | 0 | sd (5), prd (4), deep (3) | none | keep | 26 documents. |  |
| 25 | `documentation/solution_designs/implemented` | 23 | 0 | solution (12), screenshot (4), eddy (3) | none | keep | 23 documents. |  |
| 26 | `documentation/solution_designs/end-to-end/webhook-tests` | 25 | 5 | phase (8), db (3), supabase (2) | none | keep | 25 reports and scripts of one test run. |  |

## Signal 7: Name family and generic name

Build signal, as E1 A5 to A7 state it. The family key is the first token, and `cluster_min` is 3. No sub-folder has the token as its name. The excluded stems are `a`, `an`, `the`, `index`, `main`, and `init`.

**Result.** 181 families in the whole-repository view. 158 hold no code file: 119 are in a documentation folder, and most of the rest are data or test results. 23 hold a code file.
Change view: 4 findings. Generic name: 1 finding, `FE/lib/utils.ts`, and 0 in the change view.
The agent labelled all 23 families with code, 7 of the 158 without code (sampled evenly), the 4 change findings, and the generic name. The 7 are too few to judge the 158.

**False-positive patterns in the 23 families with code.**

| Pattern | Count | Filter | After the filter |
|---|---|---|---|
| The token is in the name of the folder or of the two folders above it: `university` in `components/university` | 4, all `false` | No finding when the token is a token of the folder path, last three parts | |
| React hooks: the token `use` | 3, all `false` | Add `use` to `excluded_stems` | With both filters: 16 families, precision 81% |
| A letter with a digit: `s3_config` gives the token `s` | 1, `keep` | Keep a letter and the digits after it as one token | |
| Files of a generated report or of a data set | 3, all `false` | An excluded path in the repository configuration | |

Without a filter, the 23 families have precision 57% with 6 `act`.
The one generic name is the shadcn/ui helper `cn` in `lib/utils.ts`, as the E1 design predicted. This repository gives no evidence for or against the generic list.

**Run time.** 11 ms for 3,841 files.

| # | View | Folder or file | Token | Files | Examples | Label | Reason | Check |
|---|---|---|---|---|---|---|---|---|
| 1 | whole | `FE/components/university` | `university` | 3 | UniversityContactCard.tsx, UniversityContactSheet.tsx, UniversityNameSection.tsx | false | The folder is components/university. The token repeats the folder name. | check |
| 2 | whole | `FE/hooks` | `use` | 10 | useAGUIContactAgent.ts, useApiClient.ts, useCaseDetail.ts | false | React hooks start with use. The folder is hooks/. | check |
| 3 | whole | `FE/app/components/chat` | `thread` | 4 | ThreadErrorBoundary.tsx, ThreadListItem.tsx, ThreadSidebar.tsx | keep | Four thread components in a chat folder. |  |
| 4 | whole | `FE/app/university-contacts/components` | `university` | 6 | UniversityCardSkeleton.tsx, UniversityResultCard.tsx, UniversityResultsList.tsx | false | The route is university-contacts. The token repeats it. |  |
| 5 | whole | `FE/components/assistant-ui` | `thread` | 5 | ThreadErrorBoundary.tsx, ThreadScrollToBottom.tsx, ThreadWithBoundary.tsx | keep | Five thread components in assistant-ui. | check |
| 6 | whole | `FE/utils` | `supabase` | 5 | supabase-edge.ts, supabase-fallback.ts, supabase-server.ts | act | Five supabase client files in a mixed utils folder. | check |
| 7 | whole | `SA/prefect_flows/flows/tasks` | `process` | 3 | process_post_call.py, process_post_check.py, process_result.py | keep | Three task files with a verb as the first token. |  |
| 8 | whole | `CA` | `qa` | 12 | QA_FINAL_REPORT_BATCH3.md, qa_analysis.py, qa_apply_corrections.py | act | 12 qa files in the service root. | check |
| 9 | whole | `CA` | `transform` | 5 | transform_batch1_enhanced_b2.py, transform_batch2.py, transform_rows_201_300.py | act | Five transform scripts in the service root. |  |
| 10 | whole | `VA/helpers` | `post` | 3 | post_call.py, post_call_processor.py, post_check_processor.py | keep | post_call and post_check files. The token is half of a compound word. |  |
| 11 | whole | `FE` | `playwright` | 8 | playwright-manual-tests.config.ts, playwright-manual.config.ts, playwright-thread-validation.config.ts | act | Eight playwright configuration files in the project root. Four names are variants of one name. | check |
| 12 | whole | `FE/app/university-contacts/hooks` | `use` | 4 | useBrowseMode.ts, useInfiniteScroll.ts, usePSQLEnrichment.ts | false | React hooks start with use. |  |
| 13 | whole | `FE/app/verify/[task_id]/_components` | `voice` | 6 | VoiceAgentBubble.tsx, VoiceFieldRow.tsx, VoiceFieldVerificationTable.tsx | act | Six voice components in a folder of 24 files. | check |
| 14 | whole | `FE/app/check-sla-configuration/_components` | `sla` | 5 | SLACheckTypeGrid.tsx, SLACheckTypeGridV32.tsx, SLAFooter.tsx | false | The route is check-sla-configuration. The token repeats it. |  |
| 15 | whole | `FE/app/hooks` | `use` | 5 | useBilling.ts, useLocalMessageState.ts, useReducedMotion.ts | false | React hooks start with use. |  |
| 16 | whole | `FE/app/verify-check/[task_id]/_components` | `form` | 3 | FormEventEmitter.tsx, FormFieldRow.tsx, FormFieldTable.tsx | keep | Three form components of one route. |  |
| 17 | whole | `CA/helpers` | `s` | 4 | s3_atomic_csv.py, s3_config.py, s3_csv_filesystem.py | keep | Four s3 files. The family is real, but the token is s, because the split cuts s3 in two. | check |
| 18 | whole | `FE/app` | `debug` | 3 | debug-client.tsx, debug-store.tsx, debug-visibility.tsx | act | Three debug files in the app root. |  |
| 19 | whole | `FE/__tests__/test-results/playwright-report/trace` | `ui` | 3 | uiMode.BatfzHMG.css, uiMode.BijnIl3L.js, uiMode.html | false | Files of a generated test report. |  |
| 20 | whole | `FE/components/workflow-matrix/matrix` | `matrix` | 3 | MatrixCell.tsx, MatrixContainer.tsx, MatrixHeader.tsx | false | The folder is matrix. The token repeats the folder name. |  |
| 21 | whole | `documentation/input` | `agencheck` | 3 | agencheck-business-context-for-claude-code.md, agencheck-extension-components.ts, agencheck-extension-starter.ts | false | The project name as a prefix, in a documentation folder. |  |
| 22 | whole | `FE` | `jest` | 4 | jest.config.js, jest.config.react.js, jest.setup.js | keep | Four jest configuration files. The tool sets the names. |  |
| 23 | whole | `documentation/solution_designs/end-to-end/webhook-tests` | `db` | 3 | db_state_after_tests.json, db_state_before_tests.json, db_state_validator.py | false | Three data files of one test run. |  |
| 24 | whole, no code | `VA/docs/sds` | `sd` | 4 | SD-AGENT-BEHAVIOR-FIXES.md, SD-CROSS-MODE-UNIFICATION.md | keep | Four solution designs with the prefix SD. |  |
| 25 | whole, no code | `documentation/scratch-pads` | `sse` | 15 | SSE-PROGRESSIVE-DELIVERY-IMPLEMENTATION-COMPLETE.md, sse-buffering-fix-TESTING-GUIDE.md | keep | 15 notes on one topic. |  |
| 26 | whole, no code | `documentation/solution_designs` | `union` | 4 | union-error-action-plan-tomorrow.md, union-error-critical-update-2025-08-08.md | keep | Four notes on one topic. |  |
| 27 | whole, no code | `documentation/solution_designs/supporting_information/input-box` | `screenshot` | 6 | screenshot - homepage view after loading - 2025-07-29_10-04-50.png, screenshot - homepage view during loading - 2025-07-29_10-05-17.png | false | Six screenshots. |  |
| 28 | whole, no code | `FE/documentation/solution_designs` | `aura` | 4 | aura-api-migration-to-communicator.md, aura-audit-trail-truncation.md | keep | Four notes on one topic. |  |
| 29 | whole, no code | `FE/__tests__/e2e/results/J9` | `j` | 3 | J9.1-banner-renders.png, J9.2-sidesheet-opens.png | false | Screenshots from a test run. |  |
| 30 | whole, no code | `tests/__tests__/e2e/results/J4` | `j` | 3 | J4.5-archive-menu.png, J4.5-can-create-new.png | false | Screenshots from a test run. |  |
| 31 | change #287 | `acceptance-tests/PRD-RECORDING-STORAGE-001-tdd/refactor_e1.feature` | `refactor` | 3 | refactor_e1.feature, refactor_e2.feature, refactor_e3.feature | false | Three numbered feature files of one acceptance test set. |  |
| 32 | change #287 | `acceptance-tests/PRD-RECORDING-STORAGE-001-tdd/refactor_e2.feature` | `refactor` | 3 | refactor_e1.feature, refactor_e2.feature, refactor_e3.feature | false | Same family as row 1. |  |
| 33 | change #287 | `acceptance-tests/PRD-RECORDING-STORAGE-001-tdd/refactor_e3.feature` | `refactor` | 3 | refactor_e1.feature, refactor_e2.feature, refactor_e3.feature | false | Same family as row 1. |  |
| 34 | change #288 | `VA/helpers/post_call.py` | `post` | 3 | post_call.py, post_call_processor.py, post_check_processor.py | keep | post_call.py joins post_call_processor.py and post_check_processor.py. | check |
| 35 | whole, generic | `FE/lib/utils.ts`:1 | `utils` | 1 |  | false | lib/utils.ts holds the cn helper of shadcn/ui. That name is a convention. | check |

## For the engineer to check

Ten findings for each signal, with a mix of labels. Signal 1 has nine findings, so all nine are here.
For a change-view finding, read the file at the merge commit: `git -C <clone> show <merge>:agencheck/<path>`. Expand the short names `SA`, `FE`, `CA`, and `VA` first.

### 1 Contract drift, Python

- [ ] PR #292 at `fef59f78a`: `CA/main.py`:186, `execute_claude_agent`, catches-changed. Label: `keep`. The function now also catches OSError. No other file names it.
- [ ] PR #292 at `fef59f78a`: `SA/api/routers/verification.py`:31, `validate_verification_token`, new-required-param. Label: `keep`. A route handler gained a request parameter. FastAPI supplies it.
- [ ] PR #284 at `da00e3d7c`: `VA/verification_agents.py`:1508, `VerificationAgent.on_user_turn_completed`, catches-changed. Label: `keep`. One more except clause in a method that the framework calls.
- [ ] PR #281 at `cc090dd6c`: `VA/agent.py`:435, `WorkHistoryAgent`, removed. Label: `act`. The PR removed the class. __init__.py line 11 of the package still imported it.
- [ ] PR #281 at `cc090dd6c`: `VA/agent.py`:476, `entrypoint`, catches-changed. Label: `keep`. The entry point lost two except clauses. The framework calls it.
- [ ] PR #280 at `23aab8c7d`: `VA/helpers/write_verification_results.py`:152, `VerificationResultsWriter.write_results_to_case`, param-removed. Label: `act`. Four parameters left the method. post_call_processor.py line 239 still passed them.
- [ ] PR #280 at `23aab8c7d`: `VA/helpers/write_verification_results.py`:274, `write_results_to_case`, param-removed. Label: `act`. Same change in the module function. Same untouched caller.
- [ ] PR #278 at `ab9490dfe`: `VA/agent.py`:1795, `on_session_end`, catches-changed. Label: `keep`. One more except clause.
- [ ] Whole view: `SA/helpers/work_history_case.py`:276, `WorkHistoryCaseService.create_work_history_case`, catches-changed. Label: `keep`. The method lost one except clause, with the code that raised the error.

### 1b Contract drift, TypeScript

- [ ] whole: `FE/types/case.ts`:47, `TimelineEntry`, member-added-required. Label: `keep`. A real new member. The API response fills it, and no code builds the object by hand.
- [ ] whole: `FE/app/api/verifications/[taskId]/transcript/route.ts`:17, `GET`, new-required-param. Label: `false`. The parameter _req became req. A rename of a positional parameter is not drift.
- [ ] #232 `27e66909e`: `FE/app/verify-check/[task_id]/_hooks/useAgentMessages.ts`:7, `useAgentMessages`, catch-changed. Label: `false`. The try block sat in a callback inside the hook. The PR rewrote the hook.
- [ ] #228 `8c34a7d26`: `FE/lib/api/check-sequence.ts`:66, `ResolvedSequence`, member-type-changed. Label: `keep`. A real type change from string[] to string. The one untouched user does not read it.
- [ ] #228 `8c34a7d26`: `FE/stores/slices/slaConfigurationSliceV32.ts`:72, `SLAConfigurationStateV32`, member-removed. Label: `keep`. A real removal. The one untouched user does not read the member.
- [ ] #226 `3fd5a7486`: `FE/lib/api/work-history.ts`:555, `getVerificationRecording`, param-removed. Label: `false`. The parameter auth became _auth. The caller still passes it.
- [ ] #96 `eaa7a7747`: `FE/components/ui/sheet.tsx`:8, `Sheet`, kind-changed. Label: `false`. A const arrow function became a function declaration. The component did not change for a caller.
- [ ] #96 `eaa7a7747`: `FE/types/university-contacts.ts`:4, `UniversityContact`, member-type-changed. Label: `keep`. The union lost two values. No untouched product file compares with them.
- [ ] #76 `d3ac8fe58`: `FE/types/university-contacts.ts`:4, `UniversityContact`, member-now-optional. Label: `keep`. The member became optional. The untouched hook does not read it.
- [ ] #60 `dfde6299e`: `FE/app/hooks/useThreadAPI.ts`:389, `refreshThreadList`, catch-changed. Label: `keep`. The function now catches its errors. That is a real change for a caller.

### 2 Missing co-change partner

- [ ] Whole view: `FE/app/aura-call/page.tsx` and `FE/components/aura-call/VoiceInterface.tsx`, 13 shared commits. Label: `keep`. A page and its main component. The page imports the component.
- [ ] Whole view: `FE/app/checks-dashboard/cases/[id]/page.tsx` and `FE/lib/api/cases.ts`, 7 shared commits. Label: `keep`. A page and its API client.
- [ ] Whole view: `SA/models/check_sequence.py` and `SA/services/check_sequence_service.py`, 6 shared commits. Label: `keep`. A model and its service.
- [ ] Whole view: `SA/eddy_validate/dependencies.py` and `SA/user_chat/dependencies.py`, 7 shared commits. Label: `act`. Two dependencies.py copies that the team must edit together. Similarity is 0.78.
- [ ] Whole view: `FE/app/api/threads/[threadId]/exists/route.ts` and `FE/app/api/threads/[threadId]/messages/route.ts`, 6 shared commits. Label: `act`. Four thread routes repeat the auth code and change together. No import links them.
- [ ] PR replay, #291 at `1fd6d911f`: the PR touched `FE/types/case.ts` and not `FE/app/checks-dashboard/cases/[id]/page.tsx`. Label: `false`. The PR changed comments and field order in a type. The page needs no change.
- [ ] PR replay, #76 at `d3ac8fe58`: the PR touched `SA/eddy_deep_research/models.py` and not `SA/eddy_deep_research/orchestrator_agent.py`. Label: `act`. A model field became optional. The partner still types it as str, and it changed in the next 5 commits.
- [ ] PR replay, #72 at `7cc5d4f47`: the PR touched `FE/stores/types/index.ts` and not `FE/app/providers/ZustandRuntimeProvider.tsx`. Label: `false`. The PR added an action to a type. The slice already held the code.
- [ ] PR replay, #66 at `afc257223`: the PR touched `SA/eddy_validate/local_vector_storage.py` and not `Tasks.csv`. Label: `false`. The partner is a task list file.
- [ ] Commit replay, `b546b2b3c`: the commit touched `VA/pyproject.toml` and not `VA/requirements.txt`. Label: `act`. pyproject.toml moved livekit to 1.4. requirements.txt still pins 1.3.6.

### 4 Duplicated code

- [ ] Change view, PR #293 at `22c7a5cea`: `FE/app/verifier-callback/[token]/page.tsx`:49-104 and `FE/app/verify-check-call-schedule/page.tsx`:49-104. Label: `act`. The two new pages share 337 lines, such as the time-zone table at line 49.
- [ ] Change view, PR #293 at `22c7a5cea`: `FE/app/api/call-schedule/call-now/route.ts`:11-28 and `FE/app/api/call-schedule/schedule/route.ts`:11-28. Label: `keep`. Four thin proxy routes share a 12-line fetch block. One file for each route is the framework rule.
- [ ] Change view, PR #293 at `22c7a5cea`: `FE/app/verifier-callback/[token]/page.tsx`:50-58 and `FE/components/work-history/RequestFilters.tsx`:53-61. Label: `false`. Rows of option literals. Each row becomes the same text after the string rule.
- [ ] Change view, PR #292 at `fef59f78a`: `VA/verification_agents/verification_agent.py`:195-201 and `VA/helpers/escalation.py`:45-51. Label: `act`. The field summary loop exists in the new agent file and in helpers/escalation.py.
- [ ] Change view, PR #292 at `fef59f78a`: `VA/verification_agents/navigation_agent.py`:314-326 and `VA/verification_agents/verification_agent.py`:549-561. Label: `keep`. Two agents carry the same tool docstring. Both already call one shared function.
- [ ] Change view, PR #292 at `fef59f78a`: `VA/verification_agents/call_flow.py`:316-321 and `VA/helpers/session_lifecycle.py`:250-255. Label: `false`. A call of _finalize_call with named arguments. It is a call site, not a copy of logic.
- [ ] Change view, PR #278 at `ab9490dfe`: `FE/components/work-history/RecentRequestsTable.tsx`:118-124 and `FE/components/work-history/RequestsTable.tsx`:261-267. Label: `act`. The PR made the same change in two table components.
- [ ] Whole view, rank 25: `SA/api/routers/work_history.py`:741-751 and `SA/services/check_sequence_service.py`:110-120. Label: `act`. A database pool set-up block. Eight or more files hold a copy.
- [ ] Whole view, rank 97: `SA/prefect_flows/flows/tasks/channel_dispatch.py`:80-99 and `SA/prefect_flows/flows/tasks/process_post_check.py`:52-70. Label: `act`. Each Prefect task file holds a copy of the mock decorator. 28 file pairs in one folder.
- [ ] Whole view, rank 313: `CA/process_agent1_batch.py`:120-130 and `CA/process_first_10.py`:148-158. Label: `keep`. Two batch scripts in the service root that ran once.

### 5 Twin name

- [ ] Change view, PR #292: `VA/verification_agents/models.py`:10 with 7 twins, first `VA/livekit-plugins-smallestai/livekit/plugins/smallestai/models.py`. Label: `false`. models.py is a role name. Eight packages have one, and the contents differ.
- [ ] Change view, PR #293: `FE/app/api/call-schedule/[taskUuid]/route.ts`:9 with 33 twins, first `FE/app/api/aura-sessions/[id]/route.ts`. Label: `false`. route.ts is a Next.js file name.
- [ ] Change view, PR #293: `FE/app/verifier-callback/[token]/page.tsx`:111 with 21 twins, first `FE/app/aura-call/page.tsx`. Label: `false`. page.tsx is a Next.js file name. The duplicate signal reports the copied page.
- [ ] Whole view, stem `work_history`: `SA/api/routers/work_history.py`:76, `SA/models/work_history.py`:43. Label: `keep`. A router and its model. The router imports the model.
- [ ] Whole view, stem `thread`: `FE/components/assistant-ui/thread.tsx`:31, `FE/app/types/thread.ts`:14. Label: `false`. A component file and a types file. The contents have no relation.
- [ ] Whole view, stem `dependencies`: `SA/dependencies.py`:94, `SA/eddy_validate/dependencies.py`:102, and 2 more. Label: `act`. Three dependencies.py files share 11 or 12 of 14 functions. Similarity is 0.66 to 0.78.
- [ ] Whole view, stem `interpret_call_outcome`: `CA/helpers/interpret_call_outcome.py`:49, `VA/helpers/interpret_call_outcome.py`:49. Label: `act`. Two copies of interpret_call_outcome.py in two helper folders. Similarity is 0.97.
- [ ] Whole view, stem `callrecordingplayer`: `FE/components/work-history/CallRecordingPlayer.tsx`:26, `FE/components/case-detail/CallRecordingPlayer.tsx`:17. Label: `act`. Two CallRecordingPlayer components with different props. One concept has two implementations.
- [ ] Whole view, stem `billing`: `SA/api/routers/billing.py`:38, `FE/app/types/billing.ts`:8. Label: `keep`. The TypeScript type mirrors the response model of the Python router. Both name BillingUsageResponse.
- [ ] Whole view, stem `supabase`: `FE/app/types/supabase.ts`:1, `FE/types/supabase.ts`:4. Label: `act`. Two Database type files. app/types/supabase.ts has 1,890 lines and no importer.

### 8 Consumer locality

- [ ] `VA/helpers/llm_factory.py`:1, used only from `VA/entrypoints` (for example `VA/entrypoints/chat.py`:20). Label: `keep`. A factory in the helper layer. The two entry points are the layer above it.
- [ ] `FE/hooks/useAGUIContactAgent.ts`:1, used only from `FE/components/university` (for example `FE/components/university/AdditionalContactCard.tsx`:5). Label: `act`. A 470-line hook for one feature. Only the university contact sheet uses it.
- [ ] `FE/types/university-contacts-validation.ts`:1, used only from `FE/components/university` (for example `FE/components/university/AdditionalContactCard.tsx`:7). Label: `keep`. Zod schemas beside university-contacts.ts in types/. The types folder is the convention here.
- [ ] `FE/utils/requestMessageBuilder.ts`:1, used only from `FE/components/university` (for example `FE/components/university/AdditionalContactCard.tsx`:9). Label: `act`. A request builder for contact edits in a mixed utils folder. One feature folder uses it.
- [ ] `SA/api/middleware/clerk_jwt_auth.py`:1, used only from `SA/api/routers` (for example `SA/api/routers/check_sequence.py`:37). Label: `keep`. Middleware that the routers use. That is the layer order.
- [ ] `FE/lib/adapters/checkSequenceToSLA.ts`:1, used only from `FE/stores/slices` (for example `FE/stores/slices/slaConfigurationSlice.ts`:35). Label: `keep`. An adapter between the API client and the store. The header comment states this role.
- [ ] `SA/config/prefect_config.py`:1, used only from `SA/scripts` (for example `SA/scripts/rollback_to_legacy.py`:97). Label: `keep`. Prefect settings in config/. Two set-up scripts and the tests read them.
- [ ] `FE/app/verify/[task_id]/_types/index.ts`:1, used only from `FE/app/verify/[task_id]/_components` (for example `FE/app/verify/[task_id]/_components/CandidateInfoCard.tsx`:4). Label: `keep`. Props types in the private _types folder of one route. The route keeps _components beside it.
- [ ] `FE/app/hooks/GridNavigationContext.tsx`:1, used only from `FE/app/check-sla-configuration/_components` (for example `FE/app/check-sla-configuration/_components/SLACheckTypeGrid.tsx`:23). Label: `act`. A context for the SLA grid in app/hooks. Only the SLA route uses it and useRovingTabindex.ts.
- [ ] `FE/types/supabase.ts`:1, used only from `FE/utils` (for example `FE/utils/supabase-edge.ts`:4). Label: `keep`. Database types in types/. The five supabase clients in utils/ use them.

### 6 Crowded folder

- [ ] `documentation/scratch-pads`: 799 files, 0 code files. Label: `keep`. 799 dated notes. A real crowd, in a documentation folder.
- [ ] `SA/tests`: 139 files, 135 code files. Label: `act`. 133 test files in one flat folder. The team sorted the other test suite by domain in May.
- [ ] `SA/eddy_validate`: 29 files, 26 code files. Label: `keep`. One service package. 22 files form one import group.
- [ ] `SA`: 36 files, 12 code files. Label: `act`. The service root holds one-time scripts and four test files beside main.py.
- [ ] `SA/storage/sessions`: 110 files, 0 code files. Label: `false`. 110 thread JSON files. This is run-time data.
- [ ] `CA`: 45 files, 24 code files. Label: `act`. The service root holds 12 qa files and 5 transform scripts.
- [ ] `CA/helpers`: 36 files, 33 code files. Label: `act`. 33 code files with no common theme. 20 have no link to a sibling.
- [ ] `SA/utils`: 31 files, 30 code files. Label: `act`. 30 code files with no common theme. 17 have no link to a sibling.
- [ ] `FE/components/ui`: 39 files, 39 code files. Label: `keep`. The shadcn/ui folder. One kind of file.
- [ ] `FE/app/verify/[task_id]/_components`: 24 files, 24 code files. Label: `keep`. 24 components of one route. 19 form one import group.

### 7 Name family and generic name

- [ ] Family `university` in `FE/components/university`: 3 files, for example `UniversityContactCard.tsx`. Label: `false`. The folder is components/university. The token repeats the folder name.
- [ ] Family `use` in `FE/hooks`: 10 files, for example `useAGUIContactAgent.ts`. Label: `false`. React hooks start with use. The folder is hooks/.
- [ ] Family `thread` in `FE/components/assistant-ui`: 5 files, for example `ThreadErrorBoundary.tsx`. Label: `keep`. Five thread components in assistant-ui.
- [ ] Family `supabase` in `FE/utils`: 5 files, for example `supabase-edge.ts`. Label: `act`. Five supabase client files in a mixed utils folder.
- [ ] Family `qa` in `CA`: 12 files, for example `QA_FINAL_REPORT_BATCH3.md`. Label: `act`. 12 qa files in the service root.
- [ ] Family `playwright` in `FE`: 8 files, for example `playwright-manual-tests.config.ts`. Label: `act`. Eight playwright configuration files in the project root. Four names are variants of one name.
- [ ] Family `voice` in `FE/app/verify/[task_id]/_components`: 6 files, for example `VoiceAgentBubble.tsx`. Label: `act`. Six voice components in a folder of 24 files.
- [ ] Family `s` in `CA/helpers`: 4 files, for example `s3_atomic_csv.py`. Label: `keep`. Four s3 files. The family is real, but the token is s, because the split cuts s3 in two.
- [ ] Change view, PR #288: `VA/helpers/post_call.py` joins the family `post`. Label: `keep`. post_call.py joins post_call_processor.py and post_check_processor.py.
- [ ] Generic name: `FE/lib/utils.ts`:1. Label: `false`. lib/utils.ts holds the cn helper of shadcn/ui. That name is a convention.

## Recommended changes

| # | Change | Evidence |
|---|---|---|
| 1 | Do not build 1b for the first version. If a later version builds it, compare parameters by position, do not read nested functions, and emit one finding for each symbol | 0 `act` in 30 labels and in 26 more events. 8 of 30 are `false` |
| 2 | Move signal 2 out of VALIDATE. Keep the pair table (support 5, Jaccard 0.5, different folders) for review mode, with one finding for each group of files | Change view: 0 findings in ten PRs, 1 `act` in 19, 2 `act` in 20. Whole view: 14 of 14, 7 `act` |
| 3 | Add filters A and B to signal 4, and keep one finding for a pair of two slice files | They remove 9 of 11 `false` findings and no other finding |
| 4 | Report signal 4 as groups of files in the whole-repository view | 360 pairs are 79 groups |
| 5 | Use signal 5 in review mode. In the coach, it needs the Next.js names in `twin_excluded_stems` and the same-language rule | Change view: 0 of 14. Whole view: 55%, and 67% with both filters |
| 6 | Keep signal 8 as evidence, as planned. The layer filter is optional | 3 `act` in 16, and no `false` |
| 7 | When the 90-day window has few commits, widen the window. A possible rule: use 365 days when the window has fewer than 20 commits | 3 commits in 90 days here |
| 8 | Signal 6: give no finding for a folder with no code file, or show such folders apart. Make the default globs match at each depth: `**/docs/**` and `**/.*/**` | 12 of 26 folders hold no code. 53 and 57 files escape the two globs |
| 9 | Signal 7: skip a token that the folder path already holds, add `use` to `excluded_stems`, and keep `s3` as one token | 7 of 10 `false` families with code |
| 10 | Signal 1: test the move filter against a real `git grep`. Show a count and not a list for a caller name such as `entrypoint` or `main` | The first pattern matched nothing |

The agent tested each filter above on this repository only, after it saw the false findings. A filter can overfit.

## Open and unverified

- One agent set each label. No second person labelled a finding. The engineer has not checked the 79 `check` findings.
- A label of `act` for a duplicate or a twin says that the copy is real and that one place is better. The agent did not try the change.
- The ten PRs are a small change view: 74 new files and 39 new product code files. Signals 1b, 2, and 5 gave 0, 0, and 14 findings there. The replays on 65 and 80 PRs are an addition to the task.
- The two replays use different size limits: 100 files for signal 2 and 300 files for signals 1 and 1b. So the PR counts differ.
- A PR is larger than a slice. A PR holds the partner file more often than a slice does. The commit replay is nearer to a slice, and its precision is still low.
- The proxy is "the partner changed in the next 5 commits". It counts a late fix as a hit, and it misses a real gap that nobody fixed.
- The change view of signals 5, 6, 7, and 8 uses the tree of the spike commit, not the tree at each merge. Signals 1, 1b, 2, and 4 use the tree at each merge.
- The whole-repository view of signals 1 and 1b needs a last report. None exists, so the spike used the parent of the oldest of the ten merges as the base.
- The Python import resolver picked one of several targets for 132 imports. 44 TypeScript specifiers did not resolve. Signal 8 can miss an importer, and then a finding is wrong. The agent checked three findings with `grep` and found no miss.
- The agent read `tsconfig.json` and `next.config.ts`. It did not run the TypeScript compiler, and it did not check that a build runs before a merge.
- The TypeScript surface does not read `export * from`, overloads, generics, or a default export of an expression. It gives a destructured parameter the name of its position.
- The 158 name families and the 12 crowded folders with no code file got a class from their folder and file types. Only 7 families got a label.
- The run times are from one machine with a warm file cache, as the median of three runs or as one run. The first `uv run` with tree-sitter must download two wheels.
- agencheck has no `boundary.yaml` and no glossary with `_Avoid_` entries. Signals 3 and 10 still have evidence from one repository only.
- agencheck is one more repository, not a sample. It has three services, a Next.js application, and much documentation in the tree. Another repository can give other numbers.

## Scripts

The throw-away scripts are in `/private/tmp/claude-503/-Users-theb-Documents-Windsurf-cobuilder-plugin/9114643d-8786-4943-968a-920b67255846/scratchpad/spike/`. Each result file is in its `out/` folder. The clone is `scratchpad/zenagent-spike/`.

| Script | Job |
|---|---|
| `common.py` | The file list, the excluded paths, the test rule, the ten PRs, the new files, the change counts, and the tree of a commit |
| `graph.py` | The import graph for Python and TypeScript |
| `s0_setup.py` | The counts in the Setup section |
| `s1_drift_py.py` | Signal 1, both views |
| `s1b_drift_ts.py` | Signal 1b, both views. It needs tree-sitter |
| `s1x_replay.py` | The replay of signals 1 and 1b on 80 PR merges |
| `s2_cochange.py` | Signal 2, both views |
| `s2b_replay.py` | The replay of signal 2 on 65 PR merges, at four limit pairs |
| `s2c_commit_replay.py` | The replay of signal 2 on 250 commits, with the base rate |
| `s4_dup.py` | Signal 4, both views |
| `s4b_filters.py` | The test of filters A and B |
| `s5_twin.py` | Signal 5, both views |
| `s6_crowded.py` | Signal 6 with groups |
| `s7_names.py` | Signal 7 |
| `s8_locality.py` | Signal 8 |
| `timing.py`, `timing_ts.py` | The run times |
| `labels.py` | Each label, its reason, and its `check` mark |
| `report.py` | Builds this file from the result files and the labels |
