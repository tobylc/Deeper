import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@shared/schema";

interface VoiceMessageDisplayProps {
  message: Message;
  isCurrentUser: boolean;
  className?: string;
}

export default function VoiceMessageDisplay({ message, isCurrentUser, className }: VoiceMessageDisplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle initial audio loading state with enhanced URL validation
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !message.audioFileUrl) {
      setIsLoading(false);
      setError('No audio file available');
      return;
    }

    // Validate and construct proper audio URL with production-ready path handling
    let audioUrl = message.audioFileUrl;
    if (!audioUrl.startsWith('http') && !audioUrl.startsWith('/')) {
      // Handle relative paths - ensure they point to /uploads/
      audioUrl = audioUrl.startsWith('uploads/') ? `/${audioUrl}` : `/uploads/${audioUrl}`;
    }
    
    // Additional validation for production deployment
    if (audioUrl.startsWith('/uploads/uploads/')) {
      // Fix double uploads path that can occur in some scenarios
      audioUrl = audioUrl.replace('/uploads/uploads/', '/uploads/');
    }

    // Set the audio source immediately
    audio.src = audioUrl;

    // Check if audio is already loaded
    if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
      setIsLoading(false);
      return;
    }

    // Set up event listeners for loading
    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleError = (e: Event) => {
      console.error('Audio load error details:', {
        url: audioUrl,
        originalUrl: message.audioFileUrl,
        error: e,
        readyState: audio.readyState
      });
      setIsLoading(false);
      setError('Audio file could not be loaded');
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Force load the audio
    audio.load();

    // Cleanup
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [message.audioFileUrl]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = async () => {
    if (!audioRef.current) {
      console.error('Audio ref not available');
      return;
    }

    if (!message.audioFileUrl) {
      console.error('No audio URL available');
      setError('Audio file not available');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Production-ready URL validation and construction
        let audioUrl = message.audioFileUrl;
        
        // Comprehensive URL validation
        if (!audioUrl || typeof audioUrl !== 'string') {
          throw new Error('Invalid audio file URL');
        }
        
        // Normalize URL path for production deployment
        if (!audioUrl.startsWith('http') && !audioUrl.startsWith('/')) {
          audioUrl = audioUrl.startsWith('uploads/') ? `/${audioUrl}` : `/uploads/${audioUrl}`;
        }
        
        // Fix double uploads path that can occur in some scenarios
        if (audioUrl.startsWith('/uploads/uploads/')) {
          audioUrl = audioUrl.replace('/uploads/uploads/', '/uploads/');
        }
        
        // Validate audio source change with error handling
        if (audioRef.current.src !== audioUrl) {
          audioRef.current.src = audioUrl;
        }

        // Check if audio is loaded
        if (audioRef.current.readyState < 2) {
  
          await new Promise((resolve, reject) => {
            const audio = audioRef.current!;
            const timeoutId = setTimeout(() => {
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              reject(new Error('Audio load timeout'));
            }, 10000); // 10 second timeout

            const onCanPlay = () => {
              clearTimeout(timeoutId);
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              resolve(void 0);
            };
            const onError = () => {
              clearTimeout(timeoutId);
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              reject(new Error('Failed to load audio'));
            };
            audio.addEventListener('canplay', onCanPlay);
            audio.addEventListener('error', onError);
            audio.load();
          });
        }

        await audioRef.current.play();
        setIsPlaying(true);

      }
    } catch (err: any) {
      console.error('Audio playback error:', err);
      setError(`Playback failed: ${err.message}`);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleLoadError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error('Audio load error:', e);
    setError('Unable to load audio file');
    setIsLoading(false);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleCanPlayEvent = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !message.audioDuration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * message.audioDuration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = message.audioDuration ? (currentTime / message.audioDuration) * 100 : 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Voice Message Player */}
      <Card className={cn(
        "p-4 max-w-sm transition-all duration-200",
        isCurrentUser 
          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-auto" 
          : "bg-gradient-to-br from-amber-100 to-amber-200 text-slate-800"
      )}>
        <div className="flex items-center space-x-3">
          {/* Play/Pause Button - Ocean Blue for Visibility */}
          <Button
            onClick={togglePlayback}
            disabled={isLoading}
            size="sm"
            className={cn(
              "w-12 h-12 rounded-full transition-all duration-200 shadow-lg border-2",
              "bg-gradient-to-br from-[#4FACFE] to-[#3B82F6] hover:from-[#4FACFE]/90 hover:to-[#3B82F6]/90",
              "text-white border-blue-400 hover:shadow-blue-500/25 hover:scale-105",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            )}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>

          {/* Waveform / Progress Bar */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2 text-xs">
              <Volume2 className="w-3 h-3" />
              <span>{error ? "Audio Error" : "Voice Message"}</span>
            </div>
            
            {/* Progress Bar */}
            <div 
              className="h-2 bg-black/20 rounded-full cursor-pointer"
              onClick={handleSeek}
            >
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-100",
                  isCurrentUser ? "bg-white/80" : "bg-amber-600"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs opacity-75">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(message.audioDuration || 0)}</span>
            </div>
          </div>
        </div>

        {/* Audio Element with Production-Ready URL Handling */}
        <audio
          ref={audioRef}
          src={(() => {
            // Production-ready URL construction for audio playback
            if (!message.audioFileUrl) return '';
            let url = message.audioFileUrl;
            
            // Handle relative paths properly
            if (!url.startsWith('http') && !url.startsWith('/')) {
              url = url.startsWith('uploads/') ? `/${url}` : `/uploads/${url}`;
            }
            
            // Fix double uploads path
            if (url.startsWith('/uploads/uploads/')) {
              url = url.replace('/uploads/uploads/', '/uploads/');
            }
            
            // Add timestamp to prevent caching issues
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}t=${Date.now()}`;
          })()}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleLoadError}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlayEvent}
          preload="metadata"
          crossOrigin="anonymous"
        />
        
        {/* Debug Info in Development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-100 rounded">
            <div>Audio URL: {message.audioFileUrl}</div>
            <div>Duration: {message.audioDuration}s</div>
            <div>Error: {error || 'None'}</div>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
          </div>
        )}
      </Card>

      {/* Transcription */}
      <Card className={cn(
        "p-4 max-w-lg transition-all duration-200",
        isCurrentUser 
          ? "bg-gradient-to-br from-slate-100 to-slate-200 ml-auto" 
          : "bg-gradient-to-br from-white to-slate-50"
      )}>
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Transcription
          </div>
          <div className="text-slate-700 leading-relaxed">
            {message.transcription || message.content}
          </div>
        </div>
      </Card>
    </div>
  );
}