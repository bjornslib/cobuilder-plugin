import { useContext, type MouseEvent } from "react";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion, type Transition } from "motion/react";

import { cn } from "@/lib/utils";

import { ABSENT_CARD, NotPresentPill } from "./chips";
import { BAND_FOCUS, BAND_PANEL, jumpTarget } from "./headings";
import { PanelActionContext, type PanelAction, type PanelCardProps } from "./panelModel";
import { TONE_RULE, type Tone } from "./tones";

const HEADER_CLASS = cn(
  "mx-3.5 mt-3.5 mb-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5",
  BAND_PANEL,
);

const DISCLOSE_CLASS = cn(
  "group/disclose flex min-h-9 min-w-0 flex-1 cursor-pointer items-center rounded-md",
  "transition-shadow duration-150 ease-house hover:ring-1 hover:ring-band-ink/35",
  BAND_FOCUS,
);

const COUNTERPART_CLASS = cn(
  "shrink-0 cursor-pointer rounded-sm font-mono text-[12.5px] font-bold text-band-ink",
  "underline-offset-4 hover:underline",
  BAND_FOCUS,
);

const ICON_CLASS =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-band-ink/20 text-band-ink";

const TITLE_CLASS = "m-0 min-w-0 font-mono text-[15px] font-bold tracking-[-0.01em] text-band-ink";

const COUNT_CLASS = "shrink-0 font-mono text-[13px] text-band-ink/75 tabular-nums";

const CHEVRON_CLASS = "shrink-0 text-band-ink/80 group-hover/disclose:text-band-ink";

const LEAD_CLASS =
  "m-0 mb-3 max-w-[86ch] font-serif text-[15px] leading-[1.5] text-ink-dim italic";

function PanelIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className={ICON_CLASS}>
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

function PanelChevron({ shown }: { shown: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={CHEVRON_CLASS}
      animate={{ rotate: shown ? 180 : 0 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
    >
      <ChevronDown className="size-4" aria-hidden="true" />
    </motion.span>
  );
}

function PanelHeading({ title, icon, count, closable, shown }: PanelCardProps) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-x-3">
      {icon ? <PanelIcon icon={icon} /> : null}
      <h2 className={TITLE_CLASS}>{title}</h2>
      {typeof count === "number" ? <span className={COUNT_CLASS}>{count}</span> : null}
      {closable ? <PanelChevron shown={shown} /> : null}
    </span>
  );
}

function PanelTitleControl(props: PanelCardProps) {
  const { shown, bodyId, onToggle } = props;
  const heading = <PanelHeading {...props} />;
  if (!props.closable) return heading;
  return (
    <button type="button" onClick={onToggle} aria-expanded={shown} aria-controls={bodyId} className={DISCLOSE_CLASS}>
      {heading}
    </button>
  );
}

function followCounterpart(event: MouseEvent<HTMLAnchorElement>, counterpart: PanelAction, title: string) {
  /* A press with a modifier belongs to the browser, so a new tab still opens. */
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  counterpart.onGo(counterpart.href, title);
}

function CounterpartLink({ title }: { title: string }) {
  const counterpart = useContext(PanelActionContext);
  if (!counterpart) return null;
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => followCounterpart(event, counterpart, title);
  return (
    <a href={counterpart.href} onClick={onClick} className={COUNTERPART_CLASS}>
      {counterpart.label}
    </a>
  );
}

/*
  The heading row is a band, inset inside the card on all four sides so the
  card's own padding and border stay visible around it. The disclosure takes a
  ring and brightens its chevron on hover rather than taking a fill: a white
  wash over the band mixes back to a colour close to the band itself, so it
  would break the rule that no hover state fills with the heading colour.
*/
function PanelHeader(props: PanelCardProps) {
  const { absent = false, action } = props;
  return (
    <header className={HEADER_CLASS}>
      <PanelTitleControl {...props} />
      {absent ? <NotPresentPill className="ml-auto" /> : <span className="ml-auto" />}
      <CounterpartLink title={props.title} />
      {action ? <div className="flex min-w-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}

function bodyTransition(reduce: boolean | null): Transition {
  return reduce ? { duration: 0 } : { height: { duration: 0.22 }, opacity: { duration: 0.22 } };
}

function ruleClass(tone: Tone): string {
  return cn("min-w-0 px-4 py-3.5", tone !== "neutral" && TONE_RULE[tone], tone !== "neutral" && "border-l-4");
}

function PanelContent({ tone = "neutral", lead, children }: PanelCardProps) {
  return (
    <div className={ruleClass(tone)}>
      {lead ? <p className={LEAD_CLASS}>{lead}</p> : null}
      {children}
    </div>
  );
}

function PanelBody(props: PanelCardProps) {
  const { shown, bodyId } = props;
  const animate = { height: shown ? "auto" : 0, opacity: shown ? 1 : 0 };
  return (
    <motion.div
      id={bodyId} inert={!shown} initial={false} animate={animate}
      transition={bodyTransition(useReducedMotion())} className="min-w-0 overflow-hidden"
    >
      <PanelContent {...props} />
    </motion.div>
  );
}

function cardClass({ absent = false, span, className }: PanelCardProps): string {
  const frame = absent ? ABSENT_CARD : "border-line bg-card shadow-card";
  return cn("rounded-xl border", frame, span && "min-w-0 flex-1", className);
}

export function PanelCard(props: PanelCardProps) {
  return (
    <section {...jumpTarget(props.title)} className={cardClass(props)} aria-label={props.title}>
      <PanelHeader {...props} />
      <PanelBody {...props} />
    </section>
  );
}
