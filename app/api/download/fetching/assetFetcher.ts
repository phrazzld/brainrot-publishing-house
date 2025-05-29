import { NextResponse } from 'next/server';

import { AssetType } from '@/types/assets';
import { Logger } from '@/utils/logger';

import { extractErrorDetails } from '../errors/errorExtractor';
import { createProxyErrorResponse } from '../errors/errorResponses';
import { TimeoutError } from '../errors/errorTypes';
import { safeLog, sanitizeUrlForLogging } from '../logging/safeLogger';
import { createDownloadHeaders } from '../responses/responseHeaders';
import { FETCH_TIMEOUT_MS, fetchWithTimeout } from './fetchWithTimeout';

/**
 * Result of a successful fetch operation
 */
export type FetchSuccessResult = {
  fileResponse: Response;
  metrics: {
    fetchStartTime: number;
    downloadEndTime: number;
    totalDuration: number;
  };
};

/**
 * Result of a failed fetch operation
 */
export type FetchErrorResult = {
  error: NextResponse;
};

/**
 * Combined result type for fetch operations
 */
export type FetchResult = FetchSuccessResult | FetchErrorResult;

/**
 * Parameters for fetching an asset with logging
 */
export type FetchAssetParams = {
  assetUrl: string;
  log: Logger;
  opId: string;
  operation: string;
  assetType: AssetType;
  bookSlug: string;
  assetName: string;
};

/**
 * Fetches an asset with timeout handling and comprehensive logging
 * 
 * @param params Parameters for the fetch operation
 * @returns Promise resolving to fetch result
 */
export async function fetchAssetWithLogging(params: FetchAssetParams): Promise<FetchResult> {
  const { assetUrl, log, opId, operation, assetType, bookSlug, assetName } = params;

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

  try {
    // Use fetchWithTimeout to handle timeouts
    const fileResponse = await fetchWithTimeout(
      assetUrl,
      {
        headers: {
          Accept: '*/*',
          'User-Agent': `Brainrot-Publishing-House/${process.env.NEXT_PUBLIC_APP_VERSION || 'dev'} (${process.env.NODE_ENV})`,
        },
      },
      FETCH_TIMEOUT_MS,
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

    return { fileResponse, metrics };
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

      return {
        error: createProxyErrorResponse({
          status: 504, // Gateway Timeout
          errorMessage: `Asset download timed out after ${FETCH_TIMEOUT_MS}ms`,
          details: JSON.stringify({
            error: fetchError.message,
            assetUrl: sanitizeUrlForLogging(assetUrl),
            timeoutMs: FETCH_TIMEOUT_MS,
            assetType,
            bookSlug,
            assetName,
            opId,
          }),
          operationId: opId,
        }),
      };
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

    return {
      error: createProxyErrorResponse({
        status: 502, // Bad Gateway
        errorMessage: 'Failed to fetch asset from storage',
        details: JSON.stringify({
          error: fetchError instanceof Error ? fetchError.message : String(fetchError),
          assetUrl: sanitizeUrlForLogging(assetUrl),
          assetType,
          bookSlug,
          assetName,
          opId,
        }),
        operationId: opId,
      }),
    };
  }
}

/**
 * Parameters for handling error responses
 */
export type HandleErrorResponseParams = {
  fileResponse: Response;
  log: Logger;
  opId: string;
  operation: string;
  assetUrl: string;
  assetType: AssetType;
  bookSlug: string;
  assetName: string;
  metrics: {
    totalDuration: number;
  };
};

/**
 * Handles error responses from the fetch operation
 * 
 * @param params Parameters for error handling
 * @returns Promise resolving to error response
 */
export async function handleErrorResponse(params: HandleErrorResponseParams): Promise<NextResponse> {
  const { fileResponse, log, opId, operation, assetUrl, assetType, bookSlug, assetName, metrics } =
    params;

  // Extract error details from the response
  const errorDetails = await extractErrorDetails({
    response: fileResponse,
    log,
    opId,
  });

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

  return createProxyErrorResponse({
    status: fileResponse.status === 404 ? 404 : 502,
    errorMessage: `Failed to fetch asset (${fileResponse.status})`,
    details: JSON.stringify({
      errorDetails,
      status: fileResponse.status,
      statusText: fileResponse.statusText,
      headers: responseHeaders,
      assetType,
      bookSlug,
      assetName,
      opId,
    }),
    operationId: opId,
  });
}

/**
 * Parameters for creating a success response
 */
export type CreateSuccessResponseParams = {
  fileResponse: Response;
  filename: string;
  log: Logger;
  opId: string;
  operation: string;
  assetType: AssetType;
  bookSlug: string;
  assetName: string;
  metrics: {
    totalDuration: number;
  };
};

/**
 * Creates a success response for a file download
 * 
 * @param params Parameters for creating the success response
 * @returns NextResponse with the file content
 */
export function createSuccessResponse(params: CreateSuccessResponseParams): NextResponse {
  const { fileResponse, filename, log, opId, operation, assetType, bookSlug, assetName, metrics } =
    params;

  // Get content type from response
  const contentType = fileResponse.headers.get('content-type') || 'audio/mpeg';
  const contentLength = fileResponse.headers.get('content-length');

  // Create headers for the download
  const headers = createDownloadHeaders(contentType, filename);

  // Add content length if available
  if (contentLength) {
    headers.set('Content-Length', contentLength);
  }

  // Log successful proxy setup
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

  // Log starting to stream the response
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
}