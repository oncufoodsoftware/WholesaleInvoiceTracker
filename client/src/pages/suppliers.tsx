import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, type Supplier } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Building, Mail, Phone, FileText, MapPin } from "lucide-react";
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
  branchId: z.number().optional(),
});

// Define an interface that extends Supplier with debt information and branch data
interface SupplierWithDebt extends Supplier {
  outstandingAmount: number;
  branchName?: string;
}

export default function Suppliers() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
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
      
      // For admin users, enrich supplier data with branch names
      if (!isBranchManager && branches.length > 0) {
        data = data.map((supplier: any) => {
          const branch = branches.find((b: any) => b.id === supplier.branchId);
          return {
            ...supplier,
            branchName: branch ? branch.name : 'No Branch',
            outstandingAmount: supplier.outstandingAmount || 0
          };
        });
      } else {
        // For branch managers or if branches not loaded yet
        data = data.map((supplier: any) => ({
          ...supplier,
          outstandingAmount: supplier.outstandingAmount || 0
        }));
      }
      
      return data;
    },
    refetchOnWindowFocus: true, // Auto-refresh when tab is focused again
  });

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
      branchId: isBranchManager && user?.branchId ? Number(user.branchId) : undefined,
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
      // For branch managers, automatically set the branchId to their branch
      const supplierData = {
        ...data,
        // If branch manager, set to their branch; otherwise use the selected branch from form
        branchId: isBranchManager && user?.branchId ? Number(user.branchId) : data.branchId
      };
      
      const res = await apiRequest("POST", "/api/suppliers", supplierData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier added",
        description: "The supplier has been added successfully.",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
      
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
      // For branch managers, automatically set the branchId to their branch
      const supplierData = {
        ...data,
        // If branch manager, set to their branch; otherwise use the selected branch from form
        branchId: isBranchManager && user?.branchId ? Number(user.branchId) : data.branchId
      };
      
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
      // For branch managers, always use their branch ID
      // For admin users, use the supplier's branch ID or undefined if not set
      branchId: isBranchManager && user?.branchId 
        ? Number(user.branchId) 
        : (supplier as any).branchId,
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
    <div className="container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your suppliers and vendor details
          </p>
        </div>
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
                        <Input placeholder="ABC Wholesalers" {...field} />
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
                        <Input placeholder="John Smith" {...field} />
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
                          <Input type="email" placeholder="contact@supplier.com" {...field} />
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
                          <Input placeholder="+44 1234 567890" {...field} />
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
                        <Textarea placeholder="123 Supplier Street, City" {...field} />
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
                        <Textarea placeholder="Additional information about this supplier" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Branch selection - only for admin users */}
                {!isBranchManager && (
                  <FormField
                    control={addForm.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString() || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
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
                        <FormDescription>
                          The branch this supplier belongs to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addSupplierMutation.isPending}
                  >
                    {addSupplierMutation.isPending ? "Saving..." : "Save Supplier"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-64">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="pb-2">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-20 mr-2" />
                <Skeleton className="h-9 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <Card className="w-full py-12">
          <CardContent className="flex flex-col items-center justify-center text-center p-6">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">No Suppliers Yet</CardTitle>
            <CardDescription className="mb-6">
              You haven't added any suppliers to your system yet. <br />
              Click the "Add Supplier" button to create your first supplier.
            </CardDescription>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Supplier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier: SupplierWithDebt) => (
            <Card key={supplier.id} className="overflow-hidden border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building className="h-5 w-5 mr-2 text-primary" />
                    {supplier.name}
                  </div>
                  <div className="flex items-center">
                    {!isBranchManager && supplier.branchName && (
                      <div className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded mr-2">
                        {supplier.branchName}
                      </div>
                    )}
                    {supplier.outstandingAmount > 0 && (
                      <div className="bg-destructive/10 text-destructive text-xs px-2 py-1 rounded-full">
                        Outstanding
                      </div>
                    )}
                  </div>
                </CardTitle>
                {supplier.contactPerson && (
                  <CardDescription>Contact: {supplier.contactPerson}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2 text-sm">
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
                  {supplier.address && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                      <span className="line-clamp-2">{supplier.address}</span>
                    </div>
                  )}
                  
                  {/* Branch Information - only show for admin users */}
                  {!isBranchManager && supplier.branchName && (
                    <div className="flex items-center mt-2">
                      <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">Branch: <span className="font-medium">{supplier.branchName}</span></span>
                    </div>
                  )}
                  
                  {/* Total Debt Information */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Outstanding:</span>
                      <span className={`text-sm font-bold ${supplier.outstandingAmount > 0 ? 'text-destructive' : supplier.outstandingAmount < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {new Intl.NumberFormat('en-GB', {
                          style: 'currency',
                          currency: 'GBP'
                        }).format(supplier.outstandingAmount)}
                      </span>
                    </div>
                    {supplier.outstandingAmount < 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        Credit in your favor (credit notes exceed outstanding invoices)
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSupplier(supplier)}
                  className="mr-2"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteSupplier(supplier.id)}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit supplier dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>Update the supplier details.</DialogDescription>
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
                        <Input type="email" {...field} />
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
              
              {/* Branch selection - only for admin users */}
              {!isBranchManager && (
                <FormField
                  control={editForm.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString() || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
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
                      <FormDescription>
                        The branch this supplier belongs to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editSupplierMutation.isPending}
                >
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