interface DeeperLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function DeeperLogo({ className = "", size = 'md' }: DeeperLogoProps) {
  const sizeClasses = {
    sm: 'h-5 w-auto', // Small size for popups and compact areas
    md: 'h-8 w-auto', // Medium size for dashboard headers
    lg: 'h-10 w-auto', // Large size for auth pages and navigation headers
    xl: 'h-16 w-auto', // Extra large for hero sections
  };

  return (
    <img 
      src="/deeper-logo.png" 
      alt="Deeper" 
      className={`${sizeClasses[size]} ${className}`}
      onError={(e) => {
        console.error('Logo failed to load:', e);
        // Fallback to text if image fails
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}