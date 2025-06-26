import React from 'react';

interface FloatingWaitingTextProps {
  className?: string;
}

export default function FloatingWaitingText({ className = '' }: FloatingWaitingTextProps) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-30 ${className}`}>
      {/* Main waiting text - floating and gently moving */}
      <div className="text-center">
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif text-slate-700/80 mb-6 gentle-float">
          Their turn to write
        </h2>
        
        <p className="text-2xl md:text-3xl lg:text-4xl font-light text-slate-600/70 gentle-float-delayed">
          Waiting for their thoughtful response...
        </p>
      </div>
    </div>
  );
}