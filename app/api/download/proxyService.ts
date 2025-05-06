import { NextResponse } from 'next/server';

import { Logger } from '@/utils/logger';

import { safeLog } from './errorHandlers';

/**
 * Attempts to fetch a file from a URL with fallback handling
 * Properly handles network errors and exceptions during fetch operations
 */
export async function fetchWithFallback(primaryUrl: string, log: Logger): Promise<Response> {
  let fileResponse: Response;

  // Try to fetch the file from primary URL with proper error handling
  try {
    safeLog(log, 'debug', {
      msg: 'Attempting to fetch file from primary URL',
      primaryUrl,
    });

    fileResponse = await fetch(primaryUrl);

    safeLog(log, 'debug', {
      msg: 'Primary URL fetch completed',
      primaryUrl,
      status: fileResponse.status,
    });
  } catch (primaryError) {
    // Log detailed information about the error
    safeLog(log, 'error', {
      msg: 'Error fetching from primary URL',
      primaryUrl,
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      stack: primaryError instanceof Error ? primaryError.stack : undefined,
    });

    // For CDN URLs, try fallback URL
    if (primaryUrl.includes('.cdn.digitaloceanspaces.com')) {
      const fallbackUrl = primaryUrl.replace(
        '.cdn.digitaloceanspaces.com',
        '.digitaloceanspaces.com'
      );

      safeLog(log, 'info', {
        msg: 'Primary URL fetch failed with network error, trying fallback URL',
        primaryUrl,
        fallbackUrl,
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      });

      return tryFallbackFetch(fallbackUrl, log);
    }

    // For non-CDN URLs or if fallback is not applicable, return a proper error Response
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch resource',
        message: primaryError instanceof Error ? primaryError.message : 'Network error',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // If the primary CDN URL returns a non-OK response, try a fallback
  if (!fileResponse.ok && primaryUrl.includes('.cdn.digitaloceanspaces.com')) {
    const fallbackUrl = primaryUrl.replace(
      '.cdn.digitaloceanspaces.com',
      '.digitaloceanspaces.com'
    );

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
    // Otherwise, return the original response
    if (fallbackResponse.ok) {
      return fallbackResponse;
    }
  }

  return fileResponse;
}

/**
 * Helper function to handle fallback URL fetching with proper error handling
 */
async function tryFallbackFetch(fallbackUrl: string, log: Logger): Promise<Response> {
  try {
    const fallbackResponse = await fetch(fallbackUrl);

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
    // Log detailed information about the fallback error
    safeLog(log, 'error', {
      msg: 'Error fetching from fallback URL',
      fallbackUrl,
      error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      stack: fallbackError instanceof Error ? fallbackError.stack : undefined,
    });

    // Return a proper error Response
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch resource',
        message: fallbackError instanceof Error ? fallbackError.message : 'Network error',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
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
  return NextResponse.json(
    {
      error: status === 500 ? 'Proxy error' : 'Processing error',
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
