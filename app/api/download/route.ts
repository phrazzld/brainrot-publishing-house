import { NextRequest, NextResponse } from 'next/server';

import { randomUUID } from 'crypto';

import { createRequestLogger } from '@/utils/logger';

import { handleCriticalError, handleDownloadServiceError, safeLog } from './errorHandlers';
import { proxyFileDownload } from './proxyService';
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
  safeLog(log, 'info', {
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
      safeLog(log, 'info', {
        msg: 'Successfully generated download URL',
        slug: validation.slug,
        type: validation.type,
        chapter: validation.chapter,
        urlType: url.includes(process.env.SPACES_ENDPOINT || '') ? 's3-signed' : 'blob',
      });

      // Create filename for download
      const filename =
        validation.type === 'full'
          ? `${validation.slug}.mp3`
          : `${validation.slug}-chapter-${validation.chapter}.mp3`;

      // Determine if the fetch request has a 'proxy' parameter
      // If present, we'll stream the file directly from our API
      const proxyRequested = searchParams.get('proxy') === 'true';

      if (proxyRequested) {
        // If proxy is requested, download the file and stream it to the client
        safeLog(log, 'info', {
          msg: 'Proxying download through API',
          slug: validation.slug,
          type: validation.type,
          chapter: validation.chapter,
        });

        try {
          return await proxyFileDownload(url, filename, log);
        } catch (proxyError) {
          safeLog(log, 'error', {
            msg: 'Error while proxying file',
            error: proxyError instanceof Error ? proxyError.message : String(proxyError),
            stack: proxyError instanceof Error ? proxyError.stack : undefined,
          });

          return NextResponse.json(
            {
              error: 'Proxy error',
              message: 'Failed to proxy download through API',
            },
            { status: 500 }
          );
        }
      }

      // If no proxy requested, respond with the URL for client-side download
      // Add a query parameter to indicate if URL is S3 (might need CORS workaround)
      const isS3Url =
        url.includes(process.env.SPACES_ENDPOINT || '') ||
        url.includes(process.env.DO_SPACES_ENDPOINT || '');

      return NextResponse.json(
        {
          url,
          isS3Url,
          shouldProxy: isS3Url, // Recommend proxy for S3 URLs which might have CORS issues
        },
        { status: 200 }
      );
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
