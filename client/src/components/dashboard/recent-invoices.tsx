import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronRight, Eye } from "lucide-react";

interface InvoiceStatusProps {
  status: string;
}

function InvoiceStatus({ status }: InvoiceStatusProps) {
  return (
    <Badge 
      className={cn(
        "capitalize",
        status === "paid" ? "bg-success/10 text-success hover:bg-success/20" :
        status === "partially_paid" ? "bg-warning/10 text-warning hover:bg-warning/20" :
        "bg-destructive/10 text-destructive hover:bg-destructive/20"
      )}
      variant="outline"
    >
      {status.replace('_', ' ')}
    </Badge>
  );
}

export function RecentInvoices() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["/api/invoices"],
  });

  // Get only the most recent 4 invoices
  const recentInvoices = invoices ? invoices.slice(0, 4) : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Recent Invoices</CardTitle>
        <Link 
          href="/invoices" 
          className="text-primary text-sm flex items-center hover:underline"
        >
          <span>View All</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-left">
              <tr>
                <th className="p-3 bg-muted/50 text-muted-foreground text-sm font-medium">Invoice #</th>
                <th className="p-3 bg-muted/50 text-muted-foreground text-sm font-medium">Supplier</th>
                <th className="p-3 bg-muted/50 text-muted-foreground text-sm font-medium">Date</th>
                <th className="p-3 bg-muted/50 text-muted-foreground text-sm font-medium">Amount</th>
                <th className="p-3 bg-muted/50 text-muted-foreground text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="p-3 border-t border-gray-200">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-3 border-t border-gray-200">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="p-3 border-t border-gray-200">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-3 border-t border-gray-200">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="p-3 border-t border-gray-200">
                      <Skeleton className="h-4 w-16" />
                    </td>
                  </tr>
                ))
              ) : recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">
                    No recent invoices found
                  </td>
                </tr>
              ) : (
                recentInvoices.map((invoice: any) => (
                  <tr key={invoice.id} className="hover:bg-muted/50">
                    <td className="p-3 border-t border-gray-200">{invoice.invoiceNumber}</td>
                    <td className="p-3 border-t border-gray-200">{invoice.supplier?.name || "Unknown"}</td>
                    <td className="p-3 border-t border-gray-200">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="p-3 border-t border-gray-200">${invoice.amount.toLocaleString()}</td>
                    <td className="p-3 border-t border-gray-200">
                      <InvoiceStatus status={invoice.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
