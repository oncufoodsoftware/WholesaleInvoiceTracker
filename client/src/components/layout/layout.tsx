import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";
import { FinancialTipsSidebar } from "@/components/financial-tips-sidebar";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export function Layout({ children, className }: LayoutProps) {
  const { user } = useAuth();
  const showFinancialTips = !!user; // Only show tips for logged in users
  
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-h-screen flex-col pl-0 md:pl-72">
        <Header />
        <main className={cn("flex-1 p-4 md:p-6", className)}>
          {children}
          
          {showFinancialTips && (
            <div className="mt-6">
              <FinancialTipsSidebar />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}