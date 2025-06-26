import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CreditCard, Building } from "lucide-react";

const bulkPaymentSchema = z.object({
  supplierId: z.number().min(1, "Please select a supplier"),
  branchId: z.number().min(1, "Please select a branch"),
  totalAmount: z.number().min(0.01, "Amount must be greater than 0"),
  bankTransferAmount: z.number().min(0, "Bank transfer amount cannot be negative").optional(),
  chequeAmount: z.number().min(0, "Cheque amount cannot be negative").optional(),
  chequeNumber: z.string().optional(),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
}).refine((data) => {
  const bankAmount = data.bankTransferAmount || 0;
  const chequeAmount = data.chequeAmount || 0;
  return Math.abs((bankAmount + chequeAmount) - data.totalAmount) < 0.01;
}, {
  message: "Bank transfer and cheque amounts must equal total amount",
  path: ["totalAmount"]
}).refine((data) => {
  if (data.chequeAmount && data.chequeAmount > 0 && !data.chequeNumber) {
    return false;
  }
  return true;
}, {
  message: "Cheque number is required when cheque amount is specified",
  path: ["chequeNumber"]
});

type BulkPaymentFormData = z.infer<typeof bulkPaymentSchema>;

interface BulkPaymentFormProps {
  onClose: () => void;
}

export function BulkPaymentForm({ onClose }: BulkPaymentFormProps) {
  const { toast } = useToast();
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  const form = useForm<BulkPaymentFormData>({
    resolver: zodResolver(bulkPaymentSchema),
    defaultValues: {
      totalAmount: 0,
      bankTransferAmount: 0,
      chequeAmount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return await res.json();
    }
  });

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return await res.json();
    }
  });

  // Fetch unpaid invoices for selected supplier and branch
  const { data: unpaidInvoices = [] } = useQuery({
    queryKey: ["/api/invoices", { supplierId: selectedSupplier, branchId: selectedBranch, status: "unpaid,partially_paid" }],
    queryFn: async () => {
      if (!selectedSupplier || !selectedBranch) return [];
      const res = await apiRequest("POST", "/api/invoices/filter", {
        supplierId: selectedSupplier,
        branchId: selectedBranch,
        status: "unpaid,partially_paid"
      });
      return await res.json();
    },
    enabled: !!selectedSupplier && !!selectedBranch
  });

  // Process bulk payment mutation
  const bulkPaymentMutation = useMutation({
    mutationFn: async (data: BulkPaymentFormData) => {
      return await apiRequest("POST", "/api/payments/bulk-payment", data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Payment processed successfully",
        description: `Bulk payment has been applied to invoices`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error processing payment",
        description: error.message || "Failed to process bulk payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BulkPaymentFormData) => {
    bulkPaymentMutation.mutate(data);
  };

  const totalOutstanding = unpaidInvoices.reduce((sum: number, invoice: any) => 
    sum + (invoice.amount - (invoice.paidAmount || 0)), 0
  );

  const watchedTotalAmount = form.watch("totalAmount");
  const watchedBankAmount = form.watch("bankTransferAmount") || 0;
  const watchedChequeAmount = form.watch("chequeAmount") || 0;

  const handleTotalAmountChange = (value: number) => {
    form.setValue("totalAmount", value);
    
    // Auto-distribute to bank transfer if no cheque amount set
    if (!watchedChequeAmount) {
      form.setValue("bankTransferAmount", value);
      form.setValue("chequeAmount", 0);
    }
  };

  const handleBankAmountChange = (value: number) => {
    form.setValue("bankTransferAmount", value);
    form.setValue("chequeAmount", Math.max(0, watchedTotalAmount - value));
  };

  const handleChequeAmountChange = (value: number) => {
    form.setValue("chequeAmount", value);
    form.setValue("bankTransferAmount", Math.max(0, watchedTotalAmount - value));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Bulk Payment to Supplier</h3>
        <p className="text-sm text-muted-foreground">
          Process payments across multiple invoices with automatic distribution from oldest to newest
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Supplier and Branch Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Select
              value={selectedSupplier?.toString() || ""}
              onValueChange={(value) => {
                const supplierId = parseInt(value);
                setSelectedSupplier(supplierId);
                form.setValue("supplierId", supplierId);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier: any) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.supplierId && (
              <p className="text-sm text-red-500">{form.formState.errors.supplierId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Select
              value={selectedBranch?.toString() || ""}
              onValueChange={(value) => {
                const branchId = parseInt(value);
                setSelectedBranch(branchId);
                form.setValue("branchId", branchId);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch: any) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.branchId && (
              <p className="text-sm text-red-500">{form.formState.errors.branchId.message}</p>
            )}
          </div>
        </div>

        {/* Outstanding Invoices Summary */}
        {selectedSupplier && selectedBranch && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Outstanding Invoices
              </CardTitle>
              <CardDescription>
                {unpaidInvoices.length} unpaid invoices totaling £{totalOutstanding.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {unpaidInvoices.map((invoice: any) => (
                  <div key={invoice.id} className="flex justify-between text-sm">
                    <span>{invoice.invoiceNumber}</span>
                    <span>£{(invoice.amount - (invoice.paidAmount || 0)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Payment Amount</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...form.register("totalAmount", { 
                valueAsNumber: true,
                onChange: (e) => handleTotalAmountChange(parseFloat(e.target.value) || 0)
              })}
            />
            {form.formState.errors.totalAmount && (
              <p className="text-sm text-red-500">{form.formState.errors.totalAmount.message}</p>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankTransferAmount" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Bank Transfer Amount
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("bankTransferAmount", { 
                  valueAsNumber: true,
                  onChange: (e) => handleBankAmountChange(parseFloat(e.target.value) || 0)
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chequeAmount">Cheque Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("chequeAmount", { 
                  valueAsNumber: true,
                  onChange: (e) => handleChequeAmountChange(parseFloat(e.target.value) || 0)
                })}
              />
            </div>
          </div>

          {watchedChequeAmount > 0 && (
            <div className="space-y-2">
              <Label htmlFor="chequeNumber">Cheque Number</Label>
              <Input
                type="text"
                placeholder="Enter cheque number"
                {...form.register("chequeNumber")}
              />
              {form.formState.errors.chequeNumber && (
                <p className="text-sm text-red-500">{form.formState.errors.chequeNumber.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              type="date"
              {...form.register("paymentDate")}
            />
            {form.formState.errors.paymentDate && (
              <p className="text-sm text-red-500">{form.formState.errors.paymentDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              placeholder="Additional notes about this payment"
              {...form.register("notes")}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={bulkPaymentMutation.isPending || !selectedSupplier || !selectedBranch}
          >
            {bulkPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Process Payment
          </Button>
        </div>
      </form>
    </div>
  );
}