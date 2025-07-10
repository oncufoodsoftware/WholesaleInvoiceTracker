import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";

interface TransactionListProps {
  branchId: number;
  date: string;
  startDate?: string;
  endDate?: string;
  isDateRange?: boolean;
  type?: "income" | "expense";
}

// Transaction form schema
const transactionSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  date: z.string().min(1, "Date is required"),
  type: z.string().min(1, "Type is required"),
  category: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  paymentMethod: z.string().optional(),
  description: z.string().optional(),
});

export function TransactionList({
  branchId,
  date,
  startDate,
  endDate,
  isDateRange = false,
  type,
}: TransactionListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);

  // Get transactions for the branch and date/date range
  const {
    data: transactions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: isDateRange 
      ? ["/api/financial-transactions/range", { branchId, startDate, endDate, type }]
      : ["/api/financial-transactions/daily", { branchId, date, type }],
    queryFn: async ({ queryKey }) => {
      if (!branchId) return [];
      
      const url = isDateRange 
        ? `/api/financial-transactions/range?branchId=${branchId}&startDate=${startDate}&endDate=${endDate}`
        : `/api/financial-transactions/daily?branchId=${branchId}&date=${date}`;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      
      const data = await res.json();
      
      // Filter by type if specified
      if (type) {
        return data.filter((transaction: any) => transaction.type === type);
      }
      
      return data;
    },
    enabled: !!branchId && (isDateRange ? !!startDate && !!endDate : !!date),
  });

  // Get branches
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
  });

  // Initialize form
  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      branchId: branchId.toString(),
      date: date,
      type: type || "income",
      category: "",
      amount: "",
      paymentMethod: type === "income" ? "card" : undefined,
      description: "",
    },
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof transactionSchema>) => {
      if (!editingTransactionId) throw new Error("No transaction ID provided");
      
      return await apiRequest("PUT", `/api/financial-transactions/${editingTransactionId}`, {
        ...data,
        branchId: parseInt(data.branchId),
        amount: parseFloat(data.amount),
      });
    },
    onSuccess: () => {
      toast({
        title: "Transaction updated",
        description: "The transaction has been updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingTransactionId(null);
      // Refetch transaction data and refresh the page
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/financial-transactions/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-transactions/summary/daily"] });
      // Refresh the page to ensure all data is up-to-date
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/financial-transactions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Transaction deleted",
        description: "The transaction has been deleted successfully",
      });
      // Refetch transaction data and refresh the page
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/financial-transactions/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-transactions/summary/daily"] });
      // Refresh the page to ensure all data is up-to-date
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(values: z.infer<typeof transactionSchema>) {
    updateTransactionMutation.mutate(values);
  }

  // Handle edit transaction
  function handleEditTransaction(transaction: any) {
    setEditingTransactionId(transaction.id);
    form.reset({
      branchId: transaction.branchId.toString(),
      date: new Date(transaction.date).toISOString().split("T")[0],
      type: transaction.type,
      category: transaction.category || "",
      amount: transaction.amount.toString(),
      paymentMethod: transaction.paymentMethod,
      description: transaction.description || "",
    });
    setIsEditDialogOpen(true);
  }

  // Handle delete transaction
  function handleDeleteTransaction(id: number) {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      deleteTransactionMutation.mutate(id);
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  // Format date to UK 24-hour format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false // Force 24-hour format
    });
  };

  // Get transaction type badge
  const getTransactionTypeBadge = (transactionType: string) => {
    if (transactionType === "income") {
      return <Badge className="bg-success/10 text-success">Income</Badge>;
    }
    return <Badge className="bg-destructive/10 text-destructive">Expense</Badge>;
  };

  // Check if user can edit/delete transactions
  const canModifyTransaction = (transaction: any) => {
    if (user?.role === "admin" || user?.role === "accountant") return true;
    if (user?.role === "branch_manager" && user.branchId === transaction.branchId) return true;
    return false;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {type === "income" ? "Sales Transactions" :
             type === "expense" ? "Expense Transactions" :
             "All Transactions"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {!type && <TableHead>Type</TableHead>}
                  <TableHead>Time</TableHead>
                  <TableHead>Amount</TableHead>
                  {type === "income" && <TableHead>Payment Method</TableHead>}
                  {(type === "expense" || !type) && <TableHead>Category</TableHead>}
                  <TableHead>Description</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        {!type && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        {type === "income" && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
                        {(type === "expense" || !type) && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={type ? 6 : 7} className="text-center py-4 text-muted-foreground">
                      No transactions found for this date
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      {!type && (
                        <TableCell>{getTransactionTypeBadge(transaction.type)}</TableCell>
                      )}
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      {type === "income" && (
                        <TableCell className="capitalize">
                          {transaction.paymentMethod || "N/A"}
                        </TableCell>
                      )}
                      {(type === "expense" || !type) && (
                        <TableCell className="capitalize">
                          {transaction.category || "General"}
                        </TableCell>
                      )}
                      <TableCell>{transaction.description || "-"}</TableCell>
                      <TableCell>
                        {transaction.recordedByUser?.fullName || "System"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canModifyTransaction(transaction) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTransaction(transaction)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
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
                            disabled={user?.role === "branch_manager" && user.branchId !== branch.id}
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
                    <Select 
                      value={field.value} 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset payment method when switching types
                        if (value === "income") {
                          form.setValue("paymentMethod", "card");
                        } else {
                          form.setValue("paymentMethod", undefined);
                        }
                      }}
                    >
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
                      <Select value={field.value || ""} onValueChange={field.onChange}>
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
                      <Select value={field.value || ""} onValueChange={field.onChange}>
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
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateTransactionMutation.isPending}
                >
                  {updateTransactionMutation.isPending ? 
                    "Saving..." : "Update Transaction"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
