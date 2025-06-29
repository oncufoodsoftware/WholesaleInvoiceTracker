import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface RolePermission {
  id: number;
  roleId: number;
  pageAccess: string;
}

export function useRolePermissions() {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['/api/roles', user?.roleId, 'permissions'],
    enabled: !!user?.roleId,
  });

  const hasPageAccess = (page: string): boolean => {
    // Admin always has access to everything
    if (user?.role === 'admin') {
      return true;
    }

    // Branch Manager has access to roles page by default
    if (user?.role === 'branch_manager' && page === 'roles') {
      return true;
    }

    if (!permissions || !Array.isArray(permissions)) {
      return false;
    }

    return permissions.some((permission: RolePermission) => 
      permission.pageAccess === page
    );
  };

  const getAccessiblePages = (): string[] => {
    // Admin has access to all pages
    if (user?.role === 'admin') {
      return [
        'dashboard',
        'invoices', 
        'suppliers',
        'branches',
        'risk_analysis',
        'reports',
        'users',
        'roles',
        'settings'
      ];
    }

    // Branch Manager gets roles page access by default
    if (user?.role === 'branch_manager') {
      const basePages = ['dashboard', 'roles'];
      if (!permissions || !Array.isArray(permissions)) {
        return basePages;
      }
      
      const permissionPages = permissions.map((permission: RolePermission) => permission.pageAccess);
      return Array.from(new Set([...basePages, ...permissionPages])); // Remove duplicates
    }

    if (!permissions || !Array.isArray(permissions)) {
      return ['dashboard']; // Default to dashboard only
    }

    return permissions.map((permission: RolePermission) => permission.pageAccess);
  };

  return {
    permissions,
    isLoading,
    hasPageAccess,
    getAccessiblePages
  };
}