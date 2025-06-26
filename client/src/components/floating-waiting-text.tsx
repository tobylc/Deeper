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
        "absolute inset-0 flex items-center justify-center pointer-events-none z-30",
        className
      )}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      {/* Main waiting text - floating and gently moving */}
      <div className="text-center max-w-4xl px-4">
        <h2 
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-slate-700/80 mb-4 sm:mb-6 gentle-float select-none"
          aria-hidden="true"
        >
          Their turn to write
        </h2>
        
        <p 
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-slate-600/70 gentle-float-delayed select-none"
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