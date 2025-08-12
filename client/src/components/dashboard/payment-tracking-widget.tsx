import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, CreditCard, Banknote } from "lucide-react";
import { format } from "date-fns";

interface PaymentTrackingWidgetProps {
  branchId?: number;
}

export function PaymentTrackingWidget({ branchId }: PaymentTrackingWidgetProps) {
  // Get recent payments for the selected branch
  const { data: recentPayments = [], isLoading } = useQuery({
    queryKey: ["/api/payments/tracking", { branchId }],
    select: (data: any[]) => data.slice(0, 5), // Show only 5 recent payments
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Recent Payments</CardTitle>
        <Link href="/payment-tracking">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="w-3/4 h-4 bg-muted rounded"></div>
                  <div className="w-1/2 h-3 bg-muted rounded"></div>
                </div>
                <div className="w-20 h-4 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        ) : recentPayments.length > 0 ? (
          <div className="space-y-3">
            {recentPayments.map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {getPaymentIcon(payment)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{payment.supplierName}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(payment.paymentDate), "MMM dd, yyyy")} • {getPaymentMethod(payment)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">
                    {formatCurrency(payment.totalAmount)}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {payment.branchName}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No recent payments found</p>
            <Link href="/payment-tracking">
              <Button variant="outline" size="sm" className="mt-4">
                View Payment Tracking
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}