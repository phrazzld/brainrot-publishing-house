#!/usr/bin/env tsx
/**
 * Upload Coming Soon Book Covers Script
 *
 * This script creates and uploads placeholder cover images for coming soon books.
 * It checks the translation files, determines which books are marked as coming soon,
 * and ensures each has a proper cover image in Vercel Blob storage.
 *
 * Usage:
 *   npx tsx scripts/asset-migration/uploadComingSoonCovers.ts [--dry-run] [--force]
 *
 * Options:
 *   --dry-run       Show what would be done without uploading
 *   --force         Force upload even if images already exist
 */
import * as dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import translations from '../../translations.js';
import { ASSET_PATH_MAPPINGS } from '../../utils/assetPathMapping.js';
import logger from '../../utils/logger.js';
import { blobPathService as _blobPathService } from '../../utils/services/BlobPathService.js';
import { blobService } from '../../utils/services/BlobService.js';

// Initialize environment
dotenv.config({ path: '.env.local' });

// Ensure we have required environment variables
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  logger.error({
    msg: 'Error: BLOB_READ_WRITE_TOKEN environment variable is required for uploads. Please set this variable in .env.local file',
  });
  process.exit(1);
}

// Get script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Options type
interface UploadOptions {
  dryRun: boolean;
  force: boolean;
}

// Book upload result
interface BookUploadResult {
  slug: string;
  title: string;
  originalPath: string;
  uploadPath: string;
  uploaded: boolean;
  skipped: boolean;
  error?: string;
}

// Overall upload result
interface UploadResults {
  total: number;
  uploaded: number;
  skipped: number;
  failed: number;
  books: Record<string, BookUploadResult>;
  startTime: string;
  endTime: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): UploadOptions {
  const options: UploadOptions = {
    dryRun: false,
    force: false,
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    }
  }

  return options;
}

/**
 * Checks if an image exists in Blob storage
 */
async function checkImageExists(path: string): Promise<boolean> {
  try {
    const url = blobService.getUrlForPath(path);

    // Try direct HTTP HEAD request
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return true;
      }
    } catch {
      // Fall back to blob service
    }

    // Use blob service
    const fileInfo = await blobService.getFileInfo(url);
    return fileInfo.size > 0;
  } catch {
    return false;
  }
}

/**
 * Get correct blob path for an image
 */
function getBlobPath(legacyPath: string): string {
  // Check if there's a direct mapping in asset path mapping
  if (ASSET_PATH_MAPPINGS[legacyPath]) {
    return ASSET_PATH_MAPPINGS[legacyPath];
  }

  // Otherwise use standard conversion
  return legacyPath.startsWith('/')
    ? legacyPath.substring(1) // Remove leading slash
    : legacyPath;
}

/**
 * Create a simple placeholder image for a book
 */
async function createPlaceholderImage(_title: string): Promise<Buffer> {
  // For now, just return a very simple colored rectangle
  // In a real implementation, we would generate a proper image with text
  // using libraries like Canvas, Jimp, or Sharp

  // This is a 1x1 transparent pixel PNG
  const transparentPixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFJQJCX0sFXQAAAABJRU5ErkJggg==',
    'base64',
  );

  return transparentPixel;
}

/**
 * Upload covers for all coming soon books
 */
async function uploadComingSoonCovers(options: UploadOptions): Promise<UploadResults> {
  const startTime = new Date();

  const results: UploadResults = {
    total: 0,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    books: {},
    startTime: startTime.toISOString(),
    endTime: '',
  };

  logger.info({
    msg: 'Starting coming soon book cover upload',
    options,
  });

  // Filter to coming soon books
  const comingSoonBooks = translations.filter((book) => book.status === 'coming soon');
  results.total = comingSoonBooks.length;

  logger.info({
    msg: `Found ${results.total} coming soon books`,
  });

  // Process each book
  for (const book of comingSoonBooks) {
    try {
      // Check if the image in the translation file already exists in Blob storage
      const originalPath = book.coverImage;
      const uploadPath = getBlobPath(originalPath);

      logger.info({
        msg: `Processing ${book.slug}`,
        slug: book.slug,
        originalPath,
        uploadPath,
      });

      // Check if image already exists
      const exists = await checkImageExists(uploadPath);

      if (exists && !options.force) {
        logger.info({
          msg: `Image already exists for ${book.slug}, skipping`,
          slug: book.slug,
          uploadPath,
        });

        results.skipped++;
        results.books[book.slug] = {
          slug: book.slug,
          title: book.title,
          originalPath,
          uploadPath,
          uploaded: false,
          skipped: true,
        };

        continue;
      }

      // If this is a dry run, don't actually upload
      if (options.dryRun) {
        logger.info({
          msg: `[DRY RUN] Would upload image for ${book.slug} to ${uploadPath}`,
          slug: book.slug,
          uploadPath,
        });

        results.skipped++;
        results.books[book.slug] = {
          slug: book.slug,
          title: book.title,
          originalPath,
          uploadPath,
          uploaded: false,
          skipped: true,
        };

        continue;
      }

      // Create placeholder image
      const imageData = await createPlaceholderImage(book.title);

      // Determine content type based on path extension
      const contentType = originalPath.toLowerCase().endsWith('.png')
        ? 'image/png'
        : originalPath.toLowerCase().endsWith('.jpg') ||
            originalPath.toLowerCase().endsWith('.jpeg')
          ? 'image/jpeg'
          : 'image/png';

      // Create Blob from Buffer
      const blob = new Blob([imageData], { type: contentType });

      // Upload to Blob storage
      // Get dirpath and filename from the uploadPath
      const dirPath = path.dirname(uploadPath);
      const filename = path.basename(uploadPath);

      logger.info({
        msg: `Uploading image for ${book.slug}`,
        slug: book.slug,
        dirPath,
        filename,
      });

      // Use blobService to upload
      const result = await blobService.uploadFile(
        new File([blob], filename, { type: contentType }),
        {
          pathname: dirPath,
          filename,
          access: 'public',
          // cacheControl: 'max-age=31536000', // 1 year cache - not supported in current UploadOptions
        },
      );

      logger.info({
        msg: `Successfully uploaded image for ${book.slug}`,
        slug: book.slug,
        url: result.url,
      });

      results.uploaded++;
      results.books[book.slug] = {
        slug: book.slug,
        title: book.title,
        originalPath,
        uploadPath,
        uploaded: true,
        skipped: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error({
        msg: `Failed to upload image for ${book.slug}`,
        slug: book.slug,
        error: errorMessage,
      });

      results.failed++;
      results.books[book.slug] = {
        slug: book.slug,
        title: book.title,
        originalPath: book.coverImage,
        uploadPath: getBlobPath(book.coverImage),
        uploaded: false,
        skipped: false,
        error: errorMessage,
      };
    }
  }

  // Complete results
  const endTime = new Date();
  results.endTime = endTime.toISOString();

  // Save results
  const logPath = path.join(projectRoot, 'migration-logs', 'coming-soon-covers-upload.json');
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.writeFile(logPath, JSON.stringify(results, null, 2));

  return results;
}

/**
 * Print upload summary
 */
function printSummary(results: UploadResults): void {
  logger.info({
    msg: '===== UPLOAD SUMMARY =====',
    total: results.total,
    uploaded: results.uploaded,
    skipped: results.skipped,
    failed: results.failed,
  });

  if (results.failed > 0) {
    const failedBooks = Object.values(results.books)
      .filter((book) => !book.uploaded && !book.skipped)
      .map((book) => `${book.slug}: ${book.error}`);

    logger.warn({
      msg: 'Failed uploads',
      failedBooks,
    });
  }

  if (results.uploaded > 0) {
    const uploadedBooks = Object.values(results.books)
      .filter((book) => book.uploaded)
      .map((book) => `${book.slug}: ${book.uploadPath}`);

    logger.info({
      msg: 'Successfully uploaded',
      uploadedBooks,
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

    // Upload covers
    const results = await uploadComingSoonCovers(options);

    // Print summary
    printSummary(results);

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    logger.error({
      msg: 'Upload failed',
      error: error instanceof Error ? error.message : String(error),
    });

    process.exit(1);
  }
}

// Run the script
main();
