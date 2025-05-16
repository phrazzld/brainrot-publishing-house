#!/usr/bin/env node
/**
 * Batched Audio Migration Script
 *
 * This script migrates audio files in batches for better stability.
 * It downloads from the source URL and uploads to Vercel Blob.
 *
 * Usage:
 *   npx tsx scripts/migrateAudioBatched.ts the-iliad 1-5
 *   npx tsx scripts/migrateAudioBatched.ts the-odyssey 6-12
 *   npx tsx scripts/migrateAudioBatched.ts the-iliad all
 */
import * as dotenv from 'dotenv';
import path from 'path';

import { blobService } from '../utils/services/BlobService.js';

dotenv.config({ path: '.env.local' });

// Parse command line arguments
const bookSlug = process.argv[2];
const range = process.argv[3] || 'all';

if (!bookSlug) {
  console.error('ERROR: Book slug is required.');
  console.error('Usage: npx tsx scripts/migrateAudioBatched.ts the-iliad 1-5');
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

console.error(`🎵 Starting batched audio migration`);
console.error(`Book: ${bookSlug}`);
console.error(`Range: ${range === 'all' ? 'All books' : `Books ${startBook}-${endBook}`}`);

async function migrateAudioFile(bookNumber: number): Promise<void> {
  const paddedNumber = String(bookNumber).padStart(2, '0');
  const fileName = `book-${paddedNumber}.mp3`;

  console.error(`\n[Book ${paddedNumber}] Starting migration...`);

  try {
    // Construct paths
    const blobBaseUrl =
      process.env.NEXT_PUBLIC_BLOB_BASE_URL || 'https://public.blob.vercel-storage.com';
    const fullSourceUrl = `${blobBaseUrl}/books/${bookSlug}/audio/${fileName}`;
    const targetBlobPath = `books/${bookSlug}/audio/${fileName}`;

    console.error(`Source URL: ${fullSourceUrl}`);
    console.error(`Target Blob Path: ${targetBlobPath}`);

    // Check if blob already exists
    const blobUrl = blobService.getUrlForPath(targetBlobPath);
    console.error(`Target Blob URL: ${blobUrl}`);

    let existingSize = 0;

    try {
      const fileInfo = await blobService.getFileInfo(blobUrl);
      console.error(`Existing file info:`);
      console.error(
        `Size: ${fileInfo.size} bytes (${(fileInfo.size / 1024 / 1024).toFixed(2)} MB)`
      );
      console.error(`Content-Type: ${fileInfo.contentType}`);

      existingSize = fileInfo.size;

      if (fileInfo.size > 1000000) {
        // > 1MB
        console.error(`Large file already exists. Checking if it's a valid audio file...`);

        if (fileInfo.contentType?.startsWith('audio/')) {
          console.error(`✅ Appears to be a valid audio file. Skipping upload.`);
          return;
        } else {
          console.error(`⚠️ Large file exists but may not be valid audio. Will replace it.`);
        }
      } else {
        console.error(`⚠️ Small placeholder file exists. Will replace it.`);
      }
    } catch {
      console.error(`No existing file found. Will upload new file.`);
    }

    // Test if the source file exists
    console.error(`\nTesting if source file exists...`);
    try {
      const testResponse = await fetch(fullSourceUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        console.error(`❌ Source file not found (${testResponse.status}). Skipping.`);
        return;
      }

      const contentLength = testResponse.headers.get('content-length');
      console.error(`✅ Source file exists. Content-Length: ${contentLength} bytes`);

      // If we already have a file of the same size, skip it
      if (existingSize > 0 && contentLength && parseInt(contentLength, 10) === existingSize) {
        console.error(`✅ Existing file size matches source file size. Skipping upload.`);
        return;
      }
    } catch (error) {
      console.error(
        `❌ Error checking source file: ${error instanceof Error ? error.message : String(error)}`
      );
      return;
    }

    // Download from source
    console.error(`\n⬇️ Downloading from source: ${fullSourceUrl}`);
    const downloadStartTime = Date.now();

    const response = await fetch(fullSourceUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const downloadDuration = Date.now() - downloadStartTime;
    console.error(
      `✅ Downloaded ${buffer.length} bytes (${(buffer.length / 1024 / 1024).toFixed(2)} MB) in ${(downloadDuration / 1000).toFixed(1)}s`
    );

    // Create a File object from the downloaded buffer
    const file = new File([buffer], fileName, { type: contentType });

    // Upload to Blob storage
    console.error(`\n⬆️ Uploading to Vercel Blob: ${targetBlobPath}`);
    const uploadStartTime = Date.now();

    const uploadResult = await blobService.uploadFile(file, {
      pathname: path.dirname(targetBlobPath),
      filename: path.basename(targetBlobPath),
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });

    const uploadDuration = Date.now() - uploadStartTime;
    console.error(`✅ Uploaded to ${uploadResult.url} in ${(uploadDuration / 1000).toFixed(1)}s`);

    // Verify the upload
    console.error(`\n🔍 Verifying upload...`);
    const verifyResult = await blobService.getFileInfo(uploadResult.url);
    console.error(
      `Size: ${verifyResult.size} bytes (${(verifyResult.size / 1024 / 1024).toFixed(2)} MB)`
    );
    console.error(`Content-Type: ${verifyResult.contentType}`);

    if (verifyResult.size === buffer.length) {
      console.error(`\n✅ Verification passed: Sizes match`);
    } else {
      console.error(
        `\n❌ Verification failed: Size mismatch (expected ${buffer.length}, got ${verifyResult.size})`
      );
    }

    // Success
    console.error(`\n🎉 File migration completed successfully!`);
  } catch (error) {
    console.error(`\n❌ Migration failed:`, error instanceof Error ? error.message : String(error));
  }
}

// Run the batch migration
async function runBatchMigration(): Promise<void> {
  console.error(`\nStarting batch migration for book numbers ${startBook} through ${endBook}`);

  const results = {
    total: endBook - startBook + 1,
    successful: 0,
    failed: 0,
    skipped: 0,
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

  console.error(`\n📊 Batch Migration Summary`);
  console.error(`------------------`);
  console.error(`Total files: ${results.total}`);
  console.error(`Successful : ${results.successful}`);
  console.error(`Failed     : ${results.failed}`);
  console.error(`Skipped    : ${results.skipped}`);
  console.error(`Duration   : ${duration.toFixed(1)} seconds`);

  console.error(`\n✅ Batch migration completed!`);
}

// Run the migration
runBatchMigration().catch((error) => {
  console.error('Batch migration failed:', error);
  process.exit(1);
});
