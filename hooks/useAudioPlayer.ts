'use client';

import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { useWavesurfer } from '@wavesurfer/react';

interface AudioPlayerState {
  isPlaying: boolean;
  isAudioLoading: boolean;
  currentTime: number;
  totalTime: number;
}

interface AudioPlayerActions {
  togglePlayPause: () => void;
  formatTime: (sec: number) => string;
}

/**
 * Custom hook for audio playback and waveform visualization
 * Uses @wavesurfer/react to properly handle React lifecycle
 */
export function useAudioPlayer(
  waveformRef: RefObject<HTMLDivElement | null>,
  audioSrc: string | null | undefined,
  onTimeUpdate?: (time: number) => void,
): [AudioPlayerState, AudioPlayerActions] {
  // State for UI
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  // Ref to track mounted state
  const isMounted = useRef(true);
  const currentAudioSrc = useRef<string | null | undefined>(undefined);

  // Memoize the render function to prevent recreation on every render
  // This draws the waveform visualization with bars
  const renderFunction = useCallback(
    (peaks: (Float32Array | number[])[], ctx: CanvasRenderingContext2D) => {
      if (!ctx || !peaks.length) return;

      // Get the first channel's data (mono or left channel)
      const channelData = peaks[0];
      if (!channelData || !channelData.length) return;

      const { width, height } = ctx.canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#666';

      const barWidth = 2;
      const barGap = 1;
      const barCount = Math.floor(width / (barWidth + barGap));
      const step = Math.floor(channelData.length / barCount) || 1;

      for (let i = 0; i < barCount; i++) {
        const peakIndex = Math.floor(i * step);
        const peak = channelData[peakIndex] || 0;
        const barHeight = Math.max(1, Math.abs(peak) * height);
        ctx.fillRect(i * (barWidth + barGap), (height - barHeight) / 2, barWidth, barHeight);
      }
    },
    [],
  );

  // Use the React wavesurfer hook with memoized config
  const { wavesurfer } = useWavesurfer({
    container: waveformRef,
    height: 48,
    waveColor: '#8d8d9d',
    progressColor: '#e0afff',
    cursorColor: '#ffdaab',
    normalize: true,
    barWidth: 2,
    barGap: 1,
    minPxPerSec: 50,
    fillParent: true,
    interact: true,
    url: audioSrc || undefined, // Pass URL directly
    renderFunction,
  });

  // Helper to safely set state only when mounted
  const safeSetState = useCallback(
    <T>(setter: React.Dispatch<React.SetStateAction<T>>, value: T | ((prev: T) => T)) => {
      if (isMounted.current) {
        setter(value);
      }
    },
    [],
  );

  // Format time helper function
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' + secs : secs}`;
  }, []);

  // Toggle play/pause - safe to external calls
  const togglePlayPause = useCallback(() => {
    if (wavesurfer) {
      try {
        wavesurfer.playPause();
      } catch {
        // Silently handle playback toggle errors
        // No user-visible action needed as UI state won't change
      }
    }
  }, [wavesurfer]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      currentAudioSrc.current = undefined;
    };
  }, []);

  // Set up events when wavesurfer is ready
  useEffect(() => {
    if (!wavesurfer) {
      return;
    }

    // Set up event handlers
    const handleReady = () => {
      if (isMounted.current) {
        const duration = wavesurfer.getDuration() || 0;
        setTotalTime(duration);
        setCurrentTime(0);
        setIsAudioLoading(false);
      }
    };

    const handleAudioprocess = () => {
      if (isMounted.current) {
        const time = wavesurfer.getCurrentTime() || 0;
        setCurrentTime(time);
        // Don't call onTimeUpdate on every audioprocess event
        // This causes excessive URL updates and network requests
      }
    };

    const handlePlay = () => {
      if (isMounted.current) {
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      if (isMounted.current) {
        setIsPlaying(false);
        const time = wavesurfer.getCurrentTime() || 0;
        setCurrentTime(time);
        // Only update URL timestamp when pausing to avoid excessive updates
        if (onTimeUpdate) onTimeUpdate(time);
      }
    };

    const handleFinish = () => {
      if (isMounted.current) {
        setIsPlaying(false);
        setCurrentTime(0);
        if (onTimeUpdate) onTimeUpdate(0);
      }
    };

    const handleError = (_error: Error) => {
      // Handle wavesurfer errors by updating loading state
      if (isMounted.current) {
        setIsAudioLoading(false);
      }
    };

    // Add event listeners
    wavesurfer.on('ready', handleReady);
    wavesurfer.on('audioprocess', handleAudioprocess);
    wavesurfer.on('play', handlePlay);
    wavesurfer.on('pause', handlePause);
    wavesurfer.on('finish', handleFinish);
    wavesurfer.on('error', handleError);

    // Cleanup event listeners
    return () => {
      wavesurfer.un('ready', handleReady);
      wavesurfer.un('audioprocess', handleAudioprocess);
      wavesurfer.un('play', handlePlay);
      wavesurfer.un('pause', handlePause);
      wavesurfer.un('finish', handleFinish);
      wavesurfer.un('error', handleError);
    };
  }, [wavesurfer, onTimeUpdate, safeSetState]);

  // Handle audioSrc changes
  useEffect(() => {
    // Skip if not mounted or wavesurfer not initialized
    if (!isMounted.current || !wavesurfer) {
      return;
    }

    // Prevent reloading the same source
    if (currentAudioSrc.current === audioSrc) {
      return;
    }

    // Reset state at the beginning of each source change
    setIsPlaying(false);
    setCurrentTime(0);

    // Track current audio source
    currentAudioSrc.current = audioSrc;

    // Early return if no audio source
    if (!audioSrc) {
      setIsAudioLoading(false);
      setTotalTime(0);
      return;
    }

    // Set loading state
    setIsAudioLoading(true);

    // Load the audio with a small delay to ensure the waveform is properly initialized
    const loadTimer = setTimeout(() => {
      try {
        if (wavesurfer && audioSrc && isMounted.current) {
          // Audio source loading
          wavesurfer.load(audioSrc);
        }
      } catch {
        // Handle audio loading error
        if (isMounted.current) {
          setIsAudioLoading(false);
        }
      }
    }, 100);

    return () => {
      clearTimeout(loadTimer);
    };
  }, [audioSrc, wavesurfer]);

  // Return state and actions
  return [
    { isPlaying, isAudioLoading, currentTime, totalTime },
    { togglePlayPause, formatTime },
  ];
}
