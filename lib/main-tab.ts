export const MAIN_TAB_ORDER = [
  "home",
  "planning",
  "scan",
  "history",
  "profile",
] as const;

export type MainTab = (typeof MAIN_TAB_ORDER)[number];

export function getMainTabIndex(tab: MainTab): number {
  return MAIN_TAB_ORDER.indexOf(tab);
}
