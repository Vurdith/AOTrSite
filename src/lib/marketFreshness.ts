export const marketChangedStorageKey = "aotr-market-changed-at";
export const marketChangedEventName = "aotr-market-changed";

export function markMarketDataChanged() {
  if (typeof window === "undefined") return;

  const changedAt = String(Date.now());
  window.localStorage.setItem(marketChangedStorageKey, changedAt);
  window.dispatchEvent(new CustomEvent(marketChangedEventName, { detail: changedAt }));
}
