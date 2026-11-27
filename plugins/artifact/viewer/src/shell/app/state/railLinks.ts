import { useEffect, useState } from "react";

import type { PanelAction } from "../../atoms";
import { diffFiles } from "../../change/levels";
import { counterpartHref, railGroups, readInLabel, rowsOf, type RailRow, type RailSource, type WorkItem } from "../../model";
import { useRailArrowKeys } from "../railKeys";
import type { Account } from "./account";
import type { Address } from "./address";
import type { ShellCore } from "./core";

interface Carried {
  href: string;
  section: string;
}

/*
 * The rail's own input. One object serves the rail, the arrow-key walk, and the Review
 * group's addresses, so all three read one derivation.
 *
 * The change the rail addresses is the route's change, and failing that the work's own.
 * Without the fallback the current-row match would fail on every program row, because
 * the route names no pull request there.
 */
function railChangePrOf(work: WorkItem | null, changePr: number | null): number | null {
  return changePr ?? (work && work.pullRequests.length > 0 ? work.pullRequests[0].id : null);
}

function buildRailSource(address: Address, account: Account): RailSource {
  const { work, gates, levels } = address;
  const { change, servedAudio } = account;
  const files = change.diff === null ? null : diffFiles(change.diff).length;
  return { work, gates, levels, changePr: railChangePrOf(work, account.changePr), changeLevels: change.levels, diffFiles: files, servedAudio };
}

/*
 * The root is the board route. A reader who opens the server's root carries an empty
 * hash, so the address normalizes to `#/` and later steps read one scheme. The
 * replacement carries no history entry, because the root was always the board route.
 */
function useHomeHash(): void {
  useEffect(() => {
    if (window.location.hash === "") {
      window.history.replaceState(null, "", "#/");
    }
  }, []);
}

function useCarried(here: string) {
  const [carried, setCarried] = useState<Carried | null>(null);
  useEffect(() => {
    if (carried !== null && carried.href !== here) setCarried(null);
  }, [carried, here]);
  const carriedHere = carried !== null && carried.href === here ? carried.section : null;
  return { setCarried, carriedHere };
}

interface ActionInput {
  row: RailRow | null;
  workId: string;
  railChangePr: number | null;
  onGo: PanelAction["onGo"];
}

function panelActionOf({ row, workId, railChangePr, onGo }: ActionInput): PanelAction | null {
  if (row === null || row.shared === null || railChangePr === null) return null;
  const label = readInLabel(row.account, row.account === "program" ? railChangePr : null);
  if (label === null) return null;
  return { label, href: counterpartHref(workId, railChangePr, row.account, row.shared), onGo };
}

/*
 * The link on a section heading crosses only where both accounts carry the same section
 * name. The row's `shared` field holds that name or null, so the change's File Diffs row
 * and the program's Epics, Rubrics, and Plan rows get no link. A work whose epics carry
 * no pull request has no change account to cross to, and `readInLabel` gives null.
 *
 * The address comes from `counterpartHref`. The section name rides view state and not the
 * route (ADR-0028): a press stores it with the address it opens, and the level that
 * opens there reads it only while the address still matches. The effect below clears it
 * once the hash is another address, so a later arrival at the same address starts clean.
 */
function usePanelAction(go: ShellCore["go"], row: RailRow | null, source: RailSource) {
  const here = window.location.hash;
  const { setCarried, carriedHere } = useCarried(here);
  const onGo = (href: string, sectionName: string) => {
    setCarried({ href, section: sectionName });
    go(href);
  };
  const panelAction = panelActionOf({ row, workId: source.work?.id ?? "", railChangePr: source.changePr ?? null, onGo });
  return { panelAction, carriedHere };
}

/*
 * The reader's own row is matched by its address and never by its section name. The
 * two groups repeat three section names, so a name match would light more than one row
 * and the mark would name the wrong account. A reader who arrives on the change's
 * Architecture row reads Architecture's mark and not the account's first row's.
 *
 * A section no account owns has no row. The pull-request list and the shipped record
 * belong to the shell, not to either account, so no row opens them and no mark stands
 * above them.
 */
export function useRailLinks({ go }: ShellCore, address: Address, account: Account) {
  const railSource = buildRailSource(address, account);
  useRailArrowKeys({ source: railSource, go });
  const row = rowsOf(railGroups(railSource)).find((candidate) => candidate.href === window.location.hash) ?? null;
  useHomeHash();
  return { railSource, ...usePanelAction(go, row, railSource) };
}
