# Pull request refresh

A person often merges a pull request on GitHub, and no agent records the merge in the tracker. The pull request record and its epics then stay open, and every later read shows old work as open. This procedure records each merge that GitHub shows. Design mode and implement mode run it once at the start of a session.

The tracker port reads no GitHub (ADR-0029, ADR-0047). So the session reads GitHub with `gh`, and it writes the result only through `tracker.py`. Call each operation as `uv run "${CLAUDE_PLUGIN_ROOT}/shared/tracker.py" <operation>`, written `tracker.py` below.

## Steps

1. Run `tracker.py list-pull-requests`. Keep each record whose `lifecycle` is not `closed`.
2. If no record stays, say "Pull request refresh: no open record" and stop.
3. For each record that stays, find its number. The number is the digits of `external_ref`, such as `55` or `57` in `pr-57`.
4. For each number, run `gh pr view <number> --json state,mergedAt`.
5. When `state` is `MERGED`, run `tracker.py set-pull-request-state <ref> merged`. Then, for each epic in the `tracks` list of the record, run `tracker.py set-epic-state <epic> closed`.
6. When `state` is `OPEN` or `CLOSED`, change nothing for that record.
7. When `gh` fails, or the record has no number, change nothing for that record. Note the reason.
8. Report one line for each record: the reference, the GitHub state, and the epics that you closed.

## Rules

- Close an epic only after `gh` shows `MERGED` for its pull request. A closed slice, a closed pull request that did not merge, or a guess is not evidence of a merge.
- Do not open, edit, comment on, or close a pull request on GitHub. This procedure only reads GitHub.
- Do not create a pull request record. An epic with no record stays as it is, and the report says nothing about it.
- Branch on the exit code of each `tracker.py` call, as [tracker-usage.md](tracker-usage.md#failure-and-refusal) says. On exit 2, no tracker is configured: skip the procedure and say so.
- Run the procedure once in a session. A later step in the same session does not repeat it.
