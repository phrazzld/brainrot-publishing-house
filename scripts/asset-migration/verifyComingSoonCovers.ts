#!/usr/bin/env tsx
/**
 * Verify Coming Soon Book Covers Script
 *
 * This script verifies that all coming soon books have proper cover images
 * in Vercel Blob storage. It checks the translation files, asset path mappings,
 * and attempts to access the images in Blob storage.
 *
 * Usage:
 *   npx tsx scripts/asset-migration/verifyComingSoonCovers.ts [--verbose] [--fix] [--log=file.json]
 *
 * Options:
 *   --verbose       Show detailed information for each book
 *   --fix           Attempt to fix missing images if possible
 *   --log=file.json Output JSON log file (default: coming-soon-covers-verification.json)
 */
import * as dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import translations from '../../translations.js';
import { ASSET_PATH_MAPPINGS } from '../../utils/assetPathMapping.js';
import logger from '../../utils/logger.js';
import { blobPathService } from '../../utils/services/BlobPathService.js';
import { blobService } from '../../utils/services/BlobService.js';

// Initialize environment
dotenv.config({ path: '.env.local' });

// Ensure we have required environment variables
if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_READ_TOKEN) {
  logger.error({
    msg: 'Error: BLOB_READ_WRITE_TOKEN or BLOB_READ_TOKEN environment variable is required. Please set one of these variables in .env.local file',
  });
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_BLOB_BASE_URL) {
  const defaultUrl = 'https://public.blob.vercel-storage.com';
  logger.warn({
    msg: `Warning: NEXT_PUBLIC_BLOB_BASE_URL is not set. Using default: ${defaultUrl}`,
  });
  process.env.NEXT_PUBLIC_BLOB_BASE_URL = defaultUrl;
}

// Get script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Options type
interface VerificationOptions {
  verbose: boolean;
  fix: boolean;
  logFile: string;
}

// Verification result for a single book
interface BookVerificationResult {
  slug: string;
  title: string;
  status: 'available' | 'coming soon';
  coverPath: string;
  blobPath: string;
  blobUrl: string;
  exists: boolean;
  hasMappingEntry: boolean;
  error?: string;
  fileExists?: boolean;
}

// Overall verification result
interface VerificationResult {
  total: number;
  available: number;
  comingSoon: number;
  existingCovers: number;
  missingCovers: number;
  books: Record<string, BookVerificationResult>;
  startTime: string;
  endTime: string;
  options: VerificationOptions;
}

/**
 * Parse command line arguments
 */
function parseArgs(): VerificationOptions {
  const options: VerificationOptions = {
    verbose: false,
    fix: false,
    logFile: 'coming-soon-covers-verification.json',
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--fix') {
      options.fix = true;
    } else if (arg.startsWith('--log=')) {
      options.logFile = arg.substring('--log='.length);
    }
  }

  return options;
}

/**
 * Checks whether a book cover image exists in Vercel Blob
 */
async function checkImageExists(url: string): Promise<boolean> {
  try {
    // First try direct HTTP HEAD request which is more reliable
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return true;
      }
    } catch {
      // Fall back to blob service if direct fetch fails
    }

    // Then try blob service getFileInfo
    const fileInfo = await blobService.getFileInfo(url);
    return fileInfo.size > 0;
  } catch (error) {
    logger.warn({
      msg: `Error checking image existence`,
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Checks if a file exists in the public directory
 */
async function checkFileExists(legacyPath: string): Promise<boolean> {
  if (!legacyPath.startsWith('/')) {
    return false;
  }

  try {
    const publicPath = path.join(projectRoot, 'public', legacyPath);
    await fs.access(publicPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a legacy path to a blob path
 */
function getLegacyToBlobPathMapping(legacyPath: string): string | null {
  // Check if there's a direct mapping
  if (ASSET_PATH_MAPPINGS[legacyPath]) {
    return ASSET_PATH_MAPPINGS[legacyPath];
  }

  // Otherwise use standard conversion
  return blobPathService.convertLegacyPath(legacyPath);
}

/**
 * Verify all book cover images
 */
async function verifyBookCovers(options: VerificationOptions): Promise<VerificationResult> {
  const startTime = new Date();

  const result: VerificationResult = {
    total: 0,
    available: 0,
    comingSoon: 0,
    existingCovers: 0,
    missingCovers: 0,
    books: {},
    startTime: startTime.toISOString(),
    endTime: '',
    options,
  };

  logger.info({
    msg: 'Starting book cover verification',
    options,
  });

  // Verify each book's cover image
  for (const book of translations) {
    try {
      const legacyPath = book.coverImage;
      const blobPath = getLegacyToBlobPathMapping(legacyPath);
      const blobUrl = blobService.getUrlForPath(blobPath || legacyPath);

      logger.info({
        msg: `Checking ${book.slug} cover image`,
        slug: book.slug,
        legacyPath,
        blobPath: blobPath || 'N/A',
        status: book.status,
      });

      // Verify image exists in blob storage
      const exists = await checkImageExists(blobUrl);

      // Also check if file exists in public directory
      const fileExists = await checkFileExists(legacyPath);

      // Store result
      const verificationResult: BookVerificationResult = {
        slug: book.slug,
        title: book.title,
        status: book.status,
        coverPath: legacyPath,
        blobPath: blobPath || legacyPath,
        blobUrl,
        exists,
        fileExists,
        hasMappingEntry: !!ASSET_PATH_MAPPINGS[legacyPath],
      };

      // Update counters
      result.total++;
      if (book.status === 'available') {
        result.available++;
      } else {
        result.comingSoon++;
      }

      if (exists) {
        result.existingCovers++;

        if (options.verbose) {
          logger.info({
            msg: `✅ Cover exists for ${book.slug}`,
            slug: book.slug,
            url: blobUrl,
          });
        }
      } else {
        result.missingCovers++;

        logger.warn({
          msg: `⚠️ Cover missing for ${book.slug}`,
          slug: book.slug,
          url: blobUrl,
          legacyPath,
          blobPath: blobPath || 'N/A',
        });

        verificationResult.error = `Image not found at ${blobUrl}`;
      }

      result.books[book.slug] = verificationResult;
    } catch (error) {
      logger.error({
        msg: `Error verifying ${book.slug}`,
        slug: book.slug,
        error: error instanceof Error ? error.message : String(error),
      });

      // Store error
      result.books[book.slug] = {
        slug: book.slug,
        title: book.title,
        status: book.status,
        coverPath: book.coverImage,
        blobPath: '',
        blobUrl: '',
        exists: false,
        hasMappingEntry: false,
        error: error instanceof Error ? error.message : String(error),
      };

      result.missingCovers++;
    }
  }

  // Complete results
  const endTime = new Date();
  result.endTime = endTime.toISOString();

  // Save results
  await saveResults(result, options.logFile);

  return result;
}

/**
 * Save verification results to a file
 */
async function saveResults(result: VerificationResult, filePath: string): Promise<void> {
  try {
    const logPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(projectRoot, 'migration-logs', filePath);

    // Ensure directory exists
    const dir = path.dirname(logPath);
    await fs.mkdir(dir, { recursive: true });

    // Write results
    await fs.writeFile(logPath, JSON.stringify(result, null, 2), 'utf8');

    logger.info({
      msg: `Verification results saved to ${logPath}`,
    });
  } catch (error) {
    logger.error({
      msg: `Error saving verification results`,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Print verification summary
 */
function printSummary(result: VerificationResult): void {
  logger.info({
    msg: '===== VERIFICATION SUMMARY =====',
    total: result.total,
    available: result.available,
    comingSoon: result.comingSoon,
    existingCovers: result.existingCovers,
    missingCovers: result.missingCovers,
  });

  if (result.missingCovers > 0) {
    const missingBooks = Object.values(result.books)
      .filter((book) => !book.exists)
      .map((book) => {
        const localStatus = book.fileExists ? '[Local✓]' : '[Local✗]';
        return `${book.slug}: ${localStatus} ${book.coverPath}`;
      });

    logger.warn({
      msg: 'Books with missing covers',
      missingBooks,
    });
  }

  // Coming soon books summary
  const comingSoonBookDetails = Object.values(result.books)
    .filter((book) => book.status === 'coming soon')
    .map((book) => {
      const blobStatus = book.exists ? '✅' : '❌';
      const localStatus = book.fileExists ? '📂' : '🚫';
      return `${blobStatus} ${localStatus} ${book.slug}: ${book.blobPath}`;
    });

  logger.info({
    msg: 'Coming Soon Books',
    comingSoonBookDetails,
  });

  // Show next steps if we have local files that need uploading
  const localOnlyFiles = Object.values(result.books).filter(
    (book) => !book.exists && book.fileExists,
  );

  if (localOnlyFiles.length > 0) {
    const filesToUpload = localOnlyFiles.map((book) => `${book.slug}: ${book.coverPath}`);
    const uploadCommand =
      'npm run migrate:cover-images --books=' + localOnlyFiles.map((b) => b.slug).join(',');

    logger.info({
      msg: 'RECOMMENDATION: Local files that need to be uploaded to Blob storage',
      filesToUpload,
      uploadCommand,
    });
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse arguments
    const options = parseArgs();

    // Run verification
    const result = await verifyBookCovers(options);

    // Print summary
    printSummary(result);

    // Exit with appropriate code
    process.exit(result.missingCovers > 0 ? 1 : 0);
  } catch (error) {
    logger.error({
      msg: 'Verification failed',
      error: error instanceof Error ? error.message : String(error),
    });

    process.exit(1);
  }
}

// Run the script
main();
