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
import { useState } from "react";

const data = [
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

export function RevenueChart() {
  const [period, setPeriod] = useState("yearly");
  
  // Format numbers as GBP currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">Revenue & Expenses</CardTitle>
          <CardDescription>Financial overview for the selected period</CardDescription>
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
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart
            data={data}
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
              formatter={(value) => <span style={{ color: value === "revenue" ? "#2563eb" : "#ef4444", fontWeight: "500" }}>{value === "revenue" ? "Revenue" : "Expenses"}</span>}
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
      </CardContent>
    </Card>
  );
}