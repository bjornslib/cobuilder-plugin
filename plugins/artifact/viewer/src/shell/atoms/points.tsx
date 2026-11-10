import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * One point: a bullet, the point itself, and the kind it carries.
 *
 * A row is a row, not a box. The engineer asked twice for this shape. A point in its
 * own outlined box competes with the card that holds it, and a column of five boxes
 * reads as five things rather than one list.
 */
export interface Point {
  text: string;
  /** The beat's own kind, or the column's kind when the list is uniform. */
  kind?: string;
}

const POINT_TEXT_CLASS = "min-w-0 flex-1 font-serif text-[16px] leading-[1.55] break-words text-ink-mid";

const POINT_KIND_CLASS = "mt-0.5 shrink-0 font-mono text-[12px] text-ink-faint";

function PointRow({ point, index }: { point: Point; index: number }) {
  const stripe = index % 2 === 0 ? "bg-card" : "bg-surface-2";
  return (
    <li className={cn("flex min-w-0 items-start gap-2.5 px-4 py-2.5", stripe)}>
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-faint" aria-hidden="true" />
      <span className={POINT_TEXT_CLASS}>{point.text}</span>
      {point.kind ? <span className={POINT_KIND_CLASS}>{point.kind}</span> : null}
    </li>
  );
}

function PointRows({ points }: { points: Point[] }) {
  return (
    <ol className="m-0 flex min-w-0 list-none flex-col p-0">
      {points.map((point, index) => (
        <PointRow key={`${index}-${point.text.slice(0, 24)}`} point={point} index={index} />
      ))}
    </ol>
  );
}

function PointCardHeader({ title }: { title: string }) {
  return (
    <CardHeader className="border-b border-line-soft bg-surface-2 px-4 py-2.5">
      <CardTitle className="font-mono text-[12.5px] font-bold tracking-[0.08em] uppercase">
        {title}
      </CardTitle>
    </CardHeader>
  );
}

interface PointCardProps {
  title: string;
  lead?: string;
  points: Point[];
  className?: string;
}

const POINT_LEAD_CLASS =
  "m-0 max-w-[86ch] border-b border-line-soft px-4 py-3 font-serif text-[16px] leading-[1.6] text-foreground";

/**
 * One column of points: a shadcn `Card`, one unboxed lead, then striped rows.
 *
 * The lead is the record's own words. It is set as prose above the rows and not as a
 * box, because the rows are the list and the lead is what the list is about.
 *
 * The stripe is an explicit index, not `odd:` or `even:`. The rows sit in an `ol`
 * beside a header and a lead paragraph, and an index cannot be thrown off by a sibling
 * that joins the list later. Row 0 paints `bg-card`, the card's own colour, and row 1
 * paints `bg-surface-2`. Both tokens are redefined for dark mode in `index.css`, so the
 * stripe holds in either theme.
 */
export function PointCard({ title, lead, points, className }: PointCardProps) {
  return (
    <Card className={cn("min-w-0 gap-0 rounded-xl py-0", className)}>
      <PointCardHeader title={title} />
      <CardContent className="min-w-0 px-0 pb-0">
        {lead ? <p className={POINT_LEAD_CLASS}>{lead}</p> : null}
        {points.length > 0 ? <PointRows points={points} /> : null}
      </CardContent>
    </Card>
  );
}
