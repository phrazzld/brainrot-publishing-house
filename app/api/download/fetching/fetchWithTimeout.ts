import { TimeoutError } from '../errors/errorTypes.js';

/**
 * Default timeout for fetch requests in milliseconds
 * Can be overridden by setting DOWNLOAD_FETCH_TIMEOUT environment variable
 */
export const FETCH_TIMEOUT_MS = process.env.DOWNLOAD_FETCH_TIMEOUT
  ? parseInt(process.env.DOWNLOAD_FETCH_TIMEOUT, 10)
  : 10000; // Default: 10 seconds

/**
 * Fetches a resource with timeout handling using AbortController
 * @param url URL to fetch
 * @param options Fetch options
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise resolving to Response or rejecting with error
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  // Create a controller to abort the fetch operation if it takes too long
  const controller = new AbortController();
  const { signal } = controller;

  // Create a timeout that will abort the request if it takes too long
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Add the abort signal to the fetch options
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(url, timeoutMs);
    }
    throw error;
  }
}
