/**
 * These sections extend the three levels rather than replacing them, and the rail
 * keeps the levels one click away while a reader is here.
 *
 * Build is an accordion of epics, and a slice has no other home. Section 2.1 states
 * the rule: a slice belongs to one epic and carries no meaning outside it, so the
 * rail never lists slices and `build/slices` is not a route. The nested accordion
 * is the shape, because the content repeats twice at two depths.
 *
 * Every list in this file is an excerpt. Everything below a row states its absence
 * or its count and stops, and whatever is longer opens in a Sheet.
 *
 * The record reads use optional chaining on `goal`, because the shipped record type
 * declares it possibly absent. `epicGroups` lives in `./model`, because the program
 * design places every work-item derivation there.
 */

export { EpicGroupSection, UnresolvedSlicesSection } from "./sections/epicGroup";
export { RubricsSection } from "./sections/rubrics";
export { PlanSection } from "./sections/plan";
export { PullRequestsSection } from "./sections/pullRequests";
export { FlightDeckPanel } from "./sections/pullRequestRows";
export { ShippedSection } from "./sections/shipped";
