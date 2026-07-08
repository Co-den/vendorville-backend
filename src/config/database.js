import { neon, neonConfig } from "@neondatabase/serverless";
import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";

// Check if we should use Neon Local based on explicit environment variable
const useNeonLocal = process.env.USE_NEON_LOCAL === "true";
if (useNeonLocal) {
  const neonLocalHost = process.env.NEON_LOCAL_HOST || "neon-local";
  const neonLocalPort = process.env.NEON_LOCAL_PORT || "5432";
  neonConfig.fetchEndpoint = `http://${neonLocalHost}:${neonLocalPort}/sql`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

export { db, sql };

