"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { BarChart3, ChevronDown, Database, Eye, History, ImageIcon, ListChecks, PackageSearch, Plus, RefreshCw, Save, Search, SlidersHorizontal, Tag, Trash2, TrendingUp } from "lucide-react";

import { categories, type ItemCategory, type ItemRarity, type ItemTrend, type ValueItem, type ValueHistoryPoint } from "@/content/items";
import { cn } from "@/lib/cn";
import { markMarketDataChanged } from "@/lib/marketFreshness";
import { rarityStyles } from "@/lib/rarityStyles";
import { itemSearchText, matchesSearch } from "@/lib/search";
import { getCurrencyValues, sanitizeCurrencySettings, type ValueCurrencySettings } from "@/lib/valueCurrency";

type AdminView = "items" | "rates" | "stats" | "logs" | "controls";
type AdminRole = "owner" | "editor" | "media" | "auditor";
type AdminStatusTone = "success" | "danger" | "error" | "warning";
type AdminSortOption = "value-desc" | "value-asc" | "demand-desc" | "demand-asc" | "tax-desc" | "tax-asc" | "prestige-desc" | "prestige-asc" | "name-asc";
type AdminDemandFilter = "all" | "high" | "medium" | "low";
type AdminValueFilter = "all" | "top" | "mid" | "low";
type AdminSourceFilter = "all" | string;
type AdminTrendFilter = "all" | ItemTrend;
type AdminLog = {
  id: string;
  action: "backup_exported" | "backup_restored" | "item_created" | "item_updated" | "item_deleted" | "items_seeded" | "media_uploaded" | "settings_updated";
  actor: {
    avatar: string | null;
    discordId: string;
    ipHash?: string;
    userAgent?: string;
    username: string;
  };
  createdAt: string;
  summary: string;
  targetId?: string;
  targetName?: string;
  targetType: "backup" | "item" | "items" | "media" | "settings";
  changes: AdminLogChange[];
};
type AdminLogChange = {
  after: string | null;
  before: string | null;
  field: string;
  label: string;
};

const rarityOptions: ItemRarity[] = ["mythic", "legendary", "epic", "rare", "uncommon", "common", "event"];
const itemTrendOptions: ItemTrend[] = ["rising", "stable", "falling"];
const adminPageSize = 8;
const adminLogPageSize = 8;
const filterBreakpoint = "(max-width: 767px)";
const adminSortOptions: { id: AdminSortOption; label: string }[] = [
  { id: "value-desc", label: "Value high-low" },
  { id: "value-asc", label: "Value low-high" },
  { id: "demand-desc", label: "Demand high-low" },
  { id: "demand-asc", label: "Demand low-high" },
  { id: "tax-desc", label: "Gem tax high-low" },
  { id: "tax-asc", label: "Gem tax low-high" },
  { id: "prestige-desc", label: "Prestige high-low" },
  { id: "prestige-asc", label: "Prestige low-high" },
  { id: "name-asc", label: "Name A-Z" },
];
const adminTrendOptions: { id: AdminTrendFilter; label: string }[] = [
  { id: "all", label: "Any trend" },
  { id: "rising", label: "Rising" },
  { id: "stable", label: "Stable" },
  { id: "falling", label: "Falling" },
];
const adminDemandOptions: { id: AdminDemandFilter; label: string }[] = [
  { id: "all", label: "Any demand" },
  { id: "high", label: "High 70+" },
  { id: "medium", label: "Medium 35-69" },
  { id: "low", label: "Low <35" },
];
const adminValueRangeOptions: { id: AdminValueFilter; label: string }[] = [
  { id: "all", label: "Any value" },
  { id: "top", label: "Top 10k+" },
  { id: "mid", label: "Mid 1k-9.9k" },
  { id: "low", label: "Low <1k" },
];
const rarityStatStyles: Record<ItemRarity, { background: string; border: string; color: string }> = {
  mythic: {
    background: "linear-gradient(90deg, rgba(153, 27, 27, 0.34), rgba(69, 10, 10, 0.18) 46%, rgba(0, 0, 0, 0.12))",
    border: "rgb(252 165 165 / 0.42)",
    color: "rgb(254 202 202)",
  },
  legendary: {
    background: "linear-gradient(90deg, rgba(194, 65, 12, 0.34), rgba(124, 45, 18, 0.18) 46%, rgba(0, 0, 0, 0.12))",
    border: "rgb(253 186 116 / 0.44)",
    color: "rgb(254 215 170)",
  },
  epic: {
    background: "linear-gradient(90deg, rgba(126, 34, 206, 0.34), rgba(88, 28, 135, 0.18) 46%, rgba(0, 0, 0, 0.12))",
    border: "rgb(216 180 254 / 0.44)",
    color: "rgb(233 213 255)",
  },
  rare: {
    background: "linear-gradient(90deg, rgba(29, 78, 216, 0.34), rgba(30, 58, 138, 0.18) 46%, rgba(0, 0, 0, 0.12))",
    border: "rgb(147 197 253 / 0.44)",
    color: "rgb(191 219 254)",
  },
  uncommon: {
    background: "linear-gradient(90deg, rgba(5, 150, 105, 0.32), rgba(6, 95, 70, 0.18) 46%, rgba(0, 0, 0, 0.12))",
    border: "rgb(110 231 183 / 0.42)",
    color: "rgb(167 243 208)",
  },
  common: {
    background: "linear-gradient(90deg, rgba(82, 82, 91, 0.32), rgba(39, 39, 42, 0.2) 46%, rgba(0, 0, 0, 0.12))",
    border: "rgb(212 212 216 / 0.34)",
    color: "rgb(228 228 231)",
  },
  event: {
    background: "linear-gradient(90deg, rgba(255, 255, 255, 0.18), rgba(113, 113, 122, 0.16) 46%, rgba(0, 0, 0, 0.12))",
    border: "rgb(255 255 255 / 0.36)",
    color: "rgb(255 255 255)",
  },
};
const tradeIconPaths = {
  category: "/icons/trade/category.png",
  demand: "/icons/trade/demand.png",
  gem: "/icons/trade/gem.png",
  key: "/icons/trade/key.png",
  mask: "/icons/trade/mask.png",
  notes: "/icons/trade/notes.png",
  prestige: "/icons/trade/prestige.png",
  scroll: "/icons/trade/scroll.png",
  source: "/icons/trade/source.png",
  trend: "/icons/trade/trend-rising.png",
} as const;

const tradeIconClassNames: Record<keyof typeof tradeIconPaths, string> = {
  category: "trade-icon-category",
  demand: "trade-icon-demand",
  gem: "trade-icon-gem",
  key: "trade-icon-key",
  mask: "trade-icon-mask",
  notes: "trade-icon-notes",
  prestige: "trade-icon-prestige",
  scroll: "trade-icon-scroll",
  source: "trade-icon-source",
  trend: "trade-icon-trend-rising",
};

const emptyItem: ValueItem = {
  id: "",
  name: "",
  category: "cosmetics",
  rarity: "common",
  value: 0,
  valueKeys: 0,
  valueMasks: 0,
  valueScrolls: 0,
  valueHistory: [],
  demand: 10,
  trend: "stable",
  taxGems: 0,
  prestige: 0,
  iconUrl: "",
  source: "",
  owners: "Common",
  note: "Editable item note.",
};

function formatHistory(history?: ValueHistoryPoint[]) {
  return JSON.stringify(history ?? [], null, 2);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['[\]()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseHistory(value: string) {
  if (!value.trim()) return [];

  const parsed = JSON.parse(value);

  if (!Array.isArray(parsed)) {
    throw new Error("Value history must be a JSON array.");
  }

  return parsed.map((point) => ({
    date: String(point.date ?? ""),
    value: Number(point.value ?? 0),
  }));
}

function serializeEditableItem(item: ValueItem, historyDraft: string) {
  return JSON.stringify({
    category: item.category,
    demand: item.demand,
    iconUrl: item.iconUrl ?? "",
    id: item.id,
    name: item.name,
    note: item.note ?? "",
    owners: item.owners ?? "",
    prestige: item.prestige,
    rarity: item.rarity,
    source: item.source ?? "",
    taxGems: item.taxGems,
    trend: item.trend,
    value: item.value,
    valueHistory: historyDraft.trim(),
    valueKeys: item.valueKeys ?? item.value,
    valueMasks: item.valueMasks ?? 0,
    valueScrolls: item.valueScrolls ?? 0,
  });
}

function getHighImpactSaveWarnings(previous: ValueItem | undefined, next: ValueItem) {
  if (!previous) return [];

  const warnings: string[] = [];
  const previousValue = previous.valueKeys ?? previous.value;
  const nextValue = next.valueKeys ?? next.value;

  if (previousValue > 0) {
    const changeRatio = Math.abs(nextValue - previousValue) / previousValue;
    if (changeRatio >= 0.5) {
      warnings.push(`Value changes by ${Math.round(changeRatio * 100)}%.`);
    }
  }

  if (Math.abs(next.demand - previous.demand) >= 30) {
    warnings.push(`Demand changes by ${Math.abs(next.demand - previous.demand)} points.`);
  }

  if (next.rarity !== previous.rarity) {
    warnings.push(`Rarity changes from ${previous.rarity} to ${next.rarity}.`);
  }

  return warnings;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

function formatLogDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getLogActionLabel(action: AdminLog["action"]) {
  const labels: Record<AdminLog["action"], string> = {
    item_created: "Created",
    backup_exported: "Backup",
    backup_restored: "Restore",
    item_deleted: "Deleted",
    item_updated: "Updated",
    items_seeded: "Seeded",
    media_uploaded: "Uploaded",
    settings_updated: "Settings",
  };

  return labels[action];
}

function subscribeFilterBreakpoint(onStoreChange: () => void) {
  const query = window.matchMedia(filterBreakpoint);
  query.addEventListener("change", onStoreChange);

  return () => query.removeEventListener("change", onStoreChange);
}

function getFilterBreakpointSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(filterBreakpoint).matches;
}

function getFilterBreakpointServerSnapshot() {
  return false;
}

function getAdminItemSource(item: ValueItem) {
  return item.source?.trim() || "Unknown";
}

function matchesAdminDemandFilter(item: ValueItem, filter: AdminDemandFilter) {
  if (filter === "all") return true;
  if (filter === "high") return item.demand >= 70;
  if (filter === "medium") return item.demand >= 35 && item.demand < 70;
  return item.demand < 35;
}

function matchesAdminValueFilter(item: ValueItem, filter: AdminValueFilter) {
  const value = item.valueKeys ?? item.value;
  if (filter === "all") return true;
  if (filter === "top") return value >= 10000;
  if (filter === "mid") return value >= 1000 && value < 10000;
  return value < 1000;
}

function sortAdminItems(items: ValueItem[], sortOption: AdminSortOption) {
  return [...items].sort((a, b) => {
    const aValue = a.valueKeys ?? a.value;
    const bValue = b.valueKeys ?? b.value;

    switch (sortOption) {
      case "value-asc":
        return aValue - bValue;
      case "demand-desc":
        return b.demand - a.demand || bValue - aValue;
      case "demand-asc":
        return a.demand - b.demand || bValue - aValue;
      case "tax-desc":
        return b.taxGems - a.taxGems || bValue - aValue;
      case "tax-asc":
        return a.taxGems - b.taxGems || bValue - aValue;
      case "prestige-desc":
        return b.prestige - a.prestige || bValue - aValue;
      case "prestige-asc":
        return a.prestige - b.prestige || bValue - aValue;
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "value-desc":
      default:
        return bValue - aValue;
    }
  });
}

export function AdminPanel({ adminRole, initialCurrencySettings, initialItems }: { adminRole: AdminRole | null; initialCurrencySettings: ValueCurrencySettings; initialItems: ValueItem[] }) {
  const [activeView, setActiveView] = useState<AdminView>("items");
  const [items, setItems] = useState(initialItems);
  const [currencySettings, setCurrencySettings] = useState(sanitizeCurrencySettings(initialCurrencySettings));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ItemCategory>("all");
  const [sortOption, setSortOption] = useState<AdminSortOption>("value-desc");
  const [trendFilter, setTrendFilter] = useState<AdminTrendFilter>("all");
  const [demandFilter, setDemandFilter] = useState<AdminDemandFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<AdminSourceFilter>("all");
  const [valueFilter, setValueFilter] = useState<AdminValueFilter>("all");
  const isCompactFilterLayout = useSyncExternalStore(subscribeFilterBreakpoint, getFilterBreakpointSnapshot, getFilterBreakpointServerSnapshot);
  const [manualFiltersExpanded, setManualFiltersExpanded] = useState<boolean | null>(null);
  const filtersExpanded = manualFiltersExpanded ?? !isCompactFilterLayout;
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id ?? "");
  const [draft, setDraft] = useState<ValueItem>(initialItems[0] ?? emptyItem);
  const [historyDraft, setHistoryDraft] = useState(formatHistory(initialItems[0]?.valueHistory));
  const [committedDraftKey, setCommittedDraftKey] = useState(() => serializeEditableItem(initialItems[0] ?? emptyItem, formatHistory(initialItems[0]?.valueHistory)));
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<AdminStatusTone>("success");
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [deleteMissingOnRestore, setDeleteMissingOnRestore] = useState(false);
  const [stagedItems, setStagedItems] = useState<ValueItem[]>([]);
  const permissions = useMemo(
    () => ({
      canDelete: adminRole === "owner",
      canEdit: adminRole === "owner" || adminRole === "editor",
      canExportBackup: adminRole === "owner" || adminRole === "editor" || adminRole === "auditor",
      canRestoreBackup: adminRole === "owner",
      canSeed: adminRole === "owner",
      canUploadMedia: adminRole === "owner" || adminRole === "editor" || adminRole === "media",
    }),
    [adminRole],
  );

  const filtered = useMemo(() => {
    const matches = items.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesQuery = matchesSearch(itemSearchText(item), query);
      const matchesTrend = trendFilter === "all" || item.trend === trendFilter;
      const matchesSource = sourceFilter === "all" || getAdminItemSource(item) === sourceFilter;

      return matchesCategory && matchesQuery && matchesTrend && matchesSource && matchesAdminDemandFilter(item, demandFilter) && matchesAdminValueFilter(item, valueFilter);
    });

    return sortAdminItems(matches, sortOption);
  }, [category, demandFilter, items, query, sortOption, sourceFilter, trendFilter, valueFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / adminPageSize));
  const currentPage = Math.min(page, totalPages);
  const firstItemIndex = (currentPage - 1) * adminPageSize;
  const pagedItems = filtered.slice(firstItemIndex, firstItemIndex + adminPageSize);
  const visibleCategories = categories.filter((item) => item.id === "all" || items.some((value) => value.category === item.id));
  const sourceOptions = useMemo(() => ["all", ...Array.from(new Set(items.map(getAdminItemSource))).sort()] as AdminSourceFilter[], [items]);
  const activeFilterCount = [category !== "all", sortOption !== "value-desc", trendFilter !== "all", demandFilter !== "all", sourceFilter !== "all", valueFilter !== "all"].filter(Boolean).length;
  const draftKey = useMemo(() => serializeEditableItem(draft, historyDraft), [draft, historyDraft]);
  const hasUnsavedItemChanges = activeView === "items" && draftKey !== committedDraftKey;

  const itemStats = useMemo(() => {
    const moving = items.filter((item) => item.trend !== "stable").length;
    const rising = items.filter((item) => item.trend === "rising").length;
    const falling = items.filter((item) => item.trend === "falling").length;
    const rarityCounts = rarityOptions.map((rarity) => ({
      label: rarity,
      value: items.filter((item) => item.rarity === rarity).length,
    }));

    return { falling, moving, rarityCounts, rising };
  }, [items]);

  const ratePreview = useMemo(() => {
    const sampleKeys = Math.max(1, (draft.valueKeys ?? draft.value) || 340000);
    return getCurrencyValues(sampleKeys, currencySettings);
  }, [currencySettings, draft.value, draft.valueKeys]);

  const confirmDiscardUnsavedChanges = useCallback(() => {
    if (!hasUnsavedItemChanges) return true;
    return window.confirm("Discard unsaved item changes?");
  }, [hasUnsavedItemChanges]);

  function commitDraftSnapshot(item: ValueItem, history = formatHistory(item.valueHistory)) {
    setCommittedDraftKey(serializeEditableItem(item, history));
  }

  function selectItem(item: ValueItem, options: { force?: boolean } = {}) {
    if (!options.force && !confirmDiscardUnsavedChanges()) return;
    setSelectedId(item.id);
    setDraft(item);
    const history = formatHistory(item.valueHistory);
    setHistoryDraft(history);
    commitDraftSnapshot(item, history);
    setActiveView("items");
  }

  function resetPage() {
    setPage(1);
  }

  function clearFilters() {
    setCategory("all");
    setSortOption("value-desc");
    setTrendFilter("all");
    setDemandFilter("all");
    setSourceFilter("all");
    setValueFilter("all");
    setPage(1);
  }

  const refreshLogs = useCallback(async () => {
    setLogsLoading(true);

    try {
      const response = await fetch("/api/admin/logs", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to load admin logs.");

      setLogs(data.logs);
      setLogsLoaded(true);
      setLogPage(1);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Log refresh failed.");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === "logs" && !logsLoaded && !logsLoading) {
      void refreshLogs();
    }
  }, [activeView, logsLoaded, logsLoading, refreshLogs]);

  useEffect(() => {
    const adminViews: AdminView[] = ["items", "rates", "stats", "logs", "controls"];
    const updateFromUrl = () => {
      const tab = new URLSearchParams(window.location.search).get("tab") as AdminView | null;
      const nextView = tab && adminViews.includes(tab) ? tab : "items";
      setActiveView((current) => (current === "items" && nextView !== "items" && !confirmDiscardUnsavedChanges() ? current : nextView));
    };
    const updateFromEvent = (event: Event) => {
      const tab = (event as CustomEvent<string>).detail as AdminView;
      if (adminViews.includes(tab)) {
        setActiveView((current) => (current === "items" && tab !== "items" && !confirmDiscardUnsavedChanges() ? current : tab));
      }
    };

    updateFromUrl();
    window.addEventListener("popstate", updateFromUrl);
    window.addEventListener("admin-tab-change", updateFromEvent);

    return () => {
      window.removeEventListener("popstate", updateFromUrl);
      window.removeEventListener("admin-tab-change", updateFromEvent);
    };
  }, [confirmDiscardUnsavedChanges, hasUnsavedItemChanges]);

  useEffect(() => {
    if (!hasUnsavedItemChanges) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedItemChanges]);

  function updateDraft<K extends keyof ValueItem>(key: K, value: ValueItem[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateDraftValueKeys(value: number) {
    setDraft((current) => ({
      ...current,
      value,
      ...getCurrencyValues(value, currencySettings),
    }));
  }

  function updateDraftValueMasks(value: number) {
    updateDraftValueKeys(value * currencySettings.maskToKeys);
  }

  function updateDraftValueScrolls(value: number) {
    updateDraftValueKeys(value * currencySettings.scrollToKeys);
  }

  function updateCurrencySetting<K extends keyof ValueCurrencySettings>(key: K, value: ValueCurrencySettings[K]) {
    setCurrencySettings((current) => sanitizeCurrencySettings({ ...current, [key]: value }));
  }

  function newItem() {
    if (!confirmDiscardUnsavedChanges()) return;
    setActiveView("items");
    setSelectedId("");
    setDraft(emptyItem);
    const history = formatHistory([]);
    setHistoryDraft(history);
    commitDraftSnapshot(emptyItem, history);
    setStatusTone("success");
    setStatus("New item draft created.");
  }

  async function refreshItems() {
    const response = await fetch("/api/admin/items", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error ?? "Unable to refresh database items.");

    setItems(data.items);
    return data.items as ValueItem[];
  }

  function buildItemPayload() {
    const value = draft.valueKeys ?? draft.value;

    return {
      ...draft,
      id: draft.id || slugify(draft.name),
      value,
      ...getCurrencyValues(value, currencySettings),
      valueHistory: parseHistory(historyDraft),
    };
  }

  function stageItem() {
    if (!permissions.canEdit) {
      setStatusTone("error");
      setStatus("Your admin role cannot stage item records.");
      return;
    }

    try {
      const payload = buildItemPayload();
      setStagedItems((current) => [payload, ...current.filter((item) => item.id !== payload.id)]);
      setStatusTone("success");
      setStatus(`Staged ${payload.name} for review.`);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Unable to stage item.");
    }
  }

  async function publishStagedItems() {
    if (!permissions.canEdit) {
      setStatusTone("error");
      setStatus("Your admin role cannot publish staged records.");
      return;
    }

    setSaving(true);
    setStatusTone("success");
    setStatus(`Publishing ${stagedItems.length} staged item${stagedItems.length === 1 ? "" : "s"}...`);

    try {
      for (const item of [...stagedItems].reverse()) {
        const response = await fetch("/api/admin/items", {
          body: JSON.stringify(item),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? `Unable to publish ${item.name}.`);
      }

      const freshItems = await refreshItems();
      selectItem(freshItems.find((item) => item.id === selectedId) ?? freshItems[0] ?? emptyItem, { force: true });
      setStagedItems([]);
      markMarketDataChanged();
      if (logsLoaded) void refreshLogs();
      setStatusTone("success");
      setStatus("Published staged item changes.");
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Unable to publish staged items.");
    } finally {
      setSaving(false);
    }
  }

  async function saveItem() {
    if (!permissions.canEdit) {
      setStatusTone("error");
      setStatus("Your admin role cannot save item records.");
      return;
    }

    const nextValue = draft.valueKeys ?? draft.value;
    const previous = draft.id ? items.find((item) => item.id === draft.id) : undefined;
    const warnings = getHighImpactSaveWarnings(previous, { ...draft, value: nextValue, ...getCurrencyValues(nextValue, currencySettings) });

    if (warnings.length && !window.confirm(`Review before publishing:\n\n${warnings.join("\n")}\n\nSave this market update?`)) {
      setStatusTone("warning");
      setStatus("Save cancelled for review.");
      return;
    }

    setSaving(true);
    setStatusTone("success");
    setStatus("Saving item...");

    try {
      const payload = buildItemPayload();
      const response = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to save item.");

      const freshItems = await refreshItems();
      const saved = freshItems.find((item) => item.id === data.item.id) ?? data.item;
      selectItem(saved, { force: true });
      markMarketDataChanged();
      if (logsLoaded) void refreshLogs();
      setStatusTone("success");
      setStatus(`Saved ${saved.name}.`);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings() {
    if (!permissions.canEdit) {
      setStatusTone("error");
      setStatus("Your admin role cannot update conversion rates.");
      return;
    }

    setSaving(true);
    setStatusTone("success");
    setStatus("Saving conversion rates...");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currencySettings),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to save conversion rates.");

      const safeSettings = sanitizeCurrencySettings(data.settings);
      setCurrencySettings(safeSettings);
      const freshItems = await refreshItems();
      const current = freshItems.find((item) => item.id === selectedId) ?? freshItems[0] ?? emptyItem;
      selectItem(current, { force: true });
      markMarketDataChanged();
      setActiveView("rates");
      if (logsLoaded) void refreshLogs();
      setStatusTone("success");
      setStatus("Saved conversion rates. Item displays now use the updated rates.");
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Rates save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    if (!permissions.canDelete) {
      setStatusTone("error");
      setStatus("Only owner admins can delete item records.");
      return;
    }

    if (!draft.id) {
      setStatusTone("danger");
      setStatus("Nothing to delete yet.");
      return;
    }

    setSaving(true);
    setStatusTone("danger");
    setStatus(`Deleting ${draft.name}...`);

    try {
      const response = await fetch(`/api/admin/items/${draft.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to delete item.");

      const freshItems = await refreshItems();
      const next = freshItems[0] ?? emptyItem;
      selectItem(next, { force: true });
      markMarketDataChanged();
      if (logsLoaded) void refreshLogs();
      setStatusTone("danger");
      setStatus(`Deleted ${draft.name}.`);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  async function seedDatabase() {
    if (!permissions.canSeed) {
      setStatusTone("error");
      setStatus("Only owner admins can seed Supabase.");
      return;
    }

    setSaving(true);
    setStatusTone("success");
    setStatus("Seeding Supabase from local item data...");

    try {
      const response = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to seed Supabase.");

      const freshItems = await refreshItems();
      selectItem(freshItems[0] ?? emptyItem, { force: true });
      markMarketDataChanged();
      if (logsLoaded) void refreshLogs();
      setStatusTone("success");
      setStatus(`Seeded ${data.count} items into Supabase.`);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Seed failed.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadItemIcon(file: File) {
    if (!permissions.canUploadMedia) {
      setStatusTone("error");
      setStatus("Your admin role cannot upload media.");
      return;
    }

    setUploadingIcon(true);
    setStatusTone("success");
    setStatus(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("itemId", draft.id || slugify(draft.name) || "item");

      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to upload icon.");

      updateDraft("iconUrl", data.url);
      if (logsLoaded) void refreshLogs();
      setStatusTone("success");
      setStatus("Uploaded icon. Save the item to keep this icon URL on the record.");
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Icon upload failed.");
    } finally {
      setUploadingIcon(false);
    }
  }

  async function exportBackup() {
    if (!permissions.canExportBackup) {
      setStatusTone("error");
      setStatus("Your admin role cannot export backups.");
      return;
    }

    setSaving(true);
    setStatusTone("success");
    setStatus("Preparing market backup...");

    try {
      const response = await fetch("/api/admin/backups", {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Unable to export backup.");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `aotr-market-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      if (logsLoaded) void refreshLogs();
      setStatusTone("success");
      setStatus("Exported market backup.");
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Backup export failed.");
    } finally {
      setSaving(false);
    }
  }

  async function restoreBackup(file: File) {
    if (!permissions.canRestoreBackup) {
      setStatusTone("error");
      setStatus("Only owner admins can restore backups.");
      return;
    }

    setSaving(true);
    setStatusTone("success");
    setStatus(`Restoring ${file.name}...`);

    try {
      const backup = JSON.parse(await file.text());
      const response = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup, deleteMissing: deleteMissingOnRestore }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to restore backup.");

      const freshItems = await refreshItems();
      selectItem(freshItems[0] ?? emptyItem, { force: true });
      markMarketDataChanged();
      if (logsLoaded) void refreshLogs();
      setStatusTone("success");
      setStatus(`Restored ${data.itemCount} items from backup.`);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Backup restore failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-shell px-4 pb-7 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="admin-console">
            <div className="admin-console-head">
              <div>
              <span>Admin system / {adminRole ?? "restricted"}</span>
              <h2 className="font-display">Market Control</h2>
            </div>
          </div>

          {status ? (
            <div className={cn("admin-status", `admin-status-${statusTone}`)} aria-live="polite">
              {status}
            </div>
          ) : null}

          {activeView === "items" ? (
            <div className="admin-grid">
              <aside className="admin-sidebar">
                <div className="admin-panel-head">
                  <div>
                    <span>Item records</span>
                    <strong>{filtered.length} records</strong>
                  </div>
                  <button type="button" className="admin-icon-button" onClick={newItem} aria-label="Create new item">
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </div>

                <label className="admin-search">
                  <Search size={15} strokeWidth={2.4} />
                  <span className="sr-only">Search admin items</span>
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search names, IDs, sources"
                  />
                </label>

                <div className="advanced-filter-panel admin-record-filter-panel" aria-label="Advanced admin item filters">
                  <div className="advanced-filter-head">
                    <div>
                      <button
                        type="button"
                        className="advanced-filter-toggle"
                        aria-expanded={filtersExpanded}
                        aria-controls="admin-record-filter-controls"
                        onClick={() => setManualFiltersExpanded(!filtersExpanded)}
                      >
                        <span>Advanced filters</span>
                        <ChevronDown size={15} strokeWidth={2.5} />
                      </button>
                      <strong>{filtered.length} items</strong>
                    </div>
                    <button type="button" className="advanced-filter-clear" onClick={clearFilters} disabled={!activeFilterCount} aria-label="Clear admin item filters">
                      Clear {activeFilterCount ? `(${activeFilterCount})` : ""}
                    </button>
                  </div>

                  <div id="admin-record-filter-controls" className={cn("advanced-filter-grid admin-record-filter-grid", filtersExpanded && "advanced-filter-grid-open")}>
                    <AdminFilterSelect
                      label="Sort"
                      value={sortOption}
                      onChange={(value) => {
                        setSortOption(value as AdminSortOption);
                        resetPage();
                      }}
                      options={adminSortOptions.map((option) => ({ value: option.id, label: option.label }))}
                    />
                    <AdminFilterSelect
                      label="Category"
                      value={category}
                      onChange={(value) => {
                        setCategory(value as "all" | ItemCategory);
                        resetPage();
                      }}
                      options={visibleCategories.map((item) => ({
                        value: item.id,
                        label: `${item.label} (${item.id === "all" ? items.length : items.filter((value) => value.category === item.id).length})`,
                      }))}
                    />
                    <AdminFilterSelect
                      label="Demand"
                      value={demandFilter}
                      onChange={(value) => {
                        setDemandFilter(value as AdminDemandFilter);
                        resetPage();
                      }}
                      options={adminDemandOptions.map((option) => ({ value: option.id, label: option.label }))}
                    />
                    <AdminFilterSelect
                      label="Trend"
                      value={trendFilter}
                      onChange={(value) => {
                        setTrendFilter(value as AdminTrendFilter);
                        resetPage();
                      }}
                      options={adminTrendOptions.map((option) => ({ value: option.id, label: option.label }))}
                    />
                    <AdminFilterSelect
                      label="Value"
                      value={valueFilter}
                      onChange={(value) => {
                        setValueFilter(value as AdminValueFilter);
                        resetPage();
                      }}
                      options={adminValueRangeOptions.map((option) => ({ value: option.id, label: option.label }))}
                    />
                    <AdminFilterSelect
                      label="Source"
                      value={sourceFilter}
                      onChange={(value) => {
                        setSourceFilter(value);
                        resetPage();
                      }}
                      options={sourceOptions.map((source) => ({ value: source, label: source === "all" ? "Any source" : source }))}
                    />
                  </div>
                </div>

                <div className="admin-item-list">
                  {pagedItems.map((item) => (
                    <button key={item.id} type="button" className={cn("admin-item-button", `admin-item-rarity-${item.rarity}`, selectedId === item.id && "admin-item-button-active")} onClick={() => selectItem(item)}>
                      <span className={cn("item-crest admin-item-thumb", rarityStyles[item.rarity].crest)}>
                        {item.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.iconUrl} alt="" decoding="async" loading="lazy" referrerPolicy="no-referrer" />
                        ) : (
                          <PackageSearch size={15} strokeWidth={2.2} />
                        )}
                      </span>
                      <span className="admin-item-copy">
                        <span>{item.name}</span>
                      </span>
                    </button>
                  ))}
                  {!filtered.length ? <p className="admin-empty">No matching items.</p> : null}
                </div>

                {filtered.length > adminPageSize ? (
                  <AdminPagination
                    currentPage={currentPage}
                    firstItemIndex={firstItemIndex}
                    itemCount={filtered.length}
                    onPageChange={setPage}
                    pageSize={adminPageSize}
                    totalPages={totalPages}
                  />
                ) : null}
              </aside>

              <ItemEditor
                currencySettings={currencySettings}
                deleteItem={deleteItem}
                draft={draft}
                hasUnsavedChanges={hasUnsavedItemChanges}
                historyDraft={historyDraft}
                permissions={permissions}
                newItem={newItem}
                saveItem={saveItem}
                saving={saving}
                stageItem={stageItem}
                setHistoryDraft={setHistoryDraft}
                uploadItemIcon={uploadItemIcon}
                uploadingIcon={uploadingIcon}
                updateDraft={updateDraft}
                updateDraftValueKeys={updateDraftValueKeys}
                updateDraftValueMasks={updateDraftValueMasks}
                updateDraftValueScrolls={updateDraftValueScrolls}
              />
            </div>
          ) : activeView === "rates" ? (
            <RatesEditor
              currencySettings={currencySettings}
              ratePreview={ratePreview}
              saveSettings={saveSettings}
              saving={saving}
              canEdit={permissions.canEdit}
              sampleKeys={Math.max(1, (draft.valueKeys ?? draft.value) || 340000)}
              updateCurrencySetting={updateCurrencySetting}
            />
          ) : activeView === "stats" ? (
            <StatsPanel itemStats={itemStats} filteredCount={filtered.length} itemCount={items.length} />
          ) : activeView === "logs" ? (
            <LogsPanel currentPage={logPage} logs={logs} loading={logsLoading} onPageChange={setLogPage} refreshLogs={refreshLogs} />
          ) : (
            <ControlsPanel
              deleteMissingOnRestore={deleteMissingOnRestore}
              exportBackup={exportBackup}
              items={items}
              permissions={permissions}
              publishStagedItems={publishStagedItems}
              restoreBackup={restoreBackup}
              saving={saving}
              seedDatabase={seedDatabase}
              setDeleteMissingOnRestore={setDeleteMissingOnRestore}
              stagedItems={stagedItems}
              clearStagedItems={() => setStagedItems([])}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function ItemEditor({
  currencySettings,
  deleteItem,
  draft,
  hasUnsavedChanges,
  historyDraft,
  newItem,
  permissions,
  saveItem,
  saving,
  stageItem,
  setHistoryDraft,
  uploadItemIcon,
  uploadingIcon,
  updateDraft,
  updateDraftValueKeys,
  updateDraftValueMasks,
  updateDraftValueScrolls,
}: {
  currencySettings: ValueCurrencySettings;
  deleteItem: () => void;
  draft: ValueItem;
  hasUnsavedChanges: boolean;
  historyDraft: string;
  newItem: () => void;
  permissions: {
    canDelete: boolean;
    canEdit: boolean;
    canUploadMedia: boolean;
  };
  saveItem: () => void;
  saving: boolean;
  stageItem: () => void;
  setHistoryDraft: (value: string) => void;
  uploadItemIcon: (file: File) => void;
  uploadingIcon: boolean;
  updateDraft: <K extends keyof ValueItem>(key: K, value: ValueItem[K]) => void;
  updateDraftValueKeys: (value: number) => void;
  updateDraftValueMasks: (value: number) => void;
  updateDraftValueScrolls: (value: number) => void;
}) {
  return (
    <div className="admin-editor">
      <div className="admin-editor-head">
        <div>
          <span>Item editor</span>
          <h2 className="font-display">{draft.name || "New item"}</h2>
        </div>
        <div className="admin-editor-actions">
          <button type="button" className="admin-secondary-action" onClick={newItem} disabled={saving}>
            <Plus size={15} strokeWidth={2.4} />
            New
          </button>
          <button type="button" className="admin-delete-action" onClick={deleteItem} disabled={saving || !draft.id || !permissions.canDelete} title={permissions.canDelete ? "Delete item" : "Owner role required"}>
            <Trash2 size={15} strokeWidth={2.4} />
            Delete
          </button>
          <button type="button" className="admin-save-action" onClick={saveItem} disabled={saving || !permissions.canEdit} title={permissions.canEdit ? "Save item" : "Editor role required"}>
            <Save size={15} strokeWidth={2.4} />
            Save Item
          </button>
          <button type="button" className="admin-secondary-action" onClick={stageItem} disabled={saving || !permissions.canEdit}>
            <ListChecks size={15} strokeWidth={2.4} />
            Stage
          </button>
        </div>
      </div>

      {hasUnsavedChanges ? <div className="admin-status admin-status-warning">Unsaved item changes. Save before switching records or leaving admin.</div> : null}

      <div className="admin-editor-layout">
        <div className="admin-form-stack">
          <AdminCard icon={<Tag size={17} strokeWidth={2.4} />} eyebrow="Core record" title="Identity">
            <div className="admin-form-grid">
              <AdminInput label="ID" value={draft.id} onChange={(value) => updateDraft("id", slugify(value))} placeholder="auto-from-name-if-empty" />
              <AdminInput
                label="Name"
                value={draft.name}
                onChange={(value) => {
                  updateDraft("name", value);
                  if (!draft.id) updateDraft("id", slugify(value));
                }}
              />
              <AdminSelect label="Category" value={draft.category} onChange={(value) => updateDraft("category", value as ItemCategory)} options={categories.filter((item) => item.id !== "all").map((item) => item.id)} />
              <AdminSelect label="Rarity" value={draft.rarity} onChange={(value) => updateDraft("rarity", value as ItemRarity)} options={rarityOptions} />
              <AdminInput label="Owners / Label" value={draft.owners} onChange={(value) => updateDraft("owners", value)} />
              <AdminInput label="Source" value={draft.source ?? ""} onChange={(value) => updateDraft("source", value)} placeholder="Cosmetic crate, event reward..." />
            </div>
          </AdminCard>

          <AdminCard icon={<BarChart3 size={17} strokeWidth={2.4} />} eyebrow="Market data" title="Value and movement">
            <div className="admin-form-grid">
              <AdminInput label="Value Keys" type="number" value={String(draft.valueKeys ?? draft.value)} onChange={(value) => updateDraftValueKeys(Number(value))} />
              <AdminInput label="Value Vizards" type="number" value={String(draft.valueMasks ?? getCurrencyValues(draft.value, currencySettings).valueMasks)} onChange={(value) => updateDraftValueMasks(Number(value))} />
              <AdminInput label="Value Scrolls" type="number" value={String(draft.valueScrolls ?? getCurrencyValues(draft.value, currencySettings).valueScrolls)} onChange={(value) => updateDraftValueScrolls(Number(value))} />
              <AdminInput label="Demand" type="number" value={String(draft.demand)} onChange={(value) => updateDraft("demand", Number(value))} />
              <AdminSelect label="Trend" value={draft.trend} onChange={(value) => updateDraft("trend", value as ItemTrend)} options={itemTrendOptions} />
              <AdminInput label="Gem Tax" type="number" value={String(draft.taxGems)} onChange={(value) => updateDraft("taxGems", Number(value))} />
              <AdminInput label="Prestige" type="number" value={String(draft.prestige)} onChange={(value) => updateDraft("prestige", Number(value))} />
            </div>
          </AdminCard>

          <AdminCard icon={<ImageIcon size={17} strokeWidth={2.4} />} eyebrow="Presentation" title="Media and notes">
            <div className="admin-media-grid">
              <div className="admin-media-fields">
                <AdminInput label="Icon URL" value={draft.iconUrl ?? ""} onChange={(value) => updateDraft("iconUrl", value)} placeholder="https://pub-...r2.dev/items/example.png" />
                <AdminTextarea label="Note" value={draft.note} onChange={(value) => updateDraft("note", value)} />
              </div>
              <AdminIconUploader canUpload={permissions.canUploadMedia} draft={draft} uploadItemIcon={uploadItemIcon} uploadingIcon={uploadingIcon} />
            </div>
          </AdminCard>

          <AdminCard icon={<History size={17} strokeWidth={2.4} />} eyebrow="Advanced" title="Value history">
            <p className="admin-card-copy">Saving a changed value appends a timestamped point. Edit JSON only for imports or corrections.</p>
            <AdminTextarea label="Value History JSON" value={historyDraft} onChange={setHistoryDraft} monospace />
          </AdminCard>
        </div>

      </div>
    </div>
  );
}

function AdminIconUploader({ canUpload, draft, uploadItemIcon, uploadingIcon }: { canUpload: boolean; draft: ValueItem; uploadItemIcon: (file: File) => void; uploadingIcon: boolean }) {
  return (
    <div className="admin-icon-uploader">
      <span className={cn("item-crest admin-icon-preview", rarityStyles[draft.rarity].crest)}>
        {draft.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.iconUrl} alt="" decoding="async" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <ImageIcon size={30} strokeWidth={2.1} />
        )}
      </span>
      <div className="admin-icon-upload-copy">
        <strong>{draft.name || "New item"}</strong>
      </div>
      <label className={cn("admin-secondary-action admin-icon-upload-action", (uploadingIcon || !canUpload) && "admin-icon-upload-action-disabled")}>
        <ImageIcon size={15} strokeWidth={2.4} />
        {uploadingIcon ? "Uploading..." : "Upload Icon"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={uploadingIcon || !canUpload}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadItemIcon(file);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function RatesEditor({
  canEdit,
  currencySettings,
  ratePreview,
  sampleKeys,
  saveSettings,
  saving,
  updateCurrencySetting,
}: {
  canEdit: boolean;
  currencySettings: ValueCurrencySettings;
  ratePreview: ReturnType<typeof getCurrencyValues>;
  sampleKeys: number;
  saveSettings: () => void;
  saving: boolean;
  updateCurrencySetting: <K extends keyof ValueCurrencySettings>(key: K, value: ValueCurrencySettings[K]) => void;
}) {
  return (
    <div className="admin-rates-page">
      <div className="admin-rates-hero">
        <div>
          <span>Conversion system</span>
          <h2 className="font-display">Currency Rates</h2>
          <p>These settings control how keys convert into vizards and scrolls across value lists, item pages, calculator totals, and modals.</p>
        </div>
        <div className="admin-editor-actions">
          <button type="button" className="admin-save-action" onClick={saveSettings} disabled={saving || !canEdit} title={canEdit ? "Save rates" : "Editor role required"}>
            <Save size={15} strokeWidth={2.4} />
            Save Rates
          </button>
        </div>
      </div>

      <div className="admin-rates-layout">
        <AdminCard icon={<SlidersHorizontal size={17} strokeWidth={2.4} />} eyebrow="Rates" title="Key conversion">
          <div className="admin-rates-grid">
            <AdminInput icon={<AdminTradeIcon type="mask" />} label="1 Vizard = Keys" type="number" value={String(currencySettings.maskToKeys)} onChange={(value) => updateCurrencySetting("maskToKeys", Number(value))} />
            <AdminInput icon={<AdminTradeIcon type="scroll" />} label="1 Scroll = Keys" type="number" value={String(currencySettings.scrollToKeys)} onChange={(value) => updateCurrencySetting("scrollToKeys", Number(value))} />
          </div>
        </AdminCard>

        <AdminCard icon={<Eye size={17} strokeWidth={2.4} />} eyebrow="Preview" title="Display output">
          <div className="admin-rate-preview">
            <AdminPreviewMetric icon={<AdminTradeIcon type="key" />} label="Sample" value={`${formatNumber(sampleKeys)} keys`} />
            <AdminPreviewMetric icon={<AdminTradeIcon type="mask" />} label="Vizards" value={formatNumber(ratePreview.valueMasks)} />
            <AdminPreviewMetric icon={<AdminTradeIcon type="scroll" />} label="Scrolls" value={formatNumber(ratePreview.valueScrolls)} />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

function StatsPanel({
  filteredCount,
  itemCount,
  itemStats,
}: {
  filteredCount: number;
  itemCount: number;
  itemStats: {
    falling: number;
    moving: number;
    rarityCounts: { label: ItemRarity; value: number }[];
    rising: number;
  };
}) {
  return (
    <div className="admin-stats-page">
      <div className="admin-kpi-grid" aria-label="Database overview">
        <AdminKpi icon={<PackageSearch size={17} strokeWidth={2.3} />} label="Items" value={itemCount.toString()} detail={`${filteredCount} in current search`} />
        <AdminKpi icon={<TrendingUp size={17} strokeWidth={2.3} />} label="Moving Trend" value={itemStats.moving.toString()} detail={`${itemStats.rising} rising / ${itemStats.falling} falling`} />
      </div>

      <div className="admin-stats-layout">
        <AdminCard icon={<BarChart3 size={17} strokeWidth={2.4} />} eyebrow="Distribution" title="Rarity counts">
          <div className="admin-stat-list">
            {itemStats.rarityCounts.map((item) => {
              const style = rarityStatStyles[item.label];

              return (
              <div
                key={item.label}
                className={cn("admin-stat-list-row", `admin-stat-rarity-${item.label}`)}
                style={{
                  background: style.background,
                  borderColor: style.border,
                  borderLeftColor: style.border,
                  boxShadow: `inset 0 0 0 1px rgb(255 255 255 / 0.03)`,
                }}
              >
                <span style={{ color: style.color }}>{item.label}</span>
                <strong style={{ color: style.color }}>{item.value}</strong>
              </div>
              );
            })}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

function LogsPanel({
  currentPage,
  loading,
  logs,
  onPageChange,
  refreshLogs,
}: {
  currentPage: number;
  loading: boolean;
  logs: AdminLog[];
  onPageChange: (page: number) => void;
  refreshLogs: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(logs.length / adminLogPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const firstLogIndex = (safePage - 1) * adminLogPageSize;
  const pagedLogs = logs.slice(firstLogIndex, firstLogIndex + adminLogPageSize);

  return (
    <div className="admin-logs-page">
      <div className="admin-rates-hero">
        <div>
          <span>Audit trail</span>
          <h2 className="font-display">Change Logs</h2>
          <p>Every admin save, delete, settings update, and database seed is recorded with the Discord admin that made the change.</p>
        </div>
        <div className="admin-editor-actions">
          <button type="button" className="admin-secondary-action" onClick={refreshLogs} disabled={loading}>
            <RefreshCw size={15} strokeWidth={2.4} />
            Refresh
          </button>
        </div>
      </div>

      <AdminCard icon={<ListChecks size={17} strokeWidth={2.4} />} eyebrow="Recent activity" title="Latest changes">
        <div className="admin-log-list">
          {loading && !logs.length ? <p className="admin-empty">Loading admin logs...</p> : null}
          {!loading && !logs.length ? <p className="admin-empty">No admin changes have been logged yet.</p> : null}
          {pagedLogs.map((log) => (
            <article key={log.id} className={cn("admin-log-row", `admin-log-${log.action}`)}>
              <div className="admin-log-actor">
                <span className="admin-log-avatar">
                  {log.actor.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={log.actor.avatar} alt="" decoding="async" loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    log.actor.username.slice(0, 1).toUpperCase()
                  )}
                </span>
                <div>
                  <strong>{log.actor.username}</strong>
                  <small>{formatLogDate(log.createdAt)}</small>
                </div>
              </div>
              <div className="admin-log-main">
                <span>{getLogActionLabel(log.action)}</span>
                <p>{log.summary}</p>
                {log.targetName || log.targetId ? <small>{[log.targetName, log.targetId].filter(Boolean).join(" / ")}</small> : null}
                {log.actor.ipHash || log.actor.userAgent ? <small>{[log.actor.ipHash ? `IP ${log.actor.ipHash}` : null, log.actor.userAgent].filter(Boolean).join(" / ")}</small> : null}
              </div>
              {log.changes.length ? <AdminLogChanges changes={log.changes} /> : null}
            </article>
          ))}
        </div>
        {logs.length > adminLogPageSize ? (
          <AdminPagination
            currentPage={safePage}
            firstItemIndex={firstLogIndex}
            itemCount={logs.length}
            onPageChange={onPageChange}
            pageSize={adminLogPageSize}
            totalPages={totalPages}
          />
        ) : null}
      </AdminCard>
    </div>
  );
}

function AdminLogChanges({ changes }: { changes: AdminLogChange[] }) {
  return (
    <details className="admin-log-details">
      <summary>{changes.length} field {changes.length === 1 ? "change" : "changes"}</summary>
      <div className="admin-log-change-list">
        {changes.map((change) => (
          <div key={`${change.field}-${change.label}`} className="admin-log-change">
            <strong>{change.label}</strong>
            <div className="admin-log-change-values">
              <AdminLogValue label="Before" value={change.before} />
              <AdminLogValue label="After" value={change.after} />
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function AdminLogValue({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="admin-log-value">
      <span>{label}</span>
      <pre>{value ?? "Empty"}</pre>
    </div>
  );
}

function ControlsPanel({
  clearStagedItems,
  deleteMissingOnRestore,
  exportBackup,
  items,
  permissions,
  publishStagedItems,
  restoreBackup,
  saving,
  seedDatabase,
  setDeleteMissingOnRestore,
  stagedItems,
}: {
  clearStagedItems: () => void;
  deleteMissingOnRestore: boolean;
  exportBackup: () => void;
  items: ValueItem[];
  permissions: {
    canEdit: boolean;
    canExportBackup: boolean;
    canRestoreBackup: boolean;
    canSeed: boolean;
  };
  publishStagedItems: () => void;
  restoreBackup: (file: File) => void;
  saving: boolean;
  seedDatabase: () => void;
  setDeleteMissingOnRestore: (value: boolean) => void;
  stagedItems: ValueItem[];
}) {
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<{ changed: number; created: number; deleted: number; swings: string[] } | null>(null);

  async function previewRestoreFile(file: File) {
    const backup = JSON.parse(await file.text()) as { items?: { data?: Partial<ValueItem>; id?: string }[] };
    const backupItems = Array.isArray(backup.items) ? backup.items : [];
    const liveById = new Map(items.map((item) => [item.id, item]));
    const backupIds = new Set(backupItems.map((row) => row.id).filter(Boolean));
    const created = backupItems.filter((row) => row.id && !liveById.has(row.id)).length;
    const changed = backupItems.filter((row) => {
      const live = row.id ? liveById.get(row.id) : null;
      return Boolean(live && JSON.stringify(live) !== JSON.stringify({ ...(row.data ?? {}), id: row.id }));
    }).length;
    const deleted = deleteMissingOnRestore ? items.filter((item) => !backupIds.has(item.id)).length : 0;
    const swings = backupItems
      .flatMap((row) => {
        const live = row.id ? liveById.get(row.id) : null;
        const nextValue = Number(row.data?.valueKeys ?? row.data?.value ?? 0);
        const liveValue = live ? live.valueKeys ?? live.value : 0;
        if (!live || !liveValue || Math.abs(nextValue - liveValue) / liveValue < 0.5) return [];
        return [`${live.name}: ${formatNumber(liveValue)} -> ${formatNumber(nextValue)}`];
      })
      .slice(0, 6);

    setRestoreFile(file);
    setRestorePreview({ changed, created, deleted, swings });
  }

  return (
    <div className="admin-controls-page">
      <AdminCard icon={<ListChecks size={17} strokeWidth={2.4} />} eyebrow="Review" title="Staged changes">
        <p className="admin-card-copy">Stage item edits from the editor, review the queue here, then publish deliberately.</p>
        <div className="admin-import-preview">
          <strong>{stagedItems.length} staged item{stagedItems.length === 1 ? "" : "s"}</strong>
          <small>{stagedItems.slice(0, 5).map((item) => item.name).join(", ") || "No staged changes yet."}</small>
        </div>
        <div className="admin-controls-actions">
          <button type="button" className="admin-save-action" onClick={publishStagedItems} disabled={!stagedItems.length || saving || !permissions.canEdit}>
            <Save size={15} strokeWidth={2.4} />
            Publish Staged
          </button>
          <button type="button" className="admin-secondary-action" onClick={clearStagedItems} disabled={!stagedItems.length || saving}>
            Clear Queue
          </button>
        </div>
      </AdminCard>
      <AdminCard icon={<Database size={17} strokeWidth={2.4} />} eyebrow="Backup" title="Market export">
        <p className="admin-card-copy">Download the current Supabase market data before launch changes, imports, or incident response work.</p>
        <div className="admin-controls-actions">
          <button type="button" className="admin-secondary-action" onClick={exportBackup} disabled={saving || !permissions.canExportBackup}>
            <Database size={15} strokeWidth={2.4} />
            Export Backup
          </button>
        </div>
      </AdminCard>
      <AdminCard icon={<Database size={17} strokeWidth={2.4} />} eyebrow="Restore" title="Backup import">
        <p className="admin-card-copy">Restore an exported market backup. Owner role is required because this overwrites live market records.</p>
        <label className="admin-check">
          <input checked={deleteMissingOnRestore} disabled={!permissions.canRestoreBackup || saving} onChange={(event) => setDeleteMissingOnRestore(event.target.checked)} type="checkbox" />
          <span>Delete live items missing from backup</span>
        </label>
        <div className="admin-controls-actions">
          <label className={cn("admin-secondary-action admin-icon-upload-action", (!permissions.canRestoreBackup || saving) && "admin-icon-upload-action-disabled")}>
            <Database size={15} strokeWidth={2.4} />
            Restore Backup
            <input
              type="file"
              accept="application/json,.json"
              disabled={!permissions.canRestoreBackup || saving}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void previewRestoreFile(file);
                event.target.value = "";
              }}
            />
          </label>
          <button type="button" className="admin-save-action" disabled={!restoreFile || saving || !permissions.canRestoreBackup} onClick={() => restoreFile && restoreBackup(restoreFile)}>
            <Save size={15} strokeWidth={2.4} />
            Confirm Restore
          </button>
        </div>
        {restorePreview ? (
          <div className="admin-import-preview">
            <strong>{restorePreview.created} new / {restorePreview.changed} changed / {restorePreview.deleted} deleted</strong>
            {restorePreview.swings.length ? <small>Large swings: {restorePreview.swings.join("; ")}</small> : <small>No large value swings detected.</small>}
          </div>
        ) : null}
      </AdminCard>
      <AdminCard icon={<Database size={17} strokeWidth={2.4} />} eyebrow="Database" title="Supabase seed">
        <p className="admin-card-copy">Populate Supabase from the bundled local item list.</p>
        <div className="admin-controls-actions">
          <button type="button" className="admin-secondary-action admin-seed-action" onClick={seedDatabase} disabled={saving || !permissions.canSeed}>
            <Database size={15} strokeWidth={2.4} />
            Seed Supabase
          </button>
        </div>
      </AdminCard>
    </div>
  );
}

function AdminKpi({ detail, icon, label, value }: { detail: string; icon: ReactNode; label: string; value: string }) {
  return (
    <div className="admin-kpi">
      <span className="admin-kpi-icon">{icon}</span>
      <span className="admin-kpi-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function AdminCard({ children, eyebrow, icon, title }: { children: ReactNode; eyebrow: string; icon?: ReactNode; title: string }) {
  return (
    <section className="admin-card">
      <div className={cn("admin-card-head", !icon && "admin-card-head-plain")}>
        {icon ? <span className="admin-card-icon">{icon}</span> : null}
        <div>
          <span>{eyebrow}</span>
          <h3 className="font-display">{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function AdminPreviewMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="admin-preview-metric">
      <span className="admin-preview-metric-icon">{icon}</span>
      <span className="admin-preview-metric-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdminTradeIcon({ className, type }: { className?: string; type: keyof typeof tradeIconPaths }) {
  return (
    <span className={cn("gem-token admin-trade-icon", tradeIconClassNames[type], className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tradeIconPaths[type]} alt="" className="h-full w-full object-contain" decoding="async" draggable={false} loading="lazy" />
    </span>
  );
}

function AdminFilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <label className="advanced-filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AdminPagination({
  currentPage,
  firstItemIndex,
  itemCount,
  onPageChange,
  pageSize,
  totalPages,
}: {
  currentPage: number;
  firstItemIndex: number;
  itemCount: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalPages: number;
}) {
  const firstVisible = firstItemIndex + 1;
  const lastVisible = Math.min(firstItemIndex + pageSize, itemCount);

  return (
    <div className="ledger-pagination admin-record-pagination">
      <span>
        Showing {firstVisible}-{lastVisible} of {itemCount}
      </span>
      <div>
        <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          Previous
        </button>
        <strong>
          {currentPage} / {totalPages}
        </strong>
        <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}

function AdminInput({
  icon,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  icon?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <label className="admin-field">
      <span className="admin-field-label">
        {icon}
        {label}
      </span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function AdminSelect({ icon, label, onChange, options, value }: { icon?: ReactNode; label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="admin-field">
      <span className="admin-field-label">
        {icon}
        {label}
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function AdminTextarea({ icon, label, monospace = false, onChange, value }: { icon?: ReactNode; label: string; monospace?: boolean; onChange: (value: string) => void; value: string }) {
  return (
    <label className={cn("admin-field admin-field-wide", monospace && "admin-field-code")}>
      <span className="admin-field-label">
        {icon}
        {label}
      </span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={monospace ? 9 : 4} />
    </label>
  );
}
