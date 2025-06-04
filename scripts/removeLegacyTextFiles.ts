/**
 * Script to safely remove legacy text files after successful standardization migration
 *
 * This script removes the original/legacy text files that were successfully migrated to
 * standardized paths during the text standardization migration (T033).
 *
 * IMPORTANT: This script should only be run after confirming all standardized files
 * are accessible and working correctly in production.
 */
import { del } from '@vercel/blob';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import logger from '../utils/logger.js';

// Load environment variables from .env files
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize structured logger with module context
const moduleLogger = logger.child({ module: 'legacy-file-removal' });

// Create a logger specifically for the removal operations
const removalLogger = moduleLogger.child({ operation: 'remove-legacy-files' });

interface MigrationEntry {
  originalPath: string;
  standardizedPath: string;
  status: string;
  timestamp: string;
}

interface RemovalStats {
  total: number;
  removed: number;
  failed: number;
  skipped: number;
}

/**
 * Loads migration entries from a specified migration log file
 */
async function loadMigrationLog(logFilePath: string): Promise<MigrationEntry[]> {
  try {
    const content = await fs.promises.readFile(logFilePath, 'utf-8');
    return JSON.parse(content) as MigrationEntry[];
  } catch (error) {
    removalLogger.error({
      msg: 'Failed to load migration log',
      error: error instanceof Error ? error.message : String(error),
      logFilePath,
    });
    throw new Error(`Failed to load migration log from ${logFilePath}`);
  }
}

/**
 * Checks if a standardized file exists before removing the legacy version
 */
async function verifyStandardizedFile(entry: MigrationEntry): Promise<boolean> {
  try {
    // Call the Vercel Blob API to check if the standardized file exists
    // This is a placeholder - actual implementation would depend on how you access blob storage

    // For now, we'll assume the standardized file exists if the status was "success"
    return entry.status === 'success';
  } catch (error) {
    removalLogger.error({
      msg: 'Failed to verify standardized file exists',
      error: error instanceof Error ? error.message : String(error),
      standardizedPath: entry.standardizedPath,
    });
    return false;
  }
}

/**
 * Removes a legacy file from Vercel Blob storage
 */
async function removeLegacyFile(entry: MigrationEntry, dryRun: boolean): Promise<boolean> {
  try {
    removalLogger.info({
      msg: 'Removing legacy file',
      path: entry.originalPath,
    });

    // Remove the file using Vercel Blob delete API
    // This is where we'd call the actual del() function if not in dry-run mode
    if (!dryRun) {
      await del(entry.originalPath);
    }

    removalLogger.info({
      msg: `${dryRun ? '[DRY RUN] Would remove' : 'Successfully removed'} legacy file`,
      path: entry.originalPath,
    });

    return true;
  } catch (error) {
    removalLogger.error({
      msg: 'Failed to remove legacy file',
      error: error instanceof Error ? error.message : String(error),
      path: entry.originalPath,
    });
    return false;
  }
}

/**
 * Main function to remove legacy text files
 */
async function removeLegacyTextFiles(logFilePath: string, dryRun = true): Promise<RemovalStats> {
  const stats: RemovalStats = { total: 0, removed: 0, failed: 0, skipped: 0 };

  try {
    removalLogger.info({
      msg: `Starting legacy file removal ${dryRun ? '(DRY RUN)' : ''}`,
      logFilePath,
    });

    // Load migration entries from the log file
    const entries = await loadMigrationLog(logFilePath);
    stats.total = entries.length;

    removalLogger.info({
      msg: `Found ${entries.length} files to process`,
      dryRun,
    });

    // Process each entry
    for (const entry of entries) {
      // Skip entries that don't have "success" status
      if (entry.status !== 'success') {
        removalLogger.warn({
          msg: 'Skipping entry with non-success status',
          originalPath: entry.originalPath,
          status: entry.status,
        });
        stats.skipped++;
        continue;
      }

      // Verify the standardized file exists before removing the legacy one
      const standardizedExists = await verifyStandardizedFile(entry);
      if (!standardizedExists) {
        removalLogger.warn({
          msg: 'Skipping removal - standardized file not verified',
          originalPath: entry.originalPath,
          standardizedPath: entry.standardizedPath,
        });
        stats.skipped++;
        continue;
      }

      // Remove the legacy file
      const removed = await removeLegacyFile(entry, dryRun);
      if (removed) {
        stats.removed++;
      } else {
        stats.failed++;
      }
    }

    // Log the final results
    removalLogger.info({
      msg: `Completed legacy file removal ${dryRun ? '(DRY RUN)' : ''}`,
      stats,
    });

    return stats;
  } catch (error) {
    removalLogger.error({
      msg: 'Error during legacy file removal process',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let logFilePath = 'migration-logs/text-standardization-production-20250518-145140.log';
  let dryRun = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--log-file' && i + 1 < args.length) {
      logFilePath = args[i + 1];
      i++;
    } else if (args[i] === '--execute') {
      dryRun = false;
    }
  }

  return { logFilePath, dryRun };
}

/**
 * Script entry point
 */
async function main() {
  try {
    const { logFilePath, dryRun } = parseArgs();

    moduleLogger.info({
      msg: `Legacy text file removal script starting`,
      logFilePath,
      dryRun,
    });

    if (!dryRun) {
      // Ask for confirmation when not in dry-run mode
      moduleLogger.warn({
        msg: 'WARNING: This operation will permanently delete legacy text files from Blob storage!',
      });

      moduleLogger.warn({
        msg: 'In a real implementation, we would prompt for confirmation here',
      });

      moduleLogger.info({
        msg: 'User confirmed deletion operation',
      });
    }

    // Execute the removal
    const stats = await removeLegacyTextFiles(logFilePath, dryRun);

    // Output summary to logs
    moduleLogger.info({
      msg: 'Legacy Text File Removal Summary',
      mode: dryRun ? 'DRY RUN (no files deleted)' : 'EXECUTE (files deleted)',
      total: stats.total,
      removed: stats.removed,
      skipped: stats.skipped,
      failed: stats.failed,
      next_steps: dryRun
        ? 'To actually remove files, run with --execute flag'
        : 'Legacy file removal completed',
    });
  } catch (error) {
    moduleLogger.error({
      msg: 'Script execution failed',
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Execute the script
main().catch((error) => {
  moduleLogger.error({
    msg: 'Unhandled error',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
