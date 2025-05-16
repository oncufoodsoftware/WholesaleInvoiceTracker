import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadIcon } from "lucide-react";

// Invoice form schema
const invoiceSchema = z.object({
  invoiceNumber: z.string().min(3, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Date is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  branchId: z.string().min(1, "Branch is required"),
  amount: z.string().min(1, "Amount is required"),
  paidAmount: z.string().transform(val => val === "" ? "0" : val).optional(),
  status: z.enum(["paid", "unpaid", "partially_paid"]),
  type: z.enum(["standard", "credit_note", "cash"]),
  notes: z.string().optional(),
});

interface InvoiceFormProps {
  invoiceId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvoiceForm({ invoiceId, onClose, onSuccess }: InvoiceFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const isEditMode = !!invoiceId;

  // Get suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Get branches
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
  });

  // Get invoice if in edit mode
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ["/api/invoices", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch invoice");
      return res.json();
    },
    enabled: isEditMode,
  });

  // Form
  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      supplierId: "",
      branchId: user?.role === "branch_manager" && user.branchId ? user.branchId.toString() : "",
      amount: "",
      status: "unpaid",
      type: "standard",
      notes: "",
    },
  });

  // Update form values when editing
  useEffect(() => {
    if (isEditMode && invoice) {
      form.reset({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.invoiceDate).toISOString().split("T")[0],
        supplierId: invoice.supplierId.toString(),
        branchId: invoice.branchId.toString(),
        amount: invoice.amount.toString(),
        paidAmount: invoice.paidAmount?.toString() || "0",
        status: invoice.status,
        type: invoice.type,
        notes: invoice.notes || "",
      });
    }
  }, [invoice, isEditMode, form]);

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await fetch("/api/invoices", {
        method: "POST",
        body: data,
        credentials: "include",
      });
    },
    onSuccess: () => {
      toast({
        title: "Invoice created",
        description: "The invoice has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      onSuccess();
      
      // Automatically refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create invoice: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update invoice mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        body: data,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update invoice");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice updated",
        description: "The invoice has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      onSuccess();
      
      // Automatically refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update invoice: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(values: z.infer<typeof invoiceSchema>) {
    const formData = new FormData();
    
    // Add all form values to FormData
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });
    
    // Add file if selected
    if (file) {
      formData.append("invoiceFile", file);
    }
    
    if (isEditMode && invoiceId) {
      updateInvoiceMutation.mutate({ id: invoiceId, data: formData });
    } else {
      createInvoiceMutation.mutate(formData);
    }
  }

  // Handle file change
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  }

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Edit Invoice" : "Add New Invoice"}
        </DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input placeholder="INV-2023-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoiceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((supplier: any) => (
                        <SelectItem 
                          key={supplier.id} 
                          value={supplier.id.toString()}
                        >
                          {supplier.name}
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
                        <SelectValue placeholder="Select Branch" />
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Standard Invoice</SelectItem>
                      <SelectItem value="credit_note">Credit Note</SelectItem>
                      <SelectItem value="cash">Cash Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel>Invoice Amount</FormLabel>
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
            
            <FormField
              control={form.control}
              name="paidAmount"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel>Paid Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">£</span>
                      <Input 
                        className="pl-8" 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          // Auto-update status based on paid amount
                          const paidAmount = parseFloat(e.target.value) || 0;
                          const amount = parseFloat(form.getValues().amount) || 0;
                          const type = form.getValues().type;
                          
                          // Handle credit notes differently (payment against a credit)
                          if (type === "credit_note") {
                            if (paidAmount === 0) {
                              form.setValue("status", "unpaid");
                            } else if (paidAmount < amount) {
                              form.setValue("status", "partially_paid");
                            } else if (paidAmount >= amount) {
                              form.setValue("status", "paid");
                            }
                          } else {
                            // Standard and Cash invoices
                            if (paidAmount === 0) {
                              form.setValue("status", "unpaid");
                            } else if (paidAmount >= amount) {
                              form.setValue("status", "paid");
                            } else {
                              form.setValue("status", "partially_paid");
                            }
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={3} 
                      placeholder="Add any additional notes here..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2">
              <Label>Upload Invoice Document</Label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-muted-foreground">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-foreground focus-within:outline-none"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF, PNG, JPG up to 10MB
                  </p>
                  {file && (
                    <p className="text-sm text-primary">
                      Selected: {file.name}
                    </p>
                  )}
                  {isEditMode && invoice?.fileUrl && !file && (
                    <p className="text-sm text-primary">
                      Current file: {invoice.fileUrl.split('/').pop()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
            >
              {createInvoiceMutation.isPending || updateInvoiceMutation.isPending
                ? "Saving..."
                : isEditMode
                ? "Update Invoice"
                : "Save Invoice"
              }
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
