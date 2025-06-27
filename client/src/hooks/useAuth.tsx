import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        const response = await fetch('/api/auth/user?test_user=true', {
          credentials: 'include',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 401) {
          return null; // Not authenticated
        }
        
        if (!response.ok) {
          return null; // Treat any error as not authenticated
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        // Log errors for debugging but don't throw
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Auth check failed:', error);
        }
        return null; // Treat any error as not authenticated
      }
    },
    retry: false,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false,
    throwOnError: false, // Prevent unhandled errors
  });

  return {
    user: user || undefined,
    isLoading,
    isAuthenticated: !!user,
  };
}