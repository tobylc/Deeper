import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface FloatingWaitingTextProps {
  /** Additional CSS classes to apply to the container */
  className?: string;
  /** Aria label for accessibility */
  'aria-label'?: string;
}

/**
 * FloatingWaitingText Component
 * 
 * Displays beautifully animated floating text that integrates with hypnotic orbs
 * during waiting states in conversations. Includes gentle floating animations,
 * rotation effects, and glowing text shadows for a mesmerizing experience.
 */
const FloatingWaitingText = memo<FloatingWaitingTextProps>(function FloatingWaitingText({ 
  className,
  'aria-label': ariaLabel = 'Waiting for response'
}) {
  return (
    <div 
      className={cn(
        "absolute inset-x-0 bottom-0 flex items-end justify-center pointer-events-none z-30 pb-8",
        className
      )}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      {/* Main waiting text - floating and gently moving */}
      <div className="text-center max-w-4xl px-4">
        <h2 
          className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-serif text-slate-700/80 mb-2 sm:mb-3 select-none"
          style={{
            animation: 'intrigueFloat 8s ease-in-out infinite, intriguePulse 6s ease-in-out infinite',
            willChange: 'transform, opacity, text-shadow',
            backfaceVisibility: 'hidden' as const,
            transformOrigin: 'center center'
          }}
          aria-hidden="true"
        >
          Their turn to write
        </h2>
        
        <p 
          className="text-lg sm:text-xl md:text-xl lg:text-2xl font-light text-slate-600/70 select-none"
          style={{
            animation: 'intrigueFloat 10s ease-in-out infinite 2s, subtleIntrigue 7s ease-in-out infinite 1s',
            willChange: 'transform, opacity, text-shadow',
            backfaceVisibility: 'hidden' as const,
            transformOrigin: 'center center'
          }}
          aria-hidden="true"
        >
          Waiting for their thoughtful response...
        </p>
      </div>

      {/* Screen reader only text for accessibility */}
      <span className="sr-only">
        Waiting for the other person to respond to the conversation
      </span>
    </div>
  );
});

export default FloatingWaitingText;