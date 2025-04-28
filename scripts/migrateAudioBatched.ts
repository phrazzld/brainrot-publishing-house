#!/usr/bin/env node
/**
 * Batched Audio Migration Script
 * 
 * This script migrates audio files in batches for better stability.
 * It downloads from the Digital Ocean CDN and uploads to Vercel Blob.
 * 
 * Usage:
 *   npx tsx scripts/migrateAudioBatched.ts the-iliad 1-5
 *   npx tsx scripts/migrateAudioBatched.ts the-odyssey 6-12
 *   npx tsx scripts/migrateAudioBatched.ts the-iliad all
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { blobService } from '../utils/services/BlobService.js';

// Parse command line arguments
const bookSlug = process.argv[2];
const range = process.argv[3] || 'all';

if (!bookSlug) {
  console.error('ERROR: Book slug is required.');
  console.log('Usage: npx tsx scripts/migrateAudioBatched.ts the-iliad 1-5');
  process.exit(1);
}

// Parse the range
let startBook = 1;
let endBook = 24; // Assuming max of 24 books

if (range !== 'all') {
  const rangeMatch = range.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    startBook = parseInt(rangeMatch[1], 10);
    endBook = parseInt(rangeMatch[2], 10);
  } else {
    console.error('ERROR: Invalid range format. Use format like "1-5" or "all"');
    process.exit(1);
  }
}

console.log(`🎵 Starting batched audio migration`);
console.log(`Book: ${bookSlug}`);
console.log(`Range: ${range === 'all' ? 'All books' : `Books ${startBook}-${endBook}`}`);

async function migrateAudioFile(bookNumber: number): Promise<void> {
  const paddedNumber = String(bookNumber).padStart(2, '0');
  const fileName = `book-${paddedNumber}.mp3`;
  
  console.log(`\n[Book ${paddedNumber}] Starting migration...`);
  
  try {
    // Construct paths
    const cdnBaseUrl = "https://brainrot-publishing.nyc3.cdn.digitaloceanspaces.com";
    const fullCdnUrl = `${cdnBaseUrl}/${bookSlug}/audio/${fileName}`;
    const targetBlobPath = `${bookSlug}/audio/${fileName}`;
    
    console.log(`Source URL: ${fullCdnUrl}`);
    console.log(`Target Blob Path: ${targetBlobPath}`);
    
    // Check if blob already exists
    const blobUrl = blobService.getUrlForPath(targetBlobPath);
    console.log(`Target Blob URL: ${blobUrl}`);
    
    let existingSize = 0;
    
    try {
      const fileInfo = await blobService.getFileInfo(blobUrl);
      console.log(`Existing file info:`);
      console.log(`Size: ${fileInfo.size} bytes (${(fileInfo.size / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`Content-Type: ${fileInfo.contentType}`);
      
      existingSize = fileInfo.size;
      
      if (fileInfo.size > 1000000) { // > 1MB
        console.log(`Large file already exists. Checking if it's a valid audio file...`);
        
        if (fileInfo.contentType?.startsWith('audio/')) {
          console.log(`✅ Appears to be a valid audio file. Skipping upload.`);
          return;
        } else {
          console.log(`⚠️ Large file exists but may not be valid audio. Will replace it.`);
        }
      } else {
        console.log(`⚠️ Small placeholder file exists. Will replace it.`);
      }
    } catch (error) {
      console.log(`No existing file found. Will upload new file.`);
    }
    
    // Test if the CDN file exists
    console.log(`\nTesting if CDN file exists...`);
    try {
      const testResponse = await fetch(fullCdnUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        console.log(`❌ CDN file not found (${testResponse.status}). Skipping.`);
        return;
      }
      
      const contentLength = testResponse.headers.get('content-length');
      console.log(`✅ CDN file exists. Content-Length: ${contentLength} bytes`);
      
      // If we already have a file of the same size, skip it
      if (existingSize > 0 && contentLength && parseInt(contentLength, 10) === existingSize) {
        console.log(`✅ Existing file size matches CDN file size. Skipping upload.`);
        return;
      }
    } catch (error) {
      console.log(`❌ Error checking CDN file: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    
    // Download from CDN
    console.log(`\n⬇️ Downloading from CDN: ${fullCdnUrl}`);
    const downloadStartTime = Date.now();
    
    const response = await fetch(fullCdnUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const downloadDuration = Date.now() - downloadStartTime;
    console.log(`✅ Downloaded ${buffer.length} bytes (${(buffer.length / 1024 / 1024).toFixed(2)} MB) in ${(downloadDuration / 1000).toFixed(1)}s`);
    
    // Create a File object from the downloaded buffer
    const file = new File(
      [buffer], 
      fileName, 
      { type: contentType }
    );
    
    // Upload to Blob storage
    console.log(`\n⬆️ Uploading to Vercel Blob: ${targetBlobPath}`);
    const uploadStartTime = Date.now();
    
    const uploadResult = await blobService.uploadFile(file, {
      pathname: path.dirname(targetBlobPath),
      filename: path.basename(targetBlobPath),
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true
    });
    
    const uploadDuration = Date.now() - uploadStartTime;
    console.log(`✅ Uploaded to ${uploadResult.url} (${uploadResult.size} bytes) in ${(uploadDuration / 1000).toFixed(1)}s`);
    
    // Verify the upload
    console.log(`\n🔍 Verifying upload...`);
    const verifyResult = await blobService.getFileInfo(uploadResult.url);
    console.log(`Size: ${verifyResult.size} bytes (${(verifyResult.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`Content-Type: ${verifyResult.contentType}`);
    
    if (verifyResult.size === buffer.length) {
      console.log(`\n✅ Verification passed: Sizes match`);
    } else {
      console.log(`\n❌ Verification failed: Size mismatch (expected ${buffer.length}, got ${verifyResult.size})`);
    }
    
    // Success
    console.log(`\n🎉 File migration completed successfully!`);
    
  } catch (error) {
    console.error(`\n❌ Migration failed:`, error instanceof Error ? error.message : String(error));
  }
}

// Run the batch migration
async function runBatchMigration(): Promise<void> {
  console.log(`\nStarting batch migration for book numbers ${startBook} through ${endBook}`);
  
  const results = {
    total: endBook - startBook + 1,
    successful: 0,
    failed: 0,
    skipped: 0
  };
  
  const startTime = Date.now();
  
  for (let i = startBook; i <= endBook; i++) {
    try {
      await migrateAudioFile(i);
      results.successful++;
    } catch (error) {
      console.error(`Failed to migrate book ${i}:`, error);
      results.failed++;
    }
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`\n📊 Batch Migration Summary`);
  console.log(`------------------`);
  console.log(`Total files: ${results.total}`);
  console.log(`Successful : ${results.successful}`);
  console.log(`Failed     : ${results.failed}`);
  console.log(`Skipped    : ${results.skipped}`);
  console.log(`Duration   : ${duration.toFixed(1)} seconds`);
  
  console.log(`\n✅ Batch migration completed!`);
}

// Run the migration
runBatchMigration()
  .catch(error => {
    console.error('Batch migration failed:', error);
    process.exit(1);
  });