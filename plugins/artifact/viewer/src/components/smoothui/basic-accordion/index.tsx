"use client";

/**
 * The SmoothUI basic accordion, added with
 * `npx shadcn@latest add https://smoothui.dev/r/basic-accordion.json`.
 *
 * Three changes were made to the registry item, and each one is deliberate.
 *
 *   1. `title` and a new `meta` slot take `React.ReactNode`, not `string`. This shell
 *      puts a state badge, a pull-request chip, and a slice count in an epic's header,
 *      and section 3.2's Epic row state table requires all three on the collapsed row.
 *      A string-only header would push them into the body and lose them on collapse.
 *   2. `idPrefix` namespaces the two DOM ids per item. Two accordions on one page can
 *      hold an item with the same key, and duplicated ids break `aria-controls`.
 *   3. The header's hover fill is the house `surface-2` tint, not `bg-primary`. Section
 *      3.2 requires a row to tint toward the surface on hover, and a full accent fill
 *      reads as a selection.
 *
 * The component's structure, its motion, its `inert` handling, and its 44 px minimum
 * header height are unchanged.
 */

import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const CHEVRON_ROTATION_DEGREES = 180;
const CHEVRON_ANIMATION_DURATION = 0.2;

export interface AccordionItem {
  content: React.ReactNode;
  id: string | number;
  title: React.ReactNode;
  /** A short value shown at the header's right edge, before the chevron. */
  meta?: React.ReactNode;
}

export interface BasicAccordionProps {
  allowMultiple?: boolean;
  className?: string;
  defaultExpandedIds?: Array<string | number>;
  items: AccordionItem[];
  /** Namespaces the per-item DOM ids, so two accordions never collide. */
  idPrefix?: string;
  /** Renders the header row without the component's own border and background. */
  flush?: boolean;
}

export default function BasicAccordion({
  items,
  allowMultiple = false,
  className = "",
  defaultExpandedIds = [],
  idPrefix = "item",
  flush = false,
}: BasicAccordionProps) {
  const [expandedItems, setExpandedItems] =
    useState<Array<string | number>>(defaultExpandedIds);
  const shouldReduceMotion = useReducedMotion();

  const toggleItem = (id: string | number) => {
    if (expandedItems.includes(id)) {
      setExpandedItems(expandedItems.filter((item) => item !== id));
    } else if (allowMultiple) {
      setExpandedItems([...expandedItems, id]);
    } else {
      setExpandedItems([id]);
    }
  };

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col overflow-hidden rounded-lg border",
        flush ? "gap-2 divide-y-0 border-0" : "divide-y divide-line",
        className,
      )}
    >
      {items.map((item) => {
        const isExpanded = expandedItems.includes(item.id);
        const headerId = `accordion-${idPrefix}-header-${item.id}`;
        const contentId = `accordion-${idPrefix}-content-${item.id}`;

        return (
          <div
            className={cn("min-w-0 overflow-hidden", flush && "rounded-lg border border-line-soft bg-card")}
            key={item.id}
          >
            <button
              aria-controls={contentId}
              aria-expanded={isExpanded}
              className={cn(
                "flex min-h-[44px] w-full cursor-pointer items-center gap-2 px-4 py-3 text-left",
                "transition-colors duration-150 ease-house hover:bg-surface-2",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                flush ? "bg-card" : "bg-card",
                isExpanded && "bg-accent-wash hover:bg-accent-wash",
              )}
              id={headerId}
              onClick={() => toggleItem(item.id)}
              type="button"
            >
              {/*
                A heading wraps the button's label, per the ARIA accordion pattern. The
                caller may pass rich content here, so the heading holds a span rather
                than the text directly.
              */}
              <h3 className="m-0 flex min-w-0 flex-1 items-center gap-2 font-mono text-[15px] font-normal tracking-normal">
                {item.title}
              </h3>
              {item.meta ? (
                <span className="flex shrink-0 flex-wrap items-center gap-2">{item.meta}</span>
              ) : null}
              <motion.span
                animate={{ rotate: isExpanded ? CHEVRON_ROTATION_DEGREES : 0 }}
                className="shrink-0 text-ink-faint"
                transition={{
                  duration: shouldReduceMotion ? 0 : CHEVRON_ANIMATION_DURATION,
                }}
              >
                <ChevronDown className="size-4" aria-hidden="true" />
              </motion.span>
            </button>

            {/* Content stays mounted (height-animated, not unmounted) so the
                accordion keeps a stable width whether open or closed. `inert`
                removes collapsed content from tab order and the a11y tree. */}
            <motion.div
              animate={{
                height: isExpanded ? "auto" : 0,
                opacity: isExpanded ? 1 : 0,
              }}
              aria-labelledby={headerId}
              className="min-w-0 overflow-hidden"
              id={contentId}
              inert={!isExpanded}
              initial={false}
              role="region"
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      height: {
                        damping: 40,
                        duration: 0.25,
                        stiffness: 500,
                        type: "spring" as const,
                      },
                      opacity: { duration: 0.2 },
                    }
              }
            >
              <div className="min-w-0 border-t border-line-soft bg-surface-2/60 px-4 py-3">
                {item.content}
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
