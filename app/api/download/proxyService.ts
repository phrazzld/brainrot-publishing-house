import { NextResponse } from 'next/server';

import { AssetError, AssetErrorType, AssetType } from '@/types/assets';
import { AssetService } from '@/types/assets';
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
  } catch {
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
 * Creates appropriate headers for file download
 */
export function createDownloadHeaders(contentType: string, filename: string): Headers {
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  return headers;
}

/**
 * Handles proxying of file downloads through the API
 * Uses the unified asset service for consistent asset handling
 *
 * @param assetType Type of asset (audio, text, image)
 * @param bookSlug Book identifier
 * @param assetName Name of the specific asset
 * @param filename Filename for the download
 * @param log Logger instance
 * @param assetService Asset service for retrieving assets
 * @param requestParams Additional request parameters for context
 * @returns Promise resolving to NextResponse
 */
export async function proxyAssetDownload(
  assetType: AssetType,
  bookSlug: string,
  assetName: string,
  filename: string,
  log: Logger,
  assetService: AssetService,
  requestParams?: Record<string, string | string[]>
): Promise<NextResponse> {
  // Create a unique operation ID for correlating logs within this request
  const opId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  const operation = 'proxyAssetDownload';

  try {
    // Step 1: Log detailed information about the proxy request
    safeLog(log, 'info', {
      msg: 'Proxy download request received',
      opId,
      operation,
      assetType,
      bookSlug,
      assetName,
      filename,
      requestParams,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });

    // Step 2: Get the asset URL from the asset service
    safeLog(log, 'debug', {
      msg: 'Fetching asset URL',
      opId,
      operation,
      assetType,
      bookSlug,
      assetName,
    });

    let assetUrl: string;
    try {
      // Get URL from the AssetService
      assetUrl = await assetService.getAssetUrl(assetType, bookSlug, assetName);

      safeLog(log, 'debug', {
        msg: 'Asset URL retrieved successfully',
        opId,
        operation,
        assetUrl: sanitizeUrlForLogging(assetUrl),
      });
    } catch (assetError) {
      // Handle AssetError specifically
      if (assetError instanceof AssetError) {
        safeLog(log, 'error', {
          msg: 'Failed to get asset URL',
          opId,
          operation,
          assetType,
          bookSlug,
          assetName,
          errorType: assetError.type,
          errorMessage: assetError.message,
          statusCode: assetError.statusCode,
          assetPath: assetError.assetPath,
        });

        // Map AssetError to appropriate HTTP response
        const status =
          assetError.statusCode || assetError.type === AssetErrorType.NOT_FOUND
            ? 404
            : assetError.type === AssetErrorType.UNAUTHORIZED
              ? 401
              : assetError.type === AssetErrorType.FORBIDDEN
                ? 403
                : assetError.type === AssetErrorType.VALIDATION_ERROR
                  ? 400
                  : 500;

        const errorMessage =
          assetError.type === AssetErrorType.NOT_FOUND
            ? `Asset not found: ${assetError.assetPath || `${assetType}/${bookSlug}/${assetName}`}`
            : assetError.message;

        return createProxyErrorResponse(
          status,
          errorMessage,
          JSON.stringify({
            errorType: assetError.type,
            assetPath: assetError.assetPath,
            operation: assetError.operation,
            opId,
            assetType,
            bookSlug,
            assetName,
          }),
          opId
        );
      }

      // Handle other errors
      safeLog(log, 'error', {
        msg: 'Unexpected error getting asset URL',
        opId,
        operation,
        assetType,
        bookSlug,
        assetName,
        error: assetError instanceof Error ? assetError.message : String(assetError),
        stack: assetError instanceof Error ? assetError.stack : undefined,
      });

      return createProxyErrorResponse(
        500,
        'Failed to retrieve asset URL',
        JSON.stringify({
          error: assetError instanceof Error ? assetError.message : String(assetError),
          assetType,
          bookSlug,
          assetName,
          opId,
        }),
        opId
      );
    }

    // Step 3: Perform the fetch with timeout handling
    safeLog(log, 'debug', {
      msg: 'Initiating fetch operation for asset download',
      opId,
      operation,
      assetUrl: sanitizeUrlForLogging(assetUrl),
      timeoutMs: FETCH_TIMEOUT_MS,
    });

    // Performance metrics tracking
    const metrics = {
      fetchStartTime: Date.now(),
      downloadEndTime: 0,
      totalDuration: 0,
    };

    let fileResponse: Response;
    try {
      // Use fetchWithTimeout to handle timeouts
      fileResponse = await fetchWithTimeout(
        assetUrl,
        {
          headers: {
            Accept: '*/*',
            'User-Agent': `Brainrot-Publishing-House/${process.env.NEXT_PUBLIC_APP_VERSION || 'dev'} (${process.env.NODE_ENV})`,
          },
        },
        FETCH_TIMEOUT_MS
      );

      // Calculate fetch duration
      metrics.downloadEndTime = Date.now();
      metrics.totalDuration = metrics.downloadEndTime - metrics.fetchStartTime;

      safeLog(log, 'debug', {
        msg: 'Asset fetch completed',
        opId,
        operation,
        assetUrl: sanitizeUrlForLogging(assetUrl),
        status: fileResponse.status,
        statusText: fileResponse.statusText,
        successful: fileResponse.ok,
        durationMs: metrics.totalDuration,
        contentType: fileResponse.headers.get('content-type'),
        contentLength: fileResponse.headers.get('content-length'),
        performance: {
          isSlowRequest: metrics.totalDuration > 2000,
          durationMs: metrics.totalDuration,
        },
      });
    } catch (fetchError) {
      // Calculate duration even for errors
      metrics.downloadEndTime = Date.now();
      metrics.totalDuration = metrics.downloadEndTime - metrics.fetchStartTime;

      // Special handling for timeout errors
      if (fetchError instanceof TimeoutError) {
        safeLog(log, 'error', {
          msg: 'Timeout fetching asset',
          opId,
          operation,
          assetUrl: sanitizeUrlForLogging(assetUrl),
          timeoutMs: FETCH_TIMEOUT_MS,
          durationMs: metrics.totalDuration,
          error: fetchError.message,
        });

        return createProxyErrorResponse(
          504, // Gateway Timeout
          `Asset download timed out after ${FETCH_TIMEOUT_MS}ms`,
          JSON.stringify({
            error: fetchError.message,
            assetUrl: sanitizeUrlForLogging(assetUrl),
            timeoutMs: FETCH_TIMEOUT_MS,
            assetType,
            bookSlug,
            assetName,
            opId,
          }),
          opId
        );
      }

      // Handle other fetch errors
      safeLog(log, 'error', {
        msg: 'Error fetching asset',
        opId,
        operation,
        assetUrl: sanitizeUrlForLogging(assetUrl),
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
        durationMs: metrics.totalDuration,
      });

      return createProxyErrorResponse(
        502, // Bad Gateway
        'Failed to fetch asset from storage',
        JSON.stringify({
          error: fetchError instanceof Error ? fetchError.message : String(fetchError),
          assetUrl: sanitizeUrlForLogging(assetUrl),
          assetType,
          bookSlug,
          assetName,
          opId,
        }),
        opId
      );
    }

    // Step 4: Handle error responses from the fetch
    if (!fileResponse.ok) {
      // Extract error details from the response
      const errorDetails = await extractErrorDetails(fileResponse, log, opId);

      safeLog(log, 'error', {
        msg: 'Failed to fetch asset with error status',
        opId,
        operation,
        assetUrl: sanitizeUrlForLogging(assetUrl),
        status: fileResponse.status,
        statusText: fileResponse.statusText,
        errorDetails,
        durationMs: metrics.totalDuration,
      });

      // Collect headers for debugging (excluding sensitive ones)
      const responseHeaders: Record<string, string> = {};
      fileResponse.headers.forEach((value, key) => {
        if (!['authorization', 'cookie', 'set-cookie'].includes(key.toLowerCase())) {
          responseHeaders[key] = value;
        }
      });

      return createProxyErrorResponse(
        fileResponse.status === 404 ? 404 : 502,
        `Failed to fetch asset (${fileResponse.status})`,
        JSON.stringify({
          errorDetails,
          status: fileResponse.status,
          statusText: fileResponse.statusText,
          headers: responseHeaders,
          assetType,
          bookSlug,
          assetName,
          opId,
        }),
        opId
      );
    }

    // Step 5: Handle successful responses
    // Get content type from response
    const contentType = fileResponse.headers.get('content-type') || 'audio/mpeg';
    const contentLength = fileResponse.headers.get('content-length');

    // Create headers for the download
    const headers = createDownloadHeaders(contentType, filename);

    // Add content length if available
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Step 6: Log successful proxy setup
    safeLog(log, 'info', {
      msg: 'Successfully set up asset proxy',
      opId,
      operation,
      assetType,
      bookSlug,
      assetName,
      filename,
      contentType,
      contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
      durationMs: metrics.totalDuration,
      performance: {
        isSlowRequest: metrics.totalDuration > 2000,
        durationMs: metrics.totalDuration,
      },
      timestamp: new Date().toISOString(),
    });

    // Step 7: Stream the response to the client
    safeLog(log, 'debug', {
      msg: 'Beginning to stream asset to client',
      opId,
      operation,
      contentType,
      responseBodyType: fileResponse.body ? 'ReadableStream' : 'null',
    });

    // Return the file stream
    return new NextResponse(fileResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    // Step 8: Handle unexpected errors
    safeLog(log, 'error', {
      msg: 'Unexpected error in proxy download process',
      opId,
      operation,
      assetType,
      bookSlug,
      assetName,
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
            assetType,
            bookSlug,
            assetName,
            filename,
          }
        : String(error);

    return createProxyErrorResponse(
      500,
      'Failed to proxy asset download',
      process.env.NODE_ENV !== 'production'
        ? JSON.stringify(errorDetails)
        : error instanceof Error
          ? error.message
          : String(error),
      opId
    );
  }
}

/**
 * Legacy handler for proxying file downloads through the API
 * @deprecated Use proxyAssetDownload instead
 */
export async function proxyFileDownload(
  url: string,
  filename: string,
  log: Logger,
  requestParams?: Record<string, string | string[]>
): Promise<NextResponse> {
  // Create a unique operation ID for correlating logs within this request
  const opId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

  safeLog(log, 'warn', {
    msg: 'Using deprecated proxyFileDownload function',
    opId,
    url: sanitizeUrlForLogging(url),
    timestamp: new Date().toISOString(),
  });

  try {
    // Step 1: Log detailed information about the proxy request
    const sanitizedUrl = sanitizeUrlForLogging(url);
    safeLog(log, 'info', {
      msg: 'Legacy proxy download request received',
      opId,
      url: sanitizedUrl,
      filename,
      requestParams,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });

    // Step 2: Perform the fetch
    const startTime = Date.now();
    const fileResponse = await fetchWithTimeout(url);
    const fetchDuration = Date.now() - startTime;

    // Step 3: Log response metrics
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

    // Step 4: Handle error responses
    if (!fileResponse.ok) {
      // Extract error details from the response body if possible
      const errorDetails = await extractErrorDetails(fileResponse, log, opId);

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
          status: fileResponse.status,
          statusText: fileResponse.statusText,
          headers: responseHeaders,
          opId,
        }),
        opId
      );
    }

    // Step 5: Handle successful responses
    // Get content type from response
    const contentType = fileResponse.headers.get('content-type') || 'audio/mpeg';
    const contentLength = fileResponse.headers.get('content-length');

    // Create headers for the download
    const headers = createDownloadHeaders(contentType, filename);

    // Add content length if available
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Step 6: Log successful proxy setup
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

    // Step 7: Stream the response
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
    // Step 8: Handle exceptions during proxy process

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
