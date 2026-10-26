import type { ReactNode } from "react";

import { ArrowRight, type LucideIcon } from "lucide-react";

import SmoothButton from "@/components/smoothui/smooth-button";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  children: ReactNode;
  icon?: LucideIcon;
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
  title?: string;
}

const ACTION_CLASS = "self-start px-3.5 font-mono text-[13px] font-bold";

/**
 * A control that navigates somewhere, drawn with SmoothUI's `smooth-button`.
 *
 * The engineer asked for every navigating control to become a proper button, and
 * `smooth-button` is the one the design system names. `variant="outline"` suits a
 * document: a reading surface is not a marketing page, and a filled brand button
 * would shout on a page whose subject is a record. The trailing arrow is the
 * `suffix` icon, and it says the control moves the reader forward rather than
 * toggling something in place.
 *
 * `size="lg"` is `h-11`, which is 44 px, so section 11.2's hit target holds. The
 * horizontal padding is pulled back from the registry's `px-8`, because a document
 * control does not need the width of a call to action. `self-start` is in the base
 * class, because every call site is a flex column and a stretched button would span
 * the panel it sits in.
 */
export function ActionButton({ children, icon: Icon, onClick, className, ariaLabel, title }: ActionButtonProps) {
  const prefix = Icon ? <Icon aria-hidden="true" /> : undefined;
  return (
    <SmoothButton variant="outline" size="lg" onClick={onClick} aria-label={ariaLabel} title={title}
      prefix={prefix} suffix={<ArrowRight aria-hidden="true" />} className={cn(ACTION_CLASS, className)}>
      {children}
    </SmoothButton>
  );
}
