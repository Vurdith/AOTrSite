import "server-only";

import crypto from "node:crypto";

const service = "s3";
const region = "auto";

function getRequiredR2Env(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

function hash(value: Buffer | string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function getSigningKey(secret: string, date: string) {
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);

  return hmac(serviceKey, "aws4_request");
}

function encodePath(value: string) {
  return value
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function getAmzDates(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");

  return {
    dateStamp: iso.slice(0, 8),
    amzDate: iso,
  };
}

export function getR2PublicUrl(key: string) {
  return `${getRequiredR2Env("R2_PUBLIC_BASE_URL").replace(/\/$/, "")}/${encodePath(key)}`;
}

export async function uploadR2Object({ body, contentType, key }: { body: Buffer; contentType: string; key: string }) {
  const accountId = getRequiredR2Env("R2_ACCOUNT_ID");
  const bucket = getRequiredR2Env("R2_BUCKET_NAME");
  const accessKeyId = getRequiredR2Env("R2_ACCESS_KEY_ID");
  const secretAccessKey = getRequiredR2Env("R2_SECRET_ACCESS_KEY");
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${bucket}/${encodePath(key)}`;
  const endpoint = `https://${host}${canonicalUri}`;
  const { amzDate, dateStamp } = getAmzDates();
  const payloadHash = hash(body);
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders = [`content-type:${contentType}`, `host:${host}`, `x-amz-content-sha256:${payloadHash}`, `x-amz-date:${amzDate}`].join("\n") + "\n";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hash(canonicalRequest)].join("\n");
  const signature = crypto.createHmac("sha256", getSigningKey(secretAccessKey, dateStamp)).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
    body: new Blob([new Uint8Array(body)], { type: contentType }),
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed with ${response.status}.`);
  }

  return getR2PublicUrl(key);
}
