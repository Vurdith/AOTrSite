"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { BarChart3, ChevronDown, Database, Eye, History, ImageIcon, PackageSearch, Plus, Save, Search, Settings2, SlidersHorizontal, Tag, Trash2, TrendingUp } from "lucide-react";

import { categories, type ItemCategory, type ItemRarity, type ItemTrend, type ValueItem, type ValueHistoryPoint } from "@/content/items";
import { cn } from "@/lib/cn";
import { getCurrencyValues, sanitizeCurrencySettings, type ValueCurrencySettings } from "@/lib/valueCurrency";

type AdminView = "items" | "rates" | "stats" | "controls";
type AdminStatusTone = "success" | "danger" | "error";
type AdminSortOption = "value-desc" | "value-asc" | "demand-desc" | "demand-asc" | "tax-desc" | "tax-asc" | "prestige-desc" | "prestige-asc" | "name-asc";
type AdminDemandFilter = "all" | "high" | "medium" | "low";
type AdminValueFilter = "all" | "top" | "mid" | "low";
type AdminSourceFilter = "all" | string;
type AdminTrendFilter = "all" | ItemTrend;

const rarityOptions: ItemRarity[] = ["mythic", "legendary", "epic", "rare", "uncommon", "common", "event"];
const itemTrendOptions: ItemTrend[] = ["rising", "stable", "falling"];
const adminPageSize = 8;
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
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

export function AdminPanel({ initialCurrencySettings, initialItems }: { initialCurrencySettings: ValueCurrencySettings; initialItems: ValueItem[] }) {
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
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<AdminStatusTone>("success");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matches = items.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesQuery = !needle || [item.name, item.id, item.category, item.rarity, item.source, item.owners].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
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

  function selectItem(item: ValueItem) {
    setSelectedId(item.id);
    setDraft(item);
    setHistoryDraft(formatHistory(item.valueHistory));
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
    setActiveView("items");
    setSelectedId("");
    setDraft(emptyItem);
    setHistoryDraft(formatHistory([]));
    setStatusTone("success");
    setStatus("New item draft created.");
  }

  async function refreshItems() {
    const response = await fetch("/api/admin/items", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error ?? "Unable to refresh Firestore items.");

    setItems(data.items);
    return data.items as ValueItem[];
  }

  async function saveItem() {
    setSaving(true);
    setStatusTone("success");
    setStatus("Saving item...");

    try {
      const payload = {
        ...draft,
        id: draft.id || slugify(draft.name),
        value: draft.valueKeys ?? draft.value,
        ...getCurrencyValues(draft.valueKeys ?? draft.value, currencySettings),
        valueHistory: parseHistory(historyDraft),
      };
      const response = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to save item.");

      const freshItems = await refreshItems();
      const saved = freshItems.find((item) => item.id === data.item.id) ?? data.item;
      selectItem(saved);
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
      selectItem(current);
      setActiveView("rates");
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
      selectItem(next);
      setStatusTone("danger");
      setStatus(`Deleted ${draft.name}.`);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  async function seedFirestore() {
    setSaving(true);
    setStatusTone("success");
    setStatus("Seeding Firestore from local item data...");

    try {
      const response = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to seed Firestore.");

      const freshItems = await refreshItems();
      selectItem(freshItems[0] ?? emptyItem);
      setStatusTone("success");
      setStatus(`Seeded ${data.count} items into Firestore.`);
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Seed failed.");
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
              <span>Admin system</span>
              <h2 className="font-display">Market Control</h2>
            </div>
            <div className="admin-console-controls">
              <div className="admin-view-tabs" aria-label="Admin sections">
                <button type="button" className={cn("admin-view-tab", activeView === "items" && "admin-view-tab-active")} onClick={() => setActiveView("items")}>
                  <PackageSearch size={16} strokeWidth={2.4} />
                  Items
                </button>
                <button type="button" className={cn("admin-view-tab", activeView === "rates" && "admin-view-tab-active")} onClick={() => setActiveView("rates")}>
                  <SlidersHorizontal size={16} strokeWidth={2.4} />
                  Conversion
                </button>
                <button type="button" className={cn("admin-view-tab", activeView === "stats" && "admin-view-tab-active")} onClick={() => setActiveView("stats")}>
                  <BarChart3 size={16} strokeWidth={2.4} />
                  Stats
                </button>
                <button type="button" className={cn("admin-view-tab", activeView === "controls" && "admin-view-tab-active")} onClick={() => setActiveView("controls")}>
                  <Settings2 size={16} strokeWidth={2.4} />
                  Controls
                </button>
              </div>
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
                      <span className="admin-item-thumb">
                        {item.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.iconUrl} alt="" />
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
                historyDraft={historyDraft}
                newItem={newItem}
                saveItem={saveItem}
                saving={saving}
                setHistoryDraft={setHistoryDraft}
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
              sampleKeys={Math.max(1, (draft.valueKeys ?? draft.value) || 340000)}
              updateCurrencySetting={updateCurrencySetting}
            />
          ) : activeView === "stats" ? (
            <StatsPanel itemStats={itemStats} filteredCount={filtered.length} itemCount={items.length} />
          ) : (
            <ControlsPanel saving={saving} seedFirestore={seedFirestore} />
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
  historyDraft,
  newItem,
  saveItem,
  saving,
  setHistoryDraft,
  updateDraft,
  updateDraftValueKeys,
  updateDraftValueMasks,
  updateDraftValueScrolls,
}: {
  currencySettings: ValueCurrencySettings;
  deleteItem: () => void;
  draft: ValueItem;
  historyDraft: string;
  newItem: () => void;
  saveItem: () => void;
  saving: boolean;
  setHistoryDraft: (value: string) => void;
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
          <button type="button" className="admin-delete-action" onClick={deleteItem} disabled={saving || !draft.id}>
            <Trash2 size={15} strokeWidth={2.4} />
            Delete
          </button>
          <button type="button" className="admin-save-action" onClick={saveItem} disabled={saving}>
            <Save size={15} strokeWidth={2.4} />
            Save Item
          </button>
        </div>
      </div>

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
            <div className="admin-form-grid">
              <AdminInput label="Icon URL" value={draft.iconUrl ?? ""} onChange={(value) => updateDraft("iconUrl", value)} placeholder="/icons/items/example.png" />
              <AdminTextarea label="Note" value={draft.note} onChange={(value) => updateDraft("note", value)} />
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

function RatesEditor({
  currencySettings,
  ratePreview,
  sampleKeys,
  saveSettings,
  saving,
  updateCurrencySetting,
}: {
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
          <button type="button" className="admin-save-action" onClick={saveSettings} disabled={saving}>
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

function ControlsPanel({ saving, seedFirestore }: { saving: boolean; seedFirestore: () => void }) {
  return (
    <div className="admin-controls-page">
      <AdminCard icon={<Database size={17} strokeWidth={2.4} />} eyebrow="Database" title="Firestore seed">
        <p className="admin-card-copy">Populate Firestore from the bundled local item list.</p>
        <div className="admin-controls-actions">
          <button type="button" className="admin-secondary-action admin-seed-action" onClick={seedFirestore} disabled={saving}>
            <Database size={15} strokeWidth={2.4} />
            Seed Firestore
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
      <img src={tradeIconPaths[type]} alt="" className="h-full w-full object-contain" draggable={false} />
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
