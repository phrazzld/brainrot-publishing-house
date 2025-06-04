import { NextResponse } from 'next/server';

import { Logger } from '@/utils/logger.js';

import { extractErrorDetails } from '../errors/errorExtractor.js';
import { createProxyErrorResponse } from '../errors/errorResponses.js';
import { TimeoutError } from '../errors/errorTypes.js';
import { safeLog, sanitizeUrlForLogging } from '../logging/safeLogger.js';
import { createDownloadHeaders } from '../responses/responseHeaders.js';
import { FETCH_TIMEOUT_MS, fetchWithTimeout } from './fetchWithTimeout.js';

/**
 * Configuration for legacy proxy file downloads
 */
export type ProxyFileConfig = {
  /** URL to the file */
  url: string;
  /** Filename for the download */
  filename: string;
  /** Logger instance */
  log: Logger;
  /** Additional request parameters for context */
  requestParams?: Record<string, string | string[]>;
};

/**
 * Context for logging proxy operations
 */
type ProxyLogContext = {
  url: string;
  log: Logger;
  opId: string;
  timestamp?: string;
};

/**
 * Logs the start of a legacy proxy request
 */
function logLegacyProxyStart(
  context: ProxyLogContext & {
    filename: string;
    requestParams?: Record<string, string | string[]>;
  },
): void {
  const { url, log, opId, filename, requestParams } = context;
  const sanitizedUrl = sanitizeUrlForLogging(url);

  safeLog(log, 'warn', {
    msg: 'Using deprecated proxyFileDownload function',
    opId,
    url: sanitizedUrl,
    timestamp: new Date().toISOString(),
  });

  safeLog(log, 'info', {
    msg: 'Legacy proxy download request received',
    opId,
    url: sanitizedUrl,
    filename,
    requestParams,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
}

/**
 * Logs the fetch completion
 */
function logFetchCompletion(
  context: ProxyLogContext & {
    response: Response;
    fetchDuration: number;
  },
): void {
  const { url, response, fetchDuration, log, opId } = context;

  safeLog(log, 'debug', {
    msg: 'Fetch completed',
    opId,
    url: sanitizeUrlForLogging(url),
    status: response.status,
    statusText: response.statusText,
    successful: response.ok,
    durationMs: fetchDuration,
    contentType: response.headers.get('content-type'),
    contentLength: response.headers.get('content-length'),
  });
}

/**
 * Gets non-sensitive headers from a response
 */
function getSafeResponseHeaders(response: Response): Record<string, string> {
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    if (!['authorization', 'cookie', 'set-cookie'].includes(key.toLowerCase())) {
      responseHeaders[key] = value;
    }
  });
  return responseHeaders;
}

/**
 * Handles the error case for legacy proxy
 */
async function handleLegacyProxyError(
  context: ProxyLogContext & {
    response: Response;
    fetchDuration: number;
    requestParams?: Record<string, string | string[]>;
  },
): Promise<NextResponse> {
  const { url, response, fetchDuration, log, opId, requestParams } = context;
  const sanitizedUrl = sanitizeUrlForLogging(url);

  // Extract error details from the response body if possible
  const errorDetails = await extractErrorDetails({
    response,
    log,
    opId,
  });

  safeLog(log, 'error', {
    msg: 'Failed to fetch file for proxying',
    opId,
    url: sanitizedUrl,
    status: response.status,
    statusText: response.statusText,
    errorDetails,
    durationMs: fetchDuration,
    requestParams,
  });

  // Collect all headers for debugging (excluding sensitive ones)
  const responseHeaders = getSafeResponseHeaders(response);

  return createProxyErrorResponse({
    status: 502,
    errorMessage: `Failed to fetch file (${response.status})`,
    details: JSON.stringify({
      errorDetails,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      opId,
    }),
    operationId: opId,
  });
}

/**
 * Creates a success response for the legacy proxy
 */
function createLegacyProxySuccessResponse(
  context: ProxyLogContext & {
    response: Response;
    filename: string;
    fetchDuration: number;
  },
): NextResponse {
  const { url, response, filename, fetchDuration, log, opId } = context;
  const sanitizedUrl = sanitizeUrlForLogging(url);

  // Get content type from response
  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const contentLength = response.headers.get('content-length');

  // Create headers for the download
  const headers = createDownloadHeaders(contentType, filename);

  // Add content length if available
  if (contentLength) {
    headers.set('Content-Length', contentLength);
  }

  // Log successful proxy setup
  safeLog(log, 'info', {
    msg: 'Successfully set up file proxy',
    opId,
    url: sanitizedUrl,
    filename,
    contentType,
    contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
    durationMs: fetchDuration,
    timestamp: new Date().toISOString(),
  });

  // Log starting to stream the response
  safeLog(log, 'debug', {
    msg: 'Beginning to stream response to client',
    opId,
    contentType,
    responseBodyType: response.body ? 'ReadableStream' : 'null',
  });

  // Return the file stream
  return new NextResponse(response.body, {
    status: 200,
    headers,
  });
}

/**
 * Creates error details for proxy errors
 */
function createErrorDetails(
  error: unknown,
  url: string,
  filename: string,
): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      url: sanitizeUrlForLogging(url),
      filename,
    };
  }

  return { error: String(error) };
}

/**
 * Handles errors during the legacy proxy process
 */
function handleLegacyProxyException(
  context: ProxyLogContext & {
    error: unknown;
    filename: string;
    requestParams?: Record<string, string | string[]>;
  },
): NextResponse {
  const { url, error, filename, requestParams, log, opId } = context;
  const sanitizedUrl = sanitizeUrlForLogging(url);

  // Special handling for timeout errors
  if (error instanceof TimeoutError) {
    safeLog(log, 'error', {
      msg: 'Timeout in proxy download process',
      opId,
      url: sanitizedUrl,
      filename,
      timeoutMs: FETCH_TIMEOUT_MS,
      error: error.message,
      requestParams,
      timestamp: new Date().toISOString(),
    });

    return createProxyErrorResponse({
      status: 504, // Gateway Timeout
      errorMessage: `Proxy download timed out after ${FETCH_TIMEOUT_MS}ms`,
      details: JSON.stringify({
        error: error.message,
        url: sanitizedUrl,
        timeoutMs: FETCH_TIMEOUT_MS,
        opId,
      }),
      operationId: opId,
    });
  }

  // Detailed logging for all other errors
  safeLog(log, 'error', {
    msg: 'Unexpected error in proxy download process',
    opId,
    url: sanitizedUrl,
    filename,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    requestParams,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });

  // Enhanced error response with detailed information in non-production environments
  const errorDetails = createErrorDetails(error, url, filename);

  return createProxyErrorResponse({
    status: 500,
    errorMessage: 'Failed to proxy download through API',
    details:
      process.env.NODE_ENV !== 'production'
        ? JSON.stringify(errorDetails)
        : error instanceof Error
          ? error.message
          : String(error),
    operationId: opId,
  });
}

/**
 * Legacy handler for proxying file downloads through the API
 * @deprecated Use proxyAssetDownload instead
 *
 * @param config Configuration for the proxy operation
 * @returns Promise resolving to NextResponse
 */
export async function proxyFileDownload(config: ProxyFileConfig): Promise<NextResponse> {
  const { url, filename, log, requestParams } = config;
  // Create a unique operation ID for correlating logs within this request
  const opId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

  try {
    // Step 1: Log detailed information about the proxy request
    logLegacyProxyStart({ url, filename, requestParams, log, opId });

    // Step 2: Perform the fetch
    const startTime = Date.now();
    const fileResponse = await fetchWithTimeout(url);
    const fetchDuration = Date.now() - startTime;

    // Step 3: Log response metrics
    logFetchCompletion({ url, response: fileResponse, fetchDuration, log, opId });

    // Step 4: Handle error responses
    if (!fileResponse.ok) {
      return await handleLegacyProxyError({
        url,
        response: fileResponse,
        fetchDuration,
        log,
        opId,
        requestParams,
      });
    }

    // Step 5: Handle successful responses
    return createLegacyProxySuccessResponse({
      url,
      response: fileResponse,
      filename,
      fetchDuration,
      log,
      opId,
    });
  } catch (error) {
    // Step 6: Handle exceptions during proxy process
    return handleLegacyProxyException({
      url,
      error,
      filename,
      requestParams,
      log,
      opId,
    });
  }
}
