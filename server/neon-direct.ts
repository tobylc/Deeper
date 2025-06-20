import { neon } from '@neondatabase/serverless';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Direct Neon connection for bypassing connection pool issues
const sql = neon(process.env.DATABASE_URL);

// Simple query wrapper with automatic retry
export async function executeQuery<T>(
  queryFn: (sql: any) => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn(sql);
      return result;
    } catch (error: any) {
      lastError = error;
      
      if (error.message?.includes('Too many database connection attempts')) {
        console.log(`[NEON] Attempt ${attempt}/${maxRetries} failed, retrying in ${attempt * 500}ms`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
          continue;
        }
      }
      
      // Don't retry non-connection errors
      break;
    }
  }
  
  throw lastError;
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

  // Health check
  async healthCheck() {
    return executeQuery(async (sql) => {
      const result = await sql`SELECT 1 as alive`;
      return result[0]?.alive === 1;
    });
  }
};

console.log('[NEON] Direct database interface initialized');