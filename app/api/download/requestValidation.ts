import { NextResponse } from 'next/server';

import { Logger } from '@/utils/logger.js';

import { validateChapter, validateSlug, validateType } from './validators.js';

/**
 * Interface for the parsed and validated request parameters
 */
export interface ValidatedRequestParams {
  valid: boolean;
  slug?: string;
  type?: 'full' | 'chapter';
  chapter?: string;
  errorResponse?: NextResponse;
}

/**
 * Creates an error response for validation failures
 * @param validationResult - The validation result with error details
 * @param correlationId - Request correlation ID for tracking in server error cases
 * @returns NextResponse with appropriate error status and message
 */
function createErrorResponse(
  validationResult: { error?: { message: string; status: number } },
  correlationId?: string,
): NextResponse {
  // For 400-level errors, keep the original error from validator
  if (validationResult.error?.status && validationResult.error.status < 500) {
    return NextResponse.json(
      { error: validationResult.error.message },
      { status: validationResult.error.status },
    );
  }

  // For 500-level errors, include correlation ID
  return NextResponse.json(
    {
      error: 'Internal server error',
      message: validationResult.error?.message,
      type: 'CONFIG_ERROR',
      correlationId,
    },
    { status: validationResult.error?.status || 500 },
  );
}

/**
 * Validates parameters from the request URL
 * This has been broken out to reduce complexity
 */
function validateParameters(
  params: {
    slug: string | null | undefined;
    type: string | null | undefined;
    chapter: string | null | undefined;
  },
  log: Logger,
  _correlationId: string,
): ValidatedRequestParams {
  const { slug, type, chapter } = params;

  // Validate slug parameter
  const slugValidation = validateSlug(slug, log);
  if (!slugValidation.isValid) {
    return {
      valid: false,
      errorResponse: createErrorResponse(slugValidation),
    };
  }

  // Validate type parameter
  const typeValidation = validateType(type, log);
  if (!typeValidation.isValid) {
    return {
      valid: false,
      errorResponse: createErrorResponse(typeValidation),
    };
  }

  // Validate chapter parameter
  const chapterValidation = validateChapter(chapter, type as string, log);
  if (!chapterValidation.isValid) {
    return {
      valid: false,
      errorResponse: createErrorResponse(chapterValidation),
    };
  }

  // Return the validated parameters
  return {
    valid: true,
    slug: slug as string,
    type: type as 'full' | 'chapter',
    chapter: type === 'chapter' ? (chapter ?? undefined) : undefined,
  };
}

/**
 * Validates all request parameters and returns a validation result
 * @param searchParams - URL search parameters from the request
 * @param log - Logger instance for recording validation issues
 * @param correlationId - Request correlation ID for tracking
 * @returns Object containing validation status and either validated parameters or error response
 */
export function validateRequestParameters(
  searchParams: URLSearchParams,
  log: Logger,
  correlationId: string,
): ValidatedRequestParams {
  // Parse query params
  const slug = searchParams.get('slug')?.trim();
  const type = searchParams.get('type')?.trim();
  const chapter = searchParams.get('chapter')?.trim();

  // Validate request parameters
  const paramValidation = validateParameters({ slug, type, chapter }, log, correlationId);
  if (!paramValidation.valid) {
    return paramValidation;
  }

  // No need to validate S3 configuration since we're using public URLs

  // All validations passed
  return paramValidation;
}
