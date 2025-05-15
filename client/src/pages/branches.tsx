import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBranchSchema, type Branch } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
import { Plus, Pencil, Trash2, Store, Phone, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Extend the branch schema with additional validation
const branchSchema = insertBranchSchema.extend({
  name: z.string().min(2, { message: "Branch name must be at least 2 characters" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  contactNumber: z.string().min(5, { message: "Contact number must be at least 5 characters" }),
});

export default function Branches() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  
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

  // Mutation for adding a branch
  const addBranchMutation = useMutation({
    mutationFn: async (data: z.infer<typeof branchSchema>) => {
      const res = await apiRequest("POST", "/api/branches", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Branch added",
        description: "The branch has been added successfully.",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
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

  // Mutation for editing a branch
  const editBranchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof branchSchema> }) => {
      const res = await apiRequest("PATCH", `/api/branches/${id}`, data);
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

  function onAddSubmit(values: z.infer<typeof branchSchema>) {
    addBranchMutation.mutate(values);
  }

  function onEditSubmit(values: z.infer<typeof branchSchema>) {
    if (!selectedBranch) return;
    editBranchMutation.mutate({ id: selectedBranch.id, data: values });
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
              <CardFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditBranch(branch)}
                  className="mr-2"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteBranch(branch.id)}
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