import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface DailySummaryProps {
  branchId: number;
  date: Date;
  startDate?: string;
  endDate?: string;
  isDateRange?: boolean;
}

export function DailySummary({ branchId, date, startDate, endDate, isDateRange = false }: DailySummaryProps) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["/api/financial-transactions/summary/range", { branchId, startDate, endDate, isDateRange }],
    queryFn: async ({ queryKey }) => {
      // Always use range endpoint for consistency with Dashboard
      const finalStartDate = isDateRange ? startDate : date.toISOString().split("T")[0];
      const finalEndDate = isDateRange ? endDate : date.toISOString().split("T")[0];
      
      const url = `/api/financial-transactions/summary/range?branchId=${branchId}&startDate=${finalStartDate}&endDate=${finalEndDate}`;
      
      console.log("DailySummary API call:", { branchId, startDate: finalStartDate, endDate: finalEndDate, url });
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
    enabled: !!branchId,
  });

  // Format currency
  const formatCurrency = (amount: number | undefined | null) => {
    // Handle NaN, undefined, null, or invalid numbers
    const validAmount = (amount && !isNaN(amount)) ? amount : 0;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(validAmount);
  };

  // Get top expenses
  const getTopExpenses = () => {
    if (!summary || !summary.expenseCategories) return [];
    
    return Object.entries(summary.expenseCategories)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 2);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base font-medium">Daily Financial Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Sales */}
          <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Sales</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">
                {summary ? formatCurrency(summary.totalSales) : "£0.00"}
              </p>
            )}
            <div className="flex justify-between mt-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Card Payments</p>
                {isLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <p className="text-sm font-medium">
                    {summary ? formatCurrency(summary.cardPayments) : "£0.00"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cash Payments</p>
                {isLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <p className="text-sm font-medium">
                    {summary ? formatCurrency(summary.cashPayments) : "£0.00"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Expenses</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">
                {summary ? formatCurrency(summary.totalExpenses) : "£0.00"}
              </p>
            )}
            <div className="mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top Expense Categories</p>
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-full" />
                </>
              ) : getTopExpenses().length > 0 ? (
                getTopExpenses().map(([category, amount], index) => (
                  <div key={index} className="flex items-center gap-1 text-sm">
                    <span className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-destructive' : 'bg-warning'}`}></span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {category}: {formatCurrency(amount as number)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No expenses recorded</p>
              )}
            </div>
          </div>

          {/* Net Balance */}
          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Net Balance</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">
                {summary ? formatCurrency(summary.netBalance) : "£0.00"}
              </p>
            )}
            <div className="mt-2">
              {isLoading ? (
                <>
                  <Skeleton className="h-2 w-full mb-1" />
                  <Skeleton className="h-4 w-24" />
                </>
              ) : summary ? (
                <>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min(Math.max((summary.totalSales / (summary.totalSales + summary.totalExpenses)) * 100, 0), 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {summary.totalSales > 0
                      ? `${Math.round((summary.netBalance / summary.totalSales) * 100)}% profit margin`
                      : "0% profit margin"}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">No data available</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
