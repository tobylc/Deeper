import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    rateLimitStore.forEach((v, k) => {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    });
    
    const current = rateLimitStore.get(key);
    
    if (!current) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (now > current.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (current.count >= maxRequests) {
      return res.status(429).json({ 
        message: "Too many requests, please try again later",
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
    }
    
    current.count++;
    next();
  };
}

export function validateEmail(req: Request, res: Response, next: NextFunction) {
  const emailSchema = z.string().email().min(1).max(255);
  
  // Check different possible email fields
  const emailFields = ['email', 'inviterEmail', 'inviteeEmail', 'senderEmail', 'accepterEmail', 'declinerEmail'];
  
  for (const field of emailFields) {
    const value = req.body[field] || req.params[field];
    if (value !== undefined) {
      try {
        emailSchema.parse(value);
      } catch (error) {
        return res.status(400).json({ 
          message: `Invalid email format for ${field}`,
          field
        });
      }
    }
  }
  
  next();
}

export function validateMessageContent(req: Request, res: Response, next: NextFunction) {
  if (req.body.content !== undefined) {
    const content = req.body.content?.trim();
    
    if (!content || content.length === 0) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ message: "Message content too long (max 2000 characters)" });
    }
    
    // Update the body with trimmed content
    req.body.content = content;
  }
  
  next();
}

export function corsHeaders(req: Request, res: Response, next: NextFunction) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  
  next();
}

// Session-based authentication middleware
export function isAuthenticated(req: any, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUTH] Authentication check:', {
      hasSession: !!req.session,
      sessionUser: !!req.session?.user,
      sessionID: req.sessionID,
      method: req.method,
      url: req.url,
      userEmail: req.session?.user?.email || 'none'
    });
  }

  // For development, allow requests to pass through
  // Production systems will use proper OAuth
  if (process.env.NODE_ENV === 'development') {
    // Always allow in development
    if (req.session?.user) {
      req.user = req.session.user;
    }
    return next();
  }

  // Check session-based authentication for production
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      message: "Authentication required. Please log in to continue." 
    });
  }

  // Set user for compatibility
  req.user = req.session.user;
  next();
}