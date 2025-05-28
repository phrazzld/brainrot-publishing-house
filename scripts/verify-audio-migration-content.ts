#!/usr/bin/env node
/**
 * Audio Migration Verification Script
 *
 * Checks that all audio files exist in Blob storage and are real audio files (not placeholders)
 */
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import translations from '../translations/index.js';
import { blobService } from '../utils/services/BlobService.js';

dotenv.config({ path: '.env.local' });

interface VerificationResult {
  bookSlug: string;
  chapterTitle: string;
  audioSrc: string;
  blobUrl: string;
  exists: boolean;
  isValidAudio: boolean;
  size?: number;
  contentType?: string;
  error?: string;
}

async function verifyAudioMigration(bookSlugs?: string[]) {
  const results: VerificationResult[] = [];
  const books = bookSlugs ? translations.filter((t) => bookSlugs.includes(t.slug)) : translations;

  console.log(`\n🔍 Verifying audio migration for ${books.length} books`);

  let totalFiles = 0;
  let existingFiles = 0;
  let validAudioFiles = 0;
  let smallPlaceholders = 0;
  let missingFiles = 0;

  // Process each book
  for (const book of books) {
    console.log(`\n📖 Checking book: ${book.title} (${book.slug})`);

    // Get all chapters with audio
    const chaptersWithAudio = book.chapters.filter((c) => c.audioSrc);

    if (chaptersWithAudio.length === 0) {
      console.log(`   No audio files found for this book`);
      continue;
    }

    totalFiles += chaptersWithAudio.length;
    console.log(`   Found ${chaptersWithAudio.length} audio files`);

    // Check each audio file
    for (const chapter of chaptersWithAudio) {
      if (!chapter.audioSrc) continue;

      const audioSrc = chapter.audioSrc;
      const fileName = path.basename(audioSrc);
      const blobPath = `${book.slug}/audio/${fileName}`;
      const blobUrl = blobService.getUrlForPath(blobPath);

      console.log(`\n   Chapter: ${chapter.title}`);
      console.log(`   Blob URL: ${blobUrl}`);

      try {
        // Get file info from Blob storage
        const fileInfo = await blobService.getFileInfo(blobUrl);

        // Check if it's a valid audio file (larger than 10KB)
        const isValidAudio =
          fileInfo.size > 100 * 1024 &&
          (fileInfo.contentType?.startsWith('audio/') ||
            fileInfo.contentType === 'application/octet-stream');

        existingFiles++;
        if (isValidAudio) {
          validAudioFiles++;
          console.log(
            `   ✅ Valid audio file: ${formatSize(fileInfo.size)}, ${fileInfo.contentType}`,
          );
        } else {
          smallPlaceholders++;
          console.log(
            `   ⚠️ Small placeholder file: ${formatSize(fileInfo.size)}, ${fileInfo.contentType}`,
          );
        }

        results.push({
          bookSlug: book.slug,
          chapterTitle: chapter.title,
          audioSrc,
          blobUrl,
          exists: true,
          isValidAudio,
          size: fileInfo.size,
          contentType: fileInfo.contentType,
        });
      } catch (error) {
        missingFiles++;
        console.log(`   ❌ File not found in Blob storage`);

        results.push({
          bookSlug: book.slug,
          chapterTitle: chapter.title,
          audioSrc,
          blobUrl,
          exists: false,
          isValidAudio: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // Print summary
  console.log(`\n\n📊 Audio Migration Verification Summary`);
  console.log(`------------------------------------`);
  console.log(`Total audio files expected: ${totalFiles}`);
  console.log(
    `Files found in Blob storage: ${existingFiles} (${formatPercentage(existingFiles, totalFiles)})`,
  );
  console.log(
    `Valid audio files: ${validAudioFiles} (${formatPercentage(validAudioFiles, totalFiles)})`,
  );
  console.log(
    `Small placeholder files: ${smallPlaceholders} (${formatPercentage(smallPlaceholders, totalFiles)})`,
  );
  console.log(`Missing files: ${missingFiles} (${formatPercentage(missingFiles, totalFiles)})`);

  // Save report
  const report = {
    date: new Date().toISOString(),
    summary: {
      totalFiles,
      existingFiles,
      validAudioFiles,
      smallPlaceholders,
      missingFiles,
      existingPercentage: formatPercentage(existingFiles, totalFiles),
      validPercentage: formatPercentage(validAudioFiles, totalFiles),
    },
    results,
  };

  const reportPath = path.join(process.cwd(), 'reports', `audio-verification-${Date.now()}.json`);

  // Ensure reports directory exists
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);

  return report;
}

// Helper to format file size
function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return 'Unknown';

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

// Helper to format percentage
function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

// Parse command line arguments
const bookSlugs = process.argv.slice(2);

// Run verification
verifyAudioMigration(bookSlugs.length > 0 ? bookSlugs : undefined).catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
