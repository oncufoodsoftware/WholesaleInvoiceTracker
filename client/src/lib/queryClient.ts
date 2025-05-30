import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // First try to parse as JSON
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        throw new Error(errorData.message || `${res.status}: ${res.statusText}`);
      } else {
        // Fall back to text if not JSON
        const text = await res.text();
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          // It's HTML, which likely means a server error
          throw new Error(`Server error (${res.status}): The server returned an HTML page instead of data`);
        }
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        throw err; // Re-throw if it's already an Error
      }
      // If JSON parsing failed or other issues, throw generic error
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

// Generate CSRF token for client requests
function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Input sanitization for client-side data
function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

// Validate URL to prevent SSRF attacks
function validateURL(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.origin);
    // Only allow same origin requests and specific trusted APIs
    return urlObj.origin === window.location.origin || 
           urlObj.hostname === 'api.openai.com';
  } catch {
    return false;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: any,
  customHeaders?: Record<string, string>
): Promise<Response> {
  // Validate URL to prevent SSRF
  if (!validateURL(url)) {
    throw new Error('Invalid URL: Cross-origin requests not allowed');
  }

  // Sanitize input data
  const sanitizedData = data ? sanitizeInput(data) : undefined;

  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...customHeaders
  };
  
  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    headers['X-CSRF-Token'] = generateCSRFToken();
  }
  
  if (sanitizedData && !(sanitizedData instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  let body: any = undefined;
  if (sanitizedData) {
    body = sanitizedData instanceof FormData ? sanitizedData : JSON.stringify(sanitizedData);
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
    // Security headers for requests
    mode: 'same-origin',
    cache: 'no-cache',
    referrerPolicy: 'strict-origin-when-cross-origin'
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers: {
          "Accept": "application/json"
        }
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      
      // Check if there's content before parsing JSON
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      
      // If no content or not JSON, return null for GET requests
      return null;
    } catch (error) {
      console.error("Query error:", error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
