'use client';

import { useState } from 'react';

interface ShareModalState {
  isShareOpen: boolean;
  shareFeedback: string;
  includeChapter: boolean;
  includeTimestamp: boolean;
}

interface ShareModalActions {
  openShareModal: () => void;
  closeShareModal: () => void;
  setIncludeChapter: (value: boolean) => void;
  setIncludeTimestamp: (value: boolean) => void;
  getShareUrl: () => string;
  copyShareUrl: () => Promise<void>;
}

export function useShareModal(
  slug: string,
  chapterIndex: number,
  currentTime: number
): [ShareModalState, ShareModalActions] {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [includeChapter, setIncludeChapter] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);

  function openShareModal() {
    setIsShareOpen(true);
    setShareFeedback('');
  }

  function closeShareModal() {
    setIsShareOpen(false);
  }

  function getShareUrl() {
    if (typeof window === 'undefined') return '';

    const baseUrl = window.location.origin;
    let url = `${baseUrl}/reading-room/${slug}`;

    if (includeChapter) {
      url += `?c=${chapterIndex}`;
    }

    const t = Math.floor(currentTime);
    if (includeTimestamp && t > 0) {
      url += includeChapter ? `&t=${t}` : `?t=${t}`;
    }

    return url;
  }

  async function copyShareUrl() {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback('link is in your clipboard, glhf!');
    } catch (err) {
      console.error(err);
      setShareFeedback("couldn't copy link sry man");
    }
  }

  return [
    { isShareOpen, shareFeedback, includeChapter, includeTimestamp },
    {
      openShareModal,
      closeShareModal,
      setIncludeChapter,
      setIncludeTimestamp,
      getShareUrl,
      copyShareUrl,
    },
  ];
}
