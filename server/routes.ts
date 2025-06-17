import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConnectionSchema, insertMessageSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { 
  rateLimit, 
  validateEmail, 
  validateMessageContent, 
  corsHeaders, 
  securityHeaders, 
  requestLogger 
} from "./middleware";
import { emailService } from "./email";
import { analytics } from "./analytics";
import { healthService } from "./health";
import { jobQueue } from "./jobs";
import { setupAuth, isAuthenticated } from "./oauthAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware FIRST
  await setupAuth(app);

  // Apply global middleware
  app.use(corsHeaders);
  app.use(securityHeaders);
  app.use(requestLogger);

  // Health check endpoints
  app.get("/api/health", async (req, res) => {
    try {
      const health = await healthService.getSystemHealth();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get("/api/metrics", async (req, res) => {
    try {
      const metrics = await analytics.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Production Auth endpoints
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ error: "Session cleanup failed" });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    });
  });

  // Connection endpoints
  app.post("/api/connections", 
    isAuthenticated,
    rateLimit(20, 60 * 60 * 1000), // 20 connections per hour
    validateEmail,
    async (req: any, res) => {
    try {
      console.log("[DEBUG] Connection request body:", req.body);
      console.log("[DEBUG] Request user:", req.user);
      
      // Manual validation to debug the issue
      const { inviteeEmail, relationshipType, personalMessage } = req.body;
      
      if (!inviteeEmail || typeof inviteeEmail !== 'string') {
        console.log("[DEBUG] Missing or invalid inviteeEmail:", inviteeEmail);
        return res.status(400).json({ message: "Invalid inviteeEmail" });
      }
      
      if (!relationshipType || typeof relationshipType !== 'string') {
        console.log("[DEBUG] Missing or invalid relationshipType:", relationshipType);
        return res.status(400).json({ message: "Invalid relationshipType" });
      }
      
      // Get authenticated user first
      let userId;
      if (req.user.claims) {
        // Real Replit Auth
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        // Demo authentication or direct user object
        userId = req.user.id;
      } else {
        return res.status(400).json({ message: "Invalid user session" });
      }

      console.log("[DEBUG] User ID extracted:", userId);
      const currentUser = await storage.getUser(userId);
      console.log("[DEBUG] Current user from storage:", currentUser);
      
      if (!currentUser?.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      // Check subscription limits before allowing connection creation
      const initiatedConnectionsCount = await storage.getInitiatedConnectionsCount(currentUser.email);
      const userMaxConnections = currentUser.maxConnections || 1;
      
      if (initiatedConnectionsCount >= userMaxConnections) {
        return res.status(403).json({ 
          message: "Connection limit reached. Upgrade your plan to invite more people.", 
          type: "SUBSCRIPTION_LIMIT",
          currentCount: initiatedConnectionsCount,
          maxAllowed: userMaxConnections,
          subscriptionTier: currentUser.subscriptionTier || 'free'
        });
      }

      const connectionData = {
        inviteeEmail,
        relationshipType,
        personalMessage: personalMessage || "",
        inviterEmail: currentUser.email,
        inviterSubscriptionTier: currentUser.subscriptionTier || 'free'
      };

      // Check for duplicate connections
      const existingConnections = await storage.getConnectionsByEmail(connectionData.inviterEmail);
      const duplicate = existingConnections.find(conn => 
        (conn.inviterEmail === connectionData.inviterEmail && conn.inviteeEmail === connectionData.inviteeEmail) ||
        (conn.inviterEmail === connectionData.inviteeEmail && conn.inviteeEmail === connectionData.inviterEmail)
      );

      if (duplicate) {
        console.log("[DEBUG] Duplicate connection found:", duplicate);
        return res.status(409).json({ 
          message: "You already have a connection with this person", 
          type: "DUPLICATE_CONNECTION",
          existingConnection: duplicate 
        });
      }

      const connection = await storage.createConnection(connectionData);

      // Queue invitation email for background processing
      jobQueue.addJob('send_email', {
        emailType: 'invitation',
        connection
      });

      // Track connection creation
      analytics.track({
        type: 'connection_created',
        email: connection.inviterEmail,
        metadata: { 
          relationshipType: connection.relationshipType,
          inviteeEmail: connection.inviteeEmail
        }
      });

      res.json(connection);
    } catch (error) {
      console.error("Connection creation error:", error);
      res.status(400).json({ message: "Invalid connection data" });
    }
  });

  app.get("/api/connections/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const connections = await storage.getConnectionsByEmail(email);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  app.patch("/api/connections/:id/accept", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { accepterEmail } = req.body;

      // Validate the connection exists and user is authorized
      const existingConnection = await storage.getConnection(id);
      if (!existingConnection) {
        return res.status(404).json({ message: "Connection not found" });
      }

      if (existingConnection.inviteeEmail !== accepterEmail) {
        return res.status(403).json({ message: "Not authorized to accept this connection" });
      }

      if (existingConnection.status !== 'pending') {
        return res.status(400).json({ message: "Connection already processed" });
      }

      // Ensure the invitee user exists (auto-create if needed)
      let inviteeUser = await storage.getUserByEmail(existingConnection.inviteeEmail);
      if (!inviteeUser) {
        // For now, require manual registration
        return res.status(400).json({ message: "Invitee must register first before accepting connection" });
      }

      const connection = await storage.updateConnectionStatus(id, 'accepted', new Date());

      if (!connection) {
        return res.status(500).json({ message: "Failed to update connection status" });
      }

      // Create conversation when connection is accepted
      const conversation = await storage.createConversation({
        connectionId: connection.id,
        participant1Email: connection.inviterEmail,
        participant2Email: connection.inviteeEmail,
        relationshipType: connection.relationshipType,
        currentTurn: connection.inviterEmail, // Inviter asks first question
      });

      // Queue acceptance notification email
      jobQueue.addJob('send_email', {
        emailType: 'accepted',
        connection
      });

      // Track connection acceptance
      analytics.track({
        type: 'connection_accepted',
        email: connection.inviteeEmail,
        metadata: { 
          inviterEmail: connection.inviterEmail,
          relationshipType: connection.relationshipType
        }
      });

      res.json({ connection, conversation });
    } catch (error) {
      console.error("Accept connection error:", error);
      res.status(500).json({ message: "Failed to accept connection" });
    }
  });

  app.patch("/api/connections/:id/decline", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { declinerEmail } = req.body;

      // Validate the connection exists and user is authorized
      const existingConnection = await storage.getConnection(id);
      if (!existingConnection) {
        return res.status(404).json({ message: "Connection not found" });
      }

      if (existingConnection.inviteeEmail !== declinerEmail) {
        return res.status(403).json({ message: "Not authorized to decline this connection" });
      }

      if (existingConnection.status !== 'pending') {
        return res.status(400).json({ message: "Connection already processed" });
      }

      const connection = await storage.updateConnectionStatus(id, 'declined');

      if (!connection) {
        return res.status(500).json({ message: "Failed to update connection status" });
      }

      // Queue decline notification email
      jobQueue.addJob('send_email', {
        emailType: 'declined',
        connection
      });

      // Track connection decline
      analytics.track({
        type: 'connection_declined',
        email: connection.inviteeEmail,
        metadata: { 
          inviterEmail: connection.inviterEmail,
          relationshipType: connection.relationshipType
        }
      });

      res.json(connection);
    } catch (error) {
      console.error("Decline connection error:", error);
      res.status(500).json({ message: "Failed to decline connection" });
    }
  });

  // Conversation endpoints
  app.get("/api/conversations/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const conversations = await storage.getConversationsByEmail(email);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", 
    rateLimit(100, 60 * 60 * 1000), // 100 messages per hour
    validateEmail,
    validateMessageContent,
    async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
      });

      // Validate conversation exists and user is authorized
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Check if sender is a participant
      if (messageData.senderEmail !== conversation.participant1Email && 
          messageData.senderEmail !== conversation.participant2Email) {
        return res.status(403).json({ message: "Not authorized to send messages in this conversation" });
      }

      // Check if it's the sender's turn
      if (messageData.senderEmail !== conversation.currentTurn) {
        return res.status(400).json({ message: "It's not your turn to send a message" });
      }

      // Get existing messages to validate message type
      const existingMessages = await storage.getMessagesByConversationId(conversationId);
      const lastMessage = existingMessages[existingMessages.length - 1];

      // Validate message type based on conversation flow
      if (existingMessages.length === 0) {
        // First message must be a question
        if (messageData.type !== 'question') {
          return res.status(400).json({ message: "First message must be a question" });
        }
      } else {
        // Alternate between question and response
        const expectedType = lastMessage.type === 'question' ? 'response' : 'question';
        if (messageData.type !== expectedType) {
          return res.status(400).json({ message: `Expected ${expectedType}, got ${messageData.type}` });
        }
      }

      const message = await storage.createMessage(messageData);

      // Update conversation turn to the other participant
      const nextTurn = conversation.currentTurn === conversation.participant1Email 
        ? conversation.participant2Email 
        : conversation.participant1Email;
      await storage.updateConversationTurn(conversationId, nextTurn);

      // Track message sending
      analytics.track({
        type: 'message_sent',
        email: messageData.senderEmail,
        metadata: { 
          conversationId,
          messageType: messageData.type,
          relationshipType: conversation.relationshipType
        }
      });

      res.json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(400).json({ message: "Failed to create message" });
    }
  });

  // Email management endpoints
  app.get("/api/emails/:email", isAuthenticated, async (req, res) => {
    try {
      const { email } = req.params;
      const emails = await storage.getEmailsByEmail(email);
      res.json(emails);
    } catch (error) {
      console.error("Failed to fetch emails:", error);
      res.status(500).json({ message: "Failed to fetch emails" });
    }
  });

  app.get("/api/emails/view/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const email = await storage.getEmailById(parseInt(id));
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }

      // Return HTML email content for viewing
      res.setHeader('Content-Type', 'text/html');
      res.send(email.htmlContent);
    } catch (error) {
      console.error("Failed to fetch email:", error);
      res.status(500).json({ message: "Failed to fetch email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}