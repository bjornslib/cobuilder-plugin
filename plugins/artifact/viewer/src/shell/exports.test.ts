import { describe, expect, it } from "vitest";

const RUNTIME_NAMES: Record<string, string[]> = {
  "./model": [
    "LEVEL_KEYS", "PLAN_KEY", "PROBLEM_KINDS", "PROGRAM_KEYS",
    "SECTION_KEYS", "SECTION_LABEL", "SHARED_KEYS", "SOLUTION_KINDS",
    "STAGE_PUBLICATIONS_DEPLOY_LEAD", "boardHref", "buildWorkItems", "carriedSectionIndex",
    "changeHref", "changeRowIndex", "counterpartHref", "epicGroups",
    "gatesOf", "isSectionKey", "levelsOf", "programHref",
    "pullRequestHref", "railGroups", "readInLabel", "readRoute",
    "routeHref", "rowsOf", "splitBeats", "switcherList",
    "worklessPullRequest",
  ],
  "./atoms": [
    "ABSENT_CARD", "AbsentLine", "AbsentRecordLine", "ActionButton",
    "BAND_FOCUS", "BAND_PANEL", "BAND_SECTION", "Bento",
    "Box", "Chip", "EmptyNote", "Field",
    "KeyValue", "Missing", "NotPresentPill", "Panel",
    "PanelActionContext", "PointCard", "SHEET_HEADING_ATTR", "SectionHeading",
    "StateBadge", "SubHead", "TILE_SPAN", "TINT_BAR",
    "TONE_MARK", "TONE_PILL", "TONE_RULE", "TextList",
    "Tile", "jumpTarget", "toneForSeverity", "toneForStage",
    "toneForState", "toneForVerdict",
  ],
  "./sections": [
    "EpicGroupSection", "FlightDeckPanel", "PlanSection", "PullRequestsSection",
    "RubricsSection", "ShippedSection", "UnresolvedSlicesSection",
  ],
  "./App": [
    "default",
  ],
  "../data/bundle": [
    "BUNDLE_DATA_URL", "BUNDLE_MOUNT", "STAGE_GLOSS", "STAGE_ORDER",
    "appendScript", "designRows", "designRowsOf", "entitiesOf",
    "isKnownStage", "joinsOf", "loadDesigns", "loadDiagrams",
    "loadDiff", "loadIndex", "loadManifest", "loadStory",
    "readGlobal", "readScriptGlobal", "unresolvedSliceCount",
  ],
  "../data/types": [
  ],
  "../data/works": [
    "architectureTileLevels", "buildWorkItems",
  ],
  "../data/joins": [
    "resolvedJoinsOf",
  ],
};

const LOADERS: Record<string, () => Promise<object>> = {
  "./model": () => import("./model"),
  "./atoms": () => import("./atoms"),
  "./sections": () => import("./sections"),
  "./App": () => import("./App"),
  "../data/bundle": () => import("../data/bundle"),
  "../data/types": () => import("../data/types"),
  "../data/works": () => import("../data/works"),
  "../data/joins": () => import("../data/joins"),
};

describe("the exported runtime names of the logic layer", () => {
  it.each(Object.keys(RUNTIME_NAMES))("%s exports the pinned names", async (path) => {
    const loaded = await LOADERS[path]();
    expect(Object.keys(loaded).sort()).toEqual(RUNTIME_NAMES[path]);
  });
});

export type PinnedTypeNames = {
  "./model": [
    import("./model").AccountId,
    import("./model").Gates,
    import("./model").GroupKey,
    import("./model").LevelKey,
    import("./model").LevelState,
    import("./model").ProgramKey,
    import("./model").RailGroup,
    import("./model").RailRow,
    import("./model").RailSource,
    import("./model").Route,
    import("./model").SectionKey,
    import("./model").SharedKey,
    import("./model").SwitcherDesign,
    import("./model").SwitcherEpic,
    import("./model").WorkItem,
  ];
  "./atoms": [
    import("./atoms").PanelAction,
    import("./atoms").Point,
    import("./atoms").TileSpan,
    import("./atoms").Tone,
  ];
  "./App": [
    import("./App").Theme,
  ];
  "../data/bundle": [
    import("../data/bundle").AssessmentFinding,
    import("../data/bundle").DesignAlternative,
    import("../data/bundle").DesignAssessment,
    import("../data/bundle").DesignGoal,
    import("../data/bundle").DesignIntent,
    import("../data/bundle").DesignNarrative,
    import("../data/bundle").DesignRecord,
    import("../data/bundle").DesignRecords,
    import("../data/bundle").DiagramsByPr,
    import("../data/bundle").DiffByPr,
    import("../data/bundle").Manifest,
    import("../data/bundle").MinWork,
    import("../data/bundle").NarrativeBeat,
    import("../data/bundle").NarrativeLevel,
    import("../data/bundle").PlanEpicRow,
    import("../data/bundle").Story,
    import("../data/bundle").StoryAssessment,
    import("../data/bundle").StoryAssessmentAnswer,
    import("../data/bundle").StoryAssessmentFinding,
    import("../data/bundle").StoryBeat,
    import("../data/bundle").StoryBoundaryCheck,
    import("../data/bundle").StoryDiffGroup,
    import("../data/bundle").StoryEntry,
    import("../data/bundle").StoryIntent,
    import("../data/bundle").StoryIntentAlternative,
    import("../data/bundle").StoryLevel,
  ];
  "../data/types": [
    import("../data/types").AdrEntity,
    import("../data/types").AdrToPullRequest,
    import("../data/types").BoundaryRuleEntity,
    import("../data/types").ContextEntity,
    import("../data/types").DesignEntity,
    import("../data/types").DesignRow,
    import("../data/types").DesignStage,
    import("../data/types").DesignTracker,
    import("../data/types").DistrictEntity,
    import("../data/types").Entities,
    import("../data/types").EpicDesignEntity,
    import("../data/types").EpicEntity,
    import("../data/types").EpicState,
    import("../data/types").GateStep,
    import("../data/types").InteractionDesignEntity,
    import("../data/types").Joins,
    import("../data/types").OpenPullRequest,
    import("../data/types").ProgramDesignEntity,
    import("../data/types").PublicationEntity,
    import("../data/types").PullRequest,
    import("../data/types").RecordIndex,
    import("../data/types").RubricEntity,
    import("../data/types").SliceEntity,
    import("../data/types").TrackerPullRequest,
  ];
  "../data/works": [
    import("../data/works").BoundaryRule,
    import("../data/works").PlanDocs,
    import("../data/works").WorkItem,
  ];
  "../data/joins": [
    import("../data/joins").ResolvedJoins,
  ];
};
