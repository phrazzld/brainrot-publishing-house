'use client';

import { KeyboardEvent } from 'react';

import DownloadButton from '@/components/DownloadButton.js';
import { handleKeyboardInteraction } from '@/utils.js';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  chapterIndex: number;
}

export default function DownloadModal({ isOpen, onClose, slug, chapterIndex }: DownloadModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
          handleKeyboardInteraction(e, onClose);
        }
      }}
    >
      <div
        className="w-full max-w-sm bg-[#2c2c3a] p-4 rounded-md relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
      >
        <button
          className="absolute top-2 right-2 text-lavender text-sm"
          onClick={onClose}
          aria-label="Close download modal"
        >
          ✕
        </button>
        <h2 id="download-modal-title" className="text-xl mb-3 font-display">
          download options
        </h2>
        <div className="flex flex-col space-y-2">
          <DownloadButton
            slug={slug}
            type="chapter"
            chapter={chapterIndex + 1}
            classNames="btn btn-primary"
          />
          <DownloadButton slug={slug} type="full" classNames="btn btn-secondary" />
        </div>
      </div>
    </div>
  );
}
