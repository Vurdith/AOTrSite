import { NextResponse } from "next/server";

import { createAdminLog } from "@/lib/adminLogs";
import { requireAdminSession, requireAdminSessionWithUser } from "@/lib/discordAuth";
import { getValueCurrencySettings, saveValueCurrencySettings } from "@/lib/supabaseItems";
import type { ValueCurrencySettings } from "@/lib/valueCurrency";

const settingChangeLabels: Record<keyof ValueCurrencySettings, string> = {
  maskToKeys: "1 Vizard = Keys",
  scrollToKeys: "1 Scroll = Keys",
};

function getSettingChanges(previous: ValueCurrencySettings, next: ValueCurrencySettings) {
  return (Object.keys(settingChangeLabels) as (keyof ValueCurrencySettings)[])
    .filter((key) => previous[key] !== next[key])
    .map((key) => ({
      after: String(next[key]),
      before: String(previous[key]),
      field: key,
      label: settingChangeLabels[key],
    }));
}

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const settings = await getValueCurrencySettings({ timeoutMs: 0 });

  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const auth = await requireAdminSessionWithUser();
  if ("response" in auth) return auth.response;

  try {
    const previous = await getValueCurrencySettings({ timeoutMs: 0 });
    const settings = await saveValueCurrencySettings(await request.json());
    const changes = getSettingChanges(previous, settings);

    await createAdminLog({
      action: "settings_updated",
      actor: auth.session,
      changes,
      summary: changes.length ? `Updated conversion settings: ${changes.map((change) => change.label).join(", ")}.` : "Saved conversion settings with no visible changes.",
      targetName: "Currency rates",
      targetType: "settings",
    });

    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save settings.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
