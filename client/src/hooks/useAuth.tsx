import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // Try test user first in development
      if (import.meta.env.DEV) {
        try {
          const testResponse = await fetch('/api/auth/user?test_user=true');
          if (testResponse.ok) {
            return await testResponse.json();
          }
        } catch (e) {
          // Fall through to regular auth
        }
      }
      
      const response = await fetch('/api/auth/user');
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      return response.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}