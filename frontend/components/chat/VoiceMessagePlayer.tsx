"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface VoiceMessagePlayerProps {
  url: string;
  isOwnMessage: boolean;
  metadataDuration?: number; // Optional duration passed from upload metadata
}

export default function VoiceMessagePlayer({ url, isOwnMessage, metadataDuration }: VoiceMessagePlayerProps) {
  const { settings, updateSetting } = useSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(metadataDuration || 0);
  const [speed, setSpeed] = useState(settings.voiceMessagePlaybackSpeed);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);

  // Sync speed with global settings when it changes from outside
  useEffect(() => {
    setSpeed(settings.voiceMessagePlaybackSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = settings.voiceMessagePlaybackSpeed;
    }
  }, [settings.voiceMessagePlaybackSpeed]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    
    // Chrome sometimes reports Infinity for webm audio duration.
    // If we have metadataDuration, we trust it. Otherwise, fallback.
    if (audioRef.current.duration && audioRef.current.duration !== Infinity) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    // If autoPlayVoiceMessages is true, we could trigger an event here, but for now we just reset.
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const cycleSpeed = () => {
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    updateSetting("voiceMessagePlaybackSpeed", nextSpeed);
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return "0:00";
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // For smoother progress bar updating:
  useEffect(() => {
    const updateProgress = () => {
      if (audioRef.current && isPlaying) {
        setCurrentTime(audioRef.current.currentTime);
      }
      rafRef.current = requestAnimationFrame(updateProgress);
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(updateProgress);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const displayDuration = duration > 0 ? duration : (metadataDuration || 0);

  return (
    <div className={`flex items-center gap-3 w-[280px] max-w-[80vw] mt-1 ${isOwnMessage ? "text-white" : "text-signal-primary"}`}>
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
        className="hidden"
      />
      
      <button 
        onClick={togglePlay}
        className={`w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isOwnMessage 
            ? "bg-white/20 hover:bg-white/30 text-white" 
            : "bg-signal-blue text-white hover:bg-signal-blue-hover"
        }`}
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col justify-center mt-1">
        <div className="relative h-6 flex items-center group">
          <input
            type="range"
            min={0}
            max={displayDuration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          {/* Custom track */}
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isOwnMessage ? "bg-white/30" : "bg-signal-border"}`}>
            <div 
              className={`h-full ${isOwnMessage ? "bg-white" : "bg-signal-blue"}`}
              style={{ width: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%` }}
            />
          </div>
          {/* Custom thumb indicator that shows on hover or while dragging */}
          <div 
            className={`absolute h-3 w-3 rounded-full shadow-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ${
              isOwnMessage ? "bg-white" : "bg-signal-blue"
            }`}
            style={{ 
              left: `calc(${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}% - 6px)` 
            }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-0.5">
          <span className={`text-[11.5px] tabular-nums font-medium ${isOwnMessage ? "text-white/80" : "text-signal-secondary"}`}>
            {isPlaying ? formatTime(currentTime) : formatTime(displayDuration)}
          </span>
          <button 
            onClick={cycleSpeed}
            className={`text-[11px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
              isOwnMessage ? "bg-white/20 hover:bg-white/30 text-white" : "bg-signal-hover hover:bg-signal-active text-signal-secondary"
            }`}
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
}
