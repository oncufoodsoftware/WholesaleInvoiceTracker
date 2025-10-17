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
  ArrowUpRight,
  CreditCard,
  Banknote,
  ArrowDownUp
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAchievements, AchievementTrigger } from "@/hooks/use-achievements";
import { FinancialTipTooltip, CashFlowTipTooltip, AnalyticsTipTooltip } from "@/components/financial-tip-tooltip";
import { PaymentTrackingWidget } from "@/components/dashboard/payment-tracking-widget";
import { PaymentTrackingSection } from "@/components/dashboard/payment-tracking-section";
import { DirectDebitsWidget } from "@/components/dashboard/direct-debits-widget";

export default function Dashboard() {
  const { user } = useAuth();
  const { checkAchievement } = useAchievements();
  const [timeframe, setTimeframe] = useState("month");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  // Modern date range state like Finances page
  const [dateRangeType, setDateRangeType] = useState(() => {
    return localStorage.getItem('dashboard-date-range') || "custom";
  });
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    return localStorage.getItem('dashboard-custom-start-date') || "2025-07-08";
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return localStorage.getItem('dashboard-custom-end-date') || "2025-07-08";
  });
  
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

  // Get branches for admin dropdown
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    enabled: user?.role !== "branch_manager",
  });

  // Set initial branch selection for admin users
  useEffect(() => {
    if (user?.role !== "branch_manager" && (branches as any[]).length > 0 && !selectedBranchId) {
      setSelectedBranchId((branches as any[])[0].id.toString());
    }
  }, [user, branches, selectedBranchId]);

  // Determine which branch to use for data fetching
  const currentBranchId = user?.role === "branch_manager" 
    ? user?.branchId?.toString() 
    : selectedBranchId;

  // Fetch summary data from the API - adjust query based on user role
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary", currentBranchId],
    queryFn: async () => {
      const endpoint = currentBranchId && currentBranchId !== "all"
        ? `/api/dashboard/summary?branchId=${currentBranchId}`
        : "/api/dashboard/summary";
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch summary data");
      return res.json();
    },
    enabled: !!currentBranchId || user?.role === "branch_manager",
  });

  // Calculate date range based on selection (same logic as Finances)
  const getDateRange = () => {
    let startDate = "2025-07-08"; // Default with data
    let endDate = "2025-07-08";
    
    switch (dateRangeType) {
      case "today":
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        startDate = endDate = todayStr;
        break;
      case "yesterday":
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        startDate = endDate = yesterdayStr;
        break;
      case "week":
        const currentDate = new Date();
        // Get Monday of current week (start of week) - Monday = 1, Sunday = 0
        const dayOfWeek = currentDate.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days to Monday
        
        const currentWeekStart = new Date(currentDate);
        currentWeekStart.setDate(currentDate.getDate() - daysToMonday); // Monday
        
        // Get Sunday of current week (end of week)  
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Sunday
        
        startDate = `${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, '0')}-${String(currentWeekStart.getDate()).padStart(2, '0')}`;
        endDate = `${currentWeekEnd.getFullYear()}-${String(currentWeekEnd.getMonth() + 1).padStart(2, '0')}-${String(currentWeekEnd.getDate()).padStart(2, '0')}`;
        break;
      case "month":
        const now = new Date();
        // First day of current month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        // Last day of current month
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-${String(monthStart.getDate()).padStart(2, '0')}`;
        endDate = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
        break;
      case "year":
        const yearEnd = new Date();
        const yearStart = new Date();
        yearStart.setFullYear(yearEnd.getFullYear() - 1);
        startDate = `${yearStart.getFullYear()}-${String(yearStart.getMonth() + 1).padStart(2, '0')}-${String(yearStart.getDate()).padStart(2, '0')}`;
        endDate = `${yearEnd.getFullYear()}-${String(yearEnd.getMonth() + 1).padStart(2, '0')}-${String(yearEnd.getDate()).padStart(2, '0')}`;
        break;
      case "custom":
        startDate = customStartDate;
        endDate = customEndDate;
        break;
    }
    
    return { startDate, endDate };
  };

  // Get formatted date range display
  const getDateRangeDisplay = () => {
    const { startDate, endDate } = getDateRange();
    
    const formatDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };
    
    if (startDate === endDate) {
      return formatDate(startDate);
    } else {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
  };

  // Save date range to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-date-range', dateRangeType);
    localStorage.setItem('dashboard-custom-start-date', customStartDate);
    localStorage.setItem('dashboard-custom-end-date', customEndDate);
  }, [dateRangeType, customStartDate, customEndDate]);

  // Fetch financial transactions data for Total Revenue and Expenses calculation
  const { data: monthlyFinancialSummary } = useQuery({
    queryKey: ["/api/financial-transactions/summary/range", currentBranchId, dateRangeType, customStartDate, customEndDate],
    queryFn: async () => {
      if (!currentBranchId) return null;
      
      const { startDate, endDate } = getDateRange();
      
      const url = `/api/financial-transactions/summary/range?branchId=${currentBranchId}&startDate=${startDate}&endDate=${endDate}`;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch financial data");
      return res.json();
    },
    enabled: !!currentBranchId,
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

  // Calculate revenue from financial transactions (includes date filtering)
  const calculateTotalRevenue = () => {
    if (!monthlyFinancialSummary) return 0;
    
    // Use totalSales from the monthly financial summary (handles date range filtering)
    return monthlyFinancialSummary.totalSales || 0;
  };

  // Calculate expenses from financial transactions
  const calculateTotalExpenses = () => {
    if (!monthlyFinancialSummary) return 0;
    
    // Use totalExpenses from the monthly financial summary
    return monthlyFinancialSummary.totalExpenses || 0;
  };

  // Calculate branch-specific stats - all data should be current and filtered by date range
  const branchSpecificData = () => {
    const totalRevenue = calculateTotalRevenue();
    const totalExpenses = calculateTotalExpenses();
    
    // Outstanding amount should come from summary data (current state, not date-filtered)
    if (user?.role === "branch_manager" && user?.branchId && summaryData) {
      const userBranch = summaryData.branchData.find(branch => branch.id === user.branchId);
      return {
        totalRevenue,
        totalExpenses,
        outstandingAmount: userBranch?.outstandingAmount || 0
      };
    }
    
    return {
      totalRevenue,
      totalExpenses,
      outstandingAmount: summaryData?.totalOutstandingAmount || 0
    };
  };

  // Financial metrics
  const dashboardFinancialData = branchSpecificData();
  
  // Check for financial achievements when data loads
  useEffect(() => {
    if (dashboardFinancialData.totalRevenue > 0) {
      // Check sales milestone achievement
      checkAchievement(AchievementTrigger.SALES_MILESTONE, {
        value: dashboardFinancialData.totalRevenue,
        period: 'this period'
      });
      
      // Check for positive cash flow achievement
      const cashFlowAmount = dashboardFinancialData.totalRevenue * 0.35;
      if (cashFlowAmount > 0) {
        checkAchievement(AchievementTrigger.POSITIVE_CASH_FLOW, {
          period: 'this month',
          amount: cashFlowAmount
        });
      }
      
      // Check payment rate achievement (fully paid invoices)
      const paymentRate = dashboardFinancialData.totalRevenue 
        ? ((dashboardFinancialData.totalRevenue - dashboardFinancialData.outstandingAmount) / dashboardFinancialData.totalRevenue) * 100
        : 0;
        
      if (paymentRate >= 95) {
        checkAchievement(AchievementTrigger.ALL_INVOICES_PAID);
      }
    }
  }, [dashboardFinancialData, checkAchievement]);
  
  // Format dashboard data based on user role and branch
  const dashboardData = {
    totalRevenue: formatCurrency(dashboardFinancialData.totalRevenue),
    totalExpenses: formatCurrency(dashboardFinancialData.totalExpenses),
    outstandingInvoices: formatCurrency(dashboardFinancialData.outstandingAmount),
    paymentRate: dashboardFinancialData.totalRevenue 
      ? Math.round(((dashboardFinancialData.totalRevenue - dashboardFinancialData.outstandingAmount) / dashboardFinancialData.totalRevenue) * 100) 
      : 0,
    cashFlow: formatCurrency(dashboardFinancialData.totalRevenue - dashboardFinancialData.totalExpenses)
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
        <Link href="/invoices">
          <Button className="flex items-center gap-1">
            <PlusIcon className="h-4 w-4" />
            <span>New Invoice</span>
          </Button>
        </Link>
        </div>

      {/* Modern Date and Branch Selection Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user?.role !== "branch_manager" && (
              <div>
                <Label>Select Branch</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {(branches as any[]).map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Select Date Range</Label>
              <Select value={dateRangeType} onValueChange={(value) => {
                setDateRangeType(value);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-2 text-sm text-muted-foreground">
                Period: {getDateRangeDisplay()}
              </div>
            </div>
          </div>
          {dateRangeType === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex gap-2 justify-end mb-4">
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={
            <div className="flex items-center gap-2">
              Total Revenue
              <CashFlowTipTooltip variant="compact" />
            </div>
          }
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
          title={
            <div className="flex items-center gap-2">
              Outstanding Invoices
              <FinancialTipTooltip category="invoices" variant="compact" />
            </div>
          }
          value={dashboardData.outstandingInvoices}
          icon={<Receipt className="h-5 w-5" />}
          trend={trends.invoices}
          iconColorClass="text-amber-500"
          iconBgClass="bg-amber-100 dark:bg-amber-900/20"
        />
        <StatCard
          title={
            <div className="flex items-center gap-2">
              Cash Flow
              <CashFlowTipTooltip variant="compact" />
            </div>
          }
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
                summaryData.supplierData.slice(0, 7).map((supplier: any) => {
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

      {/* Direct Debits & Standing Orders - Only show for branch managers */}
      {user?.role === "branch_manager" && user?.branchId && (
        <div className="mb-6">
          <DirectDebitsWidget branchId={user.branchId} />
        </div>
      )}

      {/* Recent Invoices and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentInvoices branchId={user?.role === "branch_manager" && user?.branchId ? Number(user.branchId) : (selectedBranchId ? parseInt(selectedBranchId) : undefined)} />
        
        {/* System Activity Logs */}
        <RecentActivities />
      </div>
      
      {/* Payment Tracking Section */}
      <div className="mt-6">
        <PaymentTrackingWidget branchId={user?.role === "branch_manager" && user?.branchId ? Number(user.branchId) : (selectedBranchId ? parseInt(selectedBranchId) : undefined)} />
      </div>
    </div>
  );
}
