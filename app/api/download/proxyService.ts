import { NextResponse } from 'next/server';

import { Logger } from '@/utils/logger';

import { safeLog } from './errorHandlers';

/**
 * Maximum length for response body text in logs
 * Truncated to avoid excessive log size while still providing useful context
 */
const MAX_RESPONSE_BODY_LOG_LENGTH = 500;

/**
 * Sanitizes a URL for logging to remove sensitive information
 * This enhanced version provides more detailed sanitization while protecting sensitive data
 *
 * @param url The URL to sanitize
 * @returns A sanitized version of the URL suitable for logging
 */
function sanitizeUrlForLogging(url: string): string {
  try {
    // Try to parse as URL
    const parsedUrl = new URL(url);

    // List of parameter names that should be completely redacted
    const sensitiveParams = [
      'key',
      'token',
      'auth',
      'password',
      'secret',
      'apikey',
      'api_key',
      'jwt',
    ];

    // Create a safe version with hostname and pathname
    let safeUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;

    // If there are search parameters, selectively redact sensitive ones
    if (parsedUrl.search) {
      const params = new URLSearchParams(parsedUrl.search);
      const safeParams = new URLSearchParams();

      // Iterate through all parameters and redact sensitive ones
      params.forEach((value, key) => {
        if (sensitiveParams.includes(key.toLowerCase())) {
          // Completely redact sensitive parameters
          safeParams.append(key, '[REDACTED]');
        } else if (value.length > 20) {
          // Truncate long values which might contain encoded sensitive data
          safeParams.append(key, value.substring(0, 10) + '...[truncated]');
        } else {
          // Keep other parameters as is
          safeParams.append(key, value);
        }
      });

      // Only add the search string if there are parameters after filtering
      const safeSearch = safeParams.toString();
      if (safeSearch) {
        safeUrl += `?${safeSearch}`;
      }
    }

    return safeUrl;
  } catch (error) {
    // If URL parsing fails, redact the whole thing to be safe
    return '[unparseable-url]';
  }
}

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
 * Enhanced with detailed error categorization and operation ID for log correlation
 *
 * @param primaryUrl The original URL that failed
 * @param primaryError The error that occurred
 * @param log Logger instance
 * @param opId Optional operation ID for log correlation
 * @returns Response from fallback or error response
 */
async function handlePrimaryFetchError(
  primaryUrl: string,
  primaryError: unknown,
  log: Logger,
  opId?: string
): Promise<Response> {
  const safeUrl = sanitizeUrlForLogging(primaryUrl);
  const isCdn = isCdnUrlWithFallback(primaryUrl);
  const errorTime = Date.now();

  // Specific handling for timeout errors
  if (primaryError instanceof TimeoutError) {
    safeLog(log, 'error', {
      msg: 'Timeout fetching from primary URL',
      opId,
      url: safeUrl,
      timeoutMs: FETCH_TIMEOUT_MS,
      error: primaryError.message,
      errorType: 'TimeoutError',
      serverType: isCdn ? 'CDN' : 'Standard',
      errorCategory: 'Timeout',
      errorTime: new Date(errorTime).toISOString(),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });

    // For CDN URLs that time out, try fallback URL
    if (isCdn) {
      const fallbackUrl = createFallbackUrl(primaryUrl);
      const safeFallbackUrl = sanitizeUrlForLogging(fallbackUrl);

      safeLog(log, 'info', {
        msg: 'Primary URL fetch timed out, trying fallback URL',
        opId,
        primaryUrl: safeUrl,
        fallbackUrl: safeFallbackUrl,
        timeoutMs: FETCH_TIMEOUT_MS,
        isCdnUrl: true,
        timeoutError: primaryError.message,
        fallbackStrategy: 'non-CDN direct URL',
        recoveryAttempt: true,
        timestamp: new Date().toISOString(),
      });

      return tryFallbackFetch(fallbackUrl, log, opId);
    }

    // Return enhanced timeout error response with operation ID
    return createProxyErrorResponse(
      504, // Gateway Timeout
      `Request timed out after ${FETCH_TIMEOUT_MS}ms`,
      JSON.stringify({
        error: primaryError.message,
        url: safeUrl,
        timeoutMs: FETCH_TIMEOUT_MS,
        opId,
      }),
      opId
    );
  }

  // Enhanced error categorization and logging for non-timeout errors
  const errorType =
    primaryError instanceof Error ? primaryError.constructor.name : typeof primaryError;
  const errorMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
  const errorStack = primaryError instanceof Error ? primaryError.stack : undefined;

  // Categorize error for better debugging and analysis
  const isNetworkError =
    errorMessage.includes('network') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('ECONNREFUSED');
  const isDnsError = errorMessage.includes('ENOTFOUND');
  const isConnectionError =
    errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT');
  const isTlsError =
    errorMessage.includes('SSL') ||
    errorMessage.includes('TLS') ||
    errorMessage.includes('certificate');
  const isAbortError = errorType === 'AbortError' || errorMessage.includes('abort');

  // Determine error category for analytics
  let errorCategory = 'Unknown';
  if (isNetworkError) errorCategory = 'Network';
  if (isDnsError) errorCategory = 'DNS';
  if (isConnectionError) errorCategory = 'Connection';
  if (isTlsError) errorCategory = 'TLS/SSL';
  if (isAbortError) errorCategory = 'Abort';

  safeLog(log, 'error', {
    msg: 'Error fetching from primary URL',
    opId,
    url: safeUrl,
    error: errorMessage,
    errorType,
    stack: errorStack,
    isCdnUrl: isCdn,
    serverType: isCdn ? 'CDN' : 'Standard',
    errorCategory,
    errorClassification: {
      isNetworkError,
      isDnsError,
      isConnectionError,
      isTlsError,
      isAbortError,
    },
    environment: process.env.NODE_ENV || 'development',
    errorTime: new Date(errorTime).toISOString(),
    timestamp: new Date().toISOString(),
  });

  // For CDN URLs, try fallback URL with enhanced context
  if (isCdn) {
    const fallbackUrl = createFallbackUrl(primaryUrl);
    const safeFallbackUrl = sanitizeUrlForLogging(fallbackUrl);

    safeLog(log, 'info', {
      msg: 'Primary URL fetch failed with network error, trying fallback URL',
      opId,
      primaryUrl: safeUrl,
      fallbackUrl: safeFallbackUrl,
      error: errorMessage,
      errorType,
      errorCategory,
      fallbackStrategy: 'non-CDN direct URL',
      recoveryAttempt: true,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });

    return tryFallbackFetch(fallbackUrl, log, opId);
  }

  // For non-CDN URLs or if fallback is not applicable, return a proper error Response with operation ID
  return createProxyErrorResponse(
    502, // Bad Gateway
    'Failed to fetch resource',
    JSON.stringify({
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      url: safeUrl,
      errorType,
      errorCategory,
      opId,
    }),
    opId
  );
}

/**
 * Attempts to fetch a file from a URL with fallback handling
 * Enhanced with detailed timing metrics, performance indicators, and comprehensive logging
 *
 * @param primaryUrl The primary URL to fetch from
 * @param log Logger instance
 * @param opId Optional operation ID for log correlation
 * @returns Response object from successful fetch
 */
export async function fetchWithFallback(
  primaryUrl: string,
  log: Logger,
  opId?: string
): Promise<Response> {
  let fileResponse: Response;

  // Performance metrics tracking
  const metrics = {
    fetchStartTime: Date.now(),
    dnsLookupStartTime: 0,
    connectionStartTime: 0,
    tlsHandshakeStartTime: 0,
    requestSentTime: 0,
    firstByteTime: 0,
    downloadEndTime: 0,
    totalDuration: 0,
    fallbackStartTime: 0,
    fallbackDuration: 0,
    attemptCount: 1,
  };

  const safeUrl = sanitizeUrlForLogging(primaryUrl);
  const isCdn = isCdnUrlWithFallback(primaryUrl);

  // Try to fetch the file from primary URL with proper error handling including timeout
  try {
    // Log start of fetch with detailed context
    safeLog(log, 'debug', {
      msg: 'Attempting to fetch file from primary URL',
      opId,
      url: safeUrl,
      timeoutMs: FETCH_TIMEOUT_MS,
      isCdnUrl: isCdn,
      timestamp: new Date().toISOString(),
      fetchTimestamp: metrics.fetchStartTime,
      method: 'GET',
      headers: {
        Accept: '*/*',
        'User-Agent': `Brainrot-Publishing-House/${process.env.NEXT_PUBLIC_APP_VERSION || 'dev'} (${process.env.NODE_ENV})`,
      },
    });

    // Use fetchWithTimeout instead of fetch to add timeout handling
    fileResponse = await fetchWithTimeout(primaryUrl);

    // Calculate fetch duration and update metrics
    metrics.downloadEndTime = Date.now();
    metrics.totalDuration = metrics.downloadEndTime - metrics.fetchStartTime;

    // Extract and log detailed performance metrics from response
    const responseHeadersReceived =
      metrics.downloadEndTime - (metrics.firstByteTime || metrics.fetchStartTime);
    const serverProcessingTime = fileResponse.headers.get('x-processing-time')
      ? parseInt(fileResponse.headers.get('x-processing-time') || '0', 10)
      : undefined;

    // Analyze cache status
    const cacheStatus = {
      status: fileResponse.headers.get('x-cache') || 'UNKNOWN',
      hit: fileResponse.headers.get('x-cache')?.includes('HIT') || false,
      age: fileResponse.headers.get('age')
        ? parseInt(fileResponse.headers.get('age') || '0', 10)
        : undefined,
      ttl: undefined as number | undefined,
    };

    // Try to extract TTL from cache-control header
    const cacheControl = fileResponse.headers.get('cache-control');
    if (cacheControl && cacheControl.includes('max-age=')) {
      const match = cacheControl.match(/max-age=(\d+)/);
      if (match && match[1]) {
        cacheStatus.ttl = parseInt(match[1], 10);
      }
    }

    // Log detailed information about the response with enhanced performance metrics
    safeLog(log, 'debug', {
      msg: 'Primary URL fetch completed',
      opId,
      url: safeUrl,
      status: fileResponse.status,
      statusText: fileResponse.statusText,
      timing: {
        totalDurationMs: metrics.totalDuration,
        responseHeadersReceivedMs: responseHeadersReceived,
        serverProcessingTimeMs: serverProcessingTime,
      },
      performance: {
        isSlowRequest: metrics.totalDuration > 2000, // Flag slow requests
        estimatedBandwidthKBps: fileResponse.headers.get('content-length')
          ? parseInt(fileResponse.headers.get('content-length') || '0', 10) / metrics.totalDuration
          : undefined,
      },
      contentType: fileResponse.headers.get('content-type'),
      contentLength: fileResponse.headers.get('content-length')
        ? parseInt(fileResponse.headers.get('content-length') || '0', 10)
        : undefined,
      server: fileResponse.headers.get('server'),
      cacheControl: fileResponse.headers.get('cache-control'),
      cache: cacheStatus,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (primaryError) {
    // Log the fetch failure with enhanced error metrics
    metrics.downloadEndTime = Date.now();
    metrics.totalDuration = metrics.downloadEndTime - metrics.fetchStartTime;

    safeLog(log, 'debug', {
      msg: 'Primary URL fetch failed',
      opId,
      url: safeUrl,
      timing: {
        totalDurationMs: metrics.totalDuration,
        elapsedBeforeErrorMs: metrics.totalDuration,
      },
      errorType:
        primaryError instanceof Error ? primaryError.constructor.name : typeof primaryError,
      errorMessage: primaryError instanceof Error ? primaryError.message : String(primaryError),
      isTimeoutError: primaryError instanceof TimeoutError,
      isNetworkError:
        primaryError instanceof Error &&
        (primaryError.message.includes('network') ||
          primaryError.message.includes('fetch') ||
          primaryError.message.includes('ENOTFOUND') ||
          primaryError.message.includes('ECONNREFUSED')),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });

    return handlePrimaryFetchError(primaryUrl, primaryError, log, opId);
  }

  // If the primary CDN URL returns a non-OK response, try a fallback
  if (!fileResponse.ok && isCdnUrlWithFallback(primaryUrl)) {
    const fallbackUrl = createFallbackUrl(primaryUrl);
    const safeFallbackUrl = sanitizeUrlForLogging(fallbackUrl);
    metrics.fallbackStartTime = Date.now();
    metrics.attemptCount++;

    // Log detailed failure info and fallback attempt
    safeLog(log, 'info', {
      msg: 'Primary URL failed with status error, trying fallback URL',
      opId,
      primaryUrl: safeUrl,
      fallbackUrl: safeFallbackUrl,
      primaryStatus: fileResponse.status,
      primaryStatusText: fileResponse.statusText,
      primaryTiming: {
        durationMs: metrics.totalDuration,
      },
      errorHeaders: {
        server: fileResponse.headers.get('server'),
        contentType: fileResponse.headers.get('content-type'),
        contentLength: fileResponse.headers.get('content-length'),
        errorCode:
          fileResponse.headers.get('x-error-code') || fileResponse.headers.get('x-amzn-errortype'),
      },
      isCdn,
      attemptCount: metrics.attemptCount,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });

    // Try the fallback URL with the operation ID for correlation
    const fallbackResponse = await tryFallbackFetch(fallbackUrl, log, opId);
    metrics.fallbackDuration = Date.now() - metrics.fallbackStartTime;

    // If fallback succeeds where primary failed, return the fallback response
    if (fallbackResponse.ok) {
      safeLog(log, 'info', {
        msg: 'Fallback URL succeeded where primary failed',
        opId,
        primaryUrl: safeUrl,
        fallbackUrl: safeFallbackUrl,
        primaryStatus: fileResponse.status,
        fallbackStatus: fallbackResponse.status,
        timing: {
          primaryDurationMs: metrics.totalDuration,
          fallbackDurationMs: metrics.fallbackDuration,
          totalDurationMs: metrics.totalDuration + metrics.fallbackDuration,
        },
        attemptCount: metrics.attemptCount,
        performance: {
          fallbackFasterThanPrimary: metrics.fallbackDuration < metrics.totalDuration,
          speedupPercentage: Math.round(
            ((metrics.totalDuration - metrics.fallbackDuration) / metrics.totalDuration) * 100
          ),
        },
        timestamp: new Date().toISOString(),
      });

      return fallbackResponse;
    } else {
      // Both primary and fallback failed - log comprehensive error details
      safeLog(log, 'error', {
        msg: 'Both primary and fallback URLs failed',
        opId,
        primaryUrl: safeUrl,
        fallbackUrl: safeFallbackUrl,
        primaryStatus: fileResponse.status,
        fallbackStatus: fallbackResponse.status,
        timing: {
          primaryDurationMs: metrics.totalDuration,
          fallbackDurationMs: metrics.fallbackDuration,
          totalDurationMs: metrics.totalDuration + metrics.fallbackDuration,
        },
        attemptCount: metrics.attemptCount,
        errorSources: ['primary', 'fallback'],
        isCdn,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return fileResponse;
}

/**
 * Helper function to handle fallback URL fetching with proper error handling including timeouts
 * Enhanced with detailed metrics and operation ID for log correlation
 *
 * @param fallbackUrl The fallback URL to fetch from
 * @param log Logger instance
 * @param opId Optional operation ID for log correlation
 * @returns Response object from fallback fetch attempt
 */
async function tryFallbackFetch(
  fallbackUrl: string,
  log: Logger,
  opId?: string
): Promise<Response> {
  const safeUrl = sanitizeUrlForLogging(fallbackUrl);
  const fetchStartTime = Date.now();

  try {
    // Log that we're attempting to fetch from fallback with enhanced context
    safeLog(log, 'debug', {
      msg: 'Attempting to fetch from fallback URL',
      opId,
      url: safeUrl,
      timeoutMs: FETCH_TIMEOUT_MS,
      fetchAttemptType: 'fallback',
      timestamp: new Date().toISOString(),
      fetchTimestamp: fetchStartTime,
      method: 'GET',
      headers: {
        Accept: '*/*',
        'User-Agent': `Brainrot-Publishing-House/${process.env.NEXT_PUBLIC_APP_VERSION || 'dev'} (${process.env.NODE_ENV})`,
      },
    });

    // Use fetchWithTimeout instead of fetch for timeout handling
    const fallbackResponse = await fetchWithTimeout(fallbackUrl);

    const fetchDuration = Date.now() - fetchStartTime;

    // Process cache information for performance analysis
    const cacheStatus = {
      status: fallbackResponse.headers.get('x-cache') || 'UNKNOWN',
      hit: fallbackResponse.headers.get('x-cache')?.includes('HIT') || false,
      age: fallbackResponse.headers.get('age')
        ? parseInt(fallbackResponse.headers.get('age') || '0', 10)
        : undefined,
      ttl: undefined as number | undefined,
    };

    // Try to extract TTL from cache-control header
    const cacheControl = fallbackResponse.headers.get('cache-control');
    if (cacheControl && cacheControl.includes('max-age=')) {
      const match = cacheControl.match(/max-age=(\d+)/);
      if (match && match[1]) {
        cacheStatus.ttl = parseInt(match[1], 10);
      }
    }

    // Log the result of the fallback attempt with enhanced metrics
    if (fallbackResponse.ok) {
      safeLog(log, 'info', {
        msg: 'Fallback URL fetch succeeded',
        opId,
        url: safeUrl,
        status: fallbackResponse.status,
        statusText: fallbackResponse.statusText,
        timing: {
          totalDurationMs: fetchDuration,
        },
        performance: {
          isSlowRequest: fetchDuration > 2000,
          estimatedBandwidthKBps: fallbackResponse.headers.get('content-length')
            ? parseInt(fallbackResponse.headers.get('content-length') || '0', 10) / fetchDuration
            : undefined,
        },
        contentType: fallbackResponse.headers.get('content-type'),
        contentLength: fallbackResponse.headers.get('content-length')
          ? parseInt(fallbackResponse.headers.get('content-length') || '0', 10)
          : undefined,
        server: fallbackResponse.headers.get('server'),
        cache: cacheStatus,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });
    } else {
      // Detailed error logging for non-OK responses
      const errorHeaders: Record<string, string> = {};

      // Extract all error-related headers
      ['x-request-id', 'x-error-code', 'x-amzn-errortype', 'x-amz-request-id'].forEach((header) => {
        const value = fallbackResponse.headers.get(header);
        if (value) {
          errorHeaders[header] = value;
        }
      });

      safeLog(log, 'warn', {
        msg: 'Fallback URL returned error status',
        opId,
        url: safeUrl,
        status: fallbackResponse.status,
        statusText: fallbackResponse.statusText,
        timing: {
          totalDurationMs: fetchDuration,
        },
        contentType: fallbackResponse.headers.get('content-type'),
        contentLength: fallbackResponse.headers.get('content-length'),
        server: fallbackResponse.headers.get('server'),
        errorInfo: {
          requestId: fallbackResponse.headers.get('x-request-id'),
          errorCode:
            fallbackResponse.headers.get('x-error-code') ||
            fallbackResponse.headers.get('x-amzn-errortype'),
          allErrorHeaders: errorHeaders,
          isAccessDenied: fallbackResponse.status === 403,
          isNotFound: fallbackResponse.status === 404,
          isServerError: fallbackResponse.status >= 500,
        },
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });
    }

    return fallbackResponse;
  } catch (fallbackError) {
    const fetchDuration = Date.now() - fetchStartTime;

    // Special handling for timeout errors with enhanced context
    if (fallbackError instanceof TimeoutError) {
      safeLog(log, 'error', {
        msg: 'Timeout fetching from fallback URL',
        opId,
        url: safeUrl,
        timeoutMs: FETCH_TIMEOUT_MS,
        timing: {
          durationMs: fetchDuration,
          elapsedBeforeTimeoutMs: fetchDuration,
        },
        error: fallbackError.message,
        errorType: 'TimeoutError',
        fallbackAttempt: true,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });

      // Return enhanced timeout error response with operation ID
      return createProxyErrorResponse(
        504, // Gateway Timeout
        `Fallback URL request timed out after ${FETCH_TIMEOUT_MS}ms`,
        JSON.stringify({
          error: fallbackError.message,
          url: safeUrl,
          timeoutMs: FETCH_TIMEOUT_MS,
          opId,
          isFallback: true,
        }),
        opId
      );
    }

    // Log detailed information about other fallback errors with enhanced context
    safeLog(log, 'error', {
      msg: 'Error fetching from fallback URL',
      opId,
      url: safeUrl,
      timing: {
        durationMs: fetchDuration,
        elapsedBeforeErrorMs: fetchDuration,
      },
      error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      stack: fallbackError instanceof Error ? fallbackError.stack : undefined,
      errorType:
        fallbackError instanceof Error ? fallbackError.constructor.name : typeof fallbackError,
      fallbackAttempt: true,
      isNetworkError:
        fallbackError instanceof Error &&
        (fallbackError.message.includes('network') ||
          fallbackError.message.includes('fetch') ||
          fallbackError.message.includes('ENOTFOUND') ||
          fallbackError.message.includes('ECONNREFUSED')),
      isDnsError: fallbackError instanceof Error && fallbackError.message.includes('ENOTFOUND'),
      isConnectionError:
        fallbackError instanceof Error &&
        (fallbackError.message.includes('ECONNREFUSED') ||
          fallbackError.message.includes('ETIMEDOUT')),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });

    // Return a proper error Response with operation ID
    return createProxyErrorResponse(
      502, // Bad Gateway
      'Failed to fetch from fallback URL',
      JSON.stringify({
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        url: safeUrl,
        errorType:
          fallbackError instanceof Error ? fallbackError.constructor.name : typeof fallbackError,
        isFallback: true,
        opId,
      }),
      opId
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
 * Creates an error response for proxy download failures with environment-aware error details
 *
 * @param status HTTP status code
 * @param errorMessage User-facing error message
 * @param details Optional technical error details (only included in non-production)
 * @param operationId Optional operation ID for log correlation
 * @returns NextResponse with appropriate error information based on environment
 */
function createProxyErrorResponse(
  status: number,
  errorMessage: string,
  details?: string,
  operationId?: string
): NextResponse {
  // Determine error type based on status code
  let errorType = 'Processing error';
  let errorCategory = 'Unknown';

  if (status === 400) {
    errorType = 'Invalid request';
    errorCategory = 'Client';
  } else if (status === 401 || status === 403) {
    errorType = 'Access denied';
    errorCategory = 'Authorization';
  } else if (status === 404) {
    errorType = 'Resource not found';
    errorCategory = 'NotFound';
  } else if (status === 429) {
    errorType = 'Rate limit exceeded';
    errorCategory = 'RateLimit';
  } else if (status === 500) {
    errorType = 'Proxy error';
    errorCategory = 'Server';
  } else if (status === 502) {
    errorType = 'Gateway error';
    errorCategory = 'Gateway';
  } else if (status === 504) {
    errorType = 'Request timeout';
    errorCategory = 'Timeout';
  } else if (status >= 400 && status < 500) {
    errorCategory = 'Client';
  } else if (status >= 500) {
    errorCategory = 'Server';
  }

  // Create common response object with user-facing info
  const responseObj: Record<string, unknown> = {
    error: errorType,
    message: errorMessage,
    code: `${errorCategory}.${status}`,
  };

  // Add operation ID if available for tracking
  if (operationId) {
    responseObj.operationId = operationId;
  }

  // Add timestamp for all environments
  responseObj.timestamp = new Date().toISOString();

  // Add detailed technical information in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    // If details is a JSON string, parse it for better formatting
    let parsedDetails: unknown = details;
    if (details && details.startsWith('{') && details.endsWith('}')) {
      try {
        parsedDetails = JSON.parse(details);
      } catch {
        // If parsing fails, keep original string
        parsedDetails = details;
      }
    }

    // Add detailed error information for development/testing environments
    responseObj.details = parsedDetails;
    responseObj.env = process.env.NODE_ENV;
    responseObj.deployment = process.env.VERCEL_URL || 'local';

    // Add a more developer-friendly hint for certain error types
    if (status === 504) {
      responseObj.developerHint =
        'This is likely a timeout issue. Check if the upstream server is slow or unavailable.';
    } else if (status === 502) {
      responseObj.developerHint =
        'This indicates a problem communicating with the upstream server. Check if it is reachable and working correctly.';
    } else if (status === 500) {
      responseObj.developerHint =
        'This is a server-side error. Check the server logs for more details.';
    }
  } else {
    // For production, include a support reference code (operationId or generated)
    responseObj.ref = operationId || `err-${Date.now().toString(36)}`;
  }

  return NextResponse.json(responseObj, {
    status,
    // Add standard headers to help with debugging and tracking
    headers: {
      'X-Error-Type': errorType,
      'X-Error-Category': errorCategory,
      'X-Operation-ID': operationId || 'none',
    },
  });
}

/**
 * Extracts comprehensive error details from a Response object
 * This enhanced version includes more context and structured data
 *
 * @param response The response to extract error details from
 * @param log Logger instance
 * @param opId Optional operation ID for correlation
 * @returns Promise resolving to extracted error details or empty string
 */
async function extractErrorDetails(
  response: Response,
  log: Logger,
  opId?: string
): Promise<string> {
  try {
    // Clone the response to allow multiple reads
    const clonedResponse = response.clone();
    const errorStartTime = Date.now();

    // Get response headers for logging
    const headers: Record<string, string> = {};
    const securityHeaders: Record<string, string> = {};
    const corsHeaders: Record<string, string> = {};
    const cacheHeaders: Record<string, string> = {};
    const contentHeaders: Record<string, string> = {};

    // Categorize headers for better debugging
    clonedResponse.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();

      // Skip sensitive headers
      if (['authorization', 'cookie', 'set-cookie'].includes(lowerKey)) {
        return;
      }

      // Add to appropriate category
      if (
        ['x-content-type-options', 'content-security-policy', 'strict-transport-security'].includes(
          lowerKey
        )
      ) {
        securityHeaders[key] = value;
      } else if (lowerKey.startsWith('access-control-') || lowerKey === 'origin') {
        corsHeaders[key] = value;
      } else if (['cache-control', 'etag', 'last-modified', 'expires', 'age'].includes(lowerKey)) {
        cacheHeaders[key] = value;
      } else if (['content-type', 'content-length', 'content-encoding'].includes(lowerKey)) {
        contentHeaders[key] = value;
      }

      // Add to full headers collection
      headers[key] = value;
    });

    // Log response headers with categorization
    safeLog(log, 'debug', {
      msg: 'Response headers from failed fetch',
      opId,
      status: clonedResponse.status,
      statusText: clonedResponse.statusText,
      isError: clonedResponse.status >= 400,
      isClientError: clonedResponse.status >= 400 && clonedResponse.status < 500,
      isServerError: clonedResponse.status >= 500,
      headers,
      headerCategories: {
        security: securityHeaders,
        cors: corsHeaders,
        cache: cacheHeaders,
        content: contentHeaders,
      },
      timestamp: new Date().toISOString(),
    });

    // Try to parse as JSON first (many APIs return JSON error responses)
    let errorBody: string;
    let isJsonResponse = false;
    let parsedJson: unknown = null;

    try {
      // Check if response is JSON
      const contentType = clonedResponse.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const cloneForJson = clonedResponse.clone();
        const jsonText = await cloneForJson.text();
        parsedJson = JSON.parse(jsonText);
        isJsonResponse = true;
        errorBody = jsonText;
      } else {
        errorBody = await clonedResponse.text();
      }
    } catch {
      // If JSON parsing fails, fall back to text
      errorBody = await clonedResponse.text();
    }

    // Get truncated response body for logging
    const truncatedText = errorBody.substring(0, MAX_RESPONSE_BODY_LOG_LENGTH);
    const isTruncated = errorBody.length > MAX_RESPONSE_BODY_LOG_LENGTH;

    // Log truncated response body with enhanced context
    safeLog(log, 'debug', {
      msg: 'Response body from failed fetch',
      opId,
      bodyLength: errorBody.length,
      truncatedBody: truncatedText,
      truncated: isTruncated,
      truncatedAt: isTruncated ? MAX_RESPONSE_BODY_LOG_LENGTH : errorBody.length,
      contentType: clonedResponse.headers.get('content-type'),
      isJsonResponse,
      jsonErrorData: isJsonResponse ? parsedJson : undefined,
      processingTimeMs: Date.now() - errorStartTime,
      timestamp: new Date().toISOString(),
    });

    // Attempt to extract error message from parsedJson if available
    let structuredErrorMessage = '';
    if (isJsonResponse && parsedJson !== null && typeof parsedJson === 'object') {
      const jsonObj = parsedJson as Record<string, unknown>;

      // Look for common error fields in JSON responses
      const errorMessage =
        jsonObj.error_message ||
        jsonObj.errorMessage ||
        jsonObj.message ||
        jsonObj.error ||
        jsonObj.description ||
        jsonObj.detail;

      if (errorMessage && typeof errorMessage === 'string') {
        structuredErrorMessage = `Error: ${errorMessage}`;
      }
    }

    // Return the structured error if available, otherwise the truncated text
    return structuredErrorMessage || truncatedText;
  } catch (readError) {
    // Enhanced error logging for read errors
    safeLog(log, 'error', {
      msg: 'Could not read error response body',
      opId,
      error: readError instanceof Error ? readError.message : String(readError),
      stack: readError instanceof Error ? readError.stack : undefined,
      errorType: readError instanceof Error ? readError.constructor.name : typeof readError,
      responseStatus: response.status,
      responseStatusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      timestamp: new Date().toISOString(),
    });

    // Return a structured message about the failure
    return `[Error reading response: ${readError instanceof Error ? readError.message : String(readError)}]`;
  }
}

/**
 * Handles proxying of file downloads through the API
 * With improved error handling for network errors, timeouts, and other exceptions
 */
export async function proxyFileDownload(
  url: string,
  filename: string,
  log: Logger,
  requestParams?: Record<string, string | string[]>
): Promise<NextResponse> {
  // Create a unique operation ID for correlating logs within this request
  const opId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

  try {
    // Step 1: Log detailed information about the proxy request
    const sanitizedUrl = sanitizeUrlForLogging(url);
    safeLog(log, 'info', {
      msg: 'Proxy download request received',
      opId,
      url: sanitizedUrl,
      filename,
      requestParams,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });

    // Step 2: Log fetch attempt with additional context
    safeLog(log, 'debug', {
      msg: 'Initiating fetch operation for proxy download',
      opId,
      url: sanitizedUrl,
      cdnUrl: url.includes('.cdn.digitaloceanspaces.com'),
      timeoutMs: FETCH_TIMEOUT_MS,
      userAgent:
        process.env.NODE_ENV === 'development' ? 'Server (Development)' : 'Server (Production)',
    });

    // Step 3: Perform the fetch with fallback
    const startTime = Date.now();
    const fileResponse = await fetchWithFallback(url, log);
    const fetchDuration = Date.now() - startTime;

    // Step 4: Log response metrics
    safeLog(log, 'debug', {
      msg: 'Fetch completed',
      opId,
      url: sanitizedUrl,
      status: fileResponse.status,
      statusText: fileResponse.statusText,
      successful: fileResponse.ok,
      durationMs: fetchDuration,
      contentType: fileResponse.headers.get('content-type'),
      contentLength: fileResponse.headers.get('content-length'),
    });

    // Step 5: Handle error responses
    if (!fileResponse.ok) {
      // Extract error details from the response body if possible
      const errorDetails = await extractErrorDetails(fileResponse, log);

      safeLog(log, 'error', {
        msg: 'Failed to fetch file for proxying',
        opId,
        url: sanitizedUrl,
        status: fileResponse.status,
        statusText: fileResponse.statusText,
        errorDetails,
        durationMs: fetchDuration,
        requestParams,
      });

      // Get details about the CDN/server that generated the error
      const server = fileResponse.headers.get('server');
      const cfRay = fileResponse.headers.get('cf-ray'); // Cloudflare specific
      const xServedBy = fileResponse.headers.get('x-served-by');

      // Collect all headers for debugging (excluding sensitive ones)
      const responseHeaders: Record<string, string> = {};
      fileResponse.headers.forEach((value, key) => {
        if (!['authorization', 'cookie', 'set-cookie'].includes(key.toLowerCase())) {
          responseHeaders[key] = value;
        }
      });

      return createProxyErrorResponse(
        502,
        `Failed to fetch file (${fileResponse.status})`,
        JSON.stringify({
          errorDetails,
          server,
          cfRay,
          xServedBy,
          status: fileResponse.status,
          statusText: fileResponse.statusText,
          headers: responseHeaders,
          opId,
        }),
        opId
      );
    }

    // Step 6: Handle successful responses
    // Get content type from response
    const contentType = fileResponse.headers.get('content-type') || 'audio/mpeg';
    const contentLength = fileResponse.headers.get('content-length');

    // Create headers for the download
    const headers = createDownloadHeaders(contentType, filename);

    // Add content length if available
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Step 7: Log successful proxy setup with detailed metrics
    safeLog(log, 'info', {
      msg: 'Successfully set up file proxy',
      opId,
      url: sanitizedUrl,
      filename,
      contentType,
      contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
      durationMs: fetchDuration,
      cacheHit: fileResponse.headers.get('x-cache') === 'HIT',
      timestamp: new Date().toISOString(),
    });

    // Step 8: Start streaming the response
    safeLog(log, 'debug', {
      msg: 'Beginning to stream response to client',
      opId,
      contentType,
      responseBodyType: fileResponse.body ? 'ReadableStream' : 'null',
    });

    // Return the file stream
    return new NextResponse(fileResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    // Step 9: Handle exceptions during proxy process

    // Special handling for timeout errors
    if (error instanceof TimeoutError) {
      safeLog(log, 'error', {
        msg: 'Timeout in proxy download process',
        opId,
        url: sanitizeUrlForLogging(url),
        filename,
        timeoutMs: FETCH_TIMEOUT_MS,
        error: error.message,
        requestParams,
        timestamp: new Date().toISOString(),
      });

      return createProxyErrorResponse(
        504, // Gateway Timeout
        `Proxy download timed out after ${FETCH_TIMEOUT_MS}ms`,
        JSON.stringify({
          error: error.message,
          url: sanitizeUrlForLogging(url),
          timeoutMs: FETCH_TIMEOUT_MS,
          opId,
        }),
        opId
      );
    }

    // Detailed logging for all other errors
    safeLog(log, 'error', {
      msg: 'Unexpected error in proxy download process',
      opId,
      url: sanitizeUrlForLogging(url),
      filename,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      requestParams,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });

    // Enhanced error response with detailed information in non-production environments
    const errorDetails =
      error instanceof Error
        ? {
            message: error.message,
            name: error.name,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
            url: sanitizeUrlForLogging(url),
            filename,
          }
        : String(error);

    return createProxyErrorResponse(
      500,
      'Failed to proxy download through API',
      process.env.NODE_ENV !== 'production'
        ? JSON.stringify(errorDetails)
        : error instanceof Error
          ? error.message
          : String(error),
      opId
    );
  }
}
