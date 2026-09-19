import { useEffect, useState } from "react";

import App from "./App";
import EpicFirstMosaic from "./variations/epic-first-mosaic";
import LensMosaic from "./variations/lens-mosaic";
import RecordMosaic from "./variations/record-mosaic";

/**
 * A comparison shell for the Work board, so three structural variations can be
 * read side by side against the same real corpus.
 *
 * This file is scaffolding for a design decision. It is not part of the shipped
 * viewer. When one arrangement is chosen, this shell goes, and the chosen
 * variation becomes the Work surface.
 */

type Option = {
  id: string;
  label: string;
  blurb: string;
  render: () => React.ReactNode;
};

const OPTIONS: Option[] = [
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

function fromHash(): string {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return OPTIONS.some((o) => o.id === raw) ? raw : "lens-mosaic";
}

export default function Variations() {
  const [active, setActive] = useState<string>(fromHash);

  useEffect(() => {
    const onHash = () => setActive(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const current = OPTIONS.find((o) => o.id === active) ?? OPTIONS[1];

  function choose(id: string) {
    window.location.hash = `/${id}`;
    setActive(id);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className="sticky top-0 z-[var(--layer-sticky)] border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-5 py-3">
          <span className="font-mono text-[11px] font-bold tracking-wide text-ink-dim uppercase">
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
                    "cursor-pointer rounded-full border px-3 py-1.5 font-mono text-[12px] transition-colors " +
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

          <p className="ml-auto max-w-[46ch] font-serif text-[13px] leading-snug text-ink-dim">
            {current.blurb}
          </p>
        </div>
      </header>

      <main>{current.render()}</main>
    </div>
  );
}
