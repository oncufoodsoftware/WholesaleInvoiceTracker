import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerRoleRoutes } from "./role-routes";
import { setupAuth } from "./auth";
import {
  authRateLimit,
  generalRateLimit,
  apiRateLimit,
  securityHeaders,
  xssProtection,
  sqlInjectionProtection,
  csrfProtection,
  sessionSecurity,
  securityLogger,
  bruteForceProtection,
  validateEnvironment,
  generateCsrfToken,
  fileUploadSecurity
} from "./security";
import { intrusionDetection } from "./intrusion-detection";

// Validate environment variables on startup
validateEnvironment();

const app = express();

// Basic security (disabled most restrictions temporarily)
// app.use(securityHeaders);
// app.use(securityLogger);
// app.use('/auth', authRateLimit);
// app.use('/api', apiRateLimit);
// app.use(generalRateLimit);
// app.use(bruteForceProtection);
// app.use(xssProtection);

// Trust proxy for accurate IP detection behind reverse proxies
app.set('trust proxy', 1);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
// app.use(sqlInjectionProtection);

// Advanced intrusion detection system (temporarily disabled)
// app.use(intrusionDetection);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Set up auth before routes
  setupAuth(app);
  
  // Register role routes 
  registerRoleRoutes(app);
  
  // Register app routes
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT environment variable if set (e.g. Plesk/cPanel hosting), otherwise default to 5000
  const rawPort = process.env.PORT;
  const port = rawPort ? parseInt(rawPort, 10) : 5000;
  if (isNaN(port)) {
    throw new Error(`Invalid PORT environment variable: "${rawPort}". Must be a number.`);
  }
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
