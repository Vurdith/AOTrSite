"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { getItemSource, type ItemTrend, type ValueItem } from "@/content/items";
import { cn } from "@/lib/cn";
import { rarityStyles } from "@/lib/rarityStyles";
import { getDisplayValue, getValueModes, type ValueCurrencySettings, type ValueMode } from "@/lib/valueCurrency";

const trendLabels: Record<ItemTrend, string> = {
  rising: "Rising",
  stable: "Stable",
  falling: "Falling",
};

const trendIcon: Record<ItemTrend, string> = {
  rising: "trend-rising",
  stable: "trend-stable",
  falling: "trend-falling",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatModeValue(value: number, mode: ValueMode, settings?: ValueCurrencySettings) {
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

export function ItemDetailModal({
  iconUrl,
  item,
  onClose,
  valueMode = "keys",
  valueRank,
  currencySettings,
}: {
  iconUrl?: string;
  item: ValueItem;
  onClose: () => void;
  valueMode?: ValueMode;
  valueRank?: number;
  currencySettings?: ValueCurrencySettings;
}) {
  const valueModes = getValueModes(currencySettings);

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
          <ItemThumb item={item} iconUrl={iconUrl} />
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
              <TradeIcon type={valueModes[mode].icon} className={cn("calculator-modal-value-icon", `trade-icon-${valueModes[mode].icon}`)} />
              <span>{valueModes[mode].label}</span>
              <strong>{formatModeValue(item.value, mode, currencySettings)}</strong>
            </div>
          ))}
        </div>

        <div className="calculator-modal-lines">
          {typeof valueRank === "number" ? <DetailLine icon="rank" label="Value Rank" value={`#${valueRank} by value`} /> : null}
          <DetailLine icon="gem" label="Gem Tax" value={`${formatNumber(item.taxGems)} gems`} />
          <DetailLine icon="demand" label="Demand" value={`${item.demand}/100`} />
          <DetailLine icon="prestige" label="Prestige" value={`P${item.prestige}`} />
          <DetailLine icon={trendIcon[item.trend]} label="Trend" value={trendLabels[item.trend]} />
          <DetailLine icon="source" label="Source" value={getItemSource(item)} />
        </div>

        <div className="calculator-modal-note">
          <span>Trade read</span>
          <p>{item.note || getTradeGuidance(item)}</p>
        </div>

        <div className="item-modal-actions">
          <Link
            href={`/calculator?item=${item.id}`}
            className="royal-button primary-market-cta item-modal-primary-action inline-flex h-12 w-full items-center justify-center rounded-full text-xs font-bold uppercase tracking-[0.14em] text-white"
          >
            Add to calculator
          </Link>
          <Link
            href={`/items/${item.id}`}
            className="item-modal-page-link item-modal-secondary-action inline-flex h-11 w-full items-center justify-center rounded-full text-xs font-bold uppercase tracking-[0.14em]"
          >
            View trade graph
          </Link>
        </div>
      </div>
    </div>
  );
}

function DetailLine({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="calculator-detail-line">
      <TradeIcon type={icon} className={cn("calculator-detail-image-icon", `trade-icon-${icon}`)} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ItemThumb({ iconUrl, item }: { iconUrl?: string; item: ValueItem }) {
  const src = iconUrl ?? item.iconUrl;

  return (
    <span className={cn("item-crest size-10", rarityStyles[item.rarity].crest)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain p-1" decoding="async" draggable={false} loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span className="font-display text-xs text-[rgb(var(--bright-gold))]">{item.name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

function TradeIcon({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn("gem-token", className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/icons/trade/${type}.png`} alt="" className="h-full w-full object-contain" decoding="async" draggable={false} loading="lazy" />
    </span>
  );
}
