import { NextResponse } from "next/server";

import { createAdminLog } from "@/lib/adminLogs";
import { requireAdminRole } from "@/lib/discordAuth";
import { readJsonRequest, rejectCrossOriginMutation, requestValidationResponse } from "@/lib/security";
import { exportValueMarketBackup, importValueMarketBackup } from "@/lib/supabaseItems";

const restoreRequestMaxBytes = 4 * 1024 * 1024;

function backupFilename(date: Date) {
  return `aotr-market-backup-${date.toISOString().replace(/[:.]/g, "-")}.json`;
}

export async function GET(request: Request) {
  const forbidden = rejectCrossOriginMutation(request);
  if (forbidden) return forbidden;

  const auth = await requireAdminRole(["owner", "editor", "auditor"]);
  if ("response" in auth) return auth.response;

  try {
    const backup = await exportValueMarketBackup();

    await createAdminLog({
      action: "backup_exported",
      actor: auth.session,
      changes: [{ after: String(backup.itemCount), before: null, field: "itemCount", label: "Exported Items" }],
      request,
      summary: `Exported market backup with ${backup.itemCount} items.`,
      targetName: "Market backup",
      targetType: "backup",
    });

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${backupFilename(new Date(backup.exportedAt))}"`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Unable to export admin backup.", error);
    return NextResponse.json({ error: "Unable to export backup." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginMutation(request);
  if (forbidden) return forbidden;

  const auth = await requireAdminRole(["owner"]);
  if ("response" in auth) return auth.response;

  try {
    const body = await readJsonRequest(request, restoreRequestMaxBytes);
    const deleteMissing = typeof body === "object" && body && "deleteMissing" in body ? Boolean(body.deleteMissing) : false;
    const backup = typeof body === "object" && body && "backup" in body ? body.backup : body;
    const result = await importValueMarketBackup(backup, { deleteMissing });

    await createAdminLog({
      action: "backup_restored",
      actor: auth.session,
      changes: [
        { after: String(result.itemCount), before: null, field: "itemCount", label: "Restored Items" },
        { after: String(result.deletedMissing), before: null, field: "deleteMissing", label: "Deleted Missing Items" },
      ],
      request,
      summary: `Restored market backup with ${result.itemCount} items${result.deletedMissing ? " and removed missing records" : ""}.`,
      targetName: "Market backup",
      targetType: "backup",
    });

    return NextResponse.json(result);
  } catch (error) {
    const requestError = requestValidationResponse(error);
    if (requestError) return requestError;

    console.error("Unable to restore admin backup.", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to restore backup." }, { status: 400 });
  }
}
