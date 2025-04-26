#!/usr/bin/env node
/**
 * Source Text Files Migration Script
 * 
 * This script migrates source text files from the local filesystem to Vercel Blob storage.
 * It scans book directories for source text files and uses the BlobService to upload them.
 * 
 * Usage:
 *   npx tsx scripts/migrateSourceTextFiles.ts [options]
 * 
 * Options:
 *   --dry-run             Simulate migration without uploading (default: false)
 *   --books=slug1,slug2   Comma-separated list of book slugs to migrate (default: all)
 *   --force               Re-upload even if already migrated (default: false)
 *   --retries=3           Number of retries for failed uploads (default: 3)
 *   --concurrency=5       Number of concurrent uploads (default: 5)
 *   --log-file=path       Path to migration log file (default: source-text-migration.json)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { blobService } from '../utils/services/BlobService.js';
import { blobPathService } from '../utils/services/BlobPathService.js';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get this file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(projectRoot, 'public', 'assets');

// Migration options
interface MigrationOptions {
  dryRun?: boolean;
  books?: string[];
  force?: boolean;
  retries?: number;
  concurrency?: number;
  logFile?: string;
}

// Text file migration result
interface TextFileMigrationResult {
  status: 'success' | 'skipped' | 'failed';
  originalPath: string;
  blobPath: string;
  blobUrl: string;
  error?: string;
  size?: number;
  uploadedAt?: string;
}

// Book migration results
interface BookTextFilesResult {
  bookSlug: string;
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  files: Record<string, TextFileMigrationResult>;
}

// Overall migration result
interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  books: Record<string, BookTextFilesResult>;
  startTime: string;
  endTime: string;
  duration: number; // in milliseconds
}

/**
 * Migration log class for tracking migration status
 */
class MigrationLog {
  private log: Record<string, Record<string, TextFileMigrationResult>> = {};
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
   * Add a text file migration entry
   */
  public add(bookSlug: string, fileName: string, result: TextFileMigrationResult): void {
    if (!this.log[bookSlug]) {
      this.log[bookSlug] = {};
    }
    this.log[bookSlug][fileName] = result;
  }
  
  /**
   * Check if a text file has been migrated
   */
  public has(bookSlug: string, fileName: string): boolean {
    return (
      bookSlug in this.log && 
      fileName in this.log[bookSlug] && 
      this.log[bookSlug][fileName].status === 'success'
    );
  }
  
  /**
   * Get a specific text file's migration result
   */
  public get(bookSlug: string, fileName: string): TextFileMigrationResult | undefined {
    if (this.log[bookSlug]) {
      return this.log[bookSlug][fileName];
    }
    return undefined;
  }
  
  /**
   * Get all text files for a book
   */
  public getBookFiles(bookSlug: string): Record<string, TextFileMigrationResult> | undefined {
    return this.log[bookSlug];
  }
  
  /**
   * Get all migration results
   */
  public getAll(): Record<string, Record<string, TextFileMigrationResult>> {
    return { ...this.log };
  }
}

/**
 * Source Text Migration Service
 */
class SourceTextMigrationService {
  private migrationLog: MigrationLog;
  
  constructor(
    private readonly blobService = blobService,
    private readonly blobPathService = blobPathService,
    logFile: string = 'source-text-migration.json'
  ) {
    this.migrationLog = new MigrationLog(logFile);
  }
  
  /**
   * Find all book directories in the assets folder
   */
  private async findBookDirectories(): Promise<string[]> {
    const items = await fs.readdir(ASSETS_DIR, { withFileTypes: true });
    const bookDirs = items
      .filter(item => item.isDirectory() && item.name !== 'images')
      .map(item => item.name);
    
    return bookDirs;
  }
  
  /**
   * Find source text files for a specific book
   */
  private async findSourceTextFiles(bookSlug: string): Promise<string[]> {
    const sourceDir = path.join(ASSETS_DIR, bookSlug, 'text', 'source');
    
    if (!existsSync(sourceDir)) {
      return [];
    }
    
    const files = await fs.readdir(sourceDir);
    return files.filter(file => file.toLowerCase().endsWith('.txt'));
  }
  
  /**
   * Migrate all source text files
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
    
    console.log('Starting source text files migration');
    console.log(`Options: ${JSON.stringify(options, null, 2)}`);
    
    // Load existing migration log
    await this.migrationLog.load();
    
    // Get all book directories
    let bookDirs = await this.findBookDirectories();
    
    // Filter by specified books if provided
    if (options.books && options.books.length > 0) {
      bookDirs = bookDirs.filter(dir => options.books!.includes(dir));
      console.log(`Filtering to specific books: ${options.books.join(', ')}`);
    }
    
    console.log(`Found ${bookDirs.length} book directories`);
    
    if (options.dryRun) {
      console.log('DRY RUN: No files will be uploaded');
    }
    
    // Process books with limited concurrency
    const concurrency = options.concurrency || 5;
    const chunks = this.chunkArray(bookDirs, concurrency);
    
    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (bookSlug) => {
        // Track results for this book
        const bookResult: BookTextFilesResult = {
          bookSlug,
          total: 0,
          migrated: 0,
          skipped: 0,
          failed: 0,
          files: {},
        };
        
        try {
          // Find all source text files for this book
          const textFiles = await this.findSourceTextFiles(bookSlug);
          bookResult.total = textFiles.length;
          
          if (textFiles.length === 0) {
            console.log(`No source text files found for book: ${bookSlug}`);
            result.books[bookSlug] = bookResult;
            return;
          }
          
          console.log(`Found ${textFiles.length} source text files for book: ${bookSlug}`);
          
          // Process files with limited concurrency
          const fileChunks = this.chunkArray(textFiles, concurrency);
          
          for (const fileChunk of fileChunks) {
            await Promise.all(fileChunk.map(async (fileName) => {
              try {
                // Skip if already migrated and not forced
                if (this.migrationLog.has(bookSlug, fileName) && !options.force && !options.dryRun) {
                  const existingResult = this.migrationLog.get(bookSlug, fileName)!;
                  console.log(`Skipping ${bookSlug}/${fileName} (already migrated to ${existingResult.blobPath})`);
                  
                  bookResult.skipped++;
                  bookResult.files[fileName] = existingResult;
                  return;
                }
                
                // Calculate paths
                const originalPath = `/assets/${bookSlug}/text/source/${fileName}`;
                const blobPath = this.blobPathService.convertLegacyPath(originalPath);
                const blobUrl = this.blobService.getUrlForPath(blobPath);
                
                // Skip actual upload in dry run mode
                if (options.dryRun) {
                  console.log(`DRY RUN: Would migrate ${originalPath} to ${blobPath}`);
                  
                  const migrationResult: TextFileMigrationResult = {
                    status: 'skipped',
                    originalPath,
                    blobPath,
                    blobUrl,
                  };
                  
                  bookResult.skipped++;
                  bookResult.files[fileName] = migrationResult;
                  this.migrationLog.add(bookSlug, fileName, migrationResult);
                  return;
                }
                
                // Perform actual migration
                console.log(`Migrating ${bookSlug} source text file: ${originalPath} -> ${blobPath}`);
                const migrationResult = await this.migrateTextFile(bookSlug, fileName, options.retries || 3);
                
                // Update statistics
                if (migrationResult.status === 'success') {
                  console.log(`✅ Successfully migrated ${bookSlug}/${fileName} to ${migrationResult.blobUrl}`);
                  bookResult.migrated++;
                } else if (migrationResult.status === 'skipped') {
                  console.log(`⏭️ Skipped ${bookSlug}/${fileName}`);
                  bookResult.skipped++;
                } else {
                  console.error(`❌ Failed to migrate ${bookSlug}/${fileName}: ${migrationResult.error}`);
                  bookResult.failed++;
                }
                
                // Store result
                bookResult.files[fileName] = migrationResult;
                this.migrationLog.add(bookSlug, fileName, migrationResult);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`⚠️ Error migrating ${bookSlug}/${fileName}: ${errorMessage}`);
                
                // Record failure
                const failedResult: TextFileMigrationResult = {
                  status: 'failed',
                  originalPath: `/assets/${bookSlug}/text/source/${fileName}`,
                  blobPath: this.blobPathService.convertLegacyPath(`/assets/${bookSlug}/text/source/${fileName}`),
                  blobUrl: '',
                  error: errorMessage,
                };
                
                bookResult.failed++;
                bookResult.files[fileName] = failedResult;
                this.migrationLog.add(bookSlug, fileName, failedResult);
              }
            }));
          }
          
          // Update overall statistics
          result.total += bookResult.total;
          result.migrated += bookResult.migrated;
          result.skipped += bookResult.skipped;
          result.failed += bookResult.failed;
          
          // Store book result
          result.books[bookSlug] = bookResult;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`⚠️ Error processing book ${bookSlug}: ${errorMessage}`);
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
   * Migrate a single text file
   */
  private async migrateTextFile(
    bookSlug: string, 
    fileName: string,
    maxRetries: number = 3
  ): Promise<TextFileMigrationResult> {
    const originalPath = `/assets/${bookSlug}/text/source/${fileName}`;
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
    
    // Read file content
    const content = await fs.readFile(fullPath, 'utf-8');
    
    // Try upload with retries
    let lastError = '';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Upload to Blob storage
        const uploadResult = await this.blobService.uploadText(content, blobPath, {
          access: 'public',
          allowOverwrite: true,
          // Source files change less frequently than brainrot files
          cacheControl: 'max-age=86400', // 24 hour cache for source files
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
    logFile: 'source-text-migration.json',
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
  console.log(`Total text files: ${result.total}`);
  console.log(`Migrated: ${result.migrated}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Failed: ${result.failed}`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
  
  if (result.failed > 0) {
    console.log('\nFailed migrations by book:');
    Object.entries(result.books)
      .filter(([_, r]) => r.failed > 0)
      .forEach(([bookSlug, r]) => {
        console.log(`  - ${bookSlug}: ${r.failed} failed`);
        
        // Show details for each failed file
        Object.entries(r.files)
          .filter(([_, fr]) => fr.status === 'failed')
          .forEach(([fileName, fr]) => {
            console.log(`    - ${fileName}: ${fr.error}`);
          });
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
    const migrationService = new SourceTextMigrationService(
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