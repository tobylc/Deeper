// Simplified database connection for Neon stability
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

class DatabaseRecovery {
  private emergencyPool: Pool | null = null;
  private isRecovering = false;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 3;

  async initializeEmergencyConnection(): Promise<boolean> {
    if (this.isRecovering) return false;
    this.isRecovering = true;

    try {
      console.log('[DB-RECOVERY] Initializing emergency database connection...');
      
      // Create minimal emergency pool
      this.emergencyPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        min: 0,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Test connection
      const client = await this.emergencyPool.connect();
      await client.query('SELECT 1');
      client.release();

      console.log('[DB-RECOVERY] Emergency connection established successfully');
      this.recoveryAttempts = 0;
      return true;

    } catch (error) {
      console.error('[DB-RECOVERY] Emergency connection failed:', error);
      this.recoveryAttempts++;
      
      if (this.emergencyPool) {
        await this.emergencyPool.end().catch(() => {});
        this.emergencyPool = null;
      }
      
      return false;
    } finally {
      this.isRecovering = false;
    }
  }

  async executeEmergencyQuery<T>(queryFn: (client: any) => Promise<T>): Promise<T> {
    if (!this.emergencyPool) {
      const connected = await this.initializeEmergencyConnection();
      if (!connected) {
        throw new Error('Database unavailable - all recovery attempts failed');
      }
    }

    let client;
    try {
      client = await this.emergencyPool!.connect();
      return await queryFn(client);
    } catch (error) {
      console.error('[DB-RECOVERY] Emergency query failed:', error);
      
      // Reset connection on failure
      if (this.emergencyPool) {
        await this.emergencyPool.end().catch(() => {});
        this.emergencyPool = null;
      }
      
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.executeEmergencyQuery(async (db) => {
        await db.execute('SELECT 1 as health');
      });
      return true;
    } catch {
      return false;
    }
  }

  async getUserByEmail(email: string) {
    return this.executeEmergencyQuery(async (client) => {
      const result = await client.query(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [email]);
      return result.rows[0] || null;
    });
  }

  async getUserById(id: string) {
    return this.executeEmergencyQuery(async (client) => {
      const result = await client.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
      return result.rows[0] || null;
    });
  }

  async shutdown() {
    if (this.emergencyPool) {
      await this.emergencyPool.end();
      this.emergencyPool = null;
    }
  }
}

export const dbRecovery = new DatabaseRecovery();
console.log('[DB-RECOVERY] Database recovery system initialized');