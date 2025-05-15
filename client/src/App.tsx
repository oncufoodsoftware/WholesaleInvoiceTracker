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
import { ProtectedRoute } from "./lib/protected-route";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

function Router() {
  return (
    <div className="relative min-h-screen">
      <Header />
      <Sidebar />
      <MobileNav />
      <main className="main-content bg-background p-4">
        <Switch>
          <ProtectedRoute path="/" component={Dashboard} />
          <ProtectedRoute path="/invoices" component={Invoices} />
          <ProtectedRoute path="/finances" component={Finances} />
          <ProtectedRoute path="/reports" component={Reports} />
          <ProtectedRoute path="/users" component={Users} requiredRoles={["admin"]} />
          <ProtectedRoute path="/settings" component={Settings} />
          <Route path="/auth" component={AuthPage} />
          {/* Fallback to 404 */}
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
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
