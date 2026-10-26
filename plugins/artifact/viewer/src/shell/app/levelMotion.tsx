import type { ReactNode } from "react";

import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

function levelMotion(reduce: boolean) {
  return {
    initial: reduce ? (false as const) : { opacity: 0 },
    animate: { opacity: 1 },
    exit: reduce ? undefined : { opacity: 0 },
    transition: { duration: 0.2, ease: [0.22, 0.75, 0.3, 1] as const },
  };
}

interface LevelMotionProps {
  motionKey: string;
  reduce: boolean;
  paged: boolean;
  children: ReactNode;
}

/*
 * A paging level fills the pane and hands the height it has left
 * to the stage. `h-full` is the pane's own height, so the stage,
 * a `flex-1` child, takes exactly what the chrome above it did
 * not spend. A level that stacks keeps the pane's own scroll.
 */
export function LevelMotion({ motionKey, reduce, paged, children }: LevelMotionProps) {
  const fill = paged ? "flex h-full min-h-0 flex-col pt-6 pb-2" : "px-6 py-6 pb-12";
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={motionKey} {...levelMotion(reduce)} className={cn("min-w-0", fill)}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
