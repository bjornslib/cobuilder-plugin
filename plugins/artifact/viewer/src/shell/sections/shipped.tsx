import { PackageCheck } from "lucide-react";

import type { PublicationEntity } from "@/data/types";

import { AbsentLine, Bento, Box, Chip, Panel, StateBadge, toneForStage } from "../atoms";
import { STAGE_PUBLICATIONS_DEPLOY_LEAD, type WorkItem } from "../model";

const NO_DEPLOY_RECORD =
  "No deploy record exists in this corpus. The section reports the stage and any publication instead, and states the gap rather than implying a release.";

const STAGE_CARRIES_SECTION =
  "The design's stage reads implemented, so this section renders even though no publication names one of this work's own pull requests.";

const PUBLICATION_ROW_CLASS =
  "flex min-w-0 flex-col gap-1 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2";

function ReleaseBadges({ work }: { work: WorkItem }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <StateBadge word={work.design.stage} tone={toneForStage(work.design.stage)} />
      <Chip>{work.publications.length} publications</Chip>
      <Chip title="A publication counts here only when a pull request this work's own epics carry owns it.">
        keyed to this work&apos;s own pull requests
      </Chip>
    </div>
  );
}

function PublicationRow({ publication }: { publication: PublicationEntity }) {
  return (
    <li className={PUBLICATION_ROW_CLASS}>
      <span className="min-w-0 font-mono text-[13px] break-words text-ink-mid">{publication.id}</span>
      <span className="font-mono text-[12px] text-ink-faint">
        PR {publication.pull_request} · {publication.published_at}
      </span>
    </li>
  );
}

function PublicationList({ publications }: { publications: PublicationEntity[] }) {
  return (
    <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
      {publications.map((publication) => (
        <PublicationRow key={publication.id} publication={publication} />
      ))}
    </ul>
  );
}

function PublicationNote({ work, implemented }: { work: WorkItem; implemented: boolean }) {
  if (work.publications.length > 0) return <PublicationList publications={work.publications} />;
  if (implemented) return <Box label="The stage carries this section" tone="note">{STAGE_CARRIES_SECTION}</Box>;
  return <AbsentLine>No publication names one of this work&apos;s own pull requests.</AbsentLine>;
}

function ReleaseDetail({ work, implemented }: { work: WorkItem; implemented: boolean }) {
  return (
    <div className="mt-3.5 flex min-w-0 flex-col gap-2.5">
      <AbsentLine>{NO_DEPLOY_RECORD}</AbsentLine>
      <PublicationNote work={work} implemented={implemented} />
    </div>
  );
}

function ReleasePanel({ work, implemented }: { work: WorkItem; implemented: boolean }) {
  const shipped = implemented || work.publications.length > 0;
  return (
    <Panel span="band" title="Release status" icon={PackageCheck} absent={!shipped}
      lead={STAGE_PUBLICATIONS_DEPLOY_LEAD}>
      <ReleaseBadges work={work} />
      <ReleaseDetail work={work} implemented={implemented} />
    </Panel>
  );
}

export function ShippedSection({ work }: { work: WorkItem }) {
  return (
    <Bento>
      <ReleasePanel work={work} implemented={work.design.stage === "implemented"} />
    </Bento>
  );
}
