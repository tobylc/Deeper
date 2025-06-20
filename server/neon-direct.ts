import { neon } from '@neondatabase/serverless';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Global connection instance with connection limiting
let connectionInstance: any = null;
let connectionPromise: Promise<any> | null = null;
let lastConnectionTime = 0;
const CONNECTION_COOLDOWN = 5000; // 5 second cooldown between connections

function getConnection() {
  const now = Date.now();
  
  // If we have a recent connection, reuse it
  if (connectionInstance && (now - lastConnectionTime) < CONNECTION_COOLDOWN) {
    return connectionInstance;
  }
  
  // Create new connection with cooldown
  if (!connectionPromise) {
    connectionPromise = new Promise((resolve) => {
      setTimeout(() => {
        connectionInstance = neon(process.env.DATABASE_URL!);
        lastConnectionTime = Date.now();
        connectionPromise = null;
        resolve(connectionInstance);
      }, Math.max(0, CONNECTION_COOLDOWN - (now - lastConnectionTime)));
    });
  }
  
  return connectionPromise;
}

// Query wrapper with connection rate limiting
export async function executeQuery<T>(
  queryFn: (sql: any) => Promise<T>,
  timeoutMs: number = 3000
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Database query timeout'));
    }, timeoutMs);

    try {
      const sql = await getConnection();
      const result = await queryFn(sql);
      clearTimeout(timeout);
      resolve(result);
    } catch (error: any) {
      clearTimeout(timeout);
      console.error('[NEON] Query failed:', error.message);
      reject(error);
    }
  });
}

// Direct database operations for critical queries
export const directDb = {
  // User operations
  async getUserByEmail(email: string) {
    return executeQuery(async (sql) => {
      const result = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
      return result[0] || null;
    });
  },

  async getUserById(id: string) {
    return executeQuery(async (sql) => {
      const result = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
      return result[0] || null;
    });
  },

  async createUser(userData: any) {
    return executeQuery(async (sql) => {
      const { id, email, firstName, lastName, profileImageUrl, googleId } = userData;
      const result = await sql`
        INSERT INTO users (id, email, first_name, last_name, profile_image_url, google_id, subscription_tier, subscription_status, max_connections)
        VALUES (${id}, ${email}, ${firstName}, ${lastName}, ${profileImageUrl}, ${googleId}, 'free', 'active', 1)
        RETURNING *
      `;
      return result[0];
    });
  },

  async updateUser(id: string, updates: any) {
    return executeQuery(async (sql) => {
      const setClauses = [];
      const values = [];
      
      if (updates.firstName !== undefined) {
        setClauses.push(`first_name = $${setClauses.length + 2}`);
        values.push(updates.firstName);
      }
      if (updates.lastName !== undefined) {
        setClauses.push(`last_name = $${setClauses.length + 2}`);
        values.push(updates.lastName);
      }
      if (updates.hasSeenOnboarding !== undefined) {
        setClauses.push(`has_seen_onboarding = $${setClauses.length + 2}`);
        values.push(updates.hasSeenOnboarding);
      }
      
      if (setClauses.length === 0) return null;
      
      const result = await sql`
        UPDATE users 
        SET ${sql.unsafe(setClauses.join(', '))}
        WHERE id = ${id}
        RETURNING *
      `;
      return result[0] || null;
    });
  },

  // Connection operations
  async getConnectionsByEmail(email: string) {
    return executeQuery(async (sql) => {
      return await sql`
        SELECT * FROM connections 
        WHERE inviter_email = ${email} OR invitee_email = ${email}
        ORDER BY created_at DESC
      `;
    });
  },

  async getConnectionById(id: number) {
    return executeQuery(async (sql) => {
      const result = await sql`SELECT * FROM connections WHERE id = ${id} LIMIT 1`;
      return result[0] || null;
    });
  },

  // Conversation operations
  async getConversationsByConnection(connectionId: number) {
    return executeQuery(async (sql) => {
      return await sql`
        SELECT * FROM conversations 
        WHERE connection_id = ${connectionId}
        ORDER BY last_activity_at DESC
      `;
    });
  },

  async getConversationMessages(conversationId: number) {
    return executeQuery(async (sql) => {
      return await sql`
        SELECT * FROM messages 
        WHERE conversation_id = ${conversationId}
        ORDER BY created_at ASC
      `;
    });
  },

  // Health check with short timeout
  async healthCheck() {
    return executeQuery(async (sql) => {
      const result = await sql`SELECT 1 as alive`;
      return result[0]?.alive === 1;
    }, 2000);
  }
};

console.log('[NEON] Direct database interface initialized');