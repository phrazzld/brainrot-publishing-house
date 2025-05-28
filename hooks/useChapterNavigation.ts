'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Translation } from '@/utils/types';

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
  updateTimestamp: (timestamp: number) => void;
}

export function useChapterNavigation(
  translations: Translation[],
): [ChapterNavigationState, ChapterNavigationActions] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = useParams();

  // Track the last timestamp update time for throttling
  const lastTimestampUpdate = useRef<number>(0);
  // Track if we're currently handling a navigation action to avoid recursive effects
  const isNavigating = useRef<boolean>(false);

  const [chapterIndex, setChapterIndex] = useState(0);

  const translation = translations.find((t) => t.slug === slug);
  const chapterData = translation?.chapters[chapterIndex];
  const totalChapters = translation?.chapters.length || 0;

  // Initialization from URL parameters
  useEffect(() => {
    // Skip if we're in the middle of a navigation action
    if (isNavigating.current) return;

    const cParam = searchParams.get('c');
    if (cParam) {
      const cNum = parseInt(cParam, 10);
      if (!isNaN(cNum) && cNum !== chapterIndex && cNum >= 0 && cNum < totalChapters) {
        // Initialize chapter index from URL
        setChapterIndex(cNum);
      }
    }
  }, [searchParams, chapterIndex, totalChapters]);

  // Simple function to update the URL with chapter and timestamp
  // NEVER throttle chapter changes, only timestamp updates
  function updateUrl(index: number, timestamp: number = 0) {
    if (!slug) return;

    let newUrl = `/reading-room/${slug}?c=${index}`;
    if (timestamp > 0) {
      newUrl += `&t=${Math.floor(timestamp)}`;
    }

    // Update the URL without creating a history entry
    router.replace(newUrl);
  }

  // Dedicated functions for navigation - always update immediately
  function handleChapterClick(index: number) {
    if (index !== chapterIndex && index >= 0 && index < totalChapters) {
      // Set navigating flag to prevent URL-triggered state updates
      isNavigating.current = true;

      // Update state first
      setChapterIndex(index);

      // Update URL and reset timestamp
      updateUrl(index, 0);

      // Reset navigation flag after a short delay
      setTimeout(() => {
        isNavigating.current = false;
      }, 50);
    }
  }

  function goPrevChapter() {
    if (chapterIndex > 0) {
      const newIndex = chapterIndex - 1;

      // Set navigating flag to prevent URL-triggered state updates
      isNavigating.current = true;

      // Update state first
      setChapterIndex(newIndex);

      // Update URL and reset timestamp
      updateUrl(newIndex, 0);

      // Reset navigation flag after a short delay
      setTimeout(() => {
        isNavigating.current = false;
      }, 50);
    }
  }

  function goNextChapter() {
    if (translation && chapterIndex < translation.chapters.length - 1) {
      const newIndex = chapterIndex + 1;

      // Set navigating flag to prevent URL-triggered state updates
      isNavigating.current = true;

      // Update state first
      setChapterIndex(newIndex);

      // Update URL and reset timestamp
      updateUrl(newIndex, 0);

      // Reset navigation flag after a short delay
      setTimeout(() => {
        isNavigating.current = false;
      }, 50);
    }
  }

  // Separate function for timestamp updates - throttled
  function updateTimestamp(timestamp: number) {
    if (!slug) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastTimestampUpdate.current;

    // Only throttle timestamp updates, never throttle chapter changes
    // Skip small timestamp changes during playback
    if (timeSinceLastUpdate < 5000 && timestamp > 0) {
      return;
    }

    // Update the URL with the current chapter and timestamp
    updateUrl(chapterIndex, timestamp);
    lastTimestampUpdate.current = now;
  }

  return [
    { chapterIndex, slug: slug as string, translation, chapterData, totalChapters },
    { handleChapterClick, goPrevChapter, goNextChapter, updateTimestamp },
  ];
}
