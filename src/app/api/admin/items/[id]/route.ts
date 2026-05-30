import { NextResponse } from "next/server";

import { deleteValueItem, getValueItem, saveValueItem } from "@/lib/firestoreItems";

type ItemRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: ItemRouteProps) {
  const { id } = await params;
  const item = await getValueItem(id);

  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PUT(request: Request, { params }: ItemRouteProps) {
  try {
    const { id } = await params;
    const item = await saveValueItem({ ...(await request.json()), id });

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update item.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: ItemRouteProps) {
  const { id } = await params;
  await deleteValueItem(id);

  return NextResponse.json({ ok: true });
}
