/**
 * The sections each level pages, one file per level.
 *
 * `App.tsx` reads every panel through this barrel, so a level's own file and its
 * sections are one import away and no caller reaches across levels. The three levels of
 * the shell read `ProblemSolution.tsx`, `Intent.tsx`, and `Architecture.tsx`. The three
 * sections that follow them read `Build.tsx`, `PullRequests.tsx`, and `Shipped.tsx`.
 *
 * The order below is the order the rail lists the levels, which is the order a reader
 * walks: Intent, Problem and solution, Architecture, Build, Pull requests, Shipped.
 */

export { AbortIfSection, DoneWhenSection, OutOfScopeSection, WhySection } from "./Intent";

export {
  AssessmentSection,
  ProblemSolutionSection,
  RisksSection,
  UnknownsSection,
} from "./ProblemSolution";

export {
  BoundariesSection,
  DecisionsSection,
  DiagramsSection,
  DistrictsAndAlternativesSection,
} from "./Architecture";

export { EpicGroupSection, RubricsSection, UnresolvedSlicesSection } from "./Build";

export { PullRequestsSection } from "./PullRequests";

export { ShippedSection } from "./Shipped";
