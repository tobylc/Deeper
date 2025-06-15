import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import * as openidClient from "openid-client";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("REPLIT_DOMAINS environment variable required for production auth");
}

console.log(`[AUTH] Initializing production Replit authentication`);

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

async function upsertUser(userData: any) {
  return await storage.upsertUser({
    id: userData.sub,
    email: userData.email,
    firstName: userData.given_name || userData.first_name,
    lastName: userData.family_name || userData.last_name,
    profileImageUrl: userData.picture || userData.profile_image_url,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Replit Auth OpenID Connect setup
  const issuer = await openidClient.Issuer.discover("https://replit.com");
  const client = new issuer.Client({
    client_id: process.env.REPLIT_CLIENT_ID!,
    client_secret: process.env.REPLIT_CLIENT_SECRET!,
    redirect_uris: [`https://${process.env.REPLIT_DOMAINS}/api/auth/callback`],
    response_types: ["code"],
  });

  // Initiate authentication
  app.get("/api/auth/login", (req, res) => {
    const authUrl = client.authorizationUrl({
      scope: "openid profile email",
      state: Math.random().toString(36).substring(7),
    });
    res.redirect(authUrl);
  });

  // Handle OAuth callback
  app.get("/api/auth/callback", async (req, res) => {
    try {
      const params = client.callbackParams(req);
      const tokenSet = await client.callback(
        `https://${process.env.REPLIT_DOMAINS}/api/auth/callback`,
        params
      );
      
      const userinfo = await client.userinfo(tokenSet.access_token!);
      const user = await upsertUser(userinfo);
      
      (req.session as any).user = {
        ...user,
        access_token: tokenSet.access_token,
        refresh_token: tokenSet.refresh_token,
        expires_at: tokenSet.expires_at,
      };
      
      res.redirect("/dashboard");
    } catch (error) {
      console.error("[AUTH] Authentication callback failed:", error);
      res.redirect("/?error=auth_failed");
    }
  });

  // Logout endpoint
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