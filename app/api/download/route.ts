import { NextRequest, NextResponse } from 'next/server';

import { randomUUID } from 'crypto';

import { createRequestLogger } from '@/utils/logger';

import { handleCriticalError, handleDownloadServiceError } from './errorHandlers';
import { validateRequestParameters } from './requestValidation';
import { createDownloadService } from './serviceFactory';

/**
 * Download API route handler
 * Processes download requests for audio files (full audiobooks or chapters)
 */
export async function GET(req: NextRequest) {
  // Generate a unique correlation ID for this request
  const correlationId = randomUUID();

  // Create a logger instance with the correlation ID
  const log = createRequestLogger(correlationId);

  // Log request received with structured data
  log.info({
    msg: 'Download API request received',
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
  });

  try {
    // Get search parameters from the request URL
    const { searchParams } = new URL(req.url);

    // Validate all request parameters
    const validation = validateRequestParameters(searchParams, log, correlationId);
    if (!validation.valid || !validation.slug || !validation.type) {
      return (
        validation.errorResponse || NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      );
    }

    // Create the download service
    const downloadService = createDownloadService(log);
    if (!downloadService) {
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Service initialization failed. Please try again later.',
          type: 'SERVICE_ERROR',
          correlationId,
        },
        { status: 500 }
      );
    }

    try {
      // Call the download service to get the URL
      const url = await downloadService.getDownloadUrl({
        slug: validation.slug,
        type: validation.type,
        chapter: validation.chapter,
        correlationId,
      });

      // Log successful URL generation
      log.info({
        msg: 'Successfully generated download URL',
        slug: validation.slug,
        type: validation.type,
        chapter: validation.chapter,
        urlType: url.includes(process.env.SPACES_ENDPOINT || '') ? 's3-signed' : 'blob',
      });

      // Respond with success and the URL
      return NextResponse.json({ url }, { status: 200 });
    } catch (error) {
      // Map service errors to appropriate responses
      return handleDownloadServiceError(
        error,
        {
          slug: validation.slug,
          type: validation.type,
          chapter: validation.chapter,
          correlationId,
        },
        log
      );
    }
  } catch (error) {
    // Handle critical errors that occur during request processing
    return handleCriticalError(error, correlationId, log);
  }
}
