import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Longer timeout for Stripe redirects
      
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
          signal: controller.signal,
          cache: 'no-cache', // Ensure fresh auth check after payment redirects
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 401) {
          // Check if this is a Stripe redirect scenario
          const urlParams = new URLSearchParams(window.location.search);
          const isStripeRedirect = urlParams.get('payment_success') === 'true';
          
          if (isStripeRedirect) {
            console.log('[AUTH] 401 during Stripe redirect - session may need to refresh');
            // Don't return null immediately, let retry logic handle it
            throw new Error('Auth failed during Stripe redirect');
          }
          
          // Handle session expiration by redirecting to auth page (unless already on auth page)
          if (!window.location.pathname.startsWith('/auth')) {
            console.log('[AUTH] Session expired, redirecting to login');
            window.location.href = '/auth';
            return null;
          }
          
          return null; // Not authenticated
        }
        
        if (!response.ok) {
          throw new Error(`Auth request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[AUTH] Authentication successful');
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Check if this is a Stripe redirect scenario
        const urlParams = new URLSearchParams(window.location.search);
        const isStripeRedirect = urlParams.get('payment_success') === 'true';
        
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn(`[AUTH] Auth check failed${isStripeRedirect ? ' during Stripe redirect' : ''}:`, error);
        }
        
        // For Stripe redirects, allow retry
        if (isStripeRedirect) {
          throw error;
        }
        
        return null; // Treat any error as not authenticated
      }
    },
    retry: (failureCount, error) => {
      // Retry logic for Stripe redirects
      const urlParams = new URLSearchParams(window.location.search);
      const isStripeRedirect = urlParams.get('payment_success') === 'true';
      
      if (isStripeRedirect && failureCount < 3) {
        console.log(`[AUTH] Retrying auth check ${failureCount + 1}/3 after Stripe redirect`);
        return true;
      }
      
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 3000), // Exponential backoff
    staleTime: 1000 * 30, // Shorter stale time for payment scenarios
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