#!/usr/bin/env node
/**
 * Delete Placeholder Audio Files from Vercel Blob
 *
 * This script identifies and deletes placeholder audio files (small 1KB files)
 * that were mistakenly created during previous migration attempts.
 *
 * Usage:
 *   npx tsx scripts/deletePlaceholderAudioFiles.ts [options]
 *
 * Options:
 *   --dry-run             Show what would be deleted without actually deleting
 *   --force               Skip confirmation prompt
 *   --size-threshold=N    Set custom size threshold in bytes (default: 10240)
 *   --verbose             Show detailed information for each file
 */
// Load environment variables
import * as dotenv from 'dotenv';
import * as fs from 'node:fs/promises';
// Using path module for output path
import * as path from 'node:path';
import * as readline from 'node:readline';
import { ListBlobResultBlob } from '@vercel/blob';

import { blobService } from '../utils/services/BlobService';

dotenv.config({ path: '.env.local' });

// Define interfaces for script
interface Options {
  dryRun: boolean;
  force: boolean;
  sizeThreshold: number;
  verbose: boolean;
  output: string;
}

interface PlaceholderFile {
  url: string;
  path: string;
  size: number;
  uploaded: Date;
}

interface DeleteResult {
  timestamp: string;
  options: Options;
  totalFilesChecked: number;
  placeholdersFound: number;
  placeholdersDeleted: number;
  failedDeletions: number;
  placeholders: PlaceholderFile[];
  errors: { path: string; error: string }[];
}

// Parse command-line arguments
function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    dryRun: false,
    force: false,
    sizeThreshold: 10240, // 10KB default threshold
    verbose: false,
    output: 'placeholder-deletion-results.json',
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg.startsWith('--size-threshold=')) {
      const threshold = parseInt(arg.substring('--size-threshold='.length), 10);
      if (!isNaN(threshold) && threshold > 0) {
        options.sizeThreshold = threshold;
      }
    } else if (arg.startsWith('--output=')) {
      options.output = arg.substring('--output='.length);
    }
  }

  return options;
}

/**
 * Create a readline interface for user confirmation
 */
function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask for user confirmation
 */
async function confirmDeletion(count: number): Promise<boolean> {
  const rl = createInterface();

  return new Promise((resolve) => {
    rl.question(`Are you sure you want to delete ${count} placeholder files? (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * List all audio files in Vercel Blob
 */
async function listAllAudioFiles(): Promise<ListBlobResultBlob[]> {
  const allFiles: ListBlobResultBlob[] = [];
  let cursor: string | undefined;

  do {
    // Get batch of files
    const { blobs, cursor: nextCursor } = await blobService.listFiles({
      cursor,
      limit: 100, // Max limit supported by Vercel Blob
    });

    // Add files to the collection
    allFiles.push(...blobs);

    // Update cursor for next iteration
    cursor = nextCursor;
  } while (cursor);

  // Filter to only include .mp3 files
  return allFiles.filter((file) => file.pathname.toLowerCase().endsWith('.mp3'));
}

/**
 * Identify placeholder files based on size
 */
function identifyPlaceholders(
  files: ListBlobResultBlob[],
  sizeThreshold: number,
): PlaceholderFile[] {
  return files
    .filter((file) => file.size > 0 && file.size < sizeThreshold)
    .map((file) => ({
      url: file.url,
      path: file.pathname,
      size: file.size,
      uploaded: new Date(file.uploadedAt),
    }));
}

/**
 * Delete placeholder files
 */
async function deletePlaceholders(
  placeholders: PlaceholderFile[],
  options: Options,
): Promise<{ deleted: string[]; errors: { path: string; error: string }[] }> {
  const deleted: string[] = [];
  const errors: { path: string; error: string }[] = [];

  // For dry run, just return the placeholders
  if (options.dryRun) {
    // eslint-disable-next-line no-console -- CLI: Dry run information
    console.log(`[DRY RUN] Would delete ${placeholders.length} placeholder files`);
    return { deleted: placeholders.map((p) => p.path), errors: [] };
  }

  // Get confirmation if not forced
  if (!options.force && placeholders.length > 0) {
    const confirmed = await confirmDeletion(placeholders.length);
    if (!confirmed) {
      // eslint-disable-next-line no-console -- CLI: User interaction feedback
      console.log('Deletion cancelled by user');
      return { deleted: [], errors: [] };
    }
  }

  // Delete each placeholder
  for (const placeholder of placeholders) {
    try {
      if (options.verbose) {
        // eslint-disable-next-line no-console -- CLI: Deletion progress
        console.log(`Deleting: ${placeholder.path} (${placeholder.size} bytes)`);
      }

      await blobService.deleteFile(placeholder.url);
      deleted.push(placeholder.path);

      if (options.verbose) {
        // eslint-disable-next-line no-console -- CLI: Deletion success feedback
        console.log(`Successfully deleted: ${placeholder.path}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error deleting ${placeholder.path}: ${errorMessage}`);
      errors.push({ path: placeholder.path, error: errorMessage });
    }
  }

  return { deleted, errors };
}

/**
 * Save results to a file
 */
async function saveResults(results: DeleteResult, outputPath: string): Promise<void> {
  try {
    // Ensure output path is absolute
    const absoluteOutputPath = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(process.cwd(), outputPath);

    await fs.writeFile(absoluteOutputPath, JSON.stringify(results, null, 2));
    // eslint-disable-next-line no-console -- CLI: Output file confirmation
    console.log(`Results saved to ${absoluteOutputPath}`);
  } catch (error) {
    console.error('Error saving results:', error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command-line arguments
    const options = parseArgs();

    // eslint-disable-next-line no-console -- CLI: Script header
    console.log('Delete Placeholder Audio Files');
    // eslint-disable-next-line no-console -- CLI: Header formatting
    console.log('=============================');
    // eslint-disable-next-line no-console -- CLI: Configuration info
    console.log(`Dry run: ${options.dryRun}`);
    // eslint-disable-next-line no-console -- CLI: Configuration info
    console.log(`Size threshold: ${options.sizeThreshold} bytes`);

    // List all audio files
    // eslint-disable-next-line no-console -- CLI: Processing status
    console.log('\nListing audio files in Vercel Blob...');
    const audioFiles = await listAllAudioFiles();
    // eslint-disable-next-line no-console -- CLI: Results summary
    console.log(`Found ${audioFiles.length} audio files`);

    // Identify placeholders
    // eslint-disable-next-line no-console -- CLI: Processing status
    console.log('\nIdentifying placeholder files...');
    const placeholders = identifyPlaceholders(audioFiles, options.sizeThreshold);
    // eslint-disable-next-line no-console -- CLI: Results summary
    console.log(`Found ${placeholders.length} placeholder files`);

    if (placeholders.length === 0) {
      // eslint-disable-next-line no-console -- CLI: Status information
      console.log('No placeholder files to delete');
      return;
    }

    // Print placeholder info
    if (options.verbose || placeholders.length < 10) {
      // eslint-disable-next-line no-console -- CLI: Files listing header
      console.log('\nPlaceholder files:');
      placeholders.forEach((file, index) => {
        // eslint-disable-next-line no-console -- CLI: File details listing
        console.log(
          `${index + 1}. ${file.path} (${file.size} bytes, uploaded: ${file.uploaded.toISOString()})`,
        );
      });
    }

    // Delete placeholders
    // eslint-disable-next-line no-console -- CLI: Processing status
    console.log('\nDeleting placeholder files...');
    const { deleted, errors } = await deletePlaceholders(placeholders, options);

    // Create results object
    const results: DeleteResult = {
      timestamp: new Date().toISOString(),
      options,
      totalFilesChecked: audioFiles.length,
      placeholdersFound: placeholders.length,
      placeholdersDeleted: deleted.length,
      failedDeletions: errors.length,
      placeholders,
      errors,
    };

    // Save results
    await saveResults(results, options.output);

    // Print summary
    // eslint-disable-next-line no-console -- CLI: Summary header
    console.log('\nDeletion Summary:');
    // eslint-disable-next-line no-console -- CLI: Result statistics
    console.log(`- Total audio files checked: ${results.totalFilesChecked}`);
    // eslint-disable-next-line no-console -- CLI: Result statistics
    console.log(`- Placeholder files found: ${results.placeholdersFound}`);

    if (options.dryRun) {
      // eslint-disable-next-line no-console -- CLI: Dry run results
      console.log(`- Placeholder files that would be deleted: ${results.placeholdersFound}`);
    } else {
      // eslint-disable-next-line no-console -- CLI: Deletion statistics
      console.log(`- Placeholder files deleted: ${results.placeholdersDeleted}`);
      // eslint-disable-next-line no-console -- CLI: Error statistics
      console.log(`- Failed deletions: ${results.failedDeletions}`);
    }

    if (errors.length > 0) {
      // eslint-disable-next-line no-console -- CLI: Errors header
      console.log('\nErrors:');
      errors.forEach((error, index) => {
        // eslint-disable-next-line no-console -- CLI: Error details
        console.log(`${index + 1}. ${error.path}: ${error.error}`);
      });
    }

    // eslint-disable-next-line no-console -- CLI: Completion status
    console.log('\n✅ Placeholder audio files deletion completed');
  } catch (error) {
    console.error('❌ Error deleting placeholder files:', error);
    process.exit(1);
  }
}

// Run the main function
main();
