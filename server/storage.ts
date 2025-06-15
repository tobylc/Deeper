import { 
  users, connections, conversations, messages, emails,
  type User, type InsertUser,
  type Connection, type InsertConnection,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type Email, type InsertEmail
} from "@shared/schema";
import { db } from "./db";
import { eq, or, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser): Promise<User>;

  // Connections
  getConnection(id: number): Promise<Connection | undefined>;
  getConnectionsByEmail(email: string): Promise<Connection[]>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnectionStatus(id: number, status: string, acceptedAt?: Date): Promise<Connection | undefined>;

  // Conversations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByEmail(email: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationTurn(id: number, currentTurn: string): Promise<Conversation | undefined>;

  // Messages
  getMessagesByConversationId(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Emails
  getEmailsByEmail(email: string): Promise<Email[]>;
  createEmail(email: InsertEmail): Promise<Email>;
  getEmailById(id: number): Promise<Email | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getUserByEmail(email: string | null | undefined): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async upsertUser(userData: InsertUser): Promise<User> {
    // First try to find existing user by email
    const existingUser = userData.email ? await this.getUserByEmail(userData.email) : undefined;
    
    if (existingUser) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set(userData)
        .where(eq(users.email, userData.email!))
        .returning();
      return user;
    } else {
      // Create new user
      return await this.createUser(userData);
    }
  }

  // Connections
  async getConnection(id: number): Promise<Connection | undefined> {
    const [connection] = await db.select().from(connections).where(eq(connections.id, id));
    return connection || undefined;
  }

  async getConnectionsByEmail(email: string): Promise<Connection[]> {
    return await db
      .select()
      .from(connections)
      .where(or(eq(connections.inviterEmail, email), eq(connections.inviteeEmail, email)));
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const [connection] = await db
      .insert(connections)
      .values({
        ...insertConnection,
        status: 'pending',
      })
      .returning();
    return connection;
  }

  async updateConnectionStatus(id: number, status: string, acceptedAt?: Date): Promise<Connection | undefined> {
    const [connection] = await db
      .update(connections)
      .set({
        status,
        acceptedAt: acceptedAt || null,
      })
      .where(eq(connections.id, id))
      .returning();
    return connection || undefined;
  }

  // Conversations
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationsByEmail(email: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(or(eq(conversations.participant1Email, email), eq(conversations.participant2Email, email)));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...insertConversation,
        status: 'active',
      })
      .returning();
    return conversation;
  }

  async updateConversationTurn(id: number, currentTurn: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ currentTurn })
      .where(eq(conversations.id, id))
      .returning();
    return conversation || undefined;
  }

  // Messages
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }
}

export const storage = new DatabaseStorage();
