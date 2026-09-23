import { useEffect, useState } from "react";

import App from "./App";
import AppShell from "./variations/app-shell";
import EpicFirstMosaic from "./variations/epic-first-mosaic";
import LensMosaic from "./variations/lens-mosaic";
import RecordMosaic from "./variations/record-mosaic";
import SectionsE from "./variations/sections-e";

/**
 * A comparison shell for the Work board, so the structural variations can be read
 * side by side against the same real corpus.
 *
 * This file is scaffolding for a design decision. It is not part of the shipped
 * viewer. `src/main.tsx` now mounts `src/shell/App.tsx`, which is the chosen
 * arrangement, and the shell hands this harness its own addresses back: `#/variations`
 * and one address per variation id below. When the prototype goes, this file goes
 * with it.
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
    label: "Shell (D)",
    blurb:
      "A fixed top bar, a fixed rail of sections, and one scroll pane holding the three levels. Sections gate; levels disable. Route: #/shell/<workId>/<section>.",
    fillsViewport: true,
    render: () => <AppShell />,
  },
  {
    id: "sections-e",
    label: "Sections (E)",
    blurb:
      "The shell, with Problem & Solution paged sideways instead of stacked: one section on screen, a strip of headings, and Previous and Next under it. Each section scrolls its own overflow. Route: #/sections-e/<workId>/<section>.",
    fillsViewport: true,
    render: () => <SectionsE />,
  },
  {
    id: "board",
    label: "Base",
    blurb: "The first working board: a flat list with lane tabs.",
    render: () => <App />,
  },
  {
    id: "lens-mosaic",
    label: "Lens (A)",
    blurb:
      "The six lenses are the tiles. Build is largest and holds the epic tree.",
    render: () => <LensMosaic />,
  },
  {
    id: "epic-first-mosaic",
    label: "Epic-first (B)",
    blurb:
      "The epic and slice tree anchors the page. The lens tiles follow the selection.",
    render: () => <EpicFirstMosaic />,
  },
  {
    id: "record-mosaic",
    label: "Record (C)",
    blurb:
      "One tile per record kind. Absence is a visible state, so the mosaic reads as a completeness map.",
    render: () => <RecordMosaic />,
  },
];

/**
 * The variation ids, and the addresses this harness owns.
 *
 * `src/shell/App.tsx` reads this list, so the shell's route and the harness's own route
 * cannot drift: a first segment that names one of these ids is handed to this file
 * whole, and every existing variation link keeps working.
 */
export const VARIATION_IDS: string[] = OPTIONS.map((option) => option.id);

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

  // The shell owns the whole viewport, because its own rule is that the
  // document never scrolls and only the pane does. A header band above it
  // would spend viewport height on harness furniture: measured at 1280x633,
  // the old band cost 125 px, a fifth of the window.
  const frame = current.fillsViewport
    ? "relative flex h-dvh flex-col overflow-hidden bg-ground text-ink"
    : "relative min-h-screen bg-ground text-ink";
  const header = current.fillsViewport
    ? ""
    : "sticky top-0 z-[var(--layer-sticky)] border-b border-line bg-surface/95 backdrop-blur";
  const body = current.fillsViewport ? "min-h-0 flex-1 overflow-hidden" : "";

  const switcher = (
    <nav
      aria-label="Variation"
      className={
        "flex flex-nowrap gap-1 " +
        (current.fillsViewport
          ? // Sits in the empty middle of the shell's own top bar. The bar
            // carries the work-item switcher on the left and the theme toggle
            // on the right, and nothing between them, so the harness costs no
            // layout height and covers no content.
            // NO `backdrop-blur` here, and that is deliberate. This element and
            // the record Sheet's overlay both carried `backdrop-filter`, and
            // Chrome composites two of them into one backdrop root. That root
            // swallowed the Sheet's own text and rendered it soft. Clearing one
            // of the two was not enough, so both are clear now. The bar beneath
            // this switcher is already opaque, so the blur bought nothing that
            // a solid fill does not.
            "absolute top-4 left-1/2 z-[var(--layer-panel)] -translate-x-1/2 rounded-full border border-line bg-surface/95 p-1 shadow-card"
          : "mx-auto flex max-w-[1400px] items-center gap-1.5 px-5 py-3")
      }
    >
      {OPTIONS.map((o) => {
        const on = o.id === current.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => choose(o.id)}
            aria-current={on ? "page" : undefined}
            title={o.blurb}
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
  );

  if (current.fillsViewport) {
    return (
      <div className={frame}>
        <div className={body}>{current.render()}</div>
        {switcher}
      </div>
    );
  }

  return (
    <div className={frame}>
      <header className={header}>{switcher}</header>
      <main className={body}>{current.render()}</main>
    </div>
  );
}
