const target = process.env.LOAD_TEST_URL ?? "http://localhost:3000";
const durationMs = Number(process.env.LOAD_TEST_DURATION_MS ?? 60_000);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY ?? 40);
const paths = (process.env.LOAD_TEST_PATHS ?? "/,/values,/calculator,/updates,/api/health")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

const stats = {
  failures: 0,
  latencies: [],
  statuses: new Map(),
  total: 0,
};

function record(status, latencyMs, failed) {
  stats.total += 1;
  stats.latencies.push(latencyMs);
  stats.statuses.set(status, (stats.statuses.get(status) ?? 0) + 1);
  if (failed) stats.failures += 1;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

async function worker(workerId, endAt) {
  let index = workerId;

  while (Date.now() < endAt) {
    const path = paths[index % paths.length];
    const startedAt = performance.now();

    try {
      const response = await fetch(new URL(path, target), {
        headers: { "User-Agent": "AOTrSite-load-test/1.0" },
      });
      record(response.status, performance.now() - startedAt, response.status >= 500);
    } catch {
      record("network-error", performance.now() - startedAt, true);
    }

    index += concurrency;
  }
}

const endAt = Date.now() + durationMs;
await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index, endAt)));

const statusCounts = Object.fromEntries(stats.statuses.entries());
const failureRate = stats.total ? ((stats.failures / stats.total) * 100).toFixed(2) : "0.00";

console.log(
  JSON.stringify(
    {
      concurrency,
      durationMs,
      failureRate: `${failureRate}%`,
      p50Ms: Math.round(percentile(stats.latencies, 0.5)),
      p95Ms: Math.round(percentile(stats.latencies, 0.95)),
      p99Ms: Math.round(percentile(stats.latencies, 0.99)),
      paths,
      statusCounts,
      target,
      totalRequests: stats.total,
    },
    null,
    2,
  ),
);
