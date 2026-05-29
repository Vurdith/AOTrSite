"use client";

import { useMemo, useState } from "react";

import { categories, type ItemCategory, type ItemTrend, valueItems, type ValueItem } from "@/content/items";
import { cn } from "@/lib/cn";

type Bucket = "yours" | "theirs";

const trendIcon: Record<ItemTrend, string> = {
  rising: "+",
  stable: "=",
  falling: "-",
};

function formatValue(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function ValueTerminal() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ItemCategory>("all");
  const [yours, setYours] = useState<ValueItem[]>([valueItems[2], valueItems[5]]);
  const [theirs, setTheirs] = useState<ValueItem[]>([valueItems[1]]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return valueItems.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesQuery = !needle || `${item.name} ${item.category} ${item.rarity}`.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const yourTotal = yours.reduce((sum, item) => sum + item.value, 0);
  const theirTotal = theirs.reduce((sum, item) => sum + item.value, 0);
  const diff = theirTotal - yourTotal;

  function addItem(bucket: Bucket, item: ValueItem) {
    const setter = bucket === "yours" ? setYours : setTheirs;
    setter((current) => [...current, item]);
  }

  function removeAt(bucket: Bucket, index: number) {
    const setter = bucket === "yours" ? setYours : setTheirs;
    setter((current) => current.filter((_, i) => i !== index));
  }

  return (
    <section id="values" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[rgb(var(--bright-gold))]">Value board</p>
        <h2 className="font-display gold-text mt-3 text-3xl md:text-5xl">Find the trade before you offer it.</h2>
        <p className="mt-4 text-lg leading-7 text-zinc-400">
          Search the current sample list, filter by item type, and add pieces directly into the calculator.
        </p>
      </div>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
        <div className="royal-surface cut-corners p-4 backdrop-blur-md md:p-5">
          <div className="grid gap-3 border-b border-[rgb(var(--gold)/.16)] pb-4 md:grid-cols-[1fr_auto] md:items-center">
            <label className="relative block">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search items, rarity, categories..."
                className="cut-corners h-12 w-full border border-[rgb(var(--gold)/.18)] bg-black/45 px-4 text-base text-white placeholder:text-[rgb(var(--fog)/.55)] focus:border-[rgb(var(--bright-gold)/.55)] focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={cn(
                    "cut-corners h-12 whitespace-nowrap border px-4 text-sm font-bold uppercase tracking-[0.13em] transition",
                    category === item.id
                      ? "border-[rgb(var(--bright-gold)/.6)] bg-[rgb(var(--gold)/.16)] text-white shadow-[inset_0_0_18px_rgb(var(--gold)/.11)]"
                      : "border-[rgb(var(--gold)/.14)] bg-[rgb(var(--gold)/.04)] text-[rgb(var(--fog))] hover:border-[rgb(var(--bright-gold)/.32)] hover:text-white",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden pt-4 md:block">
            <table className="w-full table-fixed border-separate border-spacing-y-2 text-left">
              <thead className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--fog)/.72)]">
                <tr>
                  <th className="w-[30%] px-3 py-2">Item</th>
                  <th className="w-[15%] px-3 py-2">Value</th>
                  <th className="w-[18%] px-3 py-2">Demand</th>
                  <th className="w-[15%] px-3 py-2">Trend</th>
                  <th className="w-[8%] px-3 py-2">Tax</th>
                  <th className="w-[14%] px-3 py-2">Trade</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="group bg-[rgb(var(--gold)/.035)] transition hover:bg-[rgb(var(--gold)/.075)]">
                    <td className="border-y border-l border-[rgb(var(--gold)/.14)] px-3 py-3">
                      <div className="font-display text-sm">{item.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[rgb(var(--fog)/.7)]">
                        {item.rarity} / {item.category} / {item.owners}
                      </div>
                    </td>
                    <td className="border-y border-[rgb(var(--gold)/.14)] px-3 py-3 text-lg font-bold text-[rgb(var(--bright-gold))]">{formatValue(item.value)}</td>
                    <td className="border-y border-[rgb(var(--gold)/.14)] px-3 py-3">
                      <div className="h-2 w-full max-w-28 bg-black/40">
                        <div className="h-full bg-gradient-to-r from-[rgb(var(--deep-gold))] via-[rgb(var(--gold))] to-[rgb(var(--bright-gold))]" style={{ width: `${item.demand}%` }} />
                      </div>
                      <span className="mt-1 block text-xs text-[rgb(var(--fog))]">{item.demand}/100</span>
                    </td>
                    <td className="border-y border-[rgb(var(--gold)/.14)] px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 border px-2 py-1 text-xs font-bold uppercase tracking-[0.12em]",
                          item.trend === "rising" && "border-emerald-300/30 text-emerald-200",
                          item.trend === "stable" && "border-sky-300/25 text-sky-200",
                          item.trend === "falling" && "border-red-300/30 text-red-200",
                        )}
                      >
                        <span className="text-sm leading-none">{trendIcon[item.trend]}</span>
                        {item.trend}
                      </span>
                    </td>
                    <td className="border-y border-[rgb(var(--gold)/.14)] px-3 py-3 text-zinc-300">{formatValue(item.taxGems)} gems</td>
                    <td className="border-y border-r border-[rgb(var(--gold)/.14)] px-3 py-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          title="Add to your offer"
                          onClick={() => addItem("yours", item)}
                          className="royal-button cut-corners h-9 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-200"
                        >
                          <span className="relative z-10">Give</span>
                        </button>
                        <button
                          type="button"
                          title="Add to their offer"
                          onClick={() => addItem("theirs", item)}
                          className="royal-button cut-corners h-9 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-200"
                        >
                          <span className="relative z-10">Get</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 pt-4 md:hidden">
            {filtered.map((item) => (
              <article key={item.id} className="royal-surface cut-corners p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg">{item.name}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[rgb(var(--fog)/.75)]">
                      {item.rarity} / {item.category}
                    </p>
                  </div>
                  <strong className="shrink-0 text-lg text-[rgb(var(--bright-gold))]">{formatValue(item.value)}</strong>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="block text-xs uppercase tracking-[0.14em] text-[rgb(var(--fog)/.7)]">Demand</span>
                    <span>{item.demand}/100</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-[0.14em] text-[rgb(var(--fog)/.7)]">Trend</span>
                    <span className="capitalize">{item.trend}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-[0.14em] text-[rgb(var(--fog)/.7)]">Tax</span>
                    <span>{formatValue(item.taxGems)} gems</span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => addItem("yours", item)}
                    className="royal-button cut-corners h-10 text-sm font-bold uppercase tracking-[0.12em] text-zinc-200"
                  >
                    <span className="relative z-10">You give</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addItem("theirs", item)}
                    className="royal-button cut-corners h-10 text-sm font-bold uppercase tracking-[0.12em] text-zinc-200"
                  >
                    <span className="relative z-10">You get</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside id="calculator" className="royal-surface cut-corners h-fit p-4 backdrop-blur-md lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--bright-gold))]">Trade calculator</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <TradeBucket title="You give" items={yours} total={yourTotal} onRemove={(index) => removeAt("yours", index)} />
            <TradeBucket title="You get" items={theirs} total={theirTotal} onRemove={(index) => removeAt("theirs", index)} />
          </div>
          <div className="cut-corners mt-4 border border-[rgb(var(--gold)/.18)] bg-[rgb(var(--gold)/.05)] p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm uppercase tracking-[0.16em] text-zinc-400">Difference</span>
              <strong className={cn("text-2xl", diff >= 0 ? "text-emerald-200" : "text-red-200")}>
                {diff >= 0 ? "+" : "-"}
                {formatValue(Math.abs(diff))}
              </strong>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {diff >= 0
                ? "This leans in your favor. Demand still matters, but the gilded balance is clean."
                : "You are overpaying. Ask for adds or swap in a higher-demand piece."}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function TradeBucket({
  title,
  items,
  total,
  onRemove,
}: {
  title: string;
  items: ValueItem[];
  total: number;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="min-w-0 border border-[rgb(var(--gold)/.16)] bg-[rgb(var(--gold)/.035)] p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[rgb(var(--fog)/.78)]">{title}</div>
      <div className="mt-3 min-h-36 space-y-2">
        {items.map((item, index) => (
          <div key={`${item.id}-${index}`} className="grid grid-cols-[1fr_auto] gap-2 border border-[rgb(var(--gold)/.15)] bg-black/35 p-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{item.name}</div>
              <div className="text-xs text-[rgb(var(--bright-gold))]">{formatValue(item.value)}</div>
            </div>
            <button
              type="button"
              title={`Remove ${item.name}`}
              onClick={() => onRemove(index)}
              className="grid size-7 place-items-center border border-[rgb(var(--gold)/.14)] text-[rgb(var(--fog)/.7)] transition hover:text-white"
            >
              <span aria-hidden="true">x</span>
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-[rgb(var(--gold)/.16)] pt-3 text-lg font-bold text-[rgb(var(--bright-gold))]">{formatValue(total)}</div>
    </div>
  );
}
