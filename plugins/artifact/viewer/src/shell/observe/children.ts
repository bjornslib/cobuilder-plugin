interface Entry {
  id: string;
  label: string;
}

type SetList<T> = (update: (current: T[]) => T[]) => void;

/* A mutation that changed no panel returns the previous array, so the bar
   does not re-render on every accordion press. */
function keepIfSame<T extends Entry>(current: T[], found: T[]): T[] {
  const same =
    current.length === found.length &&
    current.every((entry, index) => entry.id === found[index].id && entry.label === found[index].label);
  return same ? current : found;
}

function observeChildren(root: HTMLElement, read: () => void): () => void {
  read();
  const observer = new MutationObserver(read);
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}

export function watchList<T extends Entry>(
  root: HTMLElement | null,
  readList: (root: HTMLElement) => T[],
  setList: SetList<T>,
): (() => void) | undefined {
  if (root === null) {
    setList((current) => (current.length === 0 ? current : []));
    return;
  }
  return observeChildren(root, () => setList((current) => keepIfSame(current, readList(root))));
}
