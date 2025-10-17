import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Receipt,
  Building,
  PlusIcon,
  ArrowRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const { user } = useAuth();

  // Determine branch ID based on user role
  const branchId = user?.role === "branch_manager" ? user?.branchId : null;

  // Fetch dashboard summary
  const { data: summary, isLoading: summaryLoading } = useQuery<{
    totalInvoiceAmount: number;
    totalOutstandingAmount: number;
  }>({
    queryKey: branchId ? ["/api/dashboard/summary", { branchId }] : ["/api/dashboard/summary"],
  });

  // Fetch revenue chart data
  const { data: revenueData } = useQuery<{
    revenue: Array<{ month: string; amount: number }>;
  }>({
    queryKey: branchId ? ["/api/reports/revenue", { branchId }] : ["/api/reports/revenue"],
  });

  // Fetch recent invoices
  const { data: recentInvoices = [] } = useQuery<Array<any>>({
    queryKey: branchId ? ["/api/invoices", { branchId, limit: 5 }] : ["/api/invoices", { limit: 5 }],
  });

  // Fetch recent payments
  const { data: recentPayments = [] } = useQuery<Array<any>>({
    queryKey: branchId ? ["/api/payments/tracking", { branchId, limit: 5 }] : ["/api/payments/tracking", { limit: 5 }],
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
  const paid = totalInvoices - outstanding;
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
        {/* Header */}
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
          <Link href="/invoices">
            <Button size="lg" className="w-full sm:w-auto">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </Link>
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
                        <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                        <Badge variant={invoice.fullyPaid ? "default" : "secondary"} className="text-xs">
                          {invoice.fullyPaid ? "Paid" : "Pending"}
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
