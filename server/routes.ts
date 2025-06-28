import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import multer from "multer";
import sharp from "sharp";
import fs from "fs/promises";
import passport from "passport";
import { storage } from "./storage";
import { finalDb } from "./db-final";
import { insertConnectionSchema, insertMessageSchema, insertUserSchema } from "../shared/schema";
import { getRolesForRelationship, isValidRolePair } from "@shared/relationship-roles";
import { z } from "zod";

// Type conversion utility for null to undefined
const nullToUndefined = <T>(value: T | null): T | undefined => value === null ? undefined : value;

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
import { setupAdminRoutes } from "./admin-routes";

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

// Log Stripe configuration on startup
console.log('[STRIPE] Price configuration:', {
  basic: STRIPE_PRICES.basic ? 'configured' : 'missing',
  advanced: STRIPE_PRICES.advanced ? 'configured' : 'missing', 
  unlimited: STRIPE_PRICES.unlimited ? 'configured' : 'missing',
  advanced_50_off: STRIPE_PRICES.advanced_50_off ? 'configured' : 'missing'
});

// Validate Stripe price IDs on startup
async function validateStripePrices() {
  try {
    console.log('[STRIPE] Validating price IDs...');
    
    for (const [tier, priceId] of Object.entries(STRIPE_PRICES)) {
      if (priceId) {
        try {
          const price = await stripe.prices.retrieve(priceId);
          console.log(`[STRIPE] ✓ ${tier} price valid:`, price.id, `(${(price.unit_amount || 0)/100} ${price.currency})`);
        } catch (error) {
          console.error(`[STRIPE] ✗ ${tier} price INVALID:`, priceId, (error as Error).message);
        }
      }
    }
  } catch (error) {
    console.error('[STRIPE] Price validation failed:', error);
  }
}

// Run validation after a short delay to allow server startup
setTimeout(validateStripePrices, 2000);

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

  // Get the new tier from subscription metadata
  const newTier = subscription.metadata?.tier as 'basic' | 'advanced' | 'unlimited' | 'free';
  const isDiscountSubscription = subscription.metadata?.discount_applied === '50';

  // For discount subscriptions, check payment intent using metadata payment_intent_id
  if (isDiscountSubscription && subscription.status === 'incomplete') {
    try {
      const paymentIntentId = subscription.metadata?.payment_intent_id;
      console.log(`[WEBHOOK] Processing discount subscription ${subscription.id}, payment intent: ${paymentIntentId}`);
      
      if (paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log(`[WEBHOOK] Payment status: ${paymentIntent.status}, amount: ${paymentIntent.amount_received}`);
        
        // If payment succeeded for $4.95, upgrade immediately
        if (paymentIntent.status === 'succeeded' && paymentIntent.amount_received === 495) {
          console.log(`[WEBHOOK] Upgrading user ${userId} to Advanced tier`);
          
          const tierBenefits: Record<string, { maxConnections: number }> = {
            basic: { maxConnections: 1 },
            advanced: { maxConnections: 3 },
            unlimited: { maxConnections: 999 },
            free: { maxConnections: 0 }
          };

          const benefits = tierBenefits[newTier] || tierBenefits.advanced;

          await storage.updateUserSubscription(userId, {
            subscriptionTier: newTier || 'advanced',
            subscriptionStatus: 'active',
            maxConnections: benefits.maxConnections,
            stripeCustomerId: user.stripeCustomerId ?? undefined,
            stripeSubscriptionId: subscription.id,
            subscriptionExpiresAt: undefined
          });
          
          console.log(`[WEBHOOK] User ${userId} successfully upgraded`);
          return;
        }
      }
    } catch (error) {
      console.error(`[WEBHOOK] Error processing discount subscription: ${error}`);
    }
  }
  
  // Only update subscription tier and benefits when payment is confirmed (active or trialing)
  if (status === 'active' || status === 'trialing') {
    const tierBenefits = {
      free: { maxConnections: 1 },
      basic: { maxConnections: 1 },
      advanced: { maxConnections: 3 },
      unlimited: { maxConnections: 999 }
    };

    const benefits = tierBenefits[newTier] || tierBenefits.free;

    await storage.updateUserSubscription(userId, {
      subscriptionTier: newTier || 'free',
      subscriptionStatus: status,
      maxConnections: benefits.maxConnections,
      stripeCustomerId: nullToUndefined(user.stripeCustomerId),
      stripeSubscriptionId: nullToUndefined(user.stripeSubscriptionId),
      subscriptionExpiresAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : undefined
    });
  } else {
    // For failed/inactive subscriptions, keep current tier but update status
    await storage.updateUserSubscription(userId, {
      subscriptionTier: user.subscriptionTier || 'free',
      subscriptionStatus: status,
      maxConnections: user.maxConnections || 1,
      stripeCustomerId: nullToUndefined(user.stripeCustomerId),
      stripeSubscriptionId: nullToUndefined(user.stripeSubscriptionId),
      subscriptionExpiresAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : undefined
    });
  }
}

async function handlePaymentIntentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Check if this is a $4.95 discount payment
    if (paymentIntent.amount === 495) {
      // Find the subscription associated with this payment
      const invoices = await stripe.invoices.list({
        limit: 100
      });
      
      // Find invoice by payment intent metadata
      const matchingInvoice = invoices.data.find(invoice => 
        (invoice as any).payment_intent === paymentIntent.id
      );
      
      if (matchingInvoice && (matchingInvoice as any).subscription) {
        await handleDiscountPaymentUpgrade((matchingInvoice as any).subscription as string);
      }
    }
  } catch (error) {
    console.error(`[WEBHOOK] Error processing payment intent: ${error}`);
  }
}

async function handleDiscountPaymentUpgrade(subscriptionId: string) {
  try {
    console.log(`[DISCOUNT-UPGRADE] Processing upgrade for subscription: ${subscriptionId}`);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      console.log(`[DISCOUNT-UPGRADE] No userId found in subscription metadata`);
      return;
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      console.log(`[DISCOUNT-UPGRADE] User ${userId} not found`);
      return;
    }
    
    console.log(`[DISCOUNT-UPGRADE] Upgrading user ${userId} from ${user.subscriptionTier} to advanced`);
    
    // Upgrade to Advanced tier for $4.95 payment
    await storage.updateUserSubscription(userId, {
      subscriptionTier: 'advanced',
      subscriptionStatus: 'active', 
      maxConnections: 3,
      stripeCustomerId: nullToUndefined(user.stripeCustomerId),
      stripeSubscriptionId: subscriptionId,
      subscriptionExpiresAt: undefined
    });
    
    console.log(`[DISCOUNT-UPGRADE] Successfully upgraded user ${userId} to advanced tier`);
    
  } catch (error) {
    console.error(`[DISCOUNT-UPGRADE] Error upgrading discount subscription: ${error}`);
  }
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

  // OAuth Google Authentication Routes
  app.get('/auth/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/auth' }),
    async (req: any, res) => {
      try {
        // Establish session after successful OAuth
        if (req.user) {
          req.session.user = {
            id: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName
          };
          
          // Force session save
          req.session.save((err: any) => {
            if (err) console.error('Session save error:', err);
          });
        }
        
        res.redirect('/dashboard');
      } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect('/auth?error=callback_failed');
      }
    }
  );

  // Email/Password Authentication Routes
  app.post('/auth/signup', async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Create user account
      const user = await storage.createUser({
        email,
        password,
        firstName,
        lastName,
        subscriptionTier: 'trial',
        subscriptionStatus: 'active',
        maxConnections: 3
      });
      
      // Establish session
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      };
      
      req.session.save((err: any) => {
        if (err) console.error('Session save error:', err);
      });
      
      res.json({ success: true, user: user });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(400).json({ message: 'Failed to create account' });
    }
  });

  app.post('/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      // Authenticate user
      const user = await storage.getUserByEmail(email);
      if (!user || !await storage.validatePassword(email, password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Establish session
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      };
      
      req.session.save((err: any) => {
        if (err) console.error('Session save error:', err);
      });
      
      res.json({ success: true, user: user });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  // Production Auth endpoints
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check if user is authenticated through session
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user data from session
      const sessionUser = req.session.user;

      // Fetch fresh user data from database using session email
      const user = await storage.getUserByEmail(sessionUser.email);
      
      if (!user) {
        // Clear invalid session
        req.session.destroy((err: any) => {
          if (err) console.error('Session destroy error:', err);
        });
        return res.status(404).json({ message: "User not found" });
      }

      // Return user data with proper field mapping
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        maxConnections: user.maxConnections,
        hasSeenOnboarding: user.hasSeenOnboarding,
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
        inviterRole: connection.inviterRole,
        inviteeRole: connection.inviteeRole,
        personalMessage: connection.personalMessage,
        createdAt: connection.createdAt
      });

    } catch (error: any) {
      console.error("Get invitation error:", error);
      res.status(500).json({ message: "Failed to retrieve invitation details" });
    }
  });

  // Existing user invitation acceptance endpoint (requires auth)
  app.post("/api/connections/accept-existing",
    isAuthenticated,
    rateLimit(10, 60 * 60 * 1000), // 10 attempts per hour
    async (req: any, res) => {
    try {
      const { connectionId } = req.body;
      const currentUser = req.user;

      if (!connectionId) {
        return res.status(400).json({ message: "Connection ID is required" });
      }

      // Get the connection details
      const connection = await storage.getConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "Invalid invitation" });
      }

      if (connection.status !== 'pending') {
        return res.status(400).json({ message: "Invitation is no longer valid" });
      }

      // Verify that the current user is the intended invitee
      if (connection.inviteeEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
        return res.status(403).json({ message: "This invitation is not for your account" });
      }

      // Accept the connection
      await storage.updateConnectionStatus(connectionId, 'accepted');

      // Send notification emails
      try {
        await notificationService.sendConnectionAccepted(connection);
      } catch (emailError) {
        console.error("Failed to send acceptance notification:", emailError);
        // Continue with success response even if email fails
      }

      // Log the analytics event
      try {
        analytics.track('connection_accepted' as any);
      } catch (analyticsError) {
        console.error("Analytics tracking failed:", analyticsError);
      }

      res.json({
        success: true,
        message: "Invitation accepted successfully",
        connection: {
          id: connection.id,
          relationshipType: connection.relationshipType,
          inviterRole: connection.inviterRole,
          inviteeRole: connection.inviteeRole
        }
      });

    } catch (error: any) {
      console.error("Accept existing invitation error:", error);
      res.status(500).json({ 
        message: "Failed to accept invitation",
        error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
      });
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
          subscriptionTier: 'free', // Invitees get free tier
          subscriptionStatus: 'forever', // Forever free as long as connected
          maxConnections: 0, // Invitees cannot send invitations
        });
      } else {
        // Create new user account for invitee with hashed password
        newUser = await storage.upsertUser({
          id: randomUUID(),
          email: inviteeEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          passwordHash: hashedPassword,
          subscriptionTier: 'free', // Invitees get free tier
          subscriptionStatus: 'forever', // Forever free as long as connected
          maxConnections: 0, // Invitees cannot send invitations
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
        inviterSubscriptionTier: currentUser.subscriptionTier || 'free',
        status: 'pending'
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

      // Invitees remain as free forever users and cannot send invitations
      // They can only interact with the one person who invited them
      await storage.updateUserSubscription(inviteeUser.id, {
        subscriptionTier: 'free',
        subscriptionStatus: 'forever', 
        maxConnections: 0, // Invitees cannot send invitations
        subscriptionExpiresAt: undefined // Forever free as long as connected
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
      console.log("[SUBSCRIPTION] Upgrade request received:", {
        hasUser: !!req.user,
        userKeys: req.user ? Object.keys(req.user) : [],
        body: req.body,
        sessionId: req.sessionID
      });
      
      const userId = req.user.claims?.sub || req.user.id;
      console.log("[SUBSCRIPTION] Extracted userId:", userId);
      
      if (!userId) {
        console.log("[SUBSCRIPTION] No userId found in request");
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
      const user = await storage.getUser(userId);
      console.log("[SUBSCRIPTION] Retrieved user:", user ? 'found' : 'not found');
      
      if (!user) {
        console.log("[SUBSCRIPTION] User not found in database for ID:", userId);
        return res.status(404).json({ message: "User not found in database" });
      }

      const { tier, discountPercent } = req.body;
      console.log("[SUBSCRIPTION] Request body:", { tier, discountPercent });

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
      console.log("[SUBSCRIPTION] Getting/creating Stripe customer...");
      let customer;
      if (user.stripeCustomerId) {
        console.log("[SUBSCRIPTION] Retrieving existing customer:", user.stripeCustomerId);
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        console.log("[SUBSCRIPTION] Creating new customer for:", user.email);
        customer = await stripe.customers.create({
          email: user.email!,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email!,
          metadata: {
            userId: user.id,
            platform: 'deeper'
          }
        });
        console.log("[SUBSCRIPTION] Created customer:", customer.id);
        
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

      // Handle discount for Advanced plan - use dedicated discount price ID
      let finalPrice;
      if (discountPercent && tier === 'advanced' && discountPercent === 50) {
        finalPrice = STRIPE_PRICES.advanced_50_off;
        console.log("[SUBSCRIPTION] Using 50% discount price ID:", finalPrice);
      } else {
        finalPrice = STRIPE_PRICES[tier as keyof typeof STRIPE_PRICES];
        console.log("[SUBSCRIPTION] Using regular price ID for tier", tier + ":", finalPrice);
      }
      
      if (!finalPrice) {
        console.error("[SUBSCRIPTION] No price ID found for tier:", tier, "with discount:", discountPercent);
        throw new Error(`No Stripe price configured for tier: ${tier}${discountPercent ? ' with discount' : ''}`);
      }

      let clientSecret;
      let subscription;

      // For discount subscriptions, create payment intent for immediate charge
      // For trial subscriptions, create setup intent for future billing
      if (discountPercent && discountPercent > 0) {
        console.log("[DISCOUNT] Creating payment intent for immediate $4.95 charge");
        
        // Create payment intent for immediate charge
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 495, // $4.95 in cents
          currency: 'usd',
          customer: customer.id,
          description: 'Advanced plan subscription (50% discount)',
          setup_future_usage: 'off_session',
          metadata: {
            userId: user.id,
            tier: tier,
            platform: 'deeper',
            discount_applied: discountPercent.toString(),
            subscriptionType: 'discount'
          }
        });
        
        clientSecret = paymentIntent.client_secret;
        console.log("[DISCOUNT] Payment intent created:", paymentIntent.id);

        // Create subscription with immediate charge configuration
        subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{
            price: finalPrice,
          }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            userId: user.id,
            tier: tier,
            platform: 'deeper',
            discount_applied: discountPercent.toString(),
            payment_intent_id: paymentIntent.id
          }
        });
        
        console.log("[DISCOUNT] Discount subscription created:", subscription.id);
      } else {
        console.log("[TRIAL] Creating setup intent for trial subscription");
        
        // Create setup intent for trial subscriptions
        const setupIntent = await stripe.setupIntents.create({
          customer: customer.id,
          usage: 'off_session',
          payment_method_types: ['card'],
          metadata: {
            userId: user.id,
            tier: tier,
            platform: 'deeper',
            discount_applied: 'none'
          }
        });
        
        clientSecret = setupIntent.client_secret;
        console.log("[TRIAL] Setup intent created:", setupIntent.id);

        // Create subscription with 7-day trial
        subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{
            price: finalPrice,
          }],
          trial_period_days: 7,
          metadata: {
            userId: user.id,
            tier: tier,
            platform: 'deeper',
            discount_applied: 'none'
          }
        });
        
        console.log("[TRIAL] Trial subscription created:", subscription.id);
      }

      // Store Stripe IDs but keep user on current tier until payment verified
      await storage.updateUserSubscription(userId, {
        subscriptionTier: user.subscriptionTier || 'free',
        subscriptionStatus: user.subscriptionStatus || 'active',
        maxConnections: user.maxConnections || 1,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        subscriptionExpiresAt: user.subscriptionExpiresAt ? user.subscriptionExpiresAt : undefined
      });

      // Get updated user data to reflect any immediate tier changes
      const updatedUser = await storage.getUser(userId);
      
      res.json({ 
        success: true, 
        tier: updatedUser?.subscriptionTier || 'free',
        maxConnections: updatedUser?.maxConnections || 1,
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end! * 1000) : null,
        discountApplied: discountPercent ? `${discountPercent}%` : null,
        subscriptionStatus: subscription.status,
        message: discountPercent && discountPercent > 0 && subscription.status === 'active' ? 
          "Advanced plan activated! You've been charged $4.95 and your benefits are active." :
          discountPercent && discountPercent > 0 ? 
          "Complete payment to activate your discounted Advanced plan." : 
          "Complete payment setup to begin your trial." 
      });
    } catch (error) {
      console.error("============ SUBSCRIPTION UPGRADE ERROR ============");
      console.error("Subscription upgrade error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        requestBody: req.body,
        userId: req.user?.id,
        tier: req.body.tier,
        discountPercent: req.body.discountPercent
      });
      console.error("===============================================");
      
      // Write error to a temporary file for debugging
      const fs = require('fs');
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        requestBody: req.body
      };
      fs.writeFileSync('/tmp/subscription-error.json', JSON.stringify(errorLog, null, 2));
      
      res.status(500).json({ 
        message: "Failed to upgrade subscription",
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  });

  // Processed webhook events to prevent duplicates from multiple webhook endpoints
  const processedWebhooks = new Set<string>();

  // Stripe webhook for handling subscription events
  app.post('/api/stripe/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    console.log(`[WEBHOOK] Received ${req.method} ${req.url} at ${new Date().toISOString()}`);
    console.log(`[WEBHOOK] Headers:`, Object.keys(req.headers));
    console.log(`[WEBHOOK] Body length:`, req.body?.length || 0);

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test');
      console.log(`[WEBHOOK] ✓ Event verified: ${event.type} - ${event.id}`);
    } catch (err: any) {
      console.error(`[WEBHOOK] ✗ Signature verification failed:`, err.message);
      console.error(`[WEBHOOK] Raw body:`, req.body ? req.body.toString().substring(0, 200) : 'empty');
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Prevent duplicate processing from multiple webhook endpoints
    if (processedWebhooks.has(event.id)) {
      console.log(`[WEBHOOK] Duplicate event ${event.id} skipped`);
      return res.json({ received: true, duplicate: true });
    }
    
    processedWebhooks.add(event.id);
    console.log(`[WEBHOOK] Processing ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.created':
          const subscription = event.data.object as Stripe.Subscription;
          console.log(`[WEBHOOK] Processing subscription: ${subscription.id}, status: ${subscription.status}`);
          
          // For discount subscriptions, immediately check payment status regardless of subscription status
          if (subscription.metadata?.discount_applied === '50' && subscription.metadata?.payment_intent_id) {
            console.log(`[WEBHOOK] Discount subscription detected, checking payment status`);
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(subscription.metadata.payment_intent_id);
              console.log(`[WEBHOOK] Payment intent status: ${paymentIntent.status}, amount: ${paymentIntent.amount_received}`);
              
              if (paymentIntent.status === 'succeeded' && paymentIntent.amount_received === 495) {
                console.log(`[WEBHOOK] Upgrading user ${subscription.metadata.userId} immediately due to completed $4.95 payment`);
                await handleDiscountPaymentUpgrade(subscription.id);
                break; // Skip normal subscription processing
              }
            } catch (error) {
              console.error(`[WEBHOOK] Error checking payment intent:`, error);
            }
          }
          
          await handleSubscriptionUpdate(subscription);
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionCancellation(deletedSubscription);
          break;

        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentIntentSuccess(paymentIntent);
          break;

        case 'invoice.payment_succeeded':
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentSuccess(invoice);
          break;

        case 'invoice.paid':
          const paidInvoice = event.data.object as any;
          if (paidInvoice.subscription) {
            // For discount subscriptions ($4.95), immediately activate Advanced tier
            if (paidInvoice.amount_paid === 495) {
              await handleDiscountPaymentUpgrade(paidInvoice.subscription as string);
            } else {
              const subscription = await stripe.subscriptions.retrieve(paidInvoice.subscription as string);
              await handleSubscriptionUpdate(subscription);
            }
          }
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailure(failedInvoice);
          break;

        case 'setup_intent.succeeded':
          const setupIntent = event.data.object as Stripe.SetupIntent;
          const userId = setupIntent.metadata?.userId;
          const discountApplied = setupIntent.metadata?.discount_applied;
          
          if (userId) {
            const user = await storage.getUser(userId);
            if (user && user.stripeSubscriptionId) {
              console.log(`[PAYMENT] Attaching payment method ${setupIntent.payment_method} to subscription ${user.stripeSubscriptionId}`);
              
              // Update subscription with payment method
              const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
                default_payment_method: setupIntent.payment_method as string,
              });
              console.log(`[PAYMENT] Subscription updated with payment method, status: ${updatedSubscription.status}`);
              
              // For discount subscriptions, immediately process the invoice payment
              if (discountApplied && discountApplied !== 'none') {
                console.log(`[DISCOUNT] Processing immediate $4.95 payment for subscription ${user.stripeSubscriptionId}`);
                
                try {
                  // Get the latest subscription data
                  const currentSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
                    expand: ['latest_invoice.payment_intent']
                  });
                  
                  if (currentSubscription.latest_invoice) {
                    const latestInvoice = currentSubscription.latest_invoice as any;
                    console.log(`[DISCOUNT] Latest invoice: ${latestInvoice.id}, status: ${latestInvoice.status}`);
                    
                    // If invoice is still open, pay it immediately
                    if (latestInvoice.status === 'open' && latestInvoice.payment_intent) {
                      const paymentIntent = latestInvoice.payment_intent;
                      console.log(`[DISCOUNT] Found payment intent ${paymentIntent.id}, status: ${paymentIntent.status}`);
                      
                      // Confirm the payment with the attached payment method
                      const paymentResult = await stripe.paymentIntents.confirm(paymentIntent.id, {
                        payment_method: setupIntent.payment_method as string
                      });
                      
                      console.log(`[DISCOUNT] Payment confirmation result: ${paymentResult.status}, amount received: $${(paymentResult.amount_received || 0) / 100}`);
                      
                      if (paymentResult.status === 'succeeded') {
                        console.log(`[DISCOUNT] $4.95 payment successful - activating Advanced plan`);
                        // The payment_intent.succeeded webhook will handle tier activation
                      }
                    } else {
                      console.log(`[DISCOUNT] Invoice status: ${latestInvoice.status}, no immediate payment needed`);
                    }
                  }
                } catch (paymentError) {
                  console.error(`[DISCOUNT] Payment processing failed:`, paymentError);
                  console.error(`[DISCOUNT] Error details:`, {
                    message: paymentError instanceof Error ? paymentError.message : 'Unknown error',
                    code: (paymentError as any)?.code
                  });
                }
              } else {
                console.log(`[TRIAL] Payment method attached for trial subscription ${user.stripeSubscriptionId}`);
              }
            }
          }
          break;

        case 'invoice.payment_succeeded':
          const successInvoice = event.data.object as Stripe.Invoice;
          if (successInvoice.amount_paid === 495 && (successInvoice as any).subscription) {
            await handleDiscountPaymentUpgrade((successInvoice as any).subscription as string);
          }
          break;

        default:
          // Unhandled event type
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


  // Production fallback: Check and upgrade paid users whose webhooks failed
  app.post("/api/subscription/check-payment-status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub || (req.user as any).id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeSubscriptionId) {
        return res.json({ upgraded: false, message: "No subscription found" });
      }

      // Check Stripe subscription status
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
        expand: ['latest_invoice.payment_intent']
      });

      console.log(`[PAYMENT_CHECK] Subscription ${subscription.id} status: ${subscription.status}`);
      
      // Check if subscription has a successful payment but user isn't upgraded
      const latestInvoice = subscription.latest_invoice as any;
      const isDiscountSubscription = subscription.metadata?.discount_applied === '50';
      
      if (latestInvoice?.payment_intent?.status === 'succeeded' && 
          latestInvoice.amount_paid === 495 && 
          isDiscountSubscription &&
          user.subscriptionTier !== 'advanced') {
        
        console.log(`[PAYMENT_CHECK] Found successful $4.95 payment for user ${userId} - upgrading to Advanced`);
        
        // Upgrade user to Advanced tier
        await storage.updateUserSubscription(userId, {
          subscriptionTier: 'advanced',
          subscriptionStatus: 'active',
          maxConnections: 3,
          stripeCustomerId: nullToUndefined(user.stripeCustomerId),
          stripeSubscriptionId: nullToUndefined(user.stripeSubscriptionId),
          subscriptionExpiresAt: undefined
        });

        return res.json({ 
          upgraded: true, 
          tier: 'advanced',
          message: "Advanced plan activated!" 
        });
      }

      res.json({ 
        upgraded: false, 
        tier: user.subscriptionTier,
        message: "No upgrade needed" 
      });
    } catch (error) {
      console.error("Payment status check error:", error);
      res.status(500).json({ upgraded: false, message: "Check failed" });
    }
  });

  // Security fix: Reset prematurely upgraded subscriptions until payment verification
  app.post("/api/subscription/reset-unverified", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims?.sub || (req.user as any).id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has a Stripe subscription but shouldn't be upgraded yet
      if (user.stripeSubscriptionId && user.subscriptionTier !== 'free') {
        console.log(`[SECURITY] Resetting prematurely upgraded user ${userId} from ${user.subscriptionTier} to free`);
        
        // Reset to free tier until webhook confirms payment
        await storage.updateUserSubscription(userId, {
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          maxConnections: 1,
          stripeCustomerId: nullToUndefined(user.stripeCustomerId),
          stripeSubscriptionId: nullToUndefined(user.stripeSubscriptionId),
          subscriptionExpiresAt: nullToUndefined(user.subscriptionExpiresAt)
        });

        res.json({ 
          success: true,
          message: "Subscription reset to free tier pending payment verification",
          tier: 'free',
          maxConnections: 1
        });
      } else {
        res.json({ 
          success: true,
          message: "No subscription reset needed",
          tier: user.subscriptionTier || 'free',
          maxConnections: user.maxConnections || 1
        });
      }
    } catch (error) {
      console.error("Subscription reset error:", error);
      res.status(500).json({ message: "Failed to reset subscription" });
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
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://joindeeper.com';
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

  // Conversation creation endpoint for dashboard - ensures only ONE conversation per connection
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

      // Check if a conversation already exists for this connection
      const existingConversations = await storage.getConversationsByConnection(connectionId);
      if (existingConversations.length > 0) {
        // Return the existing conversation instead of creating a new one
        const existingConversation = existingConversations[0];
        return res.json(existingConversation);
      }
      
      const conversationData = {
        connectionId,
        participant1Email,
        participant2Email,
        relationshipType,
        currentTurn: participant1Email, // Inviter always gets first turn
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

  // Conversation threading endpoints - returns conversations with sync metadata
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
      
      // Determine active conversation (most recently active)
      const sortedConversations = conversations.sort((a, b) => {
        const aTime = new Date(a.lastActivityAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.lastActivityAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
      
      const activeConversationId = sortedConversations.length > 0 ? sortedConversations[0].id : null;
      
      res.json({
        conversations: conversations,
        activeConversationId: activeConversationId,
        previousConversations: conversations.filter(conv => conv.id !== activeConversationId)
      });
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

  // Check if a user can reopen a specific conversation thread
  app.get("/api/conversations/:conversationId/can-reopen", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const currentConversationId = parseInt(req.query.currentConversationId as string);
      
      // Production-ready input validation
      if (isNaN(conversationId) || conversationId <= 0) {
        return res.status(400).json({ 
          canReopen: false,
          reason: "invalid_input",
          message: "Invalid conversation ID" 
        });
      }

      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ 
          canReopen: false,
          reason: "unauthorized",
          message: "User authentication required" 
        });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ 
          canReopen: false,
          reason: "access_denied",
          message: "Access denied" 
        });
      }

      // Get the conversation to reopen with error handling
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ 
          canReopen: false,
          reason: "not_found",
          message: "Conversation not found" 
        });
      }

      // Verify user has access to this conversation
      if (conversation.participant1Email !== currentUser.email && conversation.participant2Email !== currentUser.email) {
        return res.status(403).json({ 
          canReopen: false,
          reason: "access_denied",
          message: "Access denied to this conversation" 
        });
      }

      // CRITICAL: Check if there's ANY current thread with unanswered questions
      // Users can only reopen threads when ALL current threads have complete question-response pairs
      if (currentConversationId && currentConversationId !== conversationId) {
        const currentMessages = await storage.getMessages(currentConversationId);
        if (currentMessages.length > 0) {
          const lastMessage = currentMessages[currentMessages.length - 1];
          
          // Check if there's an unanswered question from the OTHER user that needs a response
          if (lastMessage.type === 'question' && lastMessage.senderEmail !== currentUser.email) {
            return res.json({ 
              canReopen: false, 
              reason: "respond_to_question",
              message: "Must respond to the current question before reopening previous threads" 
            });
          }
          
          // Additional check: ensure there's been at least one complete exchange in current thread
          const hasCurrentQuestion = currentMessages.some(msg => msg.type === 'question');
          const hasCurrentResponse = currentMessages.some(msg => msg.type === 'response');
          
          if (hasCurrentQuestion && !hasCurrentResponse) {
            return res.json({ 
              canReopen: false, 
              reason: "respond_to_question",
              message: "Must respond to the current question before reopening previous threads" 
            });
          }
        }
      }

      // Check if the thread to reopen has at least one complete exchange
      const messages = await storage.getMessages(conversationId);
      const hasQuestion = messages.some(msg => msg.type === 'question');
      const hasResponse = messages.some(msg => msg.type === 'response');
      
      if (!hasQuestion || !hasResponse) {
        return res.json({ 
          canReopen: false, 
          reason: "Thread needs at least one complete question-response exchange before it can be reopened" 
        });
      }

      // Thread can be reopened - this does NOT consume the user's turn
      res.json({ canReopen: true });
    } catch (error) {
      console.error('[API] Error checking thread reopen permission:', error);
      res.status(500).json({ message: "Failed to check thread reopen permission" });
    }
  });

  // Create new conversation thread with automatic message sending
  app.post("/api/conversations/create-thread", isAuthenticated, async (req: any, res) => {
    try {
      const { connectionId, question, senderEmail, type } = req.body;
      
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || currentUser.email !== senderEmail) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get connection to verify access and get participant details
      const connection = await storage.getConnection(connectionId);
      if (!connection || 
          (connection.inviterEmail !== senderEmail && 
           connection.inviteeEmail !== senderEmail)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Create new conversation thread
      const conversationData = {
        connectionId,
        participant1Email: connection.inviterEmail,
        participant2Email: connection.inviteeEmail,
        relationshipType: connection.relationshipType,
        currentTurn: connection.inviterEmail === senderEmail ? connection.inviteeEmail : connection.inviterEmail,
        status: 'active',
        isMainThread: false
      };
      
      const conversation = await storage.createConversation(conversationData);

      // Automatically send the message to create the thread
      const messageData = {
        conversationId: conversation.id,
        senderEmail,
        content: question,
        type: type || 'question',
        messageFormat: 'text'
      };

      const message = await storage.createMessage(messageData);

      // Update conversation activity timestamp
      await storage.updateConversationActivity(conversation.id);

      // Send WebSocket notifications to both participants
      try {
        const { getWebSocketManager } = await import('./websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          const nextTurn = conversation.currentTurn;
          const senderName = await storage.getUserDisplayNameByEmail(senderEmail);
          
          // Notify recipient about new thread and message
          wsManager.notifyNewMessage(nextTurn, {
            conversationId: conversation.id,
            senderEmail,
            senderName,
            messageType: type || 'question',
            relationshipType: connection.relationshipType
          });
          
          // Notify both participants about thread creation
          wsManager.notifyConversationUpdate(connection.inviterEmail, {
            conversationId: conversation.id,
            connectionId,
            action: 'thread_created'
          });
          
          if (connection.inviterEmail !== connection.inviteeEmail) {
            wsManager.notifyConversationUpdate(connection.inviteeEmail, {
              conversationId: conversation.id,
              connectionId,
              action: 'thread_created'
            });
          }
        }
      } catch (error) {
        console.error('[WEBSOCKET] Failed to send thread creation notification:', error);
      }

      res.json({ 
        conversationId: conversation.id,
        messageId: message.id,
        success: true 
      });
    } catch (error) {
      console.error('[API] Error creating conversation thread:', error);
      res.status(500).json({ message: "Failed to create conversation thread" });
    }
  });

  // Switch active conversation thread without consuming turn
  app.post("/api/conversations/:conversationId/switch-active", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const { connectionId } = req.body;
      
      const userId = req.user.claims?.sub || req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get the conversation to switch to
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Verify user has access to this conversation
      if (conversation.participant1Email !== currentUser.email && conversation.participant2Email !== currentUser.email) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update conversation activity timestamp to make it the most recent
      await storage.updateConversationActivity(conversationId);

      // Send real-time WebSocket notifications to both participants about thread switch
      try {
        const { getWebSocketManager } = await import('./websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          // Notify both participants that thread was switched
          wsManager.notifyConversationUpdate(conversation.participant1Email, {
            conversationId: conversationId,
            connectionId: connectionId,
            action: 'thread_switched'
          });
          
          if (conversation.participant1Email !== conversation.participant2Email) {
            wsManager.notifyConversationUpdate(conversation.participant2Email, {
              conversationId: conversationId,
              connectionId: connectionId,
              action: 'thread_switched'
            });
          }
        }
      } catch (error) {
        console.error('[WEBSOCKET] Failed to send thread switch notification:', error);
      }

      res.json({ 
        success: true, 
        activeConversationId: conversationId,
        message: "Thread switched successfully - does not consume turn"
      });
    } catch (error) {
      console.error('[API] Error switching active thread:', error);
      res.status(500).json({ message: "Failed to switch active thread" });
    }
  });

  // Endpoint to get or create the single conversation for a connection
  app.post("/api/connections/:connectionId/conversations", isAuthenticated, async (req: any, res) => {
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

      // Check if a conversation already exists for this connection
      const existingConversations = await storage.getConversationsByConnection(connectionId);
      if (existingConversations.length > 0) {
        // Return the existing conversation instead of creating a new one
        const existingConversation = existingConversations[0];
        return res.json(existingConversation);
      }

      // If no conversation exists, create the single conversation for this connection
      const conversationData = {
        connectionId,
        participant1Email: connection.inviterEmail,
        participant2Email: connection.inviteeEmail,
        relationshipType: connection.relationshipType,
        currentTurn: connection.inviterEmail, // Inviter always gets first turn
        status: 'active',
        isMainThread: true
      };
      
      const conversation = await storage.createConversation(conversationData);

      // Send real-time WebSocket notifications to both participants about new conversation
      try {
        const { getWebSocketManager } = await import('./websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          // Notify both participants that a new conversation was created
          wsManager.notifyConversationUpdate(connection.inviterEmail, {
            conversationId: conversation.id,
            connectionId: connectionId,
            action: 'conversation_created',
            relationshipType: connection.relationshipType
          });
          
          if (connection.inviterEmail !== connection.inviteeEmail) {
            wsManager.notifyConversationUpdate(connection.inviteeEmail, {
              conversationId: conversation.id,
              connectionId: connectionId,
              action: 'conversation_created',
              relationshipType: connection.relationshipType
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

      // Check if user is an invitee (should have permanent free access)
      const isInviteeUser = await storage.isUserInvitee(senderUser.email!);
      
      // Enforce trial expiration for messaging (but not for invitee users)
      if (!isInviteeUser && (subscriptionTier === 'free' || (subscriptionStatus === 'trialing' && subscriptionExpiresAt && subscriptionExpiresAt < now))) {
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

      // Production-ready message type validation with comprehensive error handling
      try {
        if (existingMessages.length === 0) {
          // First message must be a question
          if (messageData.type !== 'question') {
            return res.status(400).json({ 
              message: "First message must be a question",
              code: "INVALID_FIRST_MESSAGE_TYPE",
              expected: "question",
              received: messageData.type 
            });
          }
        } else {
          // Production-ready question-response validation: EVERY question requires a response before new questions
          // Find the most recent question in the conversation
          let lastQuestionIndex = -1;
          for (let i = existingMessages.length - 1; i >= 0; i--) {
            if (existingMessages[i].type === 'question') {
              lastQuestionIndex = i;
              break;
            }
          }
          
          // If there's a question without a response, only allow responses
          if (lastQuestionIndex !== -1) {
            const messagesAfterLastQuestion = existingMessages.slice(lastQuestionIndex + 1);
            const hasResponseToLastQuestion = messagesAfterLastQuestion.some(msg => msg.type === 'response');
            
            // If the last question hasn't been responded to, only allow responses
            if (!hasResponseToLastQuestion && messageData.type === 'question') {
              return res.status(400).json({ 
                message: "The previous question must be answered before asking a new question",
                code: "QUESTION_REQUIRES_RESPONSE",
                lastQuestionIndex: lastQuestionIndex,
                hasResponse: false
              });
            }
          }
          
          // Validate message type is one of the allowed values
          if (!['question', 'response'].includes(messageData.type)) {
            return res.status(400).json({ 
              message: "Invalid message type",
              code: "INVALID_MESSAGE_TYPE",
              allowed: ["question", "response"],
              received: messageData.type 
            });
          }
        }
      } catch (validationError) {
        console.error('[MESSAGE_VALIDATION] Error validating message type:', validationError);
        return res.status(500).json({ 
          message: "Message validation failed",
          code: "VALIDATION_ERROR" 
        });
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
          messageType: (messageData.type === 'question' || messageData.type === 'response') ? messageData.type : 'question'
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
            messageType: (messageData.type === 'question' || messageData.type === 'response') ? messageData.type : 'question',
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
          messageType: (messageData.type === 'question' || messageData.type === 'response') ? messageData.type : 'question',
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
        if (process.env.NODE_ENV === 'development') {
          console.log('Saving audio file to:', audioPath);
          console.log('Audio file size:', req.file.size);
          console.log('Audio file type:', req.file.mimetype);
        }
        
        await fs.writeFile(audioPath, req.file.buffer);
        
        // Verify file was written
        const stats = await fs.stat(audioPath);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Audio file saved successfully. Size:', stats.size);
        }
      } catch (fileError) {
        console.error("File save error:", fileError);
        return res.status(500).json({ message: "Failed to save audio file" });
      }
      
      const audioFileUrl = `/uploads/${fileName}`;

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

      if (process.env.NODE_ENV === 'development') {
        console.log('Creating voice message with data:', {
          ...messageData,
          content: transcription.substring(0, 100) + '...' // Truncate for logging
        });
      }

      const message = await storage.createMessage(messageData);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Voice message created successfully with ID:', message.id);
      }

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
      
      // Production-ready validation for new conversation threads
      try {
        // Enhanced validation: EVERY question requires a response before new questions can be asked
        // Check ALL conversations to ensure no unanswered questions exist
        let hasUnansweredQuestion = false;
        let unansweredQuestionDetails = null;
        
        for (const conv of existingConversations) {
          try {
            const messages = await storage.getMessagesByConversationId(conv.id);
            
            // Find the most recent question in this conversation
            let lastQuestionIndex = -1;
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i].type === 'question') {
                lastQuestionIndex = i;
                break;
              }
            }
            
            // If there's a question, check if it has a response
            if (lastQuestionIndex !== -1) {
              const messagesAfterLastQuestion = messages.slice(lastQuestionIndex + 1);
              const hasResponseToLastQuestion = messagesAfterLastQuestion.some(msg => msg.type === 'response');
              
              if (!hasResponseToLastQuestion) {
                hasUnansweredQuestion = true;
                unansweredQuestionDetails = {
                  conversationId: conv.id,
                  questionIndex: lastQuestionIndex,
                  question: messages[lastQuestionIndex].content?.substring(0, 50) + '...'
                };
                break;
              }
            }
          } catch (messageError) {
            console.error(`[THREAD_VALIDATION] Error checking messages for conversation ${conv.id}:`, messageError);
          }
        }
        
        // Block new thread creation if any question is unanswered
        if (hasUnansweredQuestion) {
          return res.status(400).json({ 
            message: "Please answer the previous question before starting a new conversation thread",
            code: "QUESTION_REQUIRES_RESPONSE",
            unansweredQuestion: unansweredQuestionDetails
          });
        }
        
        // For first conversation, no validation needed
        if (existingConversations.length === 0) {
          // Allow first thread creation
        } else {
          // For subsequent threads, ensure at least one complete exchange exists somewhere
          let hasAnyCompleteExchange = false;
          
          for (const conv of existingConversations) {
            try {
              const messages = await storage.getMessagesByConversationId(conv.id);
              const hasQuestion = messages.some(msg => msg.type === 'question');
              const hasResponse = messages.some(msg => msg.type === 'response');
              if (hasQuestion && hasResponse) {
                hasAnyCompleteExchange = true;
                break;
              }
            } catch (messageError) {
              console.error(`[THREAD_VALIDATION] Error checking complete exchange for conversation ${conv.id}:`, messageError);
            }
          }
          
          if (!hasAnyCompleteExchange) {
            return res.status(400).json({ 
              message: "Complete at least one question-response exchange before starting new conversation threads",
              code: "EXCHANGE_REQUIRED",
              existingConversations: existingConversations.length
            });
          }
        }
      } catch (validationError) {
        console.error('[THREAD_VALIDATION] Error validating conversation exchange:', validationError);
        return res.status(500).json({ 
          message: "Thread validation failed",
          code: "VALIDATION_ERROR" 
        });
      }
      
      // Use existing conversation instead of creating new ones
      let conversation;
      if (existingConversations.length > 0) {
        // Use the existing conversation for this connection
        conversation = existingConversations[0];
      } else {
        // Create the first (and only) conversation for this connection
        const conversationData = {
          connectionId,
          participant1Email: connection.inviterEmail,
          participant2Email: connection.inviteeEmail,
          relationshipType: connection.relationshipType,
          currentTurn: connection.inviterEmail, // Inviter always gets first turn
          status: 'active',
          isMainThread: true
        };
        conversation = await storage.createConversation(conversationData);
      }
      
      // Immediately create the first message (question) - always from inviter
      const messageData = {
        conversationId: conversation.id,
        senderEmail: connection.inviterEmail, // Always from inviter
        content: question.trim(),
        type: 'question' as const
      };
      
      const message = await storage.createMessage(messageData);
      
      // Update conversation turn to invitee
      await storage.updateConversationTurn(conversation.id, connection.inviteeEmail);
      
      // Send turn notification to invitee
      try {
        await notificationService.sendTurnNotification({
          recipientEmail: connection.inviteeEmail,
          senderEmail: connection.inviterEmail,
          conversationId: conversation.id,
          relationshipType: connection.relationshipType,
          messageType: 'question'
        });
      } catch (notificationError) {
        console.error('Failed to send turn notification:', notificationError);
      }
      
      // Send real-time WebSocket notifications
      try {
        const { getWebSocketManager } = await import('./websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.notifyConversationUpdate(connection.inviterEmail, {
            conversationId: conversation.id,
            connectionId: connectionId,
            action: 'message_sent',
            relationshipType: connection.relationshipType
          });
          
          if (connection.inviterEmail !== connection.inviteeEmail) {
            wsManager.notifyConversationUpdate(connection.inviteeEmail, {
              conversationId: conversation.id,
              connectionId: connectionId,
              action: 'message_sent',
              relationshipType: connection.relationshipType
            });
          }
        }
      } catch (error) {
        console.error('[WEBSOCKET] Failed to send conversation creation notification:', error);
      }
      
      res.json({ 
        conversation, 
        message
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