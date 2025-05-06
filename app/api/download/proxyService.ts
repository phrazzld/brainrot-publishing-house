import { NextResponse } from 'next/server';

import { Logger } from '@/utils/logger';

import { safeLog } from './errorHandlers';

/**
 * Default timeout for fetch requests in milliseconds
 * Can be overridden by setting DOWNLOAD_FETCH_TIMEOUT environment variable
 */
const FETCH_TIMEOUT_MS = process.env.DOWNLOAD_FETCH_TIMEOUT
  ? parseInt(process.env.DOWNLOAD_FETCH_TIMEOUT, 10)
  : 10000; // Default: 10 seconds

/**
 * Error class for timeout errors
 */
class TimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Fetches a resource with timeout handling using AbortController
 * @param url URL to fetch
 * @param options Fetch options
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise resolving to Response or rejecting with error
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS
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

/**
 * Creates a fallback URL from a CDN URL
 * @param cdnUrl Original CDN URL
 * @returns Fallback non-CDN URL
 */
function createFallbackUrl(cdnUrl: string): string {
  return cdnUrl.replace('.cdn.digitaloceanspaces.com', '.digitaloceanspaces.com');
}

/**
 * Checks if a URL is a CDN URL that should have a fallback
 * @param url URL to check
 * @returns True if URL is a CDN URL that should have a fallback
 */
function isCdnUrlWithFallback(url: string): boolean {
  return url.includes('.cdn.digitaloceanspaces.com');
}

/**
 * Creates an error response for timeout errors
 * @param error Timeout error
 * @returns Response with appropriate error details
 */
function createTimeoutErrorResponse(error: TimeoutError): Response {
  return new Response(
    JSON.stringify({
      error: 'Request timeout',
      message: error.message,
    }),
    {
      status: 504, // Gateway Timeout
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Creates an error response for network errors
 * @param error Network error
 * @returns Response with appropriate error details
 */
function createNetworkErrorResponse(error: Error | unknown): Response {
  return new Response(
    JSON.stringify({
      error: 'Failed to fetch resource',
      message: error instanceof Error ? error.message : 'Network error',
    }),
    {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Handle a fetch error from the primary URL
 * @param primaryUrl The original URL that failed
 * @param primaryError The error that occurred
 * @param log Logger instance
 * @returns Response from fallback or error response
 */
async function handlePrimaryFetchError(
  primaryUrl: string,
  primaryError: unknown,
  log: Logger
): Promise<Response> {
  // Specific handling for timeout errors
  if (primaryError instanceof TimeoutError) {
    safeLog(log, 'error', {
      msg: 'Timeout fetching from primary URL',
      primaryUrl,
      timeoutMs: FETCH_TIMEOUT_MS,
      error: primaryError.message,
    });

    // For CDN URLs that time out, try fallback URL
    if (isCdnUrlWithFallback(primaryUrl)) {
      const fallbackUrl = createFallbackUrl(primaryUrl);

      safeLog(log, 'info', {
        msg: 'Primary URL fetch timed out, trying fallback URL',
        primaryUrl,
        fallbackUrl,
        timeoutMs: FETCH_TIMEOUT_MS,
      });

      return tryFallbackFetch(fallbackUrl, log);
    }

    return createTimeoutErrorResponse(primaryError);
  }

  // Log detailed information about other errors
  safeLog(log, 'error', {
    msg: 'Error fetching from primary URL',
    primaryUrl,
    error: primaryError instanceof Error ? primaryError.message : String(primaryError),
    stack: primaryError instanceof Error ? primaryError.stack : undefined,
  });

  // For CDN URLs, try fallback URL
  if (isCdnUrlWithFallback(primaryUrl)) {
    const fallbackUrl = createFallbackUrl(primaryUrl);

    safeLog(log, 'info', {
      msg: 'Primary URL fetch failed with network error, trying fallback URL',
      primaryUrl,
      fallbackUrl,
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
    });

    return tryFallbackFetch(fallbackUrl, log);
  }

  // For non-CDN URLs or if fallback is not applicable, return a proper error Response
  return createNetworkErrorResponse(primaryError);
}

/**
 * Attempts to fetch a file from a URL with fallback handling
 * Properly handles network errors and exceptions during fetch operations
 */
export async function fetchWithFallback(primaryUrl: string, log: Logger): Promise<Response> {
  let fileResponse: Response;

  // Try to fetch the file from primary URL with proper error handling including timeout
  try {
    safeLog(log, 'debug', {
      msg: 'Attempting to fetch file from primary URL',
      primaryUrl,
      timeoutMs: FETCH_TIMEOUT_MS,
    });

    // Use fetchWithTimeout instead of fetch to add timeout handling
    fileResponse = await fetchWithTimeout(primaryUrl);

    safeLog(log, 'debug', {
      msg: 'Primary URL fetch completed',
      primaryUrl,
      status: fileResponse.status,
    });
  } catch (primaryError) {
    return handlePrimaryFetchError(primaryUrl, primaryError, log);
  }

  // If the primary CDN URL returns a non-OK response, try a fallback
  if (!fileResponse.ok && isCdnUrlWithFallback(primaryUrl)) {
    const fallbackUrl = createFallbackUrl(primaryUrl);

    safeLog(log, 'info', {
      msg: 'Primary URL failed with status error, trying fallback URL',
      primaryUrl,
      fallbackUrl,
      primaryStatus: fileResponse.status,
      primaryStatusText: fileResponse.statusText,
    });

    // Try the fallback URL
    const fallbackResponse = await tryFallbackFetch(fallbackUrl, log);

    // If fallback succeeds where primary failed, return the fallback response
    if (fallbackResponse.ok) {
      return fallbackResponse;
    }
  }

  return fileResponse;
}

/**
 * Helper function to handle fallback URL fetching with proper error handling including timeouts
 */
async function tryFallbackFetch(fallbackUrl: string, log: Logger): Promise<Response> {
  try {
    // Log that we're attempting to fetch from fallback
    safeLog(log, 'debug', {
      msg: 'Attempting to fetch from fallback URL',
      fallbackUrl,
      timeoutMs: FETCH_TIMEOUT_MS,
    });

    // Use fetchWithTimeout instead of fetch for timeout handling
    const fallbackResponse = await fetchWithTimeout(fallbackUrl);

    // Log the result of the fallback attempt
    if (fallbackResponse.ok) {
      safeLog(log, 'info', {
        msg: 'Fallback URL succeeded',
        fallbackUrl,
        status: fallbackResponse.status,
      });
    } else {
      safeLog(log, 'warn', {
        msg: 'Fallback URL returned error status',
        fallbackUrl,
        status: fallbackResponse.status,
        statusText: fallbackResponse.statusText,
      });
    }

    return fallbackResponse;
  } catch (fallbackError) {
    // Special handling for timeout errors
    if (fallbackError instanceof TimeoutError) {
      safeLog(log, 'error', {
        msg: 'Timeout fetching from fallback URL',
        fallbackUrl,
        timeoutMs: FETCH_TIMEOUT_MS,
        error: fallbackError.message,
      });

      // Return specific timeout error response using helper function
      return createTimeoutErrorResponse(fallbackError);
    }

    // Log detailed information about other fallback errors
    safeLog(log, 'error', {
      msg: 'Error fetching from fallback URL',
      fallbackUrl,
      error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      stack: fallbackError instanceof Error ? fallbackError.stack : undefined,
    });

    // Return a proper error Response using helper function
    return createNetworkErrorResponse(fallbackError);
  }
}

/**
 * Creates appropriate headers for file download
 */
export function createDownloadHeaders(contentType: string, filename: string): Headers {
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  return headers;
}

/**
 * Creates an error response for proxy download failures
 * @param status HTTP status code
 * @param errorMessage Error message
 * @param details Optional error details (only included in non-production)
 * @returns NextResponse with error information
 */
function createProxyErrorResponse(
  status: number,
  errorMessage: string,
  details?: string
): NextResponse {
  // Determine error type based on status code
  let errorType = 'Processing error';
  if (status === 500) {
    errorType = 'Proxy error';
  } else if (status === 504) {
    errorType = 'Request timeout';
  }

  return NextResponse.json(
    {
      error: errorType,
      message: errorMessage,
      details: process.env.NODE_ENV !== 'production' ? details : undefined,
    },
    { status }
  );
}

/**
 * Extracts error details from a Response object
 * @param response The response to extract error details from
 * @param log Logger instance
 * @returns Promise resolving to extracted error details or empty string
 */
async function extractErrorDetails(response: Response, log: Logger): Promise<string> {
  try {
    const responseText = await response.text();
    return responseText.substring(0, 200); // Truncate long responses
  } catch (readError) {
    safeLog(log, 'debug', {
      msg: 'Could not read error response body',
      error: readError instanceof Error ? readError.message : String(readError),
    });
    return '';
  }
}

/**
 * Handles proxying of file downloads through the API
 * With improved error handling for network errors, timeouts, and other exceptions
 */
export async function proxyFileDownload(
  url: string,
  filename: string,
  log: Logger
): Promise<NextResponse> {
  try {
    // Try to fetch the file with fallback handling
    safeLog(log, 'debug', {
      msg: 'Attempting to proxy file download',
      url,
      filename,
    });

    const fileResponse = await fetchWithFallback(url, log);

    if (!fileResponse.ok) {
      // Extract error details from the response body if possible
      const errorDetails = await extractErrorDetails(fileResponse, log);

      safeLog(log, 'error', {
        msg: 'Failed to fetch file for proxying',
        status: fileResponse.status,
        statusText: fileResponse.statusText,
        url,
        errorDetails,
      });

      return createProxyErrorResponse(
        502,
        `Failed to fetch file (${fileResponse.status})`,
        errorDetails
      );
    }

    // Get content type from response
    const contentType = fileResponse.headers.get('content-type') || 'audio/mpeg';

    // Create headers for the download
    const headers = createDownloadHeaders(contentType, filename);

    // Log successful proxy setup
    safeLog(log, 'info', {
      msg: 'Successfully set up file proxy',
      url,
      filename,
      contentType,
    });

    // Return the file stream
    return new NextResponse(fileResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    // Special handling for timeout errors
    if (error instanceof TimeoutError) {
      safeLog(log, 'error', {
        msg: 'Timeout in proxy download process',
        url,
        filename,
        timeoutMs: FETCH_TIMEOUT_MS,
        error: error.message,
      });

      return createProxyErrorResponse(
        504, // Gateway Timeout
        `Proxy download timed out after ${FETCH_TIMEOUT_MS}ms`,
        error.message
      );
    }

    // Catch any unexpected errors in the proxy process itself
    safeLog(log, 'error', {
      msg: 'Unexpected error in proxy download process',
      url,
      filename,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return createProxyErrorResponse(
      500,
      'Failed to proxy download through API',
      error instanceof Error ? error.message : String(error)
    );
  }
}
