import { NextResponse } from 'next/server';

import { AssetError, AssetErrorType, AssetType } from '@/types/assets.js';
import { Logger } from '@/utils/logger.js';

import { safeLog } from '../logging/safeLogger.js';
import { createProxyErrorResponse } from './errorResponses.js';

/**
 * Maps an AssetError type to an appropriate HTTP status code
 *
 * @param errorType The AssetError type
 * @returns HTTP status code
 */
function mapAssetErrorToStatusCode(errorType: AssetErrorType): number {
  switch (errorType) {
    case AssetErrorType.NOT_FOUND:
      return 404;
    case AssetErrorType.UNAUTHORIZED:
      return 401;
    case AssetErrorType.FORBIDDEN:
      return 403;
    case AssetErrorType.VALIDATION_ERROR:
      return 400;
    default:
      return 500;
  }
}

/**
 * Creates error message for AssetError based on type
 *
 * @param errorType The error type
 * @param assetPath The asset path if available
 * @returns Formatted error message
 */
function createAssetErrorMessage(errorType: AssetErrorType, assetPath?: string): string {
  if (errorType === AssetErrorType.NOT_FOUND) {
    return `Asset not found: ${assetPath || '[unknown path]'}`;
  }

  // Default to a generic message
  return `Failed to retrieve asset: ${assetPath || '[unknown path]'}`;
}

/**
 * Formats asset path for error messages
 *
 * @param assetType Asset type
 * @param bookSlug Book slug
 * @param assetName Asset name
 * @returns Formatted asset path
 */
function formatAssetPath(assetType: AssetType, bookSlug: string, assetName: string): string {
  return `${assetType}/${bookSlug}/${assetName}`;
}

/**
 * Logs error details for asset URL errors
 *
 * @param error The error that occurred
 * @param context The logging context
 */
function logAssetUrlError(
  error: unknown,
  context: {
    log: Logger;
    opId: string;
    operation: string;
    assetType: AssetType;
    bookSlug: string;
    assetName: string;
  },
): void {
  const { log, opId, operation, assetType, bookSlug, assetName } = context;

  if (error instanceof AssetError) {
    safeLog(log, 'error', {
      msg: 'Failed to get asset URL',
      opId,
      operation,
      assetType,
      bookSlug,
      assetName,
      errorType: error.type,
      errorMessage: error.message,
      statusCode: error.statusCode,
      assetPath: error.assetPath,
    });
  } else {
    safeLog(log, 'error', {
      msg: 'Unexpected error getting asset URL',
      opId,
      operation,
      assetType,
      bookSlug,
      assetName,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Parameters for handling asset URL errors
 */
export type HandleAssetUrlErrorParams = {
  assetError: unknown;
  log: Logger;
  opId: string;
  operation: string;
  assetType: AssetType;
  bookSlug: string;
  assetName: string;
};

/**
 * Handles errors that occur when retrieving asset URLs
 *
 * @param params Parameters for error handling
 * @returns NextResponse with appropriate error details
 */
export function handleAssetUrlError(params: HandleAssetUrlErrorParams): NextResponse {
  const { assetError, log, opId, operation, assetType, bookSlug, assetName } = params;

  // Log the error with appropriate context
  logAssetUrlError(assetError, { log, opId, operation, assetType, bookSlug, assetName });

  // Format the asset path for error messages
  const formattedPath = formatAssetPath(assetType, bookSlug, assetName);

  // Handle AssetError specifically
  if (assetError instanceof AssetError) {
    // Map AssetError to appropriate HTTP status
    const status = assetError.statusCode || mapAssetErrorToStatusCode(assetError.type);

    // Get appropriate error message
    const errorMessage = createAssetErrorMessage(
      assetError.type,
      assetError.assetPath || formattedPath,
    );

    // Create and return error response
    return createProxyErrorResponse({
      status,
      errorMessage,
      details: JSON.stringify({
        errorType: assetError.type,
        assetPath: assetError.assetPath,
        operation: assetError.operation,
        opId,
        assetType,
        bookSlug,
        assetName,
      }),
      operationId: opId,
    });
  }

  // Handle other errors with a generic server error response
  return createProxyErrorResponse({
    status: 500,
    errorMessage: 'Failed to retrieve asset URL',
    details: JSON.stringify({
      error: assetError instanceof Error ? assetError.message : String(assetError),
      assetType,
      bookSlug,
      assetName,
      opId,
    }),
    operationId: opId,
  });
}
