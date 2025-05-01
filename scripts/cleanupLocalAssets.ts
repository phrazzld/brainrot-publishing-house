/**
 * Script to clean up local assets after successful migration to Blob storage
 *
 * This script:
 * 1. Verifies assets exist in Blob storage
 * 2. Only removes assets that have been confirmed to exist in Blob
 * 3. Generates a report of what was deleted and what was kept
 * 4. Has a dry-run mode for safety (enabled by default)
 */
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { exit } from 'process';

import translations from '../translations';
import { assetExistsInBlobStorage } from '../utils';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

interface AssetCleanupResult {
  path: string;
  localPath: string;
  existsInBlob: boolean;
  wasDeleted: boolean;
  error?: string;
  type: 'cover' | 'chapter' | 'audio';
}

interface BookCleanupResult {
  slug: string;
  title: string;
  results: AssetCleanupResult[];
  summary: {
    totalAssets: number;
    existInBlob: number;
    deleted: number;
    keptLocal: number;
    errors: number;
  };
}

interface CleanupReport {
  date: string;
  dryRun: boolean;
  overallSummary: {
    totalBooks: number;
    totalAssets: number;
    assetsInBlob: number;
    assetsDeleted: number;
    assetsKept: number;
    errors: number;
  };
  bookResults: BookCleanupResult[];
}

// Converts a blob URL path to a local file path
function blobPathToLocalPath(blobPath: string): string {
  // Handle full URLs
  if (blobPath.startsWith('http')) {
    try {
      const url = new URL(blobPath);
      // Extract the path from the URL
      let urlPath = url.pathname;
      // Strip any base paths like '/books/'
      if (urlPath.startsWith('/')) {
        urlPath = urlPath.substring(1);
      }

      // Now process the path without the URL part
      return blobPathToLocalPath(urlPath);
    } catch (error) {
      console.error(`Error parsing URL: ${blobPath}`, error);
      return '';
    }
  }

  if (blobPath.startsWith('/')) {
    // Already a local path
    return path.join(process.cwd(), blobPath.replace(/^\//, ''));
  }

  // Handle common patterns
  if (blobPath.startsWith('books/')) {
    // Convert books/hamlet/images/hamlet-01.png to public/assets/hamlet/images/hamlet-01.png
    const parts = blobPath.split('/');
    if (parts.length >= 4) {
      const [, bookSlug, assetType, ...rest] = parts;
      return path.join(process.cwd(), 'public', 'assets', bookSlug, assetType, ...rest);
    }
  }

  if (blobPath.startsWith('images/')) {
    // Convert images/file.png to public/assets/images/file.png
    return path.join(process.cwd(), 'public', 'assets', blobPath);
  }

  // Fallback - don't delete if we can't determine the path
  return '';
}

// Process a single asset
async function processAsset(
  assetPath: string,
  type: 'cover' | 'chapter' | 'audio',
  dryRun: boolean
): Promise<AssetCleanupResult> {
  const result: AssetCleanupResult = {
    path: assetPath,
    localPath: blobPathToLocalPath(assetPath),
    existsInBlob: false,
    wasDeleted: false,
    type,
  };

  try {
    // Check if asset exists in Blob storage
    result.existsInBlob = await assetExistsInBlobStorage(assetPath);

    // If it exists in Blob and we have a valid local path, delete it
    if (result.existsInBlob && result.localPath && fs.existsSync(result.localPath)) {
      if (!dryRun) {
        fs.unlinkSync(result.localPath);
        result.wasDeleted = true;
      } else {
        // In dry run, mark what would be deleted
        result.wasDeleted = false; // explicitly false for dry run
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

// Main cleanup function
async function cleanupLocalAssets(dryRun: boolean = true): Promise<CleanupReport> {
  console.log(`Starting local asset cleanup ${dryRun ? '(DRY RUN)' : ''}`);

  const bookResults: BookCleanupResult[] = [];
  let totalAssets = 0;
  let assetsInBlob = 0;
  let assetsDeleted = 0;
  let assetsKept = 0;
  let errors = 0;

  // Process each book
  for (const book of translations) {
    console.log(`Processing book: ${book.title} (${book.slug})`);

    const bookResult: BookCleanupResult = {
      slug: book.slug,
      title: book.title,
      results: [],
      summary: {
        totalAssets: 0,
        existInBlob: 0,
        deleted: 0,
        keptLocal: 0,
        errors: 0,
      },
    };

    // Process cover image
    bookResult.summary.totalAssets++;
    totalAssets++;

    const coverResult = await processAsset(book.coverImage, 'cover', dryRun);
    bookResult.results.push(coverResult);

    if (coverResult.existsInBlob) {
      bookResult.summary.existInBlob++;
      assetsInBlob++;
    }

    if (coverResult.wasDeleted) {
      bookResult.summary.deleted++;
      assetsDeleted++;
    } else if (coverResult.existsInBlob) {
      bookResult.summary.keptLocal++;
      assetsKept++;
    }

    if (coverResult.error) {
      bookResult.summary.errors++;
      errors++;
    }

    // Process chapters
    for (const chapter of book.chapters) {
      // Chapter text
      bookResult.summary.totalAssets++;
      totalAssets++;

      const chapterResult = await processAsset(chapter.text, 'chapter', dryRun);
      bookResult.results.push(chapterResult);

      if (chapterResult.existsInBlob) {
        bookResult.summary.existInBlob++;
        assetsInBlob++;
      }

      if (chapterResult.wasDeleted) {
        bookResult.summary.deleted++;
        assetsDeleted++;
      } else if (chapterResult.existsInBlob) {
        bookResult.summary.keptLocal++;
        assetsKept++;
      }

      if (chapterResult.error) {
        bookResult.summary.errors++;
        errors++;
      }

      // Audio (if available)
      if (chapter.audioSrc) {
        bookResult.summary.totalAssets++;
        totalAssets++;

        const audioResult = await processAsset(chapter.audioSrc, 'audio', dryRun);
        bookResult.results.push(audioResult);

        if (audioResult.existsInBlob) {
          bookResult.summary.existInBlob++;
          assetsInBlob++;
        }

        if (audioResult.wasDeleted) {
          bookResult.summary.deleted++;
          assetsDeleted++;
        } else if (audioResult.existsInBlob) {
          bookResult.summary.keptLocal++;
          assetsKept++;
        }

        if (audioResult.error) {
          bookResult.summary.errors++;
          errors++;
        }
      }
    }

    bookResults.push(bookResult);
  }

  // Generate report
  const report: CleanupReport = {
    date: new Date().toISOString(),
    dryRun,
    overallSummary: {
      totalBooks: translations.length,
      totalAssets,
      assetsInBlob,
      assetsDeleted,
      assetsKept,
      errors,
    },
    bookResults,
  };

  // Output report to console
  console.log('\nLocal Asset Cleanup Report:');
  console.log(`Date: ${new Date().toLocaleString()}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no files deleted)' : 'ACTUAL RUN (files deleted)'}`);
  console.log(`Total Books: ${report.overallSummary.totalBooks}`);
  console.log(`Total Assets: ${report.overallSummary.totalAssets}`);
  console.log(`Assets in Blob: ${report.overallSummary.assetsInBlob}`);
  console.log(`Assets Deleted: ${report.overallSummary.assetsDeleted}`);
  console.log(`Assets Kept: ${report.overallSummary.assetsKept}`);
  console.log(`Errors: ${report.overallSummary.errors}`);

  // Save report to file
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }

  const reportPath = path.join(
    reportDir,
    `cleanup-report-${dryRun ? 'dry-run' : 'actual'}-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to ${reportPath}`);

  return report;
}

// Handle command-line arguments
async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--delete');
  const interactive = !args.includes('--no-interactive');

  console.log('Local Asset Cleanup Tool');
  console.log('========================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'DELETE'}`);

  if (!dryRun && interactive) {
    console.log('\nWARNING: This will permanently delete local assets that exist in Blob storage.');
    console.log('To perform a dry run (no files will be deleted), run without the --delete flag.');
    console.log('\nAre you sure you want to proceed? (yes/no)');

    // Simple prompt implementation
    const { createInterface } = await import('readline');
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question('> ', resolve);
    });

    readline.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('Operation cancelled.');
      exit(0);
    }
  }

  try {
    await cleanupLocalAssets(dryRun);
    console.log('\nCleanup completed successfully!');

    if (dryRun) {
      console.log('\nThis was a dry run. No files were actually deleted.');
      console.log('To delete files, run with the --delete flag:');
      console.log('npx tsx scripts/cleanupLocalAssets.ts --delete');
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
    exit(1);
  }
}

// Run the script if executed directly
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''));
if (isMainModule) {
  main();
}

export default cleanupLocalAssets;
