import { NextResponse } from 'next/server';

import { AssetError, AssetErrorType } from '@/types/assets';
import { AssetNotFoundError } from '@/types/dependencies';
import { Logger } from '@/utils/logger';

/**
 * Parameters for download service error handling
 */
interface DownloadParams {
  slug: string;
  type: 'full' | 'chapter';
  chapter?: string;
  correlationId: string;
}

/**
 * Safely logs errors to prevent logger crashes
 */
export function safeLog(
  logger: Logger,
  level: 'info' | 'warn' | 'error' | 'debug',
  data: Record<string, unknown>
) {
  try {
    logger[level](data);
  } catch {
    // Fallback to console if logger fails
    console.error(`[${level.toUpperCase()}]`, data);
  }
}

/**
 * Maps an HTTP status code from AssetError to the appropriate response status
 */
function mapAssetErrorTypeToStatus(errorType: AssetErrorType): number {
  switch (errorType) {
    case AssetErrorType.NOT_FOUND:
      return 404;
    case AssetErrorType.UNAUTHORIZED:
      return 401;
    case AssetErrorType.FORBIDDEN:
      return 403;
    case AssetErrorType.CONFLICT:
      return 409;
    case AssetErrorType.VALIDATION_ERROR:
      return 400;
    case AssetErrorType.NETWORK_ERROR:
      return 502;
    case AssetErrorType.STORAGE_ERROR:
      return 500;
    default:
      return 500;
  }
}

/**
 * Creates a consistent error response object
 */
function createErrorResponse(
  responseData: {
    message: string;
    error: string;
    correlationId: string;
    additionalDetails?: Record<string, unknown>;
  },
  status: number
): NextResponse {
  const { message, error, correlationId, additionalDetails = {} } = responseData;

  return NextResponse.json(
    {
      error,
      message,
      correlationId,
      ...additionalDetails,
    },
    { status }
  );
}

/**
 * Generates a user-friendly message for asset not found errors
 */
function getAssetNotFoundMessage(assetType: 'full' | 'chapter', slug: string): string {
  return `The requested ${assetType === 'full' ? 'audiobook' : 'chapter'} for "${slug}" could not be found`;
}

/**
 * Logs AssetError details with appropriate log level
 */
function logAssetError(
  error: AssetError,
  params: DownloadParams,
  log: Logger,
  isNotFound: boolean
): void {
  const { slug, type, chapter } = params;

  safeLog(log, isNotFound ? 'warn' : 'error', {
    msg: `AssetService error: ${error.type}`,
    slug,
    type,
    chapter,
    errorType: error.type,
    operation: error.operation,
    statusCode: error.statusCode,
    assetPath: error.assetPath,
    error: error.message,
    cause: error.cause,
  });
}

/**
 * Logs unexpected error details
 */
function logUnexpectedError(error: unknown, params: DownloadParams, log: Logger): void {
  const { slug, type, chapter } = params;

  safeLog(log, 'error', {
    msg: 'Unexpected error in download API',
    slug,
    type,
    chapter,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
  });
}

/**
 * Handles AssetError instances with appropriate status and messaging
 */
function handleAssetError(error: AssetError, params: DownloadParams, log: Logger): NextResponse {
  const { correlationId, type, slug } = params;
  const status = mapAssetErrorTypeToStatus(error.type);
  const isNotFound = error.type === AssetErrorType.NOT_FOUND;

  logAssetError(error, params, log, isNotFound);

  const userFacingMessage = isNotFound
    ? getAssetNotFoundMessage(type, slug)
    : `Failed to process download request: ${error.message}`;

  return createErrorResponse(
    {
      message: userFacingMessage,
      error: isNotFound ? 'Resource not found' : 'Asset service error',
      correlationId,
      additionalDetails: { type: error.type, operation: error.operation },
    },
    status
  );
}

/**
 * Handles legacy AssetNotFoundError with 404 response
 */
function handleAssetNotFoundError(
  error: AssetNotFoundError,
  params: DownloadParams,
  log: Logger
): NextResponse {
  const { slug, type, chapter, correlationId } = params;

  safeLog(log, 'warn', {
    msg: 'Asset not found',
    slug,
    type,
    chapter,
    error: error.message,
  });

  return createErrorResponse(
    {
      message: getAssetNotFoundMessage(type, slug),
      error: 'Resource not found',
      correlationId,
      additionalDetails: { type: 'NOT_FOUND' },
    },
    404
  );
}

/**
 * Handles unexpected errors with 500 response
 */
function handleUnexpectedError(error: unknown, params: DownloadParams, log: Logger): NextResponse {
  const { correlationId } = params;

  logUnexpectedError(error, params, log);

  const responseDetails: Record<string, unknown> = {
    type: 'SERVER_ERROR',
  };

  // Include more details in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    responseDetails.details = error instanceof Error ? error.message : String(error);
    responseDetails.errorType = error instanceof Error ? error.constructor.name : typeof error;
  }

  return createErrorResponse(
    {
      message: 'An unexpected error occurred. Please try again later.',
      error: 'Internal server error',
      correlationId,
      additionalDetails: responseDetails,
    },
    500
  );
}

/**
 * Maps a download service error to an appropriate NextResponse
 * @param error - The error that occurred during download service execution
 * @param params - Request parameters and metadata for error context
 * @param log - Logger instance for recording errors
 * @returns NextResponse with appropriate status code and error details
 */
export function handleDownloadServiceError(
  error: unknown,
  params: DownloadParams,
  log: Logger
): NextResponse {
  if (error instanceof AssetError) {
    return handleAssetError(error, params, log);
  }

  if (error instanceof AssetNotFoundError) {
    return handleAssetNotFoundError(error, params, log);
  }

  return handleUnexpectedError(error, params, log);
}

/**
 * Logs critical error details
 */
function logCriticalError(error: unknown, correlationId: string, log: Logger): void {
  safeLog(log, 'error', {
    msg: 'Critical error in download API route',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    correlationId,
  });
}

/**
 * Handles critical errors that occur during route handler execution
 * @param error - The critical error that occurred
 * @param correlationId - Request correlation ID for error tracking
 * @param log - Logger instance for recording errors
 * @returns NextResponse with 500 status and error details
 */
export function handleCriticalError(
  error: unknown,
  correlationId: string,
  log: Logger
): NextResponse {
  logCriticalError(error, correlationId, log);

  const responseDetails: Record<string, unknown> = {
    type: 'CRITICAL_ERROR',
  };

  // Include more details in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    responseDetails.details = error instanceof Error ? error.message : String(error);
    responseDetails.errorType = error instanceof Error ? error.constructor.name : typeof error;
    if (error instanceof Error && error.stack) {
      responseDetails.stack = error.stack.split('\n').slice(0, 5).join('\n');
    }
  }

  return createErrorResponse(
    {
      message: 'An unexpected error occurred. Please try again later.',
      error: 'Internal server error',
      correlationId,
      additionalDetails: responseDetails,
    },
    500
  );
}
