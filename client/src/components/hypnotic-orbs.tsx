import { useEffect, useRef } from 'react';

interface HypnoticOrbsProps {
  className?: string;
}

export function HypnoticOrbs({ className = "" }: HypnoticOrbsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Orb configuration - each orb grows and transforms over 20-30 minutes
    const orbs = [
      {
        x: 0.3,
        y: 0.4,
        baseRadius: 2,
        maxRadius: 80,
        growthDuration: 25 * 60 * 1000, // 25 minutes
        color: { r: 79, g: 172, b: 254 }, // Ocean blue
        alpha: 0.15,
        pulseSpeed: 0.0003,
        driftSpeed: 0.00001,
        spiralRadius: 0.02
      },
      {
        x: 0.7,
        y: 0.6,
        baseRadius: 1,
        maxRadius: 60,
        growthDuration: 20 * 60 * 1000, // 20 minutes
        color: { r: 215, g: 160, b: 135 }, // Warm amber
        alpha: 0.12,
        pulseSpeed: 0.0004,
        driftSpeed: 0.000008,
        spiralRadius: 0.03
      },
      {
        x: 0.5,
        y: 0.3,
        baseRadius: 3,
        maxRadius: 100,
        growthDuration: 30 * 60 * 1000, // 30 minutes
        color: { r: 120, g: 200, b: 180 }, // Soft teal
        alpha: 0.08,
        pulseSpeed: 0.0002,
        driftSpeed: 0.000012,
        spiralRadius: 0.025
      },
      {
        x: 0.2,
        y: 0.7,
        baseRadius: 1.5,
        maxRadius: 45,
        growthDuration: 18 * 60 * 1000, // 18 minutes
        color: { r: 160, g: 140, b: 220 }, // Soft purple
        alpha: 0.1,
        pulseSpeed: 0.0005,
        driftSpeed: 0.000015,
        spiralRadius: 0.035
      },
      {
        x: 0.8,
        y: 0.2,
        baseRadius: 2.5,
        maxRadius: 70,
        growthDuration: 22 * 60 * 1000, // 22 minutes
        color: { r: 255, g: 180, b: 150 }, // Warm peach
        alpha: 0.09,
        pulseSpeed: 0.00035,
        driftSpeed: 0.00001,
        spiralRadius: 0.028
      }
    ];

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTimeRef.current;
      
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Clear canvas with subtle fade effect for trailing
      ctx.fillStyle = 'rgba(27, 33, 55, 0.02)'; // Very subtle dark overlay
      ctx.fillRect(0, 0, width, height);

      orbs.forEach((orb, index) => {
        // Calculate growth progress (0 to 1 over growth duration)
        const growthProgress = Math.min(elapsed / orb.growthDuration, 1);
        
        // Smooth growth curve (ease-out)
        const smoothGrowth = 1 - Math.pow(1 - growthProgress, 3);
        
        // Calculate current radius with subtle pulsing
        const pulseOffset = Math.sin(elapsed * orb.pulseSpeed) * 0.1;
        const currentRadius = orb.baseRadius + (orb.maxRadius - orb.baseRadius) * smoothGrowth * (1 + pulseOffset);
        
        // Calculate position with very slow drift in a spiral pattern
        const driftAngle = elapsed * orb.driftSpeed;
        const spiralX = Math.cos(driftAngle) * orb.spiralRadius * smoothGrowth;
        const spiralY = Math.sin(driftAngle * 0.7) * orb.spiralRadius * smoothGrowth;
        
        const x = (orb.x + spiralX) * width;
        const y = (orb.y + spiralY) * height;
        
        // Create radial gradient for each orb
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
        
        // Inner core with higher opacity
        gradient.addColorStop(0, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, ${orb.alpha * 0.8})`);
        gradient.addColorStop(0.3, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, ${orb.alpha * 0.4})`);
        gradient.addColorStop(0.7, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, ${orb.alpha * 0.1})`);
        gradient.addColorStop(1, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, 0)`);
        
        // Draw the orb
        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add subtle ring effect as orbs mature
        if (smoothGrowth > 0.3) {
          const ringRadius = currentRadius * 0.8;
          const ringOpacity = (smoothGrowth - 0.3) * 0.1;
          
          ctx.beginPath();
          ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, ${ringOpacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Add connecting lines between orbs as they mature
      if (elapsed > 5 * 60 * 1000) { // After 5 minutes
        const connectionOpacity = Math.min((elapsed - 5 * 60 * 1000) / (10 * 60 * 1000), 0.03);
        
        for (let i = 0; i < orbs.length; i++) {
          for (let j = i + 1; j < orbs.length; j++) {
            const orb1 = orbs[i];
            const orb2 = orbs[j];
            
            const x1 = orb1.x * width;
            const y1 = orb1.y * height;
            const x2 = orb2.x * width;
            const y2 = orb2.y * height;
            
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, `rgba(${orb1.color.r}, ${orb1.color.g}, ${orb1.color.b}, ${connectionOpacity})`);
            gradient.addColorStop(0.5, `rgba(147, 166, 190, ${connectionOpacity * 0.5})`);
            gradient.addColorStop(1, `rgba(${orb2.color.r}, ${orb2.color.g}, ${orb2.color.b}, ${connectionOpacity})`);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ 
        background: 'transparent',
        mixBlendMode: 'normal'
      }}
    />
  );
}