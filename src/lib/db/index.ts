import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
}

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

/**
 * Serverless settings. Each function invocation is short-lived and handles one
 * request, so a pool of its own is pointless — Supabase's transaction pooler is
 * the pool. Holding several idle connections per instance just burns slots, and
 * once they run out new requests queue forever, which looks like the page
 * hanging rather than erroring.
 */
const client =
  globalForDb.client ??
  postgres(connectionString, {
    // Transaction-mode pooling can't do prepared statements.
    prepare: false,
    // postgres.js introspects column types on connect. That extra round trip
    // confuses Supavisor in transaction mode, so skip it.
    fetch_types: false,
    // A page needs a few queries. One connection forces them to pipeline on a
    // single pooled session, which is what was hanging; five with no idle
    // timeout leaked. Three, released promptly, is the middle.
    max: 3,
    // Hand it back quickly instead of squatting on a slot.
    idle_timeout: 20,
    // Fail in 10s rather than hanging. A visible error beats a spinner.
    connect_timeout: 10,
  });

globalForDb.client = client;

export const db = drizzle(client, { schema });
export { schema };
