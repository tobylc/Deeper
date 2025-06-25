import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MesmerizingWaitingVisual from './mesmerizing-waiting-visual';

const visualEffects = [
  { key: 'flowing-orbs', name: 'Flowing Orbs', description: 'Morphing orbs with connecting energy lines' },
  { key: 'building-blocks', name: 'Building Blocks', description: 'Dynamic city construction with floating debris' },
  { key: 'particle-galaxy', name: 'Particle Galaxy', description: 'Spinning galaxy with orbiting particles and spiral arms' },
  { key: 'liquid-waves', name: 'Liquid Waves', description: 'Flowing liquid with morphing droplets and ripples' },
  { key: 'floating-islands', name: 'Floating Islands', description: 'Magical floating islands with vegetation and sparkles' },
  { key: 'crystal-growth', name: 'Crystal Growth', description: 'Growing crystals with energy formations and shine effects' }
] as const;

export default function VisualEffectDemo() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const nextEffect = () => {
    setCurrentIndex((prev) => (prev + 1) % visualEffects.length);
  };
  
  const prevEffect = () => {
    setCurrentIndex((prev) => (prev - 1 + visualEffects.length) % visualEffects.length);
  };
  
  const currentEffect = visualEffects[currentIndex];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Mesmerizing Visual Effects Demo</h1>
          <p className="text-slate-600">Click through different abstract visual effects for the waiting screen</p>
        </div>
        
        {/* Effect Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevEffect}
              className="flex items-center space-x-2 px-4 py-2 bg-ocean/10 hover:bg-ocean/20 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-ocean" />
              <span className="text-ocean font-medium">Previous</span>
            </button>
            
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800">{currentEffect.name}</h2>
              <p className="text-sm text-slate-600 mt-1">{currentEffect.description}</p>
              <div className="text-xs text-slate-500 mt-2">
                {currentIndex + 1} of {visualEffects.length}
              </div>
            </div>
            
            <button
              onClick={nextEffect}
              className="flex items-center space-x-2 px-4 py-2 bg-ocean/10 hover:bg-ocean/20 rounded-xl transition-colors"
            >
              <span className="text-ocean font-medium">Next</span>
              <ChevronRight className="w-5 h-5 text-ocean" />
            </button>
          </div>
          
          {/* Dots indicator */}
          <div className="flex justify-center space-x-2">
            {visualEffects.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-ocean' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Visual Effect Display */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-[400px] relative">
            <MesmerizingWaitingVisual 
              otherUserName="demo@example.com" 
              visualType={currentEffect.key as any}
            />
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-6 text-center">
          <p className="text-slate-600 text-sm">
            Use the Previous/Next buttons or click the dots to switch between effects.
            <br />
            Let me know which effect(s) you'd like to keep for your waiting screens!
          </p>
        </div>
      </div>
    </div>
  );
}