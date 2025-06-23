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
import { finalDb } from "./db-final";
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
import { smsService } from "./sms";
import { analytics } from "./analytics";
import { healthService } from "./health";
import { jobQueue } from "./jobs";
import { setupAuth, isAuthenticated } from "./oauthAuth";
import { runUserCleanup } from "./cleanup-duplicate-users";

import { generateRelationshipSpecificTitle } from "./thread-naming";
import OpenAI from "openai";
import Stripe from "stripe";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Initialize Stripe client
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe price configuration for subscription tiers
const STRIPE_PRICES = {
  basic: process.env.STRIPE_PRICE_ID_BASIC || '',
  advanced: process.env.STRIPE_PRICE_ID_ADVANCED || '',
  unlimited: process.env.STRIPE_PRICE_ID_UNLIMITED || '',
  advanced_50_off: process.env.STRIPE_PRICE_ID_ADVANCED_50_OFF || '',
};



// Webhook handler functions
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;
  
  if (!userId) return;

  const user = await storage.getUser(userId);
  if (!user) return;

  const status = subscription.status === 'trialing' ? 'trialing' : 
                subscription.status === 'active' ? 'active' : 
                subscription.status === 'past_due' ? 'past_due' : 'inactive';

  await storage.updateUserSubscription(userId, {
    subscriptionTier: subscription.metadata?.tier || user.subscriptionTier || 'free',
    subscriptionStatus: status,
    maxConnections: user.maxConnections || 1,
    subscriptionExpiresAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : undefined
  });
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) return;

  const user = await storage.getUser(userId);
  if (!user) return;

  await storage.updateUserSubscription(userId, {
    subscriptionTier: 'free',
    subscriptionStatus: 'canceled',
    maxConnections: 1,
    stripeSubscriptionId: undefined,
    subscriptionExpiresAt: undefined
  });
}

async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  const subscription = (invoice as any).subscription;
  if (subscription && typeof subscription === 'string') {
    const sub = await stripe.subscriptions.retrieve(subscription);
    await handleSubscriptionUpdate(sub);
  }
}

async function handlePaymentFailure(invoice: Stripe.Invoice) {
  const subscription = (invoice as any).subscription;
  if (subscription && typeof subscription === 'string') {
    const sub = await stripe.subscriptions.retrieve(subscription);
    const userId = sub.metadata?.userId;
    
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUserSubscription(userId, {
          subscriptionTier: user.subscriptionTier || 'free',
          subscriptionStatus: 'past_due',
          maxConnections: user.maxConnections || 1
        });
      }
    }
  }
}

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

// Configure multer for audio uploads
const audioUpload = multer({
  storage: storage_config,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for audio (30 minutes max)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/mpeg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files (WebM, MP4, WAV, OGG, MP3) are allowed'));
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
  
  // Serve uploaded files with proper headers for audio playback
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'public', 'uploads', req.path);
    
    // Set appropriate headers for audio files with proper MIME type detection
    const audioExtensions = {
      '.webm': 'audio/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.mp4': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac'
    };
    
    const fileExt = path.extname(req.path).toLowerCase();
    if (audioExtensions[fileExt as keyof typeof audioExtensions]) {
      res.setHeader('Content-Type', audioExtensions[fileExt as keyof typeof audioExtensions]);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('File serving error:', err);
        res.status(404).json({ message: 'Audio file not found' });
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


  // Production readiness test endpoint - bypasses auth for testing
  app.get('/api/health/subscription-system', async (req, res) => {
    try {
      // Test Stripe configuration
      const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
      const hasPriceIds = !!(STRIPE_PRICES.basic && STRIPE_PRICES.advanced && STRIPE_PRICES.unlimited && STRIPE_PRICES.advanced_50_off);
      
      // Test database connectivity
      const dbTest = await storage.getConnectionsByEmail('test@example.com');
      const hasDatabase = Array.isArray(dbTest);
      
      // Test email service
      const hasEmailConfig = !!(process.env.SENDGRID_API_KEY || process.env.CONSOLE_EMAIL);
      
      res.json({
        status: 'healthy',
        subscription_system: {
          stripe_configured: hasStripeKey,
          price_ids_configured: hasPriceIds,
          database_connected: hasDatabase,
          email_service_configured: hasEmailConfig
        },
        endpoints: {
          subscription_upgrade: '/api/subscriptions/upgrade',
          trial_status: '/api/subscriptions/trial-status',
          webhook: '/api/stripe/webhook'
        },
        pricing: {
          basic: '$4.95',
          advanced: '$9.95',
          advanced_50_off: '$4.95',
          unlimited: '$19.95'
        }
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  });

  // Admin endpoint to cleanup duplicate users
  app.post('/api/admin/cleanup-users', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Only allow admin users
      if (!user?.email?.includes('toby@gowithclark.com') && !user?.email?.includes('thetobyclarkshow@gmail.com')) {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }
      
      console.log(`[ADMIN] User ${user.email} initiated duplicate user cleanup`);
      const result = await runUserCleanup();
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('[ADMIN] Cleanup endpoint error:', error);
      res.status(500).json({ 
        success: false,
        message: "Cleanup failed",
        error: error instanceof Error ? error.message : "Unknown error"
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
          // Establish persistent session for test user
          req.session.user = {
            id: testUser.id,
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName
          };
          req.user = req.session.user;
          
          // Force session save for persistence
          req.session.save((err: any) => {
            if (err) console.error('Session save error:', err);
          });
          
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

      // Use production-ready database connection with rate limiting
      let user;
      if (req.user.email) {
        user = await finalDb.getUserByEmail(req.user.email);
      } else {
        user = await finalDb.getUserById(userId);
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return sanitized user data with safe property access
      res.json({
        id: user.id || '',
        email: user.email || '',
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        profileImageUrl: user.profile_image_url || null,
        subscriptionTier: user.subscription_tier || 'free',
        subscriptionStatus: user.subscription_status || 'active',
        maxConnections: user.max_connections || 1,
        hasSeenOnboarding: user.has_seen_onboarding || false,
        createdAt: user.created_at || null,
        updatedAt: user.updated_at || null
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

  // Trial status endpoint
  app.get('/api/trial-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const trialStatus = await storage.checkTrialStatus(userId);
      const connectionCount = currentUser.email ? await storage.getInitiatedConnectionsCount(currentUser.email) : 0;

      res.json({
        isExpired: trialStatus.isExpired,
        daysRemaining: trialStatus.daysRemaining,
        subscriptionTier: currentUser.subscriptionTier,
        subscriptionStatus: currentUser.subscriptionStatus,
        maxConnections: currentUser.maxConnections,
        currentConnections: connectionCount
      });
    } catch (error) {
      console.error('Trial status error:', error);
      res.status(500).json({ message: 'Failed to check trial status' });
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

      // Check trial status and subscription limits before allowing connection creation
      const trialStatus = await storage.checkTrialStatus(currentUser.id);
      
      // Block all actions if trial has expired and user doesn't have paid subscription
      if (trialStatus.isExpired && currentUser.subscriptionTier === 'trial') {
        await storage.expireTrialUser(currentUser.id);
        return res.status(403).json({ 
          message: "Your 7-day free trial has expired. Choose a subscription plan to continue using Deeper.", 
          type: "TRIAL_EXPIRED",
          subscriptionTier: currentUser.subscriptionTier,
          requiresUpgrade: true
        });
      }

      const initiatedConnectionsCount = await storage.getInitiatedConnectionsCount(currentUser.email);
      const userMaxConnections = currentUser.maxConnections || 1;
      
      if (initiatedConnectionsCount >= userMaxConnections) {
        return res.status(403).json({ 
          message: "Connection limit reached. Upgrade your plan to invite more people.", 
          type: "SUBSCRIPTION_LIMIT",
          currentCount: initiatedConnectionsCount,
          maxAllowed: userMaxConnections,
          subscriptionTier: currentUser.subscriptionTier || 'trial',
          requiresUpgrade: true
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
  app.post("/api/subscriptions/upgrade", async (req: any, res) => {
    try {
      // Check session-based authentication first
      let userId;
      let user;

      if (req.session?.user) {
        userId = req.session.user.id;
        user = await storage.getUser(userId);
      } else if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        userId = req.user.claims?.sub || req.user.id;
        user = await storage.getUser(userId);
      } else {
        return res.status(401).json({ 
          message: "Authentication required. Please log in again.",
          code: "AUTH_REQUIRED"
        });
      }
      
      if (!userId || !user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { tier, discountPercent } = req.body;
      
      console.log('Subscription upgrade request:', { 
        userId, 
        tier, 
        discountPercent, 
        userEmail: user.email,
        hasStripeCustomerId: !!user.stripeCustomerId 
      });

      if (!user) {
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

      // Get or create Stripe customer
      let customer;
      if (user.stripeCustomerId) {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email: user.email!,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email!,
          metadata: {
            userId: user.id,
            platform: 'deeper'
          }
        });
        
        // Update user with Stripe customer ID
        await storage.updateUserSubscription(userId, {
          subscriptionTier: user.subscriptionTier || 'free',
          subscriptionStatus: user.subscriptionStatus || 'active',
          maxConnections: user.maxConnections || 1,
          stripeCustomerId: customer.id
        });
      }

      // Cancel existing subscription if any
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        } catch (error) {
          console.error("Error canceling existing subscription:", error);
        }
      }

      // Handle discount for Advanced plan
      let finalPrice = STRIPE_PRICES[tier as keyof typeof STRIPE_PRICES];
      
      // Use special 50% discount price ID for Advanced plan
      if (discountPercent && tier === 'advanced' && discountPercent === 50) {
        finalPrice = STRIPE_PRICES.advanced_50_off;
        console.log('Using 50% discount price ID:', finalPrice);
      }
      
      if (!finalPrice) {
        console.error('Missing Stripe price ID for tier:', tier, 'discount:', discountPercent);
        return res.status(500).json({ message: 'Invalid subscription configuration' });
      }

      // First create a setup intent for payment method collection during trial
      const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        usage: 'off_session',
        payment_method_types: ['card'],
        metadata: {
          userId: user.id,
          tier: tier,
          platform: 'deeper',
          discount_applied: discountPercent ? discountPercent.toString() : 'none'
        }
      });

      // Create subscription with trial period (no trial for discounted advanced plan)
      const subscriptionConfig: any = {
        customer: customer.id,
        items: [{
          price: finalPrice,
        }],
        metadata: {
          userId: user.id,
          tier: tier,
          platform: 'deeper',
          discount_applied: discountPercent ? discountPercent.toString() : 'none'
        }
      };

      // Only add trial period if not using discount
      if (!(discountPercent && tier === 'advanced' && discountPercent === 50)) {
        subscriptionConfig.trial_period_days = 7;
      }

      const subscription = await stripe.subscriptions.create(subscriptionConfig);

      // Update user subscription in database
      const subscriptionStatus = (discountPercent && tier === 'advanced' && discountPercent === 50) ? 'active' : 'trialing';
      await storage.updateUserSubscription(userId, {
        subscriptionTier: tier,
        subscriptionStatus: subscriptionStatus,
        maxConnections: benefits.maxConnections,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        subscriptionExpiresAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : undefined
      });

      res.json({ 
        success: true, 
        tier, 
        maxConnections: benefits.maxConnections,
        subscriptionId: subscription.id,
        clientSecret: setupIntent.client_secret,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        discountApplied: discountPercent ? `${discountPercent}%` : null,
        message: discountPercent && tier === 'advanced' ? 
          "Subscription created successfully with 50% discount - charged immediately!" : 
          "Subscription created successfully with 7-day trial" 
      });
    } catch (error: any) {
      console.error("Subscription upgrade error:", error);
      console.error("Error details:", {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        requestBody: req.body,
        userId: req.userId
      });
      res.status(500).json({ 
        message: "Failed to upgrade subscription",
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  });

  // Stripe webhook for handling subscription events
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test');
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.created':
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdate(subscription);
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionCancellation(deletedSubscription);
          break;

        case 'invoice.payment_succeeded':
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentSuccess(invoice);
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailure(failedInvoice);
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Get subscription status
  app.get('/api/subscriptions/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user.stripeSubscriptionId) {
        return res.json({
          status: 'none',
          tier: user.subscriptionTier || 'free',
          maxConnections: user.maxConnections || 1
        });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      res.json({
        status: subscription.status,
        tier: user.subscriptionTier,
        maxConnections: user.maxConnections,
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
      });
    } catch (error) {
      console.error('Subscription status error:', error);
      res.status(500).json({ message: 'Failed to retrieve subscription status' });
    }
  });

  // Cancel subscription
  app.post('/api/subscriptions/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: 'No active subscription found' });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      res.json({
        success: true,
        message: 'Subscription will be canceled at the end of the current period',
        cancelAt: new Date((subscription as any).current_period_end * 1000)
      });
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      res.status(500).json({ message: 'Failed to cancel subscription' });
    }
  });

  // Reactivate subscription
  app.post('/api/subscriptions/reactivate', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: 'No subscription found' });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false
      });

      res.json({
        success: true,
        message: 'Subscription reactivated successfully'
      });
    } catch (error) {
      console.error('Subscription reactivation error:', error);
      res.status(500).json({ message: 'Failed to reactivate subscription' });
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

      // Check subscription status and trial expiration for conversation creation
      const now = new Date();
      const subscriptionTier = currentUser.subscriptionTier || 'free';
      const subscriptionStatus = currentUser.subscriptionStatus || 'inactive';
      const subscriptionExpiresAt = currentUser.subscriptionExpiresAt;

      // Enforce trial expiration for conversation creation
      if (subscriptionTier === 'free' || (subscriptionStatus === 'trialing' && subscriptionExpiresAt && subscriptionExpiresAt < now)) {
        return res.status(403).json({ 
          type: 'TRIAL_EXPIRED',
          message: "Your free trial has expired. Please upgrade to continue using Deeper.",
          subscriptionTier,
          subscriptionStatus
        });
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

      // Check subscription status and trial expiration for messaging
      const senderUser = await storage.getUserByEmail(messageData.senderEmail);
      if (!senderUser) {
        return res.status(403).json({ message: "User not found" });
      }

      const now = new Date();
      const subscriptionTier = senderUser.subscriptionTier || 'free';
      const subscriptionStatus = senderUser.subscriptionStatus || 'inactive';
      const subscriptionExpiresAt = senderUser.subscriptionExpiresAt;

      // Enforce trial expiration for messaging
      if (subscriptionTier === 'free' || (subscriptionStatus === 'trialing' && subscriptionExpiresAt && subscriptionExpiresAt < now)) {
        return res.status(403).json({ 
          type: 'TRIAL_EXPIRED',
          message: "Your free trial has expired. Please upgrade to continue conversations.",
          subscriptionTier,
          subscriptionStatus
        });
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

        // Additional validation: For new questions (not first), ensure user has provided at least one response
        if (messageData.type === 'question' && existingMessages.length > 0) {
          const userResponses = existingMessages.filter(msg => 
            msg.type === 'response' && msg.senderEmail === messageData.senderEmail
          );
          
          if (userResponses.length === 0) {
            return res.status(400).json({ 
              message: "You must provide at least one response before asking a new question" 
            });
          }
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

  // Voice message endpoint - Production ready with comprehensive security
  app.post("/api/conversations/:id/voice-messages", 
    audioUpload.single('audio'),
    rateLimit(50, 60 * 60 * 1000), // 50 voice messages per hour
    validateEmail,
    isAuthenticated,
    async (req: any, res) => {
    let audioPath: string | null = null;
    try {
      const conversationId = parseInt(req.params.id);
      const { senderEmail, type, duration } = req.body;
      const userId = req.user.claims?.sub || req.user.id;
      
      // Comprehensive input validation
      if (!req.file) {
        return res.status(400).json({ message: "Audio file is required" });
      }

      // Validate conversation ID
      if (isNaN(conversationId) || conversationId <= 0) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      // Validate required fields
      if (!senderEmail || typeof senderEmail !== 'string' || !senderEmail.trim()) {
        return res.status(400).json({ message: "Valid sender email is required" });
      }

      if (!type || !['question', 'response'].includes(type)) {
        return res.status(400).json({ message: "Invalid message type. Must be 'question' or 'response'" });
      }

      // Validate and sanitize duration
      const parsedDuration = parseInt(duration);
      if (isNaN(parsedDuration) || parsedDuration <= 0 || parsedDuration > 1800) { // Max 30 minutes
        return res.status(400).json({ message: "Invalid audio duration. Must be between 1 second and 30 minutes" });
      }

      // Validate audio file properties
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (req.file.size > maxFileSize) {
        return res.status(413).json({ message: "Audio file too large. Maximum size is 50MB" });
      }

      // Validate MIME type for security
      const allowedMimeTypes = [
        'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 
        'audio/ogg', 'audio/m4a', 'audio/aac'
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          message: "Invalid audio format. Supported formats: WebM, MP4, MP3, WAV, OGG, M4A, AAC" 
        });
      }

      // Verify user authentication and authorization
      const user = await storage.getUser(userId);
      if (!user || user.email !== senderEmail) {
        return res.status(403).json({ message: "Not authorized to send messages as this user" });
      }

      // Validate conversation exists and user is authorized
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Check if sender is a participant
      if (senderEmail !== conversation.participant1Email && 
          senderEmail !== conversation.participant2Email) {
        return res.status(403).json({ message: "Not authorized to send messages in this conversation" });
      }

      // Check if it's the sender's turn
      if (senderEmail !== conversation.currentTurn) {
        return res.status(400).json({ message: "It's not your turn to send a message" });
      }

      // Generate secure filename with timestamp and random string
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = req.file.mimetype.split('/')[1] || 'webm';
      const fileName = `voice_${timestamp}_${randomString}.${fileExtension}`;
      audioPath = path.join(uploadsDir, fileName);
      
      // Save audio file securely with enhanced logging
      try {
        console.log('Saving audio file to:', audioPath);
        console.log('Audio file size:', req.file.size);
        console.log('Audio file type:', req.file.mimetype);
        
        await fs.writeFile(audioPath, req.file.buffer);
        
        // Verify file was written
        const stats = await fs.stat(audioPath);
        console.log('Audio file saved successfully. Size:', stats.size);
      } catch (fileError) {
        console.error("File save error:", fileError);
        return res.status(500).json({ message: "Failed to save audio file" });
      }
      
      const audioFileUrl = `/uploads/${fileName}`;
      console.log('Generated audio file URL:', audioFileUrl);

      // Transcribe audio using OpenAI Whisper with production-ready error handling
      let transcription = '';
      try {
        // Validate OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
          console.warn('OpenAI API key not configured, skipping transcription');
          transcription = '[Transcription unavailable - audio only]';
        } else {
          const fs_node = await import('fs');
          
          // Check if audio file exists and is readable
          try {
            await fs_node.promises.access(audioPath, fs_node.constants.R_OK);
          } catch (accessError) {
            console.error('Audio file not accessible for transcription:', accessError);
            transcription = '[Transcription failed - file access error]';
          }
          
          if (!transcription) {
            // Create read stream with error handling
            const audioStream = fs_node.createReadStream(audioPath);
            
            // Add timeout and error handling for transcription
            const transcriptionResponse = await Promise.race([
              openai.audio.transcriptions.create({
                file: audioStream,
                model: "whisper-1",
                response_format: "text",
                language: "en" // Optimize for English
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transcription timeout')), 30000) // 30 second timeout
              )
            ]);
            
            transcription = typeof transcriptionResponse === 'string' 
              ? transcriptionResponse.trim() 
              : '[Transcription failed - invalid response]';
              
            // Validate transcription length for security
            if (transcription.length > 5000) {
              transcription = transcription.substring(0, 5000) + '... [truncated]';
            }
            
            // Clean up transcription text
            transcription = transcription.replace(/[^\w\s\.,\?!'";\-:()]/g, '').trim();
            
            if (!transcription || transcription.length < 3) {
              transcription = '[Audio detected but transcription unclear]';
            }
          }
        }
      } catch (error: any) {
        console.error('OpenAI transcription error:', error);
        
        // Specific error handling for OpenAI API issues
        if (error.code === 'insufficient_quota') {
          transcription = '[Transcription unavailable - quota exceeded]';
        } else if (error.code === 'invalid_api_key') {
          transcription = '[Transcription unavailable - authentication error]';
        } else if (error.message?.includes('timeout')) {
          transcription = '[Transcription failed - timeout]';
        } else if (error.code === 'model_not_found') {
          transcription = '[Transcription unavailable - service error]';
        } else {
          transcription = '[Transcription failed - audio only]';
        }
      }

      // Get existing messages to validate message type
      const existingMessages = await storage.getMessagesByConversationId(conversationId);
      const lastMessage = existingMessages[existingMessages.length - 1];

      // Validate message type based on conversation flow
      if (existingMessages.length === 0) {
        if (type !== 'question') {
          return res.status(400).json({ message: "First message must be a question" });
        }
      } else {
        const expectedType = lastMessage.type === 'question' ? 'response' : 'question';
        if (type !== expectedType) {
          return res.status(400).json({ message: `Expected ${expectedType}, got ${type}` });
        }
      }

      // Create voice message with transcription
      const messageData = {
        conversationId,
        senderEmail,
        content: transcription, // Store transcription as content
        type,
        messageFormat: 'voice' as const,
        audioFileUrl,
        transcription,
        audioDuration: parseInt(duration) || 0
      };

      console.log('Creating voice message with data:', {
        ...messageData,
        content: transcription.substring(0, 100) + '...' // Truncate for logging
      });

      const message = await storage.createMessage(messageData);
      console.log('Voice message created successfully with ID:', message.id);

      // Generate thread title if this is the first question
      if (existingMessages.length === 0 && type === 'question') {
        const threadTitle = generateRelationshipSpecificTitle(
          transcription, 
          conversation.relationshipType
        );
        await storage.updateConversationTitle(conversationId, threadTitle);
      }

      // Update conversation turn to the other participant
      const nextTurn = conversation.currentTurn === conversation.participant1Email 
        ? conversation.participant2Email 
        : conversation.participant1Email;
      await storage.updateConversationTurn(conversationId, nextTurn);

      // Send turn notification
      try {
        await notificationService.sendTurnNotification({
          recipientEmail: nextTurn,
          senderEmail,
          conversationId,
          relationshipType: conversation.relationshipType,
          messageType: type
        });
      } catch (error) {
        console.error('[NOTIFICATION] Failed to send turn notification:', error);
      }

      // Send real-time WebSocket notifications
      try {
        const { getWebSocketManager } = await import('./websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          const senderName = await storage.getUserDisplayNameByEmail(senderEmail);
          
          wsManager.notifyNewMessage(nextTurn, {
            conversationId,
            senderEmail,
            senderName,
            messageType: type,
            relationshipType: conversation.relationshipType
          });
          
          wsManager.notifyConversationUpdate(senderEmail, {
            conversationId,
            action: 'message_sent',
            relationshipType: conversation.relationshipType
          });
        }
      } catch (error) {
        console.error('[WEBSOCKET] Failed to send real-time notification:', error);
      }

      // Track voice message sending
      analytics.track({
        type: 'message_sent',
        email: senderEmail,
        metadata: { 
          conversationId,
          messageType: type,
          messageFormat: 'voice',
          relationshipType: conversation.relationshipType
        }
      });

      // Verify audio file exists before responding
      try {
        await fs.access(audioPath);
        console.log('Audio file confirmed accessible at:', audioPath);
      } catch (accessError) {
        console.error('Audio file not accessible after creation:', accessError);
        return res.status(500).json({ message: "Audio file creation failed" });
      }

      res.json({
        ...message,
        message: "Voice message sent successfully",
        audioFileUrl: audioFileUrl,
        debug: process.env.NODE_ENV === 'development' ? {
          audioPath,
          audioFileUrl,
          fileSize: req.file.size
        } : undefined
      });
    } catch (error: any) {
      console.error("Create voice message error:", error);
      
      // Clean up audio file if it was created but message creation failed
      if (req.file && audioPath) {
        try {
          await fs.unlink(audioPath);
        } catch (cleanupError) {
          console.error("Failed to clean up audio file:", cleanupError);
        }
      }
      
      // Enhanced error handling for production
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
      } else if (error.code === 'ENOSPC') {
        return res.status(507).json({ message: "Insufficient storage space" });
      } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
        return res.status(503).json({ message: "Server temporarily overloaded" });
      }
      
      res.status(500).json({ 
        message: process.env.NODE_ENV === 'production' 
          ? "Voice message service temporarily unavailable"
          : "Failed to create voice message" 
      });
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

  // Enhanced AI Question Generation endpoint with infinite suggestions
  app.post("/api/ai/generate-questions", 
    rateLimit(10, 60 * 60 * 1000), // 10 generations per hour for infinite suggestions
    isAuthenticated, 
    async (req: any, res) => {
    try {
      const { relationshipType, userRole, otherUserRole, count = 5, excludeQuestions = [] } = req.body;
      
      if (!relationshipType) {
        return res.status(400).json({ message: "Relationship type is required" });
      }
      
      // Validate count
      const questionCount = Math.min(Math.max(parseInt(count) || 5, 1), 10);
      
      // Filter to exclude already shown questions
      const exclusionList = Array.isArray(excludeQuestions) ? excludeQuestions : [];

      // Try OpenAI API first, fall back to role-specific templates
      try {
        if (process.env.OPENAI_API_KEY && userRole) {
          const OpenAI = await import('openai');
          const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });
          
          // Create exclusion context for AI
          const exclusionContext = exclusionList.length > 0 
            ? `\n\nIMPORTANT: Do NOT generate any questions similar to these already shown questions: ${exclusionList.slice(0, 10).join('; ')}`
            : '';

          // Create role-specific prompts for vulnerable, difficult-to-ask questions
          const rolePrompts = {
            "Parent-Child": {
              "Father": `Generate ${questionCount} deeply vulnerable conversation questions that an adult father might ask his grown child - questions that address fears, regrets, difficult emotions, or conversations that are hard to bring up in person. Focus on: parenting mistakes/regrets, fears about the relationship, personal struggles, mortality/aging concerns, difficult family dynamics. These should be emotionally vulnerable questions that create authentic connection through difficult topics.${exclusionContext}`,
              "Mother": `Generate ${questionCount} deeply vulnerable conversation questions that an adult mother might ask her grown child - questions about fears, sacrifices, maternal struggles, or topics too difficult to discuss face-to-face. Focus on: motherhood fears/regrets, family sacrifices, relationship impacts on children, generational patterns, difficult emotional truths. These should be emotionally raw questions that foster genuine intimacy.${exclusionContext}`,
              "Son": `Generate ${questionCount} deeply vulnerable conversation questions that an adult son might ask his father - questions about struggles, fears, disappointments, or topics too difficult to bring up in person. Focus on: masculine identity struggles, feeling inadequate, relationship/career fears, family pressure, personal failures. These should be emotionally honest questions that address difficult father-son dynamics.${exclusionContext}`,
              "Daughter": `Generate ${questionCount} deeply vulnerable conversation questions that an adult daughter might ask her mother - questions about insecurities, fears, family patterns, or topics too sensitive to discuss face-to-face. Focus on: feminine identity struggles, family expectations, relationship fears, generational patterns, personal inadequacies. These should be emotionally vulnerable questions that address difficult mother-daughter dynamics.${exclusionContext}`
            },
            "Romantic Partners": {
              "Boyfriend": `Generate ${questionCount} deeply vulnerable questions for an adult boyfriend to ask his girlfriend - questions about relationship fears, insecurities, difficult emotions, or topics too scary to bring up in person. Focus on: relationship anxieties, intimacy struggles, commitment fears, past trauma effects, emotional needs.${exclusionContext}`,
              "Girlfriend": `Generate ${questionCount} deeply vulnerable questions for an adult girlfriend to ask her boyfriend - questions about relationship insecurities, fears, difficult emotions, or topics too vulnerable to discuss face-to-face. Focus on: relationship fears, intimacy struggles, emotional needs, commitment anxieties, past relationship impacts.${exclusionContext}`,
              "Husband": `Generate ${questionCount} deeply vulnerable questions for an adult husband to ask his wife - questions about marriage struggles, fears, difficult emotions, or topics too hard to bring up in person. Focus on: marriage difficulties, intimacy challenges, identity loss, unmet needs, relationship regrets.${exclusionContext}`,
              "Wife": `Generate ${questionCount} deeply vulnerable questions for an adult wife to ask her husband - questions about marriage fears, unmet needs, difficult emotions, or topics too vulnerable to discuss face-to-face. Focus on: marriage struggles, feeling disconnected, unvoiced needs, intimacy challenges, identity concerns.${exclusionContext}`
            },
            "Friends": {
              "Best Friend": `Generate ${questionCount} deeply vulnerable questions for an adult best friend - questions about friendship fears, hidden vulnerabilities, difficult emotions, or topics too sensitive to bring up in person. Focus on: friendship insecurities, jealousy, fear of growing apart, unspoken tensions, authentic connection struggles.${exclusionContext}`,
              "Close Friend": `Generate ${questionCount} deeply vulnerable questions for an adult close friend - questions about friendship boundaries, insecurities, fears, or topics difficult to discuss face-to-face. Focus on: friendship expectations, feeling left out, authenticity struggles, boundary navigation, connection fears.${exclusionContext}`,
              "Friend": `Generate ${questionCount} deeply vulnerable questions for an adult friend - questions about friendship difficulties, vulnerabilities, fears, or topics too risky to bring up in person. Focus on: friendship authenticity, fear of judgment, connection struggles, hidden insecurities, relationship patterns.${exclusionContext}`
            }
          };

          let prompt: string | undefined;
          if (relationshipType === "Parent-Child") {
            const parentChildPrompts = rolePrompts["Parent-Child"];
            prompt = (parentChildPrompts as any)[userRole];
          } else if (relationshipType === "Romantic Partners") {
            const romanticPrompts = rolePrompts["Romantic Partners"];
            prompt = (romanticPrompts as any)[userRole];
          }
          
          if (prompt) {
            // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: "You are an expert at creating deeply vulnerable conversation questions for adult relationships. Generate questions that address fears, regrets, difficult emotions, unspoken truths, and topics that are genuinely hard to bring up in person. These questions should foster authentic connection through emotional vulnerability and honest self-reflection. Focus on the difficult conversations that people need to have but struggle to initiate. Return only the questions as a JSON object with a 'questions' array."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              response_format: { type: "json_object" },
              max_tokens: 500
            });

            const result = JSON.parse(response.choices[0].message.content || '{}');
            if (result.questions && Array.isArray(result.questions)) {
              return res.json({ 
                questions: result.questions.slice(0, questionCount),
                relationshipType,
                userRole: userRole || '',
                otherUserRole: otherUserRole || '',
                count: result.questions.slice(0, questionCount).length
              });
            }
          }
        }
      } catch (error) {
        console.error("OpenAI API error:", error);
        // Continue to fallback templates
      }

      // Role-specific fallback templates for adult relationships
      const roleSpecificTemplates = {
        "Parent-Child": {
          "Father": [
            "What life lesson do you wish you had learned earlier that you want to share?",
            "How has watching you become an adult changed my perspective on my own choices?",
            "What aspect of modern adult life do you find most challenging that I might not understand?",
            "What family responsibility or tradition would you like to eventually take on?",
            "What's something you're proud of about how you've handled adult challenges?",
            "What wisdom from my father do I find myself wanting to pass down to you?"
          ],
          "Mother": [
            "What motherly wisdom do I want to share now that you're navigating adult relationships?",
            "How has my relationship with my own mother influenced how I want to connect with you?",
            "What life skill do I wish I had taught you before you became an adult?",
            "What aspect of your independence makes me most proud as your mother?",
            "What family tradition or value do I hope you'll carry into your own adult relationships?",
            "How do I navigate the shift from protector to advisor now that you're grown?"
          ],
          "Son": [
            "What aspect of being an adult man do I wish I could get your perspective on?",
            "What family responsibility am I ready to take on now that I'm grown?",
            "How has becoming an adult changed what I appreciate about you as my father?",
            "What life decision am I facing that I'd value your experience with?",
            "What question about relationships or career would I like your honest opinion on?",
            "What family story or tradition do I want to understand better now that I'm an adult?"
          ],
          "Daughter": [
            "What aspect of being an adult woman would I like your guidance on?",
            "How has my perspective on you changed since I became an adult myself?",
            "What life challenge am I facing that I think you might have insight about?",
            "What family tradition or value do I want to continue in my own adult life?",
            "What question about adult relationships would I value your perspective on?",
            "How do I want to honor what you taught me while creating my own adult path?"
          ]
        },
        "Romantic Partners": {
          "Boyfriend": [
            "What's something new I'd like us to experience together?",
            "When do I feel most connected to you?",
            "What's a dream I have for our relationship?",
            "What's something I've learned about love from being with you?",
            "How do I see us growing together in the next year?",
            "If I could relive one moment with you, what would it be?"
          ],
          "Girlfriend": [
            "What's something new I'd like us to experience together?",
            "When do I feel most connected to you?",
            "What's a dream I have for our relationship?",
            "What's something I've learned about love from being with you?",
            "How do I see us growing together in the next year?",
            "If I could relive one moment with you, what would it be?"
          ],
          "Husband": [
            "What's your favorite memory from our relationship so far?",
            "How have we grown together since we got married?",
            "What's something I'm grateful for about our partnership?",
            "What dream do I have for our future?",
            "What makes me feel most appreciated in our marriage?",
            "How can we strengthen our connection as spouses?"
          ],
          "Wife": [
            "What's your favorite memory from our relationship so far?",
            "How have we grown together since we got married?",
            "What's something I'm grateful for about our partnership?",
            "What dream do I have for our future?",
            "What makes me feel most appreciated in our marriage?",
            "How can we strengthen our connection as spouses?"
          ]
        },
        "Friends": {
          "Best Friend": [
            "What's my favorite memory of our friendship?",
            "How have we supported each other through tough times?",
            "What's something I admire about how you handle challenges?",
            "What adventure would I most like us to go on?",
            "What makes our friendship special to me?"
          ],
          "Close Friend": [
            "What's something we have in common that always surprises people?",
            "How has our friendship changed over the years?",
            "What's a goal I'd like support with?",
            "What's my favorite thing we do together?",
            "What's something I've learned from our friendship?"
          ]
        },
        "Siblings": {
          "Brother": [
            "What's my favorite childhood memory of us?",
            "How do I think we've influenced each other?",
            "What's something I admire about my sister?",
            "What family trait do I see in both of us?",
            "What's a tradition I hope we continue as adults?"
          ],
          "Sister": [
            "What's my favorite childhood memory of us?",
            "How do I think we've influenced each other?",
            "What's something I admire about my brother?",
            "What family trait do I see in both of us?",
            "What's a tradition I hope we continue as adults?"
          ]
        }
      };

      // Get role-specific templates or fall back to general relationship templates
      const relationshipTemplates = roleSpecificTemplates[relationshipType as keyof typeof roleSpecificTemplates];
      let templates: string[] = [];
      
      if (relationshipTemplates && typeof relationshipTemplates === 'object' && userRole) {
        if (relationshipType === "Parent-Child") {
          const parentChildTemplates = roleSpecificTemplates["Parent-Child"];
          templates = (parentChildTemplates as any)[userRole] || [];
        } else if (relationshipType === "Romantic Partners") {
          const romanticTemplates = roleSpecificTemplates["Romantic Partners"];
          templates = (romanticTemplates as any)[userRole] || [];
        } else if (relationshipType === "Friends") {
          const friendTemplates = roleSpecificTemplates["Friends"];
          templates = (friendTemplates as any)[userRole] || [];
        } else if (relationshipType === "Siblings") {
          const siblingTemplates = roleSpecificTemplates["Siblings"];
          templates = (siblingTemplates as any)[userRole] || [];
        }
      }
      
      // If still no templates, use generic fallback
      if (templates.length === 0) {
        templates = [
          "What's something you've learned about yourself recently?",
          "What's a challenge you're facing that we could work through together?",
          "What's something you wish I understood better about your world?"
        ];
      }
      
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

  // Custom AI Question Generation endpoint
  app.post("/api/ai/generate-custom-questions", 
    rateLimit(10, 60 * 60 * 1000), // 10 custom generations per hour
    isAuthenticated, 
    async (req: any, res) => {
    try {
      const { relationshipType, userRole, otherUserRole, customPrompt, count = 5 } = req.body;
      
      if (!relationshipType || !customPrompt?.trim()) {
        return res.status(400).json({ message: "Relationship type and custom prompt are required" });
      }
      
      // Validate count
      const questionCount = Math.min(Math.max(parseInt(count) || 5, 1), 5);

      // Try OpenAI API for custom question generation
      try {
        if (process.env.OPENAI_API_KEY && userRole) {
          const OpenAI = await import('openai');
          const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });
          
          // Create custom prompt focused on generating specific questions
          const customPromptText = `The user wants to discuss this topic with their ${relationshipType.toLowerCase().replace('-', ' ')} partner: "${customPrompt.trim()}"

Generate ${questionCount} specific, direct questions that a ${userRole} could ask to start a conversation about this topic. Each question should:
- Be a clear, direct question they can ask their partner
- Help them open up dialogue about the specific topic they mentioned
- Be vulnerable and authentic, but approachable
- Allow for deep exploration of the subject
- Be phrased as something they would actually say to start the conversation

Format each as a complete question they can use to begin this important conversation.`;

          // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are an expert at creating specific conversation starter questions for adult relationships. When given a topic or situation, generate direct questions that someone could ask their partner to begin discussing that exact topic. Each question should be a complete, clear question they can use to start the conversation. Focus on practical, actionable questions that open dialogue about the specific subject mentioned. Return only the questions as a JSON object with a 'questions' array."
              },
              {
                role: "user",
                content: customPromptText
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 400
          });

          const result = JSON.parse(response.choices[0].message.content || '{}');
          if (result.questions && Array.isArray(result.questions)) {
            return res.json({ 
              questions: result.questions.slice(0, questionCount),
              relationshipType,
              userRole: userRole || '',
              customPrompt: customPrompt.trim(),
              count: result.questions.slice(0, questionCount).length
            });
          }
        }
      } catch (error) {
        console.error("OpenAI API error for custom questions:", error);
      }

      // Generate specific fallback questions based on the user's custom prompt
      const topicKeywords = customPrompt.trim().toLowerCase();
      const fallbackQuestions = [
        `How do you think I should approach talking about ${topicKeywords} with you?`,
        `What would help you understand my feelings about ${topicKeywords}?`,
        `Can I share something with you about ${topicKeywords} that's been on my mind?`,
        `What questions do you have about ${topicKeywords} that might help us discuss it?`,
        `How can we create a safe space to talk through ${topicKeywords} together?`
      ];
      
      res.json({ 
        questions: fallbackQuestions.slice(0, questionCount),
        relationshipType,
        userRole: userRole || '',
        customPrompt: customPrompt.trim(),
        count: fallbackQuestions.slice(0, questionCount).length,
        fallback: true
      });
    } catch (error) {
      console.error("Custom AI question generation error:", error);
      res.status(500).json({ message: "Failed to generate custom questions" });
    }
  });

  // Endpoint for creating new conversation threads with questions (right column actions)
  app.post("/api/connections/:connectionId/conversations/with-question", 
    isAuthenticated, 
    rateLimit(50, 60 * 60 * 1000), // 50 new thread creations per hour
    async (req: any, res) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const { question, participant1Email, participant2Email, relationshipType } = req.body;
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!question || !question.trim()) {
        return res.status(400).json({ message: "Question content is required" });
      }
      
      // Verify user is part of this connection
      const connection = await storage.getConnection(connectionId);
      if (!connection || 
          (connection.inviterEmail !== currentUser.email && 
           connection.inviteeEmail !== currentUser.email)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate conversation flow: ensure user has provided at least one response
      // First get all conversations for this connection
      const existingConversations = await storage.getConversationsByConnection(connectionId);
      let hasProvidedResponse = false;
      
      for (const conv of existingConversations) {
        const messages = await storage.getMessagesByConversationId(conv.id);
        const userResponses = messages.filter(msg => 
          msg.type === 'response' && msg.senderEmail === currentUser.email
        );
        if (userResponses.length > 0) {
          hasProvidedResponse = true;
          break;
        }
      }
      
      // Only allow new questions if user has provided at least one response OR if this is their very first conversation
      if (!hasProvidedResponse && existingConversations.length > 0) {
        return res.status(400).json({ 
          message: "You must provide at least one response before asking a new question" 
        });
      }
      
      // Generate thread title from question
      const threadTitle = generateRelationshipSpecificTitle(question, relationshipType);
      
      // Create new conversation thread
      const conversationData = {
        connectionId,
        participant1Email,
        participant2Email,
        relationshipType,
        currentTurn: currentUser.email, // Creator starts the conversation
        status: 'active',
        title: threadTitle,
        topic: question,
        isMainThread: false
      };
      
      const conversation = await storage.createConversation(conversationData);
      
      // Immediately create the first message (question)
      const messageData = {
        conversationId: conversation.id,
        senderEmail: currentUser.email,
        content: question.trim(),
        type: 'question' as const
      };
      
      const message = await storage.createMessage(messageData);
      
      // Update conversation turn to other participant
      const otherParticipant = currentUser.email === participant1Email ? participant2Email : participant1Email;
      await storage.updateConversationTurn(conversation.id, otherParticipant);
      
      // Send turn notification to other participant
      try {
        await notificationService.sendTurnNotification(otherParticipant);
      } catch (notificationError) {
        console.error('Failed to send turn notification:', notificationError);
      }
      
      // Send real-time WebSocket notifications
      try {
        const { getWebSocketManager } = await import('./websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
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
      
      res.json({ 
        conversation, 
        message,
        threadTitle
      });
    } catch (error) {
      console.error("Create conversation with question error:", error);
      res.status(500).json({ message: "Failed to create conversation with question" });
    }
  });

  // Phone verification endpoints for SMS notifications
  app.post("/api/users/send-verification", rateLimit(5, 15 * 60 * 1000), isAuthenticated, async (req: any, res) => {
    try {
      const { phoneNumber } = req.body;
      const userId = req.user.claims?.sub || req.user.id;

      // Comprehensive input validation
      if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length === 0) {
        return res.status(400).json({ message: "Valid phone number is required" });
      }

      // Sanitize phone number (remove all non-digit characters except +)
      const sanitizedPhone = phoneNumber.replace(/[^\d+]/g, '');
      
      // Enhanced phone number validation (E.164 format)
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(sanitizedPhone)) {
        return res.status(400).json({ 
          message: "Phone number must be in international format (e.g., +1234567890)" 
        });
      }

      // Length validation for additional security
      if (sanitizedPhone.length < 8 || sanitizedPhone.length > 16) {
        return res.status(400).json({ message: "Invalid phone number length" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check for existing recent verification attempts (prevent spam)
      const existingVerification = await storage.getVerificationCode(user.email || '', sanitizedPhone);
      if (existingVerification && existingVerification.expiresAt > new Date()) {
        const remainingTime = Math.ceil((existingVerification.expiresAt.getTime() - Date.now()) / 1000 / 60);
        return res.status(429).json({ 
          message: `Verification code already sent. Please wait ${remainingTime} minutes before requesting a new one.`,
          remainingMinutes: remainingTime
        });
      }

      // Send SMS via notification service with proper error handling
      let verificationCode: string;
      try {
        verificationCode = await notificationService.sendPhoneVerification(sanitizedPhone);
      } catch (smsError: any) {
        console.error("SMS sending failed:", smsError);
        
        // Specific error handling for common Twilio errors
        if (smsError.code === 21211) {
          return res.status(400).json({ message: "Invalid phone number. Please check and try again." });
        } else if (smsError.code === 21608) {
          return res.status(400).json({ message: "This phone number cannot receive SMS messages." });
        } else if (smsError.code === 21614) {
          return res.status(400).json({ message: "Phone number is not a valid mobile number." });
        }
        
        return res.status(503).json({ 
          message: "SMS service temporarily unavailable. Please try again later." 
        });
      }

      // Validate verification code was generated
      if (!verificationCode) {
        return res.status(500).json({ 
          message: "Failed to generate verification code. Please try again." 
        });
      }

      // Store verification code securely in database
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await storage.createVerificationCode({
        email: user.email || '',
        phoneNumber: sanitizedPhone,
        code: verificationCode,
        expiresAt,
        verified: false,
      });

      res.json({ 
        message: "Verification code sent successfully",
        phoneNumber: sanitizedPhone,
        expiresInMinutes: 10
      });
    } catch (error: any) {
      console.error("Send verification error:", error);
      
      // Differentiate between different types of errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ 
        message: process.env.NODE_ENV === 'production' 
          ? "Service temporarily unavailable. Please try again later."
          : "Failed to send verification code" 
      });
    }
  });

  app.post("/api/users/verify-phone", rateLimit(10, 15 * 60 * 1000), isAuthenticated, async (req: any, res) => {
    try {
      const { phoneNumber, code } = req.body;
      const userId = req.user.claims?.sub || req.user.id;

      // Comprehensive input validation
      if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length === 0) {
        return res.status(400).json({ message: "Valid phone number is required" });
      }

      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return res.status(400).json({ message: "Verification code is required" });
      }

      // Sanitize and validate verification code
      const sanitizedCode = code.replace(/\D/g, ''); // Remove non-digits
      if (sanitizedCode.length !== 6) {
        return res.status(400).json({ message: "Verification code must be exactly 6 digits" });
      }

      // Sanitize phone number
      const sanitizedPhone = phoneNumber.replace(/[^\d+]/g, '');
      
      // Validate phone number format
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(sanitizedPhone)) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get verification code from database
      const storedVerification = await storage.getVerificationCode(user.email || '', sanitizedPhone);

      if (!storedVerification) {
        return res.status(400).json({ 
          message: "Verification code not found or expired. Please request a new code." 
        });
      }

      // Check if verification code has expired
      if (storedVerification.expiresAt <= new Date()) {
        // Clean up expired verification code
        await storage.markVerificationCodeUsed(storedVerification.id);
        return res.status(400).json({ 
          message: "Verification code has expired. Please request a new code." 
        });
      }

      // Check if verification code has already been used
      if (storedVerification.verified) {
        return res.status(400).json({ 
          message: "Verification code has already been used. Please request a new code." 
        });
      }

      // Verify the code (constant-time comparison for security)
      if (storedVerification.code !== sanitizedCode) {
        // Implement attempt tracking to prevent brute force attacks
        return res.status(400).json({ 
          message: "Invalid verification code. Please check and try again." 
        });
      }

      // Update user with verified phone number
      await storage.updateUser(userId, {
        phoneNumber: sanitizedPhone,
        phoneVerified: true,
        // Set SMS as default notification preference if user chose SMS setup
        notificationPreference: user.notificationPreference || 'email'
      });

      // Mark verification code as used to prevent reuse
      await storage.markVerificationCodeUsed(storedVerification.id);

      res.json({ 
        message: "Phone number verified successfully",
        phoneNumber: sanitizedPhone,
        phoneVerified: true
      });
    } catch (error: any) {
      console.error("Verify phone error:", error);
      
      // Enhanced error handling for production
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ 
        message: process.env.NODE_ENV === 'production' 
          ? "Verification service temporarily unavailable. Please try again later."
          : "Failed to verify phone number" 
      });
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

  // Set conversation-specific notification preference
  app.post("/api/users/notification-preference", isAuthenticated, async (req: any, res) => {
    try {
      const { conversationId, preference } = req.body;
      const userId = req.user.claims?.sub || req.user.id;
      
      if (!conversationId || !preference) {
        return res.status(400).json({ message: "Conversation ID and preference are required" });
      }

      if (!["email", "sms", "both"].includes(preference)) {
        return res.status(400).json({ message: "Invalid preference. Must be 'email', 'sms', or 'both'" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate conversationId is a number
      const conversationIdNum = parseInt(conversationId);
      if (isNaN(conversationIdNum) || conversationIdNum <= 0) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      // Update conversation-specific notification preference with proper typing
      const currentPrefs: Record<string, any> = user.conversationNotificationPrefs || {};
      currentPrefs[conversationIdNum.toString()] = {
        preference,
        setAt: new Date().toISOString(),
        neverShow: false
      };

      await storage.updateUser(userId, {
        conversationNotificationPrefs: currentPrefs,
        notificationPreference: preference // Also update global preference
      });

      res.json({ message: "Notification preference saved successfully" });
    } catch (error) {
      console.error("Set notification preference error:", error);
      res.status(500).json({ message: "Failed to set notification preference" });
    }
  });

  // Dismiss notification preference popup
  app.post("/api/users/dismiss-notification-popup", isAuthenticated, async (req: any, res) => {
    try {
      const { conversationId, dismissType } = req.body;
      const userId = req.user.claims?.sub || req.user.id;
      
      if (!conversationId || !dismissType) {
        return res.status(400).json({ message: "Conversation ID and dismiss type are required" });
      }

      if (!["never", "later"].includes(dismissType)) {
        return res.status(400).json({ message: "Invalid dismiss type. Must be 'never' or 'later'" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate conversationId is a number
      const conversationIdNum = parseInt(conversationId);
      if (isNaN(conversationIdNum) || conversationIdNum <= 0) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const currentPrefs: Record<string, any> = user.conversationNotificationPrefs || {};
      
      if (dismissType === "never") {
        currentPrefs[conversationIdNum.toString()] = {
          preference: "email", // Keep email as default
          setAt: new Date().toISOString(),
          neverShow: true
        };

        await storage.updateUser(userId, {
          conversationNotificationPrefs: currentPrefs
        });
      }
      // For "later", we don't store anything so popup shows again

      res.json({ message: "Popup dismissed successfully" });
    } catch (error) {
      console.error("Dismiss notification popup error:", error);
      res.status(500).json({ message: "Failed to dismiss popup" });
    }
  });

  // Get conversation notification preference status
  app.get("/api/users/notification-preference/:conversationId", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = req.params.conversationId;
      const userId = req.user.claims?.sub || req.user.id;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate conversationId is a number
      const conversationIdNum = parseInt(conversationId);
      if (isNaN(conversationIdNum) || conversationIdNum <= 0) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const currentPrefs: Record<string, any> = user.conversationNotificationPrefs || {};
      const conversationPref = currentPrefs[conversationIdNum.toString()];

      res.json({
        hasPreference: !!conversationPref,
        preference: conversationPref?.preference || user.notificationPreference || "email",
        neverShow: conversationPref?.neverShow || false,
        globalPreference: user.notificationPreference || "email"
      });
    } catch (error) {
      console.error("Get notification preference error:", error);
      res.status(500).json({ message: "Failed to get notification preference" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}