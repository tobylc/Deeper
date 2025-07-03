import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, Trash2, Square, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import ThoughtfulResponsePopup from "@/components/thoughtful-response-popup";

interface VoiceRecorderProps {
  onSendVoiceMessage: (audioBlob: Blob, duration: number) => void;
  onRecordingStart?: () => void;
  disabled?: boolean;
  className?: string;
  canSendMessage?: boolean;
  hasStartedResponse?: boolean;
  responseStartTime?: Date | null;
  onTimerStart?: () => void;
  messages?: any[];
  connection?: any;
  currentUserEmail?: string;
  nextMessageType?: 'question' | 'response' | 'follow up';
}

export default function VoiceRecorder({ 
  onSendVoiceMessage, 
  onRecordingStart, 
  disabled, 
  className,
  canSendMessage = true,
  hasStartedResponse = false,
  responseStartTime = null,
  onTimerStart,
  messages = [],
  connection,
  currentUserEmail,
  nextMessageType
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0); // 0-100
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [showThoughtfulResponseTimer, setShowThoughtfulResponseTimer] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  // Real-time countdown timer synchronization
  useEffect(() => {
    if (hasStartedResponse && responseStartTime) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [hasStartedResponse, responseStartTime]);

  // Calculate remaining time for thoughtful response timer using currentTime for real-time sync
  const getRemainingTime = () => {
    if (!hasStartedResponse || !responseStartTime) return 600; // 10 minutes in seconds
    const elapsed = (currentTime.getTime() - responseStartTime.getTime()) / 1000;
    return Math.max(0, 600 - elapsed);
  };

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if this is inviter's first question to bypass timer completely
  const isInviterFirstQuestion = () => {
    if (!messages || !connection || !currentUserEmail) return false;
    return messages.length === 0 && 
           connection.inviterEmail === currentUserEmail &&
           nextMessageType === 'question';
  };

  const canSendNow = () => {
    // Skip timer completely for inviter's first question
    if (isInviterFirstQuestion()) return true;
    if (!hasStartedResponse) return true;
    return getRemainingTime() <= 0;
  };

  // Volume monitoring function
  const monitorVolume = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Use time domain data for accurate volume detection
    analyserRef.current.getByteTimeDomainData(dataArray);
    
    // Calculate RMS (Root Mean Square) for accurate volume
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const amplitude = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
      sumSquares += amplitude * amplitude;
    }
    
    const rms = Math.sqrt(sumSquares / bufferLength);
    // Scale and amplify for better visual feedback
    const volume = Math.min(100, Math.max(0, rms * 500));
    
    setVolumeLevel(volume);
    
    if (isRecording && !isPaused) {
      animationFrameRef.current = requestAnimationFrame(monitorVolume);
    }
  };

  const startRecording = async () => {
    try {
      // Check for getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Voice recording not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      
      // Set up audio analysis for volume monitoring
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      // Create a gain node for better control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;
      
      analyser.fftSize = 512; // Balanced resolution for real-time performance
      analyser.smoothingTimeConstant = 0.3; // Less smoothing for more responsive feedback
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      
      microphone.connect(gainNode);
      gainNode.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setHasRecording(true);
        
        // Stop volume monitoring
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        // Stop all tracks to free up microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Close audio context safely
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setVolumeLevel(0);
      
      // Start volume monitoring with delay to ensure audio context is ready
      setTimeout(() => {
        monitorVolume();
      }, 100);
      
      // Notify parent that recording started (for response timer)
      if (onRecordingStart) {
        onRecordingStart();
      }
      
      // Start thoughtful response timer if not already started (skip for inviter's first question)
      if (!isInviterFirstQuestion() && !hasStartedResponse && onTimerStart) {
        onTimerStart();
      }
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= 1800) { // 30 minutes max
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      
      // Production-ready error messaging
      let errorMessage = 'Unable to access microphone';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Voice recording is not supported in this browser.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is already in use by another application.';
      }

      // Use toast notification instead of alert for better UX
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const toast = new CustomEvent('showToast', {
          detail: {
            title: 'Voice Recording Error',
            description: errorMessage,
            variant: 'destructive'
          }
        });
        window.dispatchEvent(toast);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setVolumeLevel(0);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      // Stop timer and volume monitoring
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      setVolumeLevel(0);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= 1800) { // 30 minutes max
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      // Resume volume monitoring
      monitorVolume();
    }
  };

  const clearRecording = () => {
    setHasRecording(false);
    setAudioBlob(null);
    setDuration(0);
    setVolumeLevel(0);
    setIsRecording(false);
    setIsPaused(false);
    setIsPlayingPreview(false);
    setPreviewCurrentTime(0);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Close audio context safely
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const togglePreview = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current);
      }
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlayingPreview(true);
      setPreviewCurrentTime(0);
      
      // Start preview timer
      previewTimerRef.current = setInterval(() => {
        if (audioRef.current) {
          const currentTime = audioRef.current.currentTime;
          setPreviewCurrentTime(currentTime);
          
          if (currentTime >= duration) {
            setIsPlayingPreview(false);
            setPreviewCurrentTime(0);
            if (previewTimerRef.current) {
              clearInterval(previewTimerRef.current);
            }
          }
        }
      }, 100);
    }
  };

  const handleSendAttempt = async () => {
    // Skip timer validation for inviter's first question
    if (!canSendNow()) {
      setShowThoughtfulResponseTimer(true);
      return;
    }
    
    if (audioBlob && canSendMessage) {
      try {
        await onSendVoiceMessage(audioBlob, duration);
        clearRecording();
      } catch (error) {
        console.error('Error sending voice message:', error);
        // Don't clear recording on error so user can retry
      }
    }
  };

  const handleThoughtfulResponseProceed = async () => {
    if (audioBlob && canSendMessage && canSendNow()) {
      try {
        await onSendVoiceMessage(audioBlob, duration);
        clearRecording();
      } catch (error) {
        console.error('Error sending voice message:', error);
        // Don't clear recording on error so user can retry
      }
    }
    setShowThoughtfulResponseTimer(false);
  };

  // Get volume color based on level
  const getVolumeColor = (volume: number) => {
    if (volume < 30) return '#10B981'; // green
    if (volume < 70) return '#F59E0B'; // yellow  
    return '#EF4444'; // red
  };

  // Get recording button color and animation
  const getRecordingButtonStyle = () => {
    if (!isRecording) {
      return "bg-gradient-to-r from-[#4FACFE] to-[#3B82F6] hover:from-[#4FACFE]/90 hover:to-[#3B82F6]/90 text-white";
    }
    
    if (isPaused) {
      return "bg-yellow-500 hover:bg-yellow-600 text-white";
    }
    
    const color = getVolumeColor(volumeLevel);
    return `text-white animate-pulse`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className={cn("bg-white border border-slate-200 rounded-lg shadow-sm px-2 py-0.5", className)}>
        <div className="flex items-center space-x-2">
        {/* Condensed Recording Interface */}
        <div className="flex items-center space-x-1">
          {/* Recording Status Indicator */}
          <div className="flex items-center space-x-1">
            {isRecording ? (
              <div className="flex items-center space-x-1">
                <div 
                  className="w-2 h-2 rounded-full animate-pulse transition-all duration-100"
                  style={{ backgroundColor: getVolumeColor(volumeLevel) }}
                />
                <span className="text-xs text-slate-600 font-mono">
                  {formatDuration(duration)}
                </span>
              </div>
            ) : hasRecording ? (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-slate-600">Ready</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Tap to record</span>
            )}
          </div>
        </div>

        {/* Main Recording Button - Compact */}
        <Button
          onClick={!isRecording ? startRecording : (isPaused ? resumeRecording : pauseRecording)}
          disabled={disabled}
          className={cn(
            "w-6 h-6 rounded-full transition-all duration-200 text-white flex-shrink-0",
            isRecording 
              ? (isPaused 
                  ? "bg-yellow-500 hover:bg-yellow-600" 
                  : "bg-red-500 hover:bg-red-600")
              : "bg-[#4FACFE] hover:bg-[#4FACFE]/90"
          )}
        >
          {isRecording ? (
            isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />
          ) : (
            <Mic className="w-3 h-3" />
          )}
        </Button>

        {/* Stop Button (when recording) */}
        {isRecording && (
          <Button
            onClick={stopRecording}
            className="w-6 h-6 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-all duration-200 flex-shrink-0"
          >
            <Square className="w-3 h-3" />
          </Button>
        )}

        {/* Clear Button */}
        {hasRecording && (
          <Button
            onClick={clearRecording}
            className="w-6 h-6 rounded-full bg-gray-400 hover:bg-gray-500 text-white transition-all duration-200 flex-shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}

        {/* Preview Playback - Compact */}
        {hasRecording && audioUrl && (
          <div className="flex items-center space-x-1 flex-1 min-w-0">
            <Button
              onClick={togglePreview}
              className="w-6 h-6 rounded-full bg-[#4FACFE] hover:bg-[#4FACFE]/90 text-white flex-shrink-0"
            >
              {isPlayingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <div className="flex-1 min-w-0 px-1">
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#4FACFE] transition-all duration-200"
                  style={{ width: `${duration > 0 ? (previewCurrentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-slate-600 font-mono flex-shrink-0">
              {formatDuration(duration)}
            </span>
            {/* Audio element for preview */}
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
          </div>
        )}

        {/* Send Button */}
        {hasRecording && (
          <div className="flex items-center space-x-1">
            <Button
              onClick={handleSendAttempt}
              disabled={!canSendMessage}
              className={cn(
                "w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 text-white transition-all duration-200 flex-shrink-0",
                !canSendMessage && "opacity-50 cursor-not-allowed"
              )}
            >
              <Send className="w-3 h-3" />
            </Button>
            {/* Timer countdown matching text input */}
            {hasStartedResponse && !canSendNow() && (
              <span className="text-xs text-slate-500 font-mono">
                {formatTime(getRemainingTime())}
              </span>
            )}
          </div>
        )}

        </div>
      </div>

      {/* Thoughtful Response Timer Popup */}
      <ThoughtfulResponsePopup
        isOpen={showThoughtfulResponseTimer}
        onClose={() => setShowThoughtfulResponseTimer(false)}
        onProceed={handleThoughtfulResponseProceed}
        remainingSeconds={getRemainingTime()}
      />
    </>
  );
}