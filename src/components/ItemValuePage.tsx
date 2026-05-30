"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calculator, TrendingDown, TrendingUp } from "lucide-react";

import { getItemSource, getItemValueHistory, type ValueItem, type ValueHistoryPoint } from "@/content/items";
import { cn } from "@/lib/cn";
import { rarityStyles } from "@/lib/rarityStyles";

const trendLabels = {
  rising: "Rising",
  stable: "Stable",
  falling: "Falling",
} as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 100 ? 1 : 0,
  }).format(value);
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function getHistoryChange(history: ValueHistoryPoint[]) {
  const first = history[0]?.value ?? 0;
  const last = history[history.length - 1]?.value ?? 0;
  const delta = last - first;
  const percent = first ? (delta / first) * 100 : 0;

  return { delta, percent };
}

export function ItemValuePage({ item }: { item: ValueItem }) {
  const router = useRouter();
  const history = getItemValueHistory(item);
  const change = getHistoryChange(history);
  const changeIsPositive = change.delta >= 0;

  return (
    <section className="item-page-shell px-4 pb-10 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="item-page-actions">
          <button type="button" className="item-page-back" onClick={() => router.back()}>
            <ArrowLeft size={17} strokeWidth={2.4} />
            Go back
          </button>
          <Link href="/values" className="item-page-back item-page-back-secondary">
            Value list
          </Link>
        </div>

        <div className="item-page-hero">
          <div className="item-page-title-lockup">
            <span className={cn("item-page-rarity", rarityStyles[item.rarity].badge)}>{rarityStyles[item.rarity].label}</span>
            <h1 className="font-display">{item.name}</h1>
            <p>{item.note}</p>
          </div>

          <div className="item-page-icon-card">
            <span className={cn("item-page-icon-frame", rarityStyles[item.rarity].crest)}>
              {item.iconUrl ? <Image src={item.iconUrl} alt="" width={86} height={86} /> : <span>{item.name.slice(0, 2).toUpperCase()}</span>}
            </span>
          </div>
        </div>

        <div className="item-page-grid">
          <div className="item-history-panel">
            <div className="item-section-head">
              <span>Value history</span>
              <h2 className="font-display">Trade Graph</h2>
            </div>

            <ValueHistoryChart history={history} />

            <div className="item-history-summary">
              <div>
                <span>Current value</span>
                <strong>{formatNumber(item.value)} keys</strong>
              </div>
              <div className={changeIsPositive ? "item-change-positive" : "item-change-negative"}>
                <span>Period change</span>
                <strong>
                  {changeIsPositive ? "+" : ""}
                  {formatNumber(change.delta)} keys ({changeIsPositive ? "+" : ""}
                  {change.percent.toFixed(1)}%)
                </strong>
              </div>
            </div>
          </div>

          <aside className="item-stat-panel">
            <ItemStat label="Demand" value={`${item.demand}/100`} />
            <ItemStat label="Trend" value={trendLabels[item.trend]} />
            <ItemStat label="Gem Tax" value={`${formatNumber(item.taxGems)} gems`} />
            <ItemStat label="Prestige" value={`P${item.prestige}`} />
            <ItemStat label="Source" value={getItemSource(item)} />
            <Link href={`/calculator?item=${item.id}`} className="item-page-calculator">
              <Calculator size={16} strokeWidth={2.4} />
              Add to calculator
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ItemStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="item-stat-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ValueHistoryChart({ history }: { history: ValueHistoryPoint[] }) {
  const width = 720;
  const height = 300;
  const padding = { top: 24, right: 20, bottom: 46, left: 68 };
  const values = history.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(1, maxValue - minValue);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = history.map((point, index) => {
    const x = padding.left + (history.length === 1 ? plotWidth : (index / (history.length - 1)) * plotWidth);
    const y = padding.top + ((maxValue - point.value) / range) * plotHeight;

    return { ...point, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(2)} ${height - padding.bottom} L ${points[0].x.toFixed(2)} ${height - padding.bottom} Z`;
  const rising = points[points.length - 1].value >= points[0].value;

  return (
    <div className="item-chart-wrap">
      <svg className="item-history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Item value history graph">
        <defs>
          <linearGradient id="itemChartArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--bright-gold))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(var(--bright-gold))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = padding.top + tick * plotHeight;
          const value = maxValue - tick * range;

          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="item-chart-grid" />
              <text x={padding.left - 12} y={y + 4} textAnchor="end" className="item-chart-axis">
                {formatNumber(value)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#itemChartArea)" />
        <path d={path} className={cn("item-chart-line", rising ? "item-chart-line-rising" : "item-chart-line-falling")} />
        {points.map((point) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r="4.5" className="item-chart-dot" />
            <text x={point.x} y={height - 18} textAnchor="middle" className="item-chart-axis">
              {formatDateLabel(point.date)}
            </text>
          </g>
        ))}
      </svg>
      <div className={cn("item-chart-badge", rising ? "item-change-positive" : "item-change-negative")}>
        {rising ? <TrendingUp size={15} strokeWidth={2.4} /> : <TrendingDown size={15} strokeWidth={2.4} />}
        {rising ? "Up over period" : "Down over period"}
      </div>
    </div>
  );
}
