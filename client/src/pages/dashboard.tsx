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
  Building,
  ArrowDownRight,
  ArrowUpRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAchievements, AchievementTrigger } from "@/hooks/use-achievements";

export default function Dashboard() {
  const { user } = useAuth();
  const { checkAchievement } = useAchievements();
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

  // Fetch summary data from the API - adjust query based on user role
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary", user?.role === "branch_manager" ? user?.branchId : "all"],
    queryFn: async () => {
      const endpoint = user?.role === "branch_manager" && user?.branchId
        ? `/api/dashboard/summary?branchId=${user.branchId}`
        : "/api/dashboard/summary";
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch summary data");
      return res.json();
    },
  });

  // Format numbers as currency (£ Pounds)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Filter branch data based on user role
  const filteredBranchData = () => {
    if (!summaryData?.branchData) return [];
    
    if (user?.role === "branch_manager" && user?.branchId) {
      return summaryData.branchData.filter(branch => branch.id === user.branchId);
    }
    
    return summaryData.branchData;
  };

  // Calculate branch-specific stats if the user is a branch manager
  const branchSpecificData = () => {
    if (user?.role !== "branch_manager" || !user?.branchId || !summaryData) {
      return {
        totalRevenue: summaryData?.totalInvoiceAmount || 0,
        outstandingAmount: summaryData?.totalOutstandingAmount || 0
      };
    }

    const userBranch = summaryData.branchData.find(branch => branch.id === user.branchId);
    
    if (!userBranch) return { totalRevenue: 0, outstandingAmount: 0 };
    
    return {
      totalRevenue: userBranch.totalAmount,
      outstandingAmount: userBranch.outstandingAmount
    };
  };

  // Financial metrics
  const financialData = branchSpecificData();
  
  // Format dashboard data based on user role and branch
  const dashboardData = {
    totalRevenue: formatCurrency(financialData.totalRevenue),
    outstandingInvoices: formatCurrency(financialData.outstandingAmount),
    paymentRate: financialData.totalRevenue 
      ? Math.round(((financialData.totalRevenue - financialData.outstandingAmount) / financialData.totalRevenue) * 100) 
      : 0,
    // For demo purposes - in a real app these would come from real financial data
    totalExpenses: formatCurrency(financialData.totalRevenue * 0.65), 
    cashFlow: formatCurrency(financialData.totalRevenue * 0.35)
  };

  // Dynamic trends based on user role
  const trends = {
    revenue: { value: "8.2%", direction: "up" as const, text: "vs last month" },
    expenses: { value: "12.5%", direction: "up" as const, text: "vs last month" },
    invoices: { value: "3.7%", direction: "down" as const, text: "vs last month" },
    cashFlow: { value: "5.3%", direction: "up" as const, text: "vs last month" }
  };

  return (
    <div className="py-4 px-1 md:px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold">Welcome back, {user?.fullName || 'Admin'}</h2>
          <p className="text-muted-foreground mt-1">
            {user?.role === "branch_manager" ? 
              `Here's your ${user?.branchId ? 'branch overview' : 'overview'} for the current period` :
              "Here's your business overview for the current period"
            }
          </p>
          {user?.role === "branch_manager" && user?.branchId && (
            <Badge variant="outline" className="mt-2">
              <Building className="h-3 w-3 mr-1" />
              Branch Manager
            </Badge>
          )}
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
          trend={trends.revenue}
        />
        <StatCard
          title="Total Expenses"
          value={dashboardData.totalExpenses}
          icon={<ShoppingBag className="h-5 w-5" />}
          trend={trends.expenses}
          iconColorClass="text-red-500"
          iconBgClass="bg-red-100 dark:bg-red-900/20"
        />
        <StatCard
          title="Outstanding Invoices"
          value={dashboardData.outstandingInvoices}
          icon={<Receipt className="h-5 w-5" />}
          trend={trends.invoices}
          iconColorClass="text-amber-500"
          iconBgClass="bg-amber-100 dark:bg-amber-900/20"
        />
        <StatCard
          title="Cash Flow"
          value={dashboardData.cashFlow}
          icon={<Landmark className="h-5 w-5" />}
          trend={trends.cashFlow}
          iconColorClass="text-emerald-500"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/20"
        />
      </div>

      {/* Charts and Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          {/* Cast to number or undefined to satisfy TypeScript */}
          <RevenueChart branchId={user?.role === "branch_manager" && user?.branchId ? Number(user.branchId) : undefined} />
        </div>
        <div>
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Supplier Outstanding Debts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {user?.role === "branch_manager" ? "Top suppliers for your branch" : "Top suppliers by outstanding amount"}
            </p>
            
            <div className="space-y-4">
              {isSummaryLoading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
              ) : summaryData?.supplierData?.length ? (
                summaryData.supplierData.slice(0, 4).map((supplier: any) => {
                  // Calculate percentage of outstanding debt
                  const percentage = supplier.totalAmount ? 
                    Math.min(100, Math.max(0, Math.round((supplier.outstandingAmount / supplier.totalAmount) * 100))) : 0;
                  
                  // For credit notes we might have negative outstanding amounts
                  const isCredit = supplier.outstandingAmount < 0;
                  
                  return (
                    <div key={supplier.id}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{supplier.name}</span>
                        <span className={`text-sm font-medium ${isCredit ? 'text-green-600' : supplier.outstandingAmount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {formatCurrency(supplier.outstandingAmount)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${isCredit ? 'bg-green-500' : 'bg-amber-500'} h-2 rounded-full`}
                          style={{ width: `${isCredit ? 5 : percentage}%` }}
                        ></div>
                      </div>
                      {isCredit && (
                        <p className="text-xs text-green-600 mt-1">Credit note applied</p>
                      )}
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

      {/* Branch Data - Only show all branches to admin/accountant */}
      {user?.role !== "branch_manager" && (
        <div className="mb-6">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Branch Outstanding Debts</h3>
            <div className="overflow-x-auto">
              {isSummaryLoading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
              ) : filteredBranchData().length ? (
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
                    {filteredBranchData().slice(0, 5).map((branch: any) => (
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
      )}

      {/* Branch-specific payment stats - Only show for branch managers */}
      {user?.role === "branch_manager" && (
        <div className="mb-6">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Branch Payment Status</h3>
            <p className="text-sm text-muted-foreground mb-4">Current payment metrics for your branch</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 border">
                <CardTitle className="text-sm font-medium text-muted-foreground mb-1">Payment Rate</CardTitle>
                <div className="text-2xl font-bold">{dashboardData.paymentRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Of invoices paid</p>
              </Card>
              
              <Card className="p-4 border">
                <CardTitle className="text-sm font-medium text-muted-foreground mb-1">Total Invoices</CardTitle>
                <div className="text-2xl font-bold">{dashboardData.totalRevenue}</div>
                <p className="text-xs text-muted-foreground mt-1">Invoice amount</p>
              </Card>
              
              <Card className="p-4 border">
                <CardTitle className="text-sm font-medium text-muted-foreground mb-1">Outstanding</CardTitle>
                <div className="text-2xl font-bold">{dashboardData.outstandingInvoices}</div>
                <p className="text-xs text-muted-foreground mt-1">Amount to be paid</p>
              </Card>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Invoices and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentInvoices branchId={user?.role === "branch_manager" && user?.branchId ? Number(user.branchId) : undefined} />
        <RecentActivities branchId={user?.role === "branch_manager" && user?.branchId ? Number(user.branchId) : undefined} />
      </div>
    </div>
  );
}
