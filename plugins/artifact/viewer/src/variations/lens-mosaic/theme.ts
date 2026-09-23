/**
 * The theme switch.
 *
 * Light is the default on every load. `src/index.html` sets `data-theme="light"` on
 * `<html>`, and `src/index.css` defines the dark palette under
 * `[data-theme="dark"]`, so this hook only ever moves that one attribute.
 *
 * The choice is not stored. A reader who reloads gets light again, which keeps the
 * default honest rather than remembered from an earlier session.
 */

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>("light");

  // Read the attribute the page shipped with, so the button never disagrees with
  // the surface it controls.
  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((was) => (was === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
