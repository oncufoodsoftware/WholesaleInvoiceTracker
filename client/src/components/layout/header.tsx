import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  function getUserInitials(fullName?: string, username?: string): string {
    if (fullName && fullName.length > 0) {
      const names = fullName.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    
    if (username && username.length > 0) {
      return username[0].toUpperCase();
    }
    
    return "U";
  }
  
  const initials = getUserInitials(user?.fullName, user?.username);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 shadow-sm z-10 h-16">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center">
          <span className="material-icons text-primary mr-2">account_balance</span>
          <h1 className="text-xl font-medium">Finance Management</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center p-0 text-xs">3</Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm">New invoice added</p>
                  <p className="text-xs text-muted-foreground">5 minutes ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm">Payment received</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm">Daily report ready</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-1">
                <Avatar className="h-8 w-8 bg-primary text-white">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline">{user?.fullName || user?.username}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
