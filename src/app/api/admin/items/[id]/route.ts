import { NextResponse } from "next/server";

import { createAdminLog } from "@/lib/adminLogs";
import { requireAdminSession, requireAdminSessionWithUser } from "@/lib/discordAuth";
import { deleteValueItem, getValueItem, saveValueItem } from "@/lib/supabaseItems";
import type { ValueItem } from "@/content/items";

type ItemRouteProps = {
  params: Promise<{ id: string }>;
};

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

function formatLogValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  return JSON.stringify(value, null, 2);
}

function getItemChanges(previous: ValueItem | null, next: ValueItem | null) {
  const keys = Object.keys(itemChangeLabels) as (keyof ValueItem)[];

  return keys
    .filter((key) => JSON.stringify(previous?.[key] ?? null) !== JSON.stringify(next?.[key] ?? null))
    .map((key) => ({
      after: formatLogValue(next?.[key]),
      before: formatLogValue(previous?.[key]),
      field: String(key),
      label: itemChangeLabels[key] ?? String(key),
    }));
}

export async function GET(_request: Request, { params }: ItemRouteProps) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const item = await getValueItem(id);

  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PUT(request: Request, { params }: ItemRouteProps) {
  const auth = await requireAdminSessionWithUser();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const previous = await getValueItem(id);
    const item = await saveValueItem({ ...(await request.json()), id });
    const changes = getItemChanges(previous, item);
    await createAdminLog({
      action: "item_updated",
      actor: auth.session,
      changes,
      summary: changes.length ? `Updated ${item.name}: ${changes.map((change) => change.label).join(", ")}.` : `Saved ${item.name} with no visible field changes.`,
      targetId: item.id,
      targetName: item.name,
      targetType: "item",
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update item.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: ItemRouteProps) {
  const auth = await requireAdminSessionWithUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const item = await getValueItem(id);
  await deleteValueItem(id);
  await createAdminLog({
    action: "item_deleted",
    actor: auth.session,
    changes: getItemChanges(item, null),
    summary: `Deleted ${item?.name ?? id}.`,
    targetId: id,
    targetName: item?.name ?? id,
    targetType: "item",
  });

  return NextResponse.json({ ok: true });
}
