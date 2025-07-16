import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Building, AlertTriangle, CreditCard, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

// Direct Debit schema
const directDebitSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  recipientName: z.string().min(2, "Recipient name must be at least 2 characters"),
  accountNumber: z.string().min(6, "Account number must be at least 6 characters"),
  sortCode: z.string().min(6, "Sort code must be 6 characters"),
  amount: z.string().min(1, "Amount is required"),
  frequency: z.enum(["monthly", "weekly", "quarterly", "yearly"]),
  nextPaymentDate: z.string().min(1, "Next payment date is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type DirectDebit = {
  id: number;
  branchId: number;
  branchName?: string;
  recipientName: string;
  accountNumber: string;
  sortCode: string;
  amount: number;
  frequency: string;
  nextPaymentDate: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
};

export default function DirectDebits() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDebit, setSelectedDebit] = useState<DirectDebit | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  // Get branches
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    enabled: user?.role !== "branch_manager",
  });

  // Set initial branch for branch managers
  useEffect(() => {
    if (user?.role === "branch_manager" && user?.branchId) {
      setSelectedBranch(user.branchId.toString());
    } else if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].id.toString());
    }
  }, [user, branches, selectedBranch]);

  // Get direct debits
  const { data: directDebits = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/direct-debits", selectedBranch],
    queryFn: async () => {
      const endpoint = user?.role === "branch_manager" && user?.branchId
        ? `/api/direct-debits?branchId=${user.branchId}`
        : selectedBranch
        ? `/api/direct-debits?branchId=${selectedBranch}`
        : "/api/direct-debits";
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch direct debits");
      return res.json();
    },
    enabled: !!selectedBranch || user?.role === "branch_manager",
  });

  // Form for adding a new direct debit
  const addForm = useForm<z.infer<typeof directDebitSchema>>({
    resolver: zodResolver(directDebitSchema),
    defaultValues: {
      branchId: selectedBranch,
      recipientName: "",
      accountNumber: "",
      sortCode: "",
      amount: "",
      frequency: "monthly",
      nextPaymentDate: "",
      description: "",
      isActive: true,
    },
  });

  // Form for editing a direct debit
  const editForm = useForm<z.infer<typeof directDebitSchema>>({
    resolver: zodResolver(directDebitSchema),
    defaultValues: {
      branchId: "",
      recipientName: "",
      accountNumber: "",
      sortCode: "",
      amount: "",
      frequency: "monthly",
      nextPaymentDate: "",
      description: "",
      isActive: true,
    },
  });

  // Update form when branch selection changes
  useEffect(() => {
    if (selectedBranch) {
      addForm.setValue("branchId", selectedBranch);
    }
  }, [selectedBranch, addForm]);

  // Set form values when editing
  useEffect(() => {
    if (selectedDebit && isEditDialogOpen) {
      editForm.setValue("branchId", selectedDebit.branchId.toString());
      editForm.setValue("recipientName", selectedDebit.recipientName);
      editForm.setValue("accountNumber", selectedDebit.accountNumber);
      editForm.setValue("sortCode", selectedDebit.sortCode);
      editForm.setValue("amount", selectedDebit.amount.toString());
      editForm.setValue("frequency", selectedDebit.frequency as any);
      editForm.setValue("nextPaymentDate", selectedDebit.nextPaymentDate.split('T')[0]);
      editForm.setValue("description", selectedDebit.description || "");
      editForm.setValue("isActive", selectedDebit.isActive);
    }
  }, [selectedDebit, isEditDialogOpen, editForm]);

  // Mutation for adding a direct debit
  const addDirectDebitMutation = useMutation({
    mutationFn: async (data: z.infer<typeof directDebitSchema>) => {
      const payload = {
        ...data,
        branchId: parseInt(data.branchId),
        amount: parseFloat(data.amount),
        nextPaymentDate: new Date(data.nextPaymentDate).toISOString(),
      };
      const res = await apiRequest("POST", "/api/direct-debits", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Direct Debit added",
        description: "The direct debit has been added successfully.",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/direct-debits"] });
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for editing a direct debit
  const editDirectDebitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof directDebitSchema> }) => {
      const payload = {
        ...data,
        branchId: parseInt(data.branchId),
        amount: parseFloat(data.amount),
        nextPaymentDate: new Date(data.nextPaymentDate).toISOString(),
      };
      const res = await apiRequest("PUT", `/api/direct-debits/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Direct Debit updated",
        description: "The direct debit has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedDebit(null);
      queryClient.invalidateQueries({ queryKey: ["/api/direct-debits"] });
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a direct debit
  const deleteDirectDebitMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/direct-debits/${id}`);
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Direct Debit deleted",
        description: "The direct debit has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/direct-debits"] });
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onAddSubmit(values: z.infer<typeof directDebitSchema>) {
    addDirectDebitMutation.mutate(values);
  }

  function onEditSubmit(values: z.infer<typeof directDebitSchema>) {
    if (!selectedDebit) return;
    editDirectDebitMutation.mutate({ id: selectedDebit.id, data: values });
  }

  function handleEditDebit(debit: DirectDebit) {
    setSelectedDebit(debit);
    setIsEditDialogOpen(true);
  }

  function handleDeleteDebit(id: number) {
    if (window.confirm("Are you sure you want to delete this direct debit? This action cannot be undone.")) {
      deleteDirectDebitMutation.mutate(id);
    }
  }

  // Get upcoming payments (next 7 days)
  const upcomingPayments = directDebits.filter((debit: DirectDebit) => {
    const nextPayment = new Date(debit.nextPaymentDate);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextPayment <= nextWeek && debit.isActive;
  });

  // Get frequency badge color
  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case "weekly": return "bg-blue-100 text-blue-800";
      case "monthly": return "bg-green-100 text-green-800";
      case "quarterly": return "bg-yellow-100 text-yellow-800";
      case "yearly": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Direct Debits & Standing Orders</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Direct Debit
        </Button>
      </div>

      {/* Branch selector for admins */}
      {user?.role !== "branch_manager" && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="branch-select" className="text-sm font-medium">
                Select Branch:
              </Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming payments alert */}
      {upcomingPayments.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Upcoming Payments
            </CardTitle>
            <CardDescription className="text-orange-600">
              {upcomingPayments.length} payment{upcomingPayments.length !== 1 ? 's' : ''} due in the next 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingPayments.map((debit: DirectDebit) => (
                <div key={debit.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <div className="font-medium">{debit.recipientName}</div>
                    <div className="text-sm text-gray-600">
                      Due: {format(new Date(debit.nextPaymentDate), 'PPP')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">£{debit.amount}</div>
                    <Badge className={getFrequencyColor(debit.frequency)}>
                      {debit.frequency}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Direct debits list */}
      {isLoading ? (
        <div>Loading direct debits...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {directDebits.map((debit: DirectDebit) => (
            <Card key={debit.id} className={`${!debit.isActive ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {debit.recipientName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getFrequencyColor(debit.frequency)}>
                      {debit.frequency}
                    </Badge>
                    {!debit.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
                {debit.branchName && (
                  <CardDescription className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {debit.branchName}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">£{debit.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account:</span>
                    <span className="font-mono">****{debit.accountNumber.slice(-4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sort Code:</span>
                    <span className="font-mono">{debit.sortCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Payment:</span>
                    <span className="font-medium">
                      {format(new Date(debit.nextPaymentDate), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  {debit.description && (
                    <div className="pt-2 text-gray-600 text-xs">
                      {debit.description}
                    </div>
                  )}
                </div>
              </CardContent>
              <div className="flex gap-2 p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditDebit(debit)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteDebit(debit.id)}
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {directDebits.length === 0 && !isLoading && (
        <Card className="w-full py-12">
          <CardContent className="flex flex-col items-center justify-center text-center p-6">
            <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">No Direct Debits</CardTitle>
            <CardDescription className="mb-6">
              You haven't set up any direct debits yet. <br />
              Click "Add Direct Debit" to create your first one.
            </CardDescription>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Direct Debit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Direct Debit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Direct Debit</DialogTitle>
            <DialogDescription>
              Set up a new direct debit or standing order for recurring payments.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
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
                            <SelectItem key={branch.id} value={branch.id.toString()}>
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
                  control={addForm.control}
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Company Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="sortCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="12-34-56" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">£</span>
                          <Input className="pl-8" type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addForm.control}
                name="nextPaymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Payment Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addDirectDebitMutation.isPending}
                >
                  {addDirectDebitMutation.isPending ? "Saving..." : "Save Direct Debit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Direct Debit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Direct Debit</DialogTitle>
            <DialogDescription>
              Update the direct debit details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
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
                            <SelectItem key={branch.id} value={branch.id.toString()}>
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
                  control={editForm.control}
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Company Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="sortCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="12-34-56" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">£</span>
                          <Input className="pl-8" type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="nextPaymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Payment Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editDirectDebitMutation.isPending}
                >
                  {editDirectDebitMutation.isPending ? "Saving..." : "Update Direct Debit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}