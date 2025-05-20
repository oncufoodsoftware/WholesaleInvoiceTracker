import { useState, useEffect } from "react";
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
  DialogTitle,
  DialogDescription 
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PlusIcon, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Page for which permissions can be assigned
const pages = [
  { id: 'dashboard', name: 'Dashboard', description: 'View and interact with dashboard' },
  { id: 'invoices', name: 'Invoices', description: 'Manage invoices and payments' },
  { id: 'suppliers', name: 'Suppliers', description: 'Manage supplier information' },
  { id: 'branches', name: 'Branches', description: 'Manage branch information' },
  { id: 'risk_analysis', name: 'Risk Analysis', description: 'Access supplier risk insights' },
  { id: 'reports', name: 'Reports', description: 'View and generate reports' },
  { id: 'users', name: 'Users', description: 'Manage system users' },
  { id: 'roles', name: 'Roles', description: 'Manage user roles and permissions' },
  { id: 'settings', name: 'Settings', description: 'Configure system settings' }
];

// Role form schema
const roleSchema = z.object({
  name: z.string().min(3, "Role name must be at least 3 characters"),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
});

// Permission form schema
const permissionSchema = z.record(z.string(), z.object({
  canView: z.boolean().default(false),
  canCreate: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false),
}));

export default function Roles() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState<string>("");

  // Get roles
  const { data: rolesData = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["/api/roles"],
  });
  
  // Type assertion for roles
  const roles = rolesData as any[];

  // Get permissions for a role
  const { data: rolePermissionsData = {}, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["/api/roles", selectedRoleId, "permissions"],
    enabled: selectedRoleId !== null,
  });
  
  // Type assertion for permissions with default empty array
  const rolePermissions = {
    permissions: (rolePermissionsData as any)?.permissions || []
  };

  // Initialize forms
  const roleForm = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      isDefault: false,
    },
  });

  const permissionForm = useForm<z.infer<typeof permissionSchema>>({
    resolver: zodResolver(permissionSchema),
    defaultValues: pages.reduce((acc, page) => ({ 
      ...acc, 
      [page.id]: { canView: false, canCreate: false, canEdit: false, canDelete: false } 
    }), {}),
  });

  // Reset permission form when role changes
  useEffect(() => {
    if (rolePermissions && Object.keys(rolePermissions).length > 0) {
      // Transform API permissions to form format
      const formPermissions = pages.reduce((acc, page) => {
        const permission = rolePermissions.permissions?.find((p: any) => p.page === page.id);
        return { 
          ...acc, 
          [page.id]: { 
            canView: permission?.canView || false, 
            canCreate: permission?.canCreate || false, 
            canEdit: permission?.canEdit || false, 
            canDelete: permission?.canDelete || false 
          } 
        };
      }, {});
      
      permissionForm.reset(formPermissions);
    } else {
      // Reset to defaults if no permissions set
      permissionForm.reset(pages.reduce((acc, page) => ({ 
        ...acc, 
        [page.id]: { canView: false, canCreate: false, canEdit: false, canDelete: false } 
      }), {}));
    }
  }, [rolePermissions, permissionForm]);

  // Update role form when editing
  useEffect(() => {
    if (editingRoleId !== null) {
      const role = roles.find((r: any) => r.id === editingRoleId);
      if (role) {
        roleForm.reset({
          name: role.name,
          description: role.description || "",
          isDefault: role.isDefault || false,
        });
      }
    }
  }, [editingRoleId, roles, roleForm]);

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof roleSchema>) => {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create role");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Role created",
        description: "The role has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsDialogOpen(false);
      roleForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create role: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof roleSchema> }) => {
      const response = await fetch(`/api/roles/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update role");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "The role has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsDialogOpen(false);
      setEditingRoleId(null);
      roleForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update role: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/roles/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete role");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Role deleted",
        description: "The role has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete role: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: number; permissions: any }) => {
      const response = await fetch(`/api/roles/${roleId}/permissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ permissions })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update permissions");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Permissions updated",
        description: "The role permissions have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setPermissionsDialogOpen(false);
      setSelectedRoleId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update permissions: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle role form submission
  const onRoleSubmit = (data: z.infer<typeof roleSchema>) => {
    if (editingRoleId !== null) {
      updateRoleMutation.mutate({ id: editingRoleId, data });
    } else {
      createRoleMutation.mutate(data);
    }
  };

  // Handle permission form submission
  const onPermissionSubmit = (data: z.infer<typeof permissionSchema>) => {
    if (selectedRoleId === null) return;
    
    // Transform form data to API format
    const permissions = Object.entries(data).map(([pageId, perms]) => ({
      page: pageId,
      ...perms
    }));
    
    updatePermissionsMutation.mutate({ 
      roleId: selectedRoleId, 
      permissions 
    });
  };

  // Handle role deletion
  const handleDeleteRole = (id: number) => {
    if (window.confirm("Are you sure you want to delete this role? This action cannot be undone.")) {
      deleteRoleMutation.mutate(id);
    }
  };

  // Handle opening permissions dialog
  const handleOpenPermissions = (role: any) => {
    setSelectedRoleId(role.id);
    setSelectedRoleName(role.name);
    setPermissionsDialogOpen(true);
  };

  // Helper to check if the user is admin
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground">Manage roles and their permissions</p>
        </div>
        <Button 
          onClick={() => {
            setEditingRoleId(null);
            roleForm.reset({
              name: "",
              description: "",
              isDefault: false,
            });
            setIsDialogOpen(true);
          }} 
          className="flex items-center gap-1"
          disabled={!isAdmin}
        >
          <PlusIcon className="h-4 w-4" />
          <span>New Role</span>
        </Button>
      </div>

      {/* Role List */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Associated Users</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingRoles ? (
              // Loading state
              Array(3).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No roles found
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role: any) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.description || "No description"}</TableCell>
                  <TableCell>
                    {role.isDefault ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                        Default
                      </Badge>
                    ) : (
                      <Badge variant="outline">Custom</Badge>
                    )}
                  </TableCell>
                  <TableCell>{role.userCount || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => handleOpenPermissions(role)}
                        variant="outline"
                        size="sm"
                        disabled={!isAdmin}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingRoleId(role.id);
                          setIsDialogOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        disabled={!isAdmin}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={() => handleDeleteRole(role.id)} 
                        variant="ghost" 
                        size="sm"
                        disabled={!isAdmin || role.isDefault || (role.userCount && role.userCount > 0)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Role Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoleId !== null ? "Edit Role" : "Create New Role"}
            </DialogTitle>
            <DialogDescription>
              {editingRoleId !== null 
                ? "Edit the role details and permissions" 
                : "Create a new role with custom permissions"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...roleForm}>
            <form onSubmit={roleForm.handleSubmit(onRoleSubmit)} className="space-y-4">
              <FormField
                control={roleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={roleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the purpose of this role..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={roleForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(checked || false)}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Default Role</FormLabel>
                      <FormDescription>
                        Make this the default role for new users
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingRoleId(null);
                    roleForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                >
                  {createRoleMutation.isPending || updateRoleMutation.isPending
                    ? "Saving..."
                    : editingRoleId !== null
                    ? "Update Role"
                    : "Create Role"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Permissions for {selectedRoleName}
            </DialogTitle>
            <DialogDescription>
              Set the access levels for each part of the application
            </DialogDescription>
          </DialogHeader>
          
          <Form {...permissionForm}>
            <form onSubmit={permissionForm.handleSubmit(onPermissionSubmit)} className="space-y-6">
              <Tabs defaultValue="pages" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="pages">By Page</TabsTrigger>
                  <TabsTrigger value="actions">By Action</TabsTrigger>
                </TabsList>
                
                <TabsContent value="pages" className="space-y-4">
                  {pages.map((page) => (
                    <Card key={page.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{page.name}</CardTitle>
                        <CardDescription>{page.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <FormField
                            control={permissionForm.control}
                            name={`${page.id}.canView`}
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none pt-0.5">
                                  <FormLabel>View</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={permissionForm.control}
                            name={`${page.id}.canCreate`}
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={!!field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked || false);
                                      // If they can create, they must be able to view
                                      if (checked) {
                                        permissionForm.setValue(`${page.id}.canView`, true);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none pt-0.5">
                                  <FormLabel>Create</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={permissionForm.control}
                            name={`${page.id}.canEdit`}
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={!!field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked || false);
                                      // If they can edit, they must be able to view
                                      if (checked) {
                                        permissionForm.setValue(`${page.id}.canView`, true);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none pt-0.5">
                                  <FormLabel>Edit</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={permissionForm.control}
                            name={`${page.id}.canDelete`}
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      // If they can delete, they must be able to view
                                      if (checked) {
                                        permissionForm.setValue(`${page.id}.canView`, true);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none pt-0.5">
                                  <FormLabel>Delete</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                
                <TabsContent value="actions" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>View Permissions</CardTitle>
                      <CardDescription>Control which pages users can view</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {pages.map((page) => (
                          <FormField
                            key={page.id}
                            control={permissionForm.control}
                            name={`${page.id}.canView`}
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none pt-0.5">
                                  <FormLabel>{page.name}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Create Permissions</CardTitle>
                      <CardDescription>Control where users can create new items</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {pages.map((page) => (
                          <FormField
                            key={page.id}
                            control={permissionForm.control}
                            name={`${page.id}.canCreate`}
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      if (checked) {
                                        permissionForm.setValue(`${page.id}.canView`, true);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none pt-0.5">
                                  <FormLabel>{page.name}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Edit Permissions</CardTitle>
                      <CardDescription>Control where users can edit existing items</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {pages.map((page) => (
                          <FormField
                            key={page.id}
                            control={permissionForm.control}
                            name={`${page.id}.canEdit`}
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      if (checked) {
                                        permissionForm.setValue(`${page.id}.canView`, true);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none pt-0.5">
                                  <FormLabel>{page.name}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Delete Permissions</CardTitle>
                      <CardDescription>Control where users can delete items</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {pages.map((page) => (
                          <FormField
                            key={page.id}
                            control={permissionForm.control}
                            name={`${page.id}.canDelete`}
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      if (checked) {
                                        permissionForm.setValue(`${page.id}.canView`, true);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none pt-0.5">
                                  <FormLabel>{page.name}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setPermissionsDialogOpen(false);
                    setSelectedRoleId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updatePermissionsMutation.isPending}
                >
                  {updatePermissionsMutation.isPending
                    ? "Saving..."
                    : "Save Permissions"
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