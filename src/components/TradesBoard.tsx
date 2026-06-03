"use client";

import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRightLeft, ChevronDown, Clock3, MessageSquareText, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";

import { DiscordIcon } from "@/components/icons/DiscordIcon";
import { categories, getItemSource, type ItemCategory, type ItemTrend, valueItems, type ValueItem } from "@/content/items";
import { cn } from "@/lib/cn";
import { rarityStyles } from "@/lib/rarityStyles";
import { itemSearchText, matchesSearch, normalizeSearch } from "@/lib/search";
import type { TradeAd, TradeAdItem } from "@/lib/tradeAds";

type TradeBoardSession = {
  avatar: string | null;
  id: string;
  isAdmin: boolean;
  username: string;
};

type TradeSide = "offering" | "wants";
type SelectedTradeItem = TradeAdItem;
type TradeSearchScope = "all" | "offering" | "wants" | "poster" | "notes";
type TradeSortOption = "newest" | "oldest" | "poster";
type TradePostedFilter = "all" | "hour" | "day" | "week";
type PickerSortOption = "value-desc" | "value-asc" | "demand-desc" | "demand-asc" | "tax-desc" | "tax-asc" | "prestige-desc" | "prestige-asc" | "name-asc";
type PickerDemandFilter = "all" | "high" | "medium" | "low";
type PickerValueFilter = "all" | "top" | "mid" | "low";
type PickerSourceFilter = "all" | string;
type PickerTrendFilter = "all" | ItemTrend;

const filterBreakpoint = "(max-width: 767px)";

function subscribeFilterBreakpoint(onStoreChange: () => void) {
  const query = window.matchMedia(filterBreakpoint);
  query.addEventListener("change", onStoreChange);

  return () => query.removeEventListener("change", onStoreChange);
}

function getFilterBreakpointSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(filterBreakpoint).matches;
}

function getFilterBreakpointServerSnapshot() {
  return false;
}

const tradeSortOptions: { id: TradeSortOption; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "poster", label: "Player A-Z" },
];

const tradeSearchScopeOptions: { id: TradeSearchScope; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "offering", label: "Offering only" },
  { id: "wants", label: "Looking for only" },
  { id: "poster", label: "Player only" },
  { id: "notes", label: "Notes only" },
];

const postedOptions: { id: TradePostedFilter; label: string }[] = [
  { id: "all", label: "Any time" },
  { id: "hour", label: "Last hour" },
  { id: "day", label: "Last day" },
  { id: "week", label: "Last week" },
];

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

function formatPostedAt(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

function discordProfileHref(discordId: string) {
  return `https://discord.com/users/${encodeURIComponent(discordId)}`;
}

function sortAds(ads: TradeAd[], sortOption: TradeSortOption) {
  return [...ads].sort((a, b) => {
    if (sortOption === "poster") return a.poster.username.localeCompare(b.poster.username) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortOption === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function getPostedAgeMinutes(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor((Date.now() - timestamp) / 60000)) : 0;
}

function matchesPostedFilter(ad: TradeAd, filter: TradePostedFilter) {
  const ageMinutes = getPostedAgeMinutes(ad.createdAt);

  if (filter === "hour") return ageMinutes <= 60;
  if (filter === "day") return ageMinutes <= 60 * 24;
  if (filter === "week") return ageMinutes <= 60 * 24 * 7;

  return true;
}

function tradeItemFromValueItem(item: ValueItem): SelectedTradeItem {
  return {
    iconUrl: item.iconUrl,
    id: item.id,
    name: item.name,
    quantity: 1,
    rarity: item.rarity,
  };
}

function labelsFromItems(items: SelectedTradeItem[]) {
  return items.map((item) => `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`).join(", ");
}

function legacyItems(value: string): SelectedTradeItem[] {
  return value
    .split(/\n|,|\+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 9)
    .map((name, index) => ({
      id: `legacy-${index}-${name}`,
      name,
      quantity: 1,
      rarity: "common",
    }));
}

function getAdItems(ad: TradeAd, side: TradeSide) {
  const structured = side === "offering" ? ad.offeringItems : ad.wantsItems;
  if (structured.length) return structured;

  return legacyItems(side === "offering" ? ad.offering : ad.wants);
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

export function TradesBoard({
  initialAds,
  initialItems = valueItems,
  initialSession,
}: {
  initialAds: TradeAd[];
  initialItems?: ValueItem[];
  initialSession: TradeBoardSession | null;
}) {
  const [ads, setAds] = useState(() => sortAds(initialAds, "newest"));
  const [offeringItems, setOfferingItems] = useState<SelectedTradeItem[]>([]);
  const [wantsItems, setWantsItems] = useState<SelectedTradeItem[]>([]);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [tradeSearchScope, setTradeSearchScope] = useState<TradeSearchScope>("all");
  const [tradeSortOption, setTradeSortOption] = useState<TradeSortOption>("newest");
  const [postedFilter, setPostedFilter] = useState<TradePostedFilter>("all");
  const [sideFilter, setSideFilter] = useState<"all" | "both" | TradeSide>("all");
  const [notesOnly, setNotesOnly] = useState<"all" | "with-notes">("all");
  const [manualFiltersExpanded, setManualFiltersExpanded] = useState<boolean | null>(null);
  const isCompactFilterLayout = useSyncExternalStore(subscribeFilterBreakpoint, getFilterBreakpointSnapshot, getFilterBreakpointServerSnapshot);
  const filtersExpanded = manualFiltersExpanded ?? !isCompactFilterLayout;
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickerSide, setPickerSide] = useState<TradeSide | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerCategory, setPickerCategory] = useState<"all" | ItemCategory>("all");
  const [pickerSortOption, setPickerSortOption] = useState<PickerSortOption>("value-desc");
  const [pickerDemandFilter, setPickerDemandFilter] = useState<PickerDemandFilter>("all");
  const [pickerTrendFilter, setPickerTrendFilter] = useState<PickerTrendFilter>("all");
  const [pickerValueFilter, setPickerValueFilter] = useState<PickerValueFilter>("all");
  const [pickerSourceFilter, setPickerSourceFilter] = useState<PickerSourceFilter>("all");
  const [manualPickerFiltersExpanded, setManualPickerFiltersExpanded] = useState<boolean | null>(null);
  const pickerFiltersExpanded = manualPickerFiltersExpanded ?? !isCompactFilterLayout;
  const [detailItem, setDetailItem] = useState<ValueItem | null>(null);

  const visibleCategories = categories.filter((item) => item.id === "all" || initialItems.some((value) => value.category === item.id));
  const pickerSourceOptions = useMemo(() => ["all", ...Array.from(new Set(initialItems.map(getItemSource))).sort()] as PickerSourceFilter[], [initialItems]);
  const filteredPickerItems = useMemo(() => {
    const matches = initialItems.filter((item) => {
      const matchesCategory = pickerCategory === "all" || item.category === pickerCategory;
      const matchesQuery = matchesSearch(itemSearchText(item), pickerQuery);
      const matchesTrend = pickerTrendFilter === "all" || item.trend === pickerTrendFilter;
      const matchesSource = pickerSourceFilter === "all" || getItemSource(item) === pickerSourceFilter;

      return matchesCategory && matchesQuery && matchesTrend && matchesSource && matchesPickerDemand(item, pickerDemandFilter) && matchesPickerValue(item, pickerValueFilter);
    });

    return sortPickerItems(matches, pickerSortOption);
  }, [initialItems, pickerCategory, pickerDemandFilter, pickerQuery, pickerSortOption, pickerSourceFilter, pickerTrendFilter, pickerValueFilter]);
  const pickerActiveFilterCount = [pickerCategory !== "all", pickerSortOption !== "value-desc", pickerDemandFilter !== "all", pickerTrendFilter !== "all", pickerValueFilter !== "all", pickerSourceFilter !== "all"].filter(Boolean).length;

  const filteredAds = useMemo(() => {
    const needle = normalizeSearch(query);
    const matches = ads.filter((ad) => {
      const offering = normalizeSearch(`${ad.offering} ${getAdItems(ad, "offering").map((item) => item.name).join(" ")}`);
      const wants = normalizeSearch(`${ad.wants} ${getAdItems(ad, "wants").map((item) => item.name).join(" ")}`);
      const poster = normalizeSearch(ad.poster.username);
      const note = normalizeSearch(ad.notes);
      const searchPool: Record<TradeSearchScope, string> = {
        all: `${offering} ${wants} ${poster} ${note}`,
        notes: note,
        offering,
        poster,
        wants,
      };
      const offeringCount = getAdItems(ad, "offering").length;
      const wantsCount = getAdItems(ad, "wants").length;
      const matchesSide = sideFilter === "all" || (sideFilter === "both" ? offeringCount > 0 && wantsCount > 0 : sideFilter === "offering" ? offeringCount > 0 && wantsCount === 0 : wantsCount > 0 && offeringCount === 0);

      return (!needle || matchesSearch(searchPool[tradeSearchScope], needle)) && matchesSide && matchesPostedFilter(ad, postedFilter) && (notesOnly === "all" || Boolean(ad.notes.trim()));
    });

    return sortAds(matches, tradeSortOption);
  }, [ads, notesOnly, postedFilter, query, sideFilter, tradeSearchScope, tradeSortOption]);

  const activeFilterCount = [tradeSearchScope !== "all", tradeSortOption !== "newest", postedFilter !== "all", sideFilter !== "all", notesOnly !== "all"].filter(Boolean).length;

  function clearTradeFilters() {
    setTradeSearchScope("all");
    setTradeSortOption("newest");
    setPostedFilter("all");
    setSideFilter("all");
    setNotesOnly("all");
  }

  function clearPickerFilters() {
    setPickerCategory("all");
    setPickerSortOption("value-desc");
    setPickerDemandFilter("all");
    setPickerTrendFilter("all");
    setPickerValueFilter("all");
    setPickerSourceFilter("all");
  }

  function addItem(side: TradeSide, item: ValueItem) {
    const setter = side === "offering" ? setOfferingItems : setWantsItems;

    setter((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (existing) {
        return current.map((entry) => (entry.id === item.id ? { ...entry, quantity: Math.min(99, entry.quantity + 1) } : entry));
      }

      if (current.length >= 9) return current;

      return [...current, tradeItemFromValueItem(item)];
    });
  }

  function updateQuantity(side: TradeSide, id: string, quantity: number) {
    const setter = side === "offering" ? setOfferingItems : setWantsItems;
    setter((current) => current.map((item) => (item.id === id ? { ...item, quantity: Math.min(99, Math.max(1, quantity)) } : item)));
  }

  function removeItem(side: TradeSide, id: string) {
    const setter = side === "offering" ? setOfferingItems : setWantsItems;
    setter((current) => current.filter((item) => item.id !== id));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!offeringItems.length && !wantsItems.length) {
      setStatus({ tone: "error", text: "Add at least one offering or looking-for item." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          offering: labelsFromItems(offeringItems),
          offeringItems,
          wants: labelsFromItems(wantsItems),
          wantsItems,
        }),
      });
      const data = (await response.json()) as { ad?: TradeAd; error?: string };

      if (!response.ok || !data.ad) {
        setStatus({ tone: "error", text: data.error ?? "Could not post trade ad." });
        return;
      }

      setAds((current) => sortAds([data.ad!, ...current], "newest"));
      setOfferingItems([]);
      setWantsItems([]);
      setNotes("");
      setStatus({ tone: "success", text: "Trade ad posted." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="trade-board-shell px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="trade-workspace">
          <aside className="market-panel trade-compose-panel">
            <div className="trade-compose-head">
              <div>
                <h2 className="font-display gold-text text-3xl leading-none md:text-4xl">Post a trade</h2>
                <p>Build a clean offer with item slots, quantities, and optional notes.</p>
              </div>
              {initialSession ? (
                <div className="trade-board-profile">
                  <UserAvatar avatar={initialSession.avatar} />
                  <div>
                    <span>Logged in as</span>
                    <strong>{initialSession.username}</strong>
                  </div>
                </div>
              ) : (
                <a className="site-auth-button" href="/api/auth/discord/login?next=/trades">
                  <DiscordIcon className="site-auth-discord-icon" />
                  <span>Login</span>
                </a>
              )}
            </div>

            {initialSession ? (
              <form className="trade-post-panel" onSubmit={onSubmit}>
                <TradePostBucket items={offeringItems} onAdd={() => setPickerSide("offering")} onQuantity={(id, quantity) => updateQuantity("offering", id, quantity)} onRemove={(id) => removeItem("offering", id)} title="Offering" />
                <TradePostBucket items={wantsItems} onAdd={() => setPickerSide("wants")} onQuantity={(id, quantity) => updateQuantity("wants", id, quantity)} onRemove={(id) => removeItem("wants", id)} title="Looking for" />
                <label className="trade-notes-field">
                  <span>Notes</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={480} placeholder="Optional trade notes, adds, negotiable info, or contact preferences." />
                </label>
                <div className="trade-submit-row">
                  {status ? <p className={`trade-board-status trade-board-status-${status.tone}`}>{status.text}</p> : <span />}
                  <button type="submit" className="admin-save-action trade-submit-action" disabled={isSubmitting}>
                    <MessageSquareText size={15} strokeWidth={2.5} />
                    <span>{isSubmitting ? "Posting..." : "Post trade"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="trade-login-panel">
                <p>Login with Discord to post trade ads. Browsing and filtering is public.</p>
              </div>
            )}
          </aside>

          <section className="trade-feed-panel">
            <div className="market-panel trade-browse-panel">
              <div className="trade-browse-head">
                <div>
                  <h2 className="font-display gold-text text-3xl leading-none md:text-4xl">Browse trades</h2>
                  <p>Filter by item side, player, notes, or recency.</p>
                </div>
                <strong>{filteredAds.length} ad{filteredAds.length === 1 ? "" : "s"}</strong>
              </div>

              <div className="trade-search-row">
                <div className="search-control">
                  <span>Search trade ads</span>
                  <label className="search-channel">
                    <Search className="ml-3 size-4 shrink-0 text-[rgb(var(--fog)/.66)]" aria-hidden="true" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search items, players, or notes"
                      className="h-10 w-full min-w-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-[rgb(var(--fog)/.48)]"
                    />
                    {query ? (
                      <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                        x
                      </button>
                    ) : null}
                  </label>
                </div>
              </div>

              <div className="advanced-filter-panel trade-filter-panel" aria-label="Advanced trade filters">
                <div className="advanced-filter-head">
                  <div>
                    <button type="button" className="advanced-filter-toggle" aria-expanded={filtersExpanded} aria-controls="trade-filter-controls" onClick={() => setManualFiltersExpanded(!filtersExpanded)}>
                      <span>Advanced filters</span>
                      <ChevronDown size={15} strokeWidth={2.5} />
                    </button>
                    <strong>{activeFilterCount ? `${activeFilterCount} active` : "Newest first"}</strong>
                  </div>
                  <button type="button" className="advanced-filter-clear" onClick={clearTradeFilters} disabled={!activeFilterCount} aria-label="Clear trade filters">
                    Clear {activeFilterCount ? `(${activeFilterCount})` : ""}
                  </button>
                </div>

                <div id="trade-filter-controls" className={cn("advanced-filter-grid", filtersExpanded && "advanced-filter-grid-open")}>
                  <FilterSelect label="Sort" value={tradeSortOption} onChange={(value) => setTradeSortOption(value as TradeSortOption)} options={tradeSortOptions.map((option) => ({ value: option.id, label: option.label }))} />
                  <FilterSelect label="Search in" value={tradeSearchScope} onChange={(value) => setTradeSearchScope(value as TradeSearchScope)} options={tradeSearchScopeOptions.map((option) => ({ value: option.id, label: option.label }))} />
                  <FilterSelect
                    label="Trade type"
                    value={sideFilter}
                    onChange={(value) => setSideFilter(value as typeof sideFilter)}
                    options={[
                      { value: "all", label: "Any trade" },
                      { value: "both", label: "Offering + looking" },
                      { value: "offering", label: "Offering only" },
                      { value: "wants", label: "Looking only" },
                    ]}
                  />
                  <FilterSelect label="Posted" value={postedFilter} onChange={(value) => setPostedFilter(value as TradePostedFilter)} options={postedOptions.map((option) => ({ value: option.id, label: option.label }))} />
                  <FilterSelect
                    label="Notes"
                    value={notesOnly}
                    onChange={(value) => setNotesOnly(value as typeof notesOnly)}
                    options={[
                      { value: "all", label: "Any notes" },
                      { value: "with-notes", label: "Has notes" },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="trade-ad-grid trade-feed-grid">
              {filteredAds.map((ad) => (
                <TradeCard
                  key={ad.id}
                  ad={ad}
                  onViewItem={(itemId) => {
                    const item = initialItems.find((candidate) => candidate.id === itemId);
                    if (item) setDetailItem(item);
                  }}
                />
              ))}
              {!filteredAds.length ? (
                <div className="trade-empty-state">
                  <ArrowRightLeft size={24} strokeWidth={2.3} />
                  <strong>No trade ads found</strong>
                  <span>Try changing search or advanced filters.</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {detailItem ? <TradeItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} /> : null}

      {pickerSide ? (
        <ItemPickerModal
          activeFilterCount={pickerActiveFilterCount}
          allItems={initialItems}
          category={pickerCategory}
          clearFilters={clearPickerFilters}
          demandFilter={pickerDemandFilter}
          filteredItems={filteredPickerItems}
          filtersExpanded={pickerFiltersExpanded}
          onCategory={setPickerCategory}
          onClose={() => setPickerSide(null)}
          onDemandFilter={setPickerDemandFilter}
          onPick={(item) => addItem(pickerSide, item)}
          onQuery={setPickerQuery}
          onSort={setPickerSortOption}
          onSourceFilter={setPickerSourceFilter}
          onToggleFilters={() => setManualPickerFiltersExpanded(!pickerFiltersExpanded)}
          onTrendFilter={setPickerTrendFilter}
          onValueFilter={setPickerValueFilter}
          query={pickerQuery}
          sortOption={pickerSortOption}
          sourceFilter={pickerSourceFilter}
          sourceOptions={pickerSourceOptions}
          targetLabel={pickerSide === "offering" ? "Offering items" : "Looking-for items"}
          trendFilter={pickerTrendFilter}
          valueFilter={pickerValueFilter}
          visibleCategories={visibleCategories}
        />
      ) : null}
    </section>
  );
}

function UserAvatar({ avatar }: { avatar: string | null }) {
  return (
    <span className="trade-user-avatar">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" decoding="async" draggable={false} loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <ShieldCheck size={17} strokeWidth={2.4} />
      )}
    </span>
  );
}

function TradePostBucket({
  items,
  onAdd,
  onQuantity,
  onRemove,
  title,
}: {
  items: SelectedTradeItem[];
  onAdd: () => void;
  onQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  title: string;
}) {
  return (
    <div className="trade-post-bucket">
      <div className="trade-post-bucket-head">
        <div>
          <span>{title}</span>
          <strong>{items.length}/9 items</strong>
        </div>
        {items.length ? (
          <button type="button" className="admin-secondary-action trade-add-item" onClick={onAdd}>
            <Plus size={15} strokeWidth={2.5} />
            <span>Add</span>
          </button>
        ) : null}
      </div>
      <div className="trade-post-item-list">
        {items.map((item) => (
          <TradeSelectedItem key={item.id} item={item} onQuantity={(quantity) => onQuantity(item.id, quantity)} onRemove={() => onRemove(item.id)} />
        ))}
        {!items.length ? (
          <button type="button" className="trade-post-empty" onClick={onAdd}>
            <Plus size={18} strokeWidth={2.4} />
            <span>Add item</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TradeSelectedItem({ item, onQuantity, onRemove }: { item: SelectedTradeItem; onQuantity: (quantity: number) => void; onRemove: () => void }) {
  return (
    <div className="trade-selected-item">
      <TradeItemThumb item={item} />
      <div className="min-w-0">
        <strong>{item.name}</strong>
      </div>
      <div className="calculator-quantity-control trade-quantity-control">
        <button type="button" onClick={() => onQuantity(item.quantity - 1)} aria-label={`Decrease ${item.name}`}>
          -
        </button>
        <span>x {item.quantity}</span>
        <button type="button" onClick={() => onQuantity(item.quantity + 1)} aria-label={`Increase ${item.name}`}>
          +
        </button>
      </div>
      <button type="button" className="trade-remove-item" onClick={onRemove} aria-label={`Remove ${item.name}`}>
        <Trash2 size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
}

function TradeCard({ ad, onViewItem }: { ad: TradeAd; onViewItem: (itemId: string) => void }) {
  const offering = getAdItems(ad, "offering");
  const wants = getAdItems(ad, "wants");

  return (
    <article className="trade-card">
      <div className="trade-card-head">
        <UserAvatar avatar={ad.poster.avatar} />
        <div className="min-w-0">
          <a className="trade-user-link" href={discordProfileHref(ad.poster.discordId)} target="_blank" rel="noreferrer">
            {ad.poster.username}
          </a>
          <span>
            <Clock3 size={13} strokeWidth={2.4} />
            {formatPostedAt(ad.createdAt)}
          </span>
        </div>
      </div>
      <div className="trade-card-sides">
        <TradeCardSide emptyLabel="No offering listed" items={offering} onViewItem={onViewItem} title="Offering" />
        <TradeCardSide emptyLabel="Open to offers" items={wants} onViewItem={onViewItem} title="Looking for" />
      </div>
      {ad.notes ? (
        <p className="trade-card-notes">
          <MessageSquareText size={15} strokeWidth={2.3} />
          <span>{ad.notes}</span>
        </p>
      ) : null}
    </article>
  );
}

function TradeCardSide({ emptyLabel, items, onViewItem, title }: { emptyLabel: string; items: TradeAdItem[]; onViewItem: (itemId: string) => void; title: string }) {
  return (
    <section className="trade-card-side">
      <div className="trade-card-side-head">
        <span>{title}</span>
        <small>{items.length ? `${items.length} item${items.length === 1 ? "" : "s"}` : "Any"}</small>
      </div>
      <div className="trade-card-items">
        {items.length ? items.map((item) => <TradeCardItem key={item.id} item={item} onViewItem={onViewItem} />) : <p className="trade-card-empty-copy">{emptyLabel}</p>}
      </div>
    </section>
  );
}

function TradeCardItem({ item, onViewItem }: { item: TradeAdItem; onViewItem: (itemId: string) => void }) {
  return (
    <div className="trade-card-item">
      <TradeItemThumb item={item} />
      <div className="min-w-0">
        <button type="button" className="trade-item-name-link" onClick={() => onViewItem(item.id)}>
          {item.name}
        </button>
        <span>x{item.quantity}</span>
      </div>
    </div>
  );
}

function TradeItemDetailModal({ item, onClose }: { item: ValueItem; onClose: () => void }) {
  return (
    <div className="calculator-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="calculator-modal" role="dialog" aria-modal="true" aria-label={`${item.name} item data`} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="calculator-modal-close" onClick={onClose} aria-label="Close item data">
          <X size={16} strokeWidth={2.4} />
        </button>
        <div className="calculator-modal-head">
          <TradeItemThumb item={item} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--bright-gold))]">Item data</p>
            <h2 className="font-display mt-1 text-3xl leading-8">{item.name}</h2>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--fog)/.7)]">
              <span className={rarityStyles[item.rarity].text}>{rarityStyles[item.rarity].label}</span> / {item.category}
            </p>
          </div>
        </div>
        <div className="calculator-modal-lines">
          <TradeDetailLine label="Value" value={`${item.value.toLocaleString()} keys`} />
          <TradeDetailLine label="Gem Tax" value={`${item.taxGems.toLocaleString()} gems`} />
          <TradeDetailLine label="Demand" value={`${item.demand}/100`} />
          <TradeDetailLine label="Prestige" value={`P${item.prestige}`} />
          <TradeDetailLine label="Source" value={getItemSource(item)} />
        </div>
        <div className="calculator-modal-note">
          <span>Trade read</span>
          <p>{item.note}</p>
        </div>
      </div>
    </div>
  );
}

function TradeDetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="calculator-detail-line">
      <span className="calculator-detail-icon-slot" aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TradeItemThumb({ item }: { item: Pick<TradeAdItem, "iconUrl" | "name" | "rarity"> }) {
  const rarity = item.rarity as keyof typeof rarityStyles;
  return (
    <span className={cn("item-crest size-10", rarityStyles[rarity]?.crest ?? rarityStyles.common.crest)}>
      {item.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.iconUrl} alt="" className="h-full w-full object-contain p-1" decoding="async" draggable={false} loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span className="font-display text-xs text-[rgb(var(--bright-gold))]">{item.name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

function FilterSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: { value: string; label: string }[]; value: string }) {
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

function ItemPickerModal({
  activeFilterCount,
  allItems,
  category,
  clearFilters,
  demandFilter,
  filteredItems,
  filtersExpanded,
  onCategory,
  onClose,
  onDemandFilter,
  onPick,
  onQuery,
  onSort,
  onSourceFilter,
  onToggleFilters,
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
  allItems: ValueItem[];
  category: "all" | ItemCategory;
  clearFilters: () => void;
  demandFilter: PickerDemandFilter;
  filteredItems: ValueItem[];
  filtersExpanded: boolean;
  onCategory: (category: "all" | ItemCategory) => void;
  onClose: () => void;
  onDemandFilter: (filter: PickerDemandFilter) => void;
  onPick: (item: ValueItem) => void;
  onQuery: (query: string) => void;
  onSort: (sort: PickerSortOption) => void;
  onSourceFilter: (filter: PickerSourceFilter) => void;
  onToggleFilters: () => void;
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
      <div className="calculator-modal calculator-picker-modal" role="dialog" aria-modal="true" aria-label={`Pick item for ${targetLabel}`} onMouseDown={(event) => event.stopPropagation()}>
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
            <label className="search-channel">
              <Search className="ml-3 size-4 shrink-0 text-[rgb(var(--fog)/.66)]" aria-hidden="true" />
              <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search names" className="h-10 w-full min-w-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-[rgb(var(--fog)/.48)]" />
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
                <button type="button" className="advanced-filter-toggle" aria-expanded={filtersExpanded} aria-controls="trade-picker-filter-controls" onClick={onToggleFilters}>
                  <span>Advanced filters</span>
                  <ChevronDown size={15} strokeWidth={2.5} />
                </button>
                <strong>{filteredItems.length} items</strong>
              </div>
              <button type="button" className="advanced-filter-clear" onClick={clearFilters} disabled={!activeFilterCount} aria-label="Clear picker filters">
                Clear {activeFilterCount ? `(${activeFilterCount})` : ""}
              </button>
            </div>
            <div id="trade-picker-filter-controls" className={cn("advanced-filter-grid calculator-picker-filter-grid", filtersExpanded && "advanced-filter-grid-open")}>
              <FilterSelect label="Sort" value={sortOption} onChange={(value) => onSort(value as PickerSortOption)} options={pickerSortOptions.map((option) => ({ value: option.id, label: option.label }))} />
              <FilterSelect
                label="Category"
                value={category}
                onChange={(value) => onCategory(value as "all" | ItemCategory)}
                options={visibleCategories.map((item) => ({
                  value: item.id,
                  label: `${item.label} (${item.id === "all" ? allItems.length : allItems.filter((value) => value.category === item.id).length})`,
                }))}
              />
              <FilterSelect label="Demand" value={demandFilter} onChange={(value) => onDemandFilter(value as PickerDemandFilter)} options={pickerDemandOptions.map((option) => ({ value: option.id, label: option.label }))} />
              <FilterSelect label="Trend" value={trendFilter} onChange={(value) => onTrendFilter(value as PickerTrendFilter)} options={pickerTrendOptions.map((option) => ({ value: option.id, label: option.label }))} />
              <FilterSelect label="Value" value={valueFilter} onChange={(value) => onValueFilter(value as PickerValueFilter)} options={pickerValueOptions.map((option) => ({ value: option.id, label: option.label }))} />
              <FilterSelect label="Source" value={sourceFilter} onChange={(value) => onSourceFilter(value)} options={sourceOptions.map((source) => ({ value: source, label: source === "all" ? "Any source" : source }))} />
            </div>
          </div>
        </div>

        <div className="calculator-picker-list calculator-picker-modal-list mt-4">
          {filteredItems.map((item) => (
            <button key={item.id} className="calculator-picker-row" onClick={() => onPick(item)} type="button">
              <TradeItemThumb item={item} />
              <div className="min-w-0">
                <div className="truncate font-display text-base leading-5 text-white">{item.name}</div>
              </div>
              <span className="calculator-picker-target">Pick</span>
            </button>
          ))}
          {!filteredItems.length ? <div className="rounded-[14px_5px_14px_5px] border border-[rgb(var(--gold)/.1)] p-5 text-center text-sm text-[rgb(var(--fog)/.78)]">No matching item.</div> : null}
        </div>
      </div>
    </div>
  );
}
