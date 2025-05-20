/**
 * Upload an existing image as placeholder
 */
import dotenv from 'dotenv';
import path from 'path';

// Import after env is loaded
import { getAssetUrl } from '../utils';
import { logger } from '../utils/logger';
import { blobService } from '../utils/services/BlobService';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function uploadPlaceholder() {
  logger.info({ msg: 'Creating placeholder at expected location...' });

  // Fetch an existing image and copy it
  const sourceUrl =
    'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com/assets/pride-and-prejudice/images/pride-and-prejudice-01.png';
  const targetPath = 'images/placeholder.jpg';

  try {
    // Fetch the source image
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch source image: ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();

    // Upload to the placeholder location
    const uploadUrl = await blobService.getUploadUrl({ pathname: targetPath });
    logger.info({ msg: 'Got upload URL', url: uploadUrl.url });

    const uploadResponse = await fetch(uploadUrl.url, {
      method: 'PUT',
      body: imageBuffer,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });

    if (uploadResponse.ok) {
      logger.info({ msg: 'Successfully uploaded placeholder' });

      // Test the URL
      const testUrl = getAssetUrl('/assets/covers/placeholder.jpg', true);
      logger.info({ msg: 'Testing placeholder URL', url: testUrl });

      const verifyResponse = await fetch(testUrl);
      logger.info({
        msg: 'Verification result',
        status: verifyResponse.status,
        ok: verifyResponse.ok,
      });
    } else {
      logger.error({ msg: 'Failed to upload', status: uploadResponse.status });
    }
  } catch (error) {
    logger.error({ msg: 'Error in upload process', error: error.message });
  }
}

uploadPlaceholder().catch(console.error);
