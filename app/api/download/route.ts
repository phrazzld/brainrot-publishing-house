import { NextRequest, NextResponse } from 'next/server';

import AWS from 'aws-sdk';

import { getAssetUrlWithFallback } from '@/utils';

// Split the function to reduce complexity
async function createSignedS3Url(path: string): Promise<string> {
  const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT || '');
  const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID,
    secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY,
  });

  // build file key from path (remove leading slash)
  const fileKey = path.startsWith('/') ? path.substring(1) : path;

  // create signed url
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.SPACES_BUCKET_NAME,
    Key: fileKey,
    Expires: 60, // link good for 60 seconds
  });
}

export async function GET(req: NextRequest) {
  try {
    // parse query params
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const type = searchParams.get('type');
    const chapter = searchParams.get('chapter') || '';

    if (!slug || !type) {
      return NextResponse.json({ error: 'missing query params' }, { status: 400 });
    }

    // Generate file paths
    let audioFileName: string;

    if (type === 'full') {
      audioFileName = 'full-audiobook.mp3';
    } else {
      const paddedChapter = zeroPad(parseInt(chapter), 2);
      audioFileName = `book-${paddedChapter}.mp3`;
    }

    // Legacy path for fallback and compatibility
    const legacyPath = `/${slug}/audio/${audioFileName}`;

    // Try getting file from Blob storage first, with fallback to S3
    try {
      // This will first check if the file exists in Blob storage
      // If it does, it returns a Blob URL; if not, it falls back to the legacy path
      const assetUrl = await getAssetUrlWithFallback(legacyPath);

      // If we got a Blob URL, return it directly
      if (!assetUrl.includes(process.env.SPACES_ENDPOINT || '')) {
        return NextResponse.json({ url: assetUrl });
      }

      // If we got a legacy path, we need to create a signed S3 URL
      // (this preserves backward compatibility during migration)
      const signedUrl = await createSignedS3Url(legacyPath);

      // respond with json
      return NextResponse.json({ url: signedUrl });
    } catch (assetError) {
      console.error('Error retrieving asset URL:', assetError);
      return NextResponse.json({ error: 'file not found' }, { status: 404 });
    }
  } catch (err) {
    console.error('Download route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

const zeroPad = (num: number, places: number) => {
  const zero = places - num.toString().length + 1;
  return Array(+(zero > 0 && zero)).join('0') + num;
};
