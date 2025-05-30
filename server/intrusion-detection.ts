import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Advanced threat patterns
const THREAT_PATTERNS = {
  SQL_INJECTION: [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(--|\/\*|\*\/|;|\||&)/g,
    /(\bor\b|\band\b).*?=.*?(\'|\")/gi,
    /\b(sysobjects|syscolumns|information_schema)\b/gi
  ],
  XSS_ATTACKS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /document\.cookie/gi,
    /eval\s*\(/gi
  ],
  COMMAND_INJECTION: [
    /(\||&|;|\$\(|\`)/g,
    /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig)\b/gi,
    /(\.\.\/|\.\.\\)/g
  ],
  LDAP_INJECTION: [
    /(\*|\(|\)|\||&)/g,
    /\b(cn|ou|dc)=/gi
  ],
  XPATH_INJECTION: [
    /(\[|\]|\/\/|\||and|or)/gi,
    /text\(\)|node\(\)|@\w+/gi
  ]
};

// Suspicious patterns that indicate potential attacks
const SUSPICIOUS_PATTERNS = {
  EXCESSIVE_REQUESTS: 50, // requests per minute
  FAILED_LOGIN_THRESHOLD: 5, // failed attempts
  UNUSUAL_USER_AGENTS: [
    /sqlmap/i,
    /nmap/i,
    /nikto/i,
    /burp/i,
    /w3af/i,
    /acunetix/i,
    /nessus/i
  ],
  SUSPICIOUS_PATHS: [
    /\/admin/,
    /\/wp-admin/,
    /\/phpmyadmin/,
    /\/\.env/,
    /\/config/,
    /\/backup/,
    /\/wp-config/
  ]
};

// IP tracking for rate limiting and threat detection
const ipTracker = new Map<string, {
  requests: number[];
  failedLogins: number;
  lastActivity: Date;
  suspicious: boolean;
  blocked: boolean;
}>();

// Clean up old tracking data every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [ip, data] of ipTracker.entries()) {
    data.requests = data.requests.filter(time => time > fiveMinutesAgo);
    if (data.requests.length === 0 && data.lastActivity.getTime() < fiveMinutesAgo) {
      ipTracker.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Get client IP address
function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         '127.0.0.1';
}

// Check for threat patterns in input
function detectThreatPatterns(input: string): { threat: boolean; type: string[] } {
  const threats: string[] = [];
  const inputLower = input.toLowerCase();

  // Check SQL injection patterns
  if (THREAT_PATTERNS.SQL_INJECTION.some(pattern => pattern.test(inputLower))) {
    threats.push('SQL_INJECTION');
  }

  // Check XSS patterns
  if (THREAT_PATTERNS.XSS_ATTACKS.some(pattern => pattern.test(input))) {
    threats.push('XSS_ATTACK');
  }

  // Check command injection patterns
  if (THREAT_PATTERNS.COMMAND_INJECTION.some(pattern => pattern.test(input))) {
    threats.push('COMMAND_INJECTION');
  }

  // Check LDAP injection patterns
  if (THREAT_PATTERNS.LDAP_INJECTION.some(pattern => pattern.test(input))) {
    threats.push('LDAP_INJECTION');
  }

  // Check XPath injection patterns
  if (THREAT_PATTERNS.XPATH_INJECTION.some(pattern => pattern.test(inputLower))) {
    threats.push('XPATH_INJECTION');
  }

  return { threat: threats.length > 0, type: threats };
}

// Check for suspicious user agents and paths
function detectSuspiciousActivity(req: Request): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const userAgent = req.headers['user-agent'] || '';
  const path = req.path;

  // Check suspicious user agents
  if (SUSPICIOUS_PATTERNS.UNUSUAL_USER_AGENTS.some(pattern => pattern.test(userAgent))) {
    reasons.push('SUSPICIOUS_USER_AGENT');
  }

  // Check suspicious paths
  if (SUSPICIOUS_PATTERNS.SUSPICIOUS_PATHS.some(pattern => pattern.test(path))) {
    reasons.push('SUSPICIOUS_PATH');
  }

  // Check for missing or unusual headers
  if (!userAgent || userAgent.length < 10) {
    reasons.push('MISSING_USER_AGENT');
  }

  return { suspicious: reasons.length > 0, reasons };
}

// Log security incident
async function logSecurityIncident(
  req: Request,
  type: string,
  details: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  try {
    const ip = getClientIP(req);
    console.warn(`🚨 SECURITY INCIDENT [${severity.toUpperCase()}]: ${type}`, {
      ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      details,
      timestamp: new Date().toISOString()
    });

    // Log to user actions for tracking
    if (req.user?.id) {
      // This would need to be implemented in storage
      // await storage.logUserAction(req.user.id, 'security_incident', { type, details, ip });
    }
  } catch (error) {
    console.error('Failed to log security incident:', error);
  }
}

// Main intrusion detection middleware
export const intrusionDetection = (req: Request, res: Response, next: NextFunction) => {
  const ip = getClientIP(req);
  const now = Date.now();

  // Initialize or get IP tracking data
  if (!ipTracker.has(ip)) {
    ipTracker.set(ip, {
      requests: [],
      failedLogins: 0,
      lastActivity: new Date(),
      suspicious: false,
      blocked: false
    });
  }

  const ipData = ipTracker.get(ip)!;
  ipData.lastActivity = new Date();

  // Check if IP is blocked
  if (ipData.blocked) {
    logSecurityIncident(req, 'BLOCKED_IP_ACCESS', `Blocked IP ${ip} attempted access`, 'high');
    return res.status(403).json({
      error: 'Access denied',
      code: 'IP_BLOCKED'
    });
  }

  // Rate limiting check
  ipData.requests.push(now);
  ipData.requests = ipData.requests.filter(time => time > now - 60000); // Last minute

  if (ipData.requests.length > SUSPICIOUS_PATTERNS.EXCESSIVE_REQUESTS) {
    ipData.suspicious = true;
    logSecurityIncident(req, 'RATE_LIMIT_EXCEEDED', `IP ${ip} exceeded rate limit: ${ipData.requests.length} requests/min`, 'high');
    
    // Block IP after excessive requests
    if (ipData.requests.length > SUSPICIOUS_PATTERNS.EXCESSIVE_REQUESTS * 2) {
      ipData.blocked = true;
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
  }

  // Check for suspicious activity
  const suspiciousActivity = detectSuspiciousActivity(req);
  if (suspiciousActivity.suspicious) {
    ipData.suspicious = true;
    logSecurityIncident(
      req,
      'SUSPICIOUS_ACTIVITY',
      `Suspicious activity detected: ${suspiciousActivity.reasons.join(', ')}`,
      'medium'
    );
  }

  // Check request body and query parameters for threats
  const checkData = [
    JSON.stringify(req.body || {}),
    JSON.stringify(req.query || {}),
    req.path,
    req.headers['user-agent'] || ''
  ].join(' ');

  const threatDetection = detectThreatPatterns(checkData);
  if (threatDetection.threat) {
    ipData.suspicious = true;
    logSecurityIncident(
      req,
      'INJECTION_ATTEMPT',
      `Potential injection attack detected: ${threatDetection.type.join(', ')}`,
      'critical'
    );

    // Block immediately for injection attempts
    ipData.blocked = true;
    return res.status(403).json({
      error: 'Request blocked for security reasons',
      code: 'THREAT_DETECTED'
    });
  }

  next();
};

// Failed login tracking
export const trackFailedLogin = (req: Request) => {
  const ip = getClientIP(req);
  
  if (!ipTracker.has(ip)) {
    ipTracker.set(ip, {
      requests: [],
      failedLogins: 0,
      lastActivity: new Date(),
      suspicious: false,
      blocked: false
    });
  }

  const ipData = ipTracker.get(ip)!;
  ipData.failedLogins++;

  if (ipData.failedLogins >= SUSPICIOUS_PATTERNS.FAILED_LOGIN_THRESHOLD) {
    ipData.suspicious = true;
    logSecurityIncident(
      req,
      'BRUTE_FORCE_ATTEMPT',
      `Multiple failed login attempts from IP ${ip}: ${ipData.failedLogins} attempts`,
      'high'
    );

    // Block after too many failed attempts
    if (ipData.failedLogins >= SUSPICIOUS_PATTERNS.FAILED_LOGIN_THRESHOLD * 2) {
      ipData.blocked = true;
    }
  }
};

// Reset failed login count on successful login
export const resetFailedLogin = (req: Request) => {
  const ip = getClientIP(req);
  const ipData = ipTracker.get(ip);
  if (ipData) {
    ipData.failedLogins = 0;
  }
};

// Get current threat statistics
export const getThreatStatistics = () => {
  const stats = {
    totalIPs: ipTracker.size,
    suspiciousIPs: 0,
    blockedIPs: 0,
    totalRequests: 0,
    totalFailedLogins: 0
  };

  for (const [, data] of ipTracker.entries()) {
    if (data.suspicious) stats.suspiciousIPs++;
    if (data.blocked) stats.blockedIPs++;
    stats.totalRequests += data.requests.length;
    stats.totalFailedLogins += data.failedLogins;
  }

  return stats;
};

// Manual IP blocking/unblocking for admins
export const blockIP = (ip: string, reason: string) => {
  if (!ipTracker.has(ip)) {
    ipTracker.set(ip, {
      requests: [],
      failedLogins: 0,
      lastActivity: new Date(),
      suspicious: true,
      blocked: true
    });
  } else {
    const ipData = ipTracker.get(ip)!;
    ipData.blocked = true;
    ipData.suspicious = true;
  }
  
  console.warn(`🚫 IP ${ip} manually blocked: ${reason}`);
};

export const unblockIP = (ip: string) => {
  const ipData = ipTracker.get(ip);
  if (ipData) {
    ipData.blocked = false;
    ipData.suspicious = false;
    ipData.failedLogins = 0;
    ipData.requests = [];
  }
  
  console.info(`✅ IP ${ip} unblocked`);
};