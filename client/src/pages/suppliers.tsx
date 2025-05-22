import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Pencil, Trash2, AlertTriangle, ArrowUpDown, Building, Phone, Mail, MapPin, ClipboardList } from "lucide-react";
import { SupplierSearch } from "./suppliers-search";
// Import standard components and hooks without achievements for now

// Interface for a supplier with debt information
interface SupplierWithDebt {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  branchId?: number | null;
  branchName?: string;
  outstandingAmount: number;
  // Track balances by branch
  branchBalances?: {[branchId: number]: {name: string, amount: number}};
  // Count of branches working with this supplier
  branchCount?: number;
}

// Schema for supplier form validation
const supplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export default function Suppliers() {
  const { user, isBranchManager } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithDebt | null>(null);
  
  // Get all branches for dropdown selectors and data enrichment
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    enabled: !isBranchManager, // Only fetch for admin users
  });
  
  // Get all invoices for additional data enrichment
  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
    enabled: !isBranchManager, // Only fetch for admin users
  });
  
  // Get all suppliers with total debt information
  const {
    data: suppliers = [],
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ["/api/suppliers", { includeSummary: true, branchId: isBranchManager ? user?.branchId : undefined }],
    queryFn: async () => {
      // If branch manager, filter by their branch - use the branch-specific endpoint
      const baseUrl = isBranchManager && user?.branchId
        ? `/api/suppliers/branch/${user.branchId}`
        : "/api/suppliers";
        
      // Add the withBranchBalances parameter to get branch-specific balances
      const url = `${baseUrl}?withBranchBalances=true`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      let data = await res.json();
      
      // Process the data to add additional needed fields
      if (!isBranchManager && Array.isArray(data)) {
        return data.map((supplier) => {
          // Create a supplier with formatted balance information
          const supplierWithDebt = {
            ...supplier,
            outstandingAmount: supplier.outstandingAmount || 0,
            branchBalances: {},
            branchCount: 0
          };
          
          // Process branch balances if available
          if (supplier.branchBalances && Array.isArray(supplier.branchBalances)) {
            let totalOutstanding = 0;
            
            // Process all balances to create a structured format
            supplier.branchBalances.forEach((balance) => {
              const branchId = balance.branchId;
              if (!branchId) return;
              
              // Add to branch balances
              if (!supplierWithDebt.branchBalances) {
                supplierWithDebt.branchBalances = {};
              }
              
              supplierWithDebt.branchBalances[branchId] = {
                name: balance.branchName || 'Unknown Branch',
                amount: balance.balance || 0
              };
              
              // Add to total outstanding amount (using absolute balance for calculation)
              totalOutstanding += (balance.balance || 0);
            });
            
            // Update total outstanding amount - this represents the sum of all branch balances
            supplierWithDebt.outstandingAmount = totalOutstanding;
            
            // Count branches working with this supplier
            if (supplierWithDebt.branchBalances) {
              supplierWithDebt.branchCount = Object.keys(supplierWithDebt.branchBalances).length;
            }
            
            // Find primary branch from invoices if available
            if (Array.isArray(invoices) && invoices.length > 0) {
              const supplierInvoices = invoices.filter(invoice => invoice.supplierId === supplier.id);
              if (supplierInvoices.length > 0) {
                // Sort invoices by date descending
                const sortedInvoices = [...supplierInvoices].sort((a, b) => 
                  new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
                );
                
                // Get the branch from the most recent invoice
                const primaryBranchId = sortedInvoices[0].branchId;
                const branch = branches.find(b => b.id === primaryBranchId);
                
                if (branch) {
                  supplierWithDebt.branchId = primaryBranchId;
                  supplierWithDebt.branchName = branch.name;
                }
              }
            }
          }
          
          return supplierWithDebt;
        });
      } else {
        // For branch managers or if branches not loaded yet
        return data.map((supplier) => ({
          ...supplier,
          branchName: isBranchManager && user?.branchId && Array.isArray(branches) && branches.length > 0 
            ? branches.find(b => b.id === Number(user.branchId))?.name || 'Your Branch'
            : 'No Branch',
          outstandingAmount: supplier.outstandingAmount || 0
        }));
      }
    }
  });
  
  // Filter suppliers based on search query
  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase().trim();
    return (
      supplier.name?.toLowerCase().includes(query) ||
      (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(query)) ||
      (supplier.email && supplier.email.toLowerCase().includes(query)) ||
      (supplier.phone && supplier.phone.toLowerCase().includes(query)) ||
      (supplier.address && supplier.address.toLowerCase().includes(query)) ||
      (supplier.notes && supplier.notes.toLowerCase().includes(query)) ||
      (supplier.branchName && supplier.branchName.toLowerCase().includes(query))
    );
  });
  
  // Sort suppliers by name
  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    if (sortOrder === "asc") {
      return a.name.localeCompare(b.name);
    } else {
      return b.name.localeCompare(a.name);
    }
  });
  
  // Handle search and sort
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };
  
  const handleSortToggle = () => {
    setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
  };
  
  // Form for adding a new supplier
  const addForm = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  });
  
  // Form for editing an existing supplier
  const editForm = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  });
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isAddDialogOpen) {
      addForm.reset();
    }
  }, [isAddDialogOpen, addForm]);
  
  // Set form values when editing a supplier
  useEffect(() => {
    if (selectedSupplier && isEditDialogOpen) {
      editForm.setValue("name", selectedSupplier.name || "");
      editForm.setValue("contactPerson", selectedSupplier.contactPerson || "");
      editForm.setValue("phone", selectedSupplier.phone || "");
      editForm.setValue("email", selectedSupplier.email || "");
      editForm.setValue("address", selectedSupplier.address || "");
      editForm.setValue("notes", selectedSupplier.notes || "");
    }
  }, [selectedSupplier, isEditDialogOpen, editForm]);
  
  // Mutation for adding a new supplier
  const addSupplierMutation = useMutation({
    mutationFn: async (values: z.infer<typeof supplierSchema>) => {
      const res = await apiRequest("POST", "/api/suppliers", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier added",
        description: "The supplier has been added successfully.",
      });
      
      setIsAddDialogOpen(false);
      
      // Achievement functionality removed temporarily
      
      // Invalidate general supplier list
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers", { includeSummary: true }] });
      
      // Invalidate branch-specific list if we're a branch manager
      if (isBranchManager && user?.branchId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/suppliers/branch/${user.branchId}`] 
        });
        queryClient.invalidateQueries({ 
          queryKey: [`/api/suppliers/branch/${user.branchId}`, { includeSummary: true }] 
        });
      }
      
      // Refresh the page to ensure all data is up-to-date
      // Use longer timeout to allow achievement celebration to be visible
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for editing a supplier
  const editSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof supplierSchema> }) => {
      // Suppliers can work with multiple branches, so no branch ID is needed
      const supplierData = { ...data };
      
      const res = await apiRequest("PUT", `/api/suppliers/${id}`, supplierData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier updated",
        description: "The supplier has been updated successfully.",
      });
      
      setIsEditDialogOpen(false);
      setSelectedSupplier(null);
      
      // Invalidate general supplier list
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers", { includeSummary: true }] });
      
      // Invalidate branch-specific list if we're a branch manager
      if (isBranchManager && user?.branchId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/suppliers/branch/${user.branchId}`] 
        });
        queryClient.invalidateQueries({ 
          queryKey: [`/api/suppliers/branch/${user.branchId}`, { includeSummary: true }] 
        });
      }
      
      // Refresh the page to ensure all data is up-to-date
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a supplier
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/suppliers/${id}`);
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Supplier deleted",
        description: "The supplier has been deleted successfully.",
      });
      
      // Invalidate general supplier lists
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers", { includeSummary: true }] });
      
      // Invalidate branch-specific lists if we're a branch manager
      if (isBranchManager && user?.branchId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/suppliers/branch/${user.branchId}`] 
        });
        queryClient.invalidateQueries({ 
          queryKey: [`/api/suppliers/branch/${user.branchId}`, { includeSummary: true }] 
        });
      }
      
      // Refresh the page to ensure all data is up-to-date
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onAddSubmit(values: z.infer<typeof supplierSchema>) {
    addSupplierMutation.mutate(values);
  }

  function onEditSubmit(values: z.infer<typeof supplierSchema>) {
    if (!selectedSupplier) return;
    editSupplierMutation.mutate({ id: selectedSupplier.id, data: values });
  }

  function handleEditSupplier(supplier: SupplierWithDebt) {
    setSelectedSupplier(supplier);
    setIsEditDialogOpen(true);
  }

  function handleDeleteSupplier(id: number) {
    if (window.confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) {
      deleteSupplierMutation.mutate(id);
    }
  }

  if (isError) {
    return (
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Error Loading Suppliers</h2>
              <p className="text-muted-foreground mb-4">
                Unable to load supplier information. Please try again.
              </p>
              <Button onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Search and filter */}
      <SupplierSearch
        onSearch={handleSearch}
        onSortToggle={handleSortToggle}
        sortOrder={sortOrder}
        totalSuppliers={suppliers.length}
        matchingSuppliers={filteredSuppliers.length}
        searchQuery={searchQuery}
      />

      {isLoading ? (
        <div>Loading suppliers...</div>
      ) : (
        <div>
          {sortedSuppliers.length > 0 ? (
            <div>
              {/* Exact match for the screenshot layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sortedSuppliers.map((supplier) => (
                  <div key={supplier.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <div className="text-primary bg-primary/10 p-1 rounded">
                            <Building className="h-5 w-5" />
                          </div>
                          <h3 className="font-bold text-lg">{supplier.name}</h3>
                        </div>
                        <div className={`px-2 py-1 text-xs rounded-full font-medium ${
                          supplier.outstandingAmount > 0 
                            ? 'bg-destructive/10 text-destructive' 
                            : supplier.outstandingAmount < 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {supplier.outstandingAmount > 0 
                            ? 'Outstanding' 
                            : supplier.outstandingAmount < 0 
                              ? 'Credit'
                              : 'Balanced'}
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="space-y-1 mt-2 text-muted-foreground">
                        {supplier.contactPerson && (
                          <div className="flex items-center gap-2">
                            <div className="w-5 flex justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            </div>
                            <span className="text-sm">{supplier.contactPerson}</span>
                          </div>
                        )}
                        
                        {supplier.phone && (
                          <div className="flex items-center gap-2">
                            <div className="w-5 flex justify-center">
                              <Phone className="h-4 w-4" />
                            </div>
                            <span className="text-sm">{supplier.phone}</span>
                          </div>
                        )}
                        
                        {supplier.email && (
                          <div className="flex items-center gap-2">
                            <div className="w-5 flex justify-center">
                              <Mail className="h-4 w-4" />
                            </div>
                            <span className="text-sm">{supplier.email}</span>
                          </div>
                        )}
                        
                        {supplier.address && (
                          <div className="flex items-start gap-2">
                            <div className="w-5 flex justify-center pt-0.5">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <span className="text-sm">{supplier.address}</span>
                          </div>
                        )}
                        
                        {/* Outstanding amount for this supplier */}
                        <div className="flex justify-between mt-3 font-medium">
                          <span>Outstanding Amount:</span>
                          <span className={`${supplier.outstandingAmount > 0 ? 'text-destructive' : supplier.outstandingAmount < 0 ? 'text-green-600' : ''}`}>
                            £{Math.abs(supplier.outstandingAmount).toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Branch breakdown */}
                        <div className="mt-2">
                          <h4 className="text-sm font-semibold border-b pb-1">Branch Breakdown</h4>
                          
                          {/* Branch balances list */}
                          {supplier.branchBalances && Object.keys(supplier.branchBalances).length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {Object.entries(supplier.branchBalances).map(([branchId, data]) => (
                                <div key={branchId} className="flex justify-between items-center">
                                  <span className="text-xs">{data.name}:</span>
                                  <span className={`text-xs font-medium ${data.amount > 0 ? 'text-destructive' : data.amount < 0 ? 'text-green-600' : ''}`}>
                                    £{Math.abs(data.amount).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-2">
                              <span className="text-xs text-muted-foreground">No branch details available</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="px-4 py-3 flex justify-between">
                      <Button variant="ghost" size="sm" onClick={() => handleEditSupplier(supplier)} className="h-8 px-2">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive h-8 px-2"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 pb-4 flex flex-col items-center justify-center min-h-[300px]">
                <div className="rounded-full bg-primary/10 p-3 mb-3">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No suppliers found</h3>
                {searchQuery ? (
                  <p className="text-muted-foreground text-center mb-4">
                    No suppliers match your search criteria. Try adjusting your search or clear it.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-center mb-4">
                    You haven't added any suppliers yet. Create your first supplier to get started.
                  </p>
                )}
                {searchQuery ? (
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                ) : (
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Supplier
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add supplier dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter supplier name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact person name" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email address" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Full address" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={addSupplierMutation.isPending}>
                  {addSupplierMutation.isPending ? "Saving..." : "Save Supplier"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit supplier dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter supplier name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact person name" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email address" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Full address" {...field} value={field.value || ""} />
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
                      <Textarea placeholder="Additional notes" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={editSupplierMutation.isPending}>
                  {editSupplierMutation.isPending ? "Saving..." : "Update Supplier"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}