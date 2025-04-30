'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ReadonlyURLSearchParams } from 'next/navigation';
import { Translation } from '@/utils/types';
import WaveSurfer from 'wavesurfer.js';

interface ChapterNavigationState {
  chapterIndex: number;
  slug: string;
  translation: Translation | undefined;
  chapterData: Translation['chapters'][0] | undefined;
  totalChapters: number;
}

interface ChapterNavigationActions {
  handleChapterClick: (index: number) => void;
  goPrevChapter: () => void;
  goNextChapter: () => void;
  updateUrlWithChapterAndTimestamp: (timestamp: number) => void;
}

export function useChapterNavigation(
  translations: Translation[],
  waveSurfer: WaveSurfer | null
): [ChapterNavigationState, ChapterNavigationActions] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = useParams();
  
  const [chapterIndex, setChapterIndex] = useState(0);

  const translation = translations.find((t) => t.slug === slug);
  const chapterData = translation?.chapters[chapterIndex];
  const totalChapters = translation?.chapters.length || 0;

  // Parse "c" parameter from URL for chapter index
  useEffect(() => {
    const cParam = searchParams.get('c');
    if (cParam) {
      const cNum = parseInt(cParam, 10);
      // Only update if valid and different from current
      if (!isNaN(cNum) && cNum !== chapterIndex) {
        // Pause any audio playback before changing
        if (waveSurfer && waveSurfer.isPlaying()) {
          waveSurfer.pause();
        }
        setChapterIndex(cNum);
      }
    }
  }, [searchParams, chapterIndex, waveSurfer]);

  // Handle t parameter for timestamp when WaveSurfer is ready
  useEffect(() => {
    if (!waveSurfer) return;

    // Create AbortController for cleanup
    const abortController = new AbortController();
    const signal = abortController.signal;

    function handleReady() {
      if (!waveSurfer || signal.aborted) return;

      try {
        const tParam = searchParams.get('t');
        const duration = waveSurfer.getDuration();
        if (tParam && duration && !isNaN(duration) && duration > 0) {
          const numericT = Number(tParam);
          if (numericT > 0) {
            waveSurfer.seekTo(numericT / duration);
          }
        }
      } catch (error) {
        console.error('Error seeking to timestamp:', error);
      }
    }

    waveSurfer.on('ready', handleReady);

    return () => {
      abortController.abort();
      try {
        if (waveSurfer && typeof waveSurfer.un === 'function') {
          waveSurfer.un('ready', handleReady);
        }
      } catch (error) {
        console.error('Error removing ready event handler:', error);
      }
    };
  }, [waveSurfer, searchParams]);

  // Update URL when chapter changes
  useEffect(() => {
    if (!translation) return;
    updateUrlWithChapterAndTimestamp(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, translation]);

  // Navigation functions
  function handleChapterClick(index: number) {
    if (index !== chapterIndex) {
      if (waveSurfer && waveSurfer.isPlaying()) {
        waveSurfer.pause();
      }
      setChapterIndex(index);
    }
  }

  function goPrevChapter() {
    if (chapterIndex > 0) {
      if (waveSurfer && waveSurfer.isPlaying()) {
        waveSurfer.pause();
      }
      setChapterIndex(chapterIndex - 1);
    }
  }

  function goNextChapter() {
    if (translation && chapterIndex < translation.chapters.length - 1) {
      if (waveSurfer && waveSurfer.isPlaying()) {
        waveSurfer.pause();
      }
      setChapterIndex(chapterIndex + 1);
    }
  }

  function updateUrlWithChapterAndTimestamp(ts: number) {
    if (!slug) return;
    
    const c = chapterIndex;
    const t = Math.floor(ts);
    let newUrl = `/reading-room/${slug}?c=${c}`;
    if (t > 0) {
      newUrl += `&t=${t}`;
    }
    router.replace(newUrl);
  }

  return [
    { chapterIndex, slug: slug as string, translation, chapterData, totalChapters },
    { handleChapterClick, goPrevChapter, goNextChapter, updateUrlWithChapterAndTimestamp }
  ];
}