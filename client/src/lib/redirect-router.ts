// This module provides smart redirection for broken or invalid URLs
// It analyzes the URL and suggests the closest matching valid route

// Map of common misspellings or variations to correct routes
const redirectMap: Record<string, string> = {
  // Dashboard variations
  '/dashbord': '/dashboard',
  '/dash': '/dashboard',
  '/home': '/dashboard',
  '/main': '/dashboard',
  
  // Invoices variations
  '/invoice': '/invoices',
  '/bills': '/invoices',
  '/orders': '/invoices',
  
  // Suppliers variations
  '/supplier': '/suppliers',
  '/vendor': '/suppliers',
  '/vendors': '/suppliers',
  
  // Branches variations
  '/branch': '/branches',
  '/locations': '/branches',
  '/stores': '/branches',
  
  // Finances variations
  '/finance': '/finances',
  '/accounting': '/finances',
  '/accounts': '/finances',
  '/transactions': '/finances',
  
  // Reports variations
  '/report': '/reports',
  '/reporting': '/reports',
  '/stats': '/reports',
  
  // Analytics variations
  '/analytic': '/analytics',
  '/analysis': '/analytics',
  '/statistic': '/analytics',
  '/statistics': '/analytics',
  
  // Users variations
  '/user': '/users',
  '/staff': '/users',
  '/employee': '/users',
  '/employees': '/users',
  
  // Settings variations
  '/setting': '/settings',
  '/config': '/settings',
  '/configuration': '/settings',
  '/preferences': '/settings',
  
  // Roles variations
  '/role': '/roles',
  '/permission': '/roles',
  '/permissions': '/roles',
  
  // Supplier risk variations
  '/supplierrisk': '/supplier-risk',
  '/vendor-risk': '/supplier-risk',
  '/risk': '/supplier-risk',
  
  // User actions variations
  '/useraction': '/user-actions',
  '/user-action': '/user-actions',
  '/logs': '/user-actions',
  '/activity': '/user-actions',
  '/audit': '/user-actions',
};

// List of valid routes for fuzzy matching
const validRoutes = [
  '/dashboard',
  '/suppliers',
  '/branches',
  '/invoices',
  '/finances',
  '/reports',
  '/analytics',
  '/users',
  '/settings',
  '/roles',
  '/supplier-risk',
  '/user-actions',
];

/**
 * Calculate the Levenshtein distance between two strings
 * Used to find similar routes when exact match isn't found
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find the closest match for a given path based on Levenshtein distance
 */
function findClosestMatch(path: string): string | null {
  // Check direct mappings first
  if (redirectMap[path]) {
    return redirectMap[path];
  }
  
  // Remove trailing slash if present
  const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
  
  // Check if the normalized path exists in the redirect map
  if (redirectMap[normalizedPath]) {
    return redirectMap[normalizedPath];
  }
  
  // Perform fuzzy matching using Levenshtein distance
  let closestMatch: string | null = null;
  let smallestDistance = Infinity;
  
  for (const route of validRoutes) {
    const distance = levenshteinDistance(normalizedPath, route);
    
    // Consider it a match if the distance is less than 3 characters
    // or less than half the length of the path (for very short paths)
    const threshold = Math.min(3, Math.ceil(normalizedPath.length / 2));
    
    if (distance < smallestDistance && distance <= threshold) {
      smallestDistance = distance;
      closestMatch = route;
    }
  }
  
  return closestMatch;
}

/**
 * Determines if a given path should be redirected and returns the target path
 */
export function getRedirectPath(path: string): string | null {
  // Skip redirection for valid routes and auth pages
  if (validRoutes.includes(path) || path === '/auth' || path === '/dashboard') {
    return null;
  }
  
  // Handle nested routes under valid paths
  const pathSegments = path.split('/').filter(Boolean);
  if (pathSegments.length > 1) {
    const parentPath = '/' + pathSegments[0];
    if (validRoutes.includes(parentPath)) {
      return null; // Let the parent route handle its nested routes
    }
  }
  
  // Find closest match for redirection
  return findClosestMatch(path);
}