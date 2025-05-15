import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

// Define the mobile navigation items (simplified version of sidebar items)
const mobileNavItems = [
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
    title: "Finances",
    path: "/finances",
    icon: "account_balance_wallet",
    roles: ["admin", "branch_manager", "accountant"]
  },
  {
    title: "More",
    path: "/more",
    icon: "more_horiz",
    roles: ["admin", "branch_manager", "accountant"]
  }
];

export function MobileNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  if (!user) return null;
  
  const userRole = user.role;
  
  const filteredNavItems = mobileNavItems.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <div className="mobile-nav">
      <div className="flex justify-around items-center h-16">
        {filteredNavItems.map(item => (
          <Link
            key={item.path}
            href={item.path !== "/more" ? item.path : "/settings"}
            className="flex flex-col items-center justify-center"
          >
            <span 
              className={cn(
                "material-icons",
                location === item.path ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.icon}
            </span>
            <span 
              className={cn(
                "text-xs",
                location === item.path ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
