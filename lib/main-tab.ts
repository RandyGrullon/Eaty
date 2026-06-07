export const MAIN_TAB_ORDER = [
  "home",
  "diets",
  "scan",
  "history",
  "profile",
  "settings",
] as const;


export type MainTab = (typeof MAIN_TAB_ORDER)[number];

export function getMainTabIndex(tab: MainTab): number {
  return MAIN_TAB_ORDER.indexOf(tab);
}
