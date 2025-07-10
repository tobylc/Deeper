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

  // Handle initial audio loading state with enhanced error handling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !message.audioFileUrl) {
      setIsLoading(false);
      setError(message.audioFileUrl ? null : 'No audio file URL');
      return;
    }

    // Simplified URL validation and construction for initial load
    let audioUrl = message.audioFileUrl;
    if (!audioUrl.startsWith('http')) {
      // If it's a relative path starting with /uploads/, use it directly
      if (audioUrl.startsWith('/uploads/')) {
        audioUrl = `${window.location.origin}${audioUrl}`;
      } else {
        // Otherwise, add the /uploads/ prefix
        const filename = audioUrl.replace(/^\/+/, '').replace(/^uploads\//, '');
        audioUrl = `${window.location.origin}/uploads/${filename}`;
      }
    }

    // Set the computed URL if different
    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
    }

    // Check if audio is already loaded
    if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
      setIsLoading(false);
      setError(null);
      return;
    }

    // Set up event listeners for loading with better error detection
    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
      if (process.env.NODE_ENV === 'development') {

      }
    };

    const handleError = (e: Event) => {
      setIsLoading(false);
      const audioError = (e.target as HTMLAudioElement)?.error;
      const errorCode = audioError?.code;
      const errorMessage = audioError?.message || 'Unknown error';
      
      // Detailed error information for debugging
      let detailedError = `Playback failed: Audio load failed: `;
      switch (errorCode) {
        case MediaError.MEDIA_ERR_ABORTED:
          detailedError += 'MEDIA_ERR_ABORTED: Playback aborted by user';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          detailedError += 'MEDIA_ERR_NETWORK: Network error while loading audio';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          detailedError += 'MEDIA_ERR_DECODE: Audio format not supported or corrupted';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          detailedError += 'MEDIA_ERR_SRC_NOT_SUPPORTED: Audio format or source not supported';
          break;
        default:
          detailedError += errorMessage;
      }
      
      // Add more detailed browser-specific error info
      if (errorMessage.includes('DEMUXER_ERROR')) {
        detailedError += '\nDEMUXER_ERROR_COULD_NOT_OPEN: FFmpegDemuxer: open context failed';
      }
      
      setError(detailedError);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Audio playback error details:', {
          errorCode,
          errorMessage,
          detailedError,
          audioUrl: message.audioFileUrl,
          readyState: audio?.readyState,
          networkState: audio?.networkState
        });
      }
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    // Force initial load
    audio.load();

    // Cleanup
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [message.audioFileUrl]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = async () => {
    if (!audioRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Audio ref not available');
      }
      return;
    }

    if (!message.audioFileUrl) {
      if (process.env.NODE_ENV === 'development') {
        console.error('No audio URL available');
      }
      setError('Audio file not available');
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Attempting to play audio from URL:', message.audioFileUrl);
    }

    try {
      setError(null);
      setIsLoading(true);

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Simplified URL construction for audio files
        let audioUrl = message.audioFileUrl;
        
        // Ensure proper URL construction
        if (!audioUrl.startsWith('http')) {
          // If it's a relative path starting with /uploads/, use it directly
          if (audioUrl.startsWith('/uploads/')) {
            audioUrl = `${window.location.origin}${audioUrl}`;
          } else {
            // Otherwise, add the /uploads/ prefix
            const filename = audioUrl.replace(/^\/+/, '').replace(/^uploads\//, '');
            audioUrl = `${window.location.origin}/uploads/${filename}`;
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Constructed audio URL:', audioUrl);
        }
        
        // Always force a fresh load to avoid cache issues
        const audio = audioRef.current;
        audio.src = '';
        audio.load(); // Clear current source
        
        // Set new source and force reload
        audio.src = audioUrl;
        
        // Check network connectivity to the audio file first
        try {
          const testResponse = await fetch(audioUrl, { 
            method: 'HEAD',
            cache: 'no-cache'
          });
          
          if (!testResponse.ok) {
            // Audio file missing - show transcription as fallback
            if (message.transcription && message.transcription !== '[Transcription unavailable - audio only]') {
              setError(`Audio file not found (${testResponse.status}). Transcription available: "${message.transcription}"`);
              return;
            } else {
              throw new Error(`Audio file not accessible: ${testResponse.status}`);
            }
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Audio file accessibility confirmed');
          }
        } catch (fetchError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Audio file fetch test failed:', fetchError);
          }
          
          // If we have transcription, show it as fallback
          if (message.transcription && message.transcription !== '[Transcription unavailable - audio only]') {
            setError(`Audio file unavailable. Transcription: "${message.transcription}"`);
            return;
          } else {
            throw new Error(`Cannot access audio file: ${(fetchError as Error)?.message || 'Network error'}`);
          }
        }

        // Wait for audio to be loadable with enhanced error handling
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('canplaythrough', onCanPlayThrough);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('loadstart', onLoadStart);
            console.error('Audio load timeout after 15 seconds');
            reject(new Error('Audio load timeout - file may be corrupted or network issues'));
          }, 15000); // Extended timeout for better reliability

          const onCanPlay = () => {
            console.log('Audio canplay event fired');
            clearTimeout(timeoutId);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('canplaythrough', onCanPlayThrough);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('loadstart', onLoadStart);
            resolve(void 0);
          };
          
          const onCanPlayThrough = () => {
            console.log('Audio canplaythrough event fired');
            clearTimeout(timeoutId);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('canplaythrough', onCanPlayThrough);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('loadstart', onLoadStart);
            resolve(void 0);
          };
          
          const onError = (e: Event) => {
            console.error('Audio loading error:', e);
            clearTimeout(timeoutId);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('canplaythrough', onCanPlayThrough);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('loadstart', onLoadStart);
            reject(new Error(`Audio load failed: ${(e.target as HTMLAudioElement)?.error?.message || 'Unknown audio error'}`));
          };
          
          const onLoadStart = () => {
            console.log('Audio load started');
          };
          
          audio.addEventListener('canplay', onCanPlay);
          audio.addEventListener('canplaythrough', onCanPlayThrough);
          audio.addEventListener('error', onError);
          audio.addEventListener('loadstart', onLoadStart);
          
          // Force load
          audio.load();
        });

        // Attempt playback with user gesture handling
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          console.log('Audio playback started successfully');
        } catch (playError) {
          console.error('Play method failed:', playError);
          throw new Error(`Playback failed: ${(playError as Error)?.message || 'Unknown playback error'}`);
        }
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

        {/* Audio Element with Enhanced Debugging and Fixed URL Construction */}
        <audio
          ref={audioRef}
          src={(() => {
            if (!message.audioFileUrl) return '';
            
            // Simplified URL construction matching the fixed togglePlayback logic
            let audioUrl = message.audioFileUrl;
            
            if (!audioUrl.startsWith('http')) {
              // If it's a relative path starting with /uploads/, use it directly
              if (audioUrl.startsWith('/uploads/')) {
                audioUrl = `${window.location.origin}${audioUrl}`;
              } else {
                // Otherwise, add the /uploads/ prefix
                const filename = audioUrl.replace(/^\/+/, '').replace(/^uploads\//, '');
                audioUrl = `${window.location.origin}/uploads/${filename}`;
              }
            }
            
            return audioUrl;
          })()}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleLoadError}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlayEvent}
          preload="metadata"
          onLoadedMetadata={() => process.env.NODE_ENV === 'development' && console.log('Audio metadata loaded')}
          onLoadedData={() => process.env.NODE_ENV === 'development' && console.log('Audio data loaded')}
          crossOrigin="anonymous"
        />
        
        {/* Debug Info - Show only in development */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-100 rounded">
            <div>Original Audio URL: {message.audioFileUrl}</div>
            <div>Computed Audio URL: {(() => {
              if (!message.audioFileUrl) return 'No URL';
              let audioUrl = message.audioFileUrl;
              if (!audioUrl.startsWith('http')) {
                if (audioUrl.startsWith('/uploads/')) {
                  audioUrl = `${window.location.origin}${audioUrl}`;
                } else {
                  const filename = audioUrl.replace(/^\/+/, '').replace(/^uploads\//, '');
                  audioUrl = `${window.location.origin}/uploads/${filename}`;
                }
              }
              return audioUrl;
            })()}</div>
            <div>Duration: {message.audioDuration}s</div>
            <div>Error: {error}</div>
            <div>Audio Ready State: {audioRef.current?.readyState}</div>
            <div>Audio Network State: {audioRef.current?.networkState}</div>
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