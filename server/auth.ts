import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as AppleStrategy } from "passport-apple";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const PostgresSessionStore = connectPg(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: 'sessions',
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy for email/password authentication
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
            
            if (!user) {
              user = await storage.createUser({
                email: profile.emails?.[0]?.value || '',
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
                profileImageUrl: profile.photos?.[0]?.value || '',
                provider: 'google',
                providerId: profile.id,
              });
            }
            
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: "/api/auth/facebook/callback",
          profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
            
            if (!user) {
              user = await storage.createUser({
                email: profile.emails?.[0]?.value || '',
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
                profileImageUrl: profile.photos?.[0]?.value || '',
                provider: 'facebook',
                providerId: profile.id,
              });
            }
            
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // Apple OAuth Strategy (Note: Requires proper Apple Developer setup)
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID) {
    // Apple Sign In requires complex setup with certificates
    // For now, we'll skip Apple implementation and focus on Google/Facebook
    console.log('Apple Sign In configured but requires additional setup');
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: any, done) => {
    try {
      // Ensure id is a number
      const userId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(userId)) {
        return done(new Error('Invalid user ID'));
      }
      const user = await storage.getUser(userId);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        provider: "email",
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Social Authentication Routes
  
  // Google OAuth routes
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/auth" }),
    (req, res) => res.redirect("/")
  );

  // Facebook OAuth routes
  app.get("/api/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));
  app.get("/api/auth/facebook/callback",
    passport.authenticate("facebook", { failureRedirect: "/auth" }),
    (req, res) => res.redirect("/")
  );

  // Apple OAuth routes (disabled - requires complex certificate setup)
  // app.get("/api/auth/apple", passport.authenticate("apple"));
  // app.get("/api/auth/apple/callback",
  //   passport.authenticate("apple", { failureRedirect: "/auth" }),
  //   (req, res) => res.redirect("/")
  // );

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}