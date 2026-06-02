import { NextResponse } from "next/server";

import { createAdminLog } from "@/lib/adminLogs";
import { requireAdminSessionWithUser } from "@/lib/discordAuth";
import { uploadR2Object } from "@/lib/r2Media";
import { rejectCrossOriginMutation, rejectRequestBodyOverLimit } from "@/lib/security";

const allowedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const maxUploadBytes = 2 * 1024 * 1024;
const maxMultipartRequestBytes = maxUploadBytes + 64 * 1024;

function slugifyFilePart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasValidImageSignature(body: Buffer, contentType: string) {
  if (contentType === "image/png") {
    return body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (contentType === "image/jpeg") {
    return body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  }

  if (contentType === "image/webp") {
    return body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP";
  }

  if (contentType === "image/gif") {
    const signature = body.subarray(0, 6).toString("ascii");
    return signature === "GIF87a" || signature === "GIF89a";
  }

  return false;
}

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginMutation(request);
  if (forbidden) return forbidden;

  const tooLarge = rejectRequestBodyOverLimit(request, maxMultipartRequestBytes);
  if (tooLarge) return tooLarge;

  const auth = await requireAdminSessionWithUser();
  if ("response" in auth) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const itemId = slugifyFilePart(String(formData.get("itemId") ?? "item"));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (file.size > maxUploadBytes) {
      return NextResponse.json({ error: "Image must be 2 MB or smaller." }, { status: 413 });
    }

    const extension = allowedTypes.get(file.type);

    if (!extension) {
      return NextResponse.json({ error: "Upload a PNG, JPG, WEBP, or GIF image." }, { status: 400 });
    }

    const body = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageSignature(body, file.type)) {
      return NextResponse.json({ error: "Image file content does not match the declared type." }, { status: 400 });
    }

    const key = `items/${itemId || "item"}-${Date.now()}.${extension}`;
    const url = await uploadR2Object({ body, contentType: file.type, key });
    const fileName = slugifyFilePart(file.name).slice(0, 80) || "uploaded-image";

    await createAdminLog({
      action: "media_uploaded",
      actor: auth.session,
      changes: [
        { after: url, before: null, field: "iconUrl", label: "Uploaded Icon URL" },
        { after: fileName, before: null, field: "fileName", label: "File Name" },
      ],
      summary: `Uploaded item icon ${fileName}.`,
      targetId: itemId || undefined,
      targetName: itemId || "Item icon",
      targetType: "media",
    });

    return NextResponse.json({ key, url });
  } catch (error) {
    console.error("Unable to upload image.", error);

    return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
  }
}
