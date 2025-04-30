'use client';

import { useRef, useState } from 'react';

// Components
import AudioPlayer from '@/components/reading-room/AudioPlayer';
import ChapterHeader from '@/components/reading-room/ChapterHeader';
import ChapterSidebar from '@/components/reading-room/ChapterSidebar';
import DownloadModal from '@/components/reading-room/DownloadModal';
import ShareModal from '@/components/reading-room/ShareModal';
import TextContent from '@/components/reading-room/TextContent';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useChapterNavigation } from '@/hooks/useChapterNavigation';
import { useShareModal } from '@/hooks/useShareModal';
import { useTextLoader } from '@/hooks/useTextLoader';
// Custom hooks
import translations from '@/translations';

export default function ReadingRoom() {
  // Waveform container ref
  const waveformRef = useRef<HTMLDivElement>(null);

  // Download modal state
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  // Set up chapter navigation
  const [
    { chapterIndex, slug, translation, chapterData, totalChapters },
    { handleChapterClick, goPrevChapter, goNextChapter, updateUrlWithChapterAndTimestamp },
  ] = useChapterNavigation(translations, null);

  // Load chapter text
  const { rawText, isTextLoading } = useTextLoader(chapterData?.text);

  // Set up audio player
  const [{ isPlaying, isAudioLoading, currentTime, totalTime }, { togglePlayPause, formatTime }] =
    useAudioPlayer(waveformRef, chapterData?.audioSrc, updateUrlWithChapterAndTimestamp);

  // Set up share modal
  const [
    { isShareOpen, shareFeedback, includeChapter, includeTimestamp },
    {
      openShareModal,
      closeShareModal,
      setIncludeChapter,
      setIncludeTimestamp,
      getShareUrl,
      copyShareUrl,
    },
  ] = useShareModal(slug, chapterIndex, currentTime);

  // Download modal handlers
  function openDownloadModal() {
    setIsDownloadOpen(true);
  }

  function closeDownloadModal() {
    setIsDownloadOpen(false);
  }

  // If no translation found, show a simple message
  if (!translation) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-xl">no translation found</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-midnight text-white">
      {/* Sidebar with chapter navigation */}
      <ChapterSidebar
        translation={translation}
        chapterIndex={chapterIndex}
        onChapterClick={handleChapterClick}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header with title and navigation */}
        <ChapterHeader
          translation={translation}
          chapterIndex={chapterIndex}
          totalChapters={totalChapters}
          onPrevChapter={goPrevChapter}
          onNextChapter={goNextChapter}
          onOpenShareModal={openShareModal}
        />

        {/* Audio player (conditional) */}
        {chapterData?.audioSrc && (
          <AudioPlayer
            isPlaying={isPlaying}
            isAudioLoading={isAudioLoading}
            currentTime={currentTime}
            totalTime={totalTime}
            onTogglePlayPause={togglePlayPause}
            onOpenDownloadModal={openDownloadModal}
            waveformRef={waveformRef}
            formatTime={formatTime}
          />
        )}

        {/* Text content */}
        <TextContent isLoading={isTextLoading} content={rawText} />
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={closeShareModal}
        includeChapter={includeChapter}
        onIncludeChapterChange={setIncludeChapter}
        includeTimestamp={includeTimestamp}
        onIncludeTimestampChange={setIncludeTimestamp}
        getShareUrl={getShareUrl}
        onCopyUrl={copyShareUrl}
        shareFeedback={shareFeedback}
      />

      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={closeDownloadModal}
        slug={slug}
        chapterIndex={chapterIndex}
      />
    </div>
  );
}
