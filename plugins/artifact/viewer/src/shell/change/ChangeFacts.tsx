import type { StoryEntry } from "@/data/bundle";
import { Chip, Missing, StateBadge } from "@/shell/atoms";

function Identity({ entry }: { entry: StoryEntry }) {
  return (
    <>
      <Chip tone="neutral">PR {entry.pr}</Chip>
      <StateBadge word={entry.status ?? "unknown"} tone={entry.status === "merged" ? "good" : "accent"} />
    </>
  );
}

function SizeChip({ size }: { size: StoryEntry["size"] }) {
  if (!size) return null;
  return <Chip>{size.files} files, +{size.adds} / &minus;{size.dels}</Chip>;
}

function Tagline({ tagline }: { tagline: string | undefined }) {
  if (!tagline) return null;
  return <p className="mt-1 mb-0 max-w-[92ch] font-serif text-[16px] leading-[1.6] text-ink-mid">{tagline}</p>;
}

/** The change's own facts: what it is, when it merged, and how big it is. */
export function ChangeFacts({ entry }: { entry: StoryEntry }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <Identity entry={entry} />
      {entry.date ? <Chip>{entry.date}</Chip> : null}
      {entry.commit ? <Chip className="text-ink-faint">{entry.commit.slice(0, 9)}</Chip> : null}
      <SizeChip size={entry.size} />
      {entry.depth ? <Chip>depth: {entry.depth}</Chip> : null}
      <Tagline tagline={entry.tagline} />
    </div>
  );
}

function DistrictItem({ district, count }: { district: string; count: number }) {
  return (
    <li className="list-none">
      <Chip tone={count > 5 ? "accent" : "neutral"}>
        {district} &times; {count}
      </Chip>
    </li>
  );
}

/** The districts this diff touched, by count. */
export function Touched({ entry }: { entry: StoryEntry }) {
  const touched = Object.entries(entry.touched ?? {}).sort((a, b) => b[1] - a[1]);
  if (touched.length === 0) return <Missing>This pull request records no touched district.</Missing>;
  return (
    <ul className="m-0 flex min-w-0 list-none flex-wrap gap-2 p-0">
      {touched.map(([district, count]) => (
        <DistrictItem key={district} district={district} count={count} />
      ))}
    </ul>
  );
}
