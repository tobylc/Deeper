import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Send, Trash2, Square, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onSendVoiceMessage: (audioBlob: Blob, duration: number) => void;
  onRecordingStart?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceRecorder({ onSendVoiceMessage, onRecordingStart, disabled, className }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0); // 0-100
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
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

  // Volume monitoring function
  const monitorVolume = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedVolume = Math.min(100, (average / 255) * 100);
    
    setVolumeLevel(normalizedVolume);
    
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
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
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
      
      // Start volume monitoring
      monitorVolume();
      
      // Notify parent that recording started (for response timer)
      if (onRecordingStart) {
        onRecordingStart();
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
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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

  const sendVoiceMessage = () => {
    if (audioBlob) {
      onSendVoiceMessage(audioBlob, duration);
      clearRecording();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (isPaused) {
        resumeRecording();
      } else {
        pauseRecording();
      }
    } else {
      startRecording();
    }
  };

  return (
    <Card className={cn("p-4 bg-gradient-to-r from-slate-50 to-blue-50 border-[#4FACFE]/20", className)}>
      <div className="space-y-3">
        {/* Recording Controls */}
        <div className="flex flex-col items-center justify-center space-y-3">
          {/* Main Recording Button with Volume Visualization */}
          <div className="relative">
            <Button
              onClick={() => !isRecording ? startRecording() : toggleRecording()}
              disabled={disabled || hasRecording}
              className={cn(
                "w-16 h-16 rounded-full transition-all duration-300 shadow-lg relative",
                getRecordingButtonStyle()
              )}
              style={isRecording && !isPaused ? { backgroundColor: getVolumeColor(volumeLevel) } : {}}
            >
              {isRecording ? (
                isPaused ? <Play className="w-6 h-6" /> : <Mic className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
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

          {/* Pause and Stop Controls */}
          {isRecording && (
            <div className="flex items-center space-x-4">
              <Button
                onClick={pauseRecording}
                disabled={isPaused}
                size="sm"
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1 text-xs"
              >
                {isPaused ? "Paused" : "Pause"}
              </Button>
              
              <Button
                onClick={stopRecording}
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 text-xs"
              >
                <Square className="w-3 h-3 mr-1" />
                Stop
              </Button>
            </div>
          )}
          
          <div className="text-center">
            <div className="text-2xl font-mono text-slate-800 font-semibold">
              {formatDuration(duration)}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {isRecording ? (
                isPaused ? "Paused" : "Recording..."
              ) : hasRecording ? "Ready to send" : "Tap to record"}
            </div>
          </div>
        </div>

        {/* Audio Playback */}
        {hasRecording && audioUrl && (
          <div className="space-y-2">
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full h-8"
              preload="metadata"
            />
            
            {/* Action Buttons */}
            <div className="flex justify-center space-x-2">
              <Button
                onClick={clearRecording}
                size="sm"
                className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 hover:from-slate-200 hover:to-slate-300 border border-slate-300 shadow-sm text-xs px-3 py-1"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
              
              <Button
                onClick={sendVoiceMessage}
                disabled={disabled}
                className="bg-gradient-to-r from-[#4FACFE] to-[#3B82F6] text-white hover:from-[#4FACFE]/90 hover:to-[#3B82F6]/90 shadow-lg text-xs px-3 py-1"
              >
                <Send className="w-3 h-3 mr-1" />
                Send Voice Message
              </Button>
            </div>
          </div>
        )}

        {/* Recording Status Indicator */}
        {isRecording && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2">
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: getVolumeColor(volumeLevel) }}
              />
              <span className="text-xs font-medium" style={{ color: getVolumeColor(volumeLevel) }}>
                {isPaused ? "Paused" : "Recording in progress"}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Maximum recording time: 30 minutes
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}