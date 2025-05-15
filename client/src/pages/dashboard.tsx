import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { BranchPerformance } from "@/components/dashboard/branch-performance";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { Button } from "@/components/ui/button";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState("month");
  
  // In a real application, we would fetch this data from the API
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["/api/dashboard/summary"],
    enabled: false, // Disable actual API call for now
  });

  // Sample data for the dashboard
  const dashboardData = {
    totalRevenue: "$124,563.00",
    totalExpenses: "$86,423.50",
    outstandingInvoices: "$34,285.75",
    cashFlow: "$38,139.50",
    trends: {
      revenue: { value: "8.2%", direction: "up", text: "vs last month" },
      expenses: { value: "12.5%", direction: "up", text: "vs last month" },
      invoices: { value: "3.7%", direction: "down", text: "vs last month" },
      cashFlow: { value: "5.3%", direction: "up", text: "vs last month" }
    }
  };

  return (
    <div className="py-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Dashboard</h2>
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
          icon="payments"
          trend={dashboardData.trends.revenue as any}
        />
        <StatCard
          title="Total Expenses"
          value={dashboardData.totalExpenses}
          icon="shopping_cart"
          trend={dashboardData.trends.expenses as any}
          iconColorClass="text-destructive"
          iconBgClass="bg-destructive/10"
        />
        <StatCard
          title="Outstanding Invoices"
          value={dashboardData.outstandingInvoices}
          icon="receipt_long"
          trend={dashboardData.trends.invoices as any}
          iconColorClass="text-warning"
          iconBgClass="bg-warning/10"
        />
        <StatCard
          title="Cash Flow"
          value={dashboardData.cashFlow}
          icon="account_balance"
          trend={dashboardData.trends.cashFlow as any}
          iconColorClass="text-success"
          iconBgClass="bg-success/10"
        />
      </div>

      {/* Charts and Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <RevenueChart />
        <BranchPerformance />
      </div>

      {/* Recent Invoices and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentInvoices />
        <RecentActivities />
      </div>
    </div>
  );
}
