import { NextResponse } from "next/server";

import { createAdminLog } from "@/lib/adminLogs";
import { requireAdminRole } from "@/lib/discordAuth";
import { readJsonRequest, rejectCrossOriginMutation, requestValidationResponse } from "@/lib/security";
import { getValueCurrencySettings, saveValueCurrencySettings } from "@/lib/supabaseItems";
import type { ValueCurrencySettings } from "@/lib/valueCurrency";

const adminSettingsRequestMaxBytes = 8 * 1024;

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
  const auth = await requireAdminRole(["owner", "editor", "auditor"]);
  if ("response" in auth) return auth.response;

  const settings = await getValueCurrencySettings({ timeoutMs: 0 });

  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginMutation(request);
  if (forbidden) return forbidden;

  const auth = await requireAdminRole(["owner", "editor"]);
  if ("response" in auth) return auth.response;

  try {
    const previous = await getValueCurrencySettings({ timeoutMs: 0 });
    const settings = await saveValueCurrencySettings(await readJsonRequest(request, adminSettingsRequestMaxBytes));
    const changes = getSettingChanges(previous, settings);

    await createAdminLog({
      action: "settings_updated",
      actor: auth.session,
      changes,
      request,
      summary: changes.length ? `Updated conversion settings: ${changes.map((change) => change.label).join(", ")}.` : "Saved conversion settings with no visible changes.",
      targetName: "Currency rates",
      targetType: "settings",
    });

    return NextResponse.json({ settings });
  } catch (error) {
    const requestError = requestValidationResponse(error);
    if (requestError) return requestError;

    console.error("Unable to save admin settings.", error);
    return NextResponse.json({ error: "Unable to save settings." }, { status: 400 });
  }
}
