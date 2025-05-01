'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ReadonlyURLSearchParams } from 'next/navigation';
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
  updateUrlWithChapterAndTimestamp: (timestamp: number) => void;
}

export function useChapterNavigation(
  translations: Translation[]
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
        setChapterIndex(cNum);
      }
    }
  }, [searchParams, chapterIndex]);

  // We've removed the WaveSurfer dependency from this hook
  // Any seeking/timestamp functionality will be managed in the ReadingRoom component
  // or in the useAudioPlayer hook itself

  // Update URL when chapter changes
  useEffect(() => {
    if (!translation) return;
    updateUrlWithChapterAndTimestamp(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, translation]);

  // Navigation functions
  function handleChapterClick(index: number) {
    if (index !== chapterIndex) {
      setChapterIndex(index);
    }
  }

  function goPrevChapter() {
    if (chapterIndex > 0) {
      setChapterIndex(chapterIndex - 1);
    }
  }

  function goNextChapter() {
    if (translation && chapterIndex < translation.chapters.length - 1) {
      setChapterIndex(chapterIndex + 1);
    }
  }

  // We use a debounce approach to avoid excessive URL updates
  const lastUpdateTimestamp = useRef<number>(0);

  function updateUrlWithChapterAndTimestamp(ts: number) {
    if (!slug) return;

    // Skip frequent updates - only update URL every 5 seconds or on explicit events
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimestamp.current;
    if (timeSinceLastUpdate < 5000 && ts > 0 && ts < totalChapters) {
      return;
    }

    lastUpdateTimestamp.current = now;

    const c = chapterIndex;
    const t = Math.floor(ts);
    let newUrl = `/reading-room/${slug}?c=${c}`;
    if (t > 0) {
      newUrl += `&t=${t}`;
    }

    // Use replace to avoid creating new history entries
    router.replace(newUrl);
  }

  return [
    { chapterIndex, slug: slug as string, translation, chapterData, totalChapters },
    { handleChapterClick, goPrevChapter, goNextChapter, updateUrlWithChapterAndTimestamp },
  ];
}
