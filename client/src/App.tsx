import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/use-auth";
import { AchievementProvider } from "@/hooks/use-achievements";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Invoices from "@/pages/invoices";
import Finances from "@/pages/finances";
import Reports from "@/pages/reports";
import Analytics from "@/pages/analytics";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import Branches from "@/pages/branches";
import Suppliers from "@/pages/suppliers";
import UserActions from "@/pages/user-actions";
import SupplierRisk from "@/pages/supplier-risk";
import SupportTickets from "@/pages/support-tickets";
import Roles from "@/pages/roles";
import DebugAuth from "@/pages/debug-auth";
import SecurityDashboard from "@/pages/security-dashboard";

import { ProtectedRoute } from "./lib/protected-route";

import { Layout } from "@/components/layout/layout";

function Router() {
  return (
    <Switch>
      {/* Root path redirect handled differently for wouter compatibility */}
      <Route path="/">
        {() => <Redirect to="/dashboard" />}
      </Route>
      
      <Route path="/auth" component={AuthPage} />
      <Route path="/debug-auth" component={DebugAuth} />
      
      <Route path="/:rest*">
        {(params) => {
          // Wrap all protected routes with the Layout component
          // This adds the header and sidebar to all authenticated pages
          return (
            <Layout>
              <Switch>
                <ProtectedRoute path="/dashboard" component={Dashboard} requiredPageAccess="dashboard" />
                <ProtectedRoute path="/branches" component={Branches} requiredPageAccess="branches" />
                <ProtectedRoute path="/suppliers" component={Suppliers} requiredPageAccess="suppliers" />
                <ProtectedRoute path="/supplier-risk" component={SupplierRisk} requiredPageAccess="risk_analysis" />
                <ProtectedRoute path="/invoices" component={Invoices} requiredPageAccess="invoices" />
                <ProtectedRoute path="/finances" component={Finances} requiredPageAccess="dashboard" />
                <ProtectedRoute path="/reports" component={Reports} requiredPageAccess="reports" />
                <ProtectedRoute path="/analytics" component={Analytics} requiredPageAccess="reports" />
                <ProtectedRoute path="/support-tickets" component={SupportTickets} requiredPageAccess="dashboard" />
                <ProtectedRoute path="/users" component={Users} requiredPageAccess="users" />
                <ProtectedRoute path="/roles" component={Roles} requiredPageAccess="roles" />
                <ProtectedRoute path="/user-actions" component={UserActions} requiredPageAccess="users" />
                <ProtectedRoute path="/settings" component={Settings} requiredPageAccess="settings" />
                <ProtectedRoute path="/security" component={SecurityDashboard} requiredPageAccess="settings" />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          );
        }}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <AchievementProvider>
            <Router />
          </AchievementProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
