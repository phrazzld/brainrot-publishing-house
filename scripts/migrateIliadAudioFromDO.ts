#!/usr/bin/env tsx
/**
 * Migrate The Iliad Audio Files from Digital Ocean to Vercel Blob
 *
 * This script specifically migrates the full audiobook, introduction, and
 * translator's preface files for The Iliad from Digital Ocean Spaces to Vercel Blob.
 */
import * as dotenv from 'dotenv';
import fs from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

import { createScriptLogger } from '../utils/createScriptLogger.js';
import { createServices } from '../utils/createServices.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configure logger
const logger = createScriptLogger({
  scriptName: 'migrate-iliad-audio-from-do',
  context: 'migration',
});

// File definitions
const FILES_TO_MIGRATE = [
  {
    doPath: 'the-iliad/audio/full-audiobook.mp3',
    blobPath: 'assets/audio/the-iliad/full-audiobook.mp3',
    description: 'Full Iliad Audiobook',
    expectedSize: 223120711, // 212.78 MB
  },
  {
    doPath: 'the-iliad/audio/introduction.mp3',
    blobPath: 'assets/audio/the-iliad/introduction.mp3',
    description: 'Iliad Introduction',
    expectedSize: 8207287, // 7.83 MB
  },
  {
    doPath: 'the-iliad/audio/translators-preface.mp3',
    blobPath: 'assets/audio/the-iliad/translators-preface.mp3',
    description: "Iliad Translator's Preface",
    expectedSize: 7567825, // 7.22 MB
  },
];

interface MigrationOptions {
  dryRun: boolean;
  force: boolean;
  skipExisting: boolean;
}

/**
 * Download file from Digital Ocean Spaces
 */
async function downloadFromDigitalOcean(doPath: string, localPath: string): Promise<void> {
  const doUrl = `https://brainrot-publishing.nyc3.digitaloceanspaces.com/${doPath}`;

  logger.info({
    msg: 'Downloading from Digital Ocean',
    doPath,
    doUrl,
    localPath,
  });

  const response = await fetch(doUrl);

  if (!response.ok) {
    throw new Error(`Failed to download from DO: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await fs.writeFile(localPath, buffer);

  logger.info({
    msg: 'Downloaded successfully',
    doPath,
    localPath,
    sizeBytes: buffer.length,
    sizeMB: (buffer.length / 1024 / 1024).toFixed(2),
  });
}

/**
 * Upload file to Vercel Blob
 */
async function uploadToVercelBlob(localPath: string, blobPath: string): Promise<string> {
  const { blobService } = createServices({ logger });

  logger.info({
    msg: 'Uploading to Vercel Blob',
    localPath,
    blobPath,
  });

  // Read file
  const fileBuffer = await fs.readFile(localPath);
  const file = new File([fileBuffer], path.basename(blobPath), {
    type: 'audio/mpeg',
  });

  // Upload to blob
  const result = await blobService.uploadFile(file, {
    pathname: blobPath,
    access: 'public',
  });

  logger.info({
    msg: 'Uploaded successfully',
    localPath,
    blobPath,
    url: result.url,
    sizeBytes: fileBuffer.length,
    sizeMB: (fileBuffer.length / 1024 / 1024).toFixed(2),
  });

  return result.url;
}

/**
 * Check if file exists in Vercel Blob
 */
async function checkBlobExists(blobPath: string): Promise<boolean> {
  const { assetService } = createServices({ logger });

  try {
    const [assetType, bookSlug, assetName] = blobPath.split('/').slice(1); // Remove 'assets' prefix
    const exists = await assetService.assetExists(assetType as any, bookSlug, assetName);
    return exists;
  } catch (error) {
    logger.debug({
      msg: 'Asset existence check failed',
      blobPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Migrate a single file
 */
async function migrateFile(
  fileConfig: (typeof FILES_TO_MIGRATE)[0],
  options: MigrationOptions,
  tempDir: string,
): Promise<boolean> {
  const { doPath, blobPath, description, expectedSize } = fileConfig;

  logger.info({
    msg: 'Starting migration',
    description,
    doPath,
    blobPath,
    expectedSizeMB: (expectedSize / 1024 / 1024).toFixed(2),
  });

  // Check if already exists in Vercel Blob
  if (!options.force && options.skipExisting) {
    const exists = await checkBlobExists(blobPath);
    if (exists) {
      logger.info({
        msg: 'File already exists in Vercel Blob, skipping',
        description,
        blobPath,
      });
      return true;
    }
  }

  if (options.dryRun) {
    logger.info({
      msg: 'DRY RUN: Would migrate file',
      description,
      doPath,
      blobPath,
    });
    return true;
  }

  const localPath = path.join(tempDir, path.basename(blobPath));

  try {
    // Download from Digital Ocean
    await downloadFromDigitalOcean(doPath, localPath);

    // Verify file size
    const stats = await fs.stat(localPath);
    if (Math.abs(stats.size - expectedSize) > 1024) {
      // Allow 1KB variance
      logger.warn({
        msg: 'File size mismatch',
        description,
        expectedSize,
        actualSize: stats.size,
        difference: stats.size - expectedSize,
      });
    }

    // Upload to Vercel Blob
    const blobUrl = await uploadToVercelBlob(localPath, blobPath);

    // Clean up local file
    await fs.unlink(localPath);

    logger.info({
      msg: 'Migration completed successfully',
      description,
      blobUrl,
    });

    return true;
  } catch (error) {
    logger.error({
      msg: 'Migration failed',
      description,
      doPath,
      blobPath,
      error: error instanceof Error ? error.message : String(error),
    });

    // Clean up on error
    try {
      await fs.unlink(localPath);
    } catch {
      // Ignore cleanup errors
    }

    return false;
  }
}

/**
 * Parse command line options
 */
function parseOptions(): MigrationOptions {
  const args = process.argv.slice(2);

  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    skipExisting: !args.includes('--force'), // Skip existing unless force is specified
  };
}

/**
 * Main migration function
 */
async function main() {
  const options = parseOptions();

  logger.info({
    msg: 'Starting Iliad audio migration from Digital Ocean to Vercel Blob',
    options,
    fileCount: FILES_TO_MIGRATE.length,
  });

  // Create temporary directory
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), 'iliad-audio-migration-'));
  logger.info({ msg: 'Created temporary directory', tempDir });

  let successCount = 0;
  let failureCount = 0;

  try {
    // Migrate each file
    for (const fileConfig of FILES_TO_MIGRATE) {
      const success = await migrateFile(fileConfig, options, tempDir);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    // Summary
    logger.info({
      msg: 'Migration completed',
      totalFiles: FILES_TO_MIGRATE.length,
      successful: successCount,
      failed: failureCount,
      dryRun: options.dryRun,
    });

    if (failureCount > 0) {
      process.exit(1);
    }
  } finally {
    // Clean up temp directory
    try {
      await fs.rmdir(tempDir);
      logger.info({ msg: 'Cleaned up temporary directory', tempDir });
    } catch (error) {
      logger.warn({
        msg: 'Failed to clean up temporary directory',
        tempDir,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// Run the migration
main().catch((error) => {
  logger.error({
    msg: 'Fatal error during migration',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
