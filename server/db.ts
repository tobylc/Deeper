import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

// Configure Neon WebSocket constructor - disable for Node.js compatibility
// The WebSocket configuration causes issues in Node.js environments
// Neon will fall back to HTTP connections automatically
if (typeof window !== 'undefined') {
  // Only configure WebSocket in browser environments
  neonConfig.webSocketConstructor = ws;
} else {
  // In Node.js, disable WebSocket to prevent the ErrorEvent issue
  console.log('[DB] Using HTTP connections for Neon database (Node.js environment)');
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Ultra-conservative connection pool for Neon's strict limits
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1, // Single connection only to prevent rate limiting
  min: 0, // No minimum connections
  idleTimeoutMillis: 2000, // Very quick idle timeout
  connectionTimeoutMillis: 1000, // Minimal connection timeout
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

// Simple connection queue to serialize database access
class ConnectionQueue {
  private queue: Array<() => void> = [];
  private isProcessing = false;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      try {
        await operation();
        // Small delay between operations to prevent overwhelming Neon
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('[DB] Queue operation failed:', error);
      }
    }
    
    this.isProcessing = false;
  }
}

const connectionQueue = new ConnectionQueue();

// Queued database operations to prevent connection flooding
export async function withDatabaseConnection<T>(
  operation: () => Promise<T>
): Promise<T> {
  return connectionQueue.execute(operation);
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