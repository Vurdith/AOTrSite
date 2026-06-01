import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/discordAuth";
import { getFirestoreValueItems, saveValueItem, seedValueItems } from "@/lib/firestoreItems";

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid item data.", issues: error.issues }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : "Unexpected admin API error.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const items = await getFirestoreValueItems();

    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();

    if (body?.action === "seed") {
      const count = await seedValueItems();

      return NextResponse.json({ count });
    }

    const item = await saveValueItem(body);

    return NextResponse.json({ item });
  } catch (error) {
    return errorResponse(error);
  }
}
