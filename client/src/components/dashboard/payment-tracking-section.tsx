import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, CreditCard, Banknote, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface PaymentTrackingSectionProps {
  branchId?: number;
}

export function PaymentTrackingSection({ branchId }: PaymentTrackingSectionProps) {
  // Get recent payments for the selected branch
  const { data: recentPayments = [], isLoading } = useQuery({
    queryKey: ["/api/payments/tracking", { branchId }],
    queryFn: async () => {
      const url = branchId 
        ? `/api/payments/tracking?branchId=${branchId}`
        : '/api/payments/tracking';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch payment tracking data');
      return res.json();
    },
    select: (data: any[]) => data.slice(0, 3), // Show only 3 recent payments in overview
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getPaymentIcon = (payment: any) => {
    if (payment.bankTransferAmount > 0 && payment.chequeAmount > 0) {
      return <CreditCard className="h-4 w-4" />;
    } else if (payment.bankTransferAmount > 0) {
      return <CreditCard className="h-4 w-4" />;
    } else if (payment.chequeAmount > 0) {
      return <Banknote className="h-4 w-4" />;
    }
    return <CreditCard className="h-4 w-4" />;
  };

  const getPaymentMethod = (payment: any) => {
    if (payment.bankTransferAmount > 0 && payment.chequeAmount > 0) {
      return "Mixed";
    } else if (payment.bankTransferAmount > 0) {
      return "Bank Transfer";
    } else if (payment.chequeAmount > 0) {
      return "Cheque";
    }
    return "Cash";
  };

  // Calculate payment statistics
  const totalPayments = recentPayments.length;
  const totalAmount = recentPayments.reduce((sum: number, payment: any) => sum + payment.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-3 border-l-4 border-l-blue-500" data-testid="payment-stats-recent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground" data-testid="text-recent-payments-label">Recent Payments</p>
              <p className="text-lg font-semibold" data-testid="text-recent-payments-count">{totalPayments}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-3 border-l-4 border-l-green-500" data-testid="payment-stats-total">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground" data-testid="text-total-amount-label">Total Amount</p>
              <p className="text-lg font-semibold" data-testid="text-total-amount-value">{formatCurrency(totalAmount)}</p>
            </div>
            <CreditCard className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Recent Payments List */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-medium" data-testid="text-recent-payments-header">Recent Payments</h5>
          <Link href="/payment-tracking">
            <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs" data-testid="button-view-all-payments">
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-6 h-6 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="w-2/3 h-3 bg-muted rounded"></div>
                  <div className="w-1/3 h-2 bg-muted rounded"></div>
                </div>
                <div className="w-16 h-3 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        ) : recentPayments.length > 0 ? (
          <div className="space-y-2">
            {recentPayments.map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between p-2 rounded border hover:bg-muted/30 transition-colors" data-testid={`payment-item-${payment.id}`}>
                <div className="flex items-center space-x-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {getPaymentIcon(payment)}
                  </div>
                  <div>
                    <div className="font-medium text-sm" data-testid={`text-supplier-name-${payment.id}`}>{payment.supplierName}</div>
                    <div className="text-xs text-muted-foreground" data-testid={`text-payment-details-${payment.id}`}>
                      {format(new Date(payment.paymentDate), "MMM dd")} • {getPaymentMethod(payment)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm" data-testid={`text-payment-amount-${payment.id}`}>
                    {formatCurrency(payment.totalAmount)}
                  </div>
                  <Badge variant="secondary" className="text-xs" data-testid={`badge-payment-status-${payment.id}`}>
                    Paid
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No recent payments</p>
          </div>
        )}
      </Card>
    </div>
  );
}