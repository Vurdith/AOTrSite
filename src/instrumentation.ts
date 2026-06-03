import type { Instrumentation } from "next";

import { reportServerError } from "@/lib/observability";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    console.info("[observability] server instrumentation registered");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  await reportServerError({
    context: {
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
    },
    error,
    source: "next-request",
  });
};
