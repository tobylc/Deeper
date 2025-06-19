import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        const response = await fetch('/api/auth/user', {
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
        
        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        return null; // Treat any error as not authenticated
      }
    },
    retry: false,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false,
  });

  return {
    user: user || undefined,
    isLoading,
    isAuthenticated: !!user,
  };
}