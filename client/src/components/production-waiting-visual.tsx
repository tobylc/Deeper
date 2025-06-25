import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ProductionWaitingVisualProps {
  className?: string;
}

export default function ProductionWaitingVisual({ className = "" }: ProductionWaitingVisualProps) {
  const [phase, setPhase] = useState(0);
  const [brightnessPhase, setBrightnessPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(prev => prev + 0.02);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Very slow brightness cycle: 5-10 minutes each direction
  useEffect(() => {
    const brightnessInterval = setInterval(() => {
      setBrightnessPhase(prev => prev + 0.001); // Very slow increment
    }, 1000); // Update every second
    return () => clearInterval(brightnessInterval);
  }, []);

  // Calculate brightness multiplier (0.2 to 1.0)
  const brightness = 0.2 + 0.8 * (Math.sin(brightnessPhase) * 0.5 + 0.5);

  const FlowingOrbs = () => (
    <div className="absolute inset-0 overflow-hidden">
      {/* Large flowing orbs */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${40 + i * 8}px`,
            height: `${40 + i * 8}px`,
            background: `radial-gradient(circle, ${i % 3 === 0 ? '#4FACFE' : i % 3 === 1 ? '#D7A087' : '#00D4FF'}${Math.floor(80 * brightness)}, transparent)`,
          }}
          animate={{
            x: [50 + i * 30, 80 + i * 30, 50 + i * 30],
            y: [60 + i * 20, 120 + i * 15, 60 + i * 20],
            scale: [0.8, 1.2, 0.8],
            opacity: [0.7 * brightness, 1 * brightness, 0.7 * brightness]
          }}
          transition={{
            duration: 12 + i * 2,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 0.8
          }}
        />
      ))}
      
      {/* Gentle floating particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: `rgba(79, 172, 254, ${0.8 * brightness})`
          }}
          animate={{
            x: [Math.random() * 300, Math.random() * 300],
            y: [Math.random() * 200, Math.random() * 200],
            scale: [0.5, 1.5, 0.5],
            opacity: [0.6 * brightness, 1 * brightness, 0.6 * brightness]
          }}
          transition={{
            duration: 8 + i * 0.5,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 0.3
          }}
        />
      ))}
      
      {/* Slow connecting energy streams */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`stream-${i}`}
          className="absolute h-0.5 rounded-full"
          style={{
            width: '120px',
            left: `${20 + i * 20}%`,
            top: `${30 + i * 15}%`,
            background: `linear-gradient(to right, transparent, rgba(79, 172, 254, ${0.7 * brightness}), transparent)`
          }}
          animate={{
            opacity: [0, 1 * brightness, 0],
            scaleX: [0.3, 1, 0.3],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 6 + i,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 1.5
          }}
        />
      ))}
    </div>
  );

  const FloatingWaitingText = () => (
    <div className="absolute right-8 top-1/2 transform -translate-y-1/2 w-48 h-32 flex items-center justify-center">
      <motion.div
        className="text-4xl font-bold text-slate-600 select-none"
        style={{
          textShadow: '2px 2px 4px rgba(0,0,0,0.3), -1px -1px 2px rgba(255,255,255,0.5)',
          transform: 'perspective(200px)',
          opacity: brightness
        }}
        animate={{
          rotateX: [0, 15, -15, 0],
          rotateY: [0, 20, -20, 0],
          rotateZ: [0, 5, -5, 0],
          scale: [1, 1.2, 0.9, 1],
          x: [0, 10, -10, 0],
          y: [0, -5, 5, 0],
        }}
        transition={{
          duration: 8,
          ease: "easeInOut",
          repeat: Infinity,
          times: [0, 0.3, 0.7, 1]
        }}
      >
        Waiting...
      </motion.div>
      
      {/* Floating dots around the text */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: `rgba(79, 172, 254, ${0.6 * brightness})`,
            left: `${60 + i * 15}%`,
            top: `${40 + i * 10}%`
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.6 * brightness, 1 * brightness, 0.6 * brightness],
            y: [0, -10, 0]
          }}
          transition={{
            duration: 1,
            delay: i * 0.2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  return (
    <div className={`relative w-full h-64 ${className}`}>
      <FlowingOrbs />
      <FloatingWaitingText />
    </div>
  );
}