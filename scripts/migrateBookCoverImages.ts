#!/usr/bin/env node
/**
 * Book Cover Images Migration Script
 * 
 * This script migrates book cover images from the local filesystem to Vercel Blob storage.
 * It uses the BlobService and BlobPathService utilities to handle the migration.
 * 
 * Usage:
 *   npx tsx scripts/migrateBookCoverImages.ts [options]
 * 
 * Options:
 *   --dry-run             Simulate migration without uploading (default: false)
 *   --books=slug1,slug2   Comma-separated list of book slugs to migrate (default: all)
 *   --force               Re-upload even if already migrated (default: false)
 *   --retries=3           Number of retries for failed uploads (default: 3)
 *   --concurrency=5       Number of concurrent uploads (default: 5)
 *   --log-file=path       Path to migration log file (default: cover-images-migration.json)
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { blobService } from '../utils/services/BlobService.js';
import { blobPathService } from '../utils/services/BlobPathService.js';
import translations from '../translations/index.js';

// Get this file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Migration options
interface MigrationOptions {
  dryRun?: boolean;
  books?: string[];
  force?: boolean;
  retries?: number;
  concurrency?: number;
  logFile?: string;
}

// Book migration result
interface BookMigrationResult {
  status: 'success' | 'skipped' | 'failed';
  originalPath: string;
  blobPath: string;
  blobUrl: string;
  error?: string;
  size?: number;
  uploadedAt?: string;
}

// Overall migration result
interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  books: Record<string, BookMigrationResult>;
  startTime: string;
  endTime: string;
  duration: number; // in milliseconds
}

/**
 * Migration log class for tracking migration status
 */
class MigrationLog {
  private log: Record<string, BookMigrationResult> = {};
  private readonly logPath: string;
  
  constructor(logFile: string) {
    this.logPath = path.isAbsolute(logFile) 
      ? logFile 
      : path.join(projectRoot, logFile);
  }
  
  /**
   * Load existing migration log if available
   */
  public async load(): Promise<void> {
    try {
      if (existsSync(this.logPath)) {
        const data = await fs.readFile(this.logPath, 'utf8');
        this.log = JSON.parse(data);
        console.log(`Loaded migration log from ${this.logPath}`);
      } else {
        console.log('No existing migration log found. Starting fresh.');
        this.log = {};
      }
    } catch (error) {
      console.warn(`Error loading migration log: ${error instanceof Error ? error.message : String(error)}`);
      this.log = {};
    }
  }
  
  /**
   * Save migration log to disk
   */
  public async save(): Promise<void> {
    try {
      await fs.writeFile(this.logPath, JSON.stringify(this.log, null, 2), 'utf8');
      console.log(`Migration log saved to ${this.logPath}`);
    } catch (error) {
      console.error(`Error saving migration log: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to save migration log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Add a book migration entry
   */
  public add(bookSlug: string, result: BookMigrationResult): void {
    this.log[bookSlug] = result;
  }
  
  /**
   * Check if a book has been migrated
   */
  public has(bookSlug: string): boolean {
    return bookSlug in this.log && this.log[bookSlug].status === 'success';
  }
  
  /**
   * Get a specific book's migration result
   */
  public get(bookSlug: string): BookMigrationResult | undefined {
    return this.log[bookSlug];
  }
  
  /**
   * Get all migration results
   */
  public getAll(): Record<string, BookMigrationResult> {
    return { ...this.log };
  }
}

/**
 * Cover Image Migration Service
 */
class CoverImageMigrationService {
  private migrationLog: MigrationLog;
  
  constructor(
    private readonly blobService = blobService,
    private readonly blobPathService = blobPathService,
    logFile: string = 'cover-images-migration.json'
  ) {
    this.migrationLog = new MigrationLog(logFile);
  }
  
  /**
   * Migrate all book cover images
   */
  public async migrateAll(options: MigrationOptions = {}): Promise<MigrationResult> {
    const startTime = new Date();
    
    const result: MigrationResult = {
      total: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      books: {},
      startTime: startTime.toISOString(),
      endTime: '',
      duration: 0,
    };
    
    console.log('Starting book cover images migration');
    console.log(`Options: ${JSON.stringify(options, null, 2)}`);
    
    // Load existing migration log
    await this.migrationLog.load();
    
    // Get books with cover images
    const books = translations
      .filter(book => book.coverImage)
      .filter(book => !options.books || options.books.includes(book.slug));
    
    result.total = books.length;
    console.log(`Found ${result.total} books with cover images`);
    
    if (options.dryRun) {
      console.log('DRY RUN: No files will be uploaded');
    }
    
    // Process books with limited concurrency
    const concurrency = options.concurrency || 5;
    const chunks = this.chunkArray(books, concurrency);
    
    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (book) => {
        try {
          // Skip if already migrated and not forced
          if (this.migrationLog.has(book.slug) && !options.force && !options.dryRun) {
            const existingResult = this.migrationLog.get(book.slug)!;
            console.log(`Skipping ${book.slug} (already migrated to ${existingResult.blobPath})`);
            
            result.skipped++;
            result.books[book.slug] = existingResult;
            return;
          }
          
          // Calculate paths
          const originalPath = book.coverImage;
          const blobPath = this.blobPathService.convertLegacyPath(originalPath);
          const blobUrl = this.blobService.getUrlForPath(blobPath);
          
          // Skip actual upload in dry run mode
          if (options.dryRun) {
            console.log(`DRY RUN: Would migrate ${originalPath} to ${blobPath}`);
            
            const migrationResult: BookMigrationResult = {
              status: 'skipped',
              originalPath,
              blobPath,
              blobUrl,
            };
            
            result.skipped++;
            result.books[book.slug] = migrationResult;
            return;
          }
          
          // Perform actual migration
          console.log(`Migrating ${book.slug} cover image: ${originalPath} -> ${blobPath}`);
          const migrationResult = await this.migrateBookCover(book, options.retries || 3);
          
          // Update statistics
          if (migrationResult.status === 'success') {
            console.log(`✅ Successfully migrated ${book.slug} to ${migrationResult.blobUrl}`);
            result.migrated++;
          } else if (migrationResult.status === 'skipped') {
            console.log(`⏭️ Skipped ${book.slug}`);
            result.skipped++;
          } else {
            console.error(`❌ Failed to migrate ${book.slug}: ${migrationResult.error}`);
            result.failed++;
          }
          
          // Store result
          result.books[book.slug] = migrationResult;
          this.migrationLog.add(book.slug, migrationResult);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`⚠️ Error migrating ${book.slug}: ${errorMessage}`);
          
          // Record failure
          const failedResult: BookMigrationResult = {
            status: 'failed',
            originalPath: book.coverImage,
            blobPath: this.blobPathService.convertLegacyPath(book.coverImage),
            blobUrl: '',
            error: errorMessage,
          };
          
          result.failed++;
          result.books[book.slug] = failedResult;
          this.migrationLog.add(book.slug, failedResult);
        }
      }));
    }
    
    // Save migration log
    if (!options.dryRun) {
      await this.migrationLog.save();
    }
    
    // Calculate duration
    const endTime = new Date();
    result.endTime = endTime.toISOString();
    result.duration = endTime.getTime() - startTime.getTime();
    
    return result;
  }
  
  /**
   * Migrate a single book cover image
   */
  private async migrateBookCover(
    book: typeof translations[0], 
    maxRetries: number = 3
  ): Promise<BookMigrationResult> {
    const originalPath = book.coverImage;
    const blobPath = this.blobPathService.convertLegacyPath(originalPath);
    
    // Verify file exists
    const fullPath = path.join(projectRoot, 'public', originalPath);
    
    if (!existsSync(fullPath)) {
      return {
        status: 'failed',
        originalPath,
        blobPath,
        blobUrl: '',
        error: `File not found: ${fullPath}`,
      };
    }
    
    // Read file
    const fileBuffer = await fs.readFile(fullPath);
    const file = new File([fileBuffer], path.basename(originalPath), {
      type: this.getContentType(originalPath),
    });
    
    // Get the directory path
    const pathname = path.dirname(blobPath);
    const filename = path.basename(blobPath);
    
    // Try upload with retries
    let lastError = '';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Upload to Blob storage
        const uploadResult = await this.blobService.uploadFile(file, {
          pathname,
          filename,
          access: 'public',
          cacheControl: 'max-age=31536000, immutable', // 1 year cache
        });
        
        // Verify upload
        const verified = await this.verifyUpload(uploadResult.url);
        
        if (!verified) {
          lastError = 'Verification failed after upload';
          continue; // Retry
        }
        
        return {
          status: 'success',
          originalPath,
          blobPath,
          blobUrl: uploadResult.url,
          size: uploadResult.size,
          uploadedAt: uploadResult.uploadedAt,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.warn(`Attempt ${attempt + 1}/${maxRetries} failed: ${lastError}`);
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, etc.
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    return {
      status: 'failed',
      originalPath,
      blobPath,
      blobUrl: '',
      error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
    };
  }
  
  /**
   * Verify a file was uploaded successfully
   */
  private async verifyUpload(blobUrl: string): Promise<boolean> {
    try {
      // Get file info to verify it exists
      const fileInfo = await this.blobService.getFileInfo(blobUrl);
      return fileInfo.size > 0;
    } catch (error) {
      console.warn(`Verification failed for ${blobUrl}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    
    switch (extension) {
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.gif':
        return 'image/gif';
      case '.svg':
        return 'image/svg+xml';
      case '.webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }
  
  /**
   * Split an array into chunks for concurrency control
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const options: MigrationOptions = {
    dryRun: false,
    force: false,
    retries: 3,
    concurrency: 5,
    logFile: 'cover-images-migration.json',
  };
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--books=')) {
      const books = arg.substring('--books='.length).split(',');
      options.books = books.map(b => b.trim()).filter(Boolean);
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg.startsWith('--retries=')) {
      options.retries = parseInt(arg.substring('--retries='.length), 10);
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = parseInt(arg.substring('--concurrency='.length), 10);
    } else if (arg.startsWith('--log-file=')) {
      options.logFile = arg.substring('--log-file='.length);
    }
  }
  
  return options;
}

/**
 * Print migration results
 */
function printResults(result: MigrationResult): void {
  console.log('\n===== MIGRATION RESULTS =====');
  console.log(`Total books: ${result.total}`);
  console.log(`Migrated: ${result.migrated}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Failed: ${result.failed}`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
  
  if (result.failed > 0) {
    console.log('\nFailed migrations:');
    Object.entries(result.books)
      .filter(([_, r]) => r.status === 'failed')
      .forEach(([slug, r]) => {
        console.log(`  - ${slug}: ${r.error}`);
      });
  }
  
  console.log('\nCompleted at:', result.endTime);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse arguments
    const options = parseArgs();
    
    // Create migration service
    const migrationService = new CoverImageMigrationService(
      blobService,
      blobPathService,
      options.logFile
    );
    
    // Run migration
    const result = await migrationService.migrateAll(options);
    
    // Print results
    printResults(result);
    
    // Exit with appropriate code
    process.exit(result.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Migration failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the script
main();