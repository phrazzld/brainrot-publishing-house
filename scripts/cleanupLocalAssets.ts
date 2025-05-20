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
import { logger as rootLogger } from '../utils/logger';

// Create a script-specific logger instance
const logger = rootLogger.child({ script: 'cleanupLocalAssets.ts' });

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
      logger.error({ msg: `Error parsing URL: ${blobPath}`, error, blobPath });
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

// Helper to update counters based on asset result
function updateCounters(
  result: AssetCleanupResult, 
  bookSummary: BookCleanupResult['summary'],
  globalCounters: { assetsInBlob: number; assetsDeleted: number; assetsKept: number; errors: number }
): void {
  if (result.existsInBlob) {
    bookSummary.existInBlob++;
    globalCounters.assetsInBlob++;
  }

  if (result.wasDeleted) {
    bookSummary.deleted++;
    globalCounters.assetsDeleted++;
  } else if (result.existsInBlob) {
    bookSummary.keptLocal++;
    globalCounters.assetsKept++;
  }

  if (result.error) {
    bookSummary.errors++;
    globalCounters.errors++;
  }
}

// Process all assets for a single chapter
async function processChapterAssets(
  chapter: { text: string; audioSrc?: string },
  dryRun: boolean,
  bookResult: BookCleanupResult,
  globalCounters: { totalAssets: number; assetsInBlob: number; assetsDeleted: number; assetsKept: number; errors: number }
): Promise<void> {
  // Process chapter text
  bookResult.summary.totalAssets++;
  globalCounters.totalAssets++;

  const chapterResult = await processAsset(chapter.text, 'chapter', dryRun);
  bookResult.results.push(chapterResult);
  updateCounters(chapterResult, bookResult.summary, globalCounters);

  // Process audio (if available)
  if (chapter.audioSrc) {
    bookResult.summary.totalAssets++;
    globalCounters.totalAssets++;

    const audioResult = await processAsset(chapter.audioSrc, 'audio', dryRun);
    bookResult.results.push(audioResult);
    updateCounters(audioResult, bookResult.summary, globalCounters);
  }
}

// Process all assets for a single book
async function processBookAssets(
  book: { slug: string; title: string; coverImage: string; chapters: Array<{ text: string; audioSrc?: string }> },
  dryRun: boolean,
  globalCounters: { totalAssets: number; assetsInBlob: number; assetsDeleted: number; assetsKept: number; errors: number }
): Promise<BookCleanupResult> {
  logger.info({ msg: `Processing book: ${book.title} (${book.slug})`, bookTitle: book.title, bookSlug: book.slug });

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
  globalCounters.totalAssets++;

  const coverResult = await processAsset(book.coverImage, 'cover', dryRun);
  bookResult.results.push(coverResult);
  updateCounters(coverResult, bookResult.summary, globalCounters);

  // Process chapters
  for (const chapter of book.chapters) {
    await processChapterAssets(chapter, dryRun, bookResult, globalCounters);
  }

  return bookResult;
}

// Save the cleanup report to a file
function saveCleanupReport(report: CleanupReport): string {
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }

  const reportPath = path.join(
    reportDir,
    `cleanup-report-${report.dryRun ? 'dry-run' : 'actual'}-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logger.info({ msg: `Report saved to ${reportPath}`, reportPath });

  return reportPath;
}

// Main cleanup function
async function cleanupLocalAssets(dryRun: boolean = true): Promise<CleanupReport> {
  logger.info({ msg: `Starting local asset cleanup ${dryRun ? '(DRY RUN)' : ''}`, dryRun });

  const bookResults: BookCleanupResult[] = [];
  const globalCounters = {
    totalAssets: 0,
    assetsInBlob: 0,
    assetsDeleted: 0,
    assetsKept: 0,
    errors: 0
  };

  // Process each book
  for (const book of translations) {
    const bookResult = await processBookAssets(book, dryRun, globalCounters);
    bookResults.push(bookResult);
  }

  // Generate report
  const report: CleanupReport = {
    date: new Date().toISOString(),
    dryRun,
    overallSummary: {
      totalBooks: translations.length,
      totalAssets: globalCounters.totalAssets,
      assetsInBlob: globalCounters.assetsInBlob,
      assetsDeleted: globalCounters.assetsDeleted,
      assetsKept: globalCounters.assetsKept,
      errors: globalCounters.errors,
    },
    bookResults,
  };

  // Output report to console
  logger.info({ 
    msg: 'Local Asset Cleanup Report', 
    report: { 
      date: new Date().toLocaleString(),
      mode: dryRun ? 'DRY RUN (no files deleted)' : 'ACTUAL RUN (files deleted)',
      totalBooks: report.overallSummary.totalBooks,
      totalAssets: report.overallSummary.totalAssets,
      assetsInBlob: report.overallSummary.assetsInBlob,
      assetsDeleted: report.overallSummary.assetsDeleted,
      assetsKept: report.overallSummary.assetsKept,
      errors: report.overallSummary.errors
    }
  });

  // Save report to file
  saveCleanupReport(report);

  return report;
}

// Handle command-line arguments
async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--delete');
  const interactive = !args.includes('--no-interactive');

  logger.info({ msg: 'Local Asset Cleanup Tool', mode: dryRun ? 'DRY RUN' : 'DELETE' });

  if (!dryRun && interactive) {
    logger.warn({ msg: 'WARNING: This will permanently delete local assets that exist in Blob storage.' });
    logger.info({ msg: 'To perform a dry run (no files will be deleted), run without the --delete flag.' });
    // Using console.log directly for interactive CLI prompts since they need to be displayed directly to the user
    // This is an allowed exception to the no-console rule for user interaction
    // eslint-disable-next-line no-console
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
      logger.info({ msg: 'Operation cancelled by user' });
      exit(0);
    }
  }

  try {
    await cleanupLocalAssets(dryRun);
    logger.info({ msg: 'Cleanup completed successfully!' });

    if (dryRun) {
      logger.info({ 
        msg: 'This was a dry run. No files were actually deleted.', 
        usage: 'To delete files, run with the --delete flag: npx tsx scripts/cleanupLocalAssets.ts --delete'
      });
    }
  } catch (error) {
    logger.error({ msg: 'Cleanup failed', error });
    exit(1);
  }
}

// Run the script if executed directly
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''));
if (isMainModule) {
  main();
}

export default cleanupLocalAssets;
