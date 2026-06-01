import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/discordAuth";
import { getValueCurrencySettings, saveValueCurrencySettings } from "@/lib/firestoreItems";

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const settings = await getValueCurrencySettings();

  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const settings = await saveValueCurrencySettings(await request.json());

    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save settings.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
