import { createContext, type ReactNode } from "react";

import type { LucideIcon } from "lucide-react";

import type { TileSpan } from "./bento";
import type { Tone } from "./tones";

/**
 * The link a level hands its section panels, so a panel's heading can lead to the same
 * section on the other account. A level with no counterpart provides null, and a panel
 * then draws no link. `onGo` receives the address and the name of the section pressed.
 */
export interface PanelAction {
  label: string;
  href: string;
  onGo: (href: string, section: string) => void;
}

export const PanelActionContext = createContext<PanelAction | null>(null);

export interface PanelProps {
  title: string;
  lead?: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  /** True when the record is absent. Paints the dashed frame and the pill. */
  absent?: boolean;
  /** A count shown beside the heading, so a closed panel still says what it holds. */
  count?: number;
  /** True when the reader may open and close the body. */
  collapsible?: boolean;
  /** The state the body starts in. Only read when `collapsible` is true. */
  defaultOpen?: boolean;
  /** The bento span. Omitted, the panel is not a tile and no grid is required. */
  span?: TileSpan;
  children: ReactNode;
  className?: string;
}

export interface PanelState {
  shown: boolean;
  closable: boolean;
  bodyId: string;
  onToggle: () => void;
}

export type PanelCardProps = PanelProps & PanelState;
