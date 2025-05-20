/**
 * Use Vercel Blob API directly to upload placeholder
 */
import { put } from '@vercel/blob';
import dotenv from 'dotenv';
import path from 'path';

import { logger } from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function uploadPlaceholder() {
  logger.info({ msg: 'Uploading placeholder using Vercel Blob API...' });

  try {
    // Fetch an existing image to use as placeholder
    const sourceUrl =
      'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com/assets/pride-and-prejudice/images/pride-and-prejudice-01.png';
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch source image: ${response.status}`);
    }

    const blob = await response.blob();

    // Upload to blob storage
    const { url } = await put('images/placeholder.jpg', blob, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    logger.info({ msg: 'Successfully uploaded placeholder', url });

    // Test with getAssetUrl
    const { getAssetUrl } = await import('../utils');
    const testUrl = getAssetUrl('/assets/covers/placeholder.jpg', true);
    logger.info({ msg: 'Testing placeholder URL', expectedUrl: testUrl });

    const verifyResponse = await fetch(testUrl);
    logger.info({
      msg: 'Verification result',
      status: verifyResponse.status,
      ok: verifyResponse.ok,
    });
  } catch (error) {
    logger.error({ msg: 'Error in upload process', error: error.message });
  }
}

uploadPlaceholder().catch(console.error);
