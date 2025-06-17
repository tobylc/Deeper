import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useUserDisplayName(email: string | null | undefined) {
  return useQuery({
    queryKey: ['/api/users/display-name', email],
    queryFn: async () => {
      if (!email) return email?.split('@')[0] || 'Unknown User';
      
      try {
        const response = await apiRequest('GET', `/api/users/display-name/${encodeURIComponent(email)}`);
        const data = await response.json();
        return data.displayName;
      } catch (error) {
        // Fallback to email username if API fails
        return email.split('@')[0];
      }
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Helper component to display user names
export function UserDisplayName({ 
  email, 
  fallback = "Unknown User",
  className = ""
}: { 
  email: string | null | undefined;
  fallback?: string;
  className?: string;
}) {
  const { data: displayName, isLoading } = useUserDisplayName(email);
  
  if (isLoading) {
    return <span className={className}>{email?.split('@')[0] || fallback}</span>;
  }
  
  return <span className={className}>{displayName || fallback}</span>;
}