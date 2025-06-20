import { useState, useRef } from "react";
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
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
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
          {/* Play/Pause Button */}
          <Button
            onClick={togglePlayback}
            size="sm"
            className={cn(
              "w-10 h-10 rounded-full transition-colors",
              isCurrentUser
                ? "bg-white/20 hover:bg-white/30 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white"
            )}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>

          {/* Waveform / Progress Bar */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2 text-xs">
              <Volume2 className="w-3 h-3" />
              <span>Voice Message</span>
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

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={message.audioFileUrl || ''}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          preload="metadata"
        />
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