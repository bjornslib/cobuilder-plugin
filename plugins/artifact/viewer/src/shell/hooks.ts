/**
 * The corpus principle `react_hooks` puts side effects in custom hooks rather than
 * in the render body. None of these hooks computes a record: `model.ts` derives
 * every count and join, and `data/index.json` is the only source for them.
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
