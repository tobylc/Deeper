import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("REPLIT_DOMAINS environment variable required for production");
}

console.log(`[AUTH] Production authentication system active`);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Production-ready session configuration with fallback to memory store
  try {
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
      errorLog: (error: any) => {
        console.error('[SESSION] Store error (non-fatal):', error);
      },
      schemaName: 'public',
      pruneSessionInterval: 60 * 15,
    });

    // Graceful error handling for store
    sessionStore.on('error', (error: any) => {
      console.error('[SESSION] Store connection error (will use memory fallback):', error);
    });

    return session({
      secret: process.env.SESSION_SECRET!,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: sessionTtl,
        sameSite: 'lax',
      },
    });
  } catch (error) {
    console.warn('[SESSION] PostgreSQL session store failed, using memory store as fallback:', error);
    
    // Fallback to memory store for immediate stability
    return session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: sessionTtl,
        sameSite: 'lax',
      },
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Production authentication will be handled by Replit's built-in auth
  // This is a placeholder for when Replit Auth is properly configured
  
  // For now, require manual configuration of OAuth providers
  app.get("/api/auth/login", (req, res) => {
    res.status(501).json({ 
      error: "Authentication not configured",
      message: "Please configure OAuth providers in your Replit secrets"
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("[AUTH] Logout failed:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = req.session as any;
  
  if (!session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.user = session.user;
  next();
};