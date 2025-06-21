import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TranscriptionProgressProps {
  isVisible: boolean;
  onComplete?: () => void;
  className?: string;
}

export default function TranscriptionProgress({ 
  isVisible, 
  onComplete, 
  className 
}: TranscriptionProgressProps) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'processing' | 'transcribing' | 'complete'>('processing');

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setStage('processing');
      return;
    }

    // Simulate AI transcription progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 30) {
          setStage('processing');
          return prev + Math.random() * 8 + 2; // 2-10% increments in processing phase
        } else if (prev < 85) {
          setStage('transcribing');
          return prev + Math.random() * 6 + 1; // 1-7% increments in transcription phase
        } else if (prev < 100) {
          return prev + Math.random() * 3 + 1; // 1-4% increments near completion
        } else {
          setStage('complete');
          setTimeout(() => {
            onComplete?.();
          }, 500);
          return 100;
        }
      });
    }, 150 + Math.random() * 100); // Variable timing for realistic feel

    return () => clearInterval(interval);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  const getStageText = () => {
    switch (stage) {
      case 'processing':
        return 'Processing audio...';
      case 'transcribing':
        return 'AI transcribing speech...';
      case 'complete':
        return 'Transcription complete!';
      default:
        return 'Processing...';
    }
  };

  return (
    <Card className={cn(
      "p-4 max-w-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg",
      className
    )}>
      <div className="flex items-center space-x-3">
        {/* AI Icon with Animation */}
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            {stage === 'processing' ? (
              <Mic className="w-5 h-5 text-white" />
            ) : (
              <Sparkles className="w-5 h-5 text-white" />
            )}
          </div>
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-30" />
        </div>

        {/* Progress Content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {getStageText()}
            </span>
            <span className="text-xs font-mono text-blue-600 bg-blue-200 px-2 py-1 rounded-full">
              {Math.round(progress)}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="text-xs text-blue-600">
            Using OpenAI Whisper for accurate transcription
          </div>
        </div>
      </div>
    </Card>
  );
}