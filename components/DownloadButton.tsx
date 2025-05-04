import { useState } from 'react';

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
      // Use the API route instead of directly accessing Blob storage from the client
      const params = new URLSearchParams({
        slug,
        type,
        ...(chapter ? { chapter: String(chapter) } : {}),
      });

      const apiUrl = `/api/download?${params.toString()}`;

      // Fetch the download URL from our API
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Download] API error (${response.status}):`, errorText);
        let errorMessage = 'Error fetching download URL';

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response isn't valid JSON, use the text directly
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      // We don't need the response data as we're always using the proxy approach
      await response.json(); // Just to ensure we read the response body

      // Always use the proxy approach for consistency across all environments
      console.warn(`[Download] Using proxy approach for audio downloads`);

      // Create a proxy URL by adding the proxy parameter
      const proxyParams = new URLSearchParams({
        slug,
        type,
        ...(chapter ? { chapter: String(chapter) } : {}),
        proxy: 'true',
      });

      const proxyUrl = `/api/download?${proxyParams.toString()}`;
      console.warn(`[Download] Fetching audio file through proxy: ${proxyUrl}`);

      // Fetch directly from our API endpoint which will proxy the file
      const fileRes = await fetch(proxyUrl);

      if (!fileRes.ok) {
        console.error(`[Download] Proxy fetch error (${fileRes.status}):`, await fileRes.text());
        throw new Error(`failed to download audio file (${fileRes.status})`);
      }

      console.warn(`[Download] Successfully fetched audio file through proxy, creating blob...`);
      const blob = await fileRes.blob();

      // Create a local URL for that blob
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = type === 'full' ? `${slug}.mp3` : `${slug}-chapter-${chapter}.mp3`;

      // Auto-click the link to trigger a download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      // Log the detailed error for debugging
      console.error('[Download] Error details:', err);

      // Set user-friendly error message
      setError(
        `Failed to download. Please try again. (${err instanceof Error ? err.message : 'unknown error'})`
      );
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

// We no longer need the zeroPad function as we're using the proxy approach
