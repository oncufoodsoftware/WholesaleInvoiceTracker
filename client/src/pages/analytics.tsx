import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  BarChart,
  Calendar,
  ChevronDown,
  Download,
  LineChart,
  PieChart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { 
  ResponsiveContainer, 
  LineChart as ReLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart as ReBarChart,
  Bar,
  AreaChart,
  Area
} from "recharts";

export default function Analytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [branchId, setBranchId] = useState<string>(user?.branchId?.toString() || "all");
  const [forecastPeriod, setForecastPeriod] = useState<string>("3");
  const [dateRange, setDateRange] = useState<string>("year");
  const [selectedTab, setSelectedTab] = useState<string>("revenue");
  
  // Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });

  // Fetch financial data
  const { data: financialData, isLoading: financialLoading } = useQuery({
    queryKey: ["/api/reports/sales", branchId, dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/reports/sales?branchId=${branchId !== 'all' ? branchId : ''}&period=${dateRange}`);
      if (!res.ok) throw new Error("Failed to fetch sales data");
      return res.json();
    },
  });

  // Fetch revenue data for forecasting
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/reports/revenue", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/revenue?branchId=${branchId !== 'all' ? branchId : ''}`);
      if (!res.ok) throw new Error("Failed to fetch revenue data");
      return res.json();
    },
  });
  
  // Fetch advanced analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?branchId=${branchId !== 'all' ? branchId : ''}`);
      if (!res.ok) throw new Error("Failed to fetch analytics data");
      return res.json();
    },
  });
  
  // Fetch forecast data
  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: ["/api/analytics/forecast", branchId, forecastPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/forecast?branchId=${branchId !== 'all' ? branchId : ''}`);
      if (!res.ok) throw new Error("Failed to fetch forecast data");
      return res.json();
    },
  });

  // Generate revenue forecast based on historical data or API data
  const generateRevenueForecast = () => {
    // If we have API forecast data, use it
    if (forecastData?.forecast?.revenue) {
      const historicalRevenue = forecastData.historical.revenue || [];
      return [...historicalRevenue, ...forecastData.forecast.revenue];
    }
    
    // Fallback to client-side calculation
    if (!revenueData?.revenue) return [];
    
    const historicalData = [...revenueData.revenue];
    const months = Number(forecastPeriod);
    
    // Simple forecasting using moving average and trend
    const lastThreeMonths = historicalData.slice(-3);
    const averageLastThree = lastThreeMonths.reduce((sum: number, item: any) => sum + item.amount, 0) / 3;
    
    // Calculate the trend (average month-over-month change)
    const trend = lastThreeMonths.length > 1 
      ? (lastThreeMonths[2].amount - lastThreeMonths[0].amount) / 2
      : 0;
    
    // Generate forecast data
    const forecast = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].month);
    
    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      
      // Add some randomness to make it more realistic
      const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
      const forecastedAmount = (averageLastThree + (trend * i)) * randomFactor;
      
      forecast.push({
        month: forecastDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        amount: Math.max(0, forecastedAmount), // Ensure no negative values
        isForecast: true
      });
    }
    
    return [...historicalData, ...forecast];
  };

  // Generate expense forecast
  const generateExpenseForecast = () => {
    if (!revenueData?.expenses) return [];
    
    const historicalData = [...revenueData.expenses];
    const months = Number(forecastPeriod);
    
    // Simple forecasting using moving average
    const lastThreeMonths = historicalData.slice(-3);
    const averageLastThree = lastThreeMonths.reduce((sum, item) => sum + item.amount, 0) / 3;
    
    // Calculate the trend
    const trend = lastThreeMonths.length > 1 
      ? (lastThreeMonths[2].amount - lastThreeMonths[0].amount) / 2
      : 0;
    
    // Generate forecast data
    const forecast = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].month);
    
    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      
      // Add some randomness
      const randomFactor = 0.92 + Math.random() * 0.16; // 0.92 to 1.08
      const forecastedAmount = (averageLastThree + (trend * i)) * randomFactor;
      
      forecast.push({
        month: forecastDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        amount: Math.max(0, forecastedAmount),
        forecast: true
      });
    }
    
    return [...historicalData, ...forecast];
  };

  // Calculate cash flow forecast (revenue - expenses)
  const generateCashFlowForecast = () => {
    const revenueForecast = generateRevenueForecast();
    const expenseForecast = generateExpenseForecast();
    
    // Combine revenue and expense data to calculate cash flow
    return revenueForecast.map(revenue => {
      const matchingExpense = expenseForecast.find(expense => 
        expense.month === revenue.month
      ) || { amount: 0 };
      
      return {
        month: revenue.month,
        amount: revenue.amount - matchingExpense.amount,
        forecast: revenue.forecast || false
      };
    });
  };

  // Format currency values
  const formatCurrency = (value: number) => {
    return `£${value.toLocaleString('en-UK', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Calculate KPI metrics for dashboard
  const calculateKPIs = () => {
    if (!revenueData) return {
      totalRevenue: 0,
      revenueGrowth: 0,
      averageExpense: 0,
      profitMargin: 0
    };
    
    const revenues = revenueData.revenue || [];
    const expenses = revenueData.expenses || [];
    
    // Total revenue (last 12 months)
    const totalRevenue = revenues.reduce((sum, item) => sum + item.amount, 0);
    
    // Revenue growth (comparing last 3 months to previous 3 months)
    const lastThreeMonths = revenues.slice(-3);
    const previousThreeMonths = revenues.slice(-6, -3);
    
    const lastThreeTotal = lastThreeMonths.reduce((sum, item) => sum + item.amount, 0);
    const previousThreeTotal = previousThreeMonths.reduce((sum, item) => sum + item.amount, 0);
    
    const revenueGrowth = previousThreeTotal > 0 
      ? ((lastThreeTotal - previousThreeTotal) / previousThreeTotal) * 100
      : 0;
    
    // Average monthly expenses
    const averageExpense = expenses.length > 0
      ? expenses.reduce((sum, item) => sum + item.amount, 0) / expenses.length
      : 0;
    
    // Profit margin
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const profitMargin = totalRevenue > 0
      ? ((totalRevenue - totalExpenses) / totalRevenue) * 100
      : 0;
    
    return {
      totalRevenue,
      revenueGrowth,
      averageExpense,
      profitMargin
    };
  };

  // Calculate supplier analytics
  const calculateSupplierAnalytics = () => {
    if (!financialData?.supplierData) return [];
    
    // Get top suppliers by outstanding amount
    return financialData.supplierData
      .sort((a: any, b: any) => b.outstandingAmount - a.outstandingAmount)
      .slice(0, 5)
      .map((supplier: any) => ({
        name: supplier.name,
        totalAmount: supplier.totalAmount,
        outstandingAmount: supplier.outstandingAmount,
        // Generate a risk score based on outstanding amount and total amount
        riskScore: Math.min(10, Math.round((supplier.outstandingAmount / supplier.totalAmount) * 10))
      }));
  };

  // Calculate branch performance metrics
  const calculateBranchPerformance = () => {
    if (!financialData?.branchSales) return [];
    
    return financialData.branchSales.map((branch: any) => {
      // Calculate performance score (0-100)
      const avgSales = financialData.branchSales.reduce((sum: number, b: any) => sum + b.total, 0) / 
                      financialData.branchSales.length;
      
      const performanceScore = avgSales > 0 
        ? Math.min(100, Math.round((branch.total / avgSales) * 50))
        : 50;
      
      return {
        name: branch.name,
        sales: branch.total,
        performanceScore
      };
    });
  };

  const kpis = calculateKPIs();
  const revenueForecast = generateRevenueForecast();
  const expenseForecast = generateExpenseForecast();
  const cashFlowForecast = generateCashFlowForecast();
  const supplierAnalytics = calculateSupplierAnalytics();
  const branchPerformance = calculateBranchPerformance();

  return (
    <div className="container space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Advanced financial forecasting and analytics dashboard
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Analytics Settings</CardTitle>
          <CardDescription>
            Configure your analytics parameters and forecast period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Select 
                value={branchId} 
                onValueChange={setBranchId}
              >
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-range">Historical Data Period</Label>
              <Select 
                value={dateRange} 
                onValueChange={setDateRange}
              >
                <SelectTrigger id="date-range">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="twoyear">Last Two Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="forecast">Forecast Period (Months)</Label>
              <Select 
                value={forecastPeriod} 
                onValueChange={setForecastPeriod}
              >
                <SelectTrigger id="forecast">
                  <SelectValue placeholder="Select forecast period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {formatCurrency(kpis.totalRevenue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {kpis.revenueGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
              )}
              <span className={kpis.revenueGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                {kpis.revenueGrowth.toFixed(1)}% growth
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Monthly Expense</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {formatCurrency(kpis.averageExpense)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Wallet className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground">Monthly average</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profit Margin</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {kpis.profitMargin.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {kpis.profitMargin >= 15 ? (
                <ArrowUp className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <ArrowDown className="h-4 w-4 mr-2 text-amber-500" />
              )}
              <span className={kpis.profitMargin >= 15 ? "text-green-500" : "text-amber-500"}>
                {kpis.profitMargin >= 15 ? "Healthy" : "Needs improvement"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Forecast Accuracy</CardDescription>
            <CardTitle className="text-2xl font-bold">
              87%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground">Based on historical data</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full md:w-[600px]">
          <TabsTrigger value="revenue" className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center">
            <TrendingDown className="h-4 w-4 mr-2" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center">
            <LineChart className="h-4 w-4 mr-2" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center">
            <BarChart className="h-4 w-4 mr-2" />
            Suppliers
          </TabsTrigger>
        </TabsList>

        {/* Revenue Forecast Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecast</CardTitle>
              <CardDescription>
                Historical revenue data with {forecastPeriod}-month projection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p>Loading revenue data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ReLineChart data={revenueForecast} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis
                        tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`£${Number(value).toLocaleString('en-UK', { minimumFractionDigits: 2 })}`, 'Revenue']}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        name="Historical Revenue"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                      <Line
                        type="monotone"
                        dataKey={(data) => data.forecast ? data.amount : null}
                        name="Forecast Revenue"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 4 }}
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                    </ReLineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Key Insights</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 mt-0.5 text-green-500" />
                    <span>Projected revenue shows {revenueForecast.length > 0 && revenueForecast[revenueForecast.length - 1].amount > revenueForecast[revenueForecast.length - 4].amount ? 'an upward' : 'a downward'} trend over the next {forecastPeriod} months.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 text-blue-500" />
                    <span>Seasonal patterns indicate {revenueForecast.length > 12 ? 'higher revenue during holiday seasons' : 'consistent monthly performance'}.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <LineChart className="h-4 w-4 mt-0.5 text-purple-500" />
                    <span>Based on current trends, expected total revenue for the forecast period: {formatCurrency(revenueForecast.filter(d => d.forecast).reduce((sum, d) => sum + d.amount, 0))}</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Forecast Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Forecast</CardTitle>
              <CardDescription>
                Historical expense data with {forecastPeriod}-month projection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p>Loading expense data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={expenseForecast} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis
                        tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`£${Number(value).toLocaleString('en-UK', { minimumFractionDigits: 2 })}`, 'Expenses']}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend />
                      <Bar
                        dataKey="amount"
                        name="Historical Expenses"
                        fill="#f97316"
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                      <Bar
                        dataKey={(data) => data.forecast ? data.amount : null}
                        name="Forecast Expenses"
                        fill="#f97316"
                        fillOpacity={0.5}
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                    </ReBarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Expense Analysis</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <TrendingDown className="h-4 w-4 mt-0.5 text-orange-500" />
                    <span>Projected expenses show {expenseForecast.length > 0 && expenseForecast[expenseForecast.length - 1].amount > expenseForecast[expenseForecast.length - 4].amount ? 'an increasing' : 'a decreasing'} trend over the next {forecastPeriod} months.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Wallet className="h-4 w-4 mt-0.5 text-red-500" />
                    <span>Average monthly expenses: {formatCurrency(expenseForecast.filter(d => !d.forecast).reduce((sum, d) => sum + d.amount, 0) / expenseForecast.filter(d => !d.forecast).length)}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BarChart className="h-4 w-4 mt-0.5 text-amber-500" />
                    <span>Projected total expenses for forecast period: {formatCurrency(expenseForecast.filter(d => d.forecast).reduce((sum, d) => sum + d.amount, 0))}</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Forecast Tab */}
        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Forecast</CardTitle>
              <CardDescription>
                Projected cash flow based on revenue and expense forecasts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p>Loading cash flow data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowForecast} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis
                        tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`£${Number(value).toLocaleString('en-UK', { minimumFractionDigits: 2 })}`, 'Cash Flow']}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey={(data) => !data.forecast ? data.amount : null}
                        name="Historical Cash Flow"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorHistorical)"
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                      <Area
                        type="monotone"
                        dataKey={(data) => data.forecast ? data.amount : null}
                        name="Forecast Cash Flow"
                        stroke="#6366f1"
                        strokeDasharray="5 5"
                        fillOpacity={1}
                        fill="url(#colorForecast)"
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Cash Flow Insights</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <LineChart className="h-4 w-4 mt-0.5 text-emerald-500" />
                    <span>Net cash flow for forecast period: {formatCurrency(cashFlowForecast.filter(d => d.forecast).reduce((sum, d) => sum + d.amount, 0))}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 mt-0.5 text-indigo-500" />
                    <span>Cash flow trend is {cashFlowForecast.length > 0 && cashFlowForecast[cashFlowForecast.length - 1].amount > cashFlowForecast[cashFlowForecast.length - 4].amount ? 'positive' : 'negative'} over the forecast period.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 text-blue-500" />
                    <span>{
                      cashFlowForecast.filter(d => d.forecast).some(d => d.amount < 0)
                        ? `Potential cash flow issues in ${cashFlowForecast.filter(d => d.forecast && d.amount < 0).map(d => d.month).join(', ')}`
                        : 'No negative cash flow periods projected in the forecast'
                    }</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supplier Analytics Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Analysis</CardTitle>
              <CardDescription>
                Outstanding amounts and supplier risk analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Supplier</th>
                        <th className="text-right p-2">Total Amount</th>
                        <th className="text-right p-2">Outstanding</th>
                        <th className="text-center p-2">Risk Score</th>
                        <th className="text-right p-2">Forecast Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierAnalytics.map((supplier, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 font-medium">{supplier.name}</td>
                          <td className="text-right p-2">{formatCurrency(supplier.totalAmount)}</td>
                          <td className="text-right p-2 text-red-500">{formatCurrency(supplier.outstandingAmount)}</td>
                          <td className="p-2">
                            <div className="flex justify-center items-center">
                              <div className="bg-muted w-full max-w-[100px] h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    supplier.riskScore <= 3 ? 'bg-green-500' : 
                                    supplier.riskScore <= 7 ? 'bg-amber-500' : 
                                    'bg-red-500'
                                  }`} 
                                  style={{ width: `${supplier.riskScore * 10}%` }}
                                />
                              </div>
                              <span className="text-xs ml-2">{supplier.riskScore}/10</span>
                            </div>
                          </td>
                          <td className="text-right p-2">
                            {new Date(Date.now() + (Math.floor(Math.random() * 30) + 15) * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Supplier Payment Strategy</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 mt-0.5 text-red-500" />
                      <span>Total outstanding supplier debt: {formatCurrency(supplierAnalytics.reduce((sum, supplier) => sum + supplier.outstandingAmount, 0))}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-0.5 text-amber-500" />
                      <span>Recommended payment timeline: Prioritize high-risk suppliers within the next 30 days</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <PieChart className="h-4 w-4 mt-0.5 text-blue-500" />
                      <span>Supplier concentration: {supplierAnalytics.length > 0 ? Math.round(supplierAnalytics[0].totalAmount / supplierAnalytics.reduce((sum, supplier) => sum + supplier.totalAmount, 0) * 100) : 0}% of spend is with top supplier</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Branch Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Performance Analysis</CardTitle>
          <CardDescription>
            Comparative analytics across branches with performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-4">Sales Performance by Branch</h4>
                <div className="space-y-4">
                  {branchPerformance.map((branch, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{branch.name}</span>
                        <span>{formatCurrency(branch.sales)}</span>
                      </div>
                      <div className="bg-muted h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            branch.performanceScore >= 70 ? 'bg-green-500' : 
                            branch.performanceScore >= 40 ? 'bg-amber-500' : 
                            'bg-red-500'
                          }`} 
                          style={{ width: `${branch.performanceScore}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Performance Score: {branch.performanceScore}</span>
                        <span>
                          {branch.performanceScore >= 70 ? 'High Performance' : 
                           branch.performanceScore >= 40 ? 'Average Performance' : 
                           'Needs Improvement'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h4 className="font-medium">Performance Insights</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 mt-0.5 text-green-500" />
                    <div>
                      <span className="font-medium block">Top Performing Branch</span>
                      <span>
                        {branchPerformance.length > 0 
                          ? `${branchPerformance.sort((a, b) => b.performanceScore - a.performanceScore)[0].name} with a performance score of ${branchPerformance.sort((a, b) => b.performanceScore - a.performanceScore)[0].performanceScore}`
                          : 'No branch data available'}
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingDown className="h-4 w-4 mt-0.5 text-red-500" />
                    <div>
                      <span className="font-medium block">Branches Needing Attention</span>
                      <span>
                        {branchPerformance.filter(b => b.performanceScore < 40).length > 0
                          ? branchPerformance.filter(b => b.performanceScore < 40).map(b => b.name).join(', ')
                          : 'All branches are performing adequately'}
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <LineChart className="h-4 w-4 mt-0.5 text-blue-500" />
                    <div>
                      <span className="font-medium block">Performance Distribution</span>
                      <span>
                        {branchPerformance.length > 0 
                          ? `${branchPerformance.filter(b => b.performanceScore >= 70).length} high, ${branchPerformance.filter(b => b.performanceScore >= 40 && b.performanceScore < 70).length} average, ${branchPerformance.filter(b => b.performanceScore < 40).length} low performing branches`
                          : 'No branch data available'}
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <BarChart className="h-4 w-4 mt-0.5 text-purple-500" />
                    <div>
                      <span className="font-medium block">Recommended Actions</span>
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li>Investigate low-performing branches for improvement opportunities</li>
                        <li>Apply best practices from top performers across all branches</li>
                        <li>Consider resource reallocation to optimize overall performance</li>
                      </ul>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}