import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { UserDisplayName } from "@/hooks/useUserDisplayName";

interface MesmerizingWaitingVisualProps {
  otherUserName: string;
  visualType?: 'flowing-orbs' | 'building-blocks' | 'particle-galaxy' | 'liquid-waves' | 'floating-islands' | 'crystal-growth';
}

export default function MesmerizingWaitingVisual({ otherUserName, visualType = 'flowing-orbs' }: MesmerizingWaitingVisualProps) {
  const [phase, setPhase] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; speed: number; color: string }>>([]);
  const [blocks, setBlocks] = useState<Array<{ id: number; x: number; y: number; height: number; delay: number }>>([]);
  const [crystals, setCrystals] = useState<Array<{ id: number; x: number; y: number; size: number; rotation: number; delay: number }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(prev => prev + 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Initialize elements based on visual type
  useEffect(() => {
    if (visualType === 'particle-galaxy') {
      const newParticles = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.5 ? '#4FACFE' : '#D7A087'
      }));
      setParticles(newParticles);
    } else if (visualType === 'building-blocks') {
      const newBlocks = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        x: (i % 5) * 20,
        y: Math.floor(i / 5) * 33 + 30,
        height: 0,
        delay: i * 0.2
      }));
      setBlocks(newBlocks);
    } else if (visualType === 'crystal-growth') {
      const newCrystals = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        size: 0,
        rotation: Math.random() * 360,
        delay: i * 0.4
      }));
      setCrystals(newCrystals);
    }
  }, [visualType]);

  const FlowingOrbs = () => (
    <div className="absolute inset-0 overflow-hidden">
      {/* Large morphing orbs */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${30 + i * 6}px`,
            height: `${30 + i * 6}px`,
            background: `radial-gradient(circle, ${i % 3 === 0 ? '#4FACFE' : i % 3 === 1 ? '#D7A087' : '#00D4FF'}60, transparent)`,
          }}
          animate={{
            x: [
              Math.sin(phase * 0.01 + i) * 120 + 100,
              Math.sin(phase * 0.01 + i + Math.PI) * 120 + 100
            ],
            y: [
              Math.cos(phase * 0.008 + i) * 80 + 120,
              Math.cos(phase * 0.008 + i + Math.PI) * 80 + 120
            ],
            scale: [0.8, 1.4, 0.6, 1.2],
            opacity: [0.4, 0.8, 0.3, 0.7]
          }}
          transition={{
            duration: 0.1,
            ease: "linear"
          }}
        />
      ))}
      
      {/* Connecting lines between orbs */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`line-${i}`}
          className="absolute h-0.5 bg-gradient-to-r from-transparent via-ocean/40 to-transparent origin-left"
          style={{
            width: `${60 + Math.sin(phase * 0.02 + i) * 40}px`,
            left: `${30 + i * 8}%`,
            top: `${40 + Math.cos(phase * 0.015 + i) * 20}%`,
            transform: `rotate(${phase * 0.5 + i * 30}deg)`
          }}
          animate={{
            opacity: [0, 0.6, 0],
            scaleX: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.1,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );

  const BuildingBlocks = () => (
    <div className="absolute inset-0 flex items-end justify-center">
      <div className="flex items-end space-x-3 px-8">
        {blocks.map((block, i) => (
          <motion.div
            key={block.id}
            className="relative"
            animate={{
              y: Math.sin(phase * 0.02 + i) * 10
            }}
            transition={{
              duration: 0.1,
              ease: "linear"
            }}
          >
            {/* Main building block */}
            <motion.div
              className="w-6 bg-gradient-to-t from-ocean to-ocean/60 rounded-t-lg shadow-lg"
              animate={{
                height: [
                  10,
                  (i % 4 + 1) * 25 + Math.sin(phase * 0.03 + i) * 15,
                  (i % 3 + 1) * 30 + Math.cos(phase * 0.025 + i) * 10,
                  (i % 5 + 1) * 20 + Math.sin(phase * 0.035 + i) * 20
                ],
                opacity: [0.6, 1, 0.8, 1]
              }}
              transition={{
                duration: 0.1,
                ease: "linear"
              }}
            />
            
            {/* Block glow effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-amber/30 to-transparent rounded-t-lg"
              animate={{
                opacity: [0, 0.5, 0]
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: Infinity
              }}
            />
          </motion.div>
        ))}
      </div>
      
      {/* Floating construction debris */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`debris-${i}`}
          className="absolute w-2 h-2 bg-amber/80 rounded-sm shadow-sm"
          animate={{
            x: Math.sin(phase * 0.02 + i) * 100 + 150,
            y: Math.cos(phase * 0.025 + i) * 60 + 100 - Math.sin(phase * 0.01) * 30,
            rotate: phase * 2 + i * 45,
            scale: [0.5, 1.2, 0.8, 1]
          }}
          transition={{
            duration: 0.1,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );

  const ParticleGalaxy = () => (
    <div className="absolute inset-0">
      {/* Central gravitational core with pulsing energy */}
      <motion.div
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.3, 1],
          rotate: phase * 0.5
        }}
        transition={{
          duration: 0.1,
          ease: "linear"
        }}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-ocean via-amber to-ocean animate-pulse" />
        <div className="absolute inset-0 w-8 h-8 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin" />
      </motion.div>
      
      {/* Orbiting particles in spiral */}
      {particles.map((particle, i) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full shadow-lg"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}40`
          }}
          animate={{
            x: Math.cos(phase * particle.speed + i) * (60 + i * 4) + 150,
            y: Math.sin(phase * particle.speed + i) * (45 + i * 3) + 140,
            opacity: [0.4, 1, 0.6],
            scale: [0.5, 1.5, 0.8]
          }}
          transition={{
            duration: 0.1,
            ease: "linear"
          }}
        />
      ))}
      
      {/* Energy trails */}
      {particles.slice(0, 10).map((particle, i) => (
        <motion.div
          key={`trail-${particle.id}`}
          className="absolute w-0.5 h-0.5 rounded-full bg-white/60"
          animate={{
            x: Math.cos(phase * particle.speed + i - 0.3) * (60 + i * 4) + 150,
            y: Math.sin(phase * particle.speed + i - 0.3) * (45 + i * 3) + 140,
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 0.1,
            ease: "linear"
          }}
        />
      ))}
      
      {/* Spiral arms */}
      {[...Array(3)].map((_, armIndex) => (
        <motion.div
          key={`arm-${armIndex}`}
          className="absolute w-1 bg-gradient-to-r from-transparent via-ocean/30 to-transparent origin-left"
          style={{
            height: `${120 + armIndex * 20}px`,
            left: '50%',
            top: '50%',
            transform: `rotate(${phase * 0.3 + armIndex * 120}deg)`,
            transformOrigin: '0 0'
          }}
          animate={{
            opacity: [0.2, 0.6, 0.2],
            scaleY: [0.8, 1.2, 0.8]
          }}
          transition={{
            duration: 0.1,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );

  const LiquidWaves = () => (
    <div className="absolute inset-0 overflow-hidden">
      {/* Multiple liquid layers */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at ${50 + Math.sin(phase * 0.01 + i) * 30}% ${50 + Math.cos(phase * 0.008 + i) * 20}%, ${i % 2 === 0 ? '#4FACFE' : '#D7A087'}${20 - i * 2}, transparent 70%)`,
          }}
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scale: [0.8, 1.3, 0.9]
          }}
          transition={{
            duration: 0.1,
            ease: "linear"
          }}
        />
      ))}
      
      {/* Liquid droplets falling and morphing */}
      {[...Array(12)].map((_, i) => {
        const x = Math.sin(phase * 0.015 + i) * 150 + 150;
        const y = Math.cos(phase * 0.012 + i) * 100 + 140;
        return (
          <motion.div
            key={`liquid-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${15 + Math.sin(phase * 0.02 + i) * 10}px`,
              height: `${20 + Math.cos(phase * 0.025 + i) * 15}px`,
              background: `radial-gradient(ellipse, ${i % 2 === 0 ? '#4FACFE' : '#D7A087'}80, transparent)`,
              left: `${x}px`,
              top: `${y}px`,
              transform: `rotate(${Math.sin(phase * 0.01 + i) * 45}deg)`
            }}
            animate={{
              opacity: [0.4, 0.9, 0.4],
            }}
            transition={{
              duration: 0.1,
              ease: "linear"
            }}
          />
        );
      })}
      
      {/* Surface ripples */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`ripple-${i}`}
          className="absolute border-2 border-ocean/30 rounded-full"
          style={{
            width: `${60 + i * 40}px`,
            height: `${60 + i * 40}px`,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
          animate={{
            scale: [0.5, 2, 0.5],
            opacity: [0, 0.6, 0]
          }}
          transition={{
            duration: 3,
            delay: i * 0.7,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );

  const FloatingIslands = () => (
    <div className="absolute inset-0">
      {/* Main floating islands */}
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          animate={{
            x: Math.sin(phase * 0.008 + i) * 60 + 40 + i * 35,
            y: Math.cos(phase * 0.01 + i) * 40 + 70 + i * 15,
            rotate: Math.sin(phase * 0.005 + i) * 15
          }}
          transition={{
            duration: 0.1,
            ease: "linear"
          }}
        >
          {/* Island shadow */}
          <div 
            className="w-20 h-6 bg-black/10 rounded-full blur-sm absolute top-8"
            style={{ transform: 'perspective(100px) rotateX(60deg)' }}
          />
          
          {/* Island base */}
          <div 
            className={`w-16 h-6 rounded-full bg-gradient-to-b ${i % 3 === 0 ? 'from-amber/70 to-amber/90' : i % 3 === 1 ? 'from-green-400/70 to-green-600/90' : 'from-stone-400/70 to-stone-600/90'} shadow-lg`}
            style={{ transform: 'perspective(100px) rotateX(30deg)' }}
          />
          
          {/* Island vegetation/structures */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
            <motion.div 
              className="w-1.5 h-6 bg-green-500 rounded-full"
              animate={{
                height: [20, 28, 20],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2,
                delay: i * 0.3,
                repeat: Infinity
              }}
            />
            <motion.div 
              className="w-1 h-4 bg-green-600 rounded-full"
              animate={{
                height: [12, 20, 12],
                opacity: [0.6, 0.9, 0.6]
              }}
              transition={{
                duration: 2.5,
                delay: i * 0.3 + 0.5,
                repeat: Infinity
              }}
            />
          </div>
          
          {/* Magical sparkles around islands */}
          <motion.div
            className="absolute w-1 h-1 bg-yellow-300 rounded-full -top-2 -right-2"
            animate={{
              opacity: [0, 1, 0],
              scale: [0.5, 1.5, 0.5]
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.2,
              repeat: Infinity
            }}
          />
        </motion.div>
      ))}
      
      {/* Flying elements between islands */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={`flying-${i}`}
          className="absolute w-1 h-1 bg-blue-300/80 rounded-full"
          animate={{
            x: Math.sin(phase * 0.02 + i * 0.5) * 120 + 140,
            y: Math.cos(phase * 0.025 + i * 0.5) * 80 + 120,
            opacity: [0.3, 1, 0.3],
            scale: [0.5, 1.2, 0.5]
          }}
          transition={{
            duration: 0.1,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );

  const CrystalGrowth = () => (
    <div className="absolute inset-0">
      {/* Growing crystals */}
      {crystals.map((crystal, i) => (
        <motion.div
          key={crystal.id}
          className="absolute"
          style={{
            left: `${crystal.x}%`,
            top: `${crystal.y}%`,
          }}
          animate={{
            rotate: crystal.rotation + phase * 0.5,
            scale: Math.sin(phase * 0.01 + i) * 0.3 + 0.8
          }}
          transition={{
            duration: 0.1,
            ease: "linear"
          }}
        >
          {/* Crystal structure */}
          <motion.div
            className="relative"
            animate={{
              scale: [0, 1.2, 0.9, 1.1]
            }}
            transition={{
              duration: 4,
              delay: crystal.delay,
              repeat: Infinity,
              repeatType: "loop"
            }}
          >
            {/* Main crystal body */}
            <div 
              className={`w-6 h-8 ${i % 3 === 0 ? 'bg-gradient-to-t from-ocean/80 to-ocean/40' : i % 3 === 1 ? 'bg-gradient-to-t from-amber/80 to-amber/40' : 'bg-gradient-to-t from-purple-400/80 to-purple-200/40'} transform rotate-45 shadow-lg`}
              style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
            />
            
            {/* Crystal shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 2,
                delay: i * 0.2,
                repeat: Infinity
              }}
            />
          </motion.div>
          
          {/* Crystal energy aura */}
          <motion.div
            className={`absolute -inset-2 rounded-full ${i % 3 === 0 ? 'bg-ocean/20' : i % 3 === 1 ? 'bg-amber/20' : 'bg-purple-400/20'} blur-sm`}
            animate={{
              scale: [0.8, 1.4, 0.8],
              opacity: [0.3, 0.7, 0.3]
            }}
            transition={{
              duration: 3,
              delay: i * 0.4,
              repeat: Infinity
            }}
          />
        </motion.div>
      ))}
      
      {/* Crystal formation lines */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`formation-${i}`}
          className="absolute h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent"
          style={{
            width: `${40 + i * 10}px`,
            left: `${20 + i * 12}%`,
            top: `${30 + Math.sin(i) * 40}%`,
            transform: `rotate(${i * 30}deg)`
          }}
          animate={{
            opacity: [0, 0.8, 0],
            scaleX: [0.5, 1.2, 0.5]
          }}
          transition={{
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity
          }}
        />
      ))}
    </div>
  );

  const renderVisual = () => {
    switch (visualType) {
      case 'building-blocks':
        return <BuildingBlocks />;
      case 'particle-galaxy':
        return <ParticleGalaxy />;
      case 'liquid-waves':
        return <LiquidWaves />;
      case 'floating-islands':
        return <FloatingIslands />;
      case 'crystal-growth':
        return <CrystalGrowth />;
      default:
        return <FlowingOrbs />;
    }
  };

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-slate-50 via-white to-ocean/5 rounded-2xl overflow-hidden">
      {/* Visual Effect */}
      {renderVisual()}
      
      {/* Minimal waiting indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <motion.div
          className="flex items-center space-x-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-ocean/20 shadow-lg"
          animate={{
            opacity: [0.8, 1, 0.8],
            y: [0, -2, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity
          }}
        >
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-ocean rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.2,
                  repeat: Infinity
                }}
              />
            ))}
          </div>
          <span className="text-xs text-slate-600 font-medium">
            <UserDisplayName email={otherUserName} /> is writing
          </span>
        </motion.div>
      </div>
    </div>
  );
}