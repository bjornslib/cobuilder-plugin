/**
 * The join keys `data/index.json` carries, exactly as `shared/build_index.py` writes them.
 * The longest name leads each alternative, so `slice_to_epic_unresolved` is not read as
 * `slice_to_epic`.
 */
const JOIN_KEY_NAMES =
  "epic_status|epic_to_pull_request|slice_to_epic_unresolved|slice_to_epic|adr_to_pull_request|adr_to_context|adr_to_district|context_verifies_district|district_uncovered|feature_gates";

/**
 * An expression rooted at a joins object: the name `joins`, or a call to `joinsOf`, which
 * is the accessor `@/data/bundle` publishes. Everything C1 reports hangs off one of these.
 *
 * THE ROOT IS WHAT MAKES THE PATTERN ABOUT RESOLUTION. A join key is a resolution only
 * when something reads it off a joins object. `joins.slice_to_epic[slice.id]` resolves one.
 * A tooltip that reads `title="joins.slice_to_epic"`, and a glossary that explains the join
 * rules in prose, name the same key and resolve nothing. Anchoring the pattern at the root
 * separates the two, and the anchoring is what lets the pattern stop at the key's name
 * instead of guessing from the shape of the line around it.
 */
const JOINS_ROOT = String.raw`(?:\bjoins\b|\bjoinsOf\s*\([^()]*\))`;

/** One member access off that root: `epic_status`, or `["epic_status"]`. */
const ANY_MEMBER = String.raw`(?:\.\s*[A-Za-z_$][\w$]*|\[\s*["'\`][^"'\`]*["'\`]\s*\])`;

/** The member that IS the join key, in either spelling. */
const KEY_MEMBER = String.raw`(?:\.\s*(?:${JOIN_KEY_NAMES})\b|\[\s*["'\`](?:${JOIN_KEY_NAMES})["'\`]\s*\])`;

/**
 * One join resolved: a join key read off a joins object, however the call site spells it.
 *
 * `data.joins.slice_to_epic[slice.id]`, `index.joins.slice_to_epic_unresolved`, and
 * `joinsOf(load.index).slice_to_epic_unresolved` all fire, because the root is named in
 * each one and a member of the chain is the key. `Object.keys(joins.feature_gates)` fires
 * for the same reason: reading the key as a whole value is reading it.
 *
 * This pattern runs against the `codeOnly` projection, so a key that appears only inside a
 * string literal, an attribute value, a comment, or prose cannot reach it. See the
 * projection block above, and `isIndexKey` for the one literal the projection keeps.
 */
export const JOIN_KEY_READ = new RegExp(`${JOINS_ROOT}(?:${ANY_MEMBER})*?${KEY_MEMBER}`);

/**
 * The other shape of a second derivation: resolving a joined fact from the entity's own
 * placeholder instead. `epic.state` is the unrefined state and `epic.pr` is the
 * unrefined pull request, so a fallback to either one is a second answer. Both the `??`
 * and the `||` form count, and both are read from the same field list.
 */
const ENTITY_PLACEHOLDER = String.raw`\b(epic|slice)\.(state|pr)\b`;
export const PLACEHOLDER_FALLBACK = new RegExp(
  `\\?\\?[^;\\n]*${ENTITY_PLACEHOLDER}|\\|\\|[^;\\n]*${ENTITY_PLACEHOLDER}`,
);

/**
 * The six script-tag globals the bundle defines, in the order the viewer loads them.
 *
 * `DIFFS_BY_PR` is the name `data/diffs-pr{N}.js` writes. The criterion spells it
 * `DIFFS`, and the two names are not the same one. See this file's header.
 */
export const SHIPPED_GLOBALS = ["STORY", "ODYSSEY", "DIFFS_BY_PR", "ADRS", "DESIGNS", "DIAGRAMS"];

/** Every spelling a reader might write, so the old one fires too. */
export const GLOBAL_SPELLINGS = [...SHIPPED_GLOBALS, "DIFFS"];

/**
 * One read of one global, in any of the three forms a reader writes it:
 * `window.STORY`, `window["STORY"]`, and the name as a string literal, which is how a
 * generic reader takes it: `loadGlobal(url, "ADRS", looksRight)`. A comment is blanked
 * before this runs, so prose that names a global is not a read of it.
 */
export function readsGlobal(name: string): RegExp {
  return new RegExp(
    `window\\s*\\.\\s*${name}\\b|window\\s*\\[\\s*["'\`]${name}["'\`]\\s*\\]|globalThis\\s*\\.\\s*${name}\\b|["'\`]${name}["'\`]`,
  );
}
