import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
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

  // CRITICAL: Universal invitation routes for both development and production
  app.get("/invitation", (req, res, next) => {
    console.log("[INVITATION] Route hit with query:", req.query);
    
    // In development, let Vite handle it
    if (process.env.NODE_ENV === "development") {
      return next();
    }
    
    // In production, serve the built index.html
    const distPath = path.resolve(import.meta.dirname, "public");
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  app.get("/invitation/*", (req, res, next) => {
    console.log("[INVITATION] Wildcard route hit with params:", req.params, "query:", req.query);
    
    // In development, let Vite handle it
    if (process.env.NODE_ENV === "development") {
      return next();
    }
    
    // In production, serve the built index.html
    const distPath = path.resolve(import.meta.dirname, "public");
    res.sendFile(path.resolve(distPath, "index.html"));
  });

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



  // Email/Password login endpoint
  app.post('/api/auth/login', 
    rateLimit(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
    async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if user has a password hash (invited users)
      if (!user.passwordHash) {
        return res.status(401).json({ 
          message: "This account was created through OAuth. Please use Google or Facebook login." 
        });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Log in the user
      req.login(user, (err: any) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
          }
          
          res.json({
            success: true,
            message: "Login successful",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName
            }
          });
        });
      });
      
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Production Auth endpoints
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user ID from session
      let userId = req.user.id;
      
      // Handle different authentication sources
      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      }

      if (!userId) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return sanitized user data
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        maxConnections: user.maxConnections,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout endpoint with enhanced security
  app.post('/api/auth/logout', 
    rateLimit(10, 60 * 1000), // 10 logout attempts per minute
    (req, res) => {
    try {
      req.logout((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ 
            error: "Logout failed",
            message: "Unable to terminate session properly"
          });
        }
        
        req.session.destroy((sessionErr) => {
          if (sessionErr) {
            console.error("Session destroy error:", sessionErr);
            // Still clear cookie even if session destroy fails
          }
          
          // Clear all session cookies
          res.clearCookie('connect.sid', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
          });
          
          res.json({ 
            success: true,
            message: "Successfully logged out"
          });
        });
      });
    } catch (error) {
      console.error("Logout exception:", error);
      res.status(500).json({ 
        error: "Logout failed",
        message: "Server error during logout"
      });
    }
  });

  // Get user display name endpoint with enhanced validation
  app.get("/api/users/display-name/:email", 
    rateLimit(100, 60 * 1000), // 100 requests per minute
    async (req, res) => {
    try {
      const rawEmail = req.params.email;
      
      if (!rawEmail) {
        return res.status(400).json({ message: "Email parameter required" });
      }

      const email = decodeURIComponent(rawEmail);
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const displayName = await storage.getUserDisplayNameByEmail(email);
      
      if (!displayName) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ displayName });
    } catch (error: any) {
      console.error("Get display name error:", error);
      res.status(500).json({ 
        message: "Failed to get display name",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Get invitation details endpoint (public - no auth required)
  app.get("/api/invitation/:id", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      const connection = await storage.getConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (connection.status !== 'pending') {
        return res.status(400).json({ message: "Invitation is no longer valid" });
      }

      res.json({
        id: connection.id,
        inviterEmail: connection.inviterEmail,
        inviteeEmail: connection.inviteeEmail,
        relationshipType: connection.relationshipType,
        personalMessage: connection.personalMessage,
        createdAt: connection.createdAt
      });

    } catch (error: any) {
      console.error("Get invitation error:", error);
      res.status(500).json({ message: "Failed to retrieve invitation details" });
    }
  });

  // Invitation acceptance endpoint (public - no auth required)
  app.post("/api/invitation/accept", 
    rateLimit(5, 60 * 60 * 1000), // 5 attempts per hour per IP
    async (req, res) => {
    try {
      const { connectionId, inviteeEmail, firstName, lastName, password } = req.body;

      // Comprehensive input validation
      if (!connectionId || !inviteeEmail || !firstName || !lastName || !password) {
        return res.status(400).json({ 
          message: "Missing required fields",
          required: ["connectionId", "inviteeEmail", "firstName", "lastName", "password"]
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteeEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      // Validate name fields
      if (firstName.trim().length < 1 || lastName.trim().length < 1) {
        return res.status(400).json({ message: "First name and last name cannot be empty" });
      }

      if (firstName.length > 50 || lastName.length > 50) {
        return res.status(400).json({ message: "Names cannot exceed 50 characters" });
      }

      // Get the connection details
      const connection = await storage.getConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "Invalid invitation" });
      }

      if (connection.status !== 'pending') {
        return res.status(400).json({ message: "Invitation has already been processed" });
      }

      if (connection.inviteeEmail !== inviteeEmail) {
        return res.status(400).json({ message: "Email does not match invitation" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(inviteeEmail);
      if (existingUser) {
        return res.status(409).json({ message: "User with this email already exists" });
      }

      // Hash the password securely
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user account for invitee with hashed password
      const newUser = await storage.upsertUser({
        id: randomUUID(),
        email: inviteeEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        passwordHash: hashedPassword,
      });

      // Update connection status to accepted
      const updatedConnection = await storage.updateConnectionStatus(
        connectionId, 
        'accepted', 
        new Date()
      );

      if (!updatedConnection) {
        return res.status(500).json({ message: "Failed to update connection" });
      }

      // Create conversation between the two users
      const conversation = await storage.createConversation({
        relationshipType: connection.relationshipType,
        connectionId: connection.id,
        participant1Email: connection.inviterEmail,
        participant2Email: connection.inviteeEmail,
        currentTurn: connection.inviterEmail // Inviter starts the conversation
      });

      // Send acceptance notification email to inviter
      try {
        await emailService.sendConnectionAccepted(updatedConnection);
        
        // Track analytics
        analytics.track({
          type: 'connection_accepted',
          userId: newUser.id,
          email: inviteeEmail,
          metadata: {
            inviterEmail: connection.inviterEmail,
            relationshipType: connection.relationshipType,
            connectionId: connectionId
          }
        });
      } catch (emailError) {
        console.error("Failed to send acceptance email:", emailError);
        // Don't fail the request if email fails
      }

      // Establish session for the new user
      req.login(newUser, (loginErr: any) => {
        if (loginErr) {
          console.error("Login error during invitation acceptance:", loginErr);
          return res.status(500).json({ 
            message: "Account created successfully but session establishment failed",
            details: "Please try logging in manually"
          });
        }

        // Force session save to ensure persistence
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            // Don't fail the request, just log the error
            console.warn("Session may not persist properly");
          }

          res.status(201).json({
            success: true,
            message: "Connection established successfully",
            user: {
              id: newUser.id,
              email: newUser.email,
              firstName: newUser.firstName,
              lastName: newUser.lastName
            },
            connection: {
              id: updatedConnection.id,
              status: updatedConnection.status,
              relationshipType: updatedConnection.relationshipType,
              inviterEmail: updatedConnection.inviterEmail
            },
            conversation: {
              id: conversation.id,
              relationshipType: conversation.relationshipType
            }
          });
        });
      });

    } catch (error: any) {
      console.error("Invitation acceptance error:", error);
      
      // Handle specific database errors
      if (error.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({ 
          message: "An account with this email already exists" 
        });
      }
      
      if (error.code === '23503') { // PostgreSQL foreign key violation
        return res.status(400).json({ 
          message: "Invalid invitation reference" 
        });
      }
      
      // Handle connection timeout
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
        return res.status(503).json({ 
          message: "Service temporarily unavailable. Please try again." 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to process invitation acceptance",
        error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
      });
    }
  });

  // Connection endpoints with enhanced security
  app.post("/api/connections", 
    isAuthenticated,
    rateLimit(5, 60 * 60 * 1000), // 5 invitations per hour for better control
    validateEmail,
    async (req: any, res) => {
    try {
      // Enhanced input validation
      const { inviteeEmail, relationshipType, personalMessage } = req.body;
      
      // Comprehensive input validation
      if (!inviteeEmail || typeof inviteeEmail !== 'string' || inviteeEmail.trim().length === 0) {
        return res.status(400).json({ message: "Valid invitee email is required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteeEmail.trim())) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      if (!relationshipType || typeof relationshipType !== 'string' || relationshipType.trim().length === 0) {
        return res.status(400).json({ message: "Relationship type is required" });
      }

      // Validate relationship type against allowed values
      const allowedRelationshipTypes = [
        'Parent-Child', 'Romantic Partners', 'Friends', 'Siblings', 
        'Colleagues', 'Mentor-Mentee', 'Other Family', 'Other'
      ];
      if (!allowedRelationshipTypes.includes(relationshipType)) {
        return res.status(400).json({ message: "Invalid relationship type" });
      }

      // Validate personal message length
      if (personalMessage && (typeof personalMessage !== 'string' || personalMessage.length > 500)) {
        return res.status(400).json({ message: "Personal message cannot exceed 500 characters" });
      }
      
      // Get authenticated user with enhanced security
      let userId = req.user.id;
      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      }

      if (!userId) {
        return res.status(401).json({ message: "Invalid user session" });
      }

      // Prevent self-invitation
      if (inviteeEmail.trim().toLowerCase() === req.user.email?.toLowerCase()) {
        return res.status(400).json({ message: "You cannot invite yourself" });
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

      // Apply inviter's subscription benefits to invitee when accepting
      const inviterSubscriptionTier = existingConnection.inviterSubscriptionTier || 'free';
      const tierBenefits: Record<string, { maxConnections: number }> = {
        'free': { maxConnections: 1 },
        'basic': { maxConnections: 5 },
        'premium': { maxConnections: 20 },
        'unlimited': { maxConnections: 999 }
      };

      const benefits = tierBenefits[inviterSubscriptionTier] || tierBenefits['free'];
      
      // Update invitee's subscription to match inviter's tier (without payment)
      await storage.updateUserSubscription(inviteeUser.id, {
        subscriptionTier: inviterSubscriptionTier,
        subscriptionStatus: 'active',
        maxConnections: benefits.maxConnections,
        subscriptionExpiresAt: undefined // Inherited access doesn't expire
      });

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

  // Subscription management endpoints
  app.post("/api/subscription/upgrade", isAuthenticated, async (req: any, res) => {
    try {
      const { tier } = req.body;
      const userId = req.user.claims?.sub || req.user.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const tierBenefits: Record<string, { maxConnections: number, price: number }> = {
        'basic': { maxConnections: 5, price: 9.99 },
        'premium': { maxConnections: 20, price: 19.99 },
        'unlimited': { maxConnections: 999, price: 39.99 }
      };

      const benefits = tierBenefits[tier];
      if (!benefits) {
        return res.status(400).json({ message: "Invalid subscription tier" });
      }

      // For now, simulate successful upgrade (Stripe integration would go here)
      await storage.updateUserSubscription(userId, {
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        maxConnections: benefits.maxConnections,
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      res.json({ 
        success: true, 
        tier, 
        maxConnections: benefits.maxConnections,
        message: "Subscription upgraded successfully" 
      });
    } catch (error) {
      console.error("Subscription upgrade error:", error);
      res.status(500).json({ message: "Failed to upgrade subscription" });
    }
  });

  app.get("/api/subscription/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!currentUser.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      const initiatedCount = await storage.getInitiatedConnectionsCount(currentUser.email);
      
      res.json({
        subscriptionTier: currentUser.subscriptionTier || 'free',
        subscriptionStatus: currentUser.subscriptionStatus || 'inactive',
        maxConnections: currentUser.maxConnections || 1,
        initiatedConnections: initiatedCount,
        subscriptionExpiresAt: currentUser.subscriptionExpiresAt
      });
    } catch (error) {
      console.error("Subscription status error:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
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