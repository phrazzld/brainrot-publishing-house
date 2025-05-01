import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import { blobService } from '../utils/services';
import { blobPathService } from '../utils/services';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function uploadCoverImage() {
  try {
    // Select a test image to upload
    const bookSlug = 'hamlet';
    const imageFileName = 'hamlet-01.png';
    const sourceFilePath = path.join(
      process.cwd(),
      'public/assets',
      bookSlug,
      'images',
      imageFileName
    );

    console.log(`Uploading ${sourceFilePath}...`);

    // Check if the file exists
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error(`Source file not found: ${sourceFilePath}`);
    }

    // Create a File object from the image
    const fileBuffer = fs.readFileSync(sourceFilePath);
    const file = new File([fileBuffer], imageFileName, {
      type: 'image/png',
    });

    // Generate the blob path
    const blobPath = blobPathService.getBookImagePath(bookSlug, imageFileName);
    console.log(`Blob path: ${blobPath}`);

    // Extract pathname and filename
    const lastSlashIndex = blobPath.lastIndexOf('/');
    const pathname = blobPath.substring(0, lastSlashIndex);
    const filename = blobPath.substring(lastSlashIndex + 1);

    // Upload to Blob storage
    const result = await blobService.uploadFile(file, {
      pathname,
      filename,
      access: 'public'
    });

    console.log('Upload successful!');
    console.log(`File URL: ${result.url}`);

    return result;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

uploadCoverImage()
  .then((result) => {
    console.log('Image uploaded successfully to:', result.url);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to upload image:', error);
    process.exit(1);
  });
