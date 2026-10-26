/**
 * The shell's side effects, each in its own named hook.
 *
 * This shell had six `useEffect` calls in one component body: the theme, the
 * document's overflow, the hash listener, the viewport query, the index load, and the
 * focus move on a section change. Every one of them is a side effect, and the corpus
 * principle `react_hooks` puts side effects in custom hooks rather than in the render
 * body. So each one lives here, behind a name that says what it does.
 *
 * None of these hooks computes a record. `model.ts` derives every count and join, and
 * `data/index.json` is the only source for them.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/hooks.ts`. Three
 * imports changed to the shipped data layer: `loadIndex` and `loadDesigns` now come from
 * `@/data/bundle`, and `Theme` comes from `./DiagramTiles`, because the port folds the
 * prototype's `Diagram.tsx` into that file. `loadAdrs` still comes from `./records`,
 * which holds the one reader `@/data/bundle` does not yet carry.
 */

export type { RouteControl } from "./hooks/route";
export { useHashRoute } from "./hooks/route";
export type { IndexLoad } from "./hooks/indexLoad";
export { useIndexLoad } from "./hooks/indexLoad";
export type { ThemeControl } from "./hooks/theme";
export { useTheme } from "./hooks/theme";
export {
  useCollapsedRail,
  useDocumentNoScroll,
  useMediaQuery,
  useVisibleWidthCap,
} from "./hooks/viewport";
export { useFocusOnMount, useScrollResetOnRoute } from "./hooks/focus";
export type { SectionAvailability } from "./hooks/sections";
export { sectionHref, useSectionAvailability } from "./hooks/sections";
