import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, CreditCard, Building2 } from "lucide-react";

// Payment record interface
interface PaymentRecord {
  id?: number;
  paymentType: 'bank_transfer' | 'cheque';
  amount: number;
  chequeNumber?: string;
  paymentDate: string;
  notes?: string;
}

// Schema for payment form validation
const paymentSchema = z.object({
  paymentType: z.enum(['bank_transfer', 'cheque']),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  chequeNumber: z.string().optional(),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
}).refine((data) => {
  // If payment type is cheque, cheque number is required
  if (data.paymentType === 'cheque' && (!data.chequeNumber || data.chequeNumber.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Cheque number is required for cheque payments",
  path: ["chequeNumber"],
});

interface InvoicePaymentDetailsProps {
  invoiceId: number;
  invoiceAmount: number;
  currentPaidAmount: number;
  onPaymentUpdate: (newPaidAmount: number) => void;
}

export function InvoicePaymentDetails({ 
  invoiceId, 
  invoiceAmount, 
  currentPaidAmount, 
  onPaymentUpdate 
}: InvoicePaymentDetailsProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Form for adding new payment
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentType: "bank_transfer",
      amount: 0,
      chequeNumber: "",
      paymentDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  // Calculate remaining amount
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = invoiceAmount - totalPaid;

  // Add payment
  const handleAddPayment = (values: z.infer<typeof paymentSchema>) => {
    const newPayment: PaymentRecord = {
      id: Date.now(), // Temporary ID
      ...values,
    };

    const newPayments = [...payments, newPayment];
    setPayments(newPayments);
    
    const newTotalPaid = newPayments.reduce((sum, payment) => sum + payment.amount, 0);
    onPaymentUpdate(newTotalPaid);

    setIsAddDialogOpen(false);
    paymentForm.reset();

    toast({
      title: "Payment added",
      description: `${values.paymentType === 'bank_transfer' ? 'Bank transfer' : 'Cheque'} payment of £${values.amount.toFixed(2)} added.`,
    });
  };

  // Remove payment
  const handleRemovePayment = (paymentId: number) => {
    const newPayments = payments.filter(p => p.id !== paymentId);
    setPayments(newPayments);
    
    const newTotalPaid = newPayments.reduce((sum, payment) => sum + payment.amount, 0);
    onPaymentUpdate(newTotalPaid);

    toast({
      title: "Payment removed",
      description: "Payment record has been removed.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Payment Details</h3>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          size="sm"
          disabled={remainingAmount <= 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment
        </Button>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Invoice Amount</p>
          <p className="font-semibold">£{invoiceAmount.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="font-semibold text-green-600">£{totalPaid.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Remaining</p>
          <p className={`font-semibold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            £{remainingAmount.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Payment Records */}
      {payments.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium">Payment Records</h4>
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {payment.paymentType === 'bank_transfer' ? (
                  <Building2 className="h-4 w-4 text-blue-600" />
                ) : (
                  <CreditCard className="h-4 w-4 text-purple-600" />
                )}
                <div>
                  <p className="font-medium">
                    {payment.paymentType === 'bank_transfer' ? 'Bank Transfer' : 'Cheque'}
                    {payment.chequeNumber && ` #${payment.chequeNumber}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    £{payment.amount.toFixed(2)} • {new Date(payment.paymentDate).toLocaleDateString()}
                  </p>
                  {payment.notes && (
                    <p className="text-sm text-muted-foreground">{payment.notes}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => payment.id && handleRemovePayment(payment.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <p>No payment records yet</p>
          <p className="text-sm">Add payment details to track how this invoice was paid</p>
        </div>
      )}

      {/* Add Payment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Payment Record</DialogTitle>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handleAddPayment)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount*</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={remainingAmount}
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={paymentForm.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date*</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {paymentForm.watch("paymentType") === "cheque" && (
                <FormField
                  control={paymentForm.control}
                  name="chequeNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cheque Number*</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter cheque number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={paymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional notes (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Payment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}