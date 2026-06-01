"use client";

import { useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, Info, X } from "lucide-react";

import { categories, getItemSource, type ItemCategory, type ItemTrend, valueItems, type ValueItem } from "@/content/items";
import { cn } from "@/lib/cn";
import { rarityStyles } from "@/lib/rarityStyles";
import { getDisplayValue, getValueModes, type ValueCurrencySettings, type ValueMode, valueModeIcon } from "@/lib/valueCurrency";

type SortOption = "value-desc" | "value-asc" | "demand-desc" | "demand-asc" | "tax-desc" | "tax-asc" | "prestige-desc" | "prestige-asc" | "name-asc";
type DemandFilter = "all" | "high" | "medium" | "low";
type ValueFilter = "all" | "top" | "mid" | "low";
type SourceFilter = "all" | string;
type TrendFilter = "all" | ItemTrend;

const trendMeta: Record<ItemTrend, { label: string; className: string; icon: string }> = {
  rising: {
    label: "Rising",
    className: "trend-sigil-rising",
    icon: "trend-rising",
  },
  stable: {
    label: "Stable",
    className: "trend-sigil-stable",
    icon: "trend-stable",
  },
  falling: {
    label: "Falling",
    className: "trend-sigil-falling",
    icon: "trend-falling",
  },
};

const prestigeLabels = ["Open trade", "Low gate", "Mid gate", "High gate"];
const pageSize = 8;

const filterBreakpoint = "(max-width: 767px)";

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

const sortOptions: { id: SortOption; label: string }[] = [
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

const trendOptions: { id: TrendFilter; label: string }[] = [
  { id: "all", label: "Any trend" },
  { id: "rising", label: "Rising" },
  { id: "stable", label: "Stable" },
  { id: "falling", label: "Falling" },
];

const demandOptions: { id: DemandFilter; label: string }[] = [
  { id: "all", label: "Any demand" },
  { id: "high", label: "High 70+" },
  { id: "medium", label: "Medium 35-69" },
  { id: "low", label: "Low <35" },
];

const valueRangeOptions: { id: ValueFilter; label: string }[] = [
  { id: "all", label: "Any value" },
  { id: "top", label: "Top 10k+" },
  { id: "mid", label: "Mid 1k-9.9k" },
  { id: "low", label: "Low <1k" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrencyValue(value: number, mode: ValueMode, settings?: ValueCurrencySettings) {
  const valueModes = getValueModes(settings);
  const amount = getDisplayValue(value, mode, settings);
  const formatted =
    mode === "keys"
      ? formatNumber(Math.round(amount))
      : amount >= 100 || Number.isInteger(amount)
        ? formatNumber(Math.round(amount))
        : amount.toFixed(1);
  return `${formatted} ${valueModes[mode].unit}`;
}

function getTradeGuidance(item: ValueItem) {
  if (item.trend === "falling") return "Wait for confirmation before overpaying.";
  if (item.taxGems >= 10000) return "Check tax cost before accepting small upgrades.";
  if (item.demand >= 75) return "Strong demand; fair overpay is more defensible.";
  if (item.demand <= 25) return "Low demand; ask for adds or easier-to-move items.";
  return "Stable market; use recent comparable trades.";
}

function getValueRank(item: ValueItem, items: ValueItem[]) {
  return items.filter((value) => value.value > item.value).length + 1;
}

function matchesDemandFilter(item: ValueItem, filter: DemandFilter) {
  if (filter === "all") return true;
  if (filter === "high") return item.demand >= 70;
  if (filter === "medium") return item.demand >= 35 && item.demand < 70;
  return item.demand < 35;
}

function matchesValueFilter(item: ValueItem, filter: ValueFilter) {
  if (filter === "all") return true;
  if (filter === "top") return item.value >= 10000;
  if (filter === "mid") return item.value >= 1000 && item.value < 10000;
  return item.value < 1000;
}

function sortItems(items: ValueItem[], sortOption: SortOption) {
  return [...items].sort((a, b) => {
    switch (sortOption) {
      case "value-asc":
        return a.value - b.value;
      case "demand-desc":
        return b.demand - a.demand || b.value - a.value;
      case "demand-asc":
        return a.demand - b.demand || b.value - a.value;
      case "tax-desc":
        return b.taxGems - a.taxGems || b.value - a.value;
      case "tax-asc":
        return a.taxGems - b.taxGems || b.value - a.value;
      case "prestige-desc":
        return b.prestige - a.prestige || b.value - a.value;
      case "prestige-asc":
        return a.prestige - b.prestige || b.value - a.value;
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "value-desc":
      default:
        return b.value - a.value;
    }
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ValuesList({ currencySettings, items = valueItems }: { currencySettings?: ValueCurrencySettings; items?: ValueItem[] }) {
  const valueModes = useMemo(() => getValueModes(currencySettings), [currencySettings]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ItemCategory>("all");
  const [sortOption, setSortOption] = useState<SortOption>("value-desc");
  const [trendFilter, setTrendFilter] = useState<TrendFilter>("all");
  const [demandFilter, setDemandFilter] = useState<DemandFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [valueFilter, setValueFilter] = useState<ValueFilter>("all");
  const isCompactFilterLayout = useSyncExternalStore(subscribeFilterBreakpoint, getFilterBreakpointSnapshot, getFilterBreakpointServerSnapshot);
  const [manualFiltersExpanded, setManualFiltersExpanded] = useState<boolean | null>(null);
  const filtersExpanded = manualFiltersExpanded ?? !isCompactFilterLayout;
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const [valueMode, setValueMode] = useState<ValueMode>("keys");
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<ValueItem | null>(null);
  const [iconOverrides] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = items
      .filter((item) => {
        const matchesCategory = category === "all" || item.category === category;
        const matchesQuery = !needle || item.name.toLowerCase().includes(needle);
        const matchesTrend = trendFilter === "all" || item.trend === trendFilter;
        const matchesSource = sourceFilter === "all" || getItemSource(item) === sourceFilter;
        return matchesCategory && matchesQuery && matchesTrend && matchesSource && matchesDemandFilter(item, demandFilter) && matchesValueFilter(item, valueFilter);
      })

    return sortItems(matches, sortOption);
  }, [category, demandFilter, items, query, sortOption, sourceFilter, trendFilter, valueFilter]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? items[0];
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstItemIndex = (currentPage - 1) * pageSize;
  const pagedItems = filtered.slice(firstItemIndex, firstItemIndex + pageSize);
  const visibleCategories = categories.filter((item) => item.id === "all" || items.some((value) => value.category === item.id));
  const sourceOptions = useMemo(() => ["all", ...Array.from(new Set(items.map(getItemSource))).sort()] as SourceFilter[], [items]);
  const activeFilterCount = [category !== "all", sortOption !== "value-desc", trendFilter !== "all", demandFilter !== "all", sourceFilter !== "all", valueFilter !== "all"].filter(Boolean).length;

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

  return (
    <section className="px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="market-vellum p-4 md:p-5">
          <div className="market-board-head">
            <div className="title-lockup">
              <div>
                <h2 className="font-display text-3xl leading-none md:text-4xl">Market Values</h2>
                <p className="mt-2 text-sm text-[rgb(var(--fog)/.8)]">Search, sort, and compare current item values.</p>
              </div>
            </div>

            <div className="market-actions">
              <div className="search-control">
                <span>Find item</span>
                <label className="search-channel" title="Search applies within the selected category.">
                  <span className="sr-only">Search values</span>
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search names"
                    className="h-10 w-full min-w-0 bg-transparent px-4 text-sm text-white outline-none placeholder:text-[rgb(var(--fog)/.48)]"
                  />
                  {query ? (
                    <button type="button" className="search-clear" onClick={() => {
                      setQuery("");
                      setPage(1);
                    }} aria-label="Clear search">
                      x
                    </button>
                  ) : null}
                </label>
              </div>
              <div className="currency-control">
                <span>Display value as</span>
                <div className="currency-tabs" aria-label="Display value as">
                  {(Object.keys(valueModes) as ValueMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setValueMode(mode)}
                      aria-pressed={valueMode === mode}
                      title={`Show item values in ${valueModes[mode].label.toLowerCase()}`}
                      className={cn("currency-tab", valueMode === mode && "currency-tab-active")}
                    >
                      <GemIcon type={valueModeIcon[mode]} className={cn("value-mode-icon", `trade-icon-${valueModeIcon[mode]}`)} />
                      <span>{valueModes[mode].shortLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="market-info-grid" aria-label="Market data trust information">
            <InfoPanel label="Updated" value="May 26" detail="Latest board import" />
            <InfoPanel label="Source" value="Recent trades" detail="Checked against market activity" />
            <InfoPanel label="Demand" value="Trade interest" detail="Higher score means easier movement" />
          </div>

          <div className="advanced-filter-panel" aria-label="Advanced value filters">
            <div className="advanced-filter-head">
              <div>
                <button
                  type="button"
                  className="advanced-filter-toggle"
                  aria-expanded={filtersExpanded}
                  aria-controls="advanced-filter-controls"
                  onClick={() => setManualFiltersExpanded(!filtersExpanded)}
                >
                  <span>Advanced filters</span>
                  <ChevronDown size={15} strokeWidth={2.5} />
                </button>
                <strong>{filtered.length} items</strong>
              </div>
              <button type="button" className="advanced-filter-clear" onClick={clearFilters} disabled={!activeFilterCount} aria-label="Clear advanced filters">
                Clear {activeFilterCount ? `(${activeFilterCount})` : ""}
              </button>
            </div>

            <div id="advanced-filter-controls" className={cn("advanced-filter-grid", filtersExpanded && "advanced-filter-grid-open")}>
              <FilterSelect
                label="Sort"
                value={sortOption}
                onChange={(value) => {
                  setSortOption(value as SortOption);
                  resetPage();
                }}
                options={sortOptions.map((option) => ({ value: option.id, label: option.label }))}
              />
              <FilterSelect
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
              <FilterSelect
                label="Demand"
                value={demandFilter}
                onChange={(value) => {
                  setDemandFilter(value as DemandFilter);
                  resetPage();
                }}
                options={demandOptions.map((option) => ({ value: option.id, label: option.label }))}
              />
              <FilterSelect
                label="Trend"
                value={trendFilter}
                onChange={(value) => {
                  setTrendFilter(value as TrendFilter);
                  resetPage();
                }}
                options={trendOptions.map((option) => ({ value: option.id, label: option.label }))}
              />
              <FilterSelect
                label="Value"
                value={valueFilter}
                onChange={(value) => {
                  setValueFilter(value as ValueFilter);
                  resetPage();
                }}
                options={valueRangeOptions.map((option) => ({ value: option.id, label: option.label }))}
              />
              <FilterSelect
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
        </div>

        <div className="mt-5">
          <div className="market-ledger">
            <div className="ledger-columns hidden text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--fog)/.72)] lg:grid">
              <span>ITEM</span>
              <span>VALUE</span>
              <span>TREND</span>
              <span>GEM TAX</span>
              <span>DEMAND</span>
              <span>PRESTIGE</span>
              <span>DETAILS</span>
            </div>

            <div className="space-y-2 p-2 md:p-3">
              {pagedItems.map((item) => (
                <ValueRow
                  key={item.id}
                  item={item}
                  iconUrl={iconOverrides[item.id] ?? item.iconUrl ?? ""}
                  selected={selected.id === item.id}
                  currencySettings={currencySettings}
                  valueMode={valueMode}
                  onSelect={() => {
                    if (selected.id === item.id) {
                      setDetailItem(item);
                      return;
                    }

                    setSelectedId(item.id);
                  }}
                  onOpen={() => {
                    setSelectedId(item.id);
                    setDetailItem(item);
                  }}
                  onView={() => {
                    setSelectedId(item.id);
                    setDetailItem(item);
                  }}
                />
              ))}
            </div>

            {filtered.length > pageSize ? (
              <Pagination
                currentPage={currentPage}
                firstItemIndex={firstItemIndex}
                itemCount={filtered.length}
                onPageChange={setPage}
                pageSize={pageSize}
                totalPages={totalPages}
              />
            ) : null}

            {!filtered.length && (
              <div className="p-8 text-center">
                <h3 className="font-display text-2xl">No item found</h3>
                <p className="mt-2 text-zinc-400">Clear the search or adjust advanced filters.</p>
              </div>
            )}
          </div>

        </div>
        {detailItem ? (
          <ValueDetailModal
            iconUrl={iconOverrides[detailItem.id] ?? detailItem.iconUrl ?? ""}
            item={detailItem}
            onClose={() => setDetailItem(null)}
            currencySettings={currencySettings}
            valueRank={getValueRank(detailItem, items)}
            valueMode={valueMode}
          />
        ) : null}
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
  wide = false,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  value: string;
  wide?: boolean;
}) {
  return (
    <label className={cn("advanced-filter-field", wide && "advanced-filter-field-wide")}>
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

function Pagination({
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
    <div className="ledger-pagination">
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

function InfoPanel({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="market-info-panel">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ValueRow({
  item,
  iconUrl,
  selected,
  currencySettings,
  valueMode,
  onOpen,
  onSelect,
  onView,
}: {
  item: ValueItem;
  iconUrl: string;
  selected: boolean;
  currencySettings?: ValueCurrencySettings;
  valueMode: ValueMode;
  onOpen: () => void;
  onSelect: () => void;
  onView: () => void;
}) {
  const lastTouchTime = useRef(0);

  return (
    <article
      onClick={onSelect}
      onDoubleClick={onOpen}
      onTouchEnd={() => {
        const now = Date.now();

        if (now - lastTouchTime.current < 320) {
          onOpen();
        }

        lastTouchTime.current = now;
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={selected}
      aria-label={`${item.name}, ${formatCurrencyValue(item.value, valueMode, currencySettings)}, ${trendMeta[item.trend].label}, ${formatNumber(item.taxGems)} gems tax, demand ${item.demand} out of 100, prestige P${item.prestige}`}
      className={cn(
        "market-row group w-full text-left",
        selected && "market-row-selected",
      )}
      role="button"
      tabIndex={0}
    >
      <div className="col-span-2 grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-3 lg:contents">
        <div className="lg:hidden">
          <ItemIcon name={item.name} iconUrl={iconUrl} rarity={item.rarity} compact />
        </div>
        <div className="min-w-0 lg:grid lg:grid-cols-[48px_minmax(0,1fr)] lg:items-center lg:gap-3">
          <div className="hidden lg:block">
            <ItemIcon name={item.name} iconUrl={iconUrl} rarity={item.rarity} compact />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              {selected ? <span className="row-selected-mark" aria-hidden="true" /> : null}
              <h3 className="truncate font-display text-lg leading-6 text-white">{item.name}</h3>
            </div>
            <p className="row-item-note">
              <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]", rarityStyles[item.rarity].badge)}>
                {rarityStyles[item.rarity].label}
              </span>
            </p>
          </div>
        </div>
      </div>

      <RowMetric label="Value" value={formatCurrencyValue(item.value, valueMode, currencySettings)} icon={valueModeIcon[valueMode]} />
      <div className="hidden min-w-0 items-center lg:block">
        <span className="mr-2 text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--fog)/.62)] lg:hidden">Trend</span>
        <TrendBadge trend={item.trend} />
      </div>
      <RowMetric label="Tax" value={<GemValue value={item.taxGems} />} />
      <RowMetric label="Demand Score" value={<DemandScore value={item.demand} />} icon="demand" />
      <RowMetric label="Prestige" value={`P${item.prestige}`} icon="prestige" title={prestigeLabels[item.prestige]} />
      <div className="row-mobile-trend lg:hidden">
        <span>Trend</span>
        <TrendBadge trend={item.trend} />
      </div>
      <div className="value-row-action">
        <button
          type="button"
          className="value-row-data"
          onClick={(event) => {
            event.stopPropagation();
            onView();
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <Info size={12} strokeWidth={2.4} />
          View
        </button>
      </div>
    </article>
  );
}

function ValueDetailModal({
  iconUrl,
  item,
  onClose,
  currencySettings,
  valueRank,
  valueMode,
}: {
  iconUrl: string;
  item: ValueItem;
  onClose: () => void;
  currencySettings?: ValueCurrencySettings;
  valueRank: number;
  valueMode: ValueMode;
}) {
  const valueModes = getValueModes(currencySettings);

  return (
    <div className="calculator-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="calculator-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${item.name} value data`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="calculator-modal-close" onClick={onClose} aria-label="Close value data">
          <X size={16} strokeWidth={2.4} />
        </button>
        <div className="calculator-modal-head">
          <ItemIcon name={item.name} iconUrl={iconUrl} rarity={item.rarity} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--bright-gold))]">Value data</p>
            <h2 className="font-display mt-1 text-3xl leading-8">{item.name}</h2>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--fog)/.7)]">
              <span className={rarityStyles[item.rarity].text}>{rarityStyles[item.rarity].label}</span> / {item.category}
            </p>
          </div>
        </div>

        <div className="calculator-modal-values">
          {(Object.keys(valueModes) as ValueMode[]).map((mode) => (
            <div key={mode} className={cn("calculator-modal-value", valueMode === mode && "calculator-modal-value-active")}>
              <GemIcon type={valueModeIcon[mode]} className={cn("calculator-modal-value-icon", `trade-icon-${valueModeIcon[mode]}`)} />
              <span>{valueModes[mode].label}</span>
              <strong>{formatCurrencyValue(item.value, mode, currencySettings)}</strong>
            </div>
          ))}
        </div>

        <div className="calculator-modal-lines">
          <ValueDetailLine icon="rank" label="Value Rank" value={`#${valueRank} by value`} />
          <ValueDetailLine icon="gem" label="Gem Tax" value={`${formatNumber(item.taxGems)} gems`} />
          <ValueDetailLine icon="demand" label="Demand" value={`${item.demand}/100`} />
          <ValueDetailLine icon="prestige" label="Prestige" value={`P${item.prestige}`} />
          <ValueDetailLine icon={trendMeta[item.trend].icon} label="Trend" value={trendMeta[item.trend].label} />
          <ValueDetailLine icon="source" label="Source" value={getItemSource(item)} />
        </div>

        <div className="calculator-modal-note">
          <span>Trade read</span>
          <p>{getTradeGuidance(item)}</p>
        </div>

        <Link
          href={`/calculator?item=${item.id}`}
          className="royal-button primary-market-cta mt-4 inline-flex h-12 w-full items-center justify-center rounded-full text-xs font-bold uppercase tracking-[0.14em] text-white"
        >
          <span>Add to calculator</span>
        </Link>
        <Link
          href={`/items/${item.id}`}
          className="item-modal-page-link mt-3 inline-flex h-11 w-full items-center justify-center rounded-full text-xs font-bold uppercase tracking-[0.14em]"
        >
          View trade graph
        </Link>
      </div>
    </div>
  );
}

function ValueDetailLine({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="calculator-detail-line">
      <GemIcon type={icon} className={cn("calculator-detail-image-icon", `trade-icon-${icon}`)} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RowMetric({ label, value, icon, title, strong = false }: { label: string; value: ReactNode; icon?: string; title?: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="block text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--fog)/.62)] lg:hidden">{label}</span>
      <strong className={cn("row-metric-value text-sm text-[rgb(var(--ink))]", strong && "font-display text-lg text-[rgb(var(--bright-gold))]")} title={title}>
        {icon ? <GemIcon type={icon} className={cn("metric-icon", `trade-icon-${icon}`)} /> : null}
        <span className="truncate">{value}</span>
      </strong>
    </div>
  );
}

function DemandScore({ value }: { value: number }) {
  return (
    <span className="demand-score">
      <span>{value}/100</span>
      <span className="demand-meter" role="meter" aria-label="Demand score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span style={{ width: `${value}%` }} />
      </span>
    </span>
  );
}

function ItemIcon({ name, iconUrl, rarity, compact = false }: { name: string; iconUrl: string; rarity: ValueItem["rarity"]; compact?: boolean }) {
  return (
    <span className={cn("item-crest", rarityStyles[rarity].crest, compact ? "size-11" : "size-[58px]")}>
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt={name} className="h-full w-full object-contain p-1" />
      ) : (
        <span className="font-display text-sm text-[rgb(var(--bright-gold))]">{initials(name)}</span>
      )}
    </span>
  );
}

function TrendBadge({ trend }: { trend: ItemTrend }) {
  const meta = trendMeta[trend];

  return (
    <span className={cn("trend-sigil", meta.className)}>
      <GemIcon type={meta.icon} className={cn("trend-sigil-icon", `trade-icon-${meta.icon}`)} />
      {meta.label}
    </span>
  );
}

function GemValue({ value }: { value: number }) {
  return (
    <span className="gem-value">
      <GemIcon type="gem" className="stat-icon trade-icon-gem" />
      <span className="truncate">{formatNumber(value)} gems</span>
    </span>
  );
}

function GemIcon({ type, className }: { type: string; className?: string }) {
  const src = `/icons/trade/${type}.png`;

  return (
    <span className={cn("gem-token", className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-contain" draggable={false} />
    </span>
  );
}


