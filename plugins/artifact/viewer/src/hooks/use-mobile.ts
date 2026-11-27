import * as React from "react"

const MOBILE_BREAKPOINT = 768

function belowBreakpoint(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function watchBreakpoint(setIsMobile: (value: boolean) => void): () => void {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  const onChange = () => setIsMobile(belowBreakpoint())
  mql.addEventListener("change", onChange)
  setIsMobile(belowBreakpoint())
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => watchBreakpoint(setIsMobile), [])

  return !!isMobile
}
