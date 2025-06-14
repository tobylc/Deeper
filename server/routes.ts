import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConnectionSchema, insertMessageSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth endpoints
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Login failed" });
    }
  });

  // Connection endpoints
  app.post("/api/connections", async (req, res) => {
    try {
      const connectionData = insertConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(connectionData);
      res.json(connection);
    } catch (error) {
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
      const connection = await storage.updateConnectionStatus(id, 'accepted', new Date());
      
      if (!connection) {
        return res.status(404).json({ message: "Connection not found" });
      }

      // Create conversation when connection is accepted
      const conversation = await storage.createConversation({
        connectionId: connection.id,
        participant1Email: connection.inviterEmail,
        participant2Email: connection.inviteeEmail,
        relationshipType: connection.relationshipType,
        currentTurn: connection.inviterEmail, // Inviter asks first question
      });

      res.json({ connection, conversation });
    } catch (error) {
      res.status(500).json({ message: "Failed to accept connection" });
    }
  });

  app.patch("/api/connections/:id/decline", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const connection = await storage.updateConnectionStatus(id, 'declined');
      
      if (!connection) {
        return res.status(404).json({ message: "Connection not found" });
      }

      res.json(connection);
    } catch (error) {
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

  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
      });

      const message = await storage.createMessage(messageData);
      
      // Update conversation turn
      const conversation = await storage.getConversation(conversationId);
      if (conversation) {
        const nextTurn = conversation.currentTurn === conversation.participant1Email 
          ? conversation.participant2Email 
          : conversation.participant1Email;
        await storage.updateConversationTurn(conversationId, nextTurn);
      }

      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Failed to create message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
