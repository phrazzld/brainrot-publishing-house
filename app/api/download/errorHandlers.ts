import { NextResponse } from 'next/server';

import { AssetError, AssetErrorType } from '@/types/assets';
import { AssetNotFoundError } from '@/types/dependencies';
import { Logger } from '@/utils/logger';

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
 * Maps a download service error to an appropriate NextResponse
 * @param error - The error that occurred during download service execution
 * @param params - Request parameters and metadata for error context
 * @param log - Logger instance for recording errors
 * @returns NextResponse with appropriate status code and error details
 */
export function handleDownloadServiceError(
  error: unknown,
  params: {
    slug: string;
    type: 'full' | 'chapter';
    chapter?: string;
    correlationId: string;
  },
  log: Logger
): NextResponse {
  // Extract parameters for cleaner code
  const { slug, type, chapter, correlationId } = params;

  // Handle AssetError from the unified AssetService
  if (error instanceof AssetError) {
    const status = mapAssetErrorTypeToStatus(error.type);
    const isNotFound = error.type === AssetErrorType.NOT_FOUND;

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

    const userFacingMessage = isNotFound
      ? `The requested ${type === 'full' ? 'audiobook' : 'chapter'} for "${slug}" could not be found`
      : `Failed to process download request: ${error.message}`;

    return NextResponse.json(
      {
        error: isNotFound ? 'Resource not found' : 'Asset service error',
        message: userFacingMessage,
        type: error.type,
        correlationId,
        operation: error.operation,
      },
      { status }
    );
  }

  // Handle legacy AssetNotFoundError (404)
  if (error instanceof AssetNotFoundError) {
    safeLog(log, 'warn', {
      msg: 'Asset not found',
      slug,
      type,
      chapter,
      error: error.message,
    });

    return NextResponse.json(
      {
        error: 'Resource not found',
        message: `The requested ${type === 'full' ? 'audiobook' : 'chapter'} for "${slug}" could not be found`,
        type: 'NOT_FOUND',
        correlationId,
      },
      { status: 404 }
    );
  }

  // Handle any other unexpected errors (500)
  safeLog(log, 'error', {
    msg: 'Unexpected error in download API',
    slug,
    type,
    chapter,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
  });

  // Add context for non-production environments
  const responseObj: Record<string, unknown> = {
    error: 'Internal server error',
    message: 'An unexpected error occurred. Please try again later.',
    type: 'SERVER_ERROR',
    correlationId,
  };

  // Include more details in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    responseObj.details = error instanceof Error ? error.message : String(error);
    responseObj.errorType = error instanceof Error ? error.constructor.name : typeof error;
  }

  return NextResponse.json(responseObj, { status: 500 });
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
  safeLog(log, 'error', {
    msg: 'Critical error in download API route',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    correlationId,
  });

  // Add context for non-production environments
  const responseObj: Record<string, unknown> = {
    error: 'Internal server error',
    message: 'An unexpected error occurred. Please try again later.',
    type: 'CRITICAL_ERROR',
    correlationId,
  };

  // Include more details in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    responseObj.details = error instanceof Error ? error.message : String(error);
    responseObj.errorType = error instanceof Error ? error.constructor.name : typeof error;
    if (error instanceof Error && error.stack) {
      responseObj.stack = error.stack.split('\n').slice(0, 5).join('\n');
    }
  }

  return NextResponse.json(responseObj, { status: 500 });
}
