"use client";

import { useMemo, useState } from "react";
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

type ChartRange = "1d" | "1w" | "1m" | "3m" | "1y" | "all";

const chartRanges: { id: ChartRange; label: string; days?: number }[] = [
  { id: "1d", label: "1D", days: 1 },
  { id: "1w", label: "1W", days: 7 },
  { id: "1m", label: "1M", days: 30 },
  { id: "3m", label: "3M", days: 90 },
  { id: "1y", label: "1Y", days: 365 },
  { id: "all", label: "All" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 100 ? 1 : 0,
  }).format(value);
}

function parseHistoryDate(date: string) {
  return new Date(date.includes("T") ? date : `${date}T00:00:00`);
}

function formatDateLabel(date: string) {
  const parsedDate = parseHistoryDate(date);
  const options: Intl.DateTimeFormatOptions = date.includes("T")
    ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { month: "short", day: "numeric" };

  return new Intl.DateTimeFormat("en-US", options).format(parsedDate);
}

function formatRangeLabel(range: ChartRange) {
  return chartRanges.find((item) => item.id === range)?.label ?? "All";
}

function getHistoryChange(history: ValueHistoryPoint[]) {
  const first = history[0]?.value ?? 0;
  const last = history[history.length - 1]?.value ?? 0;
  const delta = last - first;
  const percent = first ? (delta / first) * 100 : 0;

  return { delta, percent };
}

function filterHistoryByRange(history: ValueHistoryPoint[], range: ChartRange) {
  const selectedRange = chartRanges.find((item) => item.id === range);

  if (!selectedRange?.days) return history;

  const latestTime = Math.max(...history.map((point) => parseHistoryDate(point.date).getTime()));
  const cutoff = latestTime - selectedRange.days * 24 * 60 * 60 * 1000;
  const visible = history.filter((point) => parseHistoryDate(point.date).getTime() >= cutoff);

  if (visible.length > 1) return visible;

  const previousPoint = [...history].reverse().find((point) => parseHistoryDate(point.date).getTime() < cutoff);

  return previousPoint && visible.length ? [previousPoint, ...visible] : visible;
}

export function ItemValuePage({ item }: { item: ValueItem }) {
  const router = useRouter();
  const [range, setRange] = useState<ChartRange>("all");
  const history = [...getItemValueHistory(item)].sort((a, b) => a.date.localeCompare(b.date));
  const rangedHistory = useMemo(() => filterHistoryByRange(history, range), [history, range]);
  const hasHistory = rangedHistory.length > 1;
  const change = hasHistory ? getHistoryChange(rangedHistory) : null;
  const changeIsPositive = (change?.delta ?? 0) >= 0;
  const rangeLabel = formatRangeLabel(range);

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
            <div className="item-chart-header">
              <div className="item-section-head">
                <span>Value history</span>
                <h2 className="font-display">Trade Graph</h2>
              </div>
              <div className="item-range-tabs" aria-label="Graph time range">
                {chartRanges.map((item) => (
                  <button key={item.id} type="button" className={cn("item-range-tab", range === item.id && "item-range-tab-active")} onClick={() => setRange(item.id)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {hasHistory ? <ValueHistoryChart history={rangedHistory} rangeLabel={rangeLabel} /> : <NoHistoryState rangeLabel={rangeLabel} />}

            <div className="item-history-summary">
              <div>
                <span>Current value</span>
                <strong>{formatNumber(item.value)} keys</strong>
              </div>
              {change ? (
                <div className={changeIsPositive ? "item-change-positive" : "item-change-negative"}>
                  <span>{rangeLabel} change</span>
                  <strong>
                    {changeIsPositive ? "+" : ""}
                    {formatNumber(change.delta)} keys ({changeIsPositive ? "+" : ""}
                    {change.percent.toFixed(1)}%)
                  </strong>
                </div>
              ) : (
                <div>
                  <span>Period change</span>
                  <strong>No real history yet</strong>
                </div>
              )}
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

function NoHistoryState({ rangeLabel }: { rangeLabel: string }) {
  return (
    <div className="item-history-empty">
      <span>Not enough {rangeLabel} data</span>
      <p>Value changes saved in admin will add timestamped points here.</p>
    </div>
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

function ValueHistoryChart({ history, rangeLabel }: { history: ValueHistoryPoint[]; rangeLabel: string }) {
  const width = 720;
  const height = 340;
  const padding = { top: 36, right: 26, bottom: 58, left: 76 };
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
  const labelStep = Math.max(1, Math.ceil((points.length - 1) / 4));

  return (
    <div className="item-chart-wrap">
      <svg className="item-history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Item value history graph">
        <defs>
          <linearGradient id="itemChartArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={rising ? "rgb(167 243 208)" : "rgb(254 202 202)"} stopOpacity="0.28" />
            <stop offset="100%" stopColor={rising ? "rgb(167 243 208)" : "rgb(254 202 202)"} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="itemChartStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgb(var(--bright-gold))" />
            <stop offset="100%" stopColor={rising ? "rgb(167 243 208)" : "rgb(254 202 202)"} />
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
        {points.map((point, index) =>
          index === 0 || index === points.length - 1 || index % labelStep === 0 ? (
            <line key={`x-${point.date}-${index}`} x1={point.x} x2={point.x} y1={padding.top} y2={height - padding.bottom} className="item-chart-grid item-chart-grid-vertical" />
          ) : null,
        )}
        <path d={areaPath} fill="url(#itemChartArea)" />
        <path d={path} className="item-chart-line" />
        {points.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4.5" className="item-chart-dot" />
            <title>{`${formatDateLabel(point.date)} / ${formatNumber(point.value)} keys`}</title>
            {index === 0 || index === points.length - 1 || index % labelStep === 0 ? (
              <text x={point.x} y={height - 18} textAnchor="middle" className="item-chart-axis">
                {formatDateLabel(point.date)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <div className={cn("item-chart-badge", rising ? "item-change-positive" : "item-change-negative")}>
        {rising ? <TrendingUp size={15} strokeWidth={2.4} /> : <TrendingDown size={15} strokeWidth={2.4} />}
        {rising ? "Up" : "Down"} / {rangeLabel}
      </div>
    </div>
  );
}
