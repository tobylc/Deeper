import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onSendVoiceMessage: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceRecorder({ onSendVoiceMessage, disabled, className }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
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
        
        // Stop all tracks to free up microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      
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
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const clearRecording = () => {
    setHasRecording(false);
    setAudioBlob(null);
    setDuration(0);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
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
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Card className={cn("p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200", className)}>
      <div className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={toggleRecording}
            disabled={disabled || hasRecording}
            className={cn(
              "w-16 h-16 rounded-full transition-all duration-200",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                : "bg-amber-500 hover:bg-amber-600"
            )}
          >
            {isRecording ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </Button>
          
          <div className="text-center">
            <div className="text-2xl font-mono text-slate-700">
              {formatDuration(duration)}
            </div>
            <div className="text-sm text-slate-500">
              {isRecording ? "Recording..." : hasRecording ? "Ready to send" : "Tap to record"}
            </div>
          </div>
        </div>

        {/* Audio Playback */}
        {hasRecording && audioUrl && (
          <div className="space-y-3">
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
              preload="metadata"
            />
            
            {/* Action Buttons */}
            <div className="flex justify-center space-x-3">
              <Button
                onClick={clearRecording}
                variant="outline"
                size="sm"
                className="text-slate-600 border-slate-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              
              <Button
                onClick={sendVoiceMessage}
                disabled={disabled}
                className="btn-ocean"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Voice Message
              </Button>
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-red-600">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording in progress</span>
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