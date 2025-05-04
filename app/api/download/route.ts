import { NextRequest, NextResponse } from 'next/server';

import { DownloadService } from '@/services/downloadService';
import { createS3SignedUrlGenerator } from '@/services/s3SignedUrlGenerator';
import { AssetNotFoundError, AssetUrlResolver, SigningError } from '@/types/dependencies';
import { getAssetUrlWithFallback } from '@/utils';

// Create an adapter that implements the AssetUrlResolver interface
const assetUrlResolver: AssetUrlResolver = {
  getAssetUrlWithFallback,
};

export async function GET(req: NextRequest) {
  try {
    // Parse query params
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug')?.trim();
    const type = searchParams.get('type')?.trim();
    const chapter = searchParams.get('chapter')?.trim();

    // Validate required parameters
    if (!slug) {
      return NextResponse.json({ error: 'Missing required parameter: slug' }, { status: 400 });
    }

    // Validate type parameter
    if (!type) {
      return NextResponse.json({ error: 'Missing required parameter: type' }, { status: 400 });
    }

    // Validate type has allowed values
    if (type !== 'full' && type !== 'chapter') {
      return NextResponse.json(
        { error: 'Invalid value for type parameter. Must be "full" or "chapter"' },
        { status: 400 }
      );
    }

    // Validate chapter when type is 'chapter'
    if (type === 'chapter') {
      if (!chapter) {
        return NextResponse.json(
          { error: 'Missing required parameter: chapter (required when type is "chapter")' },
          { status: 400 }
        );
      }

      // Validate chapter is a number
      const chapterNum = Number(chapter);
      if (isNaN(chapterNum)) {
        return NextResponse.json(
          { error: 'Invalid chapter parameter: must be a number' },
          { status: 400 }
        );
      }

      // Validate chapter is positive
      if (chapterNum <= 0) {
        return NextResponse.json(
          { error: 'Invalid chapter parameter: must be a positive number' },
          { status: 400 }
        );
      }

      // Validate chapter is an integer
      if (!Number.isInteger(chapterNum)) {
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

    // Try getting the download URL using the service
    try {
      // We know the types are valid now due to validation
      const validatedType = type as 'full' | 'chapter';
      const chapterParam = validatedType === 'chapter' ? chapter : undefined;

      const url = await downloadService.getDownloadUrl({
        slug,
        type: validatedType,
        chapter: chapterParam,
      });

      // respond with json
      return NextResponse.json({ url });
    } catch (error) {
      if (error instanceof AssetNotFoundError) {
        // Return 404 error for file not found
        return NextResponse.json({ error: 'file not found' }, { status: 404 });
      }

      // Re-throw other errors to be handled by the outer catch block
      throw error;
    }
  } catch (err) {
    // Check for specific error types
    if (err instanceof SigningError) {
      // Log the signing error for debugging
      console.error('S3 signing error:', err);
    }

    // Return generic error to client
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
