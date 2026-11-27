import { useState, type ReactNode } from "react";

import { AnimatePresence, motion } from "motion/react";

import { sliceRowIntoView } from "../hooks";
import type { Route } from "../model";
import { travelOf, type Hop, type Travel } from "./travel";
import type { ShellView } from "./view";

const EASE = [0.22, 0.75, 0.3, 1] as const;
const SHIFT = 32;
const BOUNDED = "flex h-full min-h-0 min-w-0 flex-col";
const STACKED = "flex min-w-0 flex-col";

const VARIANTS = {
  enter: (travel: Travel) => ({ x: travel === "back" ? -SHIFT : SHIFT, opacity: 0 }),
  shown: { x: 0, opacity: 1, transition: { duration: 0.22, ease: EASE } },
  leave: (travel: Travel) => ({ x: travel === "back" ? SHIFT : -SHIFT, opacity: 0, transition: { duration: 0.15, ease: EASE } }),
};

interface Trip {
  seen: Route;
  hop: Hop;
  travel: Travel;
  turn: number;
}

function hopOf(v: ShellView): Hop {
  return { route: v.work === null ? { ...v.route, workId: null } : v.route, kanban: v.kanban };
}

function tripAfter(trip: Trip, v: ShellView, hop: Hop): Trip {
  if (trip.seen === v.route) return { ...trip, hop };
  const travel = v.reduce ? null : travelOf(trip.hop, hop);
  if (travel === null) return { ...trip, seen: v.route, hop };
  return { seen: v.route, hop, travel, turn: trip.turn + 1 };
}

function useTrip(v: ShellView): Trip {
  const hop = hopOf(v);
  const [trip, setTrip] = useState<Trip>({ seen: v.route, hop, travel: null, turn: 0 });
  if (trip.seen === v.route && trip.hop.route.workId === hop.route.workId) return trip;
  const next = tripAfter(trip, v, hop);
  setTrip(next);
  return next;
}

function surfaceEvents(v: ShellView) {
  const clip = (overflowX: string) => v.paneRef.current?.style.setProperty("overflow-x", overflowX);
  return {
    onAnimationStart: () => clip("hidden"),
    onAnimationComplete: (name: unknown) => {
      clip("");
      if (name === "shown") sliceRowIntoView(v.markedRow);
    },
  };
}

export function TravelMotion({ v, children }: { v: ShellView; children: ReactNode }) {
  const trip = useTrip(v);
  const className = v.paged || v.kanban !== null ? BOUNDED : STACKED;
  return (
    <AnimatePresence mode="wait" initial={false} custom={trip.travel}>
      <motion.div key={trip.turn} custom={trip.travel} variants={VARIANTS} initial="enter" animate="shown" exit="leave" {...surfaceEvents(v)} className={className}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
