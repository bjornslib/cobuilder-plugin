/**
 * The join keys `data/index.json` carries, as `shared/build_index.py` writes them. The longest
 * name leads, so `slice_to_epic_unresolved` is not read as `slice_to_epic`.
 */
const JOIN_KEY_NAMES =
  "epic_status|epic_to_pull_request|slice_to_epic_unresolved|slice_to_epic|adr_to_pull_request|adr_to_context|adr_to_district|context_verifies_district|district_uncovered|feature_gates";

/**
 * An expression rooted at a joins object: `joins`, or a call to `joinsOf`, the accessor
 * `@/data/bundle` publishes. A join key is a resolution only when it is read off such a
 * root. `joins.slice_to_epic[slice.id]` resolves one. `title="joins.slice_to_epic"` and a
 * glossary that explains the join rules in prose name the key and resolve nothing.
 */
const JOINS_ROOT = String.raw`(?:\bjoins\b|\bjoinsOf\s*\([^()]*\))`;

const ANY_MEMBER = String.raw`(?:\.\s*[A-Za-z_$][\w$]*|\[\s*["'\`][^"'\`]*["'\`]\s*\])`;

const KEY_MEMBER = String.raw`(?:\.\s*(?:${JOIN_KEY_NAMES})\b|\[\s*["'\`](?:${JOIN_KEY_NAMES})["'\`]\s*\])`;

/**
 * One join resolved: a join key read off a joins object, however the call site spells it.
 * `data.joins.slice_to_epic[slice.id]` and `joinsOf(load.index).slice_to_epic_unresolved`
 * both fire. So does `Object.keys(joins.feature_gates)`, because reading the key as a whole
 * value is reading it. The pattern runs on the `codeOnly` projection, so a key that sits
 * only in a literal, an attribute value, or prose cannot reach it.
 */
export const JOIN_KEY_READ = new RegExp(`${JOINS_ROOT}(?:${ANY_MEMBER})*?${KEY_MEMBER}`);

/**
 * The other shape of a second derivation: resolving a joined fact from the entity's own
 * placeholder. `epic.state` is the unrefined state and `epic.pr` the unrefined pull request,
 * so a fallback to either is a second answer. Both the `??` and the `||` form count.
 */
const ENTITY_PLACEHOLDER = String.raw`\b(epic|slice)\.(state|pr)\b`;
export const PLACEHOLDER_FALLBACK = new RegExp(
  `\\?\\?[^;\\n]*${ENTITY_PLACEHOLDER}|\\|\\|[^;\\n]*${ENTITY_PLACEHOLDER}`,
);

/**
 * The six script-tag globals the bundle defines. `DIFFS_BY_PR` is the name
 * `data/diffs-pr{N}.js` writes. The criterion spells it `DIFFS`, which is not the same name.
 */
export const SHIPPED_GLOBALS = ["STORY", "ODYSSEY", "DIFFS_BY_PR", "ADRS", "DESIGNS", "DIAGRAMS"];

/** Every spelling a reader might write, so the old one fires too. */
export const GLOBAL_SPELLINGS = [...SHIPPED_GLOBALS, "DIFFS"];

/**
 * One read of one global, in any of three forms: `window.STORY`, `window["STORY"]`, and the
 * name as a string literal, as in `loadGlobal(url, "ADRS", looksRight)`. A comment is blanked
 * before this runs, so prose that names a global is not a read of it.
 */
export function readsGlobal(name: string): RegExp {
  return new RegExp(
    `window\\s*\\.\\s*${name}\\b|window\\s*\\[\\s*["'\`]${name}["'\`]\\s*\\]|globalThis\\s*\\.\\s*${name}\\b|["'\`]${name}["'\`]`,
  );
}
