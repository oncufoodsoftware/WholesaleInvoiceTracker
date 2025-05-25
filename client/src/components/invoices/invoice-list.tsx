import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { InvoiceForm } from "./invoice-form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface InvoiceListProps {
  invoices: any[];
  isLoading: boolean;
  viewMode: "list" | "grid";
  onDelete: (id: number) => void;
  onView: (id: number) => void;
}

export function InvoiceList({
  invoices,
  isLoading,
  viewMode,
  onDelete,
  onView,
}: InvoiceListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Get suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Get branches
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
  });

  // Get supplier name
  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find((s: any) => s.id === supplierId);
    return supplier ? supplier.name : "Unknown";
  };

  // Get branch name
  const getBranchName = (branchId: number) => {
    const branch = branches.find((b: any) => b.id === branchId);
    return branch ? branch.name : "Unknown";
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.length === invoices.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(invoices.map((invoice) => invoice.id));
    }
  };

  // Handle select row
  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // Handle edit invoice
  const handleEditInvoice = (id: number) => {
    setEditingInvoiceId(id);
    setIsEditDialogOpen(true);
  };

  // Format invoice status
  const formatStatus = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-success/10 text-success hover:bg-success/20">
            Paid
          </Badge>
        );
      case "partially_paid":
        return (
          <Badge className="bg-warning/10 text-warning hover:bg-warning/20">
            Partially Paid
          </Badge>
        );
      case "unpaid":
        return (
          <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
            Unpaid
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Format invoice type
  const formatType = (type: string) => {
    switch (type) {
      case "standard":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            Standard
          </Badge>
        );
      case "credit_note":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
            Credit Note
          </Badge>
        );
      case "cash":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Cash Invoice
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Format date to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Check if user can edit/delete
  const canEdit = (invoice: any) => {
    if (user?.role === "admin" || user?.role === "accountant") return true;
    if (user?.role === "branch_manager" && user.branchId === invoice.branchId) return true;
    return false;
  };

  if (viewMode === "list") {
    return (
      <>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.length === invoices.length && invoices.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Invoice Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(invoice.id)}
                        onCheckedChange={() => handleSelectRow(invoice.id)}
                        aria-label={`Select invoice ${invoice.invoiceNumber}`}
                      />
                    </TableCell>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{getSupplierName(invoice.supplierId)}</TableCell>
                    <TableCell>{getBranchName(invoice.branchId)}</TableCell>
                    <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                    <TableCell>{formatType(invoice.type)}</TableCell>
                    <TableCell className={invoice.type === "credit_note" ? "text-destructive font-medium" : ""}>
                      {invoice.type === "credit_note" ? "-" : ""}£{invoice.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className={
                          invoice.paidAmount > invoice.amount
                            ? "text-green-600 font-medium"
                            : invoice.paidAmount < invoice.amount && invoice.paidAmount > 0
                              ? "text-amber-600 font-medium"
                              : ""
                        }>
                          £{(invoice.paidAmount || 0).toLocaleString()}
                        </span>
                        {invoice.paidAmount > invoice.amount && (
                          <span className="ml-1 text-xs text-green-600">
                            (+£{(invoice.paidAmount - invoice.amount).toLocaleString()})
                          </span>
                        )}
                        {invoice.paidAmount < invoice.amount && invoice.paidAmount > 0 && (
                          <span className="ml-1 text-xs text-amber-600">
                            (-£{(invoice.amount - invoice.paidAmount).toLocaleString()})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatStatus(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {invoice.fileUrl && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onView(invoice.id)}
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        {canEdit(invoice) && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditInvoice(invoice.id)}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onDelete(invoice.id)}
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

        {/* Edit Invoice Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          {editingInvoiceId && (
            <InvoiceForm
              invoiceId={editingInvoiceId}
              onClose={() => {
                setIsEditDialogOpen(false);
                setEditingInvoiceId(null);
              }}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setEditingInvoiceId(null);
                
                // Get the active query keys to check if we're in a filtered view
                const activeQueries = queryClient.getQueryCache().findAll({ 
                  predicate: query => query.queryKey[0] === "/api/invoices" && query.queryKey.length > 1 
                });
                
                if (activeQueries.length > 0) {
                  // We have active filtered queries, so invalidate those specifically
                  activeQueries.forEach(query => {
                    queryClient.invalidateQueries({ queryKey: query.queryKey });
                  });
                } else {
                  // No filters active, just invalidate the main invoice list
                  queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
                }
                
                // Always invalidate suppliers for balance updates
                queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
                
                toast({
                  title: "Success",
                  description: "Invoice updated successfully",
                });
              }}
            />
          )}
        </Dialog>
      </>
    );
  }

  // Grid view mode
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-5 w-20" />
                  <div className="flex space-x-1">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </div>
            ))
        ) : invoices.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No invoices found
          </div>
        ) : (
          invoices.map((invoice) => (
            <div key={invoice.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{invoice.invoiceNumber}</h3>
                {formatStatus(invoice.status)}
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Supplier:</span> {getSupplierName(invoice.supplierId)}</p>
                <p><span className="text-muted-foreground">Branch:</span> {getBranchName(invoice.branchId)}</p>
                <p><span className="text-muted-foreground">Date:</span> {formatDate(invoice.invoiceDate)}</p>
                <p><span className="text-muted-foreground">Type:</span> {invoice.type.replace('_', ' ')}</p>
                <p><span className="text-muted-foreground">Amount:</span> £{invoice.amount.toLocaleString()}</p>
              </div>
              <div className="flex justify-between items-center pt-2">
                <Checkbox
                  checked={selectedRows.includes(invoice.id)}
                  onCheckedChange={() => handleSelectRow(invoice.id)}
                  aria-label={`Select invoice ${invoice.invoiceNumber}`}
                />
                <div className="flex items-center space-x-1">
                  {invoice.fileUrl && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onView(invoice.id)}
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                  {canEdit(invoice) && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditInvoice(invoice.id)}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(invoice.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        {editingInvoiceId && (
          <InvoiceForm
            invoiceId={editingInvoiceId}
            onClose={() => {
              setIsEditDialogOpen(false);
              setEditingInvoiceId(null);
            }}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              setEditingInvoiceId(null);
              
              // Get the active query keys to check if we're in a filtered view
              const activeQueries = queryClient.getQueryCache().findAll({ 
                predicate: query => query.queryKey[0] === "/api/invoices" && query.queryKey.length > 1 
              });
              
              if (activeQueries.length > 0) {
                // We have active filtered queries, so invalidate those specifically
                activeQueries.forEach(query => {
                  queryClient.invalidateQueries({ queryKey: query.queryKey });
                });
              } else {
                // No filters active, just invalidate the main invoice list
                queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
              }
              
              // Always invalidate suppliers for balance updates
              queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
              
              toast({
                title: "Success",
                description: "Invoice updated successfully",
              });
            }}
          />
        )}
      </Dialog>
    </>
  );
}
