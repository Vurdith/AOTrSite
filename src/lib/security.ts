import "server-only";

import { NextResponse } from "next/server";

export class RequestValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RequestValidationError";
    this.status = status;
  }
}

export function requestValidationResponse(error: unknown) {
  if (!(error instanceof RequestValidationError)) return null;

  return NextResponse.json({ error: error.message }, { status: error.status });
}

export function rejectCrossOriginMutation(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null;

  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  if (fetchSite === "cross-site") {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  return null;
}

function getContentLength(request: Request) {
  const value = request.headers.get("content-length");
  if (!value) return null;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new RequestValidationError("Invalid Content-Length header.", 400);
  }

  return parsed;
}

export function rejectRequestBodyOverLimit(request: Request, maxBytes: number) {
  let contentLength: number | null;

  try {
    contentLength = getContentLength(request);
  } catch {
    return NextResponse.json({ error: "Invalid Content-Length header." }, { status: 400 });
  }

  if (contentLength !== null && contentLength > maxBytes) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  return null;
}

export async function readJsonRequest(request: Request, maxBytes: number) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    throw new RequestValidationError("Content-Type must be application/json.", 415);
  }

  const contentLength = getContentLength(request);
  if (contentLength !== null && contentLength > maxBytes) {
    throw new RequestValidationError("Request body is too large.", 413);
  }

  if (!request.body) {
    throw new RequestValidationError("Request body is required.", 400);
  }

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    receivedBytes += value.byteLength;
    if (receivedBytes > maxBytes) {
      throw new RequestValidationError("Request body is too large.", 413);
    }

    chunks.push(Buffer.from(value));
  }

  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) {
    throw new RequestValidationError("Request body is required.", 400);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestValidationError("Request body must be valid JSON.", 400);
  }
}

export function getClientIp(request: Request) {
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("x-forwarded-for")?.split(",")[0],
    request.headers.get("x-real-ip"),
  ];
  const value = candidates.map((candidate) => candidate?.trim()).find(Boolean);

  if (!value || value.length > 96 || !/^[a-fA-F0-9:.\-]+$/.test(value)) {
    return "unknown";
  }

  return value;
}
