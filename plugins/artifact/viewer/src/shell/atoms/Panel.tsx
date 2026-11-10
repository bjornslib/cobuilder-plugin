import { useId, useState } from "react";

import { cn } from "@/lib/utils";

import { Tile } from "./bento";
import { PanelCard } from "./panelParts";
import type { PanelProps, PanelState } from "./panelModel";

/* An absent record is always shown, so the reader never has to open a panel to learn
   that something is missing. */
function usePanelState({ collapsible = false, absent = false, defaultOpen = true }: PanelProps): PanelState {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const onToggle = () => setOpen((current) => !current);
  return { shown: absent || !collapsible || open, closable: collapsible && !absent, bodyId, onToggle };
}

/**
 * A panel: one heading, one optional one-line lead, then its body.
 *
 * The frame follows the record mosaic's tile: a solid card when the record is there,
 * a dashed muted card when it is absent. A panel inside a `Bento` names its `span` and
 * fills that tile, so a row of tiles reads as one band rather than as cards of three
 * different heights.
 *
 * A panel may start closed. `collapsible` with `defaultOpen={false}` renders the body
 * inside a height-animated container, and the header becomes a toggle. The heading and
 * the `count` stay on the closed row. An absent panel ignores `collapsible`, because an
 * absence that is hidden is an absence the reader cannot see.
 *
 * Every panel is short on purpose. The mockup exists to judge the information
 * hierarchy, so a panel shows one real excerpt and not the whole record. Where the
 * whole record matters, the panel carries a control that opens it in a Sheet.
 *
 * A closed panel does not stretch to the row's height. A bento row is as tall as its
 * tallest tile, and a closed tile that filled the row would paint a large empty card.
 * `self-start` lets the closed tile hug its own heading instead.
 */
export function Panel(props: PanelProps) {
  const state = usePanelState(props);
  const card = <PanelCard {...props} {...state} />;
  const selfStart = state.closable && !state.shown && "self-start";
  if (!props.span) return card;
  return (
    <Tile span={props.span} className={cn(selfStart)}>
      {card}
    </Tile>
  );
}
