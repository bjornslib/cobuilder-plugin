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

## Setup on the first machine

Run these steps in order. Each step needs the step before it.

1. `bd init --skip-agents --skip-hooks -p demo --non-interactive`. The two skip flags skip bd's agent and hook setup. `-p demo` is the id prefix that the verification runs used.
2. `bd config set types.custom program`. bd has no built-in `program` type. A `program` create fails until this step runs. The adapter runs this step on demand, and you can run it by hand.
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

## Claim read-back

`claim_slice` runs `bd update <id> --status in_progress --assignee <claimant>`. Then it runs `bd show <id> --json` and compares the assignee with the claimant.

- bd refuses to reassign a live claim. It exits 1 and names the holder in stderr.
- The adapter raises `claim of <id> refused: <stderr>`.
- When the read-back assignee differs from the claimant, the adapter raises `claim of <id> read back assignee <value>, not <claimant>`.

The adapter does not call `bd claim`. It sets `atomic_claim` to false, so two sessions can race until the read-back lands.

## Metadata wrapper

Send every envelope through `--metadata` as `{"cb": {...}}`. The adapter builds this form in `_metadata_arg`.

- `--set-metadata` stores a flat key. Do not use it.
- A bare key form merges keys at the top level, outside `cb`. Do not use it.

## Close and force

The adapter sends `--force` on every close. bd refuses to close an epic that has open children unless the command includes `--force`.

## Pull request issues

`open_pull_request(ref, epic_ids)` writes one issue for each pull request.

- The ref must end in the GitHub number, such as `pr-101`.
- The issue title is the ref. Its `external_ref` is `gh-<n>`, such as `gh-101`.
- The issue type is `task`. The envelope holds no `pr` key. The number lives in the title and in `external_ref`.
- The adapter runs `bd dep add <epic> <pr>` for each epic in `epic_ids`. Each epic stays blocked until the `pr` issue closes.

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
| `invalid issue type: program` | The `program` type is not set | Run `bd config set types.custom program`. |
| `claim of <id> refused: <stderr>` | Another holder owns a live claim | Pick another slice. Stderr names the holder. |
| `claim of <id> read back assignee <value>, not <claimant>` | Another session won the claim race | Pick another slice. |
| `pull request ref <ref> must end in its GitHub number, such as pr-101` | The ref has no GitHub number | Use the form `pr-<n>`. |
| `record <ref> already exists` | A create used a ref that exists | Read the existing record. Do not create it again. |
| An issue has no `metadata.cb` block | Another tool made the issue (a foreign issue) | None. The adapter ignores foreign issues, and `doctor` counts them as `foreign_issues`. |
| `bd issue <id> has unknown metadata.cb.kind <kind>` | The kind is not program, epic, slice, or pr | Fix the kind through the adapter. |

## Not verified

- A cloud session on a real GitHub remote, with only a git clone. The checks used a local bare origin.
- Whether `bd claim` is atomic. The adapter does not call it.
- Claim races between two machines. Only the read-back guards a claim.
- bd versions other than 1.3.0.
