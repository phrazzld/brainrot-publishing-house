'use client';

import { Translation } from '@/utils/types';

interface ChapterSidebarProps {
  translation: Translation;
  chapterIndex: number;
  onChapterClick: (index: number) => void;
}

export default function ChapterSidebar({
  translation,
  chapterIndex,
  onChapterClick,
}: ChapterSidebarProps) {
  const totalChapters = translation.chapters.length;
  const chaptersArray = Array.from({ length: totalChapters }, (_, i) => i);

  return (
    <aside className="w-48 bg-black/30 p-4 sticky top-0 h-screen overflow-y-auto">
      <h2 className="text-lg font-display mb-4 text-peachy">chapters</h2>
      <nav className="flex flex-col space-y-2">
        {chaptersArray.map((cNum) => {
          const isActive = cNum === chapterIndex;
          return (
            <button
              key={cNum}
              onClick={() => onChapterClick(cNum)}
              className={`px-3 py-2 rounded border text-sm font-body text-left ${
                isActive
                  ? 'bg-peachy text-midnight border-peachy'
                  : 'bg-black/30 text-white/80 border-white/20 hover:bg-black/50'
              }`}
            >
              {translation.chapters[cNum].title}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
