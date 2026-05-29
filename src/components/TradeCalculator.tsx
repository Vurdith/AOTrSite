"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Info, Plus, Search, X } from "lucide-react";

import { categories, type ItemCategory, type ItemTrend, valueItems, type ValueItem } from "@/content/items";
import { cn } from "@/lib/cn";
import { rarityStyles } from "@/lib/rarityStyles";

type Side = "yours" | "theirs";
type FilledTradeSlot = { item: ValueItem; quantity: number };
type TradeSlot = FilledTradeSlot | null;
type ActiveSlot = { side: Side; index: number };
type ValueMode = "keys" | "masks" | "scrolls";

const valueModes: Record<ValueMode, { label: string; shortLabel: string; unit: string; rate: number; icon: string }> = {
  keys: { label: "Keys", shortLabel: "Keys", unit: "keys", rate: 1, icon: "key" },
  masks: { label: "Masks", shortLabel: "Masks", unit: "masks", rate: 900, icon: "mask" },
  scrolls: { label: "Scrolls", shortLabel: "Scrolls", unit: "scrolls", rate: 3, icon: "scroll" },
};

const trendLabels: Record<ItemTrend, string> = {
  rising: "Rising",
  stable: "Stable",
  falling: "Falling",
};

const detailIconClasses = {
  gem: {
    slot: "calculator-detail-icon-slot calculator-detail-icon-slot-gem",
    glyph: "calculator-detail-glyph calculator-detail-glyph-gem",
  },
  demand: {
    slot: "calculator-detail-icon-slot calculator-detail-icon-slot-demand",
    glyph: "calculator-detail-glyph calculator-detail-glyph-demand",
  },
  prestige: {
    slot: "calculator-detail-icon-slot calculator-detail-icon-slot-prestige",
    glyph: "calculator-detail-glyph calculator-detail-glyph-prestige",
  },
  trend: {
    slot: "calculator-detail-icon-slot calculator-detail-icon-slot-trend",
    glyph: "calculator-detail-glyph calculator-detail-glyph-trend",
  },
} as const;

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

export function TradeCalculator() {
  const [yours, setYours] = useState<TradeSlot[]>([{ item: valueItems[2], quantity: 1 }, { item: valueItems[5], quantity: 1 }, ...Array<TradeSlot>(7).fill(null)]);
  const [theirs, setTheirs] = useState<TradeSlot[]>([{ item: valueItems[1], quantity: 1 }, ...Array<TradeSlot>(8).fill(null)]);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>({ side: "yours", index: 2 });
  const [valueMode, setValueMode] = useState<ValueMode>("keys");
  const [category, setCategory] = useState<"all" | ItemCategory>("all");
  const [detailItem, setDetailItem] = useState<ValueItem | null>(null);
  const [query, setQuery] = useState("");

  const yourTotal = yours.reduce((sum, slot) => sum + (slot ? slot.item.value * slot.quantity : 0), 0);
  const theirTotal = theirs.reduce((sum, slot) => sum + (slot ? slot.item.value * slot.quantity : 0), 0);
  const receiveGemTaxTotal = theirs.reduce((sum, slot) => sum + (slot ? slot.item.taxGems * slot.quantity : 0), 0);
  const yourCount = yours.filter(Boolean).length;
  const theirCount = theirs.filter(Boolean).length;
  const diff = theirTotal - yourTotal;
  const favor = diff >= 0 ? "Favors you" : "Overpay";
  const targetLabel = `${activeSlot.side === "yours" ? "Your" : "Their"} slot ${activeSlot.index + 1}`;
  const visibleCategories = categories.filter((item) => item.id === "all" || valueItems.some((value) => value.category === item.id));
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return valueItems.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesQuery =
        !needle || `${item.name} ${item.rarity} ${item.trend} ${item.demand} ${item.taxGems} P${item.prestige}`.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  function setSlot(side: Side, index: number, item: TradeSlot) {
    const setter = side === "yours" ? setYours : setTheirs;
    setter((current) => current.map((slot, slotIndex) => (slotIndex === index ? item : slot)));
  }

  function pickSlot(side: Side, index: number) {
    setActiveSlot({ side, index });
  }

  function pickItem(item: ValueItem) {
    const setter = activeSlot.side === "yours" ? setYours : setTheirs;
    setter((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === activeSlot.index
          ? { item, quantity: slot?.quantity ?? 1 }
          : slot,
      ),
    );
  }

  function setQuantity(side: Side, index: number, quantity: number) {
    const setter = side === "yours" ? setYours : setTheirs;
    setter((current) =>
      current.map((slot, slotIndex) =>
        slot && slotIndex === index
          ? { ...slot, quantity: Math.min(99, Math.max(1, quantity)) }
          : slot,
      ),
    );
  }

  return (
    <section className="px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="market-vellum p-4 md:p-5">
          <div className="market-board-head">
            <div className="title-lockup">
              <div>
                <h2 className="font-display text-3xl leading-none md:text-4xl">Calculator Items</h2>
                <p className="mt-2 text-sm text-[rgb(var(--fog)/.8)]">Search, filter, and choose how trade values are shown.</p>
              </div>
            </div>

            <div className="market-actions">
              <div className="search-control">
                <span>Find item</span>
                <label className="search-channel" title="Search applies within the selected category.">
                  <span className="sr-only">Search calculator items</span>
                  <Search className="ml-3 size-4 shrink-0 text-[rgb(var(--fog)/.66)]" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Name, rarity, prestige"
                    className="h-10 w-full min-w-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-[rgb(var(--fog)/.48)]"
                  />
                  {query ? (
                    <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Clear search">
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

          <div className="category-tabs" aria-label="Item categories">
            {visibleCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                aria-pressed={category === item.id}
                className={cn("category-tab", category === item.id && "category-tab-active")}
              >
                {item.label}
                <span>{item.id === "all" ? valueItems.length : valueItems.filter((value) => value.category === item.id).length}</span>
              </button>
            ))}
          </div>
        </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
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
              <small>{diff >= 0 ? "Receiving more than you give" : "Giving more than you receive"}</small>
            </div>
          </div>

          <div className="calculator-tax-summary mt-4">
            <StatChip label="Gem tax to receive" value={receiveGemTaxTotal ? `${receiveGemTaxTotal.toLocaleString()} gems total` : "No gem tax to receive"} icon="gem" />
            <StatChip label="Gold tax to receive" value="No gold tax listed" icon="gold" />
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
              side="theirs"
              title="You get"
              total={`${formatModeValue(theirTotal, valueMode)} in value`}
              valueIcon={valueModes[valueMode].icon}
            />
          </div>
        </div>

        <aside className="detail-slate lg:sticky lg:top-24 lg:self-start">
          <div className="calculator-picker-head">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--bright-gold))]">Item picker</p>
              <h2 className="font-display mt-1 text-2xl">{targetLabel}</h2>
            </div>
          </div>

          <div className="calculator-picker-list mt-4">
            {filteredItems.map((item) => (
              <button key={item.id} className="calculator-picker-row" onClick={() => pickItem(item)} type="button">
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
        </aside>
      </div>
      {detailItem ? (
        <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} valueMode={valueMode} />
      ) : null}
      </div>
    </section>
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
  icon: "gem" | "gold" | "key" | "target" | "value";
  valueIcon?: string;
}) {
  const selectedValueIcon = valueIcon ?? "key";

  return (
    <div className="calculator-stat-chip">
      {icon === "key" || icon === "gem" ? <TradeMetricIcon type={icon} /> : null}
      {icon === "value" ? (
        <CalcValueIcon type={selectedValueIcon} className={cn("calculator-value-stat-icon", `trade-icon-${selectedValueIcon}`)} />
      ) : null}
      {icon === "target" ? <span className="stat-glyph stat-glyph-prestige" aria-hidden="true" /> : null}
      {icon === "gold" ? <span className="calculator-gold-tax-icon" aria-hidden="true" /> : null}
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
  slotNumber,
}: {
  active: boolean;
  item: TradeSlot;
  onPick: () => void;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onView: (item: ValueItem) => void;
  slotNumber: number;
}) {
  if (!item) {
    return (
      <button className={cn("calculator-slot calculator-slot-empty", active && "calculator-slot-active")} onClick={onPick} type="button">
        <span className="calculator-slot-plus">
          <Plus size={18} strokeWidth={2.4} />
        </span>
        <small>Slot {slotNumber}</small>
      </button>
    );
  }

  const itemData = item.item;

  return (
    <div className={cn("calculator-slot calculator-slot-filled", active && "calculator-slot-active")} onClick={onPick} role="button" tabIndex={0} onKeyDown={(event) => {
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
        <div className="calculator-slot-footer">
          <button
            type="button"
            className="calculator-slot-view"
            onClick={(event) => {
              event.stopPropagation();
              onView(itemData);
            }}
          >
            <Info size={11} strokeWidth={2.4} />
            Data
          </button>
          <div className="calculator-quantity-control" aria-label={`${itemData.name} quantity`}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onQuantity(item.quantity - 1);
              }}
              disabled={item.quantity <= 1}
              aria-label={`Decrease ${itemData.name} quantity`}
            >
              -
            </button>
            <span>x{item.quantity}</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onQuantity(item.quantity + 1);
              }}
              aria-label={`Increase ${itemData.name} quantity`}
            >
              +
            </button>
          </div>
        </div>
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
        </div>

        <div className="calculator-modal-note">
          <span>Trade read</span>
          <p>{item.note}</p>
        </div>
      </div>
    </div>
  );
}

function DetailLine({ icon, label, value }: { icon: "gem" | "demand" | "prestige" | "trend"; label: string; value: string }) {
  return (
    <div className="calculator-detail-line">
      <DetailIcon type={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailIcon({ type }: { type: "gem" | "demand" | "prestige" | "trend" }) {
  const classNames = detailIconClasses[type];

  return (
    <span className={classNames.slot} aria-hidden="true">
      <span className={classNames.glyph} />
    </span>
  );
}

function CalcValueIcon({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn("gem-token", className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/icons/trade/${type}.png`} alt="" className="h-full w-full object-contain" draggable={false} />
    </span>
  );
}

function TradeMetricIcon({ type }: { type: "key" | "gem" }) {
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
