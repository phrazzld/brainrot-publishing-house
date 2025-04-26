import { blobService } from '../utils/services';
import { put } from '@vercel/blob';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

/**
 * Test script to verify Vercel Blob storage configuration
 *
 * This script uploads a test file to verify that your Vercel Blob
 * storage is properly configured with the correct token.
 */
async function testBlobStorage() {
  console.log('🧪 Testing Vercel Blob storage configuration...');
  console.log('ENV TOKEN:', process.env.BLOB_READ_WRITE_TOKEN ? 'Present (length: ' + process.env.BLOB_READ_WRITE_TOKEN.length + ')' : 'Missing');
  
  try {
    // Create a simple text content to upload
    const testContent = 'Hello Vercel Blob! This is a test file from brainrot-publishing-house.';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testPath = `test/verification-${timestamp}.txt`;
    
    console.log(`📤 Uploading test file to: ${testPath}`);
    
    // Try direct upload with Vercel Blob first
    console.log('Attempting direct upload with @vercel/blob');
    const directResult = await put(testPath, testContent, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    console.log('✅ Direct upload successful!');
    console.log(`🔗 File URL: ${directResult.url}`);
    
    // Now try with our BlobService
    console.log('\nNow trying with project BlobService...');
    const result = await blobService.uploadText(
      testContent,
      `test/service-${timestamp}.txt`,
      { cacheControl: 'max-age=60' } // Short cache time for test file
    );
    
    console.log('✅ BlobService upload successful!');
    console.log(`🔗 File URL: ${result.url}`);
    
    // Fetch the file to verify it's accessible
    console.log('🔍 Verifying file is accessible...');
    const fetchedContent = await blobService.fetchText(result.url);
    
    if (fetchedContent === testContent) {
      console.log('✅ Verification successful! Content matches.');
    } else {
      console.log('❌ Verification failed! Content does not match.');
      console.log('Expected:', testContent);
      console.log('Received:', fetchedContent);
    }
    
    // Try listing files
    console.log('📋 Listing files in the test directory...');
    const { blobs } = await blobService.listFiles({
      prefix: 'test/',
      limit: 10
    });
    
    console.log(`📊 Found ${blobs.length} file(s) in the test directory:`);
    blobs.forEach(blob => {
      console.log(`- ${blob.pathname} (${blob.size} bytes)`);
    });
    
    console.log('\n🎉 Blob storage is working correctly!');
    console.log('You can now safely migrate your assets.');
    
    // Optional cleanup - uncomment if you want to delete the test file
    // console.log('🧹 Cleaning up test file...');
    // await blobService.deleteFile(result.url);
    // await blobService.deleteFile(directResult.url);
    // console.log('✅ Test files deleted.');
    
    return { success: true, url: result.url };
  } catch (error) {
    console.error('❌ Error testing Blob storage:');
    console.error(error);
    return { success: false, error };
  }
}

// Run the test function
testBlobStorage()
  .then(result => {
    if (!result.success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
