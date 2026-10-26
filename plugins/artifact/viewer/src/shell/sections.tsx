/**
 * The sections of the Build, Pull requests, and Shipped levels.
 *
 * These sections extend the three levels rather than replacing them, and the rail
 * keeps the levels one click away while a reader is here.
 *
 * BUILD IS AN ACCORDION OF EPICS, AND A SLICE HAS NO OTHER HOME. Section 2.1 states
 * the rule: a slice belongs to one epic and carries no meaning outside it, so the rail
 * never lists slices and `build/slices` is not a route. Each epic discloses its own
 * slices, and each slice discloses its own ends-with, score, and attempt count. The
 * nested accordion is the shape, because the content repeats twice at two depths.
 *
 * Every list in this file is an excerpt. The epic list shows all eighteen rows because
 * the row itself is the structure under review. Everything below a row states its
 * absence or its count and stops, and whatever is longer than that opens in a Sheet.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/sections.tsx`, with
 * two changes. `epicGroups` moved to `./model`, because the program design places every
 * work-item derivation there. The record reads use optional chaining on `goal`, because
 * the shipped record type declares it possibly absent whereas the variation's copy did
 * not. The level entry points that name these sections are `./panels/Build.tsx`,
 * `./panels/PullRequests.tsx`, and `./panels/Shipped.tsx`.
 */

export { EpicGroupSection, UnresolvedSlicesSection } from "./sections/epicGroup";
export { RubricsSection } from "./sections/rubrics";
export { PlanSection } from "./sections/plan";
export { PullRequestsSection } from "./sections/pullRequests";
export { FlightDeckPanel } from "./sections/pullRequestRows";
export { ShippedSection } from "./sections/shipped";
