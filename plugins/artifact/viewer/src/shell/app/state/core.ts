import { useReducedMotion } from "motion/react";

import { useHashRoute, useIndexLoad, useTheme } from "../../hooks";

export function useShellCore() {
  const reduce = useReducedMotion() ?? false;
  const { load, reload } = useIndexLoad();
  const { route, redirectedFrom, setRedirectedFrom, go } = useHashRoute();
  const { theme, toggleTheme } = useTheme();
  return { reduce, load, reload, route, redirectedFrom, setRedirectedFrom, go, theme, toggleTheme };
}

export type ShellCore = ReturnType<typeof useShellCore>;
