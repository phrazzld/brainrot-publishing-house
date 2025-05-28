import { useState } from 'react';

type DownloadButtonProps = {
  slug: string;
  type: 'full' | 'chapter';
  chapter?: number;
  classNames?: string;
};

/**
 * Creates URL parameters for download requests
 */
function createUrlParams(
  slug: string,
  type: string,
  chapter?: number,
  useProxy = false,
): URLSearchParams {
  const params = new URLSearchParams({
    slug,
    type,
    ...(chapter ? { chapter: String(chapter) } : {}),
  });

  if (useProxy) {
    params.append('proxy', 'true');
  }

  return params;
}

/**
 * Handles error responses from fetch operations
 */
async function handleErrorResponse(response: Response): Promise<string> {
  const errorText = await response.text();
  console.error(`[Download] API error (${response.status}):`, errorText);
  let errorMessage = 'Error fetching download URL';

  try {
    const errorData = JSON.parse(errorText);
    errorMessage = errorData.message || errorData.error || errorMessage;
  } catch {
    // If response isn't valid JSON, use the text directly
    errorMessage = errorText || errorMessage;
  }

  return errorMessage;
}

/**
 * Creates and triggers a download for a blob
 */
function triggerFileDownload(blob: Blob, fileName: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;

  // Auto-click the link to trigger a download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Fetches audio file through proxy and initiates the download
 */
async function downloadViaProxy(
  slug: string,
  type: 'full' | 'chapter',
  chapter?: number,
): Promise<void> {
  console.warn('[Download] Using proxy approach for audio downloads');

  // Create proxy URL
  const proxyParams = createUrlParams(slug, type, chapter, true);
  const proxyUrl = `/api/download?${proxyParams.toString()}`;
  console.warn(`[Download] Fetching audio file through proxy: ${proxyUrl}`);

  // Fetch the file
  const fileRes = await fetch(proxyUrl);

  if (!fileRes.ok) {
    const errorText = await fileRes.text();
    console.error(`[Download] Proxy fetch error (${fileRes.status}):`, errorText);
    throw new Error(`failed to download audio file (${fileRes.status})`);
  }

  console.warn('[Download] Successfully fetched audio file through proxy, creating blob...');
  const blob = await fileRes.blob();

  // Create the filename
  const fileName = type === 'full' ? `${slug}.mp3` : `${slug}-chapter-${chapter}.mp3`;

  // Trigger the download
  triggerFileDownload(blob, fileName);
}

/**
 * Sets a user-friendly error message based on the error object
 */
function handleDownloadError(err: unknown, setError: (msg: string) => void): void {
  console.error('[Download] Error details:', err);

  const errorMessage = err instanceof Error ? err.message : 'unknown error';
  setError(`Failed to download. Please try again. (${errorMessage})`);
}

export default function DownloadButton({ slug, type, chapter, classNames }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setIsDownloading(true);
    setError('');

    try {
      // Initial API call to get download URL
      const params = createUrlParams(slug, type, chapter);
      const apiUrl = `/api/download?${params.toString()}`;
      const response = await fetch(apiUrl);

      // Handle API response errors
      if (!response.ok) {
        const errorMessage = await handleErrorResponse(response);
        throw new Error(errorMessage);
      }

      // Always download using proxy now
      await downloadViaProxy(slug, type, chapter);
    } catch (err) {
      handleDownloadError(err, setError);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div>
      <button
        className={`btn btn-primary ${classNames || ''}`}
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
