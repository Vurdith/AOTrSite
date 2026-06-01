import { NextResponse } from "next/server";

import { createAdminLog } from "@/lib/adminLogs";
import { requireAdminSessionWithUser } from "@/lib/discordAuth";
import { uploadR2Object } from "@/lib/r2Media";

const allowedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function slugifyFilePart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  const auth = await requireAdminSessionWithUser();
  if ("response" in auth) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const itemId = slugifyFilePart(String(formData.get("itemId") ?? "item"));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const extension = allowedTypes.get(file.type);

    if (!extension) {
      return NextResponse.json({ error: "Upload a PNG, JPG, WEBP, or GIF image." }, { status: 400 });
    }

    const body = Buffer.from(await file.arrayBuffer());
    const key = `items/${itemId || "item"}-${Date.now()}.${extension}`;
    const url = await uploadR2Object({ body, contentType: file.type, key });

    await createAdminLog({
      action: "media_uploaded",
      actor: auth.session,
      changes: [
        { after: url, before: null, field: "iconUrl", label: "Uploaded Icon URL" },
        { after: file.name, before: null, field: "fileName", label: "File Name" },
      ],
      summary: `Uploaded item icon ${file.name}.`,
      targetId: itemId || undefined,
      targetName: itemId || "Item icon",
      targetType: "media",
    });

    return NextResponse.json({ key, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload image.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
