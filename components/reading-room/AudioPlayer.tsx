'use client';

import { useRef } from 'react';

interface AudioPlayerProps {
  isPlaying: boolean;
  isAudioLoading: boolean;
  currentTime: number;
  totalTime: number;
  onTogglePlayPause: () => void;
  onOpenDownloadModal: () => void;
  waveformRef: React.RefObject<HTMLDivElement>;
  formatTime: (sec: number) => string;
}

export default function AudioPlayer({
  isPlaying,
  isAudioLoading,
  currentTime,
  totalTime,
  onTogglePlayPause,
  onOpenDownloadModal,
  waveformRef,
  formatTime,
}: AudioPlayerProps) {
  if (isAudioLoading) {
    return (
      <div className="p-4 bg-[#2c2c3a] relative">
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
          <div className="text-white text-sm font-body animate-pulse">
            loading up the vibes...
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-[48px]" ref={waveformRef} />
          <button onClick={onTogglePlayPause} className="btn btn-primary" disabled>
            play
          </button>
          <div className="text-xs text-peachy whitespace-nowrap">
            0:00 / 0:00
          </div>
          <button onClick={onOpenDownloadModal} className="btn btn-secondary" disabled>
            download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#2c2c3a] relative">
      <div className="flex items-center gap-4">
        {/* Use a stable ref for the waveform container */}
        <div className="flex-1 h-[48px]" ref={waveformRef} />
        <button onClick={onTogglePlayPause} className="btn btn-primary">
          {isPlaying ? 'pause' : 'play'}
        </button>
        <div className="text-xs text-peachy whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(totalTime)}
        </div>
        <button onClick={onOpenDownloadModal} className="btn btn-secondary">
          download
        </button>
      </div>
    </div>
  );
}