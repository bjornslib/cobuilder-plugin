import { useEffect, useState } from "react";

import App from "./App";
import AppShell from "./variations/app-shell";
import EpicFirstMosaic from "./variations/epic-first-mosaic";
import LensMosaic from "./variations/lens-mosaic";
import RecordMosaic from "./variations/record-mosaic";

/**
 * A comparison shell for the Work board, so the structural variations can be read
 * side by side against the same real corpus.
 *
 * This file is scaffolding for a design decision. It is not part of the shipped
 * viewer. When one arrangement is chosen, this shell goes, and the chosen
 * variation becomes the Work surface.
 *
 * The app shell is the current candidate, so it leads the list and it is the
 * default. It also needs a frame that does not scroll, because its own rule is that
 * the document never scrolls. The three mosaics keep the page-scrolling frame they
 * were built against, so the frame is chosen per variation rather than set once.
 */

type Option = {
  id: string;
  label: string;
  blurb: string;
  /** True when the variation owns the whole viewport and the document must not scroll. */
  fillsViewport?: boolean;
  render: () => React.ReactNode;
};

const OPTIONS: Option[] = [
  {
    id: "shell",
    label: "D — App shell",
    blurb:
      "A fixed top bar, a fixed rail of sections, and one scroll pane holding the three levels. Sections gate; levels disable. Route: #/shell/<workId>/<section>.",
    fillsViewport: true,
    render: () => <AppShell />,
  },
  {
    id: "board",
    label: "Base board",
    blurb: "The first working board: a flat list with lane tabs.",
    render: () => <App />,
  },
  {
    id: "lens-mosaic",
    label: "A — Lens mosaic",
    blurb:
      "The six lenses are the tiles. Build is largest and holds the epic tree.",
    render: () => <LensMosaic />,
  },
  {
    id: "epic-first-mosaic",
    label: "B — Epic-first mosaic",
    blurb:
      "The epic and slice tree anchors the page. The lens tiles follow the selection.",
    render: () => <EpicFirstMosaic />,
  },
  {
    id: "record-mosaic",
    label: "C — Record mosaic",
    blurb:
      "One tile per record kind. Absence is a visible state, so the mosaic reads as a completeness map.",
    render: () => <RecordMosaic />,
  },
];

/**
 * The variation selected by the current hash.
 *
 * The app shell keeps its own route below its own name, so `#/shell/<workId>/<section>`
 * must select the shell and not fall through to the default. The first path segment is
 * therefore the variation id, and anything unrecognized selects the leading option.
 */
function fromHash(): string {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const head = raw.split("/")[0];
  return OPTIONS.some((o) => o.id === head) ? head : OPTIONS[0].id;
}

export default function Variations() {
  const [active, setActive] = useState<string>(fromHash);

  useEffect(() => {
    const onHash = () => setActive(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const current = OPTIONS.find((o) => o.id === active) ?? OPTIONS[0];

  function choose(id: string) {
    window.location.hash = `/${id}`;
    setActive(id);
    window.scrollTo({ top: 0 });
  }

  const frame = current.fillsViewport
    ? "flex h-dvh flex-col overflow-hidden bg-ground text-ink"
    : "min-h-screen bg-ground text-ink";
  const header = current.fillsViewport
    ? "shrink-0 border-b border-line bg-surface"
    : "sticky top-0 z-[var(--layer-sticky)] border-b border-line bg-surface/95 backdrop-blur";
  const body = current.fillsViewport ? "min-h-0 flex-1 overflow-hidden" : "";

  return (
    <div className={frame}>
      <header className={header}>
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-5 py-3">
          <span className="font-mono text-[12px] font-bold tracking-wide text-ink-dim uppercase">
            Work board · variations
          </span>

          <nav className="flex flex-wrap gap-1.5" aria-label="Variation">
            {OPTIONS.map((o) => {
              const on = o.id === current.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => choose(o.id)}
                  aria-current={on ? "page" : undefined}
                  className={
                    "cursor-pointer rounded-full border px-3 py-1.5 font-mono text-[12.5px] transition-colors " +
                    (on
                      ? "border-primary bg-primary/10 font-bold text-primary"
                      : "border-line text-ink-mid hover:border-primary/40 hover:text-ink")
                  }
                >
                  {o.label}
                </button>
              );
            })}
          </nav>

          <p className="ml-auto max-w-[52ch] font-serif text-[13.5px] leading-snug text-ink-dim">
            {current.blurb}
          </p>
        </div>
      </header>

      <main className={body}>{current.render()}</main>
    </div>
  );
}
