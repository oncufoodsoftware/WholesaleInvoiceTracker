import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { PlusIcon, Download, Upload, ImageIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailySummary } from "@/components/finances/daily-summary";
import { TransactionList } from "@/components/finances/transaction-list";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Create a form schema for the transaction
const transactionSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  date: z.string().min(1, "Date is required"),
  type: z.string().min(1, "Type is required"),
  category: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  paymentMethod: z.string().optional(),
  description: z.string().optional(),
  zReportImage: z.any().optional(),
});

export default function Finances() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    "2025-07-08" // Use a date with actual data
  );
  const [dateRange, setDateRange] = useState("custom");
  const [customStartDate, setCustomStartDate] = useState<string>(
    "2025-07-08" // Use a date with actual data
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    "2025-07-08" // Use a date with actual data
  );
  const [activeTab, setActiveTab] = useState("sales");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Get branches
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
  });

  // Set the default branch for branch managers
  React.useEffect(() => {
    if (user && user.role === "branch_manager" && user.branchId) {
      setSelectedBranch(user.branchId.toString());
    } else if (branches.length > 0 && !selectedBranch) {
      // Use branch 4 (Letchworth) as default since it has data
      const branchWithData = branches.find(b => b.id === 4) || branches[0];
      setSelectedBranch(branchWithData.id.toString());
    }
  }, [branches, selectedBranch, user]);

  // Form for new transaction
  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      branchId: selectedBranch,
      date: selectedDate,
      type: activeTab === "sales" ? "income" : "expense",
      category: "",
      amount: "",
      paymentMethod: activeTab === "sales" ? "card" : undefined,
      description: "",
      zReportImage: undefined,
    },
  });

  // Update form values when active tab changes or branch changes
  React.useEffect(() => {
    form.setValue("type", activeTab === "sales" ? "income" : "expense");
    form.setValue("paymentMethod", activeTab === "sales" ? "card" : undefined);
    
    // Set branch for branch managers
    if (user?.role === "branch_manager" && user?.branchId) {
      form.setValue("branchId", user.branchId.toString());
    } else if (selectedBranch) {
      form.setValue("branchId", selectedBranch);
    }
  }, [activeTab, selectedBranch, user, form]);

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof transactionSchema>) => {
      return await apiRequest("POST", "/api/financial-transactions", {
        ...data,
        branchId: parseInt(data.branchId),
        amount: parseFloat(data.amount),
      });
    },
    onSuccess: () => {
      toast({
        title: "Transaction created",
        description: "The transaction has been recorded successfully",
      });
      setIsDialogOpen(false);
      
      // Reset form with proper branch selection for branch managers
      const resetBranchId = user?.role === "branch_manager" && user?.branchId 
        ? user.branchId.toString() 
        : selectedBranch;
      
      form.reset({
        branchId: resetBranchId,
        date: selectedDate,
        type: activeTab === "sales" ? "income" : "expense",
        category: "",
        amount: "",
        paymentMethod: activeTab === "sales" ? "card" : undefined,
        description: "",
      });
      
      // Refresh data and reload page for immediate updates
      queryClient.invalidateQueries({ queryKey: ["/api/financial-transactions/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-transactions/summary/daily"] });
      
      // Refresh the page to ensure all data is up-to-date
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof transactionSchema>) => {
    createTransactionMutation.mutate(data);
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Export transactions to CSV
  const exportToCSV = async () => {
    if (!selectedBranch) {
      toast({
        title: "Error",
        description: "Please select a branch first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/financial-transactions/export?branchId=${selectedBranch}&date=${selectedDate}`);
      if (!response.ok) throw new Error("Failed to export data");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-transactions-${selectedBranch}-${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Financial transactions exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export financial transactions",
        variant: "destructive",
      });
    }
  };

  // Calculate date range based on selection
  const getDateRange = () => {
    const today = new Date();
    let startDate = "2025-07-08"; // Default with data
    let endDate = "2025-07-08";
    
    switch (dateRange) {
      case "today":
        startDate = endDate = today.toISOString().split("T")[0];
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        startDate = endDate = yesterday.toISOString().split("T")[0];
        break;
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        startDate = weekStart.toISOString().split("T")[0];
        endDate = weekEnd.toISOString().split("T")[0];
        break;
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        startDate = monthStart.toISOString().split("T")[0];
        endDate = monthEnd.toISOString().split("T")[0];
        break;
      case "year":
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        startDate = yearStart.toISOString().split("T")[0];
        endDate = yearEnd.toISOString().split("T")[0];
        break;
      case "custom":
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      default:
        startDate = endDate = "2025-07-08";
    }
    
    return { startDate, endDate };
  };

  // Update selected date based on date range (for single date display)
  React.useEffect(() => {
    const { startDate } = getDateRange();
    if (startDate !== selectedDate) {
      setSelectedDate(startDate);
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Remove unused functions as buttons are no longer needed

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Branch Financial Tracking</h2>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-1">
            <PlusIcon className="h-4 w-4" />
            <span>Add New Transaction</span>
          </Button>
        </div>
      </div>

      {/* Branch selector and date */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Select Branch</Label>
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
              <Label>Select Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {dateRange === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Financial Summary */}
      {selectedBranch && (
        <DailySummary 
          branchId={parseInt(selectedBranch)} 
          date={new Date(selectedDate)} 
          startDate={dateRange !== "today" && dateRange !== "yesterday" ? getDateRange().startDate : undefined}
          endDate={dateRange !== "today" && dateRange !== "yesterday" ? getDateRange().endDate : undefined}
          isDateRange={dateRange !== "today" && dateRange !== "yesterday"}
        />
      )}

      {/* Daily transactions */}
      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b">
            <TabsList className="bg-transparent">
              <TabsTrigger
                value="sales"
                className="data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Sales
              </TabsTrigger>
              <TabsTrigger
                value="expenses"
                className="data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Expenses
              </TabsTrigger>
              <TabsTrigger
                value="overview"
                className="data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Overview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="sales" className="mt-4">
            <TransactionList
              branchId={selectedBranch ? parseInt(selectedBranch) : 0}
              date={selectedDate}
              startDate={dateRange !== "today" && dateRange !== "yesterday" ? getDateRange().startDate : undefined}
              endDate={dateRange !== "today" && dateRange !== "yesterday" ? getDateRange().endDate : undefined}
              isDateRange={dateRange !== "today" && dateRange !== "yesterday"}
              type="income"
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <TransactionList
              branchId={selectedBranch ? parseInt(selectedBranch) : 0}
              date={selectedDate}
              startDate={dateRange !== "today" && dateRange !== "yesterday" ? getDateRange().startDate : undefined}
              endDate={dateRange !== "today" && dateRange !== "yesterday" ? getDateRange().endDate : undefined}
              isDateRange={dateRange !== "today" && dateRange !== "yesterday"}
              type="expense"
            />
          </TabsContent>

          <TabsContent value="overview" className="mt-4">
            <TransactionList
              branchId={selectedBranch ? parseInt(selectedBranch) : 0}
              date={selectedDate}
              startDate={dateRange !== "today" && dateRange !== "yesterday" ? getDateRange().startDate : undefined}
              endDate={dateRange !== "today" && dateRange !== "yesterday" ? getDateRange().endDate : undefined}
              isDateRange={dateRange !== "today" && dateRange !== "yesterday"}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* New Transaction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={user?.role === "branch_manager"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("type") === "expense" && (
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rent">Rent</SelectItem>
                          <SelectItem value="salaries">Salaries</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="supplies">Supplies</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">£</span>
                        <Input className="pl-8" type="number" step="0.01" min="0" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("type") === "income" && (
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Z Report Upload Section */}
              <div className="space-y-2">
                <FormLabel>Add Z Report (Optional)</FormLabel>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-2">
                      <label htmlFor="zreport-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Upload Z Report Image
                        </span>
                        <span className="mt-1 block text-sm text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </span>
                      </label>
                      <input
                        id="zreport-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                    {selectedFile && (
                      <div className="mt-2 text-sm text-green-600">
                        Selected: {selectedFile.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTransactionMutation.isPending}
                >
                  {createTransactionMutation.isPending ? 
                    "Saving..." : "Save Transaction"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
