import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PlusIcon, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

// User form schema
const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["admin", "branch_manager", "accountant"]),
  branchId: z.string().optional(),
});

export default function Users() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  // Get users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  // Get branches for the form
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
  });

  // Initialize form
  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "branch_manager",
      branchId: "",
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userSchema>) => {
      return await apiRequest("POST", "/api/users", {
        ...data,
        branchId: data.branchId ? parseInt(data.branchId) : undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The user has been created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: number; userData: any }) => {
      return await apiRequest("PUT", `/api/users/${data.id}`, {
        ...data.userData,
        branchId: data.userData.branchId ? parseInt(data.userData.branchId) : undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user has been updated successfully",
      });
      setIsDialogOpen(false);
      setEditingUserId(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(data: z.infer<typeof userSchema>) {
    if (editingUserId !== null) {
      // If editing, remove password if it's empty
      const userData = { ...data };
      if (!userData.password) {
        delete userData.password;
      }
      updateUserMutation.mutate({ id: editingUserId, userData });
    } else {
      createUserMutation.mutate(data);
    }
  }

  // Handle edit user
  function handleEditUser(user: any) {
    setEditingUserId(user.id);
    form.reset({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      branchId: user.branchId ? user.branchId.toString() : undefined,
      password: "", // Leave password empty when editing
    });
    setIsDialogOpen(true);
  }

  // Handle delete user
  function handleDeleteUser(id: number) {
    if (currentUser?.id === id) {
      toast({
        title: "Cannot delete yourself",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(id);
    }
  }

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button 
          onClick={() => {
            setEditingUserId(null);
            form.reset({
              username: "",
              password: "",
              fullName: "",
              email: "",
              role: "branch_manager",
              branchId: "",
            });
            setIsDialogOpen(true);
          }} 
          className="flex items-center gap-1"
        >
          <PlusIcon className="h-4 w-4" />
          <span>New User</span>
        </Button>
      </div>

      {/* User List */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingUsers ? (
              // Loading state
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: any) => {
                // Find branch name
                const branch = branches.find((b: any) => b.id === user.branchId);
                
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          user.role === "admin" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300" :
                          user.role === "accountant" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300" :
                          "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                        }
                      >
                        {user.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {branch ? branch.name : user.role === "admin" ? "All Branches" : "None"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleEditUser(user)} 
                          variant="ghost" 
                          size="sm"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteUser(user.id)} 
                          variant="ghost" 
                          size="sm"
                          disabled={deleteUserMutation.isPending || user.id === currentUser?.id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* User Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUserId !== null ? "Edit User" : "Create New User"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={editingUserId !== null} />
                    </FormControl>
                    {editingUserId !== null && (
                      <FormDescription>
                        Username cannot be changed after creation
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {editingUserId !== null ? "New Password" : "Password"}
                    </FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    {editingUserId !== null && (
                      <FormDescription>
                        Leave blank to keep current password
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
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
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                        <SelectItem value="branch_manager">Branch Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.watch("role") === "branch_manager" && (
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((branch: any) => (
                            <SelectItem 
                              key={branch.id} 
                              value={branch.id.toString()}
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
              )}
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingUserId(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {createUserMutation.isPending || updateUserMutation.isPending
                    ? "Saving..."
                    : editingUserId !== null
                    ? "Update User"
                    : "Create User"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
