import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BarChart3,
  CircleDollarSign,
  FileText,
  Layers,
  Menu,
  PieChart,
  Settings,
  Store,
  Users,
  X,
  Activity,
  LineChart,
  TrendingUp,
} from "lucide-react";

interface SidebarNavProps {
  className?: string;
}

export function Sidebar({ className }: SidebarNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Close sidebar when navigating to a new page on mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location, isMobile]);

  // Open sidebar by default on desktop
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(true);
    }
  }, [isMobile]);

  const mainNavItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: <BarChart3 className="mr-2 h-4 w-4" />,
    },
    {
      title: "Branches",
      href: "/branches",
      icon: <Store className="mr-2 h-4 w-4" />,
    },
    {
      title: "Suppliers",
      href: "/suppliers", 
      icon: <Layers className="mr-2 h-4 w-4" />,
    },
    {
      title: "Invoices",
      href: "/invoices",
      icon: <FileText className="mr-2 h-4 w-4" />,
    },
    {
      title: "Finances",
      href: "/finances",
      icon: <CircleDollarSign className="mr-2 h-4 w-4" />,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: <PieChart className="mr-2 h-4 w-4" />,
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: <TrendingUp className="mr-2 h-4 w-4" />,
    },
  ];

  // Only show the admin nav items for admin users
  const adminNavItems = user?.role === "admin" ? [
    {
      title: "Users",
      href: "/users",
      icon: <Users className="mr-2 h-4 w-4" />,
    },
    {
      title: "User Actions",
      href: "/user-actions",
      icon: <Activity className="mr-2 h-4 w-4" />,
    }
  ] : [];

  // Settings is available for all users
  const settingsNavItems = [
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
    }
  ];

  return (
    <>
      {/* Mobile toggle button */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-4 top-4 z-40 md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle Menu</span>
        </Button>
      )}

      {/* Backdrop for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r bg-card shadow-sm transition-transform duration-300 ease-in-out dark:border-slate-700",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex h-14 items-center border-b px-4 dark:border-slate-700">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <CircleDollarSign className="h-6 w-6" />
            <span className="text-primary">FinTrack Pro</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 py-4">
          <nav className="grid gap-2 px-2">
            <div className="grid gap-1 px-2">
              {mainNavItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    location === item.href ? "bg-accent text-accent-foreground" : "transparent"
                  )}
                >
                  {item.icon}
                  {item.title}
                </Link>
              ))}
            </div>
            
            {adminNavItems.length > 0 && (
              <>
                <div className="my-2 mx-2">
                  <div className="text-xs font-semibold text-muted-foreground">Administration</div>
                </div>
                <div className="grid gap-1 px-2">
                  {adminNavItems.map((item, index) => (
                    <Link
                      key={index}
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                        location === item.href ? "bg-accent text-accent-foreground" : "transparent"
                      )}
                    >
                      {item.icon}
                      {item.title}
                    </Link>
                  ))}
                </div>
              </>
            )}

            <div className="my-2 mx-2">
              <div className="text-xs font-semibold text-muted-foreground">Settings</div>
            </div>
            <div className="grid gap-1 px-2">
              {settingsNavItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    location === item.href ? "bg-accent text-accent-foreground" : "transparent"
                  )}
                >
                  {item.icon}
                  {item.title}
                </Link>
              ))}
            </div>
          </nav>
        </ScrollArea>
        <div className="border-t p-4 text-sm dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}
            </div>
            <div>
              <p className="font-medium">{user?.fullName || user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}