import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createAdminLog } from "@/lib/adminLogs";
import { requireAdminRole } from "@/lib/discordAuth";
import { readJsonRequest, rejectCrossOriginMutation, requestValidationResponse } from "@/lib/security";
import { deleteValueItem, getValueItem, saveValueItemWithPrevious } from "@/lib/supabaseItems";
import type { ValueItem } from "@/content/items";

type ItemRouteProps = {
  params: Promise<{ id: string }>;
};

const adminItemRequestMaxBytes = 128 * 1024;

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
  const auth = await requireAdminRole(["owner", "editor", "auditor"]);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const item = await getValueItem(id);

  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PUT(request: Request, { params }: ItemRouteProps) {
  const forbidden = rejectCrossOriginMutation(request);
  if (forbidden) return forbidden;

  const auth = await requireAdminRole(["owner", "editor"]);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const body = await readJsonRequest(request, adminItemRequestMaxBytes);
    const { item, previous } = await saveValueItemWithPrevious({ ...(typeof body === "object" && body ? body : {}), id });
    const changes = getItemChanges(previous, item);
    await createAdminLog({
      action: "item_updated",
      actor: auth.session,
      changes,
      request,
      summary: changes.length ? `Updated ${item.name}: ${changes.map((change) => change.label).join(", ")}.` : `Saved ${item.name} with no visible field changes.`,
      targetId: item.id,
      targetName: item.name,
      targetType: "item",
    });

    return NextResponse.json({ item });
  } catch (error) {
    const requestError = requestValidationResponse(error);
    if (requestError) return requestError;

    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid item data.", issues: error.issues }, { status: 400 });
    }

    console.error("Unable to update admin item.", error);
    return NextResponse.json({ error: "Unable to update item." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: ItemRouteProps) {
  const forbidden = rejectCrossOriginMutation(request);
  if (forbidden) return forbidden;

  const auth = await requireAdminRole(["owner"]);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const item = await getValueItem(id);
    await deleteValueItem(id);
    await createAdminLog({
      action: "item_deleted",
      actor: auth.session,
      changes: getItemChanges(item, null),
      request,
      summary: `Deleted ${item?.name ?? id}.`,
      targetId: id,
      targetName: item?.name ?? id,
      targetType: "item",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete admin item.", error);
    return NextResponse.json({ error: "Unable to delete item." }, { status: 500 });
  }
}
