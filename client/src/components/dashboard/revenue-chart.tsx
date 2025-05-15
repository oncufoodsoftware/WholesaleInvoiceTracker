import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

// This component would ideally fetch data from an API
// For now, we'll use some demo data to display the chart
const demoData = [
  { month: 'Jan', revenue: 65000, expenses: 45000 },
  { month: 'Feb', revenue: 59000, expenses: 40000 },
  { month: 'Mar', revenue: 80000, expenses: 55000 },
  { month: 'Apr', revenue: 81000, expenses: 60000 },
  { month: 'May', revenue: 56000, expenses: 45000 },
  { month: 'Jun', revenue: 55000, expenses: 35000 },
  { month: 'Jul', revenue: 40000, expenses: 30000 },
  { month: 'Aug', revenue: 94000, expenses: 65000 },
  { month: 'Sep', revenue: 75000, expenses: 55000 },
  { month: 'Oct', revenue: 110000, expenses: 80000 },
  { month: 'Nov', revenue: 90000, expenses: 65000 },
  { month: 'Dec', revenue: 95000, expenses: 70000 },
];

export function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/financial-summary/yearly"],
    enabled: false, // Disable actual API call for now
  });
  
  // Use demo data for now, in a real app we'd use the data from the API
  const chartData = data || demoData;

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Monthly Revenue & Expenses</CardTitle>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-primary"></span>
            <span>Revenue</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-destructive"></span>
            <span>Expenses</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-64 w-full pt-4">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                tickFormatter={(value) => `$${value / 1000}k`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                labelStyle={{ fontWeight: 'bold' }}
                contentStyle={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  backgroundColor: 'white',
                }}
              />
              <Bar 
                dataKey="revenue" 
                name="Revenue" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="expenses" 
                name="Expenses" 
                fill="hsl(var(--destructive))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
