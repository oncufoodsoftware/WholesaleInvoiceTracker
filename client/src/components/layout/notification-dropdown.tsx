import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { 
  BellIcon, 
  CreditCard, 
  Banknote,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DirectDebit {
  id: number;
  branchId: number;
  branchName: string;
  recipientName: string;
  amount: number;
  frequency: string | null;
  nextPaymentDate: string | null;
  isActive: boolean;
  createdAt: string;
}

interface PaymentTracking {
  id: number;
  supplierName: string;
  branchName: string;
  paymentDate: string;
  totalAmount: number;
  bankTransferAmount?: number;
  chequeAmount?: number;
  chequeNumber?: string;
  paymentMethod: string;
  reference?: string;
  status: string;
}

interface NotificationItem {
  id: string;
  type: 'direct_debit' | 'payment';
  title: string;
  subtitle: string;
  timestamp: Date;
  icon: React.ReactNode;
  isRead: boolean;
  amount?: number;
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Fetch direct debits (using default fetcher pattern)
  const { data: directDebits = [], isLoading: debitsLoading, error: debitsError } = useQuery<DirectDebit[]>({
    queryKey: ["/api/direct-debits"],
  });

  // Fetch recent payments (using default fetcher pattern)
  const { data: recentPayments = [], isLoading: paymentsLoading, error: paymentsError } = useQuery<PaymentTracking[]>({
    queryKey: ["/api/payments/tracking", { limit: 10 }],
  });

  // Get payment icon
  const getPaymentIcon = () => <CreditCard className="h-4 w-4 text-green-500" />;

  // Get direct debit icon
  const getDirectDebitIcon = (isStandingOrder: boolean) => 
    isStandingOrder ? <RotateCcw className="h-4 w-4 text-orange-500" /> : <Banknote className="h-4 w-4 text-blue-500" />;

  // Currency formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  // Check loading states
  const isLoading = debitsLoading || paymentsLoading;
  const hasError = debitsError || paymentsError;

  // Filter direct debits to show only upcoming (within 7 days from now)
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingDirectDebits = directDebits.filter(debit => {
    if (!debit.nextPaymentDate || !debit.isActive) return false;
    const nextPayment = new Date(debit.nextPaymentDate);
    return nextPayment >= now && nextPayment <= weekFromNow;
  });

  // Combine all notifications
  const notifications: NotificationItem[] = [
    // Recent payments
    ...recentPayments.slice(0, 5).map(payment => ({
      id: `payment-${payment.id}`,
      type: 'payment' as const,
      title: `Payment to ${payment.supplierName}`,
      subtitle: `${payment.branchName} • ${payment.paymentMethod}`,
      timestamp: new Date(payment.paymentDate),
      icon: getPaymentIcon(),
      isRead: readNotifications.has(`payment-${payment.id}`),
      amount: payment.totalAmount,
    })),
    // Direct debits (only upcoming within 7 days)
    ...upcomingDirectDebits.slice(0, 3).map(debit => ({
      id: `debit-${debit.id}`,
      type: 'direct_debit' as const,
      title: `${debit.frequency ? 'Standing Order' : 'Direct Debit'} Scheduled`,
      subtitle: `${debit.recipientName} • ${debit.branchName}`,
      timestamp: new Date(debit.nextPaymentDate!),
      icon: getDirectDebitIcon(!!debit.frequency),
      isRead: readNotifications.has(`debit-${debit.id}`),
      amount: debit.amount,
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Handle marking notifications as read
  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const currentRead = Array.from(readNotifications);
    setReadNotifications(new Set([...currentRead, ...allIds]));
  };

  const markAsRead = (notificationId: string) => {
    const currentRead = Array.from(readNotifications);
    setReadNotifications(new Set([...currentRead, notificationId]));
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative" 
          data-testid="button-notifications"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span 
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
              data-testid="badge-notification-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80" data-testid="dropdown-notifications">
        <div className="flex items-center justify-between p-3">
          <h4 className="font-semibold text-sm" data-testid="text-notifications-header">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs" 
              onClick={markAllAsRead}
              data-testid="button-mark-all-read"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-6 text-center" data-testid="loading-notifications">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : hasError ? (
          <div className="p-6 text-center" data-testid="error-notifications">
            <div className="text-red-500 mb-2">⚠️</div>
            <p className="text-sm text-muted-foreground mb-2">Failed to load notifications</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center" data-testid="text-no-notifications">
            <BellIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No recent notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => markAsRead(notification.id)}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-notification-title-${notification.id}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate" data-testid={`text-notification-subtitle-${notification.id}`}>
                            {notification.subtitle}
                          </p>
                          {notification.amount && (
                            <p className="text-xs font-medium text-green-600 mt-1" data-testid={`text-notification-amount-${notification.id}`}>
                              {formatCurrency(notification.amount)}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-muted-foreground" data-testid={`text-notification-time-${notification.id}`}>
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-1 ml-auto" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs" data-testid="button-view-all-notifications">
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
