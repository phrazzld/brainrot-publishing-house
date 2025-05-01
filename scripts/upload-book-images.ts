import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import { blobService } from '../utils/services';
import { blobPathService } from '../utils/services';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const BOOK_SLUGS = ['the-republic']; // Limit to one book for testing
const PROJECT_ROOT = process.cwd();

async function uploadBookImages() {
  console.log(`\n📚 Starting book image upload ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

  // Process each book
  for (const bookSlug of BOOK_SLUGS) {
    console.log(`\n🔍 Processing book: ${bookSlug}`);

    // Construct the book image directory path
    const imageDir = path.join(PROJECT_ROOT, 'public/assets', bookSlug, 'images');

    // Check if directory exists
    if (!fs.existsSync(imageDir)) {
      console.log(`📂 No image directory found at ${imageDir}, skipping...`);
      continue;
    }

    // Get all PNG files in the directory
    const files = fs
      .readdirSync(imageDir)
      .filter((file) => file.endsWith('.png'))
      .map((file) => ({ filename: file, fullPath: path.join(imageDir, file) }));

    console.log(`📄 Found ${files.length} images in ${imageDir}`);

    // Process each image file
    for (const file of files) {
      try {
        // Generate blob path
        const blobPath = blobPathService.getBookImagePath(bookSlug, file.filename);

        // Convert to full URL for checking
        const blobUrl = blobService.getUrlForPath(blobPath);

        // Check if file already exists in Blob storage
        let fileExists = false;
        try {
          await blobService.getFileInfo(blobUrl);
          fileExists = true;
          console.log(`⏭️ ${file.filename} already exists in Blob storage, skipping...`);
        } catch {
          fileExists = false;
        }

        if (fileExists) {
          continue;
        }

        console.log(`📤 Uploading ${file.filename} to ${blobPath}`);

        if (DRY_RUN) {
          console.log(`🔍 DRY RUN: Would upload ${file.fullPath} to ${blobPath}`);
          continue;
        }

        // Read the file and create a File object
        const fileBuffer = fs.readFileSync(file.fullPath);
        const fileObj = new File([fileBuffer], file.filename, {
          type: 'image/png',
        });

        // Extract pathname and filename from blob path
        const lastSlashIndex = blobPath.lastIndexOf('/');
        const pathname = blobPath.substring(0, lastSlashIndex);
        const filename = blobPath.substring(lastSlashIndex + 1);

        // Upload to Blob storage
        const result = await blobService.uploadFile(fileObj, {
          pathname,
          filename,
          access: 'public'
        });

        console.log(`✅ Uploaded ${file.filename} to ${result.url}`);
      } catch (error) {
        console.error(
          `❌ Error uploading ${file.filename}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  console.log('\n🎉 Book image upload completed!');
}

// Start the upload process
uploadBookImages()
  .then(() => {
    console.log('Image upload process completed.');
  })
  .catch((error) => {
    console.error('Failed to complete image upload process:', error);
    process.exit(1);
  });
