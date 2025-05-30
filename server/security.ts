import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";

// Rate limiting configuration
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs for general endpoints
  message: {
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 API requests per minute
  message: {
    error: "API rate limit exceeded, please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: "same-origin" }
});

// Input validation schemas
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// SQL injection prevention
export const sqlInjectionCheck = (input: string): boolean => {
  const sqlPatterns = [
    /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b)/i,
    /(\bunion\b|\bjoin\b|\bwhere\b|\bor\b|\band\b)/i,
    /'.*?'|".*?"/,
    /--|\*\/|\*\*/,
    /\b(exec|execute|sp_|xp_)\b/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

// XSS prevention middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeInput(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// SQL injection prevention middleware
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlInjectionCheck(value);
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  const hasSqlInjection = 
    checkValue(req.body) || 
    checkValue(req.query) || 
    checkValue(req.params);

  if (hasSqlInjection) {
    return res.status(400).json({
      error: "Invalid input detected",
      code: "SECURITY_VIOLATION"
    });
  }

  next();
};

// CSRF protection
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET requests and auth endpoints during development
  if (req.method === 'GET' || req.path.includes('/auth/')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = (req.session as any)?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    // Generate CSRF token if it doesn't exist
    if (!sessionToken) {
      (req.session as any).csrfToken = generateCsrfToken();
    }
    
    // For API requests, return error
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({
        error: "CSRF token validation failed",
        code: "CSRF_ERROR"
      });
    }
  }

  next();
};

// Generate CSRF token
export const generateCsrfToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Session security configuration
export const sessionSecurity = {
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'strict' as const, // CSRF protection
  },
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
};

// Password security validation
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Email validation
export const emailSchema = z.string()
  .email("Invalid email format")
  .max(254, "Email too long");

// Username validation
export const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(50, "Username too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens");

// Request logging for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      user: req.user?.id || 'anonymous'
    };

    // Log suspicious activity
    if (res.statusCode >= 400 || duration > 5000) {
      console.warn('Security Alert:', logData);
    }
  });

  next();
};

// Brute force protection
const failedAttempts = new Map<string, { count: number; lastAttempt: Date }>();

export const bruteForceProtection = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `${ip}:${req.path}`;
  const now = new Date();
  
  const attempts = failedAttempts.get(key);
  
  if (attempts) {
    const timeDiff = now.getTime() - attempts.lastAttempt.getTime();
    const minutesSinceLastAttempt = timeDiff / (1000 * 60);
    
    // Reset counter after 60 minutes
    if (minutesSinceLastAttempt > 60) {
      failedAttempts.delete(key);
    } else if (attempts.count >= 10) {
      return res.status(429).json({
        error: "Too many failed attempts. Please try again later.",
        code: "BRUTE_FORCE_DETECTED"
      });
    }
  }

  // Track failed attempts
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      const current = failedAttempts.get(key) || { count: 0, lastAttempt: now };
      failedAttempts.set(key, {
        count: current.count + 1,
        lastAttempt: now
      });
    } else if (res.statusCode < 400) {
      // Clear on successful request
      failedAttempts.delete(key);
    }
  });

  next();
};

// File upload security
export const fileUploadSecurity = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Single file only
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Allowed file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/csv'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
};

// Environment variable validation
export const validateEnvironment = () => {
  const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Required environment variable ${envVar} is not set`);
    }
  }
  
  // Validate session secret strength
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    console.warn('Warning: SESSION_SECRET should be at least 32 characters long');
  }
};