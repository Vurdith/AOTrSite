"use client";

import { useMemo, useState, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calculator } from "lucide-react";

import { getItemSource, getItemValueHistory, type ItemTrend, type ValueItem, type ValueHistoryPoint } from "@/content/items";
import { cn } from "@/lib/cn";
import { rarityStyles } from "@/lib/rarityStyles";
import { getDisplayValue, getValueModes, type ValueCurrencySettings, type ValueMode } from "@/lib/valueCurrency";

const trendLabels = {
  rising: "Rising",
  stable: "Stable",
  falling: "Falling",
} as const;

type ChartRange = "1d" | "1w" | "1m" | "3m" | "1y" | "all";

type ActiveChartPoint = {
  date: string;
  displayValue: number;
  rawValue: number;
  x: number;
  y: number;
};

const chartRanges: { id: ChartRange; label: string; days?: number }[] = [
  { id: "1d", label: "1D", days: 1 },
  { id: "1w", label: "1W", days: 7 },
  { id: "1m", label: "1M", days: 30 },
  { id: "3m", label: "3M", days: 90 },
  { id: "1y", label: "1Y", days: 365 },
  { id: "all", label: "All" },
];

const categoryLabels = {
  auras: "Auras",
  families: "Families",
  perks: "Perks",
  cosmetics: "Cosmetics",
  artifacts: "Artifacts",
} as const;

const statIcons = {
  key: "/icons/trade/key.png",
  mask: "/icons/trade/mask.png",
  scroll: "/icons/trade/scroll.png",
  value: "/icons/trade/key.png",
  demand: "/icons/trade/demand.png",
  trend: "/icons/trade/trend-stable.png",
  tax: "/icons/trade/gem.png",
  prestige: "/icons/trade/prestige.png",
  source: "/icons/trade/source.png",
  category: "/icons/trade/category.png",
  note: "/icons/trade/notes.png",
} as const;

const trendIcons: Record<ItemTrend, string> = {
  rising: "/icons/trade/trend-rising.png",
  stable: "/icons/trade/trend-stable.png",
  falling: "/icons/trade/trend-falling.png",
};

const valueModeIcons: Record<ValueMode, string> = {
  keys: statIcons.key,
  masks: statIcons.mask,
  scrolls: statIcons.scroll,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 100 ? 1 : 0,
  }).format(value);
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

function formatPreciseModeValue(value: number, mode: ValueMode, settings?: ValueCurrencySettings) {
  const valueModes = getValueModes(settings);
  const amount = getDisplayValue(value, mode, settings);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 1,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 1,
  }).format(amount);

  return `${formatted} ${valueModes[mode].unit}`;
}

function parseHistoryDate(date: string) {
  return new Date(date.includes("T") ? date : `${date}T00:00:00`);
}

function formatDateLabel(date: string) {
  const parsedDate = parseHistoryDate(date);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

  return new Intl.DateTimeFormat("en-US", options).format(parsedDate);
}

function formatTimeLabel(date: string) {
  if (!date.includes("T")) return "";

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseHistoryDate(date));
}

function formatChartTooltipDate(date: string) {
  const parsedDate = parseHistoryDate(date);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
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

export function ItemValuePage({ currencySettings, item }: { currencySettings?: ValueCurrencySettings; item: ValueItem }) {
  const router = useRouter();
  const [range, setRange] = useState<ChartRange>("all");
  const [valueMode, setValueMode] = useState<ValueMode>("keys");
  const valueModes = useMemo(() => getValueModes(currencySettings), [currencySettings]);
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
        </div>

        <div className="item-page-hero">
          <div className="item-page-title-lockup">
            <span className={cn("item-page-rarity", rarityStyles[item.rarity].badge)}>{rarityStyles[item.rarity].label}</span>
            <h1 className="font-display">{item.name}</h1>
            <p>{item.note}</p>
          </div>

          <div className="item-page-icon-card">
            <span className={cn("item-crest item-page-icon-frame", rarityStyles[item.rarity].crest)}>
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
              <div className="item-chart-controls">
                <div className="item-chart-control-group">
                  <span>Display value as</span>
                  <div className="item-range-tabs" aria-label="Display value as">
                    {(Object.keys(valueModes) as ValueMode[]).map((mode) => (
                      <button key={mode} type="button" className={cn("item-range-tab", valueMode === mode && "item-range-tab-active")} onClick={() => setValueMode(mode)}>
                        <Image src={valueModeIcons[mode]} alt="" width={17} height={17} />
                        {valueModes[mode].shortLabel}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="item-chart-control-group">
                  <span>Range</span>
                  <div className="item-range-tabs" aria-label="Graph time range">
                    {chartRanges.map((item) => (
                      <button key={item.id} type="button" className={cn("item-range-tab", range === item.id && "item-range-tab-active")} onClick={() => setRange(item.id)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {hasHistory ? <ValueHistoryChart currencySettings={currencySettings} history={rangedHistory} valueMode={valueMode} /> : <NoHistoryState rangeLabel={rangeLabel} />}

            <div className="item-history-summary">
              <div className="item-history-summary-card">
                <Image src={valueModeIcons[valueMode]} alt="" width={24} height={24} />
                <span>Current value</span>
                <strong>{formatModeValue(item.value, valueMode, currencySettings)}</strong>
              </div>
              {change ? (
                <div className={cn("item-history-summary-card", changeIsPositive ? "item-change-positive" : "item-change-negative")}>
                  <Image src={changeIsPositive ? trendIcons.rising : trendIcons.falling} alt="" width={24} height={24} />
                  <span>{rangeLabel} change</span>
                  <strong>
                    {changeIsPositive ? "+" : "-"}
                    {formatModeValue(Math.abs(change.delta), valueMode, currencySettings)} ({changeIsPositive ? "+" : ""}
                    {change.percent.toFixed(1)}%)
                  </strong>
                </div>
              ) : (
                <div className="item-history-summary-card">
                  <Image src={trendIcons.stable} alt="" width={24} height={24} />
                  <span>Period change</span>
                  <strong>No real history yet</strong>
                </div>
              )}
            </div>
            <ValueHistoryTimeline currencySettings={currencySettings} history={history} valueMode={valueMode} />
          </div>

          <aside className="item-stat-panel">
            <ItemStat icon={valueModeIcons[valueMode]} label="Value" value={formatModeValue(item.value, valueMode, currencySettings)} />
            <ItemStat icon={statIcons.demand} label="Demand" value={`${item.demand}/100`} />
            <ItemStat icon={trendIcons[item.trend]} label="Trend" value={trendLabels[item.trend]} />
            <ItemStat icon={statIcons.tax} label="Gem Tax" value={`${formatNumber(item.taxGems)} gems`} />
            <ItemStat icon={statIcons.prestige} label="Prestige" value={`P${item.prestige}`} />
            <ItemStat icon={statIcons.source} label="Source" value={getItemSource(item)} />
            <ItemStat icon={statIcons.category} label="Category" value={categoryLabels[item.category]} />
            <ItemStat icon={statIcons.note} label="Notes" value={item.note} wide />
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

function ValueHistoryTimeline({ currencySettings, history, valueMode }: { currencySettings?: ValueCurrencySettings; history: ValueHistoryPoint[]; valueMode: ValueMode }) {
  const entries = [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  if (!entries.length) return null;

  return (
    <div className="item-history-timeline">
      <span>Recent value changes</span>
      {entries.map((point, index) => {
        const previous = entries[index + 1];
        const delta = previous ? point.value - previous.value : 0;

        return (
          <div key={`${point.date}-${index}`} className="item-history-timeline-row">
            <strong>{formatChartTooltipDate(point.date)}</strong>
            <span>{formatModeValue(point.value, valueMode, currencySettings)}</span>
            {previous ? <small className={delta >= 0 ? "text-emerald-200" : "text-red-200"}>{delta >= 0 ? "+" : "-"}{formatModeValue(Math.abs(delta), valueMode, currencySettings)}</small> : <small>Baseline</small>}
          </div>
        );
      })}
    </div>
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

function ItemStat({ icon, label, value, wide = false }: { icon: string; label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("item-stat-row", wide && "item-stat-row-wide")}>
      <Image src={icon} alt="" width={25} height={25} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ValueHistoryChart({
  currencySettings,
  history,
  valueMode,
}: {
  currencySettings?: ValueCurrencySettings;
  history: ValueHistoryPoint[];
  valueMode: ValueMode;
}) {
  const width = 760;
  const height = 360;
  const [activePoint, setActivePoint] = useState<ActiveChartPoint | null>(null);
  const padding = { top: 34, right: 44, bottom: 76, left: 78 };
  const values = history.map((point) => getDisplayValue(point.value, valueMode, currencySettings));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(1, maxValue - minValue);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = history.map((point, index) => {
    const x = padding.left + (history.length === 1 ? plotWidth : (index / (history.length - 1)) * plotWidth);
    const displayValue = getDisplayValue(point.value, valueMode, currencySettings);
    const y = padding.top + ((maxValue - displayValue) / range) * plotHeight;

    return { ...point, displayValue, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(2)} ${height - padding.bottom} L ${points[0].x.toFixed(2)} ${height - padding.bottom} Z`;
  const labelStep = Math.max(1, Math.ceil((points.length - 1) / 4));
  const visibleLabelIndexes = new Set(points.map((_, index) => index).filter((index) => index === 0 || index === points.length - 1 || index % labelStep === 0));
  const activeTooltipWidth = 174;
  const activeTooltipHeight = 76;
  const activeTooltipX = activePoint ? Math.min(width - padding.right - activeTooltipWidth, Math.max(padding.left, activePoint.x - activeTooltipWidth / 2)) : 0;
  const activeTooltipY = activePoint ? Math.max(12, activePoint.y - activeTooltipHeight - 18) : 0;
  const activeDelta = activePoint ? activePoint.rawValue - points[0].value : 0;
  const activeDeltaPercent = activePoint && points[0].value ? (activeDelta / points[0].value) * 100 : 0;

  function setActiveFromPoint(point: (typeof points)[number]) {
    setActivePoint({
      date: point.date,
      displayValue: point.displayValue,
      rawValue: point.value,
      x: point.x,
      y: point.y,
    });
  }

  function getSvgPointer(event: PointerEvent<SVGElement>) {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return null;

    const matrix = svg.getScreenCTM();
    if (matrix) {
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;

      return point.matrixTransform(matrix.inverse());
    }

    const bounds = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * width,
      y: ((event.clientY - bounds.top) / bounds.height) * height,
    };
  }

  function setActiveFromPointer(event: PointerEvent<SVGElement>) {
    const pointer = getSvgPointer(event);
    if (!pointer) return;

    const pointerX = pointer.x;
    const pointX = Math.min(width - padding.right, Math.max(padding.left, pointerX));

    if (points.length === 1) {
      setActiveFromPoint(points[0]);
      return;
    }

    if (pointX <= points[0].x) {
      setActiveFromPoint(points[0]);
      return;
    }

    if (pointX >= points[points.length - 1].x) {
      setActiveFromPoint(points[points.length - 1]);
      return;
    }

    const pointSnapRadius = Math.max(18, plotWidth / Math.max(24, points.length * 8));
    const nearestPoint = points.reduce((best, point) => {
      const distance = Math.abs(point.x - pointX);
      return distance < best.distance ? { distance, point } : best;
    }, { distance: Number.POSITIVE_INFINITY, point: points[0] });

    if (nearestPoint.distance <= pointSnapRadius) {
      setActiveFromPoint(nearestPoint.point);
      return;
    }

    const nextIndex = points.findIndex((point, index) => index > 0 && pointX <= point.x);
    const endIndex = nextIndex === -1 ? points.length - 1 : nextIndex;
    const startIndex = Math.max(0, endIndex - 1);
    const start = points[startIndex];
    const end = points[endIndex];
    const segmentWidth = Math.max(1, end.x - start.x);
    const progress = start === end ? 0 : (pointX - start.x) / segmentWidth;
    const rawValue = start.value + (end.value - start.value) * progress;
    const displayValue = getDisplayValue(rawValue, valueMode, currencySettings);
    const startTime = parseHistoryDate(start.date).getTime();
    const endTime = parseHistoryDate(end.date).getTime();
    const date = new Date(startTime + (endTime - startTime) * progress).toISOString();
    const y = start.y + (end.y - start.y) * progress;

    setActivePoint({ date, displayValue, rawValue, x: pointX, y });
  }

  return (
    <div className="item-chart-wrap" onMouseLeave={() => setActivePoint(null)}>
      <svg className="item-history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Item value history graph">
        <defs>
          <linearGradient id="itemChartArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--bright-gold))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="rgb(var(--bright-gold))" stopOpacity="0.02" />
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
          visibleLabelIndexes.has(index) ? (
            <line key={`x-${point.date}-${index}`} x1={point.x} x2={point.x} y1={padding.top} y2={height - padding.bottom} className="item-chart-grid item-chart-grid-vertical" />
          ) : null,
        )}
        <path d={areaPath} fill="url(#itemChartArea)" />
        <path d={path} className="item-chart-line" />
        {activePoint ? (
          <g className="item-chart-active-layer" pointerEvents="none">
            <line x1={activePoint.x} x2={activePoint.x} y1={padding.top} y2={height - padding.bottom} className="item-chart-active-line" />
            <line x1={padding.left} x2={width - padding.right} y1={activePoint.y} y2={activePoint.y} className="item-chart-active-line item-chart-active-line-horizontal" />
            <circle cx={activePoint.x} cy={activePoint.y} r="8" className="item-chart-active-dot" />
            <rect x={activeTooltipX} y={activeTooltipY} width={activeTooltipWidth} height={activeTooltipHeight} rx="12" className="item-chart-tooltip-box" />
            <text x={activeTooltipX + 14} y={activeTooltipY + 21} className="item-chart-tooltip-label">
              {formatChartTooltipDate(activePoint.date)}
            </text>
            <text x={activeTooltipX + 14} y={activeTooltipY + 44} className="item-chart-tooltip-value">
              {formatPreciseModeValue(activePoint.rawValue, valueMode, currencySettings)}
            </text>
            <text x={activeTooltipX + 14} y={activeTooltipY + 62} className={activeDelta >= 0 ? "item-chart-tooltip-good" : "item-chart-tooltip-bad"}>
              {activeDelta >= 0 ? "+" : ""}
              {formatPreciseModeValue(Math.abs(activeDelta), valueMode, currencySettings)} / {activeDelta >= 0 ? "+" : ""}
              {activeDeltaPercent.toFixed(1)}%
            </text>
          </g>
        ) : null}
        {points.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4.5" className="item-chart-dot" />
            <circle
              cx={point.x}
              cy={point.y}
              r="16"
              className="item-chart-hit-area"
              onBlur={() => setActivePoint(null)}
              onFocus={() => setActiveFromPoint(point)}
              onMouseEnter={() => setActiveFromPoint(point)}
              tabIndex={0}
            />
            <title>{`${formatDateLabel(point.date)} / ${formatModeValue(point.value, valueMode, currencySettings)}`}</title>
            {visibleLabelIndexes.has(index) ? (
              <text
                x={point.x}
                y={height - 33}
                textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                className="item-chart-axis item-chart-date"
              >
                <tspan x={point.x} dy="0">
                  {formatDateLabel(point.date)}
                </tspan>
                {formatTimeLabel(point.date) ? (
                  <tspan x={point.x} dy="13">
                    {formatTimeLabel(point.date)}
                  </tspan>
                ) : null}
              </text>
            ) : null}
          </g>
        ))}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          className="item-chart-magnetic-layer"
          onPointerEnter={setActiveFromPointer}
          onPointerMove={setActiveFromPointer}
        />
      </svg>
    </div>
  );
}
