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

  const heightValues = {
    sm: 20,
    md: 32,
    lg: 40,
    xl: 64,
  };

  const height = heightValues[size];
  const width = height * 3.5; // Maintain aspect ratio

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 140 40" 
      className={`${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Modern gradient background circle */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(215, 85%, 60%)" />
          <stop offset="100%" stopColor="hsl(215, 85%, 50%)" />
        </linearGradient>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(215, 85%, 60%)" />
          <stop offset="100%" stopColor="hsl(215, 85%, 45%)" />
        </linearGradient>
      </defs>
      
      {/* Circular background with gradient */}
      <circle cx="20" cy="20" r="16" fill="url(#logoGradient)" />
      
      {/* Abstract connection symbol - two overlapping circles representing connection */}
      <circle cx="16" cy="16" r="4" fill="white" opacity="0.9" />
      <circle cx="24" cy="24" r="4" fill="white" opacity="0.9" />
      <circle cx="20" cy="20" r="2" fill="white" />
      
      {/* Typography - "Deeper" text */}
      <text x="48" y="16" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" fill="url(#textGradient)">
        Deeper
      </text>
      <text x="48" y="30" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="400" fill="hsl(210, 10%, 50%)" opacity="0.8">
        CONNECTIONS
      </text>
    </svg>
  );
}