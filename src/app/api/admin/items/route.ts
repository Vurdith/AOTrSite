import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createAdminLog } from "@/lib/adminLogs";
import { requireAdminSession, requireAdminSessionWithUser } from "@/lib/discordAuth";
import { getDatabaseValueItems, saveValueItemWithPrevious, seedValueItems } from "@/lib/supabaseItems";
import type { ValueItem } from "@/content/items";

const itemChangeLabels: Partial<Record<keyof ValueItem, string>> = {
  category: "Category",
  demand: "Demand",
  iconUrl: "Icon URL",
  id: "ID",
  name: "Name",
  note: "Note",
  owners: "Owners / Label",
  prestige: "Prestige",
  rarity: "Rarity",
  source: "Source",
  taxGems: "Gem Tax",
  trend: "Trend",
  value: "Value",
  valueHistory: "Value History",
  valueKeys: "Value Keys",
  valueMasks: "Value Vizards",
  valueScrolls: "Value Scrolls",
};

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid item data.", issues: error.issues }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : "Unexpected admin API error.";
  return NextResponse.json({ error: message }, { status: 500 });
}

function formatLogValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  return JSON.stringify(value, null, 2);
}

function getItemChanges(previous: ValueItem | null, next: ValueItem) {
  const keys = Object.keys(itemChangeLabels) as (keyof ValueItem)[];

  return keys
    .filter((key) => JSON.stringify(previous?.[key] ?? null) !== JSON.stringify(next[key] ?? null))
    .map((key) => ({
      after: formatLogValue(next[key]),
      before: formatLogValue(previous?.[key]),
      field: String(key),
      label: itemChangeLabels[key] ?? String(key),
    }));
}

function summarizeItemChanges(previous: ValueItem | null, next: ValueItem, changedLabels: string[]) {
  if (!previous) return `Created ${next.name}.`;

  if (!changedLabels.length) return `Saved ${next.name} with no visible field changes.`;

  return `Updated ${next.name}: ${changedLabels.join(", ")}.`;
}

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const items = await getDatabaseValueItems();

    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSessionWithUser();
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();

    if (body?.action === "seed") {
      const count = await seedValueItems();
      await createAdminLog({
        action: "items_seeded",
        actor: auth.session,
        changes: [{ after: String(count), before: null, field: "seededItems", label: "Seeded Items" }],
        summary: `Seeded ${count} local items into Supabase.`,
        targetType: "items",
      });

      return NextResponse.json({ count });
    }

    const { item, previous } = await saveValueItemWithPrevious(body);
    const changes = getItemChanges(previous, item);
    await createAdminLog({
      action: previous ? "item_updated" : "item_created",
      actor: auth.session,
      changes,
      summary: summarizeItemChanges(previous, item, changes.map((change) => change.label)),
      targetId: item.id,
      targetName: item.name,
      targetType: "item",
    });

    return NextResponse.json({ item });
  } catch (error) {
    return errorResponse(error);
  }
}
