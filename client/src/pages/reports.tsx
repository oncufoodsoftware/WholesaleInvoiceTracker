import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { FileDownIcon, PrinterIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

// Utility function to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
};

// Pie chart colors
const COLORS = ['#1976d2', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb'];

export default function Reports() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [reportType, setReportType] = useState("financial");

  // Get branches
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
    queryKey: ["/api/branches"],
  });

  // Set default branch for branch managers
  useState(() => {
    if (user && user.role === "branch_manager" && user.branchId) {
      setSelectedBranch(user.branchId.toString());
    } else if (branches.length > 0) {
      setSelectedBranch(branches[0].id.toString());
    }
  });

  // Get invoices for the selected period and branch
  const { 
    data: invoices = [], 
    isLoading: isLoadingInvoices 
  } = useQuery({
    queryKey: ["/api/invoices/filter", { 
      branchId: selectedBranch ? parseInt(selectedBranch) : undefined,
      startDate,
      endDate
    }],
    queryFn: async ({ queryKey }) => {
      const [_, filters] = queryKey;
      if (!selectedBranch) return [];
      const res = await apiRequest("POST", "/api/invoices/filter", filters);
      return await res.json();
    },
    enabled: !!selectedBranch
  });

  // Get financial transactions for the selected period and branch
  const { 
    data: transactions = [], 
    isLoading: isLoadingTransactions 
  } = useQuery({
    queryKey: ["/api/financial-transactions", { 
      branchId: selectedBranch ? parseInt(selectedBranch) : undefined,
      startDate,
      endDate
    }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      if (!selectedBranch) return [];
      const res = await fetch(
        `/api/financial-transactions/daily?branchId=${params.branchId}&date=${startDate}`, 
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return await res.json();
    },
    enabled: !!selectedBranch
  });

  // Get monthly summary for charts
  const { 
    data: monthlySummary,
    isLoading: isLoadingMonthlySummary
  } = useQuery({
    queryKey: ["/api/financial-transactions/summary/monthly", { 
      branchId: selectedBranch ? parseInt(selectedBranch) : undefined,
      year: new Date(startDate).getFullYear(),
      month: new Date(startDate).getMonth() + 1
    }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      if (!selectedBranch) return null;
      const res = await fetch(
        `/api/financial-transactions/summary/monthly?branchId=${params.branchId}&year=${params.year}&month=${params.month}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch monthly summary");
      return await res.json();
    },
    enabled: !!selectedBranch
  });

  // Handle export report
  const handleExport = (format: 'pdf' | 'excel') => {
    toast({
      title: "Export started",
      description: `Your report is being exported as ${format.toUpperCase()}`,
    });
    // In a real app, this would trigger a file download
  };

  // Handle print report
  const handlePrint = () => {
    window.print();
  };

  // Prepare data for invoice status chart
  const invoiceStatusData = [
    { name: 'Paid', value: 0 },
    { name: 'Partially Paid', value: 0 },
    { name: 'Unpaid', value: 0 }
  ];

  if (invoices.length > 0) {
    invoices.forEach((invoice: any) => {
      if (invoice.status === 'paid') {
        invoiceStatusData[0].value += invoice.amount;
      } else if (invoice.status === 'partially_paid') {
        invoiceStatusData[1].value += invoice.amount;
      } else if (invoice.status === 'unpaid') {
        invoiceStatusData[2].value += invoice.amount;
      }
    });
  }

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Financial Reports</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1"
          >
            <FileDownIcon className="h-4 w-4" />
            <span>Export PDF</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleExport('excel')}
            className="flex items-center gap-1"
          >
            <FileDownIcon className="h-4 w-4" />
            <span>Export Excel</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="flex items-center gap-1"
          >
            <PrinterIcon className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <Select
                value={selectedBranch}
                onValueChange={setSelectedBranch}
                disabled={user?.role === "branch_manager"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch: any) => (
                    <SelectItem 
                      key={branch.id} 
                      value={branch.id.toString()}
                      disabled={user?.role === "branch_manager" && user?.branchId !== branch.id}
                    >
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">Financial Overview</SelectItem>
                  <SelectItem value="invoices">Invoice Analysis</SelectItem>
                  <SelectItem value="expenses">Expense Breakdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {!selectedBranch ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Please select a branch to view reports</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={reportType} onValueChange={setReportType}>
          <TabsList className="mb-4">
            <TabsTrigger value="financial">Financial Overview</TabsTrigger>
            <TabsTrigger value="invoices">Invoice Analysis</TabsTrigger>
            <TabsTrigger value="expenses">Expense Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="financial">
            {/* Financial Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue vs Expenses</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  {isLoadingMonthlySummary ? (
                    <Skeleton className="w-full h-full" />
                  ) : !monthlySummary ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: 'This Month',
                            revenue: monthlySummary.totalSales,
                            expenses: monthlySummary.totalExpenses
                          }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis 
                          tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip formatter={(value) => [`$${value}`, undefined]} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#1976d2" />
                        <Bar dataKey="expenses" name="Expenses" fill="#f44336" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Daily Sales Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  {isLoadingMonthlySummary ? (
                    <Skeleton className="w-full h-full" />
                  ) : !monthlySummary || !monthlySummary.salesByDay ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={Object.entries(monthlySummary.salesByDay).map(([day, value]) => ({
                          day,
                          sales: value
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis
                          tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip formatter={(value) => [`$${value}`, undefined]} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="sales" 
                          name="Daily Sales" 
                          stroke="#1976d2" 
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Revenue</p>
                    {isLoadingMonthlySummary ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {monthlySummary ? formatCurrency(monthlySummary.totalSales) : "$0.00"}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Expenses</p>
                    {isLoadingMonthlySummary ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {monthlySummary ? formatCurrency(monthlySummary.totalExpenses) : "$0.00"}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Net Profit</p>
                    {isLoadingMonthlySummary ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {monthlySummary ? formatCurrency(monthlySummary.netBalance) : "$0.00"}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            {/* Invoice Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invoice Status Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  {isLoadingInvoices ? (
                    <Skeleton className="w-full h-full" />
                  ) : invoices.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No invoices found</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={invoiceStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {invoiceStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`$${value}`, undefined]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invoice Trends</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  {isLoadingInvoices ? (
                    <Skeleton className="w-full h-full" />
                  ) : invoices.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No invoices found</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[...Array(12)].map((_, i) => {
                          const month = new Date(new Date().getFullYear(), i, 1);
                          const monthString = month.toLocaleString('default', { month: 'short' });
                          return {
                            month: monthString,
                            amount: invoices
                              .filter((inv: any) => {
                                const invDate = new Date(inv.invoiceDate);
                                return invDate.getMonth() === i;
                              })
                              .reduce((acc: number, inv: any) => acc + inv.amount, 0)
                          };
                        })}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis 
                          tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip formatter={(value) => [`$${value}`, undefined]} />
                        <Area 
                          type="monotone" 
                          dataKey="amount" 
                          name="Invoice Amount" 
                          stroke="#1976d2" 
                          fill="#42a5f5" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Invoices</p>
                    {isLoadingInvoices ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl font-bold">{invoices.length}</p>
                    )}
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Paid Invoices</p>
                    {isLoadingInvoices ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {invoices.filter((inv: any) => inv.status === 'paid').length}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Unpaid Invoices</p>
                    {isLoadingInvoices ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {invoices.filter((inv: any) => inv.status === 'unpaid').length}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            {/* Expense Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Expense Categories</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  {isLoadingMonthlySummary ? (
                    <Skeleton className="w-full h-full" />
                  ) : !monthlySummary || !monthlySummary.expensesByCategory ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(monthlySummary.expensesByCategory).map(([category, amount]) => ({
                            name: category,
                            value: amount
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.keys(monthlySummary.expensesByCategory).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`$${value}`, undefined]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Daily Expenses</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  {isLoadingMonthlySummary ? (
                    <Skeleton className="w-full h-full" />
                  ) : !monthlySummary || !monthlySummary.expensesByDay ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={Object.entries(monthlySummary.expensesByDay).map(([day, value]) => ({
                          day,
                          expenses: value
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis 
                          tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip formatter={(value) => [`$${value}`, undefined]} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="expenses" 
                          name="Daily Expenses" 
                          stroke="#f44336" 
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expense Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Expenses</p>
                    {isLoadingMonthlySummary ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {monthlySummary ? formatCurrency(monthlySummary.totalExpenses) : "$0.00"}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Largest Category</p>
                    {isLoadingMonthlySummary ? (
                      <Skeleton className="h-8 w-24" />
                    ) : !monthlySummary || !monthlySummary.expensesByCategory || Object.keys(monthlySummary.expensesByCategory).length === 0 ? (
                      <p className="text-2xl font-bold">N/A</p>
                    ) : (
                      <p className="text-2xl font-bold">
                        {Object.entries(monthlySummary.expensesByCategory)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([category]) => category)[0]}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Daily Expense</p>
                    {isLoadingMonthlySummary ? (
                      <Skeleton className="h-8 w-24" />
                    ) : !monthlySummary || !monthlySummary.expensesByDay || Object.keys(monthlySummary.expensesByDay).length === 0 ? (
                      <p className="text-2xl font-bold">$0.00</p>
                    ) : (
                      <p className="text-2xl font-bold">
                        {formatCurrency(
                          monthlySummary.totalExpenses / Object.keys(monthlySummary.expensesByDay).length
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
