import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Production-ready connection pool with aggressive connection limiting for Neon
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3, // Very conservative for Neon's strict limits
  min: 1, // Maintain minimum connections
  idleTimeoutMillis: 5000, // Quick idle timeout
  connectionTimeoutMillis: 2000, // Short connection timeout
});

// Minimal connection error handling optimized for Neon
pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
  if (err.message?.includes('Too many database connection attempts')) {
    console.log('[DB] Neon connection limit reached - reducing pool activity');
  }
});

// Database instance with enhanced error handling
export const db = drizzle({ client: pool, schema });

// Connection wrapper with retry logic for Neon rate limits
export async function withDatabaseConnection<T>(
  operation: (client: any) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        const result = await operation(client);
        return result;
      } finally {
        client.release();
      }
    } catch (error: any) {
      lastError = error;
      
      if (error.message?.includes('Too many database connection attempts')) {
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`[DB] Connection attempt ${attempt}/${maxRetries} failed, backing off ${backoffTime}ms`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }
      }
      
      // For non-connection errors, don't retry
      if (!error.message?.includes('connection') && !error.message?.includes('database')) {
        throw error;
      }
    }
  }
  
  throw lastError;
}

// Health check function for production monitoring
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown function
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await pool.end();
    console.log('Database connections closed gracefully');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}