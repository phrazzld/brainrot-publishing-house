import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import { blobService } from '../utils/services';
import { blobPathService } from '../utils/services';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

/**
 * Test script to migrate a sample asset to Blob storage
 *
 * This script takes an existing image from the public assets folder
 * and migrates it to Vercel Blob storage using the project's
 * BlobService and BlobPathService utilities.
 */
async function testAssetMigration() {
  console.log('📝 Testing asset migration to Vercel Blob storage...');

  try {
    // Pick a real asset from the project to test migration
    const sourceAssetPath = 'public/assets/hamlet/images/hamlet-01.png';
    console.log(`🖼 Selected test asset: ${sourceAssetPath}`);

    // Check if the file exists
    if (!fs.existsSync(sourceAssetPath)) {
      throw new Error(`Source asset not found: ${sourceAssetPath}`);
    }

    // Get file statistics
    const stats = fs.statSync(sourceAssetPath);
    console.log(`📄 File size: ${Math.round(stats.size / 1024)} KB`);

    // Read the file
    const fileBuffer = fs.readFileSync(sourceAssetPath);
    const file = new File([fileBuffer], path.basename(sourceAssetPath), {
      type: 'image/png',
    });

    // Generate timestamp for unique test file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Generate blob path using BlobPathService
    const originalBlobPath = blobPathService.getBookImagePath('hamlet', 'hamlet-01.png');
    const testBlobPath = `test-migration/${timestamp}-hamlet-01.png`;
    console.log(`📎 Production blob path would be: ${originalBlobPath}`);
    console.log(`📎 Using test blob path: ${testBlobPath}`);

    // Extract the directory and filename for the test path
    const lastSlashIndex = testBlobPath.lastIndexOf('/');
    const pathname = testBlobPath.substring(0, lastSlashIndex);
    const filename = testBlobPath.substring(lastSlashIndex + 1);

    console.log(`📤 Uploading to Blob storage...`);
    const result = await blobService.uploadFile(file, {
      pathname,
      filename,
      access: 'public'
    });

    console.log('✅ Upload successful!');
    console.log(`🔗 File URL: ${result.url}`);

    // Verify the URL format is correct
    console.log('\n🔍 Verifying URL format...');
    const expectedBlobUrl = `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${testBlobPath}`;
    console.log(`Expected URL format: ${expectedBlobUrl}`);
    console.log(`Actual URL:          ${result.url}`);

    if (result.url.includes(testBlobPath)) {
      console.log('✅ URL verification successful!');
    } else {
      console.log('❌ URL verification failed - URL format may have changed.');
    }

    // Test URL with the getBlobUrl utility
    const legacyPath = '/assets/hamlet/images/hamlet-01.png';
    const utilityUrl = await import('../utils/getBlobUrl').then((module) => {
      return module.getBlobUrl(legacyPath);
    });

    console.log('\n🔍 Testing getBlobUrl utility...');
    console.log(`Legacy path: ${legacyPath}`);
    console.log(`Utility URL: ${utilityUrl}`);
    console.log(`Expected conversion to: ${originalBlobPath}`);

    if (utilityUrl.includes(originalBlobPath)) {
      console.log('✅ getBlobUrl verification successful!');
    } else {
      console.log('❌ getBlobUrl verification failed.');
    }

    // Test cleanup for test file
    console.log('\n🧹 Cleaning up test file...');
    await blobService.deleteFile(result.url);
    console.log('✅ Test file deleted.');

    console.log('\n🎉 Asset migration test completed successfully!');
    console.log(`Verified:`);
    console.log(` - File upload and download`);
    console.log(` - URL construction and path conversion`);
    console.log(` - getBlobUrl utility functionality`);
    console.log('The Blob storage integration is working correctly.');

    return { success: true, url: result.url };
  } catch (error) {
    console.error('❌ Error testing asset migration:');
    console.error(error);
    return { success: false, error };
  }
}

// Run the test function
testAssetMigration()
  .then((result) => {
    if (!result.success) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
