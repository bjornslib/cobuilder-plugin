# Architecture: Linear as a tracker beside beads

Design record: `docs/architecture/designs/linear-tracker-adapter/`. Decision: ADR-0048. It builds on ADR-0040 (the tracker port) and ADR-0044 (epic-level blocks). `contracts.md` in the design record holds the table of each operation and its Linear behavior.

## Fit

The change sits in the `shared` context, in the `tracker-port` module and the `tracker-cli` module.

- `shared/tracker_port/port.py` stays as it is. The port gains no method.
- `shared/tracker_port/config.py` gains the adapter name `linear`.
- A new family of files, `shared/tracker_port/linear*.py`, holds the adapter. A new client talks to the Linear GraphQL API with the standard library only.
- `projector.py` and `regenerate.py` skip a record that has the state `unplanned`.
- `shared/tracker.py` prints a `plan_changes` key after `sync`, as it prints `conflicts` after a seed.
- `docs/architecture/contexts/shared/boundary.yaml` adds the `linear*.py` files to the `tracker-port` members.
- CLAUDE.md principle 7 gains a third outside action: the API call of the configured tracker adapter. The engineer approved this change on 2026-11-03.
- `cobuilder-setup` offers `linear` beside `beads` and `files`.
- The beads files, the beads tests, and `bd_runner.py` stay unchanged.

## Endpoints

None for CoBuilder. The adapter calls one outside endpoint: the Linear GraphQL API over HTTPS. `tracker.py` gains no operation. Its `sync` output gains one optional key, `plan_changes`.

## Data

CoBuilder adds no table and no file. It adds durable state inside Linear:

- One envelope attachment on each CoBuilder issue. The URL is `cobuilder://<repo>/<id>`. The metadata holds the envelope and the seen plan fields, each as one JSON string.
- One claim attachment on a slice, while a claim is held.
- Linear comments for notes, attempts, and plan changes.
- Linear relations: `blocks` between consecutive slices and epics, and `related` for a pull request.

`.cobuilder/tracker.yaml` gains the keys `team`, `project`, `states`, and `users`. The API key stays in the environment variable `LINEAR_API_KEY`.

## Flow

The primary path is a build session on a Linear repo.

1. The session runs `tracker.py doctor`, then `sync`. `sync` reads all issues in one paged query and reports `plan_changes`.
2. `claim-next` reads the issues, picks the next ready slice, writes a claim attachment, reads the claims back, and writes the assignee if it won.
3. The slice loop runs RED, GREEN, and VALIDATE. `record-attempt` posts a comment and updates the envelope.
4. `set-slice-state closed --score` moves the Linear workflow state and writes the score and attempts. The Linear board shows the result.
5. A slice that a person moved to Done with no passing score reads as open.

## External

- The Linear GraphQL API, `https://api.linear.app/graphql`. The key goes in the `Authorization` header.
- The environment variable `LINEAR_API_KEY`. The repo stores no key.
- Linear limits: a default page of 50, a complexity cap, and an hourly request cap. The design notes these as unverified until the live smoke test runs.
- No webhook, no server, and no MCP server.
