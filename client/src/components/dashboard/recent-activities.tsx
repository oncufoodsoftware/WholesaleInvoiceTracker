import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  FileEdit, 
  Trash2,
  UserPlus,
  Building,
  Banknote,
  RotateCcw,
  Calendar,
  CreditCard
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { UserAction, DirectDebit } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { type ReactNode } from "react";

interface RecentActivitiesProps {
  branchId?: number;
}

// Unified activity item interface
interface ActivityItem {
  kind: 'user' | 'direct_debit';
  id: string;
  timestamp: Date;
  title: string;
  subtitle: string;
  amount?: number;
  badge?: string;
  icon: ReactNode;
  style: string;
}

export function RecentActivities({ branchId }: RecentActivitiesProps) {
  const { user } = useAuth();
  
  // Fetch all user activities (admin only view)
  const { data: actions, isLoading: actionsLoading } = useQuery<UserAction[]>({
    queryKey: ["/api/user-actions"],
    queryFn: async () => {
      const res = await fetch("/api/user-actions?limit=15");
      if (!res.ok) throw new Error("Failed to fetch user actions");
      return res.json();
    },
    enabled: user?.role === 'admin', // Only fetch for admin users
  });

  // Fetch direct debits for activity feed (admin only view)
  const { data: directDebits, isLoading: debitsLoading } = useQuery<DirectDebit[]>({
    queryKey: ["/api/direct-debits", { branchId }],
    queryFn: async () => {
      const url = branchId ? `/api/direct-debits?branchId=${branchId}` : '/api/direct-debits';
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch direct debits");
      return res.json();
    },
    enabled: user?.role === 'admin', // Only fetch for admin users
  });

  const isLoading = actionsLoading || debitsLoading;

  // Currency formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  // Map UserActions to ActivityItems
  const mapUserActionsToActivityItems = (actions: UserAction[]): ActivityItem[] => {
    return actions.map(action => {
      const entityName = action.entityType.charAt(0).toUpperCase() + action.entityType.slice(1);
      const actionName = action.actionType.charAt(0).toUpperCase() + action.actionType.slice(1);
      const description = action.details ? `${actionName}d ${entityName} - ${action.details}` : `${actionName}d ${entityName} #${action.entityId || ''}`;
      
      return {
        kind: 'user' as const,
        id: `user-${action.id}`,
        timestamp: new Date(action.timestamp || new Date()),
        title: description,
        subtitle: `By User #${action.userId}`,
        icon: getActionIcon(action.actionType),
        style: getActionStyle(action.actionType)
      };
    });
  };

  // Map DirectDebits to ActivityItems
  const mapDirectDebitsToActivityItems = (debits: DirectDebit[]): ActivityItem[] => {
    const items: ActivityItem[] = [];
    const now = new Date();
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    debits.forEach(debit => {
      // Created event
      if (debit.createdAt) {
        items.push({
          kind: 'direct_debit' as const,
          id: `dd-created-${debit.id}`,
          timestamp: new Date(debit.createdAt),
          title: `Direct Debit Created: ${debit.recipientName}`,
          subtitle: `${debit.frequency} payment`,
          amount: debit.amount,
          badge: 'Created',
          icon: <CreditCard className="h-4 w-4" />,
          style: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        });
      }

      // Scheduled event (if next payment is within 14 days)
      if (debit.nextPaymentDate && debit.isActive) {
        const nextPayment = new Date(debit.nextPaymentDate);
        if (nextPayment <= fourteenDaysFromNow && nextPayment >= now) {
          const isStandingOrder = debit.frequency !== null;
          items.push({
            kind: 'direct_debit' as const,
            id: `dd-scheduled-${debit.id}`,
            timestamp: nextPayment,
            title: `${isStandingOrder ? 'Standing Order' : 'Direct Debit'} Scheduled: ${debit.recipientName}`,
            subtitle: `Payment due ${nextPayment.toLocaleDateString('en-GB')}`,
            amount: debit.amount,
            badge: 'Upcoming',
            icon: isStandingOrder ? <RotateCcw className="h-4 w-4" /> : <Banknote className="h-4 w-4" />,
            style: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
          });
        }
      }
    });

    return items;
  };

  // Create unified activity feed
  const activityItems: ActivityItem[] = [
    ...mapUserActionsToActivityItems(actions || []),
    ...mapDirectDebitsToActivityItems(directDebits || [])
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);

  // Function to get appropriate icon for action type
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <UserPlus className="h-4 w-4" />;
      case 'update':
        return <FileEdit className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'login':
        return <ArrowUpRight className="h-4 w-4" />;
      case 'logout':
        return <ArrowDownRight className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  // Function to get appropriate style for action type
  const getActionStyle = (type: string) => {
    switch (type) {
      case 'create':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'update':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'delete':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'login':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
      case 'logout':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
    }
  };

  // Format action description
  const formatActionDescription = (action: UserAction) => {
    const entityName = action.entityType.charAt(0).toUpperCase() + action.entityType.slice(1);
    const actionName = action.actionType.charAt(0).toUpperCase() + action.actionType.slice(1);
    
    if (action.details) {
      return `${actionName}d ${entityName} - ${action.details}`;
    }
    
    return `${actionName}d ${entityName} #${action.entityId || ''}`;
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">System Activity Logs</CardTitle>
        <CardDescription>All user actions and system events</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : activityItems && activityItems.length > 0 ? (
          <div className="space-y-4">
            {activityItems.map((item) => (
              <div key={item.id} className="flex gap-3" data-testid={`activity-item-${item.kind}-${item.id}`}>
                <div className={`p-2 rounded-full ${item.style}`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" data-testid={`activity-title-${item.id}`}>{item.title}</p>
                  <p className="text-xs text-muted-foreground" data-testid={`activity-subtitle-${item.id}`}>{item.subtitle}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground" data-testid={`activity-time-${item.id}`}>
                      {formatRelativeTime(item.timestamp.toString())}
                    </p>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs" data-testid={`activity-badge-${item.id}`}>
                        {item.badge}
                      </Badge>
                    )}
                    {item.amount && (
                      <span className="text-xs font-medium text-green-600" data-testid={`activity-amount-${item.id}`}>
                        {formatCurrency(item.amount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : user?.role !== 'admin' ? (
          <div className="text-center py-6 text-muted-foreground">
            <Building className="h-8 w-8 mx-auto mb-2" />
            <p>Activity logs are available for admin users only</p>
          </div>
        ) : (
          <p className="text-center py-6 text-muted-foreground">No activity data available</p>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/user-actions">
          <Button variant="outline" className="w-full">View All Activities</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}