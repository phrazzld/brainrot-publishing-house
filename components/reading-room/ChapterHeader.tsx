'use client';

import Link from 'next/link';

import { Translation } from '@/utils/types';

interface ChapterHeaderProps {
  translation: Translation;
  chapterIndex: number;
  totalChapters: number;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onOpenShareModal: () => void;
}

/**
 * Header component for displaying chapter title and navigation controls.
 * @param props - The component props.
 */
export default function ChapterHeader(props: ChapterHeaderProps) {
  const {
    translation,
    chapterIndex,
    totalChapters,
    onPrevChapter,
    onNextChapter,
    onOpenShareModal,
  } = props;
  return (
    <header className="px-4 py-3 flex items-center justify-between bg-black/40 backdrop-blur-md">
      <div>
        <h1 className="text-2xl font-display">{translation.title}</h1>
        <p className="text-sm text-lavender">{translation.chapters[chapterIndex].title}</p>
      </div>
      <div className="flex items-center gap-2">
        {translation.purchaseUrl && (
          <Link
            href={translation.purchaseUrl}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            buy now
          </Link>
        )}
        <button
          onClick={onPrevChapter}
          className={`btn btn-secondary ${
            chapterIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={chapterIndex === 0}
        >
          ← prev
        </button>
        <button
          onClick={onNextChapter}
          className={`btn btn-secondary ${
            chapterIndex === totalChapters - 1 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={chapterIndex === totalChapters - 1}
        >
          next →
        </button>
        <button onClick={onOpenShareModal} className="btn btn-secondary">
          share
        </button>
      </div>
    </header>
  );
}
