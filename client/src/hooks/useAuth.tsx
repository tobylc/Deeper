import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // Try test user first in development
      if (import.meta.env.DEV) {
        try {
          const testResponse = await fetch('/api/auth/user?test_user=true', {
            credentials: 'include'
          });
          if (testResponse.ok) {
            return await testResponse.json();
          }
        } catch (e) {
          // Fall through to regular auth
        }
      }
      
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) {
          // Return null for unauthenticated users instead of throwing
          return null;
        }
        throw new Error('Authentication check failed');
      }
      return response.json();
    },
    retry: (failureCount, error: any) => {
      // Don't retry 401 errors - user is just not authenticated
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 1000 * 30, // Reduce to 30 seconds for faster auth updates
    refetchOnWindowFocus: true, // Re-enable for OAuth callbacks
    refetchOnMount: true,
    refetchInterval: false,
  });

  // Manually refetch when on dashboard route after potential OAuth redirect
  const currentPath = window.location.pathname;
  if (currentPath === '/dashboard' && !user && !isLoading) {
    setTimeout(() => refetch(), 100);
  }

  return {
    user: user || undefined,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}