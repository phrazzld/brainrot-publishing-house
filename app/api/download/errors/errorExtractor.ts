import { Logger } from '@/utils/logger';

import { MAX_RESPONSE_BODY_LOG_LENGTH, safeLog } from '../logging/safeLogger';

/**
 * Configuration for extracting error details
 */
export type ErrorDetailsConfig = {
  /** The response to extract error details from */
  response: Response;
  /** Logger instance */
  log: Logger;
  /** Optional operation ID for correlation */
  opId?: string;
};

/**
 * Categorizes headers into logical groups for better debugging
 *
 * @param headers Response headers
 * @returns Object with categorized headers
 */
function categorizeHeaders(headers: Headers): {
  all: Record<string, string>;
  security: Record<string, string>;
  cors: Record<string, string>;
  cache: Record<string, string>;
  content: Record<string, string>;
} {
  const allHeaders: Record<string, string> = {};
  const securityHeaders: Record<string, string> = {};
  const corsHeaders: Record<string, string> = {};
  const cacheHeaders: Record<string, string> = {};
  const contentHeaders: Record<string, string> = {};

  // Categorize headers for better debugging
  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    // Skip sensitive headers
    if (['authorization', 'cookie', 'set-cookie'].includes(lowerKey)) {
      return;
    }

    // Add to appropriate category
    if (
      ['x-content-type-options', 'content-security-policy', 'strict-transport-security'].includes(
        lowerKey,
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
    allHeaders[key] = value;
  });

  return {
    all: allHeaders,
    security: securityHeaders,
    cors: corsHeaders,
    cache: cacheHeaders,
    content: contentHeaders,
  };
}

/**
 * Logs response headers with categorization
 *
 * @param response The response
 * @param log Logger instance
 * @param opId Operation ID for correlation
 */
function logResponseHeaders(response: Response, log: Logger, opId?: string): void {
  const categorizedHeaders = categorizeHeaders(response.headers);

  safeLog(log, 'debug', {
    msg: 'Response headers from failed fetch',
    opId,
    status: response.status,
    statusText: response.statusText,
    isError: response.status >= 400,
    isClientError: response.status >= 400 && response.status < 500,
    isServerError: response.status >= 500,
    headers: categorizedHeaders.all,
    headerCategories: {
      security: categorizedHeaders.security,
      cors: categorizedHeaders.cors,
      cache: categorizedHeaders.cache,
      content: categorizedHeaders.content,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Extracts a structured error message from JSON response data
 *
 * @param jsonData The parsed JSON data
 * @returns Structured error message or empty string if not found
 */
function extractStructuredErrorMessage(jsonData: Record<string, unknown>): string {
  // Look for common error fields in JSON responses
  const errorMessage =
    jsonData.error_message ||
    jsonData.errorMessage ||
    jsonData.message ||
    jsonData.error ||
    jsonData.description ||
    jsonData.detail;

  if (errorMessage && typeof errorMessage === 'string') {
    return `Error: ${errorMessage}`;
  }

  return '';
}

/**
 * Tries to parse and extract JSON error information
 *
 * @param response The response to extract from
 * @returns Object with parsed results and error body
 */
async function parseJsonErrorResponse(response: Response): Promise<{
  errorBody: string;
  isJsonResponse: boolean;
  parsedJson: unknown | null;
}> {
  // Check if response is JSON
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const jsonText = await response.text();
    try {
      const parsedJson = JSON.parse(jsonText);
      return {
        errorBody: jsonText,
        isJsonResponse: true,
        parsedJson,
      };
    } catch {
      // If JSON parsing fails, treat as text
      return {
        errorBody: jsonText,
        isJsonResponse: false,
        parsedJson: null,
      };
    }
  } else {
    // Not a JSON response
    const textContent = await response.text();
    return {
      errorBody: textContent,
      isJsonResponse: false,
      parsedJson: null,
    };
  }
}

/**
 * Log details about the response body
 *
 * @param logContext Context information for logging
 */
function logResponseBody(logContext: {
  errorBody: string;
  log: Logger;
  opId?: string;
  isJsonResponse: boolean;
  parsedJson: unknown | null;
  startTime: number;
}): void {
  const { errorBody, log, opId, isJsonResponse, parsedJson, startTime } = logContext;

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
    contentType: isJsonResponse ? 'application/json' : 'text/plain',
    isJsonResponse,
    jsonErrorData: isJsonResponse ? parsedJson : undefined,
    processingTimeMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Extracts comprehensive error details from a Response object
 * This enhanced version includes more context and structured data
 *
 * @param config Configuration object containing all parameters
 * @returns Promise resolving to extracted error details or empty string
 */
export async function extractErrorDetails(config: ErrorDetailsConfig): Promise<string> {
  const { response, log, opId } = config;
  try {
    // Clone the response to allow multiple reads
    const clonedResponse = response.clone();
    const errorStartTime = Date.now();

    // Step 1: Process and log response headers
    logResponseHeaders(clonedResponse, log, opId);

    // Step 2: Parse response body (JSON or text)
    const { errorBody, isJsonResponse, parsedJson } = await parseJsonErrorResponse(clonedResponse);

    // Step 3: Log the response body
    logResponseBody({
      errorBody,
      log,
      opId,
      isJsonResponse,
      parsedJson,
      startTime: errorStartTime,
    });

    // Step 4: Attempt to extract error message from parsedJson if available
    let structuredErrorMessage = '';
    if (isJsonResponse && parsedJson !== null && typeof parsedJson === 'object') {
      structuredErrorMessage = extractStructuredErrorMessage(parsedJson as Record<string, unknown>);
    }

    // Return the structured error if available, otherwise the truncated text
    return structuredErrorMessage || errorBody.substring(0, MAX_RESPONSE_BODY_LOG_LENGTH);
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
