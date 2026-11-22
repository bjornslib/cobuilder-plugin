import { useEffect, type RefObject } from "react";

import { keyPressIsTaken } from "../Pager";

export function useFindFocus(field: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || keyPressIsTaken(event) || document.querySelector('[role="dialog"]') !== null) return;
      event.preventDefault();
      field.current?.focus();
      field.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [field]);
}
