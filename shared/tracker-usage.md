# Tracker usage

This guide tells agents how to read and write workflow state. It follows ADR-0040. Each example output comes from a real run in a scratch repo.

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
      "assignee": null,
      "blocked_by": [],
      "envelope": {
        "gate1": "2026-10-14",
        "gate2b": "n/a",
        "stage": "design"
      },
      "external_ref": null,
      "id": "demo",
      "kind": "program",
      "lifecycle": "open",
      "parent": null
    }
  ]
}
$ uv run shared/tracker.py list-epics --program demo
{
  "ok": true,
  "result": [
    {
      "assignee": null,
      "blocked_by": [
        "pr-101"
      ],
      "envelope": {},
      "external_ref": null,
      "id": "demo-E1",
      "kind": "epic",
      "lifecycle": "open",
      "parent": "demo"
    },
    {
      "assignee": null,
      "blocked_by": [
        "pr-101"
      ],
      "envelope": {},
      "external_ref": null,
      "id": "demo-E2",
      "kind": "epic",
      "lifecycle": "open",
      "parent": "demo"
    },
    {
      "assignee": null,
      "blocked_by": [],
      "envelope": {
        "deferred": "2026-11-01"
      },
      "external_ref": null,
      "id": "demo-E3",
      "kind": "epic",
      "lifecycle": "open",
      "parent": "demo"
    }
  ]
}
```

## Vocabulary

Record kinds are `program`, `epic`, `slice`, and `pr`. The lifecycle states are `open`, `in_progress`, and `closed`. A composite id has the form `<design>/E5` or `<design>/<n>`.

Gate values are a date, `n/a`, or absent. An assignee is a GitHub login. The envelope holds the other fields, such as `stage`, `score`, and `branch`.

## Moment table

Find the command for each workflow moment in this table.

| Workflow moment | Command |
|---|---|
| Session start | `doctor`, then `list-programs`. A build also runs `list-epics`. |
| Design decided | `set-program-stage <program> <stage>` |
| Branch created | `set-epic-state <epic> <state> --branch <branch>` |
| Gate approved | `set-gate-value <program> <gate> <value>`, then `add-note <id> <text>` |
| Gate 3 seeds slices | `seed-from-files <plans-dir>` |
| Worker claims a slice | `claim-slice <id> <claimant>` |
| Attempt fails | `record-attempt <id> <score> --note <text>` |
| Slice passes | `set-slice-state <id> closed --score <score> --attempts <n>` |
| Escalate | `escalate <id> <score> <reason>` |
| PR opens | `open-pull-request <ref> <epic-id>...` |
| PR merges | `set-pull-request-state <ref> merged`, then `set-epic-state` |
| Program done | `set-program-stage <program> <stage>` |
| Session end | `sync` |
| Status files drift from the tracker | `uv run shared/tracker.py regenerate-status-files <program> --plans-dir <dir>` |

`regenerate-status-files` rewrites only the state lines of `00-status.md` and `04-slices.md`. It keeps every prose line. With no adapter, it exits 2 and writes nothing.

## Read patterns

Read state with the `list-*`, `get-slice`, and `next-ready` operations. Do not read the index or `04-slices.md` to find state. To resume a build, ask for the next ready slice in an epic.

```console
$ uv run shared/tracker.py next-ready --kind slice --under demo-E1
{
  "ok": true,
  "result": [
    {
      "assignee": null,
      "blocked_by": [
        "demo-E1-s1"
      ],
      "envelope": {},
      "external_ref": null,
      "id": "demo-E1-s3",
      "kind": "slice",
      "lifecycle": "open",
      "parent": "demo-E1"
    }
  ]
}
$ uv run shared/tracker.py claim-slice demo-E1-s3 agent-2
{
  "ok": true,
  "result": {
    "assignee": "agent-2",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "envelope": {},
    "external_ref": null,
    "id": "demo-E1-s3",
    "kind": "slice",
    "lifecycle": "open",
    "parent": "demo-E1"
  }
}
```

The `next-ready` operation returns the slices that are ready to start. A worker claims a slice with `claim-slice` before it starts work.

To list slices or read one slice, use `list-slices` or `get-slice`.

```console
$ uv run shared/tracker.py list-slices --epic demo-E1
{
  "ok": true,
  "result": [
    {
      "assignee": null,
      "blocked_by": [],
      "envelope": {
        "score": 0.92
      },
      "external_ref": null,
      "id": "demo-E1-s1",
      "kind": "slice",
      "lifecycle": "closed",
      "parent": "demo-E1"
    },
    {
      "assignee": "agent-1",
      "blocked_by": [
        "demo-E1-s1"
      ],
      "envelope": {},
      "external_ref": null,
      "id": "demo-E1-s2",
      "kind": "slice",
      "lifecycle": "in_progress",
      "parent": "demo-E1"
    },
    {
      "assignee": null,
      "blocked_by": [
        "demo-E1-s1"
      ],
      "envelope": {},
      "external_ref": null,
      "id": "demo-E1-s3",
      "kind": "slice",
      "lifecycle": "open",
      "parent": "demo-E1"
    }
  ]
}
$ uv run shared/tracker.py get-slice demo-E1-s2
{
  "ok": true,
  "result": {
    "assignee": "agent-1",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "envelope": {},
    "external_ref": null,
    "id": "demo-E1-s2",
    "kind": "slice",
    "lifecycle": "in_progress",
    "parent": "demo-E1"
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
    "assignee": "agent-1",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "envelope": {
      "attempts": 2,
      "score": 0.92
    },
    "external_ref": null,
    "id": "demo-E1-s2",
    "kind": "slice",
    "lifecycle": "closed",
    "parent": "demo-E1"
  }
}
```

Use `--state-file` to read an earlier write in a later call. It is a top-level option, so place it before the subcommand.

```console
$ uv run shared/tracker.py --state-file state.json set-slice-state demo-E1-s2 closed --score 0.92 --attempts 2
{
  "ok": true,
  "result": {
    "assignee": "agent-1",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "envelope": {
      "attempts": 2,
      "score": 0.92
    },
    "external_ref": null,
    "id": "demo-E1-s2",
    "kind": "slice",
    "lifecycle": "closed",
    "parent": "demo-E1"
  }
}
$ uv run shared/tracker.py --state-file state.json list-slices --epic demo-E1
{
  "ok": true,
  "result": [
    {
      "assignee": null,
      "blocked_by": [],
      "envelope": {
        "score": 0.92
      },
      "external_ref": null,
      "id": "demo-E1-s1",
      "kind": "slice",
      "lifecycle": "closed",
      "parent": "demo-E1"
    },
    {
      "assignee": "agent-1",
      "blocked_by": [
        "demo-E1-s1"
      ],
      "envelope": {
        "attempts": 2,
        "score": 0.92
      },
      "external_ref": null,
      "id": "demo-E1-s2",
      "kind": "slice",
      "lifecycle": "closed",
      "parent": "demo-E1"
    },
    {
      "assignee": null,
      "blocked_by": [
        "demo-E1-s1"
      ],
      "envelope": {},
      "external_ref": null,
      "id": "demo-E1-s3",
      "kind": "slice",
      "lifecycle": "open",
      "parent": "demo-E1"
    }
  ]
}
```

The second call lists the slice that the first call closed.

```console
$ uv run shared/tracker.py set-program-stage demo approved
{
  "ok": true,
  "result": {
    "assignee": null,
    "blocked_by": [],
    "envelope": {
      "gate1": "2026-10-14",
      "gate2b": "n/a",
      "stage": "approved"
    },
    "external_ref": null,
    "id": "demo",
    "kind": "program",
    "lifecycle": "open",
    "parent": null
  }
}
$ uv run shared/tracker.py set-gate-value demo gate2b 2026-10-15
{
  "ok": true,
  "result": {
    "assignee": null,
    "blocked_by": [],
    "envelope": {
      "gate1": "2026-10-14",
      "gate2b": "2026-10-15",
      "stage": "design"
    },
    "external_ref": null,
    "id": "demo",
    "kind": "program",
    "lifecycle": "open",
    "parent": null
  }
}
$ uv run shared/tracker.py add-note demo-E1-s2 'checked the gate'
{
  "ok": true,
  "result": null
}
```

```console
$ uv run shared/tracker.py record-attempt demo-E1-s2 0.6 --note 'first try'
{
  "ok": true,
  "result": {
    "assignee": "agent-1",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "envelope": {
      "attempts": 1,
      "score": 0.6
    },
    "external_ref": null,
    "id": "demo-E1-s2",
    "kind": "slice",
    "lifecycle": "in_progress",
    "parent": "demo-E1"
  }
}
$ uv run shared/tracker.py escalate demo-E1-s2 0.4 'needs a human'
{
  "ok": true,
  "result": {
    "assignee": "agent-1",
    "blocked_by": [
      "demo-E1-s1"
    ],
    "envelope": {
      "escalated": true,
      "score": 0.4
    },
    "external_ref": null,
    "id": "demo-E1-s2",
    "kind": "slice",
    "lifecycle": "in_progress",
    "parent": "demo-E1"
  }
}
```

```console
$ uv run shared/tracker.py set-epic-state demo-E1 closed --branch design/x
{
  "ok": true,
  "result": {
    "assignee": null,
    "blocked_by": [
      "pr-101"
    ],
    "envelope": {
      "branch": "design/x"
    },
    "external_ref": null,
    "id": "demo-E1",
    "kind": "epic",
    "lifecycle": "closed",
    "parent": "demo"
  }
}
$ uv run shared/tracker.py open-pull-request pr-102 demo-E2
{
  "ok": true,
  "result": {
    "assignee": null,
    "blocked_by": [],
    "envelope": {},
    "external_ref": null,
    "id": "pr-102",
    "kind": "pr",
    "lifecycle": "open",
    "parent": null
  }
}
$ uv run shared/tracker.py set-pull-request-state pr-101 merged
{
  "ok": true,
  "result": {
    "assignee": null,
    "blocked_by": [],
    "envelope": {},
    "external_ref": "PR#101",
    "id": "pr-101",
    "kind": "pr",
    "lifecycle": "closed",
    "parent": null
  }
}
```

## Failure and refusal

Each call exits with one of four codes. A success writes one JSON object to stdout. A failure writes one JSON line to stdout and one message to stderr. Repeated `set-*` calls are idempotent.

- `0`: the call succeeded.
- `2`: the call is refused. No tracker adapter is configured, and nothing was written. Run `doctor`. Do not edit a status file by hand.
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
      "assignee": null,
      "blocked_by": [],
      "envelope": {},
      "external_ref": "PR#101",
      "id": "pr-101",
      "kind": "pr",
      "lifecycle": "open",
      "parent": null
    }
  ]
}
```

## Adapter notes

Each tracker has its own adapter note. The note names the tracker and lists what the adapter supports. Read the note for your tracker before you write state. The notes live at `shared/tracker-adapter-<name>.md`, and this guide does not repeat them.

## Must not

- Do not call a tracker command, API, or tool that bypasses `tracker.py`.
- Do not hand-edit a generated state line.
- Do not write an envelope field by hand.
- Do not make up an id. Read ids from list output.
- Do not read the index to find the next slice.
