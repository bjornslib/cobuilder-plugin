export function stubMatchMedia(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  };
}

class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

export function installMatchMedia(): void {
  window.matchMedia = stubMatchMedia;
}

export function installJsdomStubs(): void {
  installMatchMedia();
  window.ResizeObserver = StubResizeObserver as unknown as typeof window.ResizeObserver;
  Element.prototype.scrollTo = () => undefined;
}
