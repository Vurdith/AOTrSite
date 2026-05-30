"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Info, Plus, Search, X } from "lucide-react";

import { categories, getItemSource, type ItemCategory, type ItemTrend, valueItems, type ValueItem } from "@/content/items";
import { cn } from "@/lib/cn";
import { rarityStyles } from "@/lib/rarityStyles";

type Side = "yours" | "theirs";
type FilledTradeSlot = { item: ValueItem; quantity: number };
type TradeSlot = FilledTradeSlot | null;
type ActiveSlot = { side: Side; index: number };
type ValueMode = "keys" | "masks" | "scrolls";
type PickerSortOption = "value-desc" | "value-asc" | "demand-desc" | "demand-asc" | "tax-desc" | "tax-asc" | "prestige-desc" | "prestige-asc" | "name-asc";
type PickerDemandFilter = "all" | "high" | "medium" | "low";
type PickerValueFilter = "all" | "top" | "mid" | "low";
type PickerSourceFilter = "all" | string;
type PickerTrendFilter = "all" | ItemTrend;

const valueModes: Record<ValueMode, { label: string; shortLabel: string; unit: string; rate: number; icon: string }> = {
  keys: { label: "Keys", shortLabel: "Keys", unit: "keys", rate: 1, icon: "key" },
  masks: { label: "Vizards", shortLabel: "Vizards", unit: "vizards", rate: 900, icon: "mask" },
  scrolls: { label: "Scrolls", shortLabel: "Scrolls", unit: "scrolls", rate: 3, icon: "scroll" },
};

const trendLabels: Record<ItemTrend, string> = {
  rising: "Rising",
  stable: "Stable",
  falling: "Falling",
};

const pickerSortOptions: { id: PickerSortOption; label: string }[] = [
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

const pickerDemandOptions: { id: PickerDemandFilter; label: string }[] = [
  { id: "all", label: "Any demand" },
  { id: "high", label: "High 70+" },
  { id: "medium", label: "Medium 35-69" },
  { id: "low", label: "Low <35" },
];

const pickerTrendOptions: { id: PickerTrendFilter; label: string }[] = [
  { id: "all", label: "Any trend" },
  { id: "rising", label: "Rising" },
  { id: "stable", label: "Stable" },
  { id: "falling", label: "Falling" },
];

const pickerValueOptions: { id: PickerValueFilter; label: string }[] = [
  { id: "all", label: "Any value" },
  { id: "top", label: "Top 10k+" },
  { id: "mid", label: "Mid 1k-9.9k" },
  { id: "low", label: "Low <1k" },
];

function formatValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 100 ? 1 : 0,
  }).format(value);
}

function formatModeValue(value: number, mode: ValueMode) {
  const amount = value / valueModes[mode].rate;
  const formatted =
    mode === "keys"
      ? formatValue(Math.round(amount))
      : amount >= 100 || Number.isInteger(amount)
        ? formatValue(Math.round(amount))
        : amount.toFixed(1);
  return `${formatted} ${valueModes[mode].unit}`;
}

function initialYoursSlots() {
  return [{ item: valueItems[2], quantity: 1 }, { item: valueItems[5], quantity: 1 }, ...Array<TradeSlot>(7).fill(null)];
}

function getNextSlotIndex(slots: TradeSlot[], currentIndex: number) {
  const afterCurrent = slots.findIndex((slot, index) => index > currentIndex && !slot);

  if (afterCurrent !== -1) return afterCurrent;

  return slots.findIndex((slot, index) => index !== currentIndex && !slot);
}

function getMedianDemand(slots: TradeSlot[]) {
  const demands = slots
    .flatMap((slot) => (slot ? Array.from({ length: slot.quantity }, () => slot.item.demand) : []))
    .sort((a, b) => a - b);

  if (!demands.length) return null;

  const middle = Math.floor(demands.length / 2);
  return demands.length % 2 === 0 ? (demands[middle - 1] + demands[middle]) / 2 : demands[middle];
}

function formatDemand(value: number | null) {
  if (value === null) return "No items";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}/100`;
}

function matchesPickerDemand(item: ValueItem, filter: PickerDemandFilter) {
  if (filter === "all") return true;
  if (filter === "high") return item.demand >= 70;
  if (filter === "medium") return item.demand >= 35 && item.demand < 70;
  return item.demand < 35;
}

function matchesPickerValue(item: ValueItem, filter: PickerValueFilter) {
  if (filter === "all") return true;
  if (filter === "top") return item.value >= 10000;
  if (filter === "mid") return item.value >= 1000 && item.value < 10000;
  return item.value < 1000;
}

function sortPickerItems(items: ValueItem[], sortOption: PickerSortOption) {
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

export function TradeCalculator() {
  const [yours, setYours] = useState<TradeSlot[]>(initialYoursSlots);
  const [theirs, setTheirs] = useState<TradeSlot[]>([{ item: valueItems[1], quantity: 1 }, ...Array<TradeSlot>(8).fill(null)]);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>({ side: "yours", index: 2 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [valueMode, setValueMode] = useState<ValueMode>("keys");
  const [category, setCategory] = useState<"all" | ItemCategory>("all");
  const [pickerSortOption, setPickerSortOption] = useState<PickerSortOption>("value-desc");
  const [pickerDemandFilter, setPickerDemandFilter] = useState<PickerDemandFilter>("all");
  const [pickerTrendFilter, setPickerTrendFilter] = useState<PickerTrendFilter>("all");
  const [pickerValueFilter, setPickerValueFilter] = useState<PickerValueFilter>("all");
  const [pickerSourceFilter, setPickerSourceFilter] = useState<PickerSourceFilter>("all");
  const [detailItem, setDetailItem] = useState<ValueItem | null>(null);
  const [slotCue, setSlotCue] = useState<ActiveSlot | null>(null);
  const [query, setQuery] = useState("");
  const pickerReopenTimer = useRef<number | null>(null);

  const yourTotal = yours.reduce((sum, slot) => sum + (slot ? slot.item.value * slot.quantity : 0), 0);
  const theirTotal = theirs.reduce((sum, slot) => sum + (slot ? slot.item.value * slot.quantity : 0), 0);
  const yourGemTaxTotal = yours.reduce((sum, slot) => sum + (slot ? slot.item.taxGems * slot.quantity : 0), 0);
  const theirGemTaxTotal = theirs.reduce((sum, slot) => sum + (slot ? slot.item.taxGems * slot.quantity : 0), 0);
  const gemTaxTotal = Math.abs(theirGemTaxTotal - yourGemTaxTotal);
  const yourMedianDemand = getMedianDemand(yours);
  const theirMedianDemand = getMedianDemand(theirs);
  const yourCount = yours.filter(Boolean).length;
  const theirCount = theirs.filter(Boolean).length;
  const diff = theirTotal - yourTotal;
  const favor = diff >= 0 ? "Fair trade" : "Overpay";
  const targetLabel = `${activeSlot.side === "yours" ? "Your" : "Their"} slot ${activeSlot.index + 1}`;
  const visibleCategories = categories.filter((item) => item.id === "all" || valueItems.some((value) => value.category === item.id));
  const pickerSourceOptions = useMemo(() => ["all", ...Array.from(new Set(valueItems.map(getItemSource))).sort()] as PickerSourceFilter[], []);
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = valueItems.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesQuery = !needle || item.name.toLowerCase().includes(needle);
      const matchesTrend = pickerTrendFilter === "all" || item.trend === pickerTrendFilter;
      const matchesSource = pickerSourceFilter === "all" || getItemSource(item) === pickerSourceFilter;
      return matchesCategory && matchesQuery && matchesTrend && matchesSource && matchesPickerDemand(item, pickerDemandFilter) && matchesPickerValue(item, pickerValueFilter);
    });
    return sortPickerItems(matches, pickerSortOption);
  }, [category, pickerDemandFilter, pickerSortOption, pickerSourceFilter, pickerTrendFilter, pickerValueFilter, query]);
  const pickerActiveFilterCount = [category !== "all", pickerSortOption !== "value-desc", pickerDemandFilter !== "all", pickerTrendFilter !== "all", pickerValueFilter !== "all", pickerSourceFilter !== "all"].filter(Boolean).length;

  function clearPickerFilters() {
    setCategory("all");
    setPickerSortOption("value-desc");
    setPickerDemandFilter("all");
    setPickerTrendFilter("all");
    setPickerValueFilter("all");
    setPickerSourceFilter("all");
  }

  useEffect(() => {
    if (!slotCue) return;

    const timer = window.setTimeout(() => setSlotCue(null), 950);

    return () => window.clearTimeout(timer);
  }, [slotCue]);

  useEffect(() => {
    return () => {
      if (pickerReopenTimer.current) {
        window.clearTimeout(pickerReopenTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const itemId = new URLSearchParams(window.location.search).get("item");
    const item = valueItems.find((value) => value.id === itemId);

    if (!item) return;

    const timer = window.setTimeout(() => {
      setYours((current) => {
        const emptyIndex = current.findIndex((slot) => !slot);
        const targetIndex = emptyIndex === -1 ? 0 : emptyIndex;
        const nextIndex = getNextSlotIndex(current, targetIndex);
        const nextSlot = { side: "yours" as const, index: nextIndex === -1 ? targetIndex : nextIndex };
        setActiveSlot(nextSlot);
        setSlotCue(nextSlot);
        return current.map((slot, slotIndex) => (slotIndex === targetIndex ? { item, quantity: 1 } : slot));
      });
      window.history.replaceState(null, "", window.location.pathname);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function setSlot(side: Side, index: number, item: TradeSlot) {
    const setter = side === "yours" ? setYours : setTheirs;
    setter((current) => current.map((slot, slotIndex) => (slotIndex === index ? item : slot)));
  }

  function pickSlot(side: Side, index: number) {
    if (pickerReopenTimer.current) {
      window.clearTimeout(pickerReopenTimer.current);
      pickerReopenTimer.current = null;
    }

    setActiveSlot({ side, index });
    setQuery("");
    setPickerOpen(true);
  }

  function pickItem(item: ValueItem) {
    const setter = activeSlot.side === "yours" ? setYours : setTheirs;
    const slots = activeSlot.side === "yours" ? yours : theirs;
    const nextIndex = getNextSlotIndex(slots, activeSlot.index);

    setter((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === activeSlot.index
          ? { item, quantity: slot?.quantity ?? 1 }
          : slot,
      ),
    );
    setQuery("");
    if (nextIndex === -1) {
      setPickerOpen(false);
      return;
    }

    const nextSlot = { side: activeSlot.side, index: nextIndex };
    setActiveSlot(nextSlot);
    setSlotCue(nextSlot);
    setPickerOpen(false);

    if (pickerReopenTimer.current) {
      window.clearTimeout(pickerReopenTimer.current);
    }

    pickerReopenTimer.current = window.setTimeout(() => {
      setPickerOpen(true);
      pickerReopenTimer.current = null;
    }, 950);
  }

  function setQuantity(side: Side, index: number, quantity: number) {
    const setter = side === "yours" ? setYours : setTheirs;
    setter((current) =>
      current.map((slot, slotIndex) =>
        slot && slotIndex === index
          ? { ...slot, quantity: Math.min(100, Math.max(1, quantity)) }
          : slot,
      ),
    );
  }

  return (
    <section className="px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="market-vellum p-4 md:p-5">
          <div className="market-board-head calculator-display-head">
            <div className="title-lockup">
              <div>
                <h2 className="font-display text-3xl leading-none md:text-4xl">Calculator Items</h2>
                <p className="mt-2 text-sm text-[rgb(var(--fog)/.8)]">Choose how trade values are shown.</p>
              </div>
            </div>

            <div className="market-actions">
              <div className="currency-control">
                <span>Display value as</span>
                <div className="currency-tabs" aria-label="Display value as">
                  {(Object.keys(valueModes) as ValueMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setValueMode(mode)}
                      aria-pressed={valueMode === mode}
                      className={cn("currency-tab", valueMode === mode && "currency-tab-active")}
                    >
                      <CalcValueIcon type={valueModes[mode].icon} className={cn("value-mode-icon", `trade-icon-${valueModes[mode].icon}`)} />
                      <span>{valueModes[mode].shortLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      <div className="mt-5">
        <div className="market-vellum self-start p-4 md:p-5">
          <div className="calculator-board-head">
            <div>
              <h2 className="font-display text-2xl text-[rgb(var(--ink))] md:text-3xl">Trade slots</h2>
            </div>
            <div className={cn("calculator-verdict-clean", diff >= 0 ? "calculator-verdict-good" : "calculator-verdict-bad")}>
              <span>{favor}</span>
              <strong className="calculator-result-value">
                <CalcValueIcon type={valueModes[valueMode].icon} className={cn("calculator-result-icon", `trade-icon-${valueModes[valueMode].icon}`)} />
                {diff >= 0 ? "+" : "-"}{formatModeValue(Math.abs(diff), valueMode)}
              </strong>
            </div>
          </div>

          <div className="calculator-tax-summary mt-4">
            <StatChip label="Gem Tax" value={gemTaxTotal ? `${gemTaxTotal.toLocaleString()} gems total` : "No gem tax"} icon="gem" />
            <StatChip label="Gold Tax" value="No gold tax listed" icon="gold" />
          </div>

          <div className="calculator-demand-summary mt-3">
            <StatChip label="Your Median Demand" value={formatDemand(yourMedianDemand)} icon="demand" />
            <StatChip label="Their Median Demand" value={formatDemand(theirMedianDemand)} icon="demand" />
          </div>

          <div className="calculator-offers mt-5">
            <Offer
              activeSlot={activeSlot}
              count={yourCount}
              items={yours}
              onPickSlot={pickSlot}
              onQuantity={(index, quantity) => setQuantity("yours", index, quantity)}
              onRemove={(index) => setSlot("yours", index, null)}
              onView={setDetailItem}
              slotCue={slotCue}
              side="yours"
              title="You give"
              total={`${formatModeValue(yourTotal, valueMode)} in value`}
              valueIcon={valueModes[valueMode].icon}
            />
            <div className="calculator-trade-mark" aria-hidden="true">
              <ArrowLeftRight size={22} strokeWidth={2.4} />
            </div>
            <Offer
              activeSlot={activeSlot}
              count={theirCount}
              items={theirs}
              onPickSlot={pickSlot}
              onQuantity={(index, quantity) => setQuantity("theirs", index, quantity)}
              onRemove={(index) => setSlot("theirs", index, null)}
              onView={setDetailItem}
              slotCue={slotCue}
              side="theirs"
              title="You get"
              total={`${formatModeValue(theirTotal, valueMode)} in value`}
              valueIcon={valueModes[valueMode].icon}
            />
          </div>
        </div>

      </div>
      {detailItem ? (
        <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} valueMode={valueMode} />
      ) : null}
      {pickerOpen ? (
        <ItemPickerModal
          category={category}
          clearFilters={clearPickerFilters}
          filteredItems={filteredItems}
          activeFilterCount={pickerActiveFilterCount}
          demandFilter={pickerDemandFilter}
          onCategory={setCategory}
          onClose={() => setPickerOpen(false)}
          onDemandFilter={setPickerDemandFilter}
          onPick={pickItem}
          onQuery={setQuery}
          onSort={setPickerSortOption}
          onSourceFilter={setPickerSourceFilter}
          onTrendFilter={setPickerTrendFilter}
          onValueFilter={setPickerValueFilter}
          query={query}
          sortOption={pickerSortOption}
          sourceFilter={pickerSourceFilter}
          sourceOptions={pickerSourceOptions}
          targetLabel={targetLabel}
          trendFilter={pickerTrendFilter}
          valueFilter={pickerValueFilter}
          visibleCategories={visibleCategories}
        />
      ) : null}
      </div>
    </section>
  );
}

function ItemPickerModal({
  activeFilterCount,
  category,
  clearFilters,
  demandFilter,
  filteredItems,
  onCategory,
  onClose,
  onDemandFilter,
  onPick,
  onQuery,
  onSort,
  onSourceFilter,
  onTrendFilter,
  onValueFilter,
  query,
  sortOption,
  sourceFilter,
  sourceOptions,
  targetLabel,
  trendFilter,
  valueFilter,
  visibleCategories,
}: {
  activeFilterCount: number;
  category: "all" | ItemCategory;
  clearFilters: () => void;
  demandFilter: PickerDemandFilter;
  filteredItems: ValueItem[];
  onCategory: (category: "all" | ItemCategory) => void;
  onClose: () => void;
  onDemandFilter: (filter: PickerDemandFilter) => void;
  onPick: (item: ValueItem) => void;
  onQuery: (query: string) => void;
  onSort: (sort: PickerSortOption) => void;
  onSourceFilter: (filter: PickerSourceFilter) => void;
  onTrendFilter: (filter: PickerTrendFilter) => void;
  onValueFilter: (filter: PickerValueFilter) => void;
  query: string;
  sortOption: PickerSortOption;
  sourceFilter: PickerSourceFilter;
  sourceOptions: PickerSourceFilter[];
  targetLabel: string;
  trendFilter: PickerTrendFilter;
  valueFilter: PickerValueFilter;
  visibleCategories: typeof categories;
}) {
  return (
    <div className="calculator-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="calculator-modal calculator-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Pick item for ${targetLabel}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="calculator-modal-close" onClick={onClose} aria-label="Close item picker">
          <X size={16} strokeWidth={2.4} />
        </button>
        <div className="calculator-picker-modal-head">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--bright-gold))]">Item picker</p>
            <h2 className="font-display mt-1 text-3xl leading-none">{targetLabel}</h2>
          </div>
        </div>

        <div className="calculator-picker-modal-toolbar">
          <div className="search-control">
            <span>Find item</span>
            <label className="search-channel" title="Search applies within the selected category.">
              <span className="sr-only">Search calculator items</span>
              <Search className="ml-3 size-4 shrink-0 text-[rgb(var(--fog)/.66)]" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                placeholder="Search names"
                className="h-10 w-full min-w-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-[rgb(var(--fog)/.48)]"
              />
              {query ? (
                <button type="button" className="search-clear" onClick={() => onQuery("")} aria-label="Clear search">
                  x
                </button>
              ) : null}
            </label>
          </div>

          <div className="advanced-filter-panel calculator-picker-filter-panel" aria-label="Picker advanced filters">
            <div className="advanced-filter-head">
              <div>
                <span className="calculator-picker-filter-title">Picker filters</span>
                <strong>{filteredItems.length} items</strong>
              </div>
              <button type="button" className="advanced-filter-clear" onClick={clearFilters} disabled={!activeFilterCount} aria-label="Clear picker filters">
                Clear {activeFilterCount ? `(${activeFilterCount})` : ""}
              </button>
            </div>
            <div className="advanced-filter-grid advanced-filter-grid-open calculator-picker-filter-grid">
              <PickerFilterSelect
                label="Sort"
                value={sortOption}
                onChange={(value) => onSort(value as PickerSortOption)}
                options={pickerSortOptions.map((option) => ({ value: option.id, label: option.label }))}
              />
              <PickerFilterSelect
                label="Category"
                value={category}
                onChange={(value) => onCategory(value as "all" | ItemCategory)}
                options={visibleCategories.map((item) => ({
                  value: item.id,
                  label: `${item.label} (${item.id === "all" ? valueItems.length : valueItems.filter((value) => value.category === item.id).length})`,
                }))}
              />
              <PickerFilterSelect
                label="Demand"
                value={demandFilter}
                onChange={(value) => onDemandFilter(value as PickerDemandFilter)}
                options={pickerDemandOptions.map((option) => ({ value: option.id, label: option.label }))}
              />
              <PickerFilterSelect
                label="Trend"
                value={trendFilter}
                onChange={(value) => onTrendFilter(value as PickerTrendFilter)}
                options={pickerTrendOptions.map((option) => ({ value: option.id, label: option.label }))}
              />
              <PickerFilterSelect
                label="Value"
                value={valueFilter}
                onChange={(value) => onValueFilter(value as PickerValueFilter)}
                options={pickerValueOptions.map((option) => ({ value: option.id, label: option.label }))}
              />
              <PickerFilterSelect
                label="Source"
                value={sourceFilter}
                onChange={(value) => onSourceFilter(value)}
                options={sourceOptions.map((source) => ({ value: source, label: source === "all" ? "Any source" : source }))}
              />
            </div>
          </div>
        </div>

        <div className="calculator-picker-list calculator-picker-modal-list mt-4">
          {filteredItems.map((item) => (
            <button key={item.id} className="calculator-picker-row" onClick={() => onPick(item)} type="button">
              <ItemThumb item={item} />
              <div className="min-w-0">
                <div className="truncate font-display text-base leading-5 text-white">{item.name}</div>
              </div>
              <span className="calculator-picker-target">Pick</span>
            </button>
          ))}
          {!filteredItems.length ? (
            <div className="rounded-[14px_5px_14px_5px] border border-[rgb(var(--gold)/.1)] p-5 text-center text-sm text-[rgb(var(--fog)/.78)]">
              No matching item.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PickerFilterSelect({
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

function StatChip({
  label,
  value,
  icon,
  valueIcon,
}: {
  label: string;
  value: string;
  icon: "gem" | "gold" | "key" | "target" | "value" | "demand";
  valueIcon?: string;
}) {
  const selectedValueIcon = valueIcon ?? "key";

  return (
    <div className="calculator-stat-chip">
      {icon === "key" || icon === "gem" || icon === "gold" || icon === "demand" ? <TradeMetricIcon type={icon} /> : null}
      {icon === "value" ? (
        <CalcValueIcon type={selectedValueIcon} className={cn("calculator-value-stat-icon", `trade-icon-${selectedValueIcon}`)} />
      ) : null}
      {icon === "target" ? <CalcValueIcon type="prestige" className="calculator-metric-icon trade-icon-prestige" /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Offer({
  activeSlot,
  count,
  items,
  onPickSlot,
  onQuantity,
  onRemove,
  onView,
  slotCue,
  side,
  title,
  total,
  valueIcon,
}: {
  activeSlot: ActiveSlot;
  count: number;
  items: TradeSlot[];
  onPickSlot: (side: Side, index: number) => void;
  onQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onView: (item: ValueItem) => void;
  slotCue: ActiveSlot | null;
  side: Side;
  title: string;
  total: string;
  valueIcon: string;
}) {
  return (
    <div className="calculator-offer-panel">
      <div className="calculator-offer-head">
        <div>
          <h2 className="font-display text-2xl">{title}</h2>
          <span>{count}/9 slots</span>
        </div>
        <div className="calculator-offer-total">
          <CalcValueIcon type={valueIcon} className={cn("calculator-offer-total-icon", `trade-icon-${valueIcon}`)} />
          <strong>{total}</strong>
        </div>
      </div>
      <div className="calculator-slot-grid mt-3">
        {items.map((item, index) => (
          <TradeCell
            active={activeSlot.side === side && activeSlot.index === index}
            item={item}
            key={`${side}-${index}`}
            onPick={() => onPickSlot(side, index)}
            onQuantity={(quantity) => onQuantity(index, quantity)}
            onRemove={() => onRemove(index)}
            onView={onView}
            pulse={slotCue?.side === side && slotCue.index === index}
            slotNumber={index + 1}
          />
        ))}
      </div>
    </div>
  );
}

function TradeCell({
  active,
  item,
  onPick,
  onQuantity,
  onRemove,
  onView,
  pulse,
  slotNumber,
}: {
  active: boolean;
  item: TradeSlot;
  onPick: () => void;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onView: (item: ValueItem) => void;
  pulse: boolean;
  slotNumber: number;
}) {
  if (!item) {
    return (
      <button className={cn("calculator-slot calculator-slot-empty", active && "calculator-slot-active", pulse && "calculator-slot-jumped")} onClick={onPick} type="button">
        <span className="calculator-slot-plus">
          <Plus size={18} strokeWidth={2.4} />
        </span>
        {pulse ? <span className="calculator-slot-next-label">Next</span> : null}
        <small>Slot {slotNumber}</small>
      </button>
    );
  }

  const itemData = item.item;

  return (
    <div className={cn("calculator-slot-wrap", active && "calculator-slot-wrap-active", pulse && "calculator-slot-wrap-jumped")}>
      <div className={cn("calculator-slot calculator-slot-filled", active && "calculator-slot-active", pulse && "calculator-slot-jumped")} onClick={onPick} role="button" tabIndex={0} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onPick();
      }
    }}>
      <button type="button" onClick={(event) => {
        event.stopPropagation();
        onRemove();
      }} aria-label={`Remove ${itemData.name}`} title={`Remove ${itemData.name}`} className="calculator-remove">
        <span className="calculator-remove-curve" aria-hidden="true" />
        <span className="calculator-remove-mark" aria-hidden="true" />
      </button>
      <div className="calculator-slot-top">
        <ItemThumb item={itemData} compact />
      </div>
      <div className="min-w-0">
        <div className="calculator-slot-name">{itemData.name}</div>
        <button
          type="button"
          className="calculator-slot-view"
          onClick={(event) => {
            event.stopPropagation();
            onView(itemData);
          }}
        >
          <Info size={12} strokeWidth={2.4} />
          View
        </button>
      </div>
      </div>
      <div className="calculator-quantity-control" aria-label={`${itemData.name} quantity`}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (item.quantity <= 1) {
              onRemove();
              return;
            }

            onQuantity(item.quantity - 1);
          }}
          aria-label={`Decrease ${itemData.name} quantity`}
        >
          -
        </button>
        <label className="calculator-quantity-entry" onClick={(event) => event.stopPropagation()}>
          <span aria-hidden="true">x</span>
          <input
            aria-label={`${itemData.name} quantity amount`}
            inputMode="numeric"
            min={1}
            max={100}
            pattern="[0-9]*"
            type="number"
            value={item.quantity}
            style={{ width: `${String(item.quantity).length}ch` }}
            onChange={(event) => {
              const nextQuantity = Number.parseInt(event.target.value, 10);
              onQuantity(Number.isFinite(nextQuantity) ? nextQuantity : 1);
            }}
            onFocus={(event) => event.currentTarget.select()}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          />
        </label>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onQuantity(item.quantity + 1);
          }}
          disabled={item.quantity >= 100}
          aria-label={`Increase ${itemData.name} quantity`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ItemDetailModal({ item, onClose, valueMode }: { item: ValueItem; onClose: () => void; valueMode: ValueMode }) {
  return (
    <div className="calculator-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="calculator-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${item.name} item data`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="calculator-modal-close" onClick={onClose} aria-label="Close item data">
          <X size={16} strokeWidth={2.4} />
        </button>
        <div className="calculator-modal-head">
          <ItemThumb item={item} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--bright-gold))]">Item data</p>
            <h2 className="font-display mt-1 text-3xl leading-8">{item.name}</h2>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--fog)/.7)]">
              <span className={rarityStyles[item.rarity].text}>{rarityStyles[item.rarity].label}</span> / {item.category}
            </p>
          </div>
        </div>

        <div className="calculator-modal-values">
          {(Object.keys(valueModes) as ValueMode[]).map((mode) => (
            <div key={mode} className={cn("calculator-modal-value", valueMode === mode && "calculator-modal-value-active")}>
              <CalcValueIcon type={valueModes[mode].icon} className={cn("calculator-modal-value-icon", `trade-icon-${valueModes[mode].icon}`)} />
              <span>{valueModes[mode].label}</span>
              <strong>{formatModeValue(item.value, mode)}</strong>
            </div>
          ))}
        </div>

        <div className="calculator-modal-lines">
          <DetailLine icon="gem" label="Gem Tax" value={`${item.taxGems.toLocaleString()} gems`} />
          <DetailLine icon="demand" label="Demand" value={`${item.demand}/100`} />
          <DetailLine icon="prestige" label="Prestige" value={`P${item.prestige}`} />
          <DetailLine icon="trend" label="Trend" value={trendLabels[item.trend]} />
          <DetailLine icon="source" label="Source" value={getItemSource(item)} />
        </div>

        <div className="calculator-modal-note">
          <span>Trade read</span>
          <p>{item.note}</p>
        </div>

        <Link
          href={`/items/${item.id}`}
          className="item-modal-page-link mt-4 inline-flex h-11 w-full items-center justify-center rounded-full text-xs font-bold uppercase tracking-[0.14em]"
        >
          View trade graph
        </Link>
      </div>
    </div>
  );
}

function DetailLine({ icon, label, value }: { icon: "gem" | "demand" | "prestige" | "trend" | "source"; label: string; value: string }) {
  return (
    <div className="calculator-detail-line">
      <DetailIcon type={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailIcon({ type }: { type: "gem" | "demand" | "prestige" | "trend" | "source" }) {
  return <CalcValueIcon type={type} className={cn("calculator-detail-image-icon", `trade-icon-${type}`)} />;
}

function CalcValueIcon({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn("gem-token", className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/icons/trade/${type}.png`} alt="" className="h-full w-full object-contain" draggable={false} />
    </span>
  );
}

function TradeMetricIcon({ type }: { type: "key" | "gem" | "gold" | "demand" }) {
  return <CalcValueIcon type={type} className={cn("calculator-metric-icon", `trade-icon-${type}`)} />;
}

function ItemThumb({ item, compact = false }: { item: ValueItem; compact?: boolean }) {
  return (
    <span className={cn("item-crest", rarityStyles[item.rarity].crest, compact ? "size-9" : "size-10")}>
      {item.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.iconUrl} alt="" className="h-full w-full object-contain p-1" draggable={false} />
      ) : (
        <span className="font-display text-xs text-[rgb(var(--bright-gold))]">{item.name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}
