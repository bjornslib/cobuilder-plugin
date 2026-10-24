# Tracker adapter: beads

This note covers the beads adapter. Skill files name `bd` commands only in this note. The tracker-neutral contract is in `shared/tracker-usage.md`. The adapter code is in `shared/tracker_port/beads.py`.

## Requirements

- `bd` version 1.3.0. The adapter runs against this version. The checks cover no other version.
- `git` on the PATH.
- One git remote named `origin` that every machine can reach.

## Consent before setup

Setup changes the repo. Tell the user these changes before you run any setup command:

- `bd init` makes one git commit.
- `bd init` adds `.beads/` config files.
- `bd init` appends lines to the root `.gitignore`. Git ignores the embedded Dolt store.

Ask one question: "Set up beads in this repo? It adds one commit, `.beads/` files, and `.gitignore` lines. Reply yes or no." Recommended answer: yes, when the repo needs one shared backlog. With no answer, do nothing. A second clone needs the same question.

## Custom issue types

> Replaced by ADR-0044.

`types.custom` is the bd setting that lists the issue types beyond the built-in ones. It holds names that a comma separates. bd has no built-in `program` type, so the list must include it. `tracker.py prepare` adds `program` to the list. The entries that are already in the list stay. It changes nothing when `program` is there. bd prints `types.custom (not set)` when the list is empty.

## Setup on the first machine

Run these steps in order. Each step needs the step before it.

1. `bd init --skip-agents --skip-hooks -p demo --non-interactive`. The two skip flags skip bd's agent and hook setup. `-p demo` is the id prefix that the verification runs used.
2. `bd config set types.custom program`. bd has no built-in `program` type. A `program` create fails until this step runs. `tracker.py prepare` runs this step and keeps the existing types. The adapter also runs it on demand. Replaced by ADR-0044.
3. `bd config set team.enabled true`.
4. `bd config set team.sync_branch main`.
5. `git remote add origin <url>`. Use a URL that every machine can reach.

## First publish to an empty remote

`bd sync` alone does not publish the first data. Run these steps once, in this order:

1. `bd sync -y`. On an empty remote, it exits 1 with `no branches found in remote`. This step adopts the remote, so you can ignore that error.
2. `bd dolt push`. Run it once. It publishes the hidden ref `refs/dolt/data`.
3. `bd sync`. It exits 0 after step 2.

To check the publish on a bare remote, run `git -C <remote path> show-ref refs/dolt/data`. The ref must appear in the output. The adapter runs bare `bd sync` after this procedure, so run this procedure before the first adapter write.

## Second clone

1. `git clone <url> <dir>`.
2. In `<dir>`, run `bd init --skip-agents --skip-hooks -p demo --non-interactive`. Ask the consent question first.
3. In `<dir>`, run `bd sync`.
4. In `<dir>`, run `bd list --json --all`. The output shows the same records as the first machine.

The second clone does not need the first-publish steps.

## Claim path

`claim_slice` makes one write: `bd update <id> --claim --actor <claimant>`. bd makes the claim atomic. Then the adapter runs the sync rule. It does not run `bd show` after the claim.

- On success, the adapter returns the record with the claimant as assignee and the lifecycle `in_progress`.
- bd refuses a held claim. It exits 1 and writes `already claimed by <holder>` on stderr. The adapter raises `claim of <id> refused: already claimed by <holder>`, and it does not sync.
- bd refuses a closed issue with `issue not claimable`. The adapter raises `claim of <id> refused: <stderr>`.
- A lease lasts 5 minutes, and an expired lease does not free a claim. Only `bd reclaim` frees it. The adapter needs no lease guard.

The adapter sets `atomic_claim` to true.

## Metadata wrapper

Send every envelope through `--metadata` as `{"cb": {...}}`. The adapter builds this form in `_metadata_arg`.

- `--set-metadata` stores a flat key. Do not use it.
- A bare key form merges keys at the top level, outside `cb`. Do not use it.

## Close and force

The adapter sends `--force` on every close. bd refuses to close an epic that has open children unless the command includes `--force`.

`set_epic_state` runs one `bd update <id> --status <state>` for the epic. When the program lifecycle changes, it runs one more update for the program, with `--force` for a close. The one `bd sync` at the end covers both writes.

`skip_slice` writes the outcome and the reason to the `cb` envelope with one `bd update`. It then runs `bd close <id> --force` and one `bd sync`. A repeat call for a closed slice with the same outcome and reason runs no write and no sync.

## Lifecycle mapping

| Record | State | bd status |
|---|---|---|
| Program | Stage `implemented` or `superseded` | `closed` |
| Program | Any other stage, an epic in progress | `in_progress` |
| Program | Any other stage, all epics closed | `closed` |
| Program | Any other stage, no epic started | `open` |
| Epic or slice | `open` | `open` |
| Epic or slice | `in_progress` | `in_progress` |
| Epic or slice | `closed` | `closed` |

A plan program takes its stage from the `goal.json` of its design: the plan name first, then the prefix of the first epic id. The seed repair closes an open program when the held stage is `implemented` or `superseded`, with or without a plan file. It also closes an open program that its files mark closed, unless the held stage is `review`. The close pass uses one sync. `set_program_stage` writes the bd status only when the lifecycle changes. A refused create names the held id: `create_record` stops with `already exists` before any `bd create`.

## Pull request issues

> Replaced by ADR-0044.

`open_pull_request(ref, epic_ids)` writes one issue for each pull request.

- The ref must end in the GitHub number, such as `pr-101`.
- The issue title is the ref. Its `external_ref` is `gh-<n>`, such as `gh-101`.
- The issue type is `task`. The envelope holds no `pr` key. The number lives in the title and in `external_ref`.
- The adapter runs `bd dep add <epic> <pr>` for each epic in `epic_ids`. Each epic stays blocked until the `pr` issue closes.

## Native mapping

ADR-0044 sets this mapping. The adapter creates each cb row with these bd fields.

| Record | bd type | Parent | `external_ref` |
|---|---|---|---|
| Program | `feature` | none | the cb id |
| Epic | `epic` | the program | the cb id |
| Slice | `task` | the epic | the cb id |
| Pull request | `milestone` | none | `gh-<n>`, such as `gh-101` |

- **Label.** Every cb row has the label `cb`. The create sends `--labels cb`.
- **Status.** A bd row with the status `deferred` reads as `open`.
- **Custom type.** bd needs no custom type, so `prepare` sets none and a create does not retry.
- **Title.** The constant `TITLE_RULE` in `tracker_port/record.py` sets the title. The value `name` (default) sends the name of the record. The value `id-and-name` sends `<cb id> — <name>`. A record with no name uses its cb id. A pull request uses its ref under both values.
- **Text fields.** `description`, `acceptance_criteria`, and `design` map to the bd fields `description`, `acceptance_criteria`, and `design`. A field with no value sends no flag.
- **Read.** A read fills `title`, `description`, `acceptance_criteria`, and `design` of the record from the bd row. These four fields are outside the equality of two records. A pull request also reads `tracks`, the epic ids of its `tracks` edges. `tracks` is inside the equality.
- **Lookup.** `create_record` runs `bd list --external-ref <ref> --json --limit 0 --all`. It stops with `already exists` when a row holds the ref. `find_record` uses the same call to read one record.
- **Doctor.** `doctor` reports `mapping: native`, or `mapping: legacy` when a cb row has the old mapping. The old mapping is a program of the type `program`, a pull request of the type `task`, or an epic that a pull request blocks.

| Source | Title | `description` | `acceptance_criteria` | `design` |
|---|---|---|---|---|
| Program | the `title` of `goal.json`, or the plan folder name | the `outcome` of `goal.json` | the `done_when` lines | the design folder path, when it exists |
| Epic | the header name in `04-slices.md`, or the `title` in `goal.json` | the `outcome` in `goal.json` | none | the path of `epic-<id>-design.md`, when it exists |
| Slice | the slice name | none | the `Ends with` cell | none |

## Id mapping

bd ids differ from cb ids. The adapter reads `bd list --json --all` and maps each bd id to its cb id through the `metadata.cb` envelope.

A bd database may hold issues from other tools. The adapter never reads, changes, or closes an issue that has no `metadata.cb` block.

## Failure messages

| Message | Cause | Action |
|---|---|---|
| `bd binary not found: <path>` | bd does not exist or is not on the PATH | Install bd 1.3.0. |
| `bd <args> exited <code>: <stderr>` | A bd call failed | Read stderr and fix the named cause. |
| `bd sync failed: <stderr>` | A sync failed | On an empty remote, run the first-publish steps. Otherwise read stderr. |
| `no branches found in remote` | First sync to an empty remote | Run the first-publish steps. |
| `invalid issue type: program` (replaced by ADR-0044) | The `program` type is not set | Run `bd config set types.custom program`. |
| `claim of <id> refused: already claimed by <holder>` | Another holder owns a live claim | Pick another slice. The message names the holder. |
| `claim of <id> refused: <stderr>` | bd refused the claim, for example a closed issue (`issue not claimable`) | Pick another slice. |
| `pull request ref <ref> must end in its GitHub number, such as pr-101` | The ref has no GitHub number | Use the form `pr-<n>`. |
| `record <ref> already exists` | A create used a ref that exists | Read the existing record. Do not create it again. |
| An issue has no `metadata.cb` block | Another tool made the issue (a foreign issue) | None. The adapter ignores foreign issues, and `doctor` counts them as `foreign_issues`. |
| `bd issue <id> has unknown metadata.cb.kind <kind>` | The kind is not program, epic, slice, or pr | Fix the kind through the adapter. |

## E5-1 spike: claim flags, exit codes, lease expiry

The runs used bd 1.3.0 in scratch workspaces under `/tmp`. The actor name comes from the `BEADS_ACTOR` variable or the `--actor` flag. Each transcript is in `tests/fixtures/tracker/beads/transcripts/`. The step order in a file matches the order of the rows. The adapter did not change.

| Command | Actor | Exit | Result | Pass | Transcript |
|---|---|---|---|---|---|
| `bd update <id> --claim` on an open issue | alice | 0 | Status in_progress, assignee alice | pass | `claim-flag-actors.json` |
| The same command again | alice | 0 | The claim is idempotent | pass | `claim-flag-actors.json` |
| The same command, with the claim held | bob | 1 | `issue already claimed by alice` | pass | `claim-flag-actors.json` |
| `bd update <id> --claim --if-assignee alice` | alice | 1 | bd refuses the two flags together | fail | `claim-if-assignee.json` |
| `bd update <id> --claim --if-assignee ""` and `--if-status open` | bob | 1 | The same refusal | fail | `claim-if-assignee.json` |
| `bd update <id> --status in_progress --assignee alice --if-assignee ""` on an unassigned issue | alice | 0 | The update writes | pass | `claim-if-assignee.json` |
| The same command, with alice as holder | bob | 13 | `assignee mismatch`, nothing written | pass | `claim-if-assignee.json` |
| The same flags, with `--if-assignee alice` and alice as holder | alice | 0 | The update writes | pass | `claim-if-assignee.json` |
| The same flags, with `--if-assignee carol` and alice as holder | bob | 13 | `held by "alice", expected "carol"` | pass | `claim-if-assignee.json` |
| The same flags, with `--if-assignee carol` and no holder | bob | 13 | `held by "", expected "carol"` | pass | `claim-if-assignee.json` |
| Eight parallel `bd update <id> --claim` | w0 to w7 | 0 once, 1 seven times | One winner (w6) | pass | `claim-concurrent-eight.json` |
| Eight parallel guarded updates with `--if-assignee ""` | w0 to w7 | 0 once, 13 seven times | One winner (w2) | pass | `claim-concurrent-eight-guard.json` |
| `bd heartbeat <id>` | alice | 0 | Lease refreshed | pass | `claim-lease-reclaim.json` |
| `bd heartbeat <id>` | bob | 1 | `issue already claimed by alice` | pass | `claim-lease-reclaim.json` |
| `bd reclaim --older-than 0s --id <id>` on a fresh lease | sup | 0 | No stale lease, claim stays | pass | `claim-lease-reclaim.json` |
| `bd update <id> --claim`, 310 s after the claim | bob | 1 | A lease that expired does not free the claim | pass | `claim-lease-expiry.json` |
| `bd reclaim --older-than 0s --id <id>`, 310 s after the claim | sup | 0 | Status open, no assignee | pass | `claim-lease-expiry.json` |
| `bd update <id> --claim`, after the reclaim | bob | 0 | Bob holds the claim | pass | `claim-lease-expiry.json` |
| `bd update <missing> --claim` | alice | 1 | `no issue found matching` | pass | `claim-missing-closed.json` |
| `bd update <closed> --claim` | alice | 1 | `issue not claimable: status closed` | pass | `claim-missing-closed.json` |
| `bd update <closed> --status in_progress --assignee a --if-assignee ""` | alice | 0 | The guard reopens a closed issue | fail | `claim-missing-closed.json` |

The `show --json` output after a claim holds `"status": "in_progress"` and `"assignee": "<actor>"`. It also holds `started_at`, `lease_expires_at`, and `heartbeat_at`. After a reclaim, `status` is `open` and the `assignee` key is absent. See `claim-flag-actors.json` and `claim-lease-expiry.json`.

Findings:

- Risk 1, lease guard. A lease exists. It lasts 5 minutes (`lease_expires_at` minus `started_at`), and no config key sets it. An expired lease alone does not free a claim. Only `bd reclaim` frees it. The adapter needs no lease guard of its own. A supervisor, or the user, runs `bd reclaim`.
- Risk 5, stale claim. The `--claim` flag refuses a held issue with exit 1, not 13. Exit 13 comes only from `--if-assignee` and `--if-status` on a field update. The earlier note that `--claim --if-assignee` exits 13 is wrong, because bd refuses the two flags together.
- Flag set for E5-2. Use `bd update <id> --claim` alone, with the claimant in `BEADS_ACTOR` or `--actor`. Treat exit 1 with `already claimed by` in stderr as the conflict, and map it to an adapter error (exit 3). Read stderr, because exit 1 also covers a missing issue and a closed issue.
- Claim is atomic: 1 winner in 8 parallel calls. The adapter can set `atomic_claim` to true after E5-2.
- A guarded update, such as `--if-assignee ""`, can reopen a closed issue. Do not use it for a claim.
- A claim by `--claim` cannot set a different assignee than the actor. The adapter must pass the claimant as the actor.

## Not verified

- A cloud session on a real GitHub remote, with only a git clone. The checks used a local bare origin.
- Claim races between two machines. The eight-call test ran on one machine.
- bd versions other than 1.3.0.

## E5-3: native ready does not reach parity

> Replaced by ADR-0044.

- `bd ready --json --limit 0` on the E1 corpus lists `demo`, `demo-E3`, and `pr-101`. It does not list the slice `demo-E1-s3`. bd treats a child of a blocked parent as blocked, and the epic `demo-E1` is blocked by the open `pr-101`. The transcript is `ready-bd-corpus.json`.
- `bd ready` also lists the pull request record, which is a task, and the deferred epic `demo-E3`. The adapter rules drop both.
- The molecule root has the type `molecule`. Plain `bd ready` omits it. `bd ready --mol <root>` lists it. The transcript is `ready-bd-molecule.json`.
- The slice difference is a difference that bd cannot close. So `native_ready` stays false, and the adapter computes ready itself, as E1 does. The adapter has no `ready_argv` and no hybrid path.
- The live parity test compares the adapter result with the E1 projector for each kind and for `under`.

## E5-4: pull request gates

> Replaced by ADR-0044.

- `open_pull_request` keeps the `blocks` dependency. It then runs `bd gate create --type gh:pr --blocks <epic> --await-id <number> --json` once for each blocked epic. The PR number is the await id.
- The adapter stores the gate ids in the PR record, in `metadata.cb.envelope.gates`. A second `bd update` writes them, and then the sync runs.
- `set_pull_request_state(merged)` runs `bd gate list --json`. It runs `bd gate resolve <id>` for each stored gate that is open and whose `await_id` equals the PR number. Then it closes the PR.
- A gate with no stored number has no `await_id`. It stays pending, and the merge raises no error.
- The open and closed states run no gate command. A PR with no stored gate ids runs no gate command.
- `bd list` hides gate rows. An epic row still lists its gate as a `blocks` dependency. A read skips a `blocks` dependency whose target bd did not list.
- bd 1.3.0: `bd gate list --json` prints `null`, not `[]`, when no gate is open. The adapter reads `null` as an empty list.

## E5-5: slice-loop formula

The file is `shared/tracker_port/formulas/slice-loop.toml`. It has the steps `red`, `green`, and `validate`, and one required variable, `slice_id`. The checks ran on bd 1.3.0.

- bd finds a formula by the name `<name>.formula.toml` in `.beads/formulas`. Copy the file there with the name `slice-loop.formula.toml`.
- `bd cook slice-loop --var slice_id=<id>` shows the steps. `bd cook slice-loop --persist --force` makes a proto.
- `bd mol pour slice-loop --var slice_id=<id> --json` makes a molecule with the three steps. `bd ready --mol <molecule>` lists the steps in order. The list also holds the molecule root.
- A failed attempt is an ephemeral child of the molecule: `bd create <title> --ephemeral --parent <molecule> --json`. The first child gets the id `<molecule>.1`.
- Use `bd mol squash <molecule> --keep-children --summary <text>` to make a digest. With the flag, the result shows `kept_children` true and `deleted_count` 0, and the attempts stay. Without the flag, `deleted_count` is 1, and bd deletes the open attempts.
- The adapter and the CLI do not read the formula. No code names the file, and the CLI operations did not change.

## E7-1 spike: native mapping and bd ready

The runs used bd 1.3.0 in a fresh scratch workspace, `/tmp/e71`, not the repo tracker. The actor was `BEADS_ACTOR=alice`. Each row has an exit code from the re-run. A step number counts from 0 in the `steps` list of the transcript. The rows for the migration run, the timing, the defer dates, and the row limits come from the designer's log `/tmp/e7-spike.md`, and they were not re-run. The adapter did not change.

| Area | Command | Exit | Result | Evidence |
|---|---|---|---|---|
| Retype | `bd update <task> --type feature` | 0 | `issue_type` is `feature`, and `external_ref` stays | `native-retype.json` steps 2 and 3 |
| Retype | `bd update <task> --type milestone` | 0 | `issue_type` is `milestone` | `native-retype.json` steps 4 and 6 |
| Retype | `bd update <task> --type bogus` | 1 | `validation failed: invalid issue type bogus` | `native-retype.json` step 5 |
| Tree and ready | `bd ready -t task --json --limit 0` on feature > epic > task with `blocks` edges | 0 | One row, `E1-1`. The epic `E2` waits for `E1`, and `E1-2` waits for `E1-1` | `native-tree-ready.json` step 15 |
| Tree and ready | `bd ready -t task --parent <feature> --json --limit 0` (depth 2) | 0 | One row, `E1-1` | `native-tree-ready.json` step 16 |
| Tree and ready | `bd ready -t task --parent <epic E2> --json --limit 0` (depth 1, blocked epic) | 0 | `[]` | `native-tree-ready.json` step 17 |
| Tree and ready | `bd ready -t epic --json --limit 0`, and the same with `-t feature` | 0 | `E1` only, and the feature only | `native-tree-ready.json` steps 18 and 19 |
| Row shape | `bd list --json --all --limit 0` with a milestone that tracks two epics | 0 | The milestone row holds two `tracks` dependencies. A slice row holds `parent-child` and `blocks` | `native-tree-ready.json` step 14 |
| Row shape | `bd show <milestone> --json` | 0 | `dependencies` holds full issues, each with `dependency_type` `tracks` | `native-tree-ready.json` step 13 |
| Claim | `bd ready -t task --claim --actor alice --json --limit 0` | 0 | One row, `E1-1`, with `status` `in_progress` and `assignee` alice | `native-ready-claim.json` step 0 |
| Claim | The same command with `--actor bob`, with nothing ready | 0 | `[]` | `native-ready-claim.json` step 1 |
| Claim | `bd ready -t task --json --limit 0` after the claim | 0 | `[]`. The held slice and its blocked sibling are not ready | `native-ready-claim.json` step 2 |
| Lifecycle | `bd update <epic> --status in_progress`, then `bd ready -t epic` | 0 | `[]`. The epic leaves the epic list | `native-ready-claim.json` steps 3 and 4 |
| Lifecycle | `bd close <slice E1-1>`, then `bd ready -t task` | 0 | `E1-2`. An epic in progress keeps its children ready | `native-ready-claim.json` steps 5 and 6 |
| Lifecycle | `bd close <last slice of E1>`, then `bd list --json --all --limit 0` | 0 | Nothing auto-closes. `E1` stays `in_progress`, and the feature stays `open` | `native-ready-claim.json` steps 7 and 8 |
| Lifecycle | `bd ready -t task` after the last slice closes | 0 | `[]`, because `E2` waits for `E1` | `native-ready-claim.json` step 9 |
| Lifecycle | `bd close <E1>`, then `bd ready -t task` | 0 | `E2-1` | `native-ready-claim.json` steps 10 and 11 |
| Lifecycle | `bd defer <E2> --until 2027-01-01`, then `bd ready -t task` | 0 | `[]`. A deferred epic hides its children | `native-ready-claim.json` steps 12 and 13 |
| Claim | `bd ready -t task --parent <deferred epic> --claim --actor bob --json --limit 0` | 0 | `[]` | `native-ready-claim.json` step 14 |
| Dependencies | `bd dep rm <epic> <task>`, run twice | 0 and 0 | Both calls print `Removed dependency`. The removal is idempotent | `native-dep-gate.json` steps 3 and 4 |
| Dependencies | `bd gate resolve <gate>` | 0 | `Gate resolved`. The gate row is `closed`, and the epic keeps a `blocks` edge to it | `native-dep-gate.json` steps 6 and 7 |
| Dependencies | `bd dep rm <epic> <gate>` | 0 | The edge goes, and `bd show <epic> --json` lists no dependency | `native-dep-gate.json` steps 8 and 9 |
| Foreign tasks | `bd ready -t task --label cb --json --limit 0` with one foreign task and one labeled slice | 0 | Only the labeled slice | `native-foreign-label.json` step 3 |
| Foreign tasks | `bd ready -t task --label cb --claim --actor dave --json --limit 0` | 0 | The claim takes the labeled slice, not the foreign task (priority 0) | `native-foreign-label.json` steps 4 and 5 |
| Foreign tasks | `bd ready -t task --claim --actor dave --json`, with no label | 0 | The claim takes the foreign task | `/tmp/e7-spike.md` lines 68 to 75 |
| External ref | `bd list --external-ref E1-1 --json --limit 0`, a known ref | 0 | One row, the issue with `external_ref` `E1-1` | `native-external-ref.json` step 2 |
| External ref | `bd list --external-ref E9-9 --json --limit 0`, an unknown ref | 0 | `[]`. The exit code is 0, not an error | `native-external-ref.json` step 3 |
| External ref | `bd create dup --type task --external-ref E1-1 --json`, a second issue with a known ref | 0 | bd accepts the duplicate | `native-external-ref.json` step 5 |
| External ref | `bd list --external-ref E1-1 --json --all --limit 0` after the duplicate | 0 | Two rows | `native-external-ref.json` step 6 |
| Migration run | `bd update --type`, `bd dep rm`, `bd dep add --type tracks`, `bd config unset types.custom`, and the field updates, on an old-mapping tracker | 0 for each | `bd ready -t task` changes from `gh-101` to `E1-1` | `/tmp/e7-spike.md` lines 58 to 63 |
| Timing | A block of about 10 bd calls in a scratch store of 8 rows | 0 | 1.4 s to 17 s of wall time. The time for 322 issues is an inference | `/tmp/e7-spike.md` lines 64 to 67 |
| Defer dates | `bd create --type epic --defer 2027-01-01`, and `bd update <epic> --defer 2020-01-01` | 0 | A past date frees the children, and the status word stays `deferred` | `/tmp/e7-spike.md` lines 76 to 82 |
| Row limits | `bd list --json --all` and `bd ready -t task --json`, each with and without `--limit 0`, on 60 tasks | 0 | 60 rows each | `/tmp/e7-spike.md` lines 83 to 85 |

Findings:

- `bd update <id> --type` retypes an issue in place. The `external_ref` and the metadata stay. bd 1.3.0 refuses an unknown type with exit 1.
- With a `blocks` edge between epics, the native frontier of `bd ready -t task` is the slice frontier. A `tracks` edge from a milestone adds no block. `--parent` filters at depth 1 and at depth 2.
- `bd ready --claim` claims one issue and exits 0. When nothing is ready, it prints `[]` and exits 0. A caller cannot tell "held" from "empty" by the exit code.
- An epic in progress keeps its children ready. Closing the last slice closes no parent. A deferred epic hides its children.
- `bd dep rm` is idempotent. `bd gate resolve` closes the gate row but keeps the `blocks` edge, so `bd dep rm` must remove the edge.
- `--label` filters both the ready list and the claim, so a claim does not take a foreign task. A claim with no label can take a foreign task.
- `bd list --external-ref <ref> --json --limit 0` is an exact filter. A known ref gives one row, and an unknown ref gives `[]` with exit 0. bd does not enforce one issue for each ref. A duplicate create succeeds with exit 0, so the adapter must check for a ref before it creates.

Not verified (unverified, with no outcome stated):

- The claim race between two machines.
- The restore from `bd export`.
- Any bd version other than 1.3.0.
- A defer date in the future that passes by the clock.
