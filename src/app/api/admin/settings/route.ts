import { NextResponse } from "next/server";

import { getValueCurrencySettings, saveValueCurrencySettings } from "@/lib/firestoreItems";

export async function GET() {
  const settings = await getValueCurrencySettings();

  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  try {
    const settings = await saveValueCurrencySettings(await request.json());

    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save settings.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
