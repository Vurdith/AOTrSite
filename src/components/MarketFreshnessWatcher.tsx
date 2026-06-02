"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { marketChangedEventName, marketChangedStorageKey } from "@/lib/marketFreshness";

const marketSeenStoragePrefix = "aotr-market-seen-at";

export function MarketFreshnessWatcher() {
  const pathname = usePathname();
  const router = useRouter();

  const refreshIfChanged = useCallback(() => {
    const changedAt = window.localStorage.getItem(marketChangedStorageKey);
    if (!changedAt) return;

    const seenKey = `${marketSeenStoragePrefix}:${pathname}`;
    if (window.sessionStorage.getItem(seenKey) === changedAt) return;

    window.sessionStorage.setItem(seenKey, changedAt);
    router.refresh();
  }, [pathname, router]);

  useEffect(() => {
    refreshIfChanged();

    window.addEventListener("focus", refreshIfChanged);
    window.addEventListener("pageshow", refreshIfChanged);
    window.addEventListener("storage", refreshIfChanged);
    window.addEventListener(marketChangedEventName, refreshIfChanged);

    return () => {
      window.removeEventListener("focus", refreshIfChanged);
      window.removeEventListener("pageshow", refreshIfChanged);
      window.removeEventListener("storage", refreshIfChanged);
      window.removeEventListener(marketChangedEventName, refreshIfChanged);
    };
  }, [refreshIfChanged]);

  return null;
}
