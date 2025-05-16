import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from "recharts";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

// Sample data as fallback
const sampleData = [
  { month: "Jan", revenue: 14000, expenses: 11200 },
  { month: "Feb", revenue: 18500, expenses: 13000 },
  { month: "Mar", revenue: 16800, expenses: 12800 },
  { month: "Apr", revenue: 21000, expenses: 14500 },
  { month: "May", revenue: 24500, expenses: 16200 },
  { month: "Jun", revenue: 22000, expenses: 15800 },
  { month: "Jul", revenue: 25000, expenses: 17500 },
  { month: "Aug", revenue: 27800, expenses: 18300 },
  { month: "Sep", revenue: 26500, expenses: 19000 },
  { month: "Oct", revenue: 29000, expenses: 20500 },
  { month: "Nov", revenue: 31500, expenses: 21200 },
  { month: "Dec", revenue: 34000, expenses: 23000 },
];

interface RevenueChartProps {
  branchId?: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
}

export function RevenueChart({ branchId }: RevenueChartProps) {
  const { user } = useAuth();
  const [period, setPeriod] = useState("yearly");
  
  // Fetch revenue data from API with optional branch filter
  const { data: revenueData, isLoading } = useQuery<RevenueData[]>({
    queryKey: ["/api/reports/revenue", branchId, period],
    queryFn: async () => {
      const url = branchId
        ? `/api/reports/revenue?branchId=${branchId}&period=${period}`
        : `/api/reports/revenue?period=${period}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch revenue data");
      return res.json();
    },
  });
  
  // Format numbers as GBP currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get chart title based on user role and branch filter
  const getChartTitle = () => {
    if (branchId && user?.role === "branch_manager") {
      return "Branch Financial Overview";
    }
    return "Company Financial Overview";
  };

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{getChartTitle()}</CardTitle>
          <CardDescription>
            {branchId ? "Branch revenue & expenses for the selected period" : "Company-wide revenue & expenses for the selected period"}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value)}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="h-[340px] w-full flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart
              data={revenueData || sampleData}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `£${value / 1000}k`}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ fontWeight: "bold" }}
                contentStyle={{ 
                  borderRadius: "8px", 
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: "none",
                }}
              />
              <Legend 
                iconType="circle" 
                iconSize={8}
                formatter={(value) => (
                  <span 
                    style={{ 
                      color: value === "revenue" ? "#2563eb" : "#ef4444", 
                      fontWeight: "500" 
                    }}
                  >
                    {value === "revenue" ? "Revenue" : "Expenses"}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorExpenses)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}