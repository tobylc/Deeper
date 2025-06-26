import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  nextMessageType?: 'question' | 'response';
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

  const canSendNow = () => {
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
        
        // Close audio context
        if (audioContextRef.current) {
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
      
      // Start thoughtful response timer if not already started
      if (!hasStartedResponse && onTimerStart) {
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
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check your permissions.');
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

  const handleSendAttempt = () => {
    // Skip timer validation for empty conversations (inviter's first question)
    if (!canSendNow() && messages.length > 0) {
      setShowThoughtfulResponseTimer(true);
      return;
    }
    
    if (audioBlob && canSendMessage) {
      onSendVoiceMessage(audioBlob, duration);
      clearRecording();
    }
  };

  const handleThoughtfulResponseProceed = () => {
    if (audioBlob && canSendMessage && canSendNow()) {
      onSendVoiceMessage(audioBlob, duration);
      clearRecording();
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
    <Card className={cn("p-3 bg-gradient-to-r from-slate-50 to-blue-50 border-[#4FACFE]/20", className)}>
      <div className="space-y-3">
        {/* Recording Controls with Enhanced Layout */}
        <div className="flex items-center justify-center space-x-3">
          {/* Pause Button (Left) */}
          {isRecording && (
            <div className="flex flex-col items-center space-y-1">
              <Button
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="w-10 h-10 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white transition-all duration-200"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <span className="text-xs text-slate-600 font-medium">
                {isPaused ? "Resume" : "Pause"}
              </span>
            </div>
          )}

          {/* Main Recording Button with Volume Visualization (Center) */}
          <div className="relative flex flex-col items-center space-y-1">
            <div className="relative">
              <Button
                onClick={!isRecording ? startRecording : undefined}
                disabled={disabled || hasRecording || isRecording}
                className={cn(
                  "w-14 h-14 rounded-full transition-all duration-300 shadow-lg relative",
                  getRecordingButtonStyle()
                )}
                style={isRecording && !isPaused ? { backgroundColor: getVolumeColor(volumeLevel) } : {}}
              >
                <Mic className="w-5 h-5" />
              </Button>
              
              {/* Volume Level Ring */}
              {isRecording && !isPaused && (
                <div 
                  className="absolute inset-0 rounded-full border-4 transition-all duration-100"
                  style={{
                    borderColor: getVolumeColor(volumeLevel),
                    borderWidth: `${Math.max(2, volumeLevel * 0.1)}px`,
                    transform: `scale(${1 + volumeLevel * 0.01})`
                  }}
                />
              )}
            </div>
            <span className="text-xs text-slate-600 font-medium">Record</span>
          </div>

          {/* Stop Button (Right) */}
          {isRecording && (
            <div className="flex flex-col items-center space-y-1">
              <Button
                onClick={stopRecording}
                className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
              >
                <Square className="w-4 h-4" />
              </Button>
              <span className="text-xs text-slate-600 font-medium">Stop</span>
            </div>
          )}
        </div>

        {/* Recording Status with Timer */}
        <div className="text-center space-y-1">
          <div className="text-lg font-mono text-slate-800 font-semibold">
            {formatDuration(duration)}
          </div>
          <div className="text-xs text-slate-600">
            {isRecording ? (
              isPaused ? "Paused" : "Recording..."
            ) : hasRecording ? "Ready to send" : "Tap to record"}
          </div>
          

        </div>

        {/* Preview Playback Interface */}
        {hasRecording && audioUrl && (
          <div className="space-y-2 p-2 bg-white/50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Preview Recording</span>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={togglePreview}
                  size="sm"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1"
                >
                  {isPlayingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            
            {/* Preview Progress Bar */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500">{formatTime(previewCurrentTime)}</span>
              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#4FACFE] transition-all duration-100"
                  style={{ width: `${(previewCurrentTime / duration) * 100}%` }}
                />
              </div>
              <span className="text-slate-500">{formatDuration(duration)}</span>
            </div>
            
            {/* Action Buttons with Timer */}
            <div className="flex items-center justify-between">
              <Button
                onClick={clearRecording}
                size="sm"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
              
              <div className="flex items-center space-x-2">
                {/* 10-Minute Countdown Timer */}
                {messages.length > 0 && hasStartedResponse && !canSendNow() && (
                  <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <span>{formatTime(getRemainingTime())}</span>
                  </div>
                )}
                
                <Button
                  onClick={handleSendAttempt}
                  disabled={!canSendMessage}
                  className={cn(
                    "px-3 py-1 transition-all duration-200",
                    (() => {
                      // Check if this is the inviter's first question - allow immediate sending
                      const isInviterFirstQuestion = messages.length === 0 && 
                                                     connection?.inviterEmail === currentUserEmail &&
                                                     nextMessageType === 'question';
                      
                      return (canSendNow() || isInviterFirstQuestion)
                        ? "bg-gradient-to-r from-[#4FACFE] to-[#3B82F6] text-white hover:from-[#4FACFE]/90 hover:to-[#3B82F6]/90 shadow-lg" 
                        : "bg-slate-300 text-slate-500 cursor-pointer hover:bg-slate-400";
                    })()
                  )}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Send
                </Button>
              </div>
            </div>
            
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
          </div>
        )}

        {/* Thoughtful Response Timer Popup */}
        <ThoughtfulResponsePopup
          isOpen={showThoughtfulResponseTimer}
          onClose={() => setShowThoughtfulResponseTimer(false)}
          onProceed={handleThoughtfulResponseProceed}
          remainingSeconds={getRemainingTime()}
        />
      </div>
    </Card>
  );
}