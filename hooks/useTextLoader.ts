'use client';

import { useEffect, useState } from 'react';

import { fetchTextWithFallback } from '@/utils';

interface TextLoaderState {
  rawText: string;
  isTextLoading: boolean;
}

export function useTextLoader(textPath: string | undefined): TextLoaderState {
  const [rawText, setRawText] = useState('');
  const [isTextLoading, setIsTextLoading] = useState(false);

  useEffect(() => {
    if (!textPath) {
      setRawText('');
      return;
    }

    // Create an AbortController for cleanup
    const abortController = new AbortController();
    const signal = abortController.signal;

    // Load text with automatic fallback
    setIsTextLoading(true);
    fetchTextWithFallback(textPath)
      .then((txt) => {
        if (signal.aborted) return; // Don't update state if aborted
        setRawText(txt);
      })
      .catch((error) => {
        if (signal.aborted) return; // Don't update state if aborted
        console.error('Failed to load text:', error);
        setRawText('Error loading text. Please try again later.');
      })
      .finally(() => {
        if (signal.aborted) return; // Don't update state if aborted
        setIsTextLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, [textPath]);

  return { rawText, isTextLoading };
}
