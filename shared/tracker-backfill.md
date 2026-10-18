# Tracker backfill

The backfill copies plan records from the plans tree into the tracker. It runs once per repo, and it is safe to run again. It runs over the port operation `seed-from-files`.

Read this file before you run the backfill. Run the steps in order.

1. Inventory the plans. Read each program and its records through the files adapter. Do not call `bd`. The files adapter reads the plans tree and writes nothing.
2. Dry run. Run `tracker.py seed-from-files` with the plans directory. Print each planned create from the returned list. The operation has no dry-run flag, so do not persist the result yet.
3. Consent. Show the printed list to the engineer. Wait for approval before any write. Stop when the engineer declines.
4. Create-only write. After approval, run `tracker.py seed-from-files` again. It creates each missing record. A record whose `external_ref` already exists is skipped.
5. Conflict. When a record exists with a different value, show both values. Never overwrite the existing record. Ask the engineer which value to keep.
6. Pull requests. List open and merged pull requests with `gh pr list`, as ADR-0029 directs. Do not use the tracker for pull requests in this step.
7. Count check. Derive the expected count from the record index at run time. Compare it with the count of records in the tracker. Do not use a pinned number.
