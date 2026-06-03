"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { getItemSource, valueItems, type ValueItem } from "@/content/items";
import { itemSearchText, matchesSearch } from "@/lib/search";
import { getValueModes, type ValueCurrencySettings } from "@/lib/valueCurrency";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function ItemCompare({ currencySettings, items = valueItems }: { currencySettings?: ValueCurrencySettings; items?: ValueItem[] }) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => items.slice(0, 3).map((item) => item.id));
  const valueModes = useMemo(() => getValueModes(currencySettings), [currencySettings]);
  const selected = selectedIds.map((id) => items.find((item) => item.id === id)).filter((item): item is ValueItem => Boolean(item));
  const filtered = useMemo(() => items.filter((item) => matchesSearch(itemSearchText(item), query)).slice(0, 12), [items, query]);

  function toggleItem(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((itemId) => itemId !== id);
      return [...current, id].slice(-4);
    });
  }

  return (
    <section className="px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(18rem,0.34fr)_minmax(0,1fr)]">
        <aside className="market-vellum p-4">
          <label className="search-channel">
            <span className="sr-only">Search items to compare</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items" className="h-10 w-full bg-transparent px-3 text-sm text-white outline-none" />
          </label>
          <div className="mt-3 grid gap-2">
            {filtered.map((item) => (
              <button key={item.id} type="button" className="admin-item-button" onClick={() => toggleItem(item.id)} aria-pressed={selectedIds.includes(item.id)}>
                <span className="admin-item-copy">
                  <span>{item.name}</span>
                  <small>{item.rarity} / {getItemSource(item)}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="market-vellum p-4 md:p-5">
          <div className="market-board-head">
            <div>
              <h2 className="font-display text-3xl leading-none md:text-4xl">Compare Items</h2>
              <p className="mt-2 text-sm text-[rgb(var(--fog)/.8)]">Select up to four items and compare value, demand, tax, source, and trend.</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left">
              <thead className="text-xs uppercase tracking-[0.18em] text-[rgb(var(--fog)/.72)]">
                <tr>
                  <th className="px-3 py-2">Metric</th>
                  {selected.map((item) => (
                    <th key={item.id} className="px-3 py-2">{item.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ["Value", (item: ValueItem) => `${formatNumber(item.value)} ${valueModes.keys.unit}`],
                  ["Vizards", (item: ValueItem) => `${formatNumber(item.valueMasks ?? 0)} ${valueModes.masks.unit}`],
                  ["Scrolls", (item: ValueItem) => `${formatNumber(item.valueScrolls ?? 0)} ${valueModes.scrolls.unit}`],
                  ["Demand", (item: ValueItem) => `${item.demand}/100`],
                  ["Trend", (item: ValueItem) => item.trend],
                  ["Gem Tax", (item: ValueItem) => `${formatNumber(item.taxGems)} gems`],
                  ["Prestige", (item: ValueItem) => `P${item.prestige}`],
                  ["Source", (item: ValueItem) => getItemSource(item)],
                ].map(([label, getValue]) => (
                  <tr key={String(label)} className="bg-[rgb(var(--gold)/.035)]">
                    <td className="border-y border-l border-[rgb(var(--gold)/.14)] px-3 py-3 font-bold text-[rgb(var(--bright-gold))]">{String(label)}</td>
                    {selected.map((item) => (
                      <td key={`${item.id}-${label}`} className="border-y border-[rgb(var(--gold)/.14)] px-3 py-3">{(getValue as (item: ValueItem) => string)(item)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {selected.map((item) => (
              <Link key={item.id} href={`/items/${item.id}`} className="admin-secondary-action">
                Open {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
