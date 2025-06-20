import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Single shared connection with rate limiting
const sql = neon(process.env.DATABASE_URL);
let lastQueryTime = 0;
const QUERY_DELAY = 1000; // 1 second between queries

async function enforceRateLimit() {
  const timeSinceLastQuery = Date.now() - lastQueryTime;
  if (timeSinceLastQuery < QUERY_DELAY) {
    await new Promise(resolve => setTimeout(resolve, QUERY_DELAY - timeSinceLastQuery));
  }
  lastQueryTime = Date.now();
}

async function safeQuery<T>(queryFn: () => Promise<T>): Promise<T | null> {
  try {
    await enforceRateLimit();
    return await queryFn();
  } catch (error: any) {
    console.error('[DB-STABLE] Query failed:', error.message);
    return null;
  }
}

export const stableDb = {
  async healthCheck(): Promise<boolean> {
    const result = await safeQuery(async () => {
      const rows = await sql`SELECT 1 as alive`;
      return rows[0]?.alive === 1;
    });
    return result === true;
  },

  async getUserByEmail(email: string) {
    return safeQuery(async () => {
      const result = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
      return result[0] || null;
    });
  },

  async getUserById(id: string) {
    return safeQuery(async () => {
      const result = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
      return result[0] || null;
    });
  }
};

console.log('[DB-STABLE] Stable database interface initialized');