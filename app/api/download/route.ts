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
    // parse query params
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const type = searchParams.get('type') as 'full' | 'chapter';
    const chapter = searchParams.get('chapter') || '';

    if (!slug || !type) {
      return NextResponse.json({ error: 'missing query params' }, { status: 400 });
    }

    // Create dependencies for the download service
    const s3SignedUrlGenerator = createS3SignedUrlGenerator();
    const s3Endpoint = process.env.SPACES_ENDPOINT || '';

    // Create the download service with dependencies
    const downloadService = new DownloadService(assetUrlResolver, s3SignedUrlGenerator, s3Endpoint);

    // Try getting the download URL using the service
    try {
      const url = await downloadService.getDownloadUrl({
        slug,
        type,
        chapter: type === 'chapter' ? chapter : undefined,
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
