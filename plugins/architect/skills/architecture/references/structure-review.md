---
title: Structure Review
description: How review mode and maintenance mode read the structure findings record, judge each finding, and tag its trend.
status: active
---

# Structure Review

This file tells review mode and maintenance mode how to read the structure findings record. The script `structure_evidence.py --repo` writes the record. `SKILL.md` holds the steps. This file holds the judgment rules.

## Read the record

The record is one JSON file with these keys:

- `schema`: the format version. This file reads version `1`. When `schema` has another value, the format changed, and the section says so.
- `commit`: the commit that the run read. Maintenance mode passes it to `--since` on the next run.
- `since`: the base commit of the contract drift. It is `null` when the run had no `--since`.
- `window_days`: the change window, 90 or 365 days.
- `findings`: the structure findings, with the largest `changes` first, then by `key`.
- `folders`: the folder table.
- `not_analysed`: the lines that name what the run did not read.
- `fixed`: the keys of the previous record that the new record does not hold. The key appears only when the run read a previous record.

Each finding has the keys `key`, `signal`, `path`, `folder`, `facts`, and `changes`. The `key` names the finding across runs. The `signal` names the rule that made the finding. When the run read a previous record, each finding also has a `trend` key.

## Change count

`changes` is the change count of the finding. It counts the commits in the window that touch the path of the finding. A `crowded-folder` or `name-stem-cluster` finding takes the largest change count of a file in its folder. A group signal finding takes the largest change count of its members. When `window_days` is 365, say so in the section. The repo had fewer than 20 commits in 90 days.

## Choose the findings to report

Report the top findings by `changes`, about 10 of them. Report every `boundary-edge` finding too, even when it ranks below the top 10.

A group signal finding (`twin-name`, `co-change`, or `duplicate-group`) names its files in `facts.members`.

## Judge each finding

Give each reported finding one judgment:

- `debt`: a real cost, and the fix is worth its work.
- `accepted`: a real cost, and a stated reason to keep it.
- `false`: the fact does not hold here, or it is not a cost in this repo. For example, a name family that repeats its folder name.

Give each judgment one line of reason. Support it with one evidence item: a `path:line`, or a record fact such as `facts.count`.

Read the facts of each signal before you judge it:

- `crowded-folder`: compare `facts.count` with `facts.limit`. Read `facts.families` for the groups of names in the folder.
- `name-stem-cluster`: the shared stem is `facts.stem`. Judge `false` when the stem repeats the folder name, because the folder already names the group.
- `generic-name`: judge `debt` when the file gathers unrelated code under a generic name.
- `boundary-edge`: `facts.from_context` and `facts.to_context` name the edge. `facts.rule` names the rule that it breaks. Judge `false` when `facts.in_comment` is true, because a comment does not create a dependency.
- `twin-name`: `facts.members` lists the files that share one stem in two folders. Judge `debt` when they hold one concept twice. Judge `false` when they hold unrelated code.
- `co-change`: `facts.support` counts the commits in which two of the files changed together. Judge `debt` when the files share one reason to change.
- `duplicate-group`: `facts.size` gives the size of the largest shared block. Judge `debt` when one fix must reach every copy.
- `consumer-locality`: `facts.sole_consumer_folder` names the folder that imports the file. Judge `debt` when a move to that folder is cheap.
- `contract-drift`, which appears only with `--since`: `facts.callers_untouched` lists the files that name the changed symbol. Judge `false` when the list is empty. Judge `debt` when a listed file needs the change.

Write the reported findings as one table with a row for each finding. Use these columns: signal, path, `changes`, judgment, reason, and evidence. Name the record file in the section.

## Read the folder table

The folder table is the `folders` list of the record. Each row is one folder with three or more code files. The keys of a row are these:

- `n`: the code files in the folder.
- `internal`: the import edges between files of the folder.
- `out` and `in`: the import edges that leave the folder and enter it.
- `cf`: cohesion, computed as `2 * internal / (2 * internal + out + in)`. A higher value means more edges stay inside the folder.
- `instability`: computed as `out / (out + in)`. A higher value means the folder depends on more folders than depend on it.
- `groups`: the import groups of the folder.
- `test_share`: the share of test files in the folder.

`cf` and `instability` are `null` when the folder has no edge to count. Do not read a `null` value as zero.

Show the five lowest `cf` rows, without the `null` rows. Show each row of a folder that holds a reported finding with `changes` above 0. A low `cf` with many files suggests a folder that holds unrelated parts. A high `instability` is normal at the edge of the system, such as an entry point or an adapter. Judge it by the role of the folder.

## Trend tags

With `--compare`, the script matches the findings of the new record and the previous record by `key`. It gives each finding one `trend` key, with one of these tags:

- `new`: the key is in the new record only.
- `worse`: the key is in both records, and the `count` fact in `facts` grew.
- `unchanged`: the key is in both records, and no `count` fact grew.
- `fixed`: the key is in the previous record only. The script lists it in the `fixed` list of the record, not on a finding.

A key holds a path, a folder, a stem, or a member list. When a file or a folder moves, or a group changes its members, the old key is `fixed`. The new key gets `new`. Name both in the trend.

When the previous record has a `null` `commit`, it gives no base for `--since`. Run without `--since`. Say that the contract drift has no base.

When the script adds a `not_analysed` line for the previous record, the record gives no trend. Say so, and tag no finding. When the run has no previous record, label every finding `new`, and say so.

The agent reports the trend tags and the `fixed` list. It compares nothing by hand.

## When the run fails

A run fails when the script exits with a non-zero status, or when `commit` is `null`. A failed run claims no clean result. The section states the failure and its reason, from the script error output or from the `not_analysed` lines.

A record with `not_analysed` lines is partial. Write each line into the section. A line can name an excluded path, which is a choice and not a failure. Do not call an area clean when a line names it.

A record with no finding and no `not_analysed` line holds no finding. The section says so.

## The advice rule

A structure signal is advice, and ADR-0048 sets that rule. The record is advice too. It never changes the review score unless the engineer decides that it should. Keep the `## Structure` section outside the score.
