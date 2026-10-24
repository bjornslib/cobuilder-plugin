# Tracker usage

This guide tells agents how to read and write workflow state. It follows ADR-0040. Each example output comes from a real run in a scratch repo. Write this guide inside the prose budget in `shared/prose-budget.md`, and run `uv run shared/prose_budget.py check shared/tracker-usage.md`.

## The rule

Agents read and write workflow state only through `tracker.py`. Do not call any other tracker command, API, or tool for state. Do not edit `00-status.md`, `04-slices.md`, or `goal.json` by hand.

To open a pull request, use `gh`. Then record the pull request with `open-pull-request`.

## Session start

Every write example below runs over the fake adapter. Each example runs in a scratch repo that has a config file naming the fake adapter, so a write succeeds. With no config, a write exits with code 2. See the no-config example under Failure and refusal.

Run `doctor` first. It shows the adapter and its capabilities. Then run `list-programs`, and read the stage and gate values in its output. A build session also runs `list-epics --program <program>`.

```console
$ uv run shared/tracker.py doctor
{
  "ok": true,
  "result": {
    "adapter": "fake",
    "capabilities": {
      "atomic_claim": true,
      "native_ready": false,
      "offline_read": true,
      "rich_envelope": true
    }
  }
}
$ uv run shared/tracker.py list-programs
{
  "ok": true,
  "result": [
    {
      "acceptance_criteria": null,
      "assignee": null,
      "blocked_by": [],
      "description": null,
      "design": null,
      "envelope": {
        "gate1": "2026-10-14",
        "gate2b": "n/a",
        "stage": "design"
      },
      "external_ref": null,
      "id": "demo",
      "kind": "program",
      "lifecycle": "open",
      "parent": null,
      "title": null,
      "tracks": []
    }
  ]
}
$ uv run shared/tracker.py list-epics --program demo
{
  "ok": true,
  "result": [
    {
      "acceptance_criteria": null,
      "assignee": null,
      "blocked_by": [],
      "description": null,
      "design": null,
      "envelope": {},
      "external_ref": null,
      "id": "demo-E1",
      "kind": "epic",
      "lifecycle": "open",
      "parent": "demo",
      "title": null,
      "tracks": []
    },
    {
      "acceptance_criteria": null,
      "assignee": null,
      "blocked_by": [
        "demo-E1"
      ],
      "description": null,
      "design": null,
      "envelope": {},
      "external_ref": null,
      "id": "demo-E2",
      "kind": "epic",
      "lifecycle": "open",
      "parent": "demo",
      "title": null,
      "tracks": []
    },
    {
      "acceptance_criteria": null,
      "assignee": null,
      "blocked_by": [
        "demo-E2"
      ],
      "description": null,
      "design": null,
      "envelope": {
        "deferred": "2099-12-31"
      },
      "external_ref": null,
      "id": "demo-E3",
      "kind": "epic",
      "lifecycle": "open",
      "parent": "demo",
      "title": null,
      "tracks": []
    }
  ]
}
```
For beads, `doctor` lists `mapping: native` or `mapping: legacy`. It also lists `native_ready` to show whether beads decides slice readiness.

## Vocabulary

Record kinds are `program`, `epic`, `slice`, and `pr`. The lifecycle states are `open`, `in_progress`, and `closed`. A composite id has the form `<design>/E5` or `<design>/<n>`.

Gate values are a date, `n/a`, or absent. An assignee is a GitHub login. The envelope holds the other fields, such as `stage`, `score`, and `branch`. A record also holds the text fields `title`, `description`, `acceptance_criteria`, and `design`, and `tracks` for a pull request. Each text field is `null` when it has no value. Each epic after the first is blocked by the epic before it, so `blocked_by` shows the order. Two records are equal when they differ only in a text field. The beads adapter reads the text fields from the bd row, and the files adapter reads them from the plan and design files.

## Moment table

Find the command for each workflow moment in this table.

| Workflow moment | Command |
|---|---|
| Session start | `doctor`, then `list-programs`. A build also runs `list-epics`. |
| Design decided | `set-program-stage <program> <stage>` |
| Branch created | `set-epic-state <epic> <state> --branch <branch>` |
| Gate approved | `set-gate-value <program> <gate> <value>`, then `add-note <id> <text>` |
| Gate 3 seeds slices | `seed-from-files <plans-dir>` |
| Worker takes the next slice | `claim-next <claimant> [--under <epic or program>]` |
| Worker claims a named slice | `claim-slice <id> <claimant>` |
| Attempt fails | `record-attempt <id> <score> --note <text>` |
| Slice passes | `set-slice-state <id> closed --score <score> --attempts <n>` |
| Escalate | `escalate <id> <score> <reason>` |
| Engineer moves on from a slice | `skip-slice <id> --reason <text> [--outcome skipped\|escalated]` |
| PR opens | `open-pull-request <ref> <epic-id>...` |
| PR merges | `set-pull-request-state <ref> merged`, then `set-epic-state` |
| Program done | `set-program-stage <program> <stage>` |
| Session end | `sync` |
| Tracker uses the old mapping | `doctor`, then `migrate-mapping --dry-run`, then `migrate-mapping` |
| Status files drift from the tracker | `uv run shared/tracker.py regenerate-status-files <program> --plans-dir <dir>` |
```console
$ uv run shared/tracker.py regenerate-status-files demo --plans-dir docs/plans
exit: 1
```
This fake-adapter example exits 1 because the scratch repo has no status files.
 

## Migrate a legacy tracker

When `doctor` reports `mapping: legacy`, inspect the planned changes first.
Show the report to the engineer and get approval before the migration run.

```console
$ uv run shared/tracker.py migrate-mapping --dry-run
{
  "ok": true,
  "result": {
    "changed": 0,
    "changes": [],
    "counts": {},
    "dry_run": true,
    "missing": []
  }
}
$ uv run shared/tracker.py migrate-mapping
{
  "ok": true,
  "result": {
    "changed": 0,
    "changes": [],
    "counts": {},
    "dry_run": false,
    "missing": []
  }
}
```

This example runs on a fake adapter. The fake adapter returns an empty report and keeps its records.
`regenerate-status-files` rewrites only the state lines of `00-status.md` and `04-slices.md`. It keeps every prose line. With no adapter, it exits 2 and writes nothing.

## Read patterns

Read state with the `list-*`, `get-slice`, and `next-ready` operations. Do not read the index or `04-slices.md` to find state. To resume a build, ask for the next ready slice in an epic.

```console
$ uv run shared/tracker.py next-ready --kind slice --under demo-E1
{
  "ok": true,
  "result": [
    {
      "acceptance_criteria": null,
      "assignee": null,
      "blocked_by": [
        "demo-E1-s1"
      ],
      "description": null,
      "design": null,
      "envelope": {},
      "external_ref": null,
      "id": "demo-E1-s3",
      "kind": "slice",
      "lifecycle": "open",
      "parent": "demo-E1",
      "title": null,
      "tracks": []
    }
  ]
}
$ uv run shared/tracker.py claim-slice demo-E1-s3 agent-2
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": "agent-2",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "description": null,
    "design": null,
    "envelope": {},
    "external_ref": null,
    "id": "demo-E1-s3",
    "kind": "slice",
    "lifecycle": "open",
    "parent": "demo-E1",
    "title": null,
    "tracks": []
  }
}
```

```console
$ uv run shared/tracker.py claim-next agent-2
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": "agent-2",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "description": null,
    "design": null,
    "envelope": {},
    "external_ref": null,
    "id": "demo-E1-s3",
    "kind": "slice",
    "lifecycle": "in_progress",
    "parent": "demo-E1",
    "title": null,
    "tracks": []
  }
}
```

The `claim-next` operation claims the first ready slice in one call. It also sets the epic of that slice to `in_progress` when the epic is open. When no slice is ready, it prints `null` as the result and exits 0. Use `--under` to limit the claim to one epic or program.

The `next-ready` operation returns the slices that are ready to start. A worker claims a slice with `claim-slice` before it starts work.

On the beads adapter, `native_ready` is true. A slice query asks the tracker to find the ready slices, and the tracker decides. On a tracker in the old mapping, a slice query stops with exit code 3 and tells you to run `migrate-mapping`. The program and epic kinds still use the adapter rule.

To list slices or read one slice, use `list-slices` or `get-slice`.

```console
$ uv run shared/tracker.py list-slices --epic demo-E1
{
  "ok": true,
  "result": [
    {
      "acceptance_criteria": null,
      "assignee": null,
      "blocked_by": [],
      "description": null,
      "design": null,
      "envelope": {
        "score": 0.92
      },
      "external_ref": null,
      "id": "demo-E1-s1",
      "kind": "slice",
      "lifecycle": "closed",
      "parent": "demo-E1",
      "title": null,
      "tracks": []
    },
    {
      "acceptance_criteria": null,
      "assignee": "agent-1",
      "blocked_by": [
        "demo-E1-s1"
      ],
      "description": null,
      "design": null,
      "envelope": {},
      "external_ref": null,
      "id": "demo-E1-s2",
      "kind": "slice",
      "lifecycle": "in_progress",
      "parent": "demo-E1",
      "title": null,
      "tracks": []
    },
    {
      "acceptance_criteria": null,
      "assignee": null,
      "blocked_by": [
        "demo-E1-s1"
      ],
      "description": null,
      "design": null,
      "envelope": {},
      "external_ref": null,
      "id": "demo-E1-s3",
      "kind": "slice",
      "lifecycle": "open",
      "parent": "demo-E1",
      "title": null,
      "tracks": []
    }
  ]
}
$ uv run shared/tracker.py get-slice demo-E1-s2
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": "agent-1",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "description": null,
    "design": null,
    "envelope": {},
    "external_ref": null,
    "id": "demo-E1-s2",
    "kind": "slice",
    "lifecycle": "in_progress",
    "parent": "demo-E1",
    "title": null,
    "tracks": []
  }
}
```

## Prepare

`tracker.py prepare` sets up the tracker once, before the first seed. It makes no changes to tracker types. It prints `changed: false` when no setup is needed. A second call changes nothing.

```console
$ uv run shared/tracker.py prepare
{
  "ok": true,
  "result": {
    "changed": false
  }
}
```

## Writes

A write returns the record after the change.

```console
$ uv run shared/tracker.py set-slice-state demo-E1-s2 closed --score 0.92 --attempts 2
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": "agent-1",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "description": null,
    "design": null,
    "envelope": {
      "attempts": 2,
      "score": 0.92
    },
    "external_ref": null,
    "id": "demo-E1-s2",
    "kind": "slice",
    "lifecycle": "closed",
    "parent": "demo-E1",
    "title": null,
    "tracks": []
  }
}
```

Use `--state-file` to read an earlier write in a later call. It is a top-level option, so place it before the subcommand.

```console
$ uv run shared/tracker.py --state-file state.json set-slice-state demo-E1-s3 closed --score 0.88 --attempts 1
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": null,
    "blocked_by": [
      "demo-E1-s1"
    ],
    "description": null,
    "design": null,
    "envelope": {
      "attempts": 1,
      "score": 0.88
    },
    "external_ref": null,
    "id": "demo-E1-s3",
    "kind": "slice",
    "lifecycle": "closed",
    "parent": "demo-E1",
    "title": null,
    "tracks": []
  }
}
$ uv run shared/tracker.py --state-file state.json next-ready --kind slice --under demo-E1
{
  "ok": true,
  "result": []
}
```

The second call finds no ready slice, because the first call closed the last one.

```console
$ uv run shared/tracker.py set-program-stage demo approved
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": null,
    "blocked_by": [],
    "description": null,
    "design": null,
    "envelope": {
      "gate1": "2026-10-14",
      "gate2b": "n/a",
      "stage": "approved"
    },
    "external_ref": null,
    "id": "demo",
    "kind": "program",
    "lifecycle": "open",
    "parent": null,
    "title": null,
    "tracks": []
  }
}
$ uv run shared/tracker.py set-gate-value demo gate2b 2026-10-15
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": null,
    "blocked_by": [],
    "description": null,
    "design": null,
    "envelope": {
      "gate1": "2026-10-14",
      "gate2b": "2026-10-15",
      "stage": "design"
    },
    "external_ref": null,
    "id": "demo",
    "kind": "program",
    "lifecycle": "open",
    "parent": null,
    "title": null,
    "tracks": []
  }
}
$ uv run shared/tracker.py add-note demo-E1-s2 'checked the gate'
{
  "ok": true,
  "result": null
}
```

`set-program-stage` also sets the program's lifecycle. A program at stage `implemented` or `superseded` is closed. At any other stage, the epics set the lifecycle. On the beads adapter, a change of lifecycle also writes the bd status. The stage wins over an epic: a closed program stays closed when an epic starts.

`seed-from-files` takes the stage of a plan program from the `goal.json` of its design. It reads the design with the plan name first. Else it reads the design that the prefix of the first epic id names. The stage goes into the program envelope, and it sets the lifecycle. A refresh never replaces a stage that the program already holds. A seed repair closes an open program when its held stage is `implemented` or `superseded`, with or without a plan file. It does not close a program that holds the runtime stage `review`.

```console
$ uv run shared/tracker.py record-attempt demo-E1-s2 0.6 --note 'first try'
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": "agent-1",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "description": null,
    "design": null,
    "envelope": {
      "attempts": 1,
      "score": 0.6
    },
    "external_ref": null,
    "id": "demo-E1-s2",
    "kind": "slice",
    "lifecycle": "in_progress",
    "parent": "demo-E1",
    "title": null,
    "tracks": []
  }
}
$ uv run shared/tracker.py escalate demo-E1-s2 0.4 'needs a human'
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": "agent-1",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "description": null,
    "design": null,
    "envelope": {
      "escalated": true,
      "score": 0.4
    },
    "external_ref": null,
    "id": "demo-E1-s2",
    "kind": "slice",
    "lifecycle": "in_progress",
    "parent": "demo-E1",
    "title": null,
    "tracks": []
  }
}
```

`skip-slice` closes a slice with an outcome and a reason, so the later slices of the epic become ready. The outcome is `skipped` by default. Use `escalated` after `escalate`. A repeat call with the same outcome and reason changes nothing.

```console
$ uv run shared/tracker.py skip-slice demo-E1-s2 --reason 'delayed by the engineer'
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": "agent-1",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "description": null,
    "design": null,
    "envelope": {
      "outcome": "skipped",
      "reason": "delayed by the engineer"
    },
    "external_ref": null,
    "id": "demo-E1-s2",
    "kind": "slice",
    "lifecycle": "closed",
    "parent": "demo-E1",
    "title": null,
    "tracks": []
  }
}
```

```console
$ uv run shared/tracker.py set-epic-state demo-E1 closed --branch design/x
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": null,
    "blocked_by": [],
    "description": null,
    "design": null,
    "envelope": {
      "branch": "design/x"
    },
    "external_ref": null,
    "id": "demo-E1",
    "kind": "epic",
    "lifecycle": "closed",
    "parent": "demo",
    "title": null,
    "tracks": []
  }
}
$ uv run shared/tracker.py open-pull-request pr-102 demo-E2
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": null,
    "blocked_by": [],
    "description": null,
    "design": null,
    "envelope": {},
    "external_ref": null,
    "id": "pr-102",
    "kind": "pr",
    "lifecycle": "open",
    "parent": null,
    "title": null,
    "tracks": [
      "demo-E2"
    ]
  }
}
$ uv run shared/tracker.py set-pull-request-state pr-101 merged
{
  "ok": true,
  "result": {
    "acceptance_criteria": null,
    "assignee": null,
    "blocked_by": [],
    "description": null,
    "design": null,
    "envelope": {},
    "external_ref": "gh-101",
    "id": "pr-101",
    "kind": "pr",
    "lifecycle": "closed",
    "parent": null,
    "title": null,
    "tracks": [
      "demo-E1",
      "demo-E2"
    ]
  }
}
```

`set-epic-state` also sets the lifecycle of the epic's program. The program is in progress when any epic is in progress. It is closed when it has epics and all are closed. Otherwise it is open.

## Failure and refusal

Each call exits with one of four codes. A success writes one JSON object to stdout. A failure writes one JSON line to stdout and one message to stderr. Repeated `set-*` calls are idempotent.

- `0`: the call succeeded.
- `2`: the call is refused. No tracker adapter is configured, and nothing was written. Stop, and tell the engineer to run `/cobuilder-full-lifecycle:install`. Do not edit a status file by hand.
- `3`: the adapter failed. Read the message on stderr and fix its cause.
- `4`: the arguments are not valid. Correct the call and run it again.

A call in a repo with no configuration exits with code 2:

```console no-config
$ uv run shared/tracker.py list-programs
{"error": "no tracker adapter configured: <repo>/.cobuilder/tracker.yaml does not exist", "exit": 2, "ok": false}
exit: 2
```

Calls with a state value or an id that does not exist exit with code 4:

```console
$ uv run shared/tracker.py set-slice-state demo-E1-s2 done
{"error": "state must be one of open, in_progress, closed, not done", "exit": 4, "ok": false}
exit: 4
$ uv run shared/tracker.py get-slice demo-E1-zz
{"error": "no slice with id demo-E1-zz", "exit": 4, "ok": false}
exit: 4
```

A dry run with a plans directory that does not exist exits with code 3. A dry run with a real plans directory returns the planned creates and writes nothing.

```console
$ uv run shared/tracker.py seed-from-files --dry-run plans
{"error": "plans directory not found: plans", "exit": 3, "ok": false}
exit: 3
```

## Session end

Run `sync` when a session ends. The `capabilities` operation shows what the adapter supports.

```console
$ uv run shared/tracker.py sync
{
  "ok": true,
  "result": null
}
$ uv run shared/tracker.py capabilities
{
  "ok": true,
  "result": {
    "atomic_claim": true,
    "native_ready": false,
    "offline_read": true,
    "rich_envelope": true
  }
}
$ uv run shared/tracker.py list-pull-requests
{
  "ok": true,
  "result": [
    {
      "acceptance_criteria": null,
      "assignee": null,
      "blocked_by": [],
      "description": null,
      "design": null,
      "envelope": {},
      "external_ref": "gh-101",
      "id": "pr-101",
      "kind": "pr",
      "lifecycle": "open",
      "parent": null,
      "title": null,
      "tracks": [
        "demo-E1",
        "demo-E2"
      ]
    }
  ]
}
```

## Configuration

The file `.cobuilder/tracker.yaml` names the adapter. It holds these keys:

- `adapter`: the adapter to use: `beads`, `files`, or `fake`.
- `plans_dir`: the plans folder that the `files` adapter reads, such as `docs/plans`.
- `corpus`: the corpus folder that the `fake` adapter reads.
- `state_file`: the file where the `fake` adapter keeps its state.
- `bd`: the bd command that the `beads` adapter runs. It defaults to `bd`.
- `sync`: when the `beads` adapter syncs. `async` is the default for beads. It marks the sync as pending, and a short-lived worker runs it. `write` syncs at the end of each write. The other adapters ignore the key. `off` never syncs by itself.

With `sync: async`, a write returns at once. It sets the flag `.cobuilder/sync-dirty` and starts `tracker.py sync-worker` detached. You may also run `tracker.py sync-worker` in the foreground. It takes a lock, syncs while the flag is set, writes `.cobuilder/sync-status.json`, and exits. A second worker exits at once. After a failed sync the flag stays set, and the next write or the SessionEnd hook of `implement` retries. The `sync` operation clears the flag and writes the status file. The `doctor` operation shows `sync`, `sync_pending`, and `last_sync`.

## Adapter notes

Each tracker has its own adapter note. The note names the tracker and lists what the adapter supports. Read the note for your tracker before you write state. The notes live at `shared/tracker-adapter-<name>.md`, and this guide does not repeat them.

## Must not

- Do not call a tracker command, API, or tool that bypasses `tracker.py`.
- Do not hand-edit a generated state line.
- Do not write an envelope field by hand.
- Do not make up an id. Read ids from list output.
- Do not read the index to find the next slice.
