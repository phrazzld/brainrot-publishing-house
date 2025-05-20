/**
 * Create and upload a placeholder image to blob storage
 */
import { createCanvas } from 'canvas';
import dotenv from 'dotenv';
import path from 'path';

import { logger as _logger } from '../utils/logger';
import { blobService } from '../utils/services/BlobService';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function createPlaceholder() {
  logger.info({ msg: 'Creating placeholder image...' });

  // Create a simple gray placeholder image using canvas
  const width = 400;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill with gray background
  ctx.fillStyle = '#cccccc';
  ctx.fillRect(0, 0, width, height);

  // Add text
  ctx.fillStyle = '#666666';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Coming Soon', width / 2, height / 2);

  // Convert to buffer
  const buffer = canvas.toBuffer('image/jpeg');

  // Upload to blob storage at the expected location
  const blobPath = 'images/placeholder.jpg';

  try {
    const uploadUrl = await blobService.getUploadUrl({
      pathname: blobPath,
    });

    const response = await fetch(uploadUrl.url, {
      method: 'PUT',
      body: buffer,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });

    if (response.ok) {
      logger.info({ msg: 'Placeholder uploaded successfully', path: blobPath });

      // Verify it's accessible
      const publicUrl = blobService.getUrlForPath(blobPath);
      const verifyResponse = await fetch(publicUrl, { method: 'HEAD' });
      logger.info({
        msg: 'Verification',
        url: publicUrl,
        status: verifyResponse.status,
        ok: verifyResponse.ok,
      });
    } else {
      logger.error({ msg: 'Failed to upload placeholder', status: response.status });
    }
  } catch (error) {
    logger.error({ msg: 'Error uploading placeholder', error: error.message });
  }
}

createPlaceholder().catch(console.error);
