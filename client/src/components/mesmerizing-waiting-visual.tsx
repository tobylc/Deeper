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
      setPhase(prev => prev + 0.02);
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
      {/* Large flowing orbs */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${40 + i * 8}px`,
            height: `${40 + i * 8}px`,
            background: `radial-gradient(circle, ${i % 3 === 0 ? '#4FACFE' : i % 3 === 1 ? '#D7A087' : '#00D4FF'}80, transparent)`,
          }}
          animate={{
            x: [50 + i * 30, 80 + i * 30, 50 + i * 30],
            y: [60 + i * 20, 120 + i * 15, 60 + i * 20],
            scale: [0.8, 1.2, 0.8],
            opacity: [0.3, 0.7, 0.3]
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
          className="absolute w-2 h-2 rounded-full bg-ocean/80"
          animate={{
            x: [Math.random() * 300, Math.random() * 300],
            y: [Math.random() * 200, Math.random() * 200],
            scale: [0.5, 1.5, 0.5],
            opacity: [0.2, 0.8, 0.2]
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
          className="absolute h-0.5 bg-gradient-to-r from-transparent via-ocean/70 to-transparent rounded-full"
          style={{
            width: '120px',
            left: `${20 + i * 20}%`,
            top: `${30 + i * 15}%`,
          }}
          animate={{
            opacity: [0, 0.6, 0],
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

  const BuildingBlocks = () => (
    <div className="absolute inset-0 flex items-end justify-center">
      <div className="flex items-end space-x-2 px-8">
        {blocks.map((block, i) => (
          <motion.div
            key={block.id}
            className="relative"
            animate={{
              y: Math.sin(phase + i) * 3
            }}
            transition={{
              duration: 2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            {/* Main building block */}
            <motion.div
              className="w-8 bg-gradient-to-t from-ocean to-ocean/60 rounded-t-xl shadow-lg border border-ocean/20"
              animate={{
                height: [
                  20,
                  40 + (i % 4) * 20,
                  60 + (i % 3) * 15,
                  35 + (i % 5) * 10
                ]
              }}
              transition={{
                duration: 8 + i * 0.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse",
                delay: i * 0.3
              }}
            />
            
            {/* Block glow effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-amber/20 to-transparent rounded-t-xl"
              animate={{
                opacity: [0, 0.6, 0]
              }}
              transition={{
                duration: 3,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Window details */}
            <div className="absolute inset-x-1 top-2 space-y-1">
              {[...Array(Math.min(3, Math.floor((40 + (i % 4) * 20) / 15)))].map((_, windowIndex) => (
                <motion.div
                  key={windowIndex}
                  className="w-2 h-1 bg-yellow-200/60 rounded-sm"
                  animate={{
                    opacity: [0.3, 0.8, 0.3]
                  }}
                  transition={{
                    duration: 2,
                    delay: windowIndex * 0.5 + i * 0.1,
                    repeat: Infinity
                  }}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Slowly floating construction elements */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`debris-${i}`}
          className="absolute w-3 h-3 bg-amber/85 rounded shadow-sm"
          animate={{
            x: [100 + i * 30, 120 + i * 30, 100 + i * 30],
            y: [80 + i * 15, 60 + i * 15, 80 + i * 15],
            rotate: [0, 90, 0]
          }}
          transition={{
            duration: 6 + i,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 0.8
          }}
        />
      ))}
      
      {/* Construction crane */}
      <motion.div
        className="absolute right-8 bottom-0"
        animate={{
          rotate: [-2, 2, -2]
        }}
        transition={{
          duration: 8,
          ease: "easeInOut",
          repeat: Infinity
        }}
      >
        <div className="w-1 h-24 bg-yellow-600 rounded-full"></div>
        <div className="absolute top-4 -left-8 w-16 h-1 bg-yellow-600 rounded-full origin-left"></div>
        <motion.div
          className="absolute top-4 right-0 w-2 h-8 bg-amber/80 rounded"
          animate={{
            y: [0, -10, 0]
          }}
          transition={{
            duration: 4,
            ease: "easeInOut",
            repeat: Infinity,
            delay: 1
          }}
        />
      </motion.div>
    </div>
  );

  const ParticleGalaxy = () => (
    <div className="absolute inset-0">
      {/* Central pulsing core */}
      <motion.div
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.4, 1],
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
          repeat: Infinity
        }}
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-ocean via-amber to-ocean shadow-2xl" />
        <motion.div 
          className="absolute inset-0 w-12 h-12 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{
            rotate: [0, 360]
          }}
          transition={{
            duration: 8,
            ease: "linear",
            repeat: Infinity
          }}
        />
      </motion.div>
      
      {/* Slowly orbiting particles */}
      {particles.map((particle, i) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full shadow-lg"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            boxShadow: `0 0 ${particle.size * 3}px ${particle.color}60`
          }}
          animate={{
            x: [
              Math.cos(i * 0.3) * (80 + i * 6) + 150,
              Math.cos(i * 0.3 + Math.PI) * (80 + i * 6) + 150
            ],
            y: [
              Math.sin(i * 0.3) * (60 + i * 4) + 140,
              Math.sin(i * 0.3 + Math.PI) * (60 + i * 4) + 140
            ],
            opacity: [0.7, 1, 0.7],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{
            duration: 15 + i * 0.5,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
      
      {/* Gentle spiral arms */}
      {[...Array(3)].map((_, armIndex) => (
        <motion.div
          key={`arm-${armIndex}`}
          className="absolute w-1 bg-gradient-to-r from-transparent via-ocean/70 to-transparent origin-left rounded-full"
          style={{
            height: `${100 + armIndex * 15}px`,
            left: '50%',
            top: '50%',
            transformOrigin: '0 0'
          }}
          animate={{
            rotate: [armIndex * 120, armIndex * 120 + 360],
            opacity: [0.3, 0.7, 0.3],
            scaleY: [0.8, 1.1, 0.8]
          }}
          transition={{
            duration: 20 + armIndex * 5,
            ease: "linear",
            repeat: Infinity,
            delay: armIndex * 2
          }}
        />
      ))}
      
      {/* Distant twinkling stars */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute w-1 h-1 bg-white/90 rounded-full"
          style={{
            left: `${Math.random() * 90 + 5}%`,
            top: `${Math.random() * 90 + 5}%`
          }}
          animate={{
            opacity: [0.4, 1, 0.4],
            scale: [0.5, 1.5, 0.5]
          }}
          transition={{
            duration: 3 + Math.random() * 3,
            ease: "easeInOut",
            repeat: Infinity,
            delay: Math.random() * 3
          }}
        />
      ))}
    </div>
  );

  const LiquidWaves = () => (
    <div className="absolute inset-0 overflow-hidden">
      {/* Flowing liquid layers */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${i % 2 === 0 ? '#4FACFE' : '#D7A087'}${25 - i * 3}, transparent 70%)`,
          }}
          animate={{
            background: [
              `radial-gradient(ellipse 60% 40% at 30% 40%, ${i % 2 === 0 ? '#4FACFE' : '#D7A087'}${25 - i * 3}, transparent 70%)`,
              `radial-gradient(ellipse 60% 40% at 70% 60%, ${i % 2 === 0 ? '#4FACFE' : '#D7A087'}${25 - i * 3}, transparent 70%)`,
              `radial-gradient(ellipse 60% 40% at 30% 40%, ${i % 2 === 0 ? '#4FACFE' : '#D7A087'}${25 - i * 3}, transparent 70%)`
            ],
            opacity: [0.6, 1, 0.6],
            scale: [0.9, 1.2, 0.9]
          }}
          transition={{
            duration: 8 + i * 2,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 1.5
          }}
        />
      ))}
      
      {/* Gentle liquid droplets */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`droplet-${i}`}
          className="absolute rounded-full"
          style={{
            width: `${20 + i * 3}px`,
            height: `${25 + i * 4}px`,
            background: `radial-gradient(ellipse, ${i % 2 === 0 ? '#4FACFE' : '#D7A087'}85, transparent)`,
          }}
          animate={{
            x: [50 + i * 35, 80 + i * 35, 50 + i * 35],
            y: [30, 200, 30],
            opacity: [0, 1, 0],
            scale: [0.8, 1.3, 0.5]
          }}
          transition={{
            duration: 6 + i * 0.8,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 0.7
          }}
        />
      ))}
      
      {/* Expanding ripples */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`ripple-${i}`}
          className="absolute border-2 border-ocean/50 rounded-full"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
          animate={{
            width: [0, 150, 0],
            height: [0, 150, 0],
            opacity: [0, 0.6, 0],
            borderWidth: [4, 1, 0]
          }}
          transition={{
            duration: 5,
            delay: i * 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );

  const FloatingIslands = () => (
    <div className="absolute inset-0">
      {/* Gracefully floating islands */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          animate={{
            x: [40 + i * 40, 60 + i * 40, 40 + i * 40],
            y: [60 + i * 25, 80 + i * 25, 60 + i * 25],
            rotate: [-5, 5, -5]
          }}
          transition={{
            duration: 12 + i * 2,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 1.5
          }}
        >
          {/* Floating island shadow */}
          <motion.div 
            className="w-20 h-8 bg-black/15 rounded-full blur-md absolute top-10"
            style={{ transform: 'perspective(100px) rotateX(60deg)' }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              scale: [0.8, 1.1, 0.8]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              delay: i * 0.5
            }}
          />
          
          {/* Island base */}
          <motion.div 
            className={`w-18 h-8 rounded-full shadow-xl ${i % 3 === 0 ? 'bg-gradient-to-b from-amber/80 to-amber/95' : i % 3 === 1 ? 'bg-gradient-to-b from-green-400/80 to-green-600/95' : 'bg-gradient-to-b from-stone-400/80 to-stone-600/95'}`}
            style={{ transform: 'perspective(120px) rotateX(25deg)' }}
            animate={{
              scale: [0.95, 1.05, 0.95]
            }}
            transition={{
              duration: 6,
              ease: "easeInOut",
              repeat: Infinity,
              delay: i * 0.8
            }}
          />
          
          {/* Island vegetation */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
            <motion.div 
              className="w-2 h-8 bg-green-500 rounded-full shadow-sm"
              animate={{
                height: [24, 32, 24],
                opacity: [0.8, 1, 0.8],
                rotate: [-2, 2, -2]
              }}
              transition={{
                duration: 4,
                delay: i * 0.4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div 
              className="w-1.5 h-6 bg-green-600 rounded-full shadow-sm"
              animate={{
                height: [16, 24, 16],
                opacity: [0.7, 0.9, 0.7],
                rotate: [2, -2, 2]
              }}
              transition={{
                duration: 4.5,
                delay: i * 0.4 + 0.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          
          {/* Gentle magical aura */}
          <motion.div
            className="absolute -inset-3 rounded-full bg-gradient-to-r from-yellow-200/20 via-transparent to-blue-200/20"
            animate={{
              opacity: [0, 0.7, 0],
              scale: [0.8, 1.3, 0.8],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 8,
              delay: i * 0.3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      ))}
      
      {/* Gentle floating particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1.5 h-1.5 bg-blue-200 rounded-full shadow-sm"
          animate={{
            x: [Math.random() * 250 + 25, Math.random() * 250 + 25],
            y: [Math.random() * 180 + 40, Math.random() * 180 + 40],
            opacity: [0.2, 0.8, 0.2],
            scale: [0.5, 1.2, 0.5]
          }}
          transition={{
            duration: 10 + i * 0.8,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 0.5
          }}
        />
      ))}
    </div>
  );

  const CrystalGrowth = () => (
    <div className="absolute inset-0">
      {/* Slowly growing crystals */}
      {crystals.map((crystal, i) => (
        <motion.div
          key={crystal.id}
          className="absolute"
          style={{
            left: `${crystal.x}%`,
            top: `${crystal.y}%`,
          }}
          animate={{
            rotate: [crystal.rotation, crystal.rotation + 360],
            scale: [0.8, 1.1, 0.8]
          }}
          transition={{
            duration: 20 + i * 2,
            ease: "linear",
            repeat: Infinity,
            delay: i * 1.5
          }}
        >
          {/* Crystal formation growth */}
          <motion.div
            className="relative"
            animate={{
              scale: [0, 1, 1.1, 1]
            }}
            transition={{
              duration: 8,
              delay: crystal.delay,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut"
            }}
          >
            {/* Main crystal structure */}
            <motion.div 
              className={`w-8 h-12 ${i % 3 === 0 ? 'bg-gradient-to-t from-ocean/90 to-ocean/50' : i % 3 === 1 ? 'bg-gradient-to-t from-amber/90 to-amber/50' : 'bg-gradient-to-t from-purple-400/90 to-purple-200/50'} shadow-xl border border-white/20`}
              style={{ 
                clipPath: 'polygon(50% 0%, 80% 35%, 100% 100%, 0% 100%, 20% 35%)',
                transform: 'rotate(15deg)'
              }}
              animate={{
                opacity: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Crystal facets */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent"
              style={{ 
                clipPath: 'polygon(50% 0%, 80% 35%, 50% 60%)',
                transform: 'rotate(15deg)'
              }}
              animate={{
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{
                duration: 4,
                delay: i * 0.3,
                repeat: Infinity
              }}
            />
            
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
              style={{ transform: 'rotate(15deg)' }}
              animate={{
                x: ['-120%', '120%']
              }}
              transition={{
                duration: 5,
                delay: i * 0.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
          
          {/* Gentle energy field */}
          <motion.div
            className={`absolute -inset-4 rounded-full ${i % 3 === 0 ? 'bg-ocean/30' : i % 3 === 1 ? 'bg-amber/30' : 'bg-purple-400/30'} blur-lg`}
            animate={{
              scale: [0.6, 1.2, 0.6],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{
              duration: 8,
              delay: i * 0.6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      ))}
      
      {/* Slow energy connections */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`connection-${i}`}
          className="absolute h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full"
          style={{
            width: `${60 + i * 20}px`,
            left: `${25 + i * 15}%`,
            top: `${40 + Math.sin(i) * 30}%`,
          }}
          animate={{
            opacity: [0, 0.7, 0],
            scaleX: [0.3, 1, 0.3],
            rotate: [0, 90, 180]
          }}
          transition={{
            duration: 6,
            delay: i * 1.2,
            repeat: Infinity,
            ease: "easeInOut"
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