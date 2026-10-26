import { useChangeAccount } from "./state/account";
import { useWorkAddress } from "./state/address";
import { useCatalog } from "./state/catalog";
import { useChrome } from "./state/chrome";
import { useShellCore } from "./state/core";
import { useNavigation, usePaneEffects } from "./state/pane";
import { useRailLinks } from "./state/railLinks";

export function useShellState() {
  const core = useShellCore();
  const chrome = useChrome(core.route.workId === null);
  const catalog = useCatalog(core.load);
  const address = useWorkAddress(core, catalog);
  const pane = usePaneEffects(core, address);
  const nav = useNavigation(core, address.section);
  const account = useChangeAccount(core, address);
  const links = useRailLinks(core, address, account);
  return { ...core, ...chrome, ...catalog, ...address, ...pane, ...nav, ...account, ...links };
}

export type ShellState = ReturnType<typeof useShellState>;
