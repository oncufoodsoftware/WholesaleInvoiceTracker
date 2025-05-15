import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

// Define the navigation items
const mainNavItems = [
  {
    title: "Dashboard",
    path: "/",
    icon: "dashboard",
    roles: ["admin", "branch_manager", "accountant"]
  },
  {
    title: "Invoices",
    path: "/invoices",
    icon: "receipt",
    roles: ["admin", "branch_manager", "accountant"]
  },
  {
    title: "Branch Finances",
    path: "/finances",
    icon: "account_balance_wallet",
    roles: ["admin", "branch_manager", "accountant"]
  }
];

const reportNavItems = [
  {
    title: "Financial Reports",
    path: "/reports",
    icon: "bar_chart",
    roles: ["admin", "accountant"]
  },
  {
    title: "Suppliers",
    path: "/suppliers",
    icon: "inventory",
    roles: ["admin", "accountant"]
  }
];

const adminNavItems = [
  {
    title: "User Management",
    path: "/users",
    icon: "people",
    roles: ["admin"]
  },
  {
    title: "Settings",
    path: "/settings",
    icon: "settings",
    roles: ["admin"]
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  if (!user) return null;
  
  const userRole = user.role;
  
  const filterItemsByRole = (items: typeof mainNavItems) => {
    return items.filter(item => item.roles.includes(userRole));
  };

  return (
    <aside className="sidebar overflow-y-auto">
      <nav className="py-4">
        <div className="px-4 mb-2 text-xs font-medium text-muted-foreground uppercase">Main</div>
        {filterItemsByRole(mainNavItems).map((item) => (
          <Link 
            key={item.path}
            href={item.path}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors mb-1",
              location === item.path 
                ? "bg-primary text-primary-foreground" 
                : "text-foreground hover:bg-secondary/50"
            )}
          >
            <span className="material-icons">{item.icon}</span>
            <span>{item.title}</span>
          </Link>
        ))}
        
        {filterItemsByRole(reportNavItems).length > 0 && (
          <>
            <div className="px-4 mt-6 mb-2 text-xs font-medium text-muted-foreground uppercase">Reports</div>
            {filterItemsByRole(reportNavItems).map((item) => (
              <Link 
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors mb-1",
                  location === item.path 
                    ? "bg-primary text-primary-foreground" 
                    : "text-foreground hover:bg-secondary/50"
                )}
              >
                <span className="material-icons">{item.icon}</span>
                <span>{item.title}</span>
              </Link>
            ))}
          </>
        )}
        
        {filterItemsByRole(adminNavItems).length > 0 && (
          <>
            <div className="px-4 mt-6 mb-2 text-xs font-medium text-muted-foreground uppercase">Admin</div>
            {filterItemsByRole(adminNavItems).map((item) => (
              <Link 
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors mb-1",
                  location === item.path 
                    ? "bg-primary text-primary-foreground" 
                    : "text-foreground hover:bg-secondary/50"
                )}
              >
                <span className="material-icons">{item.icon}</span>
                <span>{item.title}</span>
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
