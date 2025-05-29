import { useAuth } from "@/hooks/use-auth";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps, useLocation } from "wouter";

interface ProtectedRouteProps extends RouteProps {
  path: string;
  component: () => React.ReactNode;
  requiredRoles?: string[];
  requiredPageAccess?: string;
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredRoles,
  requiredPageAccess,
  ...rest
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { hasPageAccess, isLoading: permissionsLoading } = useRolePermissions();
  const [, setLocation] = useLocation();

  if (isLoading || permissionsLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Not logged in
  if (!user) {
    console.log("User not authenticated, redirecting to auth page");
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check page access based on role permissions
  if (requiredPageAccess && !hasPageAccess(requiredPageAccess)) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6 text-center">
            You don't have permission to access this page. Your role doesn't include access to the {requiredPageAccess} section.
          </p>
          <button
            onClick={() => setLocation('/dashboard')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </Route>
    );
  }

  // Check legacy role access if specified (for backward compatibility)
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6 text-center">
            You don't have permission to access this page. This area requires {requiredRoles.join(' or ')} privileges.
          </p>
          <button
            onClick={() => setLocation('/dashboard')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </Route>
    );
  }

  // User has access
  return <Route path={path} {...rest} component={Component} />;
}
