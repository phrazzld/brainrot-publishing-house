import { NextResponse } from 'next/server';

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

  // Handle AssetNotFoundError (404)
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

  // Note: SigningError handling has been removed as we're now using direct CDN URLs

  // Handle any other unexpected errors (500)
  safeLog(log, 'error', {
    msg: 'Unexpected error in download API',
    slug,
    type,
    chapter,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    {
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
      type: 'SERVER_ERROR',
      correlationId,
    },
    { status: 500 }
  );
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
  });

  return NextResponse.json(
    {
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
      type: 'CRITICAL_ERROR',
      correlationId,
    },
    { status: 500 }
  );
}
