interface DeeperLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function DeeperLogo({ className = "", size = 'md' }: DeeperLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-auto', // Small size for compact areas
    md: 'h-8 w-auto', // Default size for headers
    lg: 'h-12 w-auto', // Large size for landing pages
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