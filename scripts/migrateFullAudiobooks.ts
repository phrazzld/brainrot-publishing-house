#!/usr/bin/env node
/**
 * Full Audiobook Migration Script
 *
 * This script identifies missing full audiobook files and creates them by:
 * 1. Checking for existing full audiobooks at standardized locations
 * 2. Concatenating chapter audio files for missing full audiobooks
 * 3. Uploading the concatenated files to standardized paths
 * 4. Verifying the migration was successful
 *
 * Usage:
 *   npx tsx scripts/migrateFullAudiobooks.ts [options]
 *
 * Options:
 *   --dry-run            Preview changes without executing
 *   --verbose            Enable detailed logging
 *   --force              Force overwrite existing files
 *   --books=slug1,slug2  Process only specific books
 */
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import fs from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { promisify } from 'util';

import { AssetService, AssetType } from '../types/assets.js';
import { createRequestLogger } from '../utils/logger.js';
import { createAssetService } from '../utils/services/AssetServiceFactory.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configure logger
const migrationLogger = createRequestLogger('audiobook-migration');

// Asset service will be initialized when needed
let assetService: AssetService | null = null;

// Promisify exec
const execAsync = promisify(exec);

// Types and interfaces
export interface AudiobookConfig {
  bookSlug: string;
  bookTitle: string;
  expectedPath: string;
  status: 'exists' | 'missing' | 'needs_concatenation';
  chapterCount: number;
  chapters?: string[];
}

export interface MigrationOptions {
  dryRun: boolean;
  verbose: boolean;
  force: boolean;
  books?: string[];
}

export interface MigrationResult {
  success: boolean;
  totalBooks: number;
  migrated: number;
  failed: number;
  skipped: number;
  details: BookMigrationResult[];
}

export interface BookMigrationResult {
  bookSlug: string;
  success: boolean;
  action: 'migrated' | 'skipped' | 'failed' | 'dry-run';
  error?: string;
}

// Constants
const TARGET_BOOKS = [
  { slug: 'the-iliad', title: 'The Iliad' },
  { slug: 'the-odyssey', title: 'The Odyssey' },
  { slug: 'the-aeneid', title: 'The Aeneid' },
  { slug: 'hamlet', title: 'Hamlet' },
  { slug: 'huckleberry-finn', title: 'Huckleberry Finn' },
  { slug: 'the-declaration', title: 'The Declaration' },
];

/**
 * Check if ffmpeg is installed
 */
async function checkFfmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Audit existing audiobooks and identify what needs to be migrated
 */
export async function auditAudiobooks(bookSlugs: string[]): Promise<AudiobookConfig[]> {
  // Initialize asset service if not already initialized
  if (!assetService) {
    assetService = createAssetService({ correlationId: 'audiobook-migration' });
  }
  const configs: AudiobookConfig[] = [];

  for (const bookSlug of bookSlugs) {
    const bookInfo = TARGET_BOOKS.find((b) => b.slug === bookSlug);
    const bookTitle = bookInfo?.title || bookSlug;
    const expectedPath = `assets/audio/${bookSlug}/full-audiobook.mp3`;

    migrationLogger.info({ msg: 'Auditing audiobook', bookSlug, expectedPath });

    // Check if full audiobook already exists
    const exists = await assetService.assetExists(AssetType.AUDIO, bookSlug, 'full-audiobook.mp3');

    if (exists) {
      configs.push({
        bookSlug,
        bookTitle,
        expectedPath,
        status: 'exists',
        chapterCount: 0,
      });
      continue;
    }

    // Check for chapter files
    // Format would be assets/audio/{bookSlug}/
    const listResult = await assetService.listAssets(AssetType.AUDIO, bookSlug);
    const chapters = listResult.assets
      .filter((asset) => asset.path.match(/chapter-\d+\.mp3$/))
      .map((asset) => asset.path)
      .sort();

    if (chapters.length === 0) {
      configs.push({
        bookSlug,
        bookTitle,
        expectedPath,
        status: 'missing',
        chapterCount: 0,
      });
    } else {
      configs.push({
        bookSlug,
        bookTitle,
        expectedPath,
        status: 'needs_concatenation',
        chapterCount: chapters.length,
        chapters,
      });
    }
  }

  return configs;
}

/**
 * Download chapter files to a temporary directory
 */
export async function downloadChapterFiles(
  config: AudiobookConfig,
  chapters: string[],
  tempDir: string
): Promise<string[]> {
  // Initialize asset service if not already initialized
  if (!assetService) {
    assetService = createAssetService({ correlationId: 'audiobook-migration' });
  }
  migrationLogger.info({
    msg: 'Downloading chapter files',
    bookSlug: config.bookSlug,
    chapterCount: chapters.length,
  });

  const downloadedFiles: string[] = [];

  for (const chapter of chapters) {
    const fileName = path.basename(chapter);
    const localPath = path.join(tempDir, fileName);

    try {
      const chapterName = path.basename(chapter);
      const content = await assetService.fetchAsset(AssetType.AUDIO, config.bookSlug, chapterName);
      await fs.promises.writeFile(localPath, Buffer.from(content));
      downloadedFiles.push(localPath);
      migrationLogger.info({ msg: 'Downloaded chapter', chapter, localPath });
    } catch (error) {
      migrationLogger.error({ msg: 'Failed to download chapter', chapter, error });
      throw error;
    }
  }

  return downloadedFiles;
}

/**
 * Concatenate chapter files using ffmpeg
 */
export async function concatenateChapters(
  inputFiles: string[],
  outputFile: string
): Promise<string> {
  // Check if ffmpeg is available
  const ffmpegAvailable = await checkFfmpeg();
  if (!ffmpegAvailable) {
    throw new Error('ffmpeg is not installed. Please install ffmpeg to concatenate audio files.');
  }

  migrationLogger.info({
    msg: 'Concatenating chapters',
    fileCount: inputFiles.length,
    outputFile,
  });

  // Create file list for ffmpeg concat
  const fileListPath = outputFile.replace('.mp3', '-filelist.txt');
  const fileListContent = inputFiles.map((file) => `file '${file}'`).join('\n');

  fs.writeFileSync(fileListPath, fileListContent);

  // Run ffmpeg concatenation
  const command = `ffmpeg -f concat -safe 0 -i ${fileListPath} -c copy ${outputFile}`;

  try {
    const { stdout, stderr } = await execAsync(command);
    migrationLogger.info({ msg: 'FFmpeg output', stdout, stderr: stderr.substring(0, 500) });
  } catch (error) {
    migrationLogger.error({ msg: 'FFmpeg concatenation failed', error });
    throw error;
  }

  // Clean up file list
  fs.unlinkSync(fileListPath);

  // Validate output file
  if (!fs.existsSync(outputFile)) {
    throw new Error('Concatenation failed: output file not created');
  }

  const stats = fs.statSync(outputFile);
  if (stats.size === 0) {
    throw new Error('Concatenation failed: output file is empty');
  }

  migrationLogger.info({
    msg: 'Concatenation successful',
    outputFile,
    size: stats.size,
  });

  return outputFile;
}

/**
 * Upload full audiobook to standardized location
 */
export async function uploadFullAudiobook(
  localPath: string,
  remotePath: string,
  bookSlug: string
): Promise<boolean> {
  // Initialize asset service if not already initialized
  if (!assetService) {
    assetService = createAssetService({ correlationId: 'audiobook-migration' });
  }
  const stats = fs.statSync(localPath);
  migrationLogger.info({
    msg: 'Uploading full audiobook',
    localPath,
    remotePath,
    size: stats.size,
  });

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const fileContent = await fs.promises.readFile(localPath);
      // Convert Buffer to ArrayBuffer for the upload
      const arrayBuffer = fileContent.buffer.slice(
        fileContent.byteOffset,
        fileContent.byteOffset + fileContent.byteLength
      );
      await assetService.uploadAsset({
        assetType: AssetType.AUDIO,
        bookSlug,
        assetName: 'full-audiobook.mp3',
        content: arrayBuffer as ArrayBuffer,
        options: {
          contentType: 'audio/mpeg',
        },
      });

      migrationLogger.info({ msg: 'Upload successful', remotePath });
      return true;
    } catch (error) {
      attempt++;
      migrationLogger.error({
        msg: 'Upload failed',
        remotePath,
        attempt,
        error,
      });

      if (attempt >= maxRetries) {
        throw error;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }

  return false;
}

/**
 * Verify migration results
 */
export async function verifyMigration(configs: AudiobookConfig[]): Promise<BookMigrationResult[]> {
  // Initialize asset service if not already initialized
  if (!assetService) {
    assetService = createAssetService({ correlationId: 'audiobook-migration' });
  }
  const results: BookMigrationResult[] = [];

  for (const config of configs) {
    try {
      const exists = await assetService.assetExists(
        AssetType.AUDIO,
        config.bookSlug,
        'full-audiobook.mp3'
      );

      if (!exists) {
        results.push({
          bookSlug: config.bookSlug,
          success: false,
          action: 'failed',
          error: 'File not found at expected path',
        });
        continue;
      }

      // Since getMetadata is not available, we'll just check existence
      // In the future, we could use the listAssets method to get file info

      results.push({
        bookSlug: config.bookSlug,
        success: true,
        action: 'migrated',
      });
    } catch (error) {
      results.push({
        bookSlug: config.bookSlug,
        success: false,
        action: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Process a single book migration
 */
async function migrateBook(
  config: AudiobookConfig,
  options: MigrationOptions
): Promise<BookMigrationResult> {
  if (config.status === 'exists' && !options.force) {
    migrationLogger.info({ msg: 'Skipping existing audiobook', bookSlug: config.bookSlug });
    return {
      bookSlug: config.bookSlug,
      success: true,
      action: 'skipped',
      error: 'Already has full audiobook',
    };
  }

  if (config.status === 'missing') {
    migrationLogger.warn({ msg: 'No chapters found for book', bookSlug: config.bookSlug });
    return {
      bookSlug: config.bookSlug,
      success: false,
      action: 'failed',
      error: 'No chapter files found',
    };
  }

  if (options.dryRun) {
    migrationLogger.info({
      msg: 'Dry run: would migrate book',
      bookSlug: config.bookSlug,
      chapterCount: config.chapterCount,
    });
    return {
      bookSlug: config.bookSlug,
      success: true,
      action: 'dry-run',
      error: `Would concatenate ${config.chapterCount} chapters`,
    };
  }

  // Create temporary directory
  const tempDir = path.join(tmpdir(), `audiobook-${config.bookSlug}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Download chapters
    const downloadedFiles = await downloadChapterFiles(config, config.chapters || [], tempDir);

    // Concatenate chapters
    const outputFile = path.join(tempDir, 'full-audiobook.mp3');
    await concatenateChapters(downloadedFiles, outputFile);

    // Upload to standardized location
    await uploadFullAudiobook(outputFile, config.expectedPath, config.bookSlug);

    return {
      bookSlug: config.bookSlug,
      success: true,
      action: 'migrated',
    };
  } catch (error) {
    migrationLogger.error({
      msg: 'Migration failed',
      bookSlug: config.bookSlug,
      error,
    });
    return {
      bookSlug: config.bookSlug,
      success: false,
      action: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      migrationLogger.warn({ msg: 'Failed to clean up temp directory', tempDir, error });
    }
  }
}

/**
 * Main migration function
 */
export async function migrateFullAudiobooks(options: MigrationOptions): Promise<MigrationResult> {
  migrationLogger.info({ msg: 'Starting full audiobook migration', options });

  // Check ffmpeg availability
  const ffmpegAvailable = await checkFfmpeg();
  if (!ffmpegAvailable && !options.dryRun) {
    throw new Error('ffmpeg is required but not installed. Please install ffmpeg first.');
  }

  // Determine which books to process
  const bookSlugs = options.books || TARGET_BOOKS.map((b) => b.slug);

  // Audit current state
  const configs = await auditAudiobooks(bookSlugs);

  migrationLogger.info({
    msg: 'Audit complete',
    totalBooks: configs.length,
    needsMigration: configs.filter((c) => c.status === 'needs_concatenation').length,
    alreadyExists: configs.filter((c) => c.status === 'exists').length,
    missing: configs.filter((c) => c.status === 'missing').length,
  });

  // Process each book
  const bookResults: BookMigrationResult[] = [];

  for (const config of configs) {
    const result = await migrateBook(config, options);
    bookResults.push(result);
  }

  // Verify migration results (skip in dry-run mode)
  let verificationResults: BookMigrationResult[] = [];
  if (!options.dryRun) {
    const configsToVerify = configs.filter(
      (c) => c.status === 'needs_concatenation' || (c.status === 'exists' && options.force)
    );
    verificationResults = await verifyMigration(configsToVerify);
  }

  // Compile final results
  const finalResults = options.dryRun ? bookResults : verificationResults;
  const result: MigrationResult = {
    success: finalResults.every((r) => r.success),
    totalBooks: bookSlugs.length,
    migrated: finalResults.filter((r) => r.action === 'migrated').length,
    failed: finalResults.filter((r) => r.action === 'failed').length,
    skipped: finalResults.filter((r) => r.action === 'skipped' || r.action === 'dry-run').length,
    details: finalResults,
  };

  migrationLogger.info({ msg: 'Migration complete', result });
  return result;
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: false,
    verbose: false,
    force: false,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg.startsWith('--books=')) {
      options.books = arg.substring(8).split(',');
    }
  }

  return options;
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();

  try {
    const result = await migrateFullAudiobooks(options);

    // Print summary
    console.log('\n📚 Full Audiobook Migration Summary:');
    console.log(`Total books: ${result.totalBooks}`);
    console.log(`Migrated: ${result.migrated}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Skipped: ${result.skipped}`);

    console.log('\n📋 Status by Book:');
    result.details.forEach((d) => {
      if (d.action === 'migrated') {
        console.log(`  ✅ ${d.bookSlug}: Successfully migrated`);
      } else if (d.action === 'failed') {
        console.log(`  ❌ ${d.bookSlug}: Failed - ${d.error}`);
      } else if (d.action === 'skipped' && d.error === 'Already has full audiobook') {
        console.log(`  ✓  ${d.bookSlug}: Already has full audiobook`);
      } else if (d.action === 'dry-run') {
        console.log(`  🔵 ${d.bookSlug}: ${d.error}`);
      } else if (d.action === 'skipped') {
        console.log(`  ⚠️  ${d.bookSlug}: Skipped - ${d.error}`);
      }
    });

    if (options.dryRun) {
      console.log('\n🏳️  DRY RUN - No files were modified');
      const toMigrate = result.details.filter(
        (d) => (d.action !== 'failed' && d.action !== 'skipped') || d.error === 'No chapters found'
      );
      if (toMigrate.length > 0) {
        console.log('Files that would be migrated:');
        toMigrate.forEach((d) => {
          if (d.action !== 'failed') {
            console.log(`  - ${d.bookSlug}`);
          }
        });
      }
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    migrationLogger.error({ msg: 'Migration failed', error });
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}
