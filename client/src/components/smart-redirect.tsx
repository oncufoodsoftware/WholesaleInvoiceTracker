import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { getRedirectPath } from "@/lib/redirect-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, Home } from "lucide-react";

interface SmartRedirectProps {
  currentPath: string;
}

export function SmartRedirect({ currentPath }: SmartRedirectProps) {
  const [suggestedPath, setSuggestedPath] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const [autoRedirect, setAutoRedirect] = useState(true);

  useEffect(() => {
    // Find a suggested redirect path
    const redirect = getRedirectPath(currentPath);
    setSuggestedPath(redirect);

    // Set up countdown for auto-redirect
    if (redirect && autoRedirect) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate(redirect);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentPath, navigate, autoRedirect]);

  // Cancel auto-redirect
  const handleCancel = () => {
    setAutoRedirect(false);
  };

  // Immediately redirect to suggested path
  const handleRedirect = () => {
    if (suggestedPath) {
      navigate(suggestedPath);
    }
  };

  // Redirect to dashboard
  const handleDashboard = () => {
    navigate("/dashboard");
  };

  if (!suggestedPath) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl flex items-center">
          <AlertTriangle className="mr-2 h-6 w-6 text-yellow-500" />
          Page Not Found
        </CardTitle>
        <CardDescription>
          The page you're looking for doesn't exist. We found a similar page that might help.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-3 rounded-md border">
          <p className="text-sm font-medium">Did you mean to visit:</p>
          <p className="text-primary font-semibold flex items-center mt-1">
            <ArrowRight className="mr-1 h-4 w-4" />
            {suggestedPath}
          </p>
          {autoRedirect && (
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting in {countdown} seconds...
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {autoRedirect ? (
          <Button variant="outline" onClick={handleCancel}>
            Cancel Redirect
          </Button>
        ) : (
          <Button variant="outline" onClick={handleDashboard}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        )}
        <Button onClick={handleRedirect}>
          Go to {suggestedPath.substring(1)}
        </Button>
      </CardFooter>
    </Card>
  );
}