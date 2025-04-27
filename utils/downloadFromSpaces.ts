/**
 * Utility function to download audio files from Digital Ocean Spaces
 */

/**
 * Options for downloading files from Spaces
 */
export interface DownloadOptions {
  /** Number of retry attempts for failed downloads */
  maxRetries?: number;
  /** Timeout in milliseconds for the download request */
  timeout?: number;
  /** Whether to log detailed information about the download process */
  verbose?: boolean;
}

/**
 * Result of a download operation
 */
export interface DownloadResult {
  /** The original URL that was downloaded */
  url: string;
  /** The downloaded file content as a Buffer */
  content: Buffer;
  /** Size of the downloaded content in bytes */
  size: number;
  /** Content type of the downloaded file */
  contentType: string;
  /** Time taken for the download in milliseconds */
  timeTaken: number;
}

/**
 * Downloads a file from Digital Ocean Spaces (or any URL)
 * 
 * @param url The URL to download the file from
 * @param options Download options
 * @returns Promise resolving to download result with file content
 */
export async function downloadFromSpaces(
  url: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  // Default options
  const {
    maxRetries = 3,
    timeout = 30000,
    verbose = false,
  } = options;

  let retries = 0;
  let lastError: Error | null = null;

  // Start timing
  const startTime = Date.now();

  // Process the URL to ensure it's properly formatted
  let fullUrl = url;
  
  // If the url is just a path, add the base URL from env
  if (!url.startsWith('http')) {
    // Remove leading slash if present
    const cleanPath = url.startsWith('/') ? url.slice(1) : url;
    fullUrl = `${process.env.NEXT_PUBLIC_SPACES_BASE_URL}/${cleanPath}`;
  }

  if (verbose) {
    console.log(`Downloading from ${fullUrl}`);
  }

  // Try downloading with retries
  while (retries <= maxRetries) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Fetch the file
        const response = await fetch(fullUrl, { 
          signal: controller.signal,
          headers: {
            // Add any required headers for authentication here if needed
          }
        });

        // Check if the request was successful
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Get content type
        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        // Get the response as an array buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Calculate time taken
        const timeTaken = Date.now() - startTime;

        if (verbose) {
          console.log(`Download successful: ${fullUrl}`);
          console.log(`Size: ${buffer.length} bytes, Content-Type: ${contentType}`);
          console.log(`Time taken: ${timeTaken}ms`);
        }

        return {
          url: fullUrl,
          content: buffer,
          size: buffer.length,
          contentType,
          timeTaken,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retries++;

      if (verbose) {
        console.warn(`Download attempt ${retries} failed: ${lastError.message}`);
      }

      // If we've used all retries, throw the error
      if (retries > maxRetries) {
        throw new Error(`Failed to download from ${fullUrl} after ${maxRetries} attempts: ${lastError.message}`);
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);
      
      if (verbose) {
        console.log(`Retrying in ${delay}ms...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to the throw in the retry loop,
  // but TypeScript doesn't know that
  throw lastError || new Error(`Failed to download from ${fullUrl} for unknown reason`);
}

/**
 * Extracts an audio path from a URL string in the translations file
 * 
 * @param audioSrc The audio source URL or path from translations
 * @returns A clean path that can be used with downloadFromSpaces
 */
export function getAudioPathFromUrl(audioSrc: string): string {
  // If it's already a full URL
  if (audioSrc.startsWith('http')) {
    // Return just the path portion
    const url = new URL(audioSrc);
    return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
  }
  
  // If it starts with a slash, remove it
  if (audioSrc.startsWith('/')) {
    return audioSrc.slice(1);
  }
  
  // Otherwise return as is
  return audioSrc;
}

export default downloadFromSpaces;