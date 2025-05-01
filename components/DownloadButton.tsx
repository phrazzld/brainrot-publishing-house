import { useState } from 'react';

// Only import what's actually used
import { getAssetUrlWithFallback } from '../utils';

type DownloadButtonProps = {
  slug: string;
  type: 'full' | 'chapter';
  chapter?: number;
  classNames?: string;
};

export default function DownloadButton({ slug, type, chapter, classNames }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setIsDownloading(true);
    setError('');

    try {
      // Build the file path based on type and chapter
      const audioFileName =
        type === 'full' ? 'full-audiobook.mp3' : `book-${zeroPad(chapter as number, 2)}.mp3`;

      // Convert to legacy path format for getAssetUrlWithFallback
      const legacyPath = `/${slug}/audio/${audioFileName}`;

      // Get audio URL with automatic fallback mechanism
      const audioUrl = await getAssetUrlWithFallback(legacyPath);

      // Fetch the audio file as a blob
      const fileRes = await fetch(audioUrl);
      if (!fileRes.ok) throw new Error('failed to fetch audio file');
      const blob = await fileRes.blob();

      // Create a local URL for that blob
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = type === 'full' ? `${slug}.mp3` : `${slug}-chapter-${chapter}.mp3`;

      // Auto-click the link to trigger a download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: unknown) {
      // Set user-friendly error message
      setError('failed to download. sry bestie.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div>
      <button
        className={`btn btn-primary ${classNames}`}
        disabled={isDownloading}
        onClick={handleDownload}
      >
        {isDownloading
          ? 'downloading...'
          : type === 'full'
            ? 'download full audiobook'
            : `download chapter ${chapter}`}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

// Zero-pad helper function for generating consistent file names
const zeroPad = (num: number, places: number) => {
  const zero = places - num.toString().length + 1;
  return Array(+(zero > 0 && zero)).join('0') + num;
};
