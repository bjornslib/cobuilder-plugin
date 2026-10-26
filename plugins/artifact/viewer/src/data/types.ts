/**
 * The shape of `.cobuilder-architect/<bundle>/data/index.json`.
 *
 * Written by hand from the file that `shared/build_index.py` produces, schema 1.4,
 * and narrowed to the entities a Work board reads. Every field below is present in
 * the real corpus. Nothing here is invented, and nothing here is optional-by-guess:
 * a field is `| null` only where the corpus holds a null.
 *
 * `epic_status` and `epic_to_pull_request` are joins, not entity fields. They live
 * under `joins` and they are the only correct source for an epic's state and its
 * pull request, because `build_index.py` refines them from the pull-request list.
 * The `epic.state` field on the entity is the unrefined placeholder.
 */

export type * from "./types/core";
export type * from "./types/entities";
export type * from "./types/joins";
