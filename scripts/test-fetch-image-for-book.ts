import { blobService } from '../utils/services';
import { blobPathService } from '../utils/services';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function verifyBlobImagesForBook(bookSlug: string, imageFilename: string) {
  try {
    // Generate blob path
    const blobPath = blobPathService.getBookImagePath(bookSlug, imageFilename);
    console.log(`\nVerifying ${bookSlug}/${imageFilename}...`);
    console.log(`Blob path: ${blobPath}`);
    
    // Generate URL
    const blobUrl = blobService.getUrlForPath(blobPath);
    console.log(`Blob URL: ${blobUrl}`);
    
    // Check if it exists
    try {
      const fileInfo = await blobService.getFileInfo(blobUrl);
      console.log(`✅ File exists!`);
      console.log(`Size: ${Math.round(fileInfo.size / 1024)} KB`);
      console.log(`Content-Type: ${fileInfo.contentType}`);
      console.log(`Last Modified: ${fileInfo.uploadedAt}`);
    } catch (error) {
      console.log(`❌ File does not exist: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    console.error('Error verifying blob image:', error);
    throw error;
  }
}

// Check the republic-07.png file which is the one referenced in translations/index.ts
verifyBlobImagesForBook('the-republic', 'republic-07.png')
  .then(() => {
    console.log('\nVerification complete!');
  })
  .catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });