import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBranchSchema, insertSupplierSchema, type Branch, type Supplier } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Store, Phone, MapPin, Users, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Extend the branch schema with additional validation
const branchSchema = insertBranchSchema.extend({
  name: z.string().min(2, { message: "Branch name must be at least 2 characters" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  contactNumber: z.string().min(5, { message: "Contact number must be at least 5 characters" }),
});

// Extend the supplier schema for branch-specific suppliers
const supplierSchema = insertSupplierSchema.extend({
  name: z.string().min(2, { message: "Supplier name must be at least 2 characters" }),
  branchId: z.number(),
});

export default function Branches() {
  const { toast } = useToast();
  const { checkAchievement } = useAchievements();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [selectedBranchForSupplier, setSelectedBranchForSupplier] = useState<Branch | null>(null);
  
  // Get all branches
  const {
    data: branches = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });

  // Form for adding a new branch
  const addForm = useForm<z.infer<typeof branchSchema>>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "",
      address: "",
      contactNumber: "",
      manager: "",
    },
  });

  // Form for editing a branch
  const editForm = useForm<z.infer<typeof branchSchema>>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "",
      address: "",
      contactNumber: "",
      manager: "",
    },
  });

  // Form for adding a new supplier to a branch
  const supplierForm = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      accountNumber: "",
      shortCode: "",
      notes: "",
      branchId: 0,
    },
  });

  // Mutation for adding a branch
  const addBranchMutation = useMutation({
    mutationFn: async (data: z.infer<typeof branchSchema>) => {
      const res = await apiRequest("POST", "/api/branches", data);
      return await res.json();
    },
    onSuccess: (newBranch) => {
      toast({
        title: "Branch added",
        description: "The branch has been added successfully.",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
      
      // Trigger branch added achievement
      checkAchievement(AchievementTrigger.BRANCH_ADDED);
      
      // Add a slight delay to allow the achievement to be visible
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
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

  // Mutation for editing a branch
  const editBranchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof branchSchema> }) => {
      const res = await apiRequest("PUT", `/api/branches/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Branch updated",
        description: "The branch has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedBranch(null);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a branch
  const deleteBranchMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/branches/${id}`);
      if (!res.ok) throw new Error("Failed to delete branch");
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Branch deleted",
        description: "The branch has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for adding a supplier to a branch
  const addSupplierMutation = useMutation({
    mutationFn: async (data: z.infer<typeof supplierSchema>) => {
      const res = await apiRequest("POST", "/api/suppliers", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier added",
        description: "The supplier has been added to the branch successfully.",
      });
      setIsSupplierDialogOpen(false);
      supplierForm.reset();
      setSelectedBranchForSupplier(null);
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onAddSubmit(values: z.infer<typeof branchSchema>) {
    addBranchMutation.mutate(values);
  }

  function onEditSubmit(values: z.infer<typeof branchSchema>) {
    if (!selectedBranch) return;
    editBranchMutation.mutate({ id: selectedBranch.id, data: values });
  }

  function onSupplierSubmit(values: z.infer<typeof supplierSchema>) {
    if (!selectedBranchForSupplier) return;
    addSupplierMutation.mutate({ ...values, branchId: selectedBranchForSupplier.id });
  }

  function handleEditBranch(branch: Branch) {
    setSelectedBranch(branch);
    editForm.reset({
      name: branch.name,
      address: branch.address,
      contactNumber: branch.contactNumber,
      manager: branch.manager || "",
    });
    setIsEditDialogOpen(true);
  }

  function handleDeleteBranch(id: number) {
    if (confirm("Are you sure you want to delete this branch?")) {
      deleteBranchMutation.mutate(id);
    }
  }

  function handleManageSuppliers(branch: Branch) {
    setSelectedBranchForSupplier(branch);
    supplierForm.reset({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      accountNumber: "",
      shortCode: "",
      notes: "",
      branchId: branch.id,
    });
    setIsSupplierDialogOpen(true);
  }

  if (isError) {
    return (
      <div className="container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
        </div>
        <div className="p-12 text-center">
          <p className="text-lg text-red-500">Error loading branches. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branch Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your business locations and their details
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Branch</DialogTitle>
              <DialogDescription>
                Add a new branch location to your business.
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Branch" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Business Street, City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+44 1234 567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="manager"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch Manager</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Smith" 
                          value={field.value || ""} 
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        The name of the person managing this branch
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addBranchMutation.isPending}
                  >
                    {addBranchMutation.isPending ? "Saving..." : "Save Branch"}
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
      ) : branches.length === 0 ? (
        <Card className="w-full py-12">
          <CardContent className="flex flex-col items-center justify-center text-center p-6">
            <Store className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">No Branches Yet</CardTitle>
            <CardDescription className="mb-6">
              You haven't added any branches to your system yet. <br />
              Click the "Add Branch" button to create your first branch.
            </CardDescription>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Branch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch: Branch) => (
            <Card key={branch.id} className="overflow-hidden border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Store className="h-5 w-5 mr-2 text-primary" />
                  {branch.name}
                </CardTitle>
                {branch.manager && (
                  <CardDescription>Manager: {branch.manager}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <span>{branch.address}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{branch.contactNumber}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 space-y-2">
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditBranch(branch)}
                    className="flex-1"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteBranch(branch.id)}
                    className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>

              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Supplier Dialog */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>
              Add a new supplier to {selectedBranchForSupplier?.name} branch.
            </DialogDescription>
          </DialogHeader>
          <Form {...supplierForm}>
            <form onSubmit={supplierForm.handleSubmit(onSupplierSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={supplierForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Company Ltd" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={supplierForm.control}
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
                <FormField
                  control={supplierForm.control}
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
                <FormField
                  control={supplierForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={supplierForm.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={supplierForm.control}
                  name="shortCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Code</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={supplierForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="123 Business Street, City, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={supplierForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about this supplier..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addSupplierMutation.isPending}
                >
                  {addSupplierMutation.isPending ? "Adding..." : "Add Supplier"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit branch dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>Update the branch details.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="manager"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Manager</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  disabled={editBranchMutation.isPending}
                >
                  {editBranchMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}