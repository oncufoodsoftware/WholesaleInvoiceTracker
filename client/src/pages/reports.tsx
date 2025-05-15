import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  Download,
  FileText,
  Printer,
  BarChart,
  LineChart,
  PieChart,
} from "lucide-react";

export default function Reports() {
  const [reportType, setReportType] = useState<string>("sales");
  const [dateRange, setDateRange] = useState<string>("year");
  const [branchId, setBranchId] = useState<string>("all");
  const { toast } = useToast();
  
  // CSV export functions
  const exportSalesReportToCSV = () => {
    if (!salesReportData || !salesReportData.monthlySales || salesReportData.monthlySales.length === 0) {
      toast({
        title: "Export Failed",
        description: "No sales data available to export",
        variant: "destructive"
      });
      return;
    }
    
    const headers = ["Month", "Total Sales (£)"];
    const rows = salesReportData.monthlySales.map((item: any) => [
      item.month,
      item.total || 0
    ]);
    
    generateCSV("sales_report", headers, rows);
  };
  
  const exportTransactionsToCSV = () => {
    if (!transactionsData || !transactionsData.transactions || transactionsData.transactions.length === 0) {
      toast({
        title: "Export Failed",
        description: "No transaction data available to export",
        variant: "destructive"
      });
      return;
    }
    
    const headers = ["Date", "Reference", "Description", "Branch", "Category", "Amount (£)", "Status"];
    const rows = transactionsData.transactions.map((transaction: any) => [
      formatDate(transaction.date),
      transaction.reference,
      transaction.description,
      transaction.branch,
      transaction.category,
      transaction.amount.toFixed(2),
      transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1).replace('_', ' ')
    ]);
    
    generateCSV("transactions_report", headers, rows);
  };
  
  const generateCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `Your report has been exported as ${filename}_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };
  
  // Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });
  
  // Fetch sales report data
  const { data: salesReportData, isLoading: salesReportLoading, refetch: refetchSalesReport } = useQuery({
    queryKey: ["/api/reports/sales", branchId, dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/reports/sales?branchId=${branchId !== 'all' ? branchId : ''}&period=${dateRange}`);
      if (!res.ok) throw new Error("Failed to fetch sales report");
      return res.json();
    },
  });
  
  // Fetch transactions report data with pagination
  const [page, setPage] = useState(1);
  const { data: transactionsData, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/reports/transactions", branchId, dateRange, page],
    queryFn: async () => {
      const res = await fetch(`/api/reports/transactions?branchId=${branchId !== 'all' ? branchId : ''}&period=${dateRange}&page=${page}`);
      if (!res.ok) throw new Error("Failed to fetch transactions report");
      return res.json();
    },
  });

  const handleGenerateReport = () => {
    // Refetch data with current filters
    refetchSalesReport();
    refetchTransactions();
  };

  const handleExportPDF = () => {
    toast({
      title: "PDF Export",
      description: "PDF export functionality will be implemented in a future update. Using CSV export instead.",
      variant: "default"
    });
    if (reportType === "sales") {
      exportSalesReportToCSV();
    } else {
      exportTransactionsToCSV();
    }
  };
  
  const handleExportExcel = () => {
    // Use CSV export as Excel alternative
    if (reportType === "sales") {
      exportSalesReportToCSV();
    } else {
      exportTransactionsToCSV();
    }
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="details">
            <FileText className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-primary" />
                  Monthly Sales
                </CardTitle>
                <CardDescription>
                  Sales performance over the past 12 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                {salesReportLoading ? (
                  <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/20">
                    <p className="text-muted-foreground">Loading sales data...</p>
                  </div>
                ) : salesReportData && salesReportData.monthlySales ? (
                  <div className="h-[300px] p-4 border rounded-md">
                    <div className="flex items-end justify-between h-[200px] mb-4">
                      {salesReportData.monthlySales.map((item: any, index: number) => {
                        const maxValue = Math.max(...salesReportData.monthlySales.map((i: any) => i.total || 0));
                        const height = maxValue === 0 ? 0 : Math.max(10, (item.total / maxValue) * 180);
                        
                        return (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className="bg-primary w-6 rounded-t-sm" 
                              style={{ height: `${height}px` }}
                            />
                            <span className="text-xs mt-1">{item.month}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      Total Sales: £{salesReportData.monthlySales.reduce((sum: number, item: any) => sum + (item.total || 0), 0).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/20">
                    <p className="text-muted-foreground">No sales data available</p>
                  </div>
                )}
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
                {salesReportLoading ? (
                  <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/20">
                    <p className="text-muted-foreground">Loading category data...</p>
                  </div>
                ) : salesReportData?.categoryDistribution && salesReportData.categoryDistribution.length > 0 ? (
                  <div className="h-[300px] p-4 border rounded-md">
                    <div className="grid grid-cols-2 gap-4 h-full">
                      <div className="flex flex-col justify-center items-center">
                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                          {salesReportData.categoryDistribution.map((item: any, index: number) => (
                            <div key={index} className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-1" 
                                style={{ 
                                  backgroundColor: `hsl(${index * 60}, 70%, 50%)` 
                                }}
                              />
                              <span className="text-xs">{item.category}</span>
                            </div>
                          ))}
                        </div>
                        <div className="relative w-40 h-40">
                          {salesReportData.categoryDistribution.map((item: any, index: number) => {
                            const total = salesReportData.categoryDistribution.reduce((sum: number, i: any) => sum + i.value, 0);
                            const percentage = total > 0 ? (item.value / total) * 100 : 0;
                            const cumulativePercentage = salesReportData.categoryDistribution
                              .slice(0, index)
                              .reduce((sum: number, i: any) => sum + (i.value / total) * 100, 0);
                            
                            return (
                              <div 
                                key={index}
                                className="absolute top-0 left-0 w-40 h-40"
                                style={{
                                  clipPath: `conic-gradient(from ${cumulativePercentage * 3.6}deg, transparent 0%, transparent ${percentage * 3.6}deg, currentColor 0deg)`,
                                  color: `hsl(${index * 60}, 70%, 50%)`,
                                  opacity: 0.8
                                }}
                              />
                            );
                          })}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-background rounded-full" />
                        </div>
                      </div>
                      <div className="flex flex-col justify-center">
                        <h4 className="text-sm font-medium mb-2">Category Distribution</h4>
                        <ul className="space-y-2">
                          {salesReportData.categoryDistribution.map((item: any, index: number) => {
                            const total = salesReportData.categoryDistribution.reduce((sum: number, i: any) => sum + i.value, 0);
                            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                            
                            return (
                              <li key={index} className="flex justify-between items-center text-sm">
                                <span>{item.category}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">£{item.value.toLocaleString()}</span>
                                  <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{percentage}%</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/20">
                    <p className="text-muted-foreground">No category data available</p>
                  </div>
                )}
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
                <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/20">
                  <p className="text-muted-foreground">Branch comparison chart will be displayed here</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Sales Trend
                </CardTitle>
                <CardDescription>
                  Sales trend analysis over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/20">
                  <p className="text-muted-foreground">Sales trend chart will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
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
                    <Button variant="outline" size="sm" onClick={exportTransactionsToCSV}>Export</Button>
                  </div>
                </div>
                {transactionsLoading ? (
                  <div className="h-[400px] flex items-center justify-center border rounded-md">
                    <p className="text-muted-foreground">Loading transaction data...</p>
                  </div>
                ) : transactionsData && transactionsData.transactions ? (
                  <>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactionsData.transactions.length > 0 ? (
                            transactionsData.transactions.map((transaction: any) => (
                              <TableRow key={transaction.id}>
                                <TableCell>{formatDate(transaction.date)}</TableCell>
                                <TableCell>{transaction.reference}</TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell>{transaction.branch}</TableCell>
                                <TableCell>{transaction.category}</TableCell>
                                <TableCell className="text-right font-medium">
                                  £{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    transaction.status === 'paid' ? 'default' :
                                    transaction.status === 'partially_paid' ? 'outline' : 'destructive'
                                  }>
                                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1).replace('_', ' ')}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-4">
                                No transactions found for the selected filters
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {transactionsData.pagination && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {transactionsData.transactions.length > 0 ? 
                            `${(transactionsData.pagination.page - 1) * transactionsData.pagination.limit + 1}-${Math.min(transactionsData.pagination.page * transactionsData.pagination.limit, transactionsData.pagination.total)} of ${transactionsData.pagination.total}` : 
                            '0'} transactions
                        </div>
                        {transactionsData.pagination.totalPages > 1 && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(page > 1 ? page - 1 : 1)}
                              disabled={page === 1}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {page} of {transactionsData.pagination.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(page < transactionsData.pagination.totalPages ? page + 1 : page)}
                              disabled={page >= transactionsData.pagination.totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-[400px] flex items-center justify-center border rounded-md">
                    <p className="text-muted-foreground">No transaction data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}