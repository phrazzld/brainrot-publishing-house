import { blobService } from '../utils/services';
import { blobPathService } from '../utils/services';
import { getBlobUrl } from '../utils/getBlobUrl';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function verifyBlobImages() {
  try {
    // Check a few book images to verify they exist in blob storage
    const testBooks = [
      { slug: 'hamlet', filename: 'hamlet-01.png' },
      { slug: 'the-iliad', filename: 'the-iliad-01.png' },
      { slug: 'the-republic', filename: 'republic-07.png' }
    ];
    
    for (const book of testBooks) {
      // Generate blob path
      const blobPath = blobPathService.getBookImagePath(book.slug, book.filename);
      console.log(`\nVerifying ${book.slug}/${book.filename}...`);
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
      } catch (error) {
        console.log(`❌ File does not exist: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Also test the getBlobUrl utility
      const legacyPath = `/assets/${book.slug}/images/${book.filename}`;
      const utilityBlobUrl = getBlobUrl(legacyPath);
      console.log(`\nTesting getBlobUrl utility...`);
      console.log(`Legacy path: ${legacyPath}`);
      console.log(`Utility generated URL: ${utilityBlobUrl}`);
      
      try {
        const fileInfo = await blobService.getFileInfo(utilityBlobUrl);
        console.log(`✅ Utility URL works! File exists.`);
        console.log(`Size: ${Math.round(fileInfo.size / 1024)} KB`);
      } catch (error) {
        console.log(`❌ Utility URL failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    console.error('Error verifying blob images:', error);
    throw error;
  }
}

verifyBlobImages()
  .then(() => {
    console.log('\nVerification complete!');
  })
  .catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });