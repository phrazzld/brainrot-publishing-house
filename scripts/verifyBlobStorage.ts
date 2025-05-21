/**
 * Verification script for Blob Storage
 *
 * This script verifies that all assets have been properly migrated to Blob storage.
 * It generates a report of what has been migrated and what still needs to be migrated.
 */
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import translations from '../translations';
import { assetExistsInBlobStorage } from '../utils';
import { logger as rootLogger } from '../utils/logger';

// Create a script-specific logger instance
const logger = rootLogger.child({ script: 'verifyBlobStorage.ts' });

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

interface AssetVerificationResult {
  path: string;
  exists: boolean;
  type: 'cover' | 'chapter' | 'audio';
}

interface BookVerificationResult {
  slug: string;
  title: string;
  coverImage: AssetVerificationResult;
  chapters: AssetVerificationResult[];
  audio: AssetVerificationResult[];
  summary: {
    total: number;
    migrated: number;
    missing: number;
    coverImageMigrated: boolean;
  };
}

interface VerificationReport {
  date: string;
  overallSummary: {
    totalBooks: number;
    booksWithCover: number;
    booksWithAllContent: number;
    totalAssets: number;
    migratedAssets: number;
    missingAssets: number;
  };
  bookResults: BookVerificationResult[];
}

/**
 * Verify a single asset in blob storage
 */
async function verifyAsset(
  assetPath: string,
  assetType: 'cover' | 'chapter' | 'audio',
  bookSlug: string,
  counters: { totalAssets: number; migratedAssets: number }
): Promise<AssetVerificationResult> {
  counters.totalAssets++;

  try {
    const exists = await assetExistsInBlobStorage(assetPath);

    if (exists) {
      counters.migratedAssets++;
      logger.info({
        msg: `Asset exists in blob storage`,
        path: assetPath,
        type: assetType,
        bookSlug,
      });
    } else {
      logger.warn({
        msg: `Asset missing from blob storage`,
        path: assetPath,
        type: assetType,
        bookSlug,
      });
    }

    return {
      path: assetPath,
      exists,
      type: assetType,
    };
  } catch (error) {
    logger.error({
      msg: `Error checking asset in blob storage`,
      path: assetPath,
      type: assetType,
      bookSlug,
      error,
    });

    return {
      path: assetPath,
      exists: false,
      type: assetType,
    };
  }
}

/**
 * Process and verify all assets for a single book
 */
async function verifyBookAssets(
  book: {
    slug: string;
    title: string;
    coverImage: string;
    chapters: Array<{ text: string; audioSrc?: string }>;
  },
  counters: { totalAssets: number; migratedAssets: number }
): Promise<BookVerificationResult> {
  logger.info({ msg: `Verifying book assets`, bookTitle: book.title, bookSlug: book.slug });

  // Initialize book result
  const bookResult: BookVerificationResult = {
    slug: book.slug,
    title: book.title,
    coverImage: {
      path: book.coverImage,
      exists: false,
      type: 'cover',
    },
    chapters: [],
    audio: [],
    summary: {
      total: 0,
      migrated: 0,
      missing: 0,
      coverImageMigrated: false,
    },
  };

  // Verify cover image
  bookResult.summary.total++;
  const coverResult = await verifyAsset(book.coverImage, 'cover', book.slug, counters);
  bookResult.coverImage = coverResult;

  if (coverResult.exists) {
    bookResult.summary.migrated++;
    bookResult.summary.coverImageMigrated = true;
  } else {
    bookResult.summary.missing++;
  }

  // Verify chapters and audio
  for (const chapter of book.chapters) {
    // Verify chapter text
    bookResult.summary.total++;
    const chapterResult = await verifyAsset(chapter.text, 'chapter', book.slug, counters);
    bookResult.chapters.push(chapterResult);

    if (chapterResult.exists) {
      bookResult.summary.migrated++;
    } else {
      bookResult.summary.missing++;
    }

    // Verify audio if available
    if (chapter.audioSrc) {
      bookResult.summary.total++;
      const audioResult = await verifyAsset(chapter.audioSrc, 'audio', book.slug, counters);
      bookResult.audio.push(audioResult);

      if (audioResult.exists) {
        bookResult.summary.migrated++;
      } else {
        bookResult.summary.missing++;
      }
    }
  }

  return bookResult;
}

/**
 * Save the verification report to a file
 */
function saveVerificationReport(report: VerificationReport): string {
  // Create reports directory if it doesn't exist
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }

  // Generate report path and save the report
  const reportPath = path.join(reportDir, `blob-verification-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logger.info({ msg: `Verification report saved`, path: reportPath });

  return reportPath;
}

/**
 * Calculate overall summary statistics from book results
 */
function calculateOverallSummary(
  bookResults: BookVerificationResult[],
  counters: { totalAssets: number; migratedAssets: number }
): VerificationReport['overallSummary'] {
  return {
    totalBooks: translations.length,
    booksWithCover: bookResults.filter((b) => b.coverImage.exists).length,
    booksWithAllContent: bookResults.filter(
      (b) =>
        b.coverImage.exists && b.chapters.every((c) => c.exists) && b.audio.every((a) => a.exists)
    ).length,
    totalAssets: counters.totalAssets,
    migratedAssets: counters.migratedAssets,
    missingAssets: counters.totalAssets - counters.migratedAssets,
  };
}

/**
 * Main function to verify all assets and generate a report
 */
async function verifyBlobStorage(): Promise<VerificationReport> {
  logger.info({ msg: 'Starting Blob storage verification' });

  const bookResults: BookVerificationResult[] = [];
  const counters = { totalAssets: 0, migratedAssets: 0 };

  // Process each book
  for (const book of translations) {
    const bookResult = await verifyBookAssets(book, counters);
    bookResults.push(bookResult);
  }

  // Calculate overall summary
  const overallSummary = calculateOverallSummary(bookResults, counters);

  // Generate report
  const report: VerificationReport = {
    date: new Date().toISOString(),
    overallSummary,
    bookResults,
  };

  // Output summary
  logger.info({
    msg: 'Blob Storage Verification Report',
    summary: {
      date: new Date().toLocaleString(),
      totalBooks: overallSummary.totalBooks,
      booksWithCover: overallSummary.booksWithCover,
      booksWithAllContent: overallSummary.booksWithAllContent,
      totalAssets: overallSummary.totalAssets,
      migratedAssets: overallSummary.migratedAssets,
      missingAssets: overallSummary.missingAssets,
    },
  });

  // Save report to file
  saveVerificationReport(report);

  return report;
}

// Run the verification if executed directly
// Using import.meta.url to check if this is the main module
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''));
if (isMainModule) {
  verifyBlobStorage()
    .then(() => logger.info({ msg: 'Blob storage verification complete!' }))
    .catch((error) => logger.error({ msg: 'Blob storage verification failed', error }));
}

export default verifyBlobStorage;
