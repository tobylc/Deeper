import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as AppleStrategy } from "passport-apple";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

console.log(`[AUTH] Setting up OAuth authentication providers`);

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
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

async function upsertUser(profile: any, provider: string) {
  return await storage.upsertUser({
    id: `${provider}_${profile.id}`,
    email: profile.emails?.[0]?.value || `${provider}_${profile.id}@${provider}.com`,
    firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
    lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
    profileImageUrl: profile.photos?.[0]?.value || null,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await upsertUser(profile, 'google');
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));

    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
    app.get("/api/auth/google/callback", 
      passport.authenticate("google", { failureRedirect: "/?error=auth_failed" }),
      (req, res) => res.redirect("/dashboard")
    );
  }

  // Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/auth/facebook/callback",
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

  // Apple OAuth Strategy
  if (process.env.APPLE_SERVICE_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_SERVICE_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY,
      callbackURL: "/api/auth/apple/callback"
    }, async (accessToken, refreshToken, idToken, profile, done) => {
      try {
        const user = await upsertUser(profile, 'apple');
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));

    app.get("/api/auth/apple", passport.authenticate("apple"));
    app.get("/api/auth/apple/callback",
      passport.authenticate("apple", { failureRedirect: "/?error=auth_failed" }),
      (req, res) => res.redirect("/dashboard")
    );
  }

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

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

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
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};