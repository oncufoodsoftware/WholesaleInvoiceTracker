import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/use-auth";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Invoices from "@/pages/invoices";
import Finances from "@/pages/finances";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import Branches from "@/pages/branches";
import Suppliers from "@/pages/suppliers";
import { ProtectedRoute } from "./lib/protected-route";

import { Layout } from "@/components/layout/layout";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <Route path="/:rest*">
        {(params) => {
          // Wrap all protected routes with the Layout component
          // This adds the header and sidebar to all authenticated pages
          return (
            <Layout>
              <Switch>
                <ProtectedRoute path="/" component={Dashboard} />
                <ProtectedRoute path="/branches" component={Branches} />
                <ProtectedRoute path="/suppliers" component={Suppliers} />
                <ProtectedRoute path="/invoices" component={Invoices} />
                <ProtectedRoute path="/finances" component={Finances} />
                <ProtectedRoute path="/reports" component={Reports} />
                <ProtectedRoute path="/users" component={Users} requiredRoles={["admin"]} />
                <ProtectedRoute path="/settings" component={Settings} />
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
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
