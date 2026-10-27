import type { ReactNode } from "react";

import type { StoryDiffGroup, StoryEntry } from "@/data/bundle";
import { Missing, Panel, TextList } from "@/shell/atoms";

import { ChangeDiff } from "./Diff";
import { diffFiles } from "./levels";
import type { RowContext } from "./rowContext";
import { CHANGE_LEVEL_KEY } from "./sectionModel";

const NO_GROUPS =
  "This pull request's fourth level groups no file. The diff is the whole of the record.";

function GroupHeading({ group, index }: { group: StoryDiffGroup; index: number }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-2">
      <span className="font-mono text-[12.5px] font-bold text-ink-mid">
        {group.title ?? `Group ${index + 1}`}
      </span>
      <span className="font-mono text-[12px] text-ink-faint tabular-nums">{(group.files ?? []).length} files</span>
    </div>
  );
}

function GroupItem({ group, index }: { group: StoryDiffGroup; index: number }) {
  return (
    <li className="min-w-0 list-none">
      <GroupHeading group={group} index={index} />
      {group.note ? <p className="mt-1 mb-0 font-serif text-[15px] leading-[1.55] text-ink-dim">{group.note}</p> : null}
      <div className="mt-1.5 min-w-0">
        <TextList items={group.files ?? []} />
      </div>
    </li>
  );
}

function Groups({ groups }: { groups: StoryDiffGroup[] }) {
  return (
    <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">
      {groups.map((group, index) => (
        <GroupItem key={`${index}-${group.title ?? ""}`} group={group} index={index} />
      ))}
    </ul>
  );
}

function groupsOf(entry: StoryEntry): StoryDiffGroup[] {
  return entry.levels?.[CHANGE_LEVEL_KEY["file-diffs"]]?.groups ?? [];
}

function groupsPanel({ entry, level, icon }: RowContext): ReactNode {
  const groups = groupsOf(entry);
  return (
    <Panel key="groups" title="Change groups" icon={icon} absent={level === null && groups.length === 0}>
      {groups.length === 0 ? <Missing>{NO_GROUPS}</Missing> : <Groups groups={groups} />}
    </Panel>
  );
}

function diffPanel({ props, icon }: RowContext): ReactNode {
  const files = props.diff === null ? [] : diffFiles(props.diff);
  return (
    <Panel key="diff" title="The diff" icon={icon} absent={props.diff === null}>
      {props.diffMessage === null ? null : <Missing>{props.diffMessage}</Missing>}
      <ChangeDiff files={files} selected={props.diffFile} onSelect={props.onDiffFile} />
    </Panel>
  );
}

export function diffSections(ctx: RowContext): ReactNode[] {
  return [groupsPanel(ctx), diffPanel(ctx)];
}
