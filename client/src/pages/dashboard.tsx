import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Receipt,
  Building,
  PlusIcon,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const { user } = useAuth();

  // State for filters
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [datePreset, setDatePreset] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // Helper function to set date range based on preset
  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    
    switch (preset) {
      case "today":
        setDateRange({ from: today, to: today });
        break;
      case "yesterday":
        const yesterday = subDays(today, 1);
        setDateRange({ from: yesterday, to: yesterday });
        break;
      case "thisWeek":
        // Pazartesi - Pazar
        setDateRange({
          from: startOfWeek(today, { weekStartsOn: 1 }),
          to: endOfWeek(today, { weekStartsOn: 1 })
        });
        break;
      case "thisMonth":
        // Ayın 1'i - Ay sonu
        setDateRange({
          from: startOfMonth(today),
          to: endOfMonth(today)
        });
        break;
      case "thisYear":
        setDateRange({
          from: startOfYear(today),
          to: endOfYear(today)
        });
        break;
      case "all":
        setDateRange({ from: undefined, to: undefined });
        break;
      default:
        break;
    }
  };

  // Determine branch ID based on user role and selection
  const branchId = user?.role === "branch_manager" || user?.role === "accountant" 
    ? user?.branchId 
    : selectedBranchId;

  // Build query parameters including date range
  const queryParams = {
    ...(branchId && { branchId }),
    ...(dateRange.from && { startDate: format(dateRange.from, 'yyyy-MM-dd') }),
    ...(dateRange.to && { endDate: format(dateRange.to, 'yyyy-MM-dd') }),
  };

  // Fetch dashboard summary
  const { data: summary, isLoading: summaryLoading } = useQuery<{
    totalInvoiceAmount: number;
    totalCreditNotes: number;
    totalPaidAmount: number;
    totalOutstandingAmount: number;
  }>({
    queryKey: ["/api/dashboard/summary", queryParams],
  });

  // Fetch revenue chart data
  const { data: revenueData } = useQuery<{
    revenue: Array<{ month: string; amount: number }>;
  }>({
    queryKey: ["/api/reports/revenue", queryParams],
  });

  // Fetch recent invoices
  const { data: recentInvoices = [] } = useQuery<Array<any>>({
    queryKey: ["/api/invoices", { ...queryParams, limit: 5 }],
  });

  // Fetch recent payments
  const { data: recentPayments = [] } = useQuery<Array<any>>({
    queryKey: ["/api/payments/tracking", { ...queryParams, limit: 5 }],
  });

  // Fetch all branches (for admin)
  const { data: branches = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/branches"],
    enabled: user?.role === "admin",
  });

  // Fetch top suppliers by balance
  const { data: topSuppliers = [] } = useQuery<Array<any>>({
    queryKey: ["/api/suppliers/top-balance", { ...queryParams, limit: 10 }],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate key metrics
  const totalInvoices = summary?.totalInvoiceAmount || 0;
  const outstanding = summary?.totalOutstandingAmount || 0;
  const paid = summary?.totalPaidAmount || 0;
  const paymentRate = totalInvoices > 0 ? Math.round((paid / totalInvoices) * 100) : 0;

  // Prepare chart data
  const chartData = revenueData?.revenue?.slice(-6) || [];
  
  // Prepare pie chart data for payment status
  const pieData = [
    { name: 'Paid', value: paid, color: '#10b981' },
    { name: 'Outstanding', value: outstanding, color: '#f59e0b' },
  ];

  if (summaryLoading) {
    return (
      <div className="py-6 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                {user?.role === "branch_manager" 
                  ? `Welcome back, ${user?.fullName || 'Manager'}` 
                  : `Welcome back, ${user?.fullName || 'Admin'}`}
              </p>
              {user?.role === "branch_manager" && (
                <Badge variant="outline" className="mt-2">
                  <Building className="h-3 w-3 mr-1" />
                  Branch Manager
                </Badge>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Branch Filter - Only for Admin */}
            {user?.role === "admin" && (
              <Select
                value={selectedBranchId?.toString() || "all"}
                onValueChange={(value) => setSelectedBranchId(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-branch">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date Range Preset - For All Users */}
            <Select
              value={datePreset}
              onValueChange={applyDatePreset}
            >
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-date-preset">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range Picker - Only show when custom is selected */}
            {datePreset === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[280px] justify-start text-left font-normal",
                      !dateRange.from && !dateRange.to && "text-muted-foreground"
                    )}
                    data-testid="button-date-range"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Invoices
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInvoices)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paid Amount
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(paid)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {paymentRate}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(outstanding)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pending payment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Payment Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{paymentRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Collection efficiency
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
              <CardDescription>Distribution of paid vs outstanding amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Latest invoices in the system</CardDescription>
              </div>
              <Link href="/invoices">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentInvoices.length > 0 ? (
                  recentInvoices.slice(0, 5).map((invoice: any) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground truncate">{invoice.supplierName}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                        <Badge variant={invoice.status === 'fully_paid' ? "default" : "secondary"} className="text-xs">
                          {invoice.status === 'fully_paid' ? "Paid" : invoice.status === 'partially_paid' ? 'Partial' : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No recent invoices</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest payment transactions</CardDescription>
              </div>
              <Link href="/payment-tracking">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPayments.length > 0 ? (
                  recentPayments.slice(0, 5).map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{payment.supplierName}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(payment.paymentDate)}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-medium text-green-600">{formatCurrency(payment.totalAmount)}</p>
                        <Badge variant="outline" className="text-xs">
                          {payment.paymentMethod}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No recent payments</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Suppliers by Outstanding Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Suppliers by Outstanding Balance</CardTitle>
              <CardDescription>Suppliers with the highest outstanding amounts</CardDescription>
            </div>
            <Link href="/suppliers">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSuppliers.length > 0 ? (
                <>
                  {topSuppliers.slice(0, 10).map((supplier: any, index: number) => (
                    <div key={supplier.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{supplier.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {supplier.contactPerson || 'No contact person'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-lg text-amber-600">
                          {formatCurrency(supplier.balance || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                      </div>
                    </div>
                  ))}
                  {topSuppliers.length > 10 && (
                    <Link href="/suppliers">
                      <Button variant="outline" className="w-full mt-2">
                        Show More ({topSuppliers.length - 10} more suppliers)
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">No suppliers with outstanding balance</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Commonly used features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/invoices">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <Receipt className="h-5 w-5" />
                  <span className="text-sm">Invoices</span>
                </Button>
              </Link>
              <Link href="/suppliers">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <Building className="h-5 w-5" />
                  <span className="text-sm">Suppliers</span>
                </Button>
              </Link>
              <Link href="/payment-tracking">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <CreditCard className="h-5 w-5" />
                  <span className="text-sm">Payments</span>
                </Button>
              </Link>
              <Link href="/finances">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm">Finances</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
