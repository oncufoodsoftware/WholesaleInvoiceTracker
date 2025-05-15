import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  BarChart,
  BarChart3,
  ChevronDown,
  Download,
  FileText,
  PieChart,
  Printer,
  TrendingUp,
} from "lucide-react";
import {
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Sample data - normally would come from your API
const sampleSalesData = [
  { name: 'Jan', amount: 4000 },
  { name: 'Feb', amount: 3000 },
  { name: 'Mar', amount: 2000 },
  { name: 'Apr', amount: 2780 },
  { name: 'May', amount: 1890 },
  { name: 'Jun', amount: 2390 },
  { name: 'Jul', amount: 3490 },
  { name: 'Aug', amount: 2490 },
  { name: 'Sep', amount: 5000 },
  { name: 'Oct', amount: 3300 },
  { name: 'Nov', amount: 4100 },
  { name: 'Dec', amount: 5200 },
];

const sampleCategoryData = [
  { name: 'Groceries', value: 35000 },
  { name: 'Beverages', value: 28000 },
  { name: 'Snacks', value: 18000 },
  { name: 'Produce', value: 12000 },
  { name: 'Meat & Seafood', value: 25000 },
];

const sampleBranchData = [
  { name: 'West Branch', value: 54000 },
  { name: 'East Branch', value: 45000 },
  { name: 'North Branch', value: 32000 },
  { name: 'South Branch', value: 39000 },
];

export default function Reports() {
  const [reportType, setReportType] = useState<string>("sales");
  const [dateRange, setDateRange] = useState<string>("year");
  const [branchId, setBranchId] = useState<string>("all");
  
  // This would normally be a real API call
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });

  const handleGenerateReport = () => {
    // Would normally generate a report based on the selected filters
    console.log("Generating report:", { reportType, dateRange, branchId });
  };

  const handleExportPDF = () => {
    // Would normally export as PDF
    console.log("Exporting as PDF");
  };
  
  const handleExportExcel = () => {
    // Would normally export as Excel
    console.log("Exporting as Excel");
  };

  const handlePrint = () => {
    // Would normally print the report
    window.print();
  };

  return (
    <div className="container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and export financial reports and analytics
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={handleExportPDF}
          >
            <FileText className="h-4 w-4" />
            <span>PDF</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={handleExportExcel}
          >
            <Download className="h-4 w-4" />
            <span>Excel</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Report Options</CardTitle>
          <CardDescription>
            Configure your report parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select 
                value={reportType} 
                onValueChange={setReportType}
              >
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Report</SelectItem>
                  <SelectItem value="expenses">Expense Report</SelectItem>
                  <SelectItem value="profit">Profit & Loss</SelectItem>
                  <SelectItem value="inventory">Inventory Report</SelectItem>
                  <SelectItem value="suppliers">Supplier Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-range">Time Period</Label>
              <Select 
                value={dateRange} 
                onValueChange={setDateRange}
              >
                <SelectTrigger id="date-range">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateReport}>Generate Report</Button>
        </CardFooter>
      </Card>

      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">
            <BarChart3 className="h-4 w-4 mr-2" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="summary">
            <TrendingUp className="h-4 w-4 mr-2" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="details">
            <FileText className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Monthly Sales
                </CardTitle>
                <CardDescription>
                  Sales performance over the past 12 months
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-0">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={sampleSalesData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`£${value}`, 'Amount']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="amount" fill="#8884d8" name="Sales Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Sales by Category
                </CardTitle>
                <CardDescription>
                  Distribution of sales across different product categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={sampleCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sampleCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `£${value}`} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-primary" />
                  Sales by Branch
                </CardTitle>
                <CardDescription>
                  Performance comparison across different branches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    layout="vertical"
                    data={sampleBranchData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip formatter={(value) => `£${value}`} />
                    <Legend />
                    <Bar dataKey="value" fill="#82ca9d" name="Sales Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Sales Trend
                </CardTitle>
                <CardDescription>
                  Sales trend analysis over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={sampleSalesData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `£${value}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                      name="Sales Amount"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>
                Key performance indicators for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Sales</CardDescription>
                    <CardTitle className="text-2xl">£179,550</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-500 font-medium">↑ 12.5%</span> vs previous period
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Expenses</CardDescription>
                    <CardTitle className="text-2xl">£112,340</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-red-500 font-medium">↑ 5.2%</span> vs previous period
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Net Profit</CardDescription>
                    <CardTitle className="text-2xl">£67,210</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-500 font-medium">↑ 8.7%</span> vs previous period
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Profit Margin</CardDescription>
                    <CardTitle className="text-2xl">37.4%</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-500 font-medium">↑ 1.2%</span> vs previous period
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>
                Sales and performance by product category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="h-12 px-4 text-left align-middle font-medium">Category</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Sales</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Share</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleCategoryData.map((category, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-4 align-middle">{category.name}</td>
                        <td className="p-4 align-middle text-right">£{category.value.toLocaleString()}</td>
                        <td className="p-4 align-middle text-right">
                          {(category.value / sampleCategoryData.reduce((sum, cat) => sum + cat.value, 0) * 100).toFixed(1)}%
                        </td>
                        <td className="p-4 align-middle text-right">
                          <span className={i % 2 === 0 ? "text-green-500" : "text-red-500"}>
                            {i % 2 === 0 ? "↑" : "↓"} {(Math.random() * 15).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th className="h-12 px-4 text-left align-middle font-medium">Total</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        £{sampleCategoryData.reduce((sum, cat) => sum + cat.value, 0).toLocaleString()}
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">100%</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">-</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Transaction Report</CardTitle>
              <CardDescription>
                Comprehensive list of all transactions for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1">
                    <Input placeholder="Search transactions..." />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm">
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">Export</Button>
                  </div>
                </div>
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="h-12 px-4 text-left align-middle font-medium">ID</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Branch</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Category</th>
                        <th className="h-12 px-4 text-right align-middle font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(10)].map((_, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-4 align-middle">TXN-{1000 + i}</td>
                          <td className="p-4 align-middle">
                            {new Date(2024, 4, 15 - i).toLocaleDateString()}
                          </td>
                          <td className="p-4 align-middle">
                            {['Sale', 'Purchase', 'Refund', 'Payment'][i % 4]} - {['Groceries', 'Beverages', 'Snacks', 'Produce'][i % 4]}
                          </td>
                          <td className="p-4 align-middle">
                            {['West Branch', 'East Branch', 'North Branch', 'South Branch'][i % 4]}
                          </td>
                          <td className="p-4 align-middle">
                            {['Sales', 'Inventory', 'Expenses', 'Utilities'][i % 4]}
                          </td>
                          <td className="p-4 align-middle text-right">
                            <span className={i % 3 === 0 ? "text-red-500" : "text-green-500"}>
                              {i % 3 === 0 ? '-' : ''}£{(Math.random() * 1000 + 100).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing 1-10 of 256 transactions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled>Previous</Button>
                    <Button variant="outline" size="sm">Next</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}