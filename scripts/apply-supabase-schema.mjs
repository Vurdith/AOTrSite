import { readFile } from "node:fs/promises";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const connectionUrl = new URL(databaseUrl);
connectionUrl.searchParams.delete("sslmode");

const client = new pg.Client({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
  console.log("Applied Supabase schema.");
} finally {
  await client.end();
}
