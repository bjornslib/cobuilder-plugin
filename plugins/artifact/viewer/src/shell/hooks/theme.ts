import { useCallback, useEffect, useState } from "react";

import type { Theme } from "../DiagramTiles";

export interface ThemeControl {
  theme: Theme;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme): () => void {
  document.documentElement.dataset.theme = theme;
  return () => {
    document.documentElement.dataset.theme = "light";
  };
}

/*
 * Light is the default and the preference persists nowhere (section 2.3): a
 * published file cannot store a preference, so the shell does not pretend to.
 */
export function useTheme(): ThemeControl {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => applyTheme(theme), [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggleTheme };
}
