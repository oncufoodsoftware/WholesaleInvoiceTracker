import { useState } from "react";
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
import { PlusIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailySummary } from "@/components/finances/daily-summary";
import { TransactionList } from "@/components/finances/transaction-list";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
});

export default function Finances() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("sales");

  // Get branches
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
  });

  // Set the default branch for branch managers
  useState(() => {
    if (user && user.role === "branch_manager" && user.branchId) {
      setSelectedBranch(user.branchId.toString());
    } else if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].id.toString());
    }
  });

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
    },
  });

  // Update form values when active tab changes or branch changes
  useState(() => {
    form.setValue("type", activeTab === "sales" ? "income" : "expense");
    form.setValue("paymentMethod", activeTab === "sales" ? "card" : undefined);
    
    // Set branch for branch managers
    if (user?.role === "branch_manager" && user?.branchId) {
      form.setValue("branchId", user.branchId.toString());
    } else if (selectedBranch) {
      form.setValue("branchId", selectedBranch);
    }
  }, [activeTab, selectedBranch, user]);

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

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Branch Financial Tracking</h2>
        <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-1">
          <PlusIcon className="h-4 w-4" />
          <span>New Entry</span>
        </Button>
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
              <Label>Select Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
                // Using standard ISO format for input type="date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Financial Summary */}
      {selectedBranch && (
        <DailySummary 
          branchId={parseInt(selectedBranch)} 
          date={new Date(selectedDate)} 
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
              type="income"
              onAddTransaction={() => {
                form.setValue("type", "income");
                form.setValue("paymentMethod", "card");
                
                // Set branch for branch managers
                if (user?.role === "branch_manager" && user?.branchId) {
                  form.setValue("branchId", user.branchId.toString());
                }
                
                setIsDialogOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <TransactionList
              branchId={selectedBranch ? parseInt(selectedBranch) : 0}
              date={selectedDate}
              type="expense"
              onAddTransaction={() => {
                form.setValue("type", "expense");
                form.setValue("paymentMethod", undefined);
                
                // Set branch for branch managers
                if (user?.role === "branch_manager" && user?.branchId) {
                  form.setValue("branchId", user.branchId.toString());
                }
                
                setIsDialogOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="overview" className="mt-4">
            <TransactionList
              branchId={selectedBranch ? parseInt(selectedBranch) : 0}
              date={selectedDate}
              onAddTransaction={() => {
                // Set branch for branch managers
                if (user?.role === "branch_manager" && user?.branchId) {
                  form.setValue("branchId", user.branchId.toString());
                }
                
                setIsDialogOpen(true);
              }}
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
