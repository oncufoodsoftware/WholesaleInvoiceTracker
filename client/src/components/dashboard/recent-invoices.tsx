import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Invoice } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export function RecentInvoices() {
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  // Format currency (£)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Status badge color based on invoice status
  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-700';
      case 'unpaid':
        return 'bg-red-100 text-red-700';
      case 'partially_paid':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'unpaid':
        return 'Unpaid';
      case 'partially_paid':
        return 'Partial';
      default:
        return status;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Recent Invoices</CardTitle>
        <CardDescription>Latest transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : invoices && invoices.length > 0 ? (
          <div className="space-y-4">
            {invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Receipt className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{invoice.invoiceNumber}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(invoice.invoiceDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusClasses(invoice.status)}`}>
                    {getStatusLabel(invoice.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-muted-foreground">No invoice data available</p>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/invoices">
          <Button variant="outline" className="w-full">View All Invoices</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}