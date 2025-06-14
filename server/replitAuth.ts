import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import type { User } from "@shared/schema";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

console.log(`[DEBUG] Setting up simple authentication system`);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(user: any, userData: any) {
  user.claims = userData;
  user.access_token = "mock_token";
  user.refresh_token = "mock_refresh";
  user.expires_at = Math.floor(Date.now() / 1000) + 3600;
}

async function upsertUser(userData: any) {
  return await storage.upsertUser({
    id: userData.sub || userData.id || "demo_user",
    email: userData.email || "demo@example.com",
    firstName: userData.first_name || userData.given_name || "Demo",
    lastName: userData.last_name || userData.family_name || "User",
    profileImageUrl: userData.profile_image_url || userData.picture || null,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Simple demo authentication strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email: string, password: string, done: any) => {
      try {
        // Demo login - accept any email/password for development
        const userData = {
          sub: "demo_user_" + Date.now(),
          email: email,
          first_name: "Demo",
          last_name: "User",
          profile_image_url: null
        };
        
        const user = await upsertUser(userData);
        updateUserSession(user, userData);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Demo login endpoints for each provider
  app.get("/api/login", (req, res) => {
    const provider = req.query.provider as string;
    console.log(`[DEBUG] Login attempt with provider: ${provider || 'default'}`);
    
    // For demo purposes, create a mock user based on provider
    const mockUserData = {
      sub: `demo_${provider || 'email'}_user_${Date.now()}`,
      email: `demo.${provider || 'email'}@example.com`,
      first_name: "Demo",
      last_name: `${provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Email'} User`,
      profile_image_url: null
    };

    // Simulate OAuth flow completion
    req.login(mockUserData, async (err) => {
      if (err) {
        console.error('[ERROR] Login failed:', err);
        return res.status(500).json({ error: 'Login failed' });
      }
      
      try {
        const user = await upsertUser(mockUserData);
        updateUserSession(req.user, mockUserData);
        console.log(`[DEBUG] Demo user logged in successfully`);
        res.redirect('/');
      } catch (error) {
        console.error('[ERROR] User creation failed:', error);
        res.status(500).json({ error: 'User creation failed' });
      }
    });
  });

  app.get("/api/callback", (req, res) => {
    res.redirect("/");
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // For demo purposes, always allow authenticated users
  return next();
};