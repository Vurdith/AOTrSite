import "server-only";

type ErrorPayload = {
  context?: Record<string, unknown>;
  error: unknown;
  source: string;
};

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  return { message: String(error) };
}

export async function reportServerError({ context, error, source }: ErrorPayload) {
  const payload = {
    context,
    error: serializeError(error),
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "local",
    source,
    timestamp: new Date().toISOString(),
  };

  console.error("[observability]", JSON.stringify(payload));

  const webhookUrl = process.env.ERROR_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  } catch (webhookError) {
    console.error("[observability:webhook_failed]", webhookError);
  }
}
