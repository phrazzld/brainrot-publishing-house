import { NextRequest, NextResponse } from 'next/server';

import { randomUUID } from 'crypto';

import { DownloadService } from '@/services/downloadService';
import { createS3SignedUrlGenerator } from '@/services/s3SignedUrlGenerator';
import { AssetNotFoundError, AssetUrlResolver, SigningError } from '@/types/dependencies';
import { getAssetUrlWithFallback } from '@/utils';
import { createRequestLogger } from '@/utils/logger';

// Create an adapter that implements the AssetUrlResolver interface
const assetUrlResolver: AssetUrlResolver = {
  getAssetUrlWithFallback,
};

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
    // Parse query params
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug')?.trim();
    const type = searchParams.get('type')?.trim();
    const chapter = searchParams.get('chapter')?.trim();

    // Validate required parameters
    if (!slug) {
      log.warn({ msg: 'Missing required parameter', param: 'slug' });
      return NextResponse.json({ error: 'Missing required parameter: slug' }, { status: 400 });
    }

    // Validate type parameter
    if (!type) {
      log.warn({ msg: 'Missing required parameter', param: 'type' });
      return NextResponse.json({ error: 'Missing required parameter: type' }, { status: 400 });
    }

    // Validate type has allowed values
    if (type !== 'full' && type !== 'chapter') {
      log.warn({ msg: 'Invalid value for parameter', param: 'type', value: type });
      return NextResponse.json(
        { error: 'Invalid value for type parameter. Must be "full" or "chapter"' },
        { status: 400 }
      );
    }

    // Validate chapter when type is 'chapter'
    if (type === 'chapter') {
      if (!chapter) {
        log.warn({
          msg: 'Missing required parameter when type=chapter',
          param: 'chapter',
          type,
        });
        return NextResponse.json(
          { error: 'Missing required parameter: chapter (required when type is "chapter")' },
          { status: 400 }
        );
      }

      // Validate chapter is a number
      const chapterNum = Number(chapter);
      if (isNaN(chapterNum)) {
        log.warn({
          msg: 'Invalid chapter parameter (not a number)',
          param: 'chapter',
          value: chapter,
        });
        return NextResponse.json(
          { error: 'Invalid chapter parameter: must be a number' },
          { status: 400 }
        );
      }

      // Validate chapter is positive
      if (chapterNum <= 0) {
        log.warn({
          msg: 'Invalid chapter parameter (not positive)',
          param: 'chapter',
          value: chapterNum,
        });
        return NextResponse.json(
          { error: 'Invalid chapter parameter: must be a positive number' },
          { status: 400 }
        );
      }

      // Validate chapter is an integer
      if (!Number.isInteger(chapterNum)) {
        log.warn({
          msg: 'Invalid chapter parameter (not an integer)',
          param: 'chapter',
          value: chapterNum,
        });
        return NextResponse.json(
          { error: 'Invalid chapter parameter: must be an integer' },
          { status: 400 }
        );
      }
    }

    // Create dependencies for the download service
    const s3SignedUrlGenerator = createS3SignedUrlGenerator();
    const s3Endpoint = process.env.SPACES_ENDPOINT || '';

    // Create the download service with dependencies
    const downloadService = new DownloadService(assetUrlResolver, s3SignedUrlGenerator, s3Endpoint);

    // We know the types are valid now due to validation
    const validatedType = type as 'full' | 'chapter';
    const chapterParam = validatedType === 'chapter' ? chapter : undefined;

    try {
      // Call the download service to get the URL
      const url = await downloadService.getDownloadUrl({
        slug,
        type: validatedType,
        chapter: chapterParam,
        correlationId, // Pass the correlation ID to the service
      });

      // Log successful URL generation
      log.info({
        msg: 'Successfully generated download URL',
        slug,
        type: validatedType,
        chapter: chapterParam,
        urlType: url.includes(s3Endpoint) ? 's3-signed' : 'blob',
      });

      // Respond with success and the URL
      return NextResponse.json({ url }, { status: 200 });
    } catch (error) {
      // Map errors to appropriate status codes and messages
      if (error instanceof AssetNotFoundError) {
        // Log asset not found error with structured data
        log.warn({
          msg: 'Asset not found',
          slug,
          type: validatedType,
          chapter: chapterParam,
          error: error.message,
        });

        return NextResponse.json(
          {
            error: 'Resource not found',
            message: `The requested ${validatedType === 'full' ? 'audiobook' : 'chapter'} for "${slug}" could not be found`,
            type: 'NOT_FOUND',
            correlationId, // Include correlation ID in response for troubleshooting
          },
          { status: 404 }
        );
      }

      if (error instanceof SigningError) {
        // Log signing error with structured data
        log.error({
          msg: 'Failed to generate signed URL',
          slug,
          type: validatedType,
          chapter: chapterParam,
          error: error.message,
          stack: error.stack,
          cause: error.cause,
        });

        return NextResponse.json(
          {
            error: 'Failed to generate download URL',
            message: 'There was an issue preparing the download URL. Please try again later.',
            type: 'SIGNING_ERROR',
            correlationId, // Include correlation ID in response for troubleshooting
          },
          { status: 500 }
        );
      }

      // Handle any other unexpected errors
      log.error({
        msg: 'Unexpected error in download API',
        slug,
        type: validatedType,
        chapter: chapterParam,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'An unexpected error occurred. Please try again later.',
          type: 'SERVER_ERROR',
          correlationId, // Include correlation ID in response for troubleshooting
        },
        { status: 500 }
      );
    }
  } catch (err) {
    // This outer catch block is for errors that might occur during validation or service setup
    log.error({
      msg: 'Critical error in download API route',
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
        type: 'CRITICAL_ERROR',
        correlationId, // Include correlation ID in response for troubleshooting
      },
      { status: 500 }
    );
  }
}
