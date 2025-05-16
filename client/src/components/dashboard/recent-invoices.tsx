import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Building, ArrowDown } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Invoice } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

interface RecentInvoicesProps {
  branchId?: number;
}

export function RecentInvoices({ branchId }: RecentInvoicesProps) {
  const { user } = useAuth();
  
  // Fetch invoices with optional branch filter
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices", branchId],
    queryFn: async () => {
      // If branch manager, filter by their branch
      const url = branchId 
        ? `/api/invoices/filter`
        : "/api/invoices";
        
      const fetchOptions = branchId ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId })
      } : undefined;
      
      const res = await fetch(url, fetchOptions);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
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

  // Get title based on branch filter
  const getTitle = () => {
    if (branchId && user?.role === "branch_manager") {
      return "Branch Invoices";
    }
    return "Recent Invoices";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base font-medium">{getTitle()}</CardTitle>
            <CardDescription>
              {branchId 
                ? "Latest branch transactions" 
                : "Latest transactions across all branches"}
            </CardDescription>
          </div>
          {branchId && (
            <Badge variant="outline" className="text-xs">
              <Building className="h-3 w-3 mr-1" />
              Branch View
            </Badge>
          )}
        </div>
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
            {invoices.slice(0, 5).map((invoice) => {
              // Check if this is a credit note (to show in red text)
              const isCredit = invoice.type === 'credit_note';
              
              return (
                <div key={invoice.id} className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Receipt className={`mr-2 h-4 w-4 ${isCredit ? 'text-red-500' : 'text-muted-foreground'}`} />
                      <span className={`font-medium ${isCredit ? 'text-red-500' : ''}`}>{invoice.invoiceNumber}</span>
                      {isCredit && (
                        <span className="ml-2 text-xs text-red-500">(Credit)</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.invoiceDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                      {!branchId && (
                        <p className="text-xs text-muted-foreground">
                          Branch #{invoice.branchId}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <p className={`font-medium ${isCredit ? 'text-red-500' : ''}`}>
                      {isCredit ? '-' : ''}{formatCurrency(Math.abs(invoice.amount))}
                    </p>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusClasses(invoice.status)}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                  </div>
                </div>
              );
            })}
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