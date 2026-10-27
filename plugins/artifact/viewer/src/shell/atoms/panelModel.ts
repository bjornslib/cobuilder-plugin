import { createContext, type ReactNode } from "react";

import type { LucideIcon } from "lucide-react";

import type { TileSpan } from "./bento";
import type { Tone } from "./tones";

/**
 * The link a level hands its section panels, so a panel's heading can lead to the same
 * section on the other account. A level with no counterpart provides null, and a panel
 * then draws no link. `onGo` receives the address and the section name.
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
  absent?: boolean;
  count?: number;
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
