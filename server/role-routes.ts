import { Request, Response, Express } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { 
  insertRoleSchema, 
  insertRolePermissionSchema,
  pageAccessEnum
} from "@shared/schema";

// Register role management routes
export function registerRoleRoutes(app: Express) {
  
  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Role-based access control for roles management
  const requireRoleAccess = (req: Request, res: Response, next: any) => {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Only allow admin to access roles management
    if (user.role === "admin") {
      return next();
    }
    
    return res.status(403).json({ message: "Access denied. Insufficient permissions." });
  };
  
  // Get all roles with user count
  app.get("/api/roles", requireAuth, requireRoleAccess, async (req: Request, res: Response) => {
    try {
      const roles = await storage.getAllRoles();
      
      // Get user count for each role
      const rolesWithCount = await Promise.all(
        roles.map(async (role) => {
          const userCount = await storage.getUserCountByRoleId(role.id);
          return { ...role, userCount };
        })
      );
      
      res.json(rolesWithCount);
    } catch (err) {
      res.status(500).json({ message: `Error fetching roles: ${err}` });
    }
  });
  
  // Get a specific role
  app.get("/api/roles/:id", requireAuth, requireRoleAccess, async (req: Request, res: Response) => {
    try {
      const roleId = parseInt(req.params.id);
      const role = await storage.getRole(roleId);
      
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      res.json(role);
    } catch (err) {
      res.status(500).json({ message: `Error fetching role: ${err}` });
    }
  });
  
  // Get permissions for a role
  app.get("/api/roles/:id/permissions", requireAuth, requireRoleAccess, async (req: Request, res: Response) => {
    try {
      const roleId = parseInt(req.params.id);
      const role = await storage.getRole(roleId);
      
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      const permissions = await storage.getRolePermissions(roleId);
      res.json({ role, permissions });
    } catch (err) {
      res.status(500).json({ message: `Error fetching role permissions: ${err}` });
    }
  });
  
  // Create a new role
  app.post("/api/roles", requireAuth, requireRoleAccess, async (req: Request, res: Response) => {
    try {
      // Only allow admin to create roles
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      // Validate request body
      const roleData = insertRoleSchema.parse(req.body);
      
      // Check if the role name already exists
      const existingRole = await storage.getRoleByName(roleData.name);
      if (existingRole) {
        return res.status(400).json({ message: "A role with this name already exists" });
      }
      
      // If this is set as default, unset other defaults
      if (roleData.isDefault) {
        await storage.clearDefaultRoles();
      }
      
      // Create the role
      const newRole = await storage.createRole(roleData);
      
      // Initialize default permissions for all pages
      const defaultPermissions = Object.values(pageAccessEnum.enumValues).map(page => ({
        roleId: newRole.id,
        page,
        canView: page === "dashboard", // Only dashboard is viewable by default
        canCreate: false,
        canEdit: false,
        canDelete: false
      }));
      
      await Promise.all(
        defaultPermissions.map(perm => storage.createRolePermission(perm))
      );
      
      // Log the action
      await storage.logUserAction({
        userId: req.user!.id,
        actionType: "create",
        entityType: "roles",
        entityId: newRole.id,
        details: `Created role: ${newRole.name}`
      });
      
      res.status(201).json(newRole);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(500).json({ message: `Error creating role: ${err}` });
    }
  });
  
  // Update a role
  app.patch("/api/roles/:id", requireAuth, requireRoleAccess, async (req: Request, res: Response) => {
    try {
      // Only allow admin to update roles
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const roleId = parseInt(req.params.id);
      
      // Check if role exists
      const existingRole = await storage.getRole(roleId);
      if (!existingRole) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Validate request body
      const roleData = insertRoleSchema.parse(req.body);
      
      // Check if the role name already exists (excluding this role)
      const duplicateRole = await storage.getRoleByName(roleData.name);
      if (duplicateRole && duplicateRole.id !== roleId) {
        return res.status(400).json({ message: "A role with this name already exists" });
      }
      
      // If this is set as default, unset other defaults
      if (roleData.isDefault && !existingRole.isDefault) {
        await storage.clearDefaultRoles();
      }
      
      // Update the role
      const updatedRole = await storage.updateRole(roleId, roleData);
      
      // Log the action
      await storage.logUserAction({
        userId: req.user!.id,
        actionType: "update",
        entityType: "roles",
        entityId: roleId,
        details: `Updated role: ${updatedRole.name}`
      });
      
      res.json(updatedRole);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(500).json({ message: `Error updating role: ${err}` });
    }
  });
  
  // Delete a role
  app.delete("/api/roles/:id", requireAuth, requireRoleAccess, async (req: Request, res: Response) => {
    try {
      // Only allow admin to delete roles
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const roleId = parseInt(req.params.id);
      
      // Check if role exists
      const role = await storage.getRole(roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Check if role is in use
      const userCount = await storage.getUserCountByRoleId(roleId);
      if (userCount > 0) {
        return res.status(400).json({ 
          message: "Cannot delete a role that is assigned to users. Reassign users first." 
        });
      }
      
      // Delete role permissions first
      await storage.deleteRolePermissions(roleId);
      
      // Delete the role
      const success = await storage.deleteRole(roleId);
      
      if (success) {
        // Log the action
        await storage.logUserAction({
          userId: req.user!.id,
          actionType: "delete",
          entityType: "roles",
          entityId: roleId,
          details: `Deleted role: ${role.name}`
        });
        
        res.json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to delete role" });
      }
    } catch (err) {
      res.status(500).json({ message: `Error deleting role: ${err}` });
    }
  });
  
  // Update role permissions
  app.post("/api/roles/:id/permissions", requireAuth, requireRoleAccess, async (req: Request, res: Response) => {
    try {
      // Only allow admin to update role permissions
      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const roleId = parseInt(req.params.id);
      
      // Check if role exists
      const role = await storage.getRole(roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Validate permissions schema
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions must be an array" });
      }
      
      // Delete existing permissions
      await storage.deleteRolePermissions(roleId);
      
      // Create new permissions
      const newPermissions = await Promise.all(
        permissions.map(async (perm: any) => {
          const permissionData = {
            roleId,
            page: perm.page,
            canView: !!perm.canView,
            canCreate: !!perm.canCreate,
            canEdit: !!perm.canEdit,
            canDelete: !!perm.canDelete
          };
          
          return await storage.createRolePermission(permissionData);
        })
      );
      
      // Log the action
      await storage.logUserAction({
        userId: req.user!.id,
        actionType: "update",
        entityType: "role_permissions",
        entityId: roleId,
        details: `Updated permissions for role: ${role.name}`
      });
      
      res.json({ role, permissions: newPermissions });
    } catch (err) {
      res.status(500).json({ message: `Error updating role permissions: ${err}` });
    }
  });
}