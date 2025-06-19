import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import multer from "multer";
import sharp from "sharp";
import fs from "fs/promises";
import { storage } from "./storage";
import { insertConnectionSchema, insertMessageSchema, insertUserSchema } from "@shared/schema";
import { getRolesForRelationship, isValidRolePair } from "@shared/relationship-roles";
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
import { notificationService } from "./notifications";
import { analytics } from "./analytics";
import { healthService } from "./health";
import { jobQueue } from "./jobs";
import { setupAuth, isAuthenticated } from "./oauthAuth";
import { generateRelationshipSpecificTitle } from "./thread-naming";

// Configure multer for file uploads
const storage_config = multer.memoryStorage();
const upload = multer({
  storage: storage_config,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  },
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
async function ensureUploadsDir() {
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  await ensureUploadsDir();
  
  // Setup authentication middleware FIRST
  await setupAuth(app);

  // Apply global middleware
  app.use(corsHeaders);
  app.use(securityHeaders);
  app.use(requestLogger);
  
  // Serve static files from public directory
  app.use(express.static(path.join(process.cwd(), 'public')));
  
  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'public', 'uploads', req.path);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).send('File not found');
      }
    });
  });

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
      // Development bypass for testing
      if (process.env.NODE_ENV === 'development' && req.query.test_user) {
        const testUser = await storage.getUserByEmail('thetobyclarkshow@gmail.com');
        if (testUser) {
          return res.json({
            id: testUser.id,
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            subscriptionTier: testUser.subscriptionTier,
            subscriptionStatus: testUser.subscriptionStatus,
            maxConnections: testUser.maxConnections
          });
        }
      }

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

  // Onboarding tracking endpoint
  app.post("/api/users/mark-onboarding-complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.updateUser(userId, { hasSeenOnboarding: true });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Mark onboarding complete error:", error);
      res.status(500).json({ message: "Failed to update onboarding status" });
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

      // Return plain text for email templates, JSON for API consumers
      const acceptHeader = req.headers.accept || '';
      if (acceptHeader.includes('text/plain')) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(displayName);
      } else {
        res.json({ displayName });
      }
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
      if (existingUser && existingUser.passwordHash) {
        return res.status(409).json({ message: "User with this email already exists and has completed setup" });
      }

      // Hash the password securely
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      let newUser;
      if (existingUser) {
        // Update existing user with password and name information
        newUser = await storage.upsertUser({
          id: existingUser.id,
          email: inviteeEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          passwordHash: hashedPassword,
        });
      } else {
        // Create new user account for invitee with hashed password
        newUser = await storage.upsertUser({
          id: randomUUID(),
          email: inviteeEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          passwordHash: hashedPassword,
        });
      }

      // Update connection status to accepted
      const updatedConnection = await storage.updateConnectionStatus(
        connectionId, 
        'accepted', 
        new Date()
      );

      if (!updatedConnection) {
        return res.status(500).json({ message: "Failed to update connection" });
      }

      // Don't auto-create conversation - let inviter start it manually from dashboard

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
      const { inviteeEmail, relationshipType, inviterRole, inviteeRole, personalMessage } = req.body;
      
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
        'Grandparents', 'Long-distance', 'Other'
      ];
      if (!allowedRelationshipTypes.includes(relationshipType)) {
        return res.status(400).json({ message: "Invalid relationship type" });
      }

      // Validate role fields
      if (!inviterRole || typeof inviterRole !== 'string' || inviterRole.trim().length === 0) {
        return res.status(400).json({ message: "Your role in the relationship is required" });
      }

      if (!inviteeRole || typeof inviteeRole !== 'string' || inviteeRole.trim().length === 0) {
        return res.status(400).json({ message: "Their role in the relationship is required" });
      }

      // Validate roles against allowed options for the relationship type
      const validRoles = getRolesForRelationship(relationshipType);
      if (!validRoles.includes(inviterRole)) {
        return res.status(400).json({ message: "Invalid role for this relationship type" });
      }

      if (!validRoles.includes(inviteeRole)) {
        return res.status(400).json({ message: "Invalid invitee role for this relationship type" });
      }

      // Validate role pair compatibility
      if (!isValidRolePair(relationshipType, inviterRole, inviteeRole)) {
        return res.status(400).json({ message: "Invalid role combination for this relationship type" });
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
        inviterRole,
        inviteeRole,
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
        'basic': { maxConnections: 1 },
        'advanced': { maxConnections: 3 },
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

      // Don't auto-create conversation - let inviter start it manually from dashboard

      // Queue acceptance notification email
      jobQueue.addJob('send_email', {
        emailType: 'accepted',
        connection
      });

      // Send real-time WebSocket notification to inviter
      try {
        const { getWebSocketManager } = await import('./websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.notifyConnectionUpdate(connection.inviterEmail, {
            connectionId: connection.id,
            status: 'accepted',
            inviterEmail: connection.inviterEmail,
            inviteeEmail: connection.inviteeEmail,
            relationshipType: connection.relationshipType
          });
        }
      } catch (error) {
        console.error('[WEBSOCKET] Failed to send connection acceptance notification:', error);
      }

      // Track connection acceptance
      analytics.track({
        type: 'connection_accepted',
        email: connection.inviteeEmail,
        metadata: { 
          inviterEmail: connection.inviterEmail,
          relationshipType: connection.relationshipType
        }
      });

      res.json({ connection });
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

      // Send real-time WebSocket notification to inviter
      try {
        const { getWebSocketManager } = await import('./websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.notifyConnectionUpdate(connection.inviterEmail, {
            connectionId: connection.id,
            status: 'declined',
            inviterEmail: connection.inviterEmail,
            inviteeEmail: connection.inviteeEmail,
            relationshipType: connection.relationshipType
          });
        }
      } catch (error) {
        console.error('[WEBSOCKET] Failed to send connection decline notification:', error);
      }

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
        'basic': { maxConnections: 1, price: 4.95 },
        'advanced': { maxConnections: 3, price: 9.95 },
        'unlimited': { maxConnections: 999, price: 19.95 }
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

  // Profile image file upload with enhanced authentication
  app.post("/api/users/profile-image/upload", 
    rateLimit(5, 60 * 60 * 1000), // 5 uploads per hour
    upload.single('image'),
    async (req: any, res) => {
    // Enhanced authentication check
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      console.log("[UPLOAD] Authentication failed:", {
        isAuthenticated: req.isAuthenticated?.(),
        hasUser: !!req.user,
        sessionID: req.sessionID
      });
      return res.status(401).json({ message: "Authentication required. Please log in again." });
    }
    try {
      const userId = req.user.claims?.sub || req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      const currentUser = await storage.getUser(userId);
      if (!currentUser || !currentUser.email) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate unique filename
      const fileExtension = req.file.mimetype.split('/')[1];
      const fileName = `profile_${userId}_${Date.now()}.${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);
      
      // Process image with sharp - resize and optimize with error handling
      try {
        await sharp(req.file.buffer)
          .resize(400, 400, { 
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85 })
          .toFile(filePath);
      } catch (imageError) {
        console.error("Image processing error:", imageError);
        return res.status(400).json({ message: "Invalid image file. Please try a different image." });
      }
      
      // Update user profile with new image URL
      const profileImageUrl = `/uploads/${fileName}`;
      const updatedUser = await storage.updateUserProfileImage(currentUser.email, profileImageUrl);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update profile image" });
      }
      
      res.json({ 
        success: true, 
        profileImageUrl: updatedUser.profileImageUrl,
        message: "Profile image uploaded successfully" 
      });
    } catch (error) {
      console.error("Profile image upload error:", error);
      res.status(500).json({ message: "Failed to upload profile image" });
    }
  });

  // Import profile image from OAuth provider with enhanced authentication
  app.post("/api/users/profile-image/import", 
    rateLimit(3, 60 * 60 * 1000), // 3 imports per hour
    async (req: any, res) => {
    // Enhanced authentication check
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      console.log("[IMPORT] Authentication failed:", {
        isAuthenticated: req.isAuthenticated?.(),
        hasUser: !!req.user,
        sessionID: req.sessionID
      });
      return res.status(401).json({ message: "Authentication required. Please log in again." });
    }
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { provider } = req.body;
      
      if (!provider || !['google', 'facebook'].includes(provider)) {
        return res.status(400).json({ message: "Invalid provider. Use 'google' or 'facebook'" });
      }
      
      const currentUser = await storage.getUser(userId);
      if (!currentUser || !currentUser.email) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let profileImageUrl = null;
      
      // Extract profile image from OAuth provider
      if (provider === 'google' && currentUser.googleId) {
        // For Google users, we can get the profile image from the OAuth claims
        profileImageUrl = req.user.claims?.profile_image_url || req.user.claims?.picture;
      } else if (provider === 'facebook') {
        // For Facebook users, we would construct profile image URL if facebook linking was implemented
        // For now, return an error since Facebook OAuth is not yet implemented
        return res.status(400).json({ 
          message: "Facebook import not yet available. Please use file upload instead." 
        });
      }
      
      if (!profileImageUrl) {
        return res.status(400).json({ 
          message: `No ${provider} profile image available or account not linked` 
        });
      }
      
      // Download and process the image
      try {
        const response = await fetch(profileImageUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch profile image');
        }
        
        const imageBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(imageBuffer);
        
        // Generate unique filename
        const fileName = `profile_${userId}_${provider}_${Date.now()}.jpg`;
        const filePath = path.join(uploadsDir, fileName);
        
        // Process image with sharp - resize and optimize with error handling
        try {
          await sharp(buffer)
            .resize(400, 400, { 
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality: 85 })
            .toFile(filePath);
        } catch (imageError) {
          console.error("OAuth image processing error:", imageError);
          return res.status(400).json({ message: "Failed to process profile image from OAuth provider." });
        }
        
        // Update user profile with new image URL
        const localImageUrl = `/uploads/${fileName}`;
        const updatedUser = await storage.updateUserProfileImage(currentUser.email, localImageUrl);
        
        if (!updatedUser) {
          return res.status(500).json({ message: "Failed to update profile image" });
        }
        
        res.json({ 
          success: true, 
          profileImageUrl: updatedUser.profileImageUrl,
          provider,
          message: `Profile image imported from ${provider} successfully` 
        });
      } catch (fetchError) {
        console.error(`Error importing ${provider} profile image:`, fetchError);
        res.status(500).json({ message: `Failed to import ${provider} profile image` });
      }
    } catch (error) {
      console.error("Profile image import error:", error);
      res.status(500).json({ message: "Failed to import profile image" });
    }
  });

  // Account linking endpoints
  app.get("/api/auth/link/google", isAuthenticated, (req, res) => {
    // Redirect to Google OAuth with special linking parameter
    const baseUrl = 'https://deepersocial.replit.app';
    const linkingUrl = `${baseUrl}/api/auth/google?linking=true`;
    res.redirect(linkingUrl);
  });

  app.get("/api/auth/account-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        hasPassword: !!currentUser.passwordHash,
        hasGoogleLinked: !!currentUser.googleId,
        email: currentUser.email,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName
      });
    } catch (error) {
      console.error("Account status error:", error);
      res.status(500).json({ message: "Failed to get account status" });
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

  // Conversation creation endpoint for dashboard
  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const { participant1Email, participant2Email, relationshipType, currentTurn, connectionId } = req.body;
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Verify user is authorized to create this conversation
      if (currentUser.email !== participant1Email && currentUser.email !== participant2Email) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conversationData = {
        connectionId,
        participant1Email,
        participant2Email,
        relationshipType,
        currentTurn,
        status: 'active',
        isMainThread: true
      };
      
      const conversation = await storage.createConversation(conversationData);

      // Send real-time WebSocket notifications to both participants
      try {
        const { getWebSocketManager } = await import('./websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          // Notify both participants that a new conversation was created
          wsManager.notifyConversationUpdate(participant1Email, {
            conversationId: conversation.id,
            connectionId: connectionId,
            action: 'conversation_created',
            relationshipType
          });
          
          if (participant1Email !== participant2Email) {
            wsManager.notifyConversationUpdate(participant2Email, {
              conversationId: conversation.id,
              connectionId: connectionId,
              action: 'conversation_created',
              relationshipType
            });
          }
        }
      } catch (error) {
        console.error('[WEBSOCKET] Failed to send conversation creation notification:', error);
      }

      res.json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Conversation threading endpoints
  app.get("/api/connections/:connectionId/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Verify user is part of this connection
      const connection = await storage.getConnection(connectionId);
      if (!connection || 
          (connection.inviterEmail !== currentUser.email && 
           connection.inviteeEmail !== currentUser.email)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conversations = await storage.getConversationsByConnection(connectionId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/connections/:connectionId/conversations/message-counts", isAuthenticated, async (req: any, res) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conversations = await storage.getConversationsByConnection(connectionId);
      const messageCounts: Record<number, number> = {};
      
      for (const conversation of conversations) {
        const messages = await storage.getMessages(conversation.id);
        messageCounts[conversation.id] = messages.length;
      }
      
      res.json(messageCounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch message counts" });
    }
  });

  app.post("/api/connections/:connectionId/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const { topic, title, participant1Email, participant2Email, relationshipType, isMainThread } = req.body;
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Verify user is part of this connection
      const connection = await storage.getConnection(connectionId);
      if (!connection || 
          (connection.inviterEmail !== currentUser.email && 
           connection.inviteeEmail !== currentUser.email)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conversationData = {
        connectionId,
        participant1Email,
        participant2Email,
        relationshipType,
        currentTurn: currentUser.email, // Creator starts the conversation
        status: 'active',
        title: title || topic,
        topic,
        isMainThread: isMainThread || false
      };
      
      const conversation = await storage.createConversation(conversationData);

      // Send real-time WebSocket notifications to both participants about new conversation
      try {
        const { getWebSocketManager } = await import('./websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          // Notify both participants that a new conversation was created
          wsManager.notifyConversationUpdate(participant1Email, {
            conversationId: conversation.id,
            connectionId: connectionId,
            action: 'conversation_created',
            relationshipType
          });
          
          if (participant1Email !== participant2Email) {
            wsManager.notifyConversationUpdate(participant2Email, {
              conversationId: conversation.id,
              connectionId: connectionId,
              action: 'conversation_created',
              relationshipType
            });
          }
        }
      } catch (error) {
        console.error('[WEBSOCKET] Failed to send conversation creation notification:', error);
      }

      res.json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Conversation endpoints with authentication
  app.get("/api/conversations/by-email/:email", isAuthenticated, async (req: any, res) => {
    try {
      const { email } = req.params;
      
      // Verify user can access conversations for this email
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || currentUser.email !== email) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conversations = await storage.getConversationsByEmail(email);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Development bypass for testing
      if (process.env.NODE_ENV === 'development' && req.query.test_user) {
        const testUser = await storage.getUserByEmail('thetobyclarkshow@gmail.com');
        if (testUser && (testUser.email === conversation.participant1Email || testUser.email === conversation.participant2Email)) {
          return res.json(conversation);
        }
      }

      // Check authentication for production
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify user is a participant in this conversation
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || 
          (currentUser.email !== conversation.participant1Email && 
           currentUser.email !== conversation.participant2Email)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      // Verify conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Development bypass for testing
      if (process.env.NODE_ENV === 'development' && req.query.test_user) {
        const testUser = await storage.getUserByEmail('thetobyclarkshow@gmail.com');
        if (testUser && (testUser.email === conversation.participant1Email || testUser.email === conversation.participant2Email)) {
          const messages = await storage.getMessagesByConversationId(conversationId);
          return res.json(messages);
        }
      }

      // Check authentication for production
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || 
          (currentUser.email !== conversation.participant1Email && 
           currentUser.email !== conversation.participant2Email)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
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

      // Generate thread title if this is the first question
      if (existingMessages.length === 0 && messageData.type === 'question') {
        const threadTitle = generateRelationshipSpecificTitle(
          messageData.content, 
          conversation.relationshipType
        );
        await storage.updateConversationTitle(conversationId, threadTitle);
      }

      // Update conversation turn to the other participant
      const nextTurn = conversation.currentTurn === conversation.participant1Email 
        ? conversation.participant2Email 
        : conversation.participant1Email;
      await storage.updateConversationTurn(conversationId, nextTurn);

      // Send turn notification (email and/or SMS based on user preferences)
      try {
        await notificationService.sendTurnNotification({
          recipientEmail: nextTurn,
          senderEmail: messageData.senderEmail,
          conversationId,
          relationshipType: conversation.relationshipType,
          messageType: messageData.type
        });
      } catch (error) {
        console.error('[NOTIFICATION] Failed to send turn notification:', error);
        // Don't fail the message sending if notification fails
      }

      // Send real-time WebSocket notifications to both participants
      try {
        const { getWebSocketManager } = await import('./websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          const senderName = await storage.getUserDisplayNameByEmail(messageData.senderEmail);
          
          // Notify recipient about new message
          wsManager.notifyNewMessage(nextTurn, {
            conversationId,
            senderEmail: messageData.senderEmail,
            senderName,
            messageType: messageData.type,
            relationshipType: conversation.relationshipType
          });
          
          // Notify sender that their dashboard should refresh (conversation thread updated)
          wsManager.notifyConversationUpdate(messageData.senderEmail, {
            conversationId,
            action: 'message_sent',
            relationshipType: conversation.relationshipType
          });
        }
      } catch (error) {
        console.error('[WEBSOCKET] Failed to send real-time notification:', error);
        // Don't fail the message sending if WebSocket fails
      }

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

  // User data endpoints
  app.get("/api/users/by-email/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user data (excluding sensitive information)
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        subscriptionTier: user.subscriptionTier,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error("Error fetching user by email:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  app.get("/api/users/display-name/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const displayName = await storage.getUserDisplayNameByEmail(email);
      res.json({ displayName });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user display name" });
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

  // AI Question Generation endpoint
  app.post("/api/ai/generate-questions", 
    rateLimit(5, 60 * 60 * 1000), // 5 generations per hour
    isAuthenticated, 
    async (req: any, res) => {
    try {
      const { relationshipType, userRole, otherUserRole, count = 3 } = req.body;
      
      if (!relationshipType) {
        return res.status(400).json({ message: "Relationship type is required" });
      }
      
      // Validate count
      const questionCount = Math.min(Math.max(parseInt(count) || 3, 1), 5);

      // Simple fallback questions - in production this would use OpenAI API
      const fallbackTemplates = {
        "Parent-Child": [
          "What's something you've learned about yourself recently?",
          "What's a challenge you're facing that we could work through together?",
          "What's something you wish I understood better about your world?",
          "What's a memory of ours that always makes you smile?",
          "How do you think we've both grown in the past year?",
          "What's something you're proud of that I might not know about?"
        ],
        "Romantic Partners": [
          "What's something new you'd like us to experience together?",
          "When do you feel most connected to me?",
          "What's a dream you have for our relationship?",
          "What's something you've learned about love from being with me?",
          "How do you see us growing together in the next year?",
          "If you could relive one moment with me, what would it be?"
        ],
        "Friends": [
          "What's something you've learned about yourself through our friendship?",
          "What's a memory of ours that always makes you laugh?",
          "How has our friendship changed you for the better?",
          "What's something you're grateful for in our friendship?",
          "What's a goal or dream you'd like to share with me?",
          "What's an adventure you'd like us to go on together?"
        ],
        "Siblings": [
          "What's a childhood memory of ours that you treasure?",
          "How do you think we've influenced each other growing up?",
          "What's something you're proud of that I might not know about?",
          "What's a challenge you're facing that we could talk through?",
          "How do you see our relationship evolving as we get older?",
          "What's a tradition or inside joke of ours that makes you smile?"
        ]
      };

      const templates = fallbackTemplates[relationshipType as keyof typeof fallbackTemplates] || fallbackTemplates["Friends"];
      
      // Randomly select questions
      const shuffled = [...templates].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, questionCount);
      
      res.json({ 
        questions: selectedQuestions,
        relationshipType,
        userRole: userRole || '',
        otherUserRole: otherUserRole || '',
        count: selectedQuestions.length
      });
    } catch (error) {
      console.error("AI question generation error:", error);
      res.status(500).json({ message: "Failed to generate questions" });
    }
  });

  // Phone verification endpoints for SMS notifications
  app.post("/api/users/send-verification", rateLimit(5, 15 * 60 * 1000), async (req, res) => {
    try {
      const { phoneNumber, email } = req.body;

      if (!phoneNumber || !email) {
        return res.status(400).json({ message: "Phone number and email are required" });
      }

      // Validate phone number format (basic US format)
      const phoneRegex = /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
      if (!phoneRegex.test(phoneNumber.replace(/\D/g, ''))) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate and send verification code
      const verificationCode = await notificationService.sendPhoneVerification(phoneNumber);

      // Store verification code temporarily
      const verificationKey = `${email}:${phoneNumber}`;
      global.verificationCodes = global.verificationCodes || new Map();
      global.verificationCodes.set(verificationKey, {
        code: verificationCode,
        expires: Date.now() + 10 * 60 * 1000 // 10 minutes
      });

      res.json({ message: "Verification code sent successfully" });
    } catch (error) {
      console.error("Send verification error:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  app.post("/api/users/verify-phone", rateLimit(10, 15 * 60 * 1000), async (req, res) => {
    try {
      const { phoneNumber, email, code } = req.body;

      if (!phoneNumber || !email || !code) {
        return res.status(400).json({ message: "Phone number, email, and verification code are required" });
      }

      const verificationKey = `${email}:${phoneNumber}`;
      const storedVerification = global.verificationCodes?.get(verificationKey);

      if (!storedVerification || Date.now() > storedVerification.expires) {
        return res.status(400).json({ message: "Verification code expired or invalid" });
      }

      if (storedVerification.code !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Update user with verified phone number
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUserSubscription(user.id, {
        subscriptionTier: user.subscriptionTier || 'free',
        subscriptionStatus: user.subscriptionStatus || 'active',
        maxConnections: user.maxConnections || 1
      });

      // Clean up verification code
      global.verificationCodes?.delete(verificationKey);

      res.json({ message: "Phone number verified successfully" });
    } catch (error) {
      console.error("Verify phone error:", error);
      res.status(500).json({ message: "Failed to verify phone number" });
    }
  });

  app.patch("/api/users/notification-preference", async (req, res) => {
    try {
      const { email, notificationPreference } = req.body;

      if (!email || !notificationPreference) {
        return res.status(400).json({ message: "Email and notification preference are required" });
      }

      const validPreferences = ['email', 'sms', 'both'];
      if (!validPreferences.includes(notificationPreference)) {
        return res.status(400).json({ message: "Invalid notification preference. Must be 'email', 'sms', or 'both'" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUserSubscription(user.id, {
        subscriptionTier: user.subscriptionTier || 'free',
        subscriptionStatus: user.subscriptionStatus || 'active',
        maxConnections: user.maxConnections || 1
      });

      res.json({ message: "Notification preference updated successfully" });
    } catch (error) {
      console.error("Update notification preference error:", error);
      res.status(500).json({ message: "Failed to update notification preference" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}