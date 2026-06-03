import { categories, type ItemTrend, updateLog, valueItems, type ValueItem } from "@/content/items";
import { cn } from "@/lib/cn";
import { rarityStyles } from "@/lib/rarityStyles";

const trendMeta: Record<ItemTrend, { label: string; className: string; icon: string }> = {
  rising: {
    label: "Rising +8%",
    className: "trend-sigil-rising",
    icon: "trend-rising",
  },
  stable: {
    label: "Unchanged",
    className: "update-unchanged-pill",
    icon: "trend-stable",
  },
  falling: {
    label: "Falling -6%",
    className: "trend-sigil-falling",
    icon: "trend-falling",
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 100 ? 1 : 0,
  }).format(value);
}

function getUpdateRead(item: ValueItem) {
  if (item.trend === "falling") return "Moved down this pass; avoid overpaying until offers settle.";
  if (item.trend === "rising") return "Momentum is up; current value should be watched closely.";
  if (item.demand >= 70) return "Demand score was refreshed and remains strong.";
  return "Imported into the current board with no visible movement flags.";
}

function getUpdatedItems(items: ValueItem[]) {
  return [...items]
    .sort((a, b) => {
      const trendWeight = Number(b.trend !== "stable") - Number(a.trend !== "stable");
      return trendWeight || b.demand - a.demand || b.value - a.value;
    })
    .slice(0, 14);
}

function getCategoryLeaders(items: ValueItem[]) {
  return categories
    .filter((category) => category.id !== "all")
    .map((category) => {
      const categoryItems = items.filter((item) => item.category === category.id);
      const leader = [...categoryItems].sort((a, b) => b.demand - a.demand || b.value - a.value)[0];
      return leader ? { category: category.label, item: leader, count: categoryItems.length } : null;
    })
    .filter(Boolean) as { category: string; item: ValueItem; count: number }[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UpdatesList({ items = valueItems }: { items?: ValueItem[] }) {
  const updatedItems = getUpdatedItems(items);
  const leaders = getCategoryLeaders(items);
  const changedTrendCount = items.filter((item) => item.trend !== "stable").length;
  const dominantItem = [...items].sort((a, b) => b.demand - a.demand || b.value - a.value)[0];

  return (
    <section className="px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="market-vellum p-4 md:p-5">
          <div className="market-board-head">
            <div className="title-lockup">
              <div>
                <h2 className="font-display text-3xl leading-none md:text-4xl">Update Ledger</h2>
                <p className="mt-2 text-sm text-[rgb(var(--fog)/.8)]">
                  Current board changes displayed in the same cells as the value list.
                </p>
              </div>
            </div>

            <div className="update-summary-strip" aria-label="Update summary">
              <SummaryStat label="Board notes" value={updateLog.length.toString()} />
              <SummaryStat label="Moved trend" value={changedTrendCount.toString()} />
              <SummaryStat label="Top demand" value={dominantItem ? dominantItem.demand.toString() : "0"} />
            </div>
          </div>

        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="market-ledger">
            <div className="ledger-columns mx-3 hidden gap-3 border-b border-[rgb(var(--gold)/.12)] px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--fog)/.72)] lg:grid">
              <span>Item</span>
              <span>Value</span>
              <span>Trend</span>
              <span>Gem Tax</span>
              <span>Demand</span>
              <span>Prestige</span>
            </div>

            <div className="space-y-2 p-2 md:p-3">
              {updatedItems.map((item) => (
                <UpdateRow key={item.id} item={item} />
              ))}
            </div>
          </div>

          <aside className="grid gap-5 xl:sticky xl:top-24 xl:self-start">
            <div className="detail-slate">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--bright-gold))]">Dominating items</p>
                <h2 className="font-display mt-2 text-2xl">Category leaders</h2>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--fog)/.78)]">
                  Highest demand item inside each populated category.
                </p>
              </div>

              <div className="mt-5 grid gap-2">
                {leaders.map(({ category, item, count }) => (
                  <article key={category} className="update-demand-row">
                    <ItemIcon name={item.name} iconUrl={item.iconUrl ?? ""} rarity={item.rarity} compact />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--bright-gold))]">
                        {category} / {count}
                      </p>
                      <h3 className="mt-1 truncate font-display">{item.name}</h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.1em]">
                        <span className={rarityStyles[item.rarity].text}>{rarityStyles[item.rarity].label}</span>
                        <span className="text-[rgb(var(--fog)/.5)]"> / {formatNumber(item.value)} keys</span>
                      </p>
                    </div>
                    <strong className="font-display text-2xl text-[rgb(var(--bright-gold))]">{item.demand}</strong>
                  </article>
                ))}
              </div>
            </div>

            <div className="detail-slate">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--bright-gold))]">How to read</p>
              <div className="mt-4 grid gap-2 text-sm">
                <InsightLine label="Updated" value="New current board value" />
                <InsightLine label="Same" value="No visible field movement" />
                <InsightLine label="Trend moved" value={`${changedTrendCount} items`} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function UpdateRow({ item }: { item: ValueItem }) {
  return (
    <article className="market-row update-market-row">
      <div className="col-span-2 grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-3 lg:contents">
        <div className="lg:hidden">
          <ItemIcon name={item.name} iconUrl={item.iconUrl ?? ""} rarity={item.rarity} compact />
        </div>
        <div className="min-w-0 lg:grid lg:grid-cols-[48px_minmax(0,1fr)] lg:items-center lg:gap-3">
          <div className="hidden lg:block">
            <ItemIcon name={item.name} iconUrl={item.iconUrl ?? ""} rarity={item.rarity} compact />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="row-selected-mark" aria-hidden="true" />
              <h3 className="truncate font-display text-lg leading-6 text-white">{item.name}</h3>
            </div>
            <p className="row-item-note">
              <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]", rarityStyles[item.rarity].badge)}>
                {rarityStyles[item.rarity].label}
              </span>
              <span>{getUpdateRead(item)}</span>
            </p>
          </div>
        </div>
      </div>

      <UpdateMetric label="Value" value={`${formatNumber(item.value)} keys`} icon="key" tone="updated" />
      <div className="flex min-w-0 items-center lg:block">
        <span className="mr-2 text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--fog)/.62)] lg:hidden">Trend</span>
        <span className={cn("trend-sigil", trendMeta[item.trend].className)}>
          <GemIcon type={trendMeta[item.trend].icon} className={cn("trend-sigil-icon", `trade-icon-${trendMeta[item.trend].icon}`)} />
          {trendMeta[item.trend].label}
        </span>
      </div>
      <UpdateMetric label="Gem Tax" value="Same" tone="unchanged" />
      <UpdateMetric label="Demand" value={`${item.demand}/100`} icon="demand" tone="updated" />
      <UpdateMetric label="Prestige" value="Same" tone="unchanged" />
    </article>
  );
}

function UpdateMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: "key" | "demand";
  tone: "updated" | "unchanged";
}) {
  return (
    <div className="min-w-0">
      <span className="block text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--fog)/.62)] lg:hidden">{label}</span>
      <strong className={cn("row-metric-value text-sm", tone === "updated" ? "text-[rgb(var(--ink))]" : "text-[rgb(var(--fog)/.72)]")}>
        {icon === "key" ? <GemIcon type="key" className="metric-icon trade-icon-key" /> : null}
        {icon === "demand" ? <GemIcon type="demand" className="metric-icon trade-icon-demand" /> : null}
        <span className="truncate">{value}</span>
      </strong>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="update-summary-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
        <img src={iconUrl} alt={name} className="h-full w-full object-contain p-1" decoding="async" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span className="font-display text-sm text-[rgb(var(--bright-gold))]">{initials(name)}</span>
      )}
    </span>
  );
}

function GemIcon({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn("gem-token", className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/icons/trade/${type}.png`} alt="" className="h-full w-full object-contain" decoding="async" draggable={false} loading="lazy" />
    </span>
  );
}
