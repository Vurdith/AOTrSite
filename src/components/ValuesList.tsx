"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import { categories, type ItemCategory, type ItemTrend, valueItems, type ValueItem } from "@/content/items";
import { cn } from "@/lib/cn";
import { rarityStyles } from "@/lib/rarityStyles";

type ValueMode = "keys" | "masks" | "scrolls";
type SortKey = "value" | "demand" | "tax" | "prestige";

const valueModes: Record<ValueMode, { label: string; shortLabel: string; unit: string; rate: number }> = {
  keys: { label: "Keys", shortLabel: "Keys", unit: "keys", rate: 1 },
  masks: { label: "Masks", shortLabel: "Masks", unit: "masks", rate: 900 },
  scrolls: { label: "Scrolls", shortLabel: "Scrolls", unit: "scrolls", rate: 3 },
};

const valueModeIcon: Record<ValueMode, string> = {
  keys: "key",
  masks: "mask",
  scrolls: "scroll",
};

const trendMeta: Record<ItemTrend, { label: string; className: string }> = {
  rising: {
    label: "Rising +8%",
    className: "trend-sigil-rising",
  },
  stable: {
    label: "Stable",
    className: "trend-sigil-stable",
  },
  falling: {
    label: "Falling -6%",
    className: "trend-sigil-falling",
  },
};

const prestigeLabels = ["Open trade", "Low gate", "Mid gate", "High gate"];
const pageSize = 8;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrencyValue(value: number, mode: ValueMode) {
  const amount = value / valueModes[mode].rate;
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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ValuesList() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ItemCategory>("all");
  const [selectedId, setSelectedId] = useState(valueItems[0]?.id ?? "");
  const [valueMode, setValueMode] = useState<ValueMode>("keys");
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [page, setPage] = useState(1);
  const [iconOverrides] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return valueItems
      .filter((item) => {
        const matchesCategory = category === "all" || item.category === category;
        const matchesQuery =
          !needle || `${item.name} ${item.category} ${item.rarity} prestige ${item.prestige} ${item.trend}`.toLowerCase().includes(needle);
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => {
        if (sortKey === "demand") return b.demand - a.demand;
        if (sortKey === "tax") return b.taxGems - a.taxGems;
        if (sortKey === "prestige") return b.prestige - a.prestige || b.value - a.value;
        return b.value - a.value;
      });
  }, [category, query, sortKey]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? valueItems[0];
  const selectedIcon = iconOverrides[selected.id] ?? selected.iconUrl ?? "";
  const selectedRank = valueItems.filter((item) => item.value > selected.value).length + 1;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstItemIndex = (currentPage - 1) * pageSize;
  const pagedItems = filtered.slice(firstItemIndex, firstItemIndex + pageSize);
  const visibleCategories = categories.filter((item) => item.id === "all" || valueItems.some((value) => value.category === item.id));

  return (
    <section className="px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="market-vellum p-4 md:p-5">
          <div className="market-board-head">
            <div className="title-lockup">
              <div>
                <h2 className="font-display text-3xl leading-none md:text-4xl">Market Values</h2>
                <p className="mt-2 text-sm text-[rgb(var(--fog)/.8)]">Search, sort, and add the selected item to the calculator.</p>
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
                    placeholder="Name, rarity, prestige"
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

          <div className="category-tabs" aria-label="Item categories">
            {visibleCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCategory(item.id);
                  setPage(1);
                }}
                aria-pressed={category === item.id}
                className={cn(
                  "category-tab",
                  category === item.id && "category-tab-active",
                )}
              >
                {item.label}
                <span>{item.id === "all" ? valueItems.length : valueItems.filter((value) => value.category === item.id).length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="market-ledger">
            <div className="ledger-columns mx-3 hidden gap-3 border-b border-[rgb(var(--gold)/.12)] px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--fog)/.72)] lg:grid">
              <span>Item</span>
              <SortHeader label="Value" sortKey="value" activeSort={sortKey} onSort={(nextSort) => {
                setSortKey(nextSort);
                setPage(1);
              }} />
              <span>Trend</span>
              <SortHeader label="Gem Tax" sortKey="tax" activeSort={sortKey} onSort={(nextSort) => {
                setSortKey(nextSort);
                setPage(1);
              }} />
              <SortHeader label="Demand" sortKey="demand" activeSort={sortKey} onSort={(nextSort) => {
                setSortKey(nextSort);
                setPage(1);
              }} />
              <SortHeader label="Prestige" sortKey="prestige" activeSort={sortKey} onSort={(nextSort) => {
                setSortKey(nextSort);
                setPage(1);
              }} />
            </div>

            <div className="space-y-2 p-2 md:p-3">
              {pagedItems.map((item) => (
                <ValueRow
                  key={item.id}
                  item={item}
                  iconUrl={iconOverrides[item.id] ?? item.iconUrl ?? ""}
                  selected={selected.id === item.id}
                  valueMode={valueMode}
                  onSelect={() => setSelectedId(item.id)}
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
                <p className="mt-2 text-zinc-400">Clear the search or switch category.</p>
              </div>
            )}
          </div>

          <aside className="detail-slate xl:sticky xl:top-24 xl:self-start">
            <div className="grid grid-cols-[58px_1fr] gap-3">
              <ItemIcon name={selected.name} iconUrl={selectedIcon} rarity={selected.rarity} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--bright-gold))]">Selected insight</p>
                <h2 className="font-display mt-1 text-2xl leading-7">{selected.name}</h2>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--fog)/.72)]">
                  <span className={rarityStyles[selected.rarity].text}>{rarityStyles[selected.rarity].label}</span> / {selected.category}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 text-sm">
              <InsightLine label="Value Rank" value={`#${selectedRank} by value`} />
              <InsightLine label="Prestige" value={`P${selected.prestige}`} />
              <InsightLine label="Demand" value={`${selected.demand}/100`} />
            </div>

            <div className="mt-4 rounded-[18px_6px_18px_6px] bg-black/18 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[rgb(var(--fog))]">Trade read</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{getTradeGuidance(selected)}</p>
            </div>

            <Link href="/calculator" className="royal-button primary-market-cta mt-5 inline-flex h-12 w-full items-center justify-center rounded-full text-xs font-bold uppercase tracking-[0.14em] text-white">
              <span>Add to calculator</span>
            </Link>
          </aside>
        </div>
      </div>
    </section>
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
  valueMode,
  onSelect,
}: {
  item: ValueItem;
  iconUrl: string;
  selected: boolean;
  valueMode: ValueMode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${item.name}, ${formatCurrencyValue(item.value, valueMode)}, ${trendMeta[item.trend].label}, ${formatNumber(item.taxGems)} gems tax, demand ${item.demand} out of 100, prestige P${item.prestige}`}
      className={cn(
        "market-row group w-full text-left",
        selected && "market-row-selected",
      )}
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

      <RowMetric label="Value" value={formatCurrencyValue(item.value, valueMode)} icon={valueModeIcon[valueMode]} />
      <div className="flex min-w-0 items-center lg:block">
        <span className="mr-2 text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--fog)/.62)] lg:hidden">Trend</span>
        <TrendBadge trend={item.trend} />
      </div>
      <RowMetric label="Tax" value={<GemValue value={item.taxGems} />} />
      <RowMetric label="Demand Score" value={<DemandScore value={item.demand} />} icon="demand" />
      <RowMetric label="Prestige" value={`P${item.prestige}`} icon="prestige" title={prestigeLabels[item.prestige]} />
    </button>
  );
}

function SortHeader({
  label,
  sortKey,
  activeSort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeSort: SortKey;
  onSort: (sortKey: SortKey) => void;
}) {
  const active = activeSort === sortKey;

  return (
    <button
      type="button"
      className={cn("sort-header", active && "sort-header-active")}
      onClick={() => onSort(sortKey)}
      aria-pressed={active}
      aria-label={`Sort by ${label}${active ? ", currently active descending" : ""}`}
    >
      {label}
      <span className="sort-indicator" aria-hidden="true" />
    </button>
  );
}

function RowMetric({ label, value, icon, title, strong = false }: { label: string; value: ReactNode; icon?: string; title?: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="block text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--fog)/.62)] lg:hidden">{label}</span>
      <strong className={cn("row-metric-value text-sm text-[rgb(var(--ink))]", strong && "font-display text-lg text-[rgb(var(--bright-gold))]")} title={title}>
        {icon === "demand" ? <span className="demand-orb" aria-hidden="true" /> : null}
        {icon && icon !== "demand" ? <GemIcon type={icon} className={cn("metric-icon", `trade-icon-${icon}`)} /> : null}
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

function InsightLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="insight-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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


