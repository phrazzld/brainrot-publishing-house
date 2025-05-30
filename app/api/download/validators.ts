import { Logger } from '@/utils/logger.js';

import { safeLog } from './errorHandlers.js';

/**
 * Result of parameter validation
 */
export interface ValidationResult {
  isValid: boolean;
  error?: {
    message: string;
    status: number;
  };
}

/**
 * Validates the slug parameter
 * @param slug - The slug parameter value to validate
 * @param log - Logger instance for recording validation issues
 * @returns Validation result with error details if invalid
 */
export function validateSlug(slug: string | null | undefined, log: Logger): ValidationResult {
  // Check if slug is missing
  if (!slug) {
    safeLog(log, 'warn', { msg: 'Missing required parameter', param: 'slug' });
    return {
      isValid: false,
      error: {
        message: 'Missing required parameter: slug',
        status: 400,
      },
    };
  }

  // Validate slug format (alphanumeric with hyphens and underscores only)
  const slugPattern = /^[a-zA-Z0-9-_]+$/;
  if (!slugPattern.test(slug)) {
    safeLog(log, 'warn', {
      msg: 'Invalid slug format',
      param: 'slug',
      value: slug,
    });
    return {
      isValid: false,
      error: {
        message:
          'Invalid slug format. Must contain only letters, numbers, hyphens, or underscores.',
        status: 400,
      },
    };
  }

  return { isValid: true };
}

/**
 * Validates the type parameter
 * @param type - The type parameter value to validate
 * @param log - Logger instance for recording validation issues
 * @returns Validation result with error details if invalid
 */
export function validateType(type: string | null | undefined, log: Logger): ValidationResult {
  // Check if type is missing
  if (!type) {
    safeLog(log, 'warn', { msg: 'Missing required parameter', param: 'type' });
    return {
      isValid: false,
      error: {
        message: 'Missing required parameter: type',
        status: 400,
      },
    };
  }

  // Validate type has allowed values
  if (type !== 'full' && type !== 'chapter') {
    safeLog(log, 'warn', { msg: 'Invalid value for parameter', param: 'type', value: type });
    return {
      isValid: false,
      error: {
        message: 'Invalid value for type parameter. Must be "full" or "chapter"',
        status: 400,
      },
    };
  }

  return { isValid: true };
}

/**
 * Validates the chapter parameter when type is 'chapter'
 * @param chapter - The chapter parameter value to validate
 * @param type - The type parameter value
 * @param log - Logger instance for recording validation issues
 * @returns Validation result with error details if invalid
 */
export function validateChapter(
  chapter: string | null | undefined,
  type: string,
  log: Logger,
): ValidationResult {
  // Chapter is only required when type is 'chapter'
  if (type !== 'chapter') {
    return { isValid: true };
  }

  // Validate chapter is provided when type is 'chapter'
  if (!chapter) {
    safeLog(log, 'warn', {
      msg: 'Missing required parameter when type=chapter',
      param: 'chapter',
      type,
    });
    return {
      isValid: false,
      error: {
        message: 'Missing required parameter: chapter (required when type is "chapter")',
        status: 400,
      },
    };
  }

  // Validate chapter is a number
  const chapterNum = Number(chapter);
  if (isNaN(chapterNum)) {
    safeLog(log, 'warn', {
      msg: 'Invalid chapter parameter (not a number)',
      param: 'chapter',
      value: chapter,
    });
    return {
      isValid: false,
      error: {
        message: 'Invalid chapter parameter: must be a number',
        status: 400,
      },
    };
  }

  // Validate chapter is positive
  if (chapterNum <= 0) {
    safeLog(log, 'warn', {
      msg: 'Invalid chapter parameter (not positive)',
      param: 'chapter',
      value: chapterNum,
    });
    return {
      isValid: false,
      error: {
        message: 'Invalid chapter parameter: must be a positive number',
        status: 400,
      },
    };
  }

  // Validate chapter is an integer
  if (!Number.isInteger(chapterNum)) {
    safeLog(log, 'warn', {
      msg: 'Invalid chapter parameter (not an integer)',
      param: 'chapter',
      value: chapterNum,
    });
    return {
      isValid: false,
      error: {
        message: 'Invalid chapter parameter: must be an integer',
        status: 400,
      },
    };
  }

  return { isValid: true };
}

/**
 * Validates S3 endpoint configuration
 * @param s3Endpoint - The S3 endpoint configuration value
 * @param log - Logger instance for recording validation issues
 * @returns Validation result with error details if invalid
 */
export function validateS3Config(s3Endpoint: string | undefined, log: Logger): ValidationResult {
  if (!s3Endpoint) {
    safeLog(log, 'error', {
      msg: 'Missing required S3 configuration',
      param: 'SPACES_ENDPOINT',
    });
    return {
      isValid: false,
      error: {
        message: 'Server is not configured correctly. Please contact support.',
        status: 500,
      },
    };
  }

  return { isValid: true };
}
