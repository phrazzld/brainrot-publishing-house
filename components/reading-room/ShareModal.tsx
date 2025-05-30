'use client';

import { KeyboardEvent } from 'react';

import { handleKeyboardInteraction } from '@/utils.js';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  includeChapter: boolean;
  onIncludeChapterChange: (value: boolean) => void;
  includeTimestamp: boolean;
  onIncludeTimestampChange: (value: boolean) => void;
  getShareUrl: () => string;
  onCopyUrl: () => void;
  shareFeedback: string;
}

/**
 * Modal component for generating and copying shareable URLs.
 * @param props - The component props.
 */
export default function ShareModal(props: ShareModalProps) {
  // Destructure props inside the function body
  const {
    isOpen,
    onClose,
    includeChapter,
    onIncludeChapterChange,
    includeTimestamp,
    onIncludeTimestampChange,
    getShareUrl,
    onCopyUrl,
    shareFeedback,
  } = props;
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
        aria-labelledby="share-modal-title"
      >
        <button
          className="absolute top-2 right-2 text-lavender text-sm"
          onClick={onClose}
          aria-label="Close share modal"
        >
          ✕
        </button>
        <h2 id="share-modal-title" className="text-xl mb-3 font-display">
          share the vibe
        </h2>
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2" htmlFor="include-chapter">
            <input
              id="include-chapter"
              type="checkbox"
              checked={includeChapter}
              onChange={() => onIncludeChapterChange(!includeChapter)}
            />
            <span>include chapter</span>
          </label>
          <label className="flex items-center gap-2" htmlFor="include-timestamp">
            <input
              id="include-timestamp"
              type="checkbox"
              checked={includeTimestamp}
              onChange={() => onIncludeTimestampChange(!includeTimestamp)}
            />
            <span>include timestamp</span>
          </label>
        </div>
        <div className="space-y-2">
          <label className="text-sm" htmlFor="share-url">
            your link
          </label>
          <input
            id="share-url"
            type="text"
            className="w-full p-2 rounded bg-[#1f1f29] text-gray-100"
            readOnly
            value={getShareUrl()}
          />
        </div>
        <button onClick={onCopyUrl} className="btn btn-primary mt-3 block w-full">
          copy link
        </button>
        {shareFeedback && <div className="mt-2 text-sm text-peachy">{shareFeedback}</div>}
      </div>
    </div>
  );
}
