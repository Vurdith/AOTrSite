"use client";

import { useMemo, useState } from "react";
import { Database, Plus, RotateCcw, Save, Search, Trash2 } from "lucide-react";

import { categories, type ItemCategory, type ItemRarity, type ItemTrend, type ValueItem, type ValueHistoryPoint } from "@/content/items";
import { cn } from "@/lib/cn";

const rarityOptions: ItemRarity[] = ["mythic", "legendary", "epic", "rare", "uncommon", "common", "event"];
const trendOptions: ItemTrend[] = ["rising", "stable", "falling"];

const emptyItem: ValueItem = {
  id: "",
  name: "",
  category: "cosmetics",
  rarity: "common",
  value: 0,
  valueHistory: [],
  demand: 10,
  trend: "stable",
  taxGems: 0,
  prestige: 0,
  iconUrl: "",
  source: "",
  owners: "Common",
  note: "Editable item note.",
};

function formatHistory(history?: ValueHistoryPoint[]) {
  return JSON.stringify(history ?? [], null, 2);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['[\]()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseHistory(value: string) {
  if (!value.trim()) return [];

  const parsed = JSON.parse(value);

  if (!Array.isArray(parsed)) {
    throw new Error("Value history must be a JSON array.");
  }

  return parsed.map((point) => ({
    date: String(point.date ?? ""),
    value: Number(point.value ?? 0),
  }));
}

export function AdminPanel({ initialItems }: { initialItems: ValueItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id ?? "");
  const [draft, setDraft] = useState<ValueItem>(initialItems[0] ?? emptyItem);
  const [historyDraft, setHistoryDraft] = useState(formatHistory(initialItems[0]?.valueHistory));
  const [status, setStatus] = useState("Ready to edit Firestore items.");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) return items;

    return items.filter((item) => [item.name, item.id, item.category, item.rarity, item.source, item.owners].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
  }, [items, query]);

  function selectItem(item: ValueItem) {
    setSelectedId(item.id);
    setDraft(item);
    setHistoryDraft(formatHistory(item.valueHistory));
    setStatus(`Editing ${item.name}.`);
  }

  function updateDraft<K extends keyof ValueItem>(key: K, value: ValueItem[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function newItem() {
    setSelectedId("");
    setDraft(emptyItem);
    setHistoryDraft(formatHistory([]));
    setStatus("New item draft created.");
  }

  async function refreshItems() {
    const response = await fetch("/api/admin/items", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error ?? "Unable to refresh Firestore items.");

    setItems(data.items);
    return data.items as ValueItem[];
  }

  async function saveItem() {
    setSaving(true);
    setStatus("Saving item to Firestore...");

    try {
      const payload = {
        ...draft,
        id: draft.id || slugify(draft.name),
        valueHistory: parseHistory(historyDraft),
      };
      const response = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to save item.");

      const freshItems = await refreshItems();
      const saved = freshItems.find((item) => item.id === data.item.id) ?? data.item;
      selectItem(saved);
      setStatus(`Saved ${saved.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    if (!draft.id) {
      setStatus("Nothing to delete yet.");
      return;
    }

    setSaving(true);
    setStatus(`Deleting ${draft.name}...`);

    try {
      const response = await fetch(`/api/admin/items/${draft.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to delete item.");

      const freshItems = await refreshItems();
      const next = freshItems[0] ?? emptyItem;
      selectItem(next);
      setStatus(`Deleted ${draft.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  async function seedFirestore() {
    setSaving(true);
    setStatus("Seeding Firestore from local item data...");

    try {
      const response = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to seed Firestore.");

      const freshItems = await refreshItems();
      selectItem(freshItems[0] ?? emptyItem);
      setStatus(`Seeded ${data.count} items into Firestore.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Seed failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-shell px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="admin-grid">
          <aside className="admin-sidebar">
            <div className="admin-panel-head">
              <div>
                <span>Firestore items</span>
                <strong>{items.length} records</strong>
              </div>
              <button type="button" className="admin-icon-button" onClick={newItem} aria-label="Create new item">
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>

            <label className="admin-search">
              <Search size={15} strokeWidth={2.4} />
              <span className="sr-only">Search admin items</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names" />
            </label>

            <div className="admin-item-list">
              {filtered.map((item) => (
                <button key={item.id} type="button" className={cn("admin-item-button", selectedId === item.id && "admin-item-button-active")} onClick={() => selectItem(item)}>
                  <span>{item.name}</span>
                  <small>
                    {item.value.toLocaleString()} keys / {item.demand} demand
                  </small>
                </button>
              ))}
              {!filtered.length ? <p className="admin-empty">No matching items.</p> : null}
            </div>
          </aside>

          <div className="admin-editor">
            <div className="admin-editor-head">
              <div>
                <span>Item editor</span>
                <h2 className="font-display">{draft.name || "New item"}</h2>
              </div>
              <div className="admin-editor-actions">
                <button type="button" className="admin-secondary-action" onClick={seedFirestore} disabled={saving}>
                  <Database size={15} strokeWidth={2.4} />
                  Seed
                </button>
                <button type="button" className="admin-secondary-action" onClick={() => selectedId && selectItem(items.find((item) => item.id === selectedId) ?? draft)} disabled={saving || !selectedId}>
                  <RotateCcw size={15} strokeWidth={2.4} />
                  Reset
                </button>
                <button type="button" className="admin-delete-action" onClick={deleteItem} disabled={saving || !draft.id}>
                  <Trash2 size={15} strokeWidth={2.4} />
                  Delete
                </button>
                <button type="button" className="admin-save-action" onClick={saveItem} disabled={saving}>
                  <Save size={15} strokeWidth={2.4} />
                  Save
                </button>
              </div>
            </div>

            <div className="admin-status" aria-live="polite">
              {status}
            </div>
            <div className="admin-status admin-history-note">
              Trade graph history is kept automatically: saving a changed value appends a timestamped value point, while the JSON field stays editable for imports and corrections.
            </div>

            <div className="admin-form-grid">
              <AdminInput label="ID" value={draft.id} onChange={(value) => updateDraft("id", slugify(value))} placeholder="auto-from-name-if-empty" />
              <AdminInput
                label="Name"
                value={draft.name}
                onChange={(value) => {
                  updateDraft("name", value);
                  if (!draft.id) updateDraft("id", slugify(value));
                }}
              />
              <AdminSelect label="Category" value={draft.category} onChange={(value) => updateDraft("category", value as ItemCategory)} options={categories.filter((item) => item.id !== "all").map((item) => item.id)} />
              <AdminSelect label="Rarity" value={draft.rarity} onChange={(value) => updateDraft("rarity", value as ItemRarity)} options={rarityOptions} />
              <AdminInput label="Value" type="number" value={String(draft.value)} onChange={(value) => updateDraft("value", Number(value))} />
              <AdminInput label="Demand" type="number" value={String(draft.demand)} onChange={(value) => updateDraft("demand", Number(value))} />
              <AdminSelect label="Trend" value={draft.trend} onChange={(value) => updateDraft("trend", value as ItemTrend)} options={trendOptions} />
              <AdminInput label="Gem Tax" type="number" value={String(draft.taxGems)} onChange={(value) => updateDraft("taxGems", Number(value))} />
              <AdminInput label="Prestige" type="number" value={String(draft.prestige)} onChange={(value) => updateDraft("prestige", Number(value))} />
              <AdminInput label="Owners / Label" value={draft.owners} onChange={(value) => updateDraft("owners", value)} />
              <AdminInput label="Source" value={draft.source ?? ""} onChange={(value) => updateDraft("source", value)} placeholder="Cosmetic crate, event reward..." />
              <AdminInput label="Icon URL" value={draft.iconUrl ?? ""} onChange={(value) => updateDraft("iconUrl", value)} placeholder="/icons/items/example.png" />
              <AdminTextarea label="Note" value={draft.note} onChange={(value) => updateDraft("note", value)} />
              <AdminTextarea label="Value History JSON" value={historyDraft} onChange={setHistoryDraft} monospace />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function AdminSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function AdminTextarea({ label, monospace = false, onChange, value }: { label: string; monospace?: boolean; onChange: (value: string) => void; value: string }) {
  return (
    <label className={cn("admin-field admin-field-wide", monospace && "admin-field-code")}>
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={monospace ? 9 : 4} />
    </label>
  );
}
