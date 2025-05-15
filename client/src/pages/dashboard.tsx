import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { BranchPerformance } from "@/components/dashboard/branch-performance";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { Button } from "@/components/ui/button";
import { 
  CalendarIcon, 
  PlusIcon, 
  Wallet, 
  ShoppingBag, 
  Receipt, 
  Landmark,
  ArrowDownRight,
  ArrowUpRight
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";

export default function Dashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState("month");
  
  // Define types for API response
  interface BranchSummary {
    id: number;
    name: string;
    totalAmount: number;
    outstandingAmount: number;
  }
  
  interface SupplierSummary {
    id: number;
    name: string;
    totalAmount: number;
    outstandingAmount: number;
  }
  
  interface DashboardSummary {
    totalInvoiceAmount: number;
    totalOutstandingAmount: number;
    branchData: BranchSummary[];
    supplierData: SupplierSummary[];
  }

  // Fetch summary data from the API
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
  });

  // Format numbers as currency (£ Pounds)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Sample trends data (would be calculated from historical data in a full implementation)
  const trends = {
    revenue: { value: "8.2%", direction: "up" as const, text: "vs last month" },
    expenses: { value: "12.5%", direction: "up" as const, text: "vs last month" },
    invoices: { value: "3.7%", direction: "down" as const, text: "vs last month" },
    cashFlow: { value: "5.3%", direction: "up" as const, text: "vs last month" }
  };
  
  // Dashboard data with real or fallback values
  const dashboardData = {
    totalRevenue: summaryData 
      ? formatCurrency(summaryData.totalInvoiceAmount) 
      : "£124,563.00",
    totalExpenses: "£86,423.50", // Would be from financial transactions in full implementation
    outstandingInvoices: summaryData 
      ? formatCurrency(summaryData.totalOutstandingAmount) 
      : "£34,285.75",
    cashFlow: "£38,139.50", // Would be calculated in full implementation
    trends: trends
  };

  return (
    <div className="py-4 px-1 md:px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold">Welcome back, {user?.fullName || 'Admin'}</h2>
          <p className="text-muted-foreground mt-1">Here's your business overview for the current period</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            <span>This Month</span>
          </Button>
          <Link href="/invoices">
            <Button className="flex items-center gap-1">
              <PlusIcon className="h-4 w-4" />
              <span>New Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={dashboardData.totalRevenue}
          icon={<Wallet className="h-5 w-5" />}
          trend={dashboardData.trends.revenue}
        />
        <StatCard
          title="Total Expenses"
          value={dashboardData.totalExpenses}
          icon={<ShoppingBag className="h-5 w-5" />}
          trend={dashboardData.trends.expenses}
          iconColorClass="text-red-500"
          iconBgClass="bg-red-100 dark:bg-red-900/20"
        />
        <StatCard
          title="Outstanding Invoices"
          value={dashboardData.outstandingInvoices}
          icon={<Receipt className="h-5 w-5" />}
          trend={dashboardData.trends.invoices}
          iconColorClass="text-amber-500"
          iconBgClass="bg-amber-100 dark:bg-amber-900/20"
        />
        <StatCard
          title="Cash Flow"
          value={dashboardData.cashFlow}
          icon={<Landmark className="h-5 w-5" />}
          trend={dashboardData.trends.cashFlow}
          iconColorClass="text-emerald-500"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/20"
        />
      </div>

      {/* Charts and Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Supplier Outstanding Debts</h3>
            <p className="text-sm text-muted-foreground mb-4">Top suppliers by outstanding amount</p>
            
            <div className="space-y-4">
              {isSummaryLoading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
              ) : summaryData?.supplierData?.length ? (
                summaryData.supplierData.slice(0, 4).map((supplier: any) => {
                  // Calculate percentage of outstanding debt
                  const percentage = supplier.totalAmount ? 
                    Math.round((supplier.outstandingAmount / supplier.totalAmount) * 100) : 0;
                  
                  return (
                    <div key={supplier.id}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{supplier.name}</span>
                        <span className="text-sm font-medium">{formatCurrency(supplier.outstandingAmount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-amber-500 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No supplier debt data available
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Branch Data */}
      <div className="mb-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Branch Outstanding Debts</h3>
          <div className="overflow-x-auto">
            {isSummaryLoading ? (
              <div className="flex items-center justify-center p-6">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            ) : summaryData?.branchData?.length ? (
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th className="pb-2 font-medium">Branch</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">Outstanding</th>
                    <th className="pb-2 font-medium">Paid %</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {summaryData.branchData.slice(0, 5).map((branch: any) => (
                    <tr key={branch.id} className="hover:bg-muted/50">
                      <td className="py-3">{branch.name}</td>
                      <td className="py-3">{formatCurrency(branch.totalAmount)}</td>
                      <td className="py-3">{formatCurrency(branch.outstandingAmount)}</td>
                      <td className="py-3">
                        {branch.totalAmount ? 
                          Math.round(((branch.totalAmount - branch.outstandingAmount) / branch.totalAmount) * 100) + '%' 
                          : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/20">
                <p className="text-muted-foreground">No branch debt data available</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Invoices and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentInvoices />
        <RecentActivities />
      </div>
    </div>
  );
}
