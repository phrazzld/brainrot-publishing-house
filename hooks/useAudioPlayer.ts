'use client';

import { RefObject, useCallback, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioPlayerState {
  waveSurfer: WaveSurfer | null;
  isPlaying: boolean;
  isAudioLoading: boolean;
  currentTime: number;
  totalTime: number;
}

interface AudioPlayerActions {
  togglePlayPause: () => void;
  formatTime: (sec: number) => string;
}

export function useAudioPlayer(
  waveformRef: RefObject<HTMLDivElement>,
  audioSrc: string | undefined,
  onTimeUpdate?: (time: number) => void
): [AudioPlayerState, AudioPlayerActions] {
  const [waveSurfer, setWaveSurfer] = useState<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  // Initialize or update WaveSurfer when audioSrc changes
  useEffect(() => {
    if (!audioSrc) {
      // Clean up any existing wavesurfer
      if (waveSurfer) {
        try {
          if (waveSurfer.isPlaying()) {
            waveSurfer.pause();
          }
          waveSurfer.destroy();
          setWaveSurfer(null);
          setIsPlaying(false);
          setCurrentTime(0);
          setTotalTime(0);
          setIsAudioLoading(false);
        } catch (error) {
          console.error('Error destroying existing WaveSurfer:', error);
        }
      }
      return;
    }

    // Create an AbortController for cleanup
    const abortController = new AbortController();
    const signal = abortController.signal;

    // If we already have an instance, destroy it first
    if (waveSurfer) {
      try {
        if (waveSurfer.isPlaying()) {
          waveSurfer.pause();
        }
        waveSurfer.destroy();
        setWaveSurfer(null);
      } catch (error) {
        console.error('Error destroying previous WaveSurfer instance:', error);
      }
    }

    if (signal.aborted) return;

    setIsAudioLoading(true);

    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      if (signal.aborted) return;

      try {
        if (!waveformRef.current) {
          throw new Error('Waveform container ref not available');
        }

        waveformRef.current.innerHTML = '';

        // Create WaveSurfer instance
        const ws = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: '#666',
          progressColor: '#e0afff',
          cursorColor: '#ffdaab',
          height: 48,
        });

        // Event handlers
        const setupEventHandlers = () => {
          // Error handler
          ws.on('error', (error) => {
            if (!signal.aborted) {
              console.error('WaveSurfer error:', error);
              setIsAudioLoading(false);
            }
          });

          // Ready handler
          ws.on('ready', () => {
            if (!signal.aborted) {
              setIsPlaying(false);
              setTotalTime(ws.getDuration());
              setCurrentTime(0);
              setIsAudioLoading(false);
            }
          });

          // Process handler (time update)
          ws.on('audioprocess', () => {
            if (!signal.aborted) {
              const time = ws.getCurrentTime();
              setCurrentTime(time);
              if (onTimeUpdate) onTimeUpdate(time);
            }
          });

          // Play handler
          ws.on('play', () => {
            if (!signal.aborted) {
              setIsPlaying(true);
            }
          });

          // Pause handler
          ws.on('pause', () => {
            if (!signal.aborted) {
              setIsPlaying(false);
              setCurrentTime(ws.getCurrentTime());
              if (onTimeUpdate) onTimeUpdate(ws.getCurrentTime());
            }
          });

          // Finish handler
          ws.on('finish', () => {
            if (!signal.aborted) {
              setIsPlaying(false);
              setCurrentTime(0);
              if (onTimeUpdate) onTimeUpdate(0);
            }
          });
        };

        setupEventHandlers();

        // Correct URL if needed (for certain storage providers)
        let correctedUrl = audioSrc;
        if (audioSrc && audioSrc.includes('https://public.blob.vercel-storage.com')) {
          const baseUrl = 'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com';
          const urlObj = new URL(audioSrc);
          const pathPart = urlObj.pathname;
          correctedUrl = `${baseUrl}${pathPart}`;
        }

        if (!signal.aborted) {
          try {
            ws.load(correctedUrl);
            setWaveSurfer(ws);
          } catch (loadError) {
            if (!signal.aborted) {
              console.error('Error loading audio:', loadError);
              setIsAudioLoading(false);
            }
          }
        } else {
          cleanupWaveSurfer(ws);
        }
      } catch (error) {
        if (!signal.aborted) {
          console.error('Error setting up WaveSurfer:', error);
          setIsAudioLoading(false);
        }
      }
    }, 50);

    // Helper function to clean up WaveSurfer instance
    function cleanupWaveSurfer(ws: WaveSurfer) {
      try {
        ws.un('ready');
        ws.un('audioprocess');
        ws.un('play');
        ws.un('pause');
        ws.un('finish');
        ws.un('error');
        ws.destroy();
      } catch (error) {
        console.error('Error during WaveSurfer cleanup:', error);
      }
    }

    // Return cleanup function
    return () => {
      abortController.abort();
      if (waveSurfer) {
        try {
          if (waveSurfer.isPlaying()) {
            waveSurfer.pause();
          }
          cleanupWaveSurfer(waveSurfer);
        } catch (error) {
          console.error('Error during WaveSurfer cleanup:', error);
        }
      }
    };
  }, [audioSrc, waveformRef, onTimeUpdate]);

  // Format time helper
  const formatTime = useCallback((sec: number): string => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
  }, []);

  // Play/pause toggle
  const togglePlayPause = useCallback(() => {
    waveSurfer?.playPause();
  }, [waveSurfer]);

  return [
    { waveSurfer, isPlaying, isAudioLoading, currentTime, totalTime },
    { togglePlayPause, formatTime }
  ];
}