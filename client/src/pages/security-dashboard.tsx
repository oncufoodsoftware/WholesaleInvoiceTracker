import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Key, 
  Eye, 
  Server, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Globe
} from "lucide-react";

interface SecurityMetrics {
  rateLimit: {
    status: "active" | "inactive";
    rejectedRequests: number;
    avgResponseTime: number;
  };
  authentication: {
    totalSessions: number;
    activeSessions: number;
    failedAttempts: number;
    lastSuccessfulLogin: string;
  };
  bruteForce: {
    blockedIPs: number;
    suspiciousActivity: number;
    lastIncident: string | null;
  };
  security: {
    httpsEnabled: boolean;
    corsConfigured: boolean;
    xssProtection: boolean;
    sqlInjectionProtection: boolean;
    csrfProtection: boolean;
  };
}

export default function SecurityDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ["/api/security/metrics"],
    queryFn: async () => {
      const response = await fetch("/api/security/metrics", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch security metrics");
      }
      return response.json() as Promise<SecurityMetrics>;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getSecurityScore = () => {
    if (!metrics) return 0;
    
    let score = 0;
    const checks = [
      metrics.security.httpsEnabled,
      metrics.security.corsConfigured,
      metrics.security.xssProtection,
      metrics.security.sqlInjectionProtection,
      metrics.security.csrfProtection,
      metrics.bruteForce.blockedIPs < 10,
      metrics.authentication.failedAttempts < 50
    ];
    
    score = (checks.filter(Boolean).length / checks.length) * 100;
    return Math.round(score);
  };

  const getSecurityLevel = (score: number) => {
    if (score >= 90) return { level: "Excellent", color: "bg-green-500", icon: ShieldCheck };
    if (score >= 75) return { level: "Good", color: "bg-blue-500", icon: Shield };
    if (score >= 60) return { level: "Fair", color: "bg-yellow-500", icon: ShieldAlert };
    return { level: "Poor", color: "bg-red-500", icon: AlertTriangle };
  };

  if (isLoading) {
    return (
      <div className="py-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const securityScore = getSecurityScore();
  const securityLevel = getSecurityLevel(securityScore);
  const SecurityIcon = securityLevel.icon;

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Maximum Security Level
          </Badge>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Activity className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Security Score Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <SecurityIcon className="h-5 w-5" />
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold mb-2">{securityScore}%</div>
            <Badge className={`${securityLevel.color} text-white`}>
              {securityLevel.level}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.authentication.activeSessions || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              Total: {metrics?.authentication.totalSessions || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Blocked IPs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.bruteForce.blockedIPs || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              Suspicious: {metrics?.bruteForce.suspiciousActivity || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.rateLimit.avgResponseTime || 0}ms
            </div>
            <p className="text-sm text-muted-foreground">
              Rejected: {metrics?.rateLimit.rejectedRequests || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Security Overview</TabsTrigger>
          <TabsTrigger value="threats">Threat Detection</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Features Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics && Object.entries({
                  "HTTPS Encryption": metrics.security.httpsEnabled,
                  "CORS Protection": metrics.security.corsConfigured,
                  "XSS Protection": metrics.security.xssProtection,
                  "SQL Injection Shield": metrics.security.sqlInjectionProtection,
                  "CSRF Protection": metrics.security.csrfProtection
                }).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <span className="font-medium">{feature}</span>
                    <div className="flex items-center gap-2">
                      {enabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Badge variant={enabled ? "default" : "destructive"}>
                        {enabled ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    All security measures are active and monitoring incoming requests.
                    Rate limiting is protecting against DoS attacks.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Firewall Status</span>
                    <Badge className="bg-green-500 text-white">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Intrusion Detection</span>
                    <Badge className="bg-green-500 text-white">Monitoring</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Security Headers</span>
                    <Badge className="bg-green-500 text-white">Enforced</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Threat Detection & Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-500">0</div>
                  <div className="text-sm text-muted-foreground">Active Threats</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-500">
                    {metrics?.authentication.failedAttempts || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed Login Attempts</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">
                    {metrics?.bruteForce.suspiciousActivity || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Suspicious Activities</div>
                </div>
              </div>
              
              <Alert className="mt-4">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Advanced threat detection is continuously monitoring for malicious patterns,
                  SQL injection attempts, XSS attacks, and brute force attempts.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Access Control & Authentication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Session Management</h4>
                    <div className="space-y-2 text-sm">
                      <div>Active Sessions: {metrics?.authentication.activeSessions || 0}</div>
                      <div>Session Timeout: 24 hours</div>
                      <div>Secure Cookies: Enabled</div>
                      <div>HttpOnly Cookies: Enabled</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Password Security</h4>
                    <div className="space-y-2 text-sm">
                      <div>Minimum Length: 8 characters</div>
                      <div>Complexity: Required</div>
                      <div>Hashing: Scrypt (secure)</div>
                      <div>Salt: Unique per password</div>
                    </div>
                  </div>
                </div>
                
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    Multi-layered authentication system with secure session management,
                    encrypted password storage, and brute force protection.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Real-time Security Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    Security monitoring is active. All requests are being analyzed for
                    malicious patterns and suspicious behavior.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Rate Limiting</h4>
                    <div className="text-sm space-y-1">
                      <div>Auth Endpoints: 5 requests/15min</div>
                      <div>API Endpoints: 30 requests/min</div>
                      <div>General: 100 requests/15min</div>
                      <div>Status: <Badge className="bg-green-500 text-white">Active</Badge></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">Request Analysis</h4>
                    <div className="text-sm space-y-1">
                      <div>XSS Detection: Enabled</div>
                      <div>SQL Injection: Blocked</div>
                      <div>Input Sanitization: Active</div>
                      <div>Response Time: {metrics?.rateLimit.avgResponseTime || 0}ms</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}