import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, CreditCardIcon, FileTextIcon, FilterIcon, RefreshCwIcon, Download, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Edit payment form schema
const editPaymentSchema = z.object({
  totalAmount: z.number().min(0.01, "Amount must be greater than 0"),
  bankTransferAmount: z.number().min(0, "Bank transfer amount cannot be negative"),
  chequeAmount: z.number().min(0, "Cheque amount cannot be negative"),
  chequeNumber: z.string().optional(),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
}).refine((data) => {
  return data.bankTransferAmount + data.chequeAmount === data.totalAmount;
}, {
  message: "Bank transfer and cheque amounts must equal total amount",
  path: ["totalAmount"]
}).refine((data) => {
  if (data.chequeAmount > 0 && !data.chequeNumber) {
    return false;
  }
  return true;
}, {
  message: "Cheque number is required when cheque amount is greater than 0",
  path: ["chequeNumber"]
});

type EditPaymentFormData = z.infer<typeof editPaymentSchema>;

export default function PaymentTracking() {
  const { toast } = useToast();
  
  // Get current user info
  const { data: user } = useQuery({ queryKey: ["/api/user"] });
    
  const [filters, setFilters] = useState({
    branchId: "all",
    supplierId: "all",
    startDate: "",
    endDate: "",
  });

  // Edit payment dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);

  // Update branch filter when user data loads
  useEffect(() => {
    if (user && (user as any)?.role === 'branch_manager' && (user as any)?.branchId) {
      setFilters(prev => ({
        ...prev,
        branchId: (user as any).branchId.toString()
      }));
    }
  }, [user]);

  // Fetch branches for filter dropdown
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return await res.json();
    }
  });

  // Fetch suppliers for filter dropdown
  const { data: suppliersRaw = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return await res.json();
    }
  });

  // Sort suppliers alphabetically
  const suppliers = Array.isArray(suppliersRaw) 
    ? [...suppliersRaw].sort((a: any, b: any) => (a?.name || '').localeCompare(b?.name || ''))
    : [];

  // Fetch payment tracking data
  const { data: payments = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/payments/tracking", filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters.branchId && filters.branchId !== "all") queryParams.append("branchId", filters.branchId);
      if (filters.supplierId && filters.supplierId !== "all") queryParams.append("supplierId", filters.supplierId);
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);

      const url = `/api/payments/tracking?${queryParams}`;

      const res = await fetch(url, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch payment tracking data");
      const data = await res.json();
      return data;
    }
  });

  const handleFilterChange = (key: string, value: string) => {
    // Don't allow branch managers to change branch
    if (key === 'branchId' && (user as any)?.role === 'branch_manager') {
      return;
    }
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    const resetBranchId = (user as any)?.role === 'branch_manager' 
      ? (user as any).branchId?.toString() || "all"
      : "all";
      
    setFilters({
      branchId: resetBranchId,
      supplierId: "all",
      startDate: "",
      endDate: "",
    });
  };

  const totalAmount = payments.reduce((sum: number, payment: any) => sum + payment.totalAmount, 0);
  const bankTransferTotal = payments.reduce((sum: number, payment: any) => sum + (payment.bankTransferAmount || 0), 0);
  const chequeTotal = payments.reduce((sum: number, payment: any) => sum + (payment.chequeAmount || 0), 0);

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return await apiRequest("DELETE", `/api/payments/bulk-payment/${paymentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Payment deleted",
        description: "The payment has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      // Auto refresh page
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete payment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Edit payment form
  const editForm = useForm<EditPaymentFormData>({
    resolver: zodResolver(editPaymentSchema),
    defaultValues: {
      totalAmount: 0,
      bankTransferAmount: 0,
      chequeAmount: 0,
      chequeNumber: "",
      paymentDate: "",
      notes: "",
    },
  });

  // Update payment mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: { paymentId: number; updateData: EditPaymentFormData }) => {
      return await apiRequest("PUT", `/api/payments/bulk-payment/${data.paymentId}`, data.updateData);
    },
    onSuccess: () => {
      toast({
        title: "Payment updated",
        description: "The payment has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsEditDialogOpen(false);
      setEditingPayment(null);
      editForm.reset();
      // Auto refresh page
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update payment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle edit payment
  const handleEditPayment = (paymentId: number) => {
    const payment = payments.find((p: any) => p.id === paymentId);
    if (payment) {
      setEditingPayment(payment);
      editForm.reset({
        totalAmount: payment.totalAmount,
        bankTransferAmount: payment.bankTransferAmount || 0,
        chequeAmount: payment.chequeAmount || 0,
        chequeNumber: payment.chequeNumber || "",
        paymentDate: format(new Date(payment.paymentDate), "yyyy-MM-dd"),
        notes: payment.notes || "",
      });
      setIsEditDialogOpen(true);
    }
  };

  // Handle edit form submission
  const onEditSubmit = (data: EditPaymentFormData) => {
    if (editingPayment) {
      updatePaymentMutation.mutate({
        paymentId: editingPayment.id,
        updateData: data
      });
    }
  };

  // Handle delete payment
  const handleDeletePayment = (paymentId: number) => {
    if (confirm("Are you sure you want to delete this payment? This action cannot be undone.")) {
      deletePaymentMutation.mutate(paymentId);
    }
  };

  // CSV Export function
  const exportToCSV = () => {
    if (payments.length === 0) {
      alert("No data to export");
      return;
    }

    const csvHeaders = [
      "Payment ID",
      "Supplier",
      "Branch",
      "Date",
      "Total Amount",
      "Bank Transfer Amount",
      "Cheque Amount",
      "Cheque No.",
      "Payment Method",
      "Reference",
      "Status",
      "Notes"
    ];

    const csvData = payments.map((payment: any) => [
      payment.id || "",
      payment.supplierName || "",
      payment.branchName || "",
      payment.paymentDate ? format(new Date(payment.paymentDate), "yyyy-MM-dd") : "",
      payment.totalAmount?.toFixed(2) || "0.00",
      payment.bankTransferAmount?.toFixed(2) || "0.00",
      payment.chequeAmount?.toFixed(2) || "0.00",
      payment.chequeNumber || "",
      payment.paymentMethod || "",
      payment.reference || "",
      payment.status || "",
      payment.notes || ""
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map((field: any) => `"${field.toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment-tracking-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Payment Tracking</h2>
          <Badge variant="secondary">{payments.length} payments</Badge>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          <Button onClick={() => refetch()} variant="outline" className="flex items-center gap-1">
            <RefreshCwIcon className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {payments.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Transfers</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{bankTransferTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((bankTransferTotal / totalAmount) * 100) || 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cheques</CardTitle>
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{chequeTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((chequeTotal / totalAmount) * 100) || 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Filter payments by branch, supplier and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Select
                value={filters.branchId}
                onValueChange={(value) => handleFilterChange("branchId", value)}
                disabled={(user as any)?.role === 'branch_manager'}
              >
                <SelectTrigger className={(user as any)?.role === 'branch_manager' ? 'opacity-60' : ''}>
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(user as any)?.role === 'branch_manager' && (
                <p className="text-xs text-muted-foreground">
                  Branch selection is locked to your assigned branch
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select
                value={filters.supplierId}
                onValueChange={(value) => handleFilterChange("supplierId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All suppliers</SelectItem>
                  {suppliers.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Complete history of all bulk payments to suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCwIcon className="h-6 w-6 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments found for the selected criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Bank Transfer</TableHead>
                    <TableHead>Cheque</TableHead>
                    <TableHead>Cheque No.</TableHead>
                    <TableHead>Notes</TableHead>
                    {(user as any)?.role === 'admin' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: any) => {
                    const paymentDate = new Date(payment.paymentDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    paymentDate.setHours(0, 0, 0, 0);
                    const isProcessed = paymentDate <= today;
                    
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(payment.paymentDate), "dd/MM/yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isProcessed ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                                  Processed
                                </Badge>
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 text-orange-600" />
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
                                  Pending
                                </Badge>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{payment.supplierName}</TableCell>
                        <TableCell>
                        <Badge variant="outline">{payment.branchName}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        £{payment.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {payment.bankTransferAmount > 0 ? (
                          <div className="flex items-center gap-1">
                            <CreditCardIcon className="h-3 w-3 text-green-600" />
                            £{payment.bankTransferAmount.toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.chequeAmount > 0 ? (
                          <div className="flex items-center gap-1">
                            <FileTextIcon className="h-3 w-3 text-blue-600" />
                            £{payment.chequeAmount.toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.chequeNumber ? (
                          <Badge variant="secondary">{payment.chequeNumber}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {payment.notes || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      {(user as any)?.role === 'admin' && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditPayment(payment.id)}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeletePayment(payment.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount (£)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="bankTransferAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Transfer Amount (£)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="chequeAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cheque Amount (£)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="chequeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cheque Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter cheque number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Payment notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={updatePaymentMutation.isPending}
                >
                  {updatePaymentMutation.isPending ? "Updating..." : "Update Payment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}