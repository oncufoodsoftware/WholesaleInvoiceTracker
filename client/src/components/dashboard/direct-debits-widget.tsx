import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format, startOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface DirectDebit {
  id: number;
  branchId: number;
  branchName: string;
  recipientName: string;
  amount: number;
  frequency: string;
  nextPaymentDate: string;
  isActive: boolean;
  category: string;
  accountNumber: string | null;
  sortCode: string | null;
  reference: string | null;
  notes: string | null;
}

interface DirectDebitsWidgetProps {
  branchId?: number;
}

export function DirectDebitsWidget({ branchId }: DirectDebitsWidgetProps) {
  const { data: directDebits = [], isLoading } = useQuery<DirectDebit[]>({
    queryKey: branchId 
      ? ["/api/direct-debits", { branchId }]
      : ["/api/direct-debits"],
    enabled: !!branchId,
  });

  // Get upcoming payments (next 7 days) - includes today and future payments
  const upcomingPayments = directDebits.filter((debit: DirectDebit) => {
    const today = startOfDay(new Date());
    const nextPaymentDate = startOfDay(new Date(debit.nextPaymentDate));
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    // Include payments from today onwards within the next 7 days
    return nextPaymentDate >= today && nextPaymentDate <= sevenDaysFromNow && debit.isActive;
  });

  // Get total monthly amount for active direct debits
  const totalMonthlyAmount = directDebits
    .filter((debit: DirectDebit) => debit.isActive && debit.frequency === 'monthly')
    .reduce((sum, debit) => sum + debit.amount, 0);

  // Get frequency badge color
  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case "weekly": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "monthly": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "quarterly": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "yearly": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Direct Debits & Standing Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Direct Debits & Standing Orders
            </CardTitle>
            <CardDescription className="mt-1">
              Upcoming payments and recurring expenses
            </CardDescription>
          </div>
          <Link href="/direct-debits">
            <Button variant="outline" size="sm" className="flex items-center gap-1" data-testid="link-view-all-direct-debits">
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="text-sm text-muted-foreground mb-1">Total Active</div>
            <div className="text-2xl font-bold">{directDebits.filter(d => d.isActive).length}</div>
            <div className="text-xs text-muted-foreground mt-1">Direct debits</div>
          </div>
          
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="text-sm text-muted-foreground mb-1">Monthly Total</div>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlyAmount)}</div>
            <div className="text-xs text-muted-foreground mt-1">Recurring monthly</div>
          </div>
        </div>

        {/* Upcoming Payments Alert */}
        {upcomingPayments.length > 0 ? (
          <div className="border border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-900/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-orange-800 dark:text-orange-300">
                  Upcoming Payments
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400 mb-3">
                  {upcomingPayments.length} payment{upcomingPayments.length !== 1 ? 's' : ''} due in the next 7 days
                </div>
                <div className="space-y-2">
                  {upcomingPayments.slice(0, 3).map((debit: DirectDebit) => (
                    <div 
                      key={debit.id} 
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border"
                      data-testid={`direct-debit-upcoming-${debit.id}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{debit.recipientName}</div>
                        <div className="text-xs text-muted-foreground">
                          Due: {format(new Date(debit.nextPaymentDate), 'PPP')}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div className="font-medium">{formatCurrency(debit.amount)}</div>
                        <Badge className={getFrequencyColor(debit.frequency)}>
                          {debit.frequency}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {upcomingPayments.length > 3 && (
                    <div className="text-center">
                      <Link href="/direct-debits">
                        <Button variant="link" size="sm" className="text-orange-600 dark:text-orange-400">
                          View {upcomingPayments.length - 3} more upcoming payment{upcomingPayments.length - 3 !== 1 ? 's' : ''}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-6 border rounded-lg bg-muted/20">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming payments in the next 7 days</p>
          </div>
        )}

        {/* Recent Direct Debits */}
        {directDebits.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-3">Recent Direct Debits</div>
            <div className="space-y-2">
              {directDebits.slice(0, 3).map((debit: DirectDebit) => (
                <div 
                  key={debit.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  data-testid={`direct-debit-item-${debit.id}`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{debit.recipientName}</div>
                    <div className="text-xs text-muted-foreground">{debit.category}</div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div className="font-medium text-sm">{formatCurrency(debit.amount)}</div>
                    <Badge variant={debit.isActive ? "default" : "secondary"} className="text-xs">
                      {debit.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
