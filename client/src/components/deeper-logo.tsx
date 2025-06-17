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
      viewBox="0 0 180 50" 
      className={`${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gradients using application color scheme */}
      <defs>
        <linearGradient id="speechBubbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(215, 85%, 60%)" />
          <stop offset="100%" stopColor="hsl(215, 85%, 50%)" />
        </linearGradient>
        <linearGradient id="dropletGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(215, 85%, 65%)" />
          <stop offset="100%" stopColor="hsl(215, 85%, 55%)" />
        </linearGradient>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(215, 85%, 60%)" />
          <stop offset="100%" stopColor="hsl(215, 85%, 45%)" />
        </linearGradient>
      </defs>
      
      {/* Speech bubble shape (left side) */}
      <path 
        d="M 5 8 
           C 5 5, 8 2, 12 2
           L 28 2
           C 32 2, 35 5, 35 8
           L 35 18
           C 35 21, 32 24, 28 24
           L 18 24
           L 12 28
           L 16 24
           L 12 24
           C 8 24, 5 21, 5 18
           Z" 
        fill="url(#speechBubbleGradient)"
      />
      
      {/* Droplet/teardrop shape (right side) */}
      <path 
        d="M 45 25
           C 45 25, 52 18, 52 12
           C 52 8, 49 5, 45 5
           C 41 5, 38 8, 38 12
           C 38 18, 45 25, 45 25
           Z" 
        fill="url(#dropletGradient)"
      />
      
      {/* Typography - "Deeper" text */}
      <text 
        x="65" 
        y="20" 
        fontFamily="Inter, sans-serif" 
        fontSize="16" 
        fontWeight="700" 
        fill="url(#textGradient)"
      >
        Deeper
      </text>
    </svg>
  );
}