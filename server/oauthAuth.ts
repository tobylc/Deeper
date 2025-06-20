import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as AppleStrategy } from "passport-apple";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import MemoryStore from "memorystore";
import { storage } from "./storage";

console.log(`[AUTH] Setting up OAuth authentication providers`);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use memory store for session stability
  const MemoryStoreSession = MemoryStore(session);
  const sessionStore = new MemoryStoreSession({
    checkPeriod: 86400000, // prune expired entries every 24h
    ttl: sessionTtl,
    max: 10000, // Maximum number of sessions
  });

  console.log('[SESSION] OAuth using memory store for stability');

  return session({
    secret: process.env.SESSION_SECRET || 'default-secret-key-for-dev',
    store: sessionStore,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    rolling: true, // Reset expiry on activity
    cookie: {
      httpOnly: true,
      secure: false, // Disable for development
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
    name: 'connect.sid', // Standard session name
  });
}

async function upsertUser(profile: any, provider: string) {
  const email = profile.emails?.[0]?.value;
  
  if (provider === 'google' && email) {
    // Check if user with this email already exists (email-based account)
    const existingUser = await storage.getUserByEmail(email);
    
    if (existingUser && !existingUser.googleId) {
      // Link Google account to existing email-based account
      const linkedUser = await storage.linkGoogleAccount(existingUser.id, profile.id);
      if (linkedUser) {
        // Update profile information from Google if available
        return await storage.upsertUser({
          id: existingUser.id,
          email: email,
          firstName: profile.name?.givenName || existingUser.firstName,
          lastName: profile.name?.familyName || existingUser.lastName,
          profileImageUrl: profile.photos?.[0]?.value || existingUser.profileImageUrl,
          googleId: profile.id,
        });
      }
    } else if (existingUser && existingUser.googleId === profile.id) {
      // User already linked, just return existing user
      return existingUser;
    }
  }
  
  // Standard OAuth user creation/update
  return await storage.upsertUser({
    id: `${provider}_${profile.id}`,
    email: email || `${provider}_${profile.id}@${provider}.com`,
    firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
    lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
    profileImageUrl: profile.photos?.[0]?.value || null,
    googleId: provider === 'google' ? profile.id : undefined,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Always use production URL for OAuth callbacks since users access via replit.app
  const baseUrl = 'https://deepersocial.replit.app';

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${baseUrl}/api/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await upsertUser(profile, 'google');
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));

    app.get("/api/auth/google", (req, res, next) => {
      // Check if this is an account linking request
      const isLinking = req.query.linking === 'true';
      if (isLinking) {
        (req.session as any).isLinking = true;
      }
      passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
    });
    
    app.get("/api/auth/google/callback", 
      passport.authenticate("google", { failureRedirect: "/auth?error=auth_failed" }),
      (req, res) => {
        // Ensure session is saved before redirect
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
          }
          
          const isLinking = (req.session as any).isLinking;
          delete (req.session as any).isLinking; // Clean up session
          
          if (isLinking) {
            res.redirect("/dashboard?linked=google");
          } else {
            res.redirect("/dashboard");
          }
        });
      }
    );
  }

  // Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${baseUrl}/api/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'photos', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await upsertUser(profile, 'facebook');
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));

    app.get("/api/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));
    app.get("/api/auth/facebook/callback",
      passport.authenticate("facebook", { failureRedirect: "/?error=auth_failed" }),
      (req, res) => res.redirect("/dashboard")
    );
  }

  // Apple OAuth Strategy (placeholder - requires proper certificate configuration)
  app.get("/api/auth/apple", (req, res) => {
    res.redirect("/?error=apple_not_configured");
  });

  // Email/Password Strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email: string, password: string, done: any) => {
      try {
        // For production, implement proper email/password validation
        // This is a simplified version that accepts any email/password
        const user = await storage.getUserByEmail(email);
        if (user) {
          return done(null, user);
        }
        
        // Create new user for first-time email login
        const newUser = await storage.upsertUser({
          id: `email_${Date.now()}`,
          email: email,
          firstName: email.split('@')[0],
          lastName: '',
          profileImageUrl: null,
        });
        return done(null, newUser);
      } catch (error) {
        return done(error);
      }
    }
  ));

  app.get("/api/auth/email", (req, res) => {
    // Redirect to a simple email form or handle email auth
    res.redirect("/?provider=email");
  });

  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Enhanced authentication check with session validation
  const isAuth = req.isAuthenticated && req.isAuthenticated();
  const hasUser = !!req.user;
  const hasSession = !!req.session && !!req.sessionID;
  
  console.log("[AUTH] Authentication check:", {
    isAuthenticated: isAuth,
    hasUser,
    hasSession,
    sessionID: req.sessionID,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });

  if (!isAuth || !hasUser || !hasSession) {
    console.log("[AUTH] Authentication failed - missing session or user data");
    return res.status(401).json({ 
      message: "Authentication required. Please refresh the page and log in again.",
      details: process.env.NODE_ENV === 'development' ? {
        isAuthenticated: isAuth,
        hasUser,
        hasSession
      } : undefined
    });
  }
  
  // Additional validation for user data integrity
  const user = req.user as any;
  const userId = user.claims?.sub || user.id;
  
  if (!userId) {
    console.log("[AUTH] Authentication failed - invalid user data");
    return res.status(401).json({ message: "Invalid session. Please log in again." });
  }
  
  console.log("[AUTH] Authentication successful for user:", userId);
  next();
};