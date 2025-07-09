import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Banknote, Building, FileCheck } from "lucide-react";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const bulkPaymentSchema = z.object({
  supplierId: z.number().min(1, "Please select a supplier"),
  branchId: z.number().min(1, "Please select a branch"),
  totalAmount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(["cash", "bank_transfer", "cheque"], {
    required_error: "Please select a payment method",
  }),
  chequeNumber: z.string().optional(),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.paymentMethod === "cheque" && !data.chequeNumber) {
    return false;
  }
  return true;
}, {
  message: "Cheque number is required when using cheque payment",
  path: ["chequeNumber"]
});

type BulkPaymentFormData = z.infer<typeof bulkPaymentSchema>;

interface BulkPaymentFormProps {
  onClose: () => void;
}

export function BulkPaymentForm({ onClose }: BulkPaymentFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  const form = useForm<BulkPaymentFormData>({
    resolver: zodResolver(bulkPaymentSchema),
    defaultValues: {
      totalAmount: 0,
      paymentMethod: "cash" as const,
      paymentDate: new Date().toISOString().split('T')[0],
    },
  });

  // Auto-select branch for branch managers
  useEffect(() => {
    if (user?.role === "branch_manager" && user?.branchId) {
      setSelectedBranch(user.branchId);
      form.setValue("branchId", user.branchId);
    }
  }, [user, form]);

  const watchedPaymentMethod = form.watch("paymentMethod");

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

  // Process bulk payment mutation
  const bulkPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/payments/bulk-payment", data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/tracking"] });
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
    // Convert payment method to the expected API format
    const apiData = {
      ...data,
      bankTransferAmount: data.paymentMethod === "bank_transfer" ? data.totalAmount : 0,
      chequeAmount: data.paymentMethod === "cheque" ? data.totalAmount : 0,
      paymentMethod: undefined // Remove this field as API expects bankTransferAmount/chequeAmount
    };
    
    bulkPaymentMutation.mutate(apiData);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Bulk Payment</DialogTitle>
      </DialogHeader>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Supplier Selection */}
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
            <p className="text-sm text-destructive">{form.formState.errors.supplierId.message}</p>
          )}
        </div>

        {/* Branch Selection */}
        <div className="space-y-2">
          <Label htmlFor="branch">Branch</Label>
          <Select 
            value={selectedBranch?.toString() || ""} 
            onValueChange={(value) => {
              const branchId = parseInt(value);
              setSelectedBranch(branchId);
              form.setValue("branchId", branchId);
            }}
            disabled={user?.role === "branch_manager"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select branch" />
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
          {form.formState.errors.branchId && (
            <p className="text-sm text-destructive">{form.formState.errors.branchId.message}</p>
          )}
        </div>

        {/* Payment Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Payment Amount (£)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...form.register("totalAmount", { valueAsNumber: true })}
          />
          {form.formState.errors.totalAmount && (
            <p className="text-sm text-destructive">{form.formState.errors.totalAmount.message}</p>
          )}
        </div>

        {/* Payment Method */}
        <div className="space-y-3">
          <Label>Payment Method</Label>
          <RadioGroup
            value={watchedPaymentMethod}
            onValueChange={(value) => form.setValue("paymentMethod", value as any)}
            className="grid grid-cols-1 gap-3"
          >
            <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
              <RadioGroupItem value="cash" id="cash" />
              <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                <Banknote className="h-4 w-4" />
                Cash
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
              <RadioGroupItem value="bank_transfer" id="bank_transfer" />
              <Label htmlFor="bank_transfer" className="flex items-center gap-2 cursor-pointer flex-1">
                <Building className="h-4 w-4" />
                Bank Transfer
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
              <RadioGroupItem value="cheque" id="cheque" />
              <Label htmlFor="cheque" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileCheck className="h-4 w-4" />
                Cheque
              </Label>
            </div>
          </RadioGroup>
          {form.formState.errors.paymentMethod && (
            <p className="text-sm text-destructive">{form.formState.errors.paymentMethod.message}</p>
          )}
        </div>

        {/* Cheque Number (conditional) */}
        {watchedPaymentMethod === "cheque" && (
          <div className="space-y-2">
            <Label htmlFor="chequeNumber">Cheque Number</Label>
            <Input
              placeholder="Enter cheque number"
              {...form.register("chequeNumber")}
            />
            {form.formState.errors.chequeNumber && (
              <p className="text-sm text-destructive">{form.formState.errors.chequeNumber.message}</p>
            )}
          </div>
        )}

        {/* Payment Date */}
        <div className="space-y-2">
          <Label htmlFor="paymentDate">Payment Date</Label>
          <Input
            type="date"
            {...form.register("paymentDate")}
          />
          {form.formState.errors.paymentDate && (
            <p className="text-sm text-destructive">{form.formState.errors.paymentDate.message}</p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            placeholder="Additional notes about this payment"
            {...form.register("notes")}
            rows={2}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4">
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
    </DialogContent>
  );
}