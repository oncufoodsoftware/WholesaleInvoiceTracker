import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Building, TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BranchFinancialOverviewProps {
  branchId: number;
}

interface BranchSummary {
  id: number;
  name: string;
  totalAmount: number;
  outstandingAmount: number;
}

interface DashboardSummary {
  totalInvoiceAmount: number;
  totalOutstandingAmount: number;
  branchData: BranchSummary[];
  supplierData: any[];
}

export function BranchFinancialOverview({ branchId }: BranchFinancialOverviewProps) {
  const { data: summaryData, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary", { branchId }],
    enabled: !!branchId,
  });

  // Get current month date range for financial data
  const getCurrentMonthRange = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    };
  };

  const dateRange = getCurrentMonthRange();

  const { data: monthlyFinancialSummary, isLoading: isFinancialLoading } = useQuery({
    queryKey: ["/api/financial-transactions/summary/range", { 
      branchId, 
      startDate: dateRange.startDate, 
      endDate: dateRange.endDate 
    }],
    enabled: !!branchId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading || isFinancialLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Branch Financial Overview
          </CardTitle>
          <CardDescription>Your branch's financial summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const branchData = summaryData?.branchData?.find(b => b.id === branchId);
  const totalRevenue = monthlyFinancialSummary?.totalSales || 0;
  const totalExpenses = monthlyFinancialSummary?.totalExpenses || 0;
  const outstandingAmount = branchData?.outstandingAmount || 0;
  const totalInvoices = branchData?.totalAmount || 0;
  
  const paymentRate = totalInvoices > 0
    ? Math.round(((totalInvoices - outstandingAmount) / totalInvoices) * 100)
    : 0;

  const cashFlow = totalRevenue - totalExpenses;
  const isCashFlowPositive = cashFlow >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Branch Financial Overview
        </CardTitle>
        <CardDescription>
          {branchData?.name || 'Your branch'}'s financial summary
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">Current period</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="text-sm text-muted-foreground">Total Expenses</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-muted-foreground">Current period</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <p className="text-sm text-muted-foreground">Outstanding</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(outstandingAmount)}</p>
            <div className="flex items-center gap-2">
              <Badge variant={paymentRate >= 80 ? "default" : "destructive"} className="text-xs">
                {paymentRate}% Paid
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-muted-foreground">Cash Flow</p>
            </div>
            <p className={`text-2xl font-bold ${isCashFlowPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(cashFlow)}
            </p>
            <p className="text-xs text-muted-foreground">
              {isCashFlowPositive ? 'Positive' : 'Negative'} flow
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
