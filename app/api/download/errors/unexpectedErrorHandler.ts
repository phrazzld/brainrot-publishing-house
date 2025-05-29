import { NextResponse } from 'next/server';

import { AssetType } from '@/types/assets';
import { Logger } from '@/utils/logger';

import { safeLog } from '../logging/safeLogger';
import { createProxyErrorResponse } from './errorResponses';

/**
 * Parameters for handling unexpected proxy errors
 */
export type HandleUnexpectedProxyErrorParams = {
  error: unknown;
  log: Logger;
  opId: string;
  operation: string;
  assetType: AssetType;
  bookSlug: string;
  assetName: string;
  filename: string;
  requestParams?: Record<string, string | string[]>;
};

/**
 * Handles unexpected errors in the proxy download process
 * 
 * @param params Parameters for error handling
 * @returns NextResponse with error details
 */
export function handleUnexpectedProxyError(params: HandleUnexpectedProxyErrorParams): NextResponse {
  const { error, log, opId, operation, assetType, bookSlug, assetName, filename, requestParams } =
    params;

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

  return createProxyErrorResponse({
    status: 500,
    errorMessage: 'Failed to proxy asset download',
    details:
      process.env.NODE_ENV !== 'production'
        ? JSON.stringify(errorDetails)
        : error instanceof Error
          ? error.message
          : String(error),
    operationId: opId,
  });
}