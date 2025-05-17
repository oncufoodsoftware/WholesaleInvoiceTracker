import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, type Supplier } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useAchievements, AchievementTrigger } from "@/hooks/use-achievements";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  DialogTrigger,
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
import { Plus, Pencil, Trash2, Building, Mail, Phone, FileText, MapPin, Search, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Extend the supplier schema with additional validation
const supplierSchema = insertSupplierSchema.extend({
  name: z.string().min(2, { message: "Supplier name must be at least 2 characters" }),
  contactPerson: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email address" }).optional().or(z.literal("")),
  phone: z.string().min(5, { message: "Phone must be at least 5 characters" }).optional().or(z.literal("")),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

// Define an interface that extends Supplier with debt information and branch data
interface SupplierWithDebt extends Supplier {
  outstandingAmount: number;
  branchName?: string;
  // Track balances by branch
  branchBalances?: {[branchId: number]: {name: string, amount: number}};
  // Count of branches working with this supplier
  branchCount?: number;
}

export default function Suppliers() {
  const { toast } = useToast();
  const { checkAchievement } = useAchievements();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Get user info for role-based filtering
  const { user } = useAuth();
  const isBranchManager = user?.role === "branch_manager";
  
  // Get branches data for display
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    enabled: !isBranchManager, // Only fetch all branches for admin users
  });
  
  // Implement auto-refresh on page focus
  useEffect(() => {
    const refreshData = () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/suppliers"]
      });
    };
    
    // Refresh when page becomes visible
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refreshData();
      }
    });
    
    // Refresh once on initial component mount
    refreshData();
    
    return () => {
      document.removeEventListener("visibilitychange", refreshData);
    };
  }, []);
  
  // Get additional data - invoices to determine branch associations
  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
    enabled: !isBranchManager, // Only fetch for admin users
  });
  
  // Get all suppliers with total debt information
  const {
    data: suppliers = [] as SupplierWithDebt[],
    isLoading,
    isError,
  } = useQuery<SupplierWithDebt[]>({
    queryKey: ["/api/suppliers", { includeSummary: true, branchId: isBranchManager ? user?.branchId : undefined }],
    queryFn: async () => {
      // If branch manager, filter by their branch - use the branch-specific endpoint
      const url = isBranchManager && user?.branchId
        ? `/api/suppliers/branch/${user.branchId}?includeSummary=true`
        : "/api/suppliers?includeSummary=true";
        
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      let data = await res.json();
      
      // For admin users, enrich supplier data with branch names from invoices
      if (!isBranchManager && Array.isArray(branches) && branches.length > 0 && Array.isArray(invoices) && invoices.length > 0) {
        data = data.map((supplier: any) => {
          // Find all invoices for this supplier
          const supplierInvoices = invoices.filter((inv: any) => inv.supplierId === supplier.id);
          
          // Calculate balances by branch
          const branchBalances: {[branchId: number]: {name: string, amount: number}} = {};
          let totalOutstanding = 0;
          
          // Process all invoices to calculate branch-specific balances
          supplierInvoices.forEach((invoice: any) => {
            const branchId = invoice.branchId;
            if (!branchId) return;
            
            // Find branch name
            const branch = branches.find((b: any) => b.id === branchId);
            if (!branch) return;
            
            // Initialize branch balance if not exists
            if (!branchBalances[branchId]) {
              branchBalances[branchId] = {
                name: branch.name,
                amount: 0
              };
            }
            
            // Calculate amount based on invoice type
            const invoiceAmount = (invoice.totalAmount - (invoice.paidAmount || 0));
            const amountToAdd = invoice.type === 'credit_note' ? -invoiceAmount : invoiceAmount;
            
            // Add to branch balance
            branchBalances[branchId].amount += amountToAdd;
            totalOutstanding += amountToAdd;
          });
          
          // Find the most recent invoice for this supplier to determine its primary branch
          const sortedInvoices = [...supplierInvoices].sort((a: any, b: any) => 
            new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
          );
          
          const primaryBranchId = sortedInvoices.length > 0 ? sortedInvoices[0].branchId : null;
          const branch = branches.find((b: any) => b.id === primaryBranchId);
          
          return {
            ...supplier,
            branchId: primaryBranchId,
            branchName: branch ? branch.name : 'No Branch',
            outstandingAmount: supplier.outstandingAmount || 0,
            branchBalances: branchBalances,
            branchCount: Object.keys(branchBalances).length
          };
        });
      } else {
        // For branch managers or if branches not loaded yet
        data = data.map((supplier: any) => ({
          ...supplier,
          branchName: isBranchManager && user?.branchId && Array.isArray(branches) && branches.length > 0 
            ? branches.find((b: any) => b.id === Number(user.branchId))?.name || 'Your Branch'
            : 'No Branch',
          outstandingAmount: supplier.outstandingAmount || 0
        }));
      }
      
      return data;
    },
    refetchOnWindowFocus: true, // Auto-refresh when tab is focused again
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
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    
    if (sortOrder === 'asc') {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  // Toggle sort order function
  const toggleSortOrder = () => {
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  // Form for adding a new supplier
  const addForm = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  // Form for editing a supplier
  const editForm = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  // Mutation for adding a supplier
  const addSupplierMutation = useMutation({
    mutationFn: async (data: z.infer<typeof supplierSchema>) => {
      // Suppliers can work with multiple branches, so no branch ID is needed
      const supplierData = { ...data };
      
      const res = await apiRequest("POST", "/api/suppliers", supplierData);
      return await res.json();
    },
    onSuccess: (newSupplier) => {
      toast({
        title: "Supplier added",
        description: "The supplier has been added successfully.",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
      
      // Trigger achievement celebrations
      checkAchievement(AchievementTrigger.SUPPLIER_ADDED);
      
      // Get current supplier count for milestone achievement
      const currentSuppliers = queryClient.getQueryData(["/api/suppliers"]) as any[];
      if (currentSuppliers && Array.isArray(currentSuppliers)) {
        // Trigger milestone achievement if applicable
        checkAchievement(AchievementTrigger.SUPPLIER_COUNT_MILESTONE, { 
          count: currentSuppliers.length + 1 // +1 for the one we just added
        });
      }
      
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
      editForm.reset();
      
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

  // Mutation for deleting a supplier
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/suppliers/${id}`);
      if (!res.ok) throw new Error("Failed to delete supplier");
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

  function handleEditSupplier(supplier: Supplier) {
    setSelectedSupplier(supplier);
    editForm.reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
    setIsEditDialogOpen(true);
  }

  function handleDeleteSupplier(id: number) {
    if (confirm("Are you sure you want to delete this supplier?")) {
      deleteSupplierMutation.mutate(id);
    }
  }

  if (isError) {
    return (
      <div className="container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
        </div>
        <div className="p-12 text-center">
          <p className="text-lg text-red-500">Error loading suppliers. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your suppliers and vendor details
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 max-w-xs"
            />
          </div>
          <Button variant="outline" size="icon" onClick={toggleSortOrder} title={`Sort ${sortOrder === 'asc' ? 'Z-A' : 'A-Z'}`}>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
                <DialogDescription>
                  Add a new supplier to your business.
                </DialogDescription>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier Name</FormLabel>
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
                          <Input placeholder="Enter contact person" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
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
                          <Textarea placeholder="Enter address" {...field} />
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
                          <Textarea placeholder="Enter notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={addSupplierMutation.isPending}>
                      {addSupplierMutation.isPending ? "Adding..." : "Add Supplier"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Results summary */}
      <div className="mb-4 text-sm text-muted-foreground">
        {searchQuery ? 
          `Showing ${filteredSuppliers.length} of ${suppliers.length} suppliers matching "${searchQuery}"` : 
          `Showing all ${suppliers.length} suppliers`
        }
        {searchQuery && filteredSuppliers.length === 0 && (
          <div className="mt-2">
            <Button variant="link" className="p-0" onClick={() => setSearchQuery("")}>
              Clear search
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedSuppliers.length > 0 ? (
            sortedSuppliers.map((supplier: SupplierWithDebt) => (
              <Card key={supplier.id} className="overflow-hidden border border-border">
                <CardHeader className="pb-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-primary" />
                      <CardTitle>{supplier.name}</CardTitle>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-md">
                        No Branch
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-1">
                    Contact: {supplier.contactPerson || "Person"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-1 space-y-2 text-sm">
                  {supplier.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.address ? (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{supplier.address}</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Address</span>
                    </div>
                  )}
                  
                  {/* Balance display */}
                  {!isBranchManager && supplier.branchBalances && Object.keys(supplier.branchBalances).length > 0 ? (
                    <div className="space-y-2 py-2">
                      {Object.entries(supplier.branchBalances).map(([branchId, { name, amount }]) => (
                        <div key={branchId} className="flex justify-between items-center">
                          <span>No Branch Balance:</span>
                          <span className={amount > 0 ? 'text-destructive' : ''}>
                            {new Intl.NumberFormat('en-GB', {
                              style: 'currency',
                              currency: 'GBP'
                            }).format(amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center py-2">
                      <span>No Branch Balance:</span>
                      <span className={supplier.outstandingAmount > 0 ? 'text-destructive' : ''}>
                        {new Intl.NumberFormat('en-GB', {
                          style: 'currency',
                          currency: 'GBP'
                        }).format(supplier.outstandingAmount)}
                      </span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => handleEditSupplier(supplier)} className="px-3">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive px-3"
                    onClick={() => handleDeleteSupplier(supplier.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-3 p-12 text-center">
              <p className="text-lg text-muted-foreground">No suppliers found matching your search criteria.</p>
              <Button variant="link" onClick={() => setSearchQuery("")}>Clear search</Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Supplier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Update supplier details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <Textarea {...field} />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={editSupplierMutation.isPending}>
                  {editSupplierMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}