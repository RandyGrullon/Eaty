"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef } from "react";
import {
  MAIN_TAB_ORDER,
  type MainTab,
  getMainTabIndex,
} from "@/lib/main-tab";

/**
 * Scroll horizontal con snap entre pestañas principales; sincroniza `activeTab` con el scroll.
 */
export function useMainTabScroll(
  mainTabsVisible: boolean,
  activeTab: MainTab,
  setActiveTab: Dispatch<SetStateAction<MainTab>>
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const scrollToTab = useCallback((tab: MainTab) => {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const idx = getMainTabIndex(tab);
    const target = idx * w;
    if (Math.abs(el.scrollLeft - target) > 1) {
      el.scrollTo({ left: target, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (!mainTabsVisible) return;
    scrollToTab(activeTab);
  }, [activeTab, scrollToTab, mainTabsVisible]);

  useEffect(() => {
    if (!mainTabsVisible) return;
    const el = scrollRef.current;
    if (!el) return;

    const syncTabFromScroll = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const idx = Math.round(el.scrollLeft / w);
      const clamped = Math.max(0, Math.min(MAIN_TAB_ORDER.length - 1, idx));
      const next = MAIN_TAB_ORDER[clamped];
      setActiveTab((prev) => (prev !== next ? next : prev));
    };

    let scrollEndTimer: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      if (scrollEndTimer) clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(syncTabFromScroll, 100);
    };

    el.addEventListener("scrollend", syncTabFromScroll);
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      const tab = activeTabRef.current;
      const idx = getMainTabIndex(tab);
      el.scrollLeft = idx * el.clientWidth;
    });
    ro.observe(el);

    return () => {
      el.removeEventListener("scrollend", syncTabFromScroll);
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (scrollEndTimer) clearTimeout(scrollEndTimer);
    };
  }, [mainTabsVisible, setActiveTab]);

  return { scrollRef, scrollToTab };
}
