import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PlusIcon, FileDownIcon, GridIcon, ListIcon } from "lucide-react";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Invoices() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Query invoices with filters
  const { 
    data: invoices = [], 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ["/api/invoices", filters],
    queryFn: async ({ queryKey }) => {
      const [_, filterParams] = queryKey;
      if (Object.keys(filterParams).length > 0) {
        const res = await apiRequest("POST", "/api/invoices/filter", filterParams);
        return await res.json();
      } else {
        const res = await fetch("/api/invoices", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch invoices");
        return await res.json();
      }
    }
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Invoice deleted",
        description: "The invoice has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete invoice: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle filter application
  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  // Calculate pagination
  const totalItems = invoices.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedInvoices = invoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export invoices
  const handleExport = () => {
    toast({
      title: "Export started",
      description: "Your invoices are being exported",
    });
    // In a real app, this would trigger a file download
  };

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Invoice Management</h2>
        <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-1">
          <PlusIcon className="h-4 w-4" />
          <span>New Invoice</span>
        </Button>
      </div>

      {/* Filters */}
      <InvoiceFilters 
        onApplyFilters={handleApplyFilters} 
        onResetFilters={handleResetFilters}
      />

      {/* Invoice List */}
      <div className="card mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Invoice List</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="flex items-center gap-1">
              <FileDownIcon className="h-4 w-4" />
              <span>Export</span>
            </Button>
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="px-3 py-1"
                onClick={() => setViewMode("grid")}
              >
                <GridIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="px-3 py-1"
                onClick={() => setViewMode("list")}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <InvoiceList 
          invoices={paginatedInvoices} 
          isLoading={isLoading} 
          viewMode={viewMode}
          onDelete={(id) => {
            if (window.confirm("Are you sure you want to delete this invoice?")) {
              deleteInvoiceMutation.mutate(id);
            }
          }}
          onView={(id) => {
            window.open(`/uploads/${id}`, '_blank');
          }}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} invoices
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              {totalPages > 5 && <span className="mx-1">...</span>}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Invoice Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <InvoiceForm 
          onClose={() => setIsDialogOpen(false)}
          onSuccess={() => {
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
            toast({
              title: "Success",
              description: "Invoice created successfully",
            });
          }}
        />
      </Dialog>
    </div>
  );
}
