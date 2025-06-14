import { 
  users, connections, conversations, messages,
  type User, type InsertUser,
  type Connection, type InsertConnection,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private connections: Map<number, Connection> = new Map();
  private conversations: Map<number, Conversation> = new Map();
  private messages: Map<number, Message> = new Map();
  
  private userIdCounter = 1;
  private connectionIdCounter = 1;
  private conversationIdCounter = 1;
  private messageIdCounter = 1;

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Connections
  async getConnection(id: number): Promise<Connection | undefined> {
    return this.connections.get(id);
  }

  async getConnectionsByEmail(email: string): Promise<Connection[]> {
    return Array.from(this.connections.values()).filter(
      conn => conn.inviterEmail === email || conn.inviteeEmail === email
    );
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const id = this.connectionIdCounter++;
    const connection: Connection = {
      ...insertConnection,
      id,
      status: 'pending',
      createdAt: new Date(),
      acceptedAt: null,
    };
    this.connections.set(id, connection);
    return connection;
  }

  async updateConnectionStatus(id: number, status: string, acceptedAt?: Date): Promise<Connection | undefined> {
    const connection = this.connections.get(id);
    if (!connection) return undefined;
    
    const updated = { 
      ...connection, 
      status,
      acceptedAt: acceptedAt || connection.acceptedAt
    };
    this.connections.set(id, updated);
    return updated;
  }

  // Conversations
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsByEmail(email: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      conv => conv.participant1Email === email || conv.participant2Email === email
    );
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationIdCounter++;
    const conversation: Conversation = {
      ...insertConversation,
      id,
      status: 'active',
      createdAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversationTurn(id: number, currentTurn: string): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updated = { ...conversation, currentTurn };
    this.conversations.set(id, updated);
    return updated;
  }

  // Messages
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }
}

export const storage = new MemStorage();
