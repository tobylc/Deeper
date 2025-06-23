import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { UserDisplayName } from "@/hooks/useUserDisplayName";

interface MesmerizingWaitingVisualProps {
  otherUserName: string;
}

export default function MesmerizingWaitingVisual({ otherUserName }: MesmerizingWaitingVisualProps) {
  const [currentDot, setCurrentDot] = useState(0);
  const [inkDrops, setInkDrops] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const [breathingPhase, setBreathingPhase] = useState(0);

  // Animated typing dots
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDot(prev => (prev + 1) % 4);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Breathing paper animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathingPhase(prev => (prev + 1) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Generate floating ink drops
  useEffect(() => {
    const generateInkDrop = () => {
      const newDrop = {
        id: Date.now() + Math.random(),
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2
      };
      setInkDrops(prev => [...prev, newDrop]);
      
      // Remove old drops
      setTimeout(() => {
        setInkDrops(prev => prev.filter(drop => drop.id !== newDrop.id));
      }, 6000);
    };

    const interval = setInterval(generateInkDrop, 2000);
    return () => clearInterval(interval);
  }, []);

  const breathingScale = 1 + Math.sin(breathingPhase * 0.1) * 0.02;
  const breathingRotation = Math.sin(breathingPhase * 0.05) * 1;

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
      {/* Animated Background Gradient */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            "linear-gradient(45deg, #4FACFE 0%, #00D4FF 50%, #4FACFE 100%)",
            "linear-gradient(45deg, #00D4FF 0%, #4FACFE 50%, #00D4FF 100%)",
            "linear-gradient(45deg, #4FACFE 0%, #00D4FF 50%, #4FACFE 100%)"
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Floating Ink Drops */}
      <AnimatePresence>
        {inkDrops.map((drop) => (
          <motion.div
            key={drop.id}
            className="absolute w-2 h-2 bg-ocean/40 rounded-full"
            initial={{ 
              x: `${drop.x}%`, 
              y: `${drop.y}%`,
              scale: 0,
              opacity: 0
            }}
            animate={{ 
              y: `${drop.y - 30}%`,
              scale: [0, 1, 0.8, 0],
              opacity: [0, 0.6, 0.4, 0],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 6,
              delay: drop.delay,
              ease: "easeOut"
            }}
          />
        ))}
      </AnimatePresence>

      {/* Main Waiting Paper */}
      <motion.div
        className="relative bg-gradient-to-br from-slate-50 to-slate-100 p-12 rounded-3xl shadow-2xl border border-slate-200/50"
        style={{
          background: `
            linear-gradient(to right, #fef7cd 0%, #fef7cd 20px, transparent 20px),
            linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)
          `,
          backgroundSize: '100% 25px, 100% 100%'
        }}
        animate={{
          scale: breathingScale,
          rotate: breathingRotation,
          y: Math.sin(breathingPhase * 0.08) * 5
        }}
        transition={{ ease: "easeInOut" }}
      >
        {/* Decorative paper holes */}
        <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-evenly">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="w-4 h-4 bg-white border-2 border-slate-300 rounded-full shadow-inner"
              animate={{
                scale: [1, 1.1, 1],
                borderColor: ["#cbd5e1", "#4FACFE", "#cbd5e1"]
              }}
              transition={{
                duration: 3,
                delay: i * 0.5,
                repeat: Infinity
              }}
            />
          ))}
        </div>

        {/* Waiting Content */}
        <div className="ml-8 max-w-md">
          {/* Animated Title */}
          <motion.h3 
            className="text-2xl font-bold text-slate-700 mb-4 font-serif"
            animate={{
              color: ["#475569", "#4FACFE", "#475569"]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Waiting for <UserDisplayName email={otherUserName} />
          </motion.h3>

          {/* Animated typing indicator */}
          <div className="flex items-center space-x-2 mb-6">
            <span className="text-slate-600 font-medium">to finish writing</span>
            <div className="flex space-x-1">
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="w-2 h-2 bg-ocean rounded-full"
                  animate={{
                    scale: currentDot === index ? [1, 1.5, 1] : 1,
                    opacity: currentDot === index ? [0.5, 1, 0.5] : 0.5
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </div>

          {/* Reflection text with shimmer effect */}
          <motion.div
            className="text-slate-600 text-sm leading-relaxed space-y-2 relative"
            animate={{
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <p className="relative overflow-hidden">
              Take a moment to reflect while they craft their response.
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{
                  x: ["-100%", "100%"]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
              />
            </p>
            <p className="relative overflow-hidden">
              You'll be notified when it's your turn to continue the conversation.
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{
                  x: ["-100%", "100%"]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2
                }}
              />
            </p>
          </motion.div>

          {/* Animated pen illustration */}
          <motion.div
            className="mt-8 flex items-center justify-center"
            animate={{
              rotate: [0, 5, -5, 0],
              x: [0, 10, -10, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.05, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* Pen body */}
              <div className="w-24 h-3 bg-gradient-to-r from-amber-600 to-amber-500 rounded-full shadow-lg" />
              
              {/* Pen tip */}
              <div className="absolute -right-1 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-400 to-slate-500 rounded-r-full" />
              
              {/* Ink flow */}
              <motion.div
                className="absolute -right-2 top-1/2 w-1 h-1 bg-ocean rounded-full"
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 1
                }}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Floating thoughts bubbles */}
        <div className="absolute -top-6 -right-6">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-8 h-8 bg-white/80 rounded-full border border-ocean/20 shadow-lg"
              style={{
                right: i * 15,
                top: i * 10
              }}
              animate={{
                y: [0, -10, 0],
                scale: [1, 1.1, 1],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 3,
                delay: i * 0.8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="absolute inset-2 bg-ocean/20 rounded-full" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Subtle particle system */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-ocean/30 rounded-full"
            style={{
              left: `${10 + (i * 8)}%`,
              top: `${20 + Math.sin(i) * 30}%`
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 0.6, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 4 + i * 0.2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
}