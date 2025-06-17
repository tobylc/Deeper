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
        <linearGradient id="quoteGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(215, 85%, 60%)" />
          <stop offset="100%" stopColor="hsl(215, 85%, 50%)" />
        </linearGradient>
        <linearGradient id="quoteGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(215, 85%, 65%)" />
          <stop offset="100%" stopColor="hsl(215, 85%, 55%)" />
        </linearGradient>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(215, 85%, 60%)" />
          <stop offset="100%" stopColor="hsl(215, 85%, 45%)" />
        </linearGradient>
      </defs>
      
      {/* Large opening quotation mark (left side) */}
      <path 
        d="M 8 2
           C 12 2, 15 3, 18 5
           C 22 8, 25 12, 25 18
           C 25 22, 22 25, 18 25
           C 15 25, 12 24, 10 22
           L 8 25
           C 5 22, 3 18, 3 12
           C 3 8, 5 4, 8 2
           Z" 
        fill="url(#quoteGradient1)"
      />
      
      {/* Small closing quotation mark (right side) */}
      <path 
        d="M 35 5
           C 38 5, 40 6, 42 8
           C 44 10, 45 13, 45 16
           C 45 19, 44 21, 42 22
           C 40 23, 38 23, 36 22
           L 35 24
           C 33 22, 32 19, 32 16
           C 32 13, 33 10, 35 8
           C 35 7, 35 6, 35 5
           Z" 
        fill="url(#quoteGradient2)"
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