#!/usr/bin/env node
/**
 * Book Chapter Images Migration Script
 * 
 * This script migrates book chapter images from the local filesystem to Vercel Blob storage.
 * It scans book directories for chapter images and uses the BlobService to upload them.
 * 
 * Usage:
 *   npx tsx scripts/migrateBookChapterImages.ts [options]
 * 
 * Options:
 *   --dry-run             Simulate migration without uploading (default: false)
 *   --books=slug1,slug2   Comma-separated list of book slugs to migrate (default: all)
 *   --force               Re-upload even if already migrated (default: false)
 *   --retries=3           Number of retries for failed uploads (default: 3)
 *   --concurrency=5       Number of concurrent uploads (default: 5)
 *   --log-file=path       Path to migration log file (default: chapter-images-migration.json)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { blobService } from '../utils/services/BlobService.js';
import { blobPathService } from '../utils/services/BlobPathService.js';

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

// Image migration result
interface ImageMigrationResult {
  status: 'success' | 'skipped' | 'failed';
  originalPath: string;
  blobPath: string;
  blobUrl: string;
  error?: string;
  size?: number;
  uploadedAt?: string;
}

// Book migration results
interface BookChapterImagesResult {
  bookSlug: string;
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  images: Record<string, ImageMigrationResult>;
}

// Overall migration result
interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  books: Record<string, BookChapterImagesResult>;
  startTime: string;
  endTime: string;
  duration: number; // in milliseconds
}

/**
 * Migration log class for tracking migration status
 */
class MigrationLog {
  private log: Record<string, Record<string, ImageMigrationResult>> = {};
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
   * Add an image migration entry
   */
  public add(bookSlug: string, imageName: string, result: ImageMigrationResult): void {
    if (!this.log[bookSlug]) {
      this.log[bookSlug] = {};
    }
    this.log[bookSlug][imageName] = result;
  }
  
  /**
   * Check if an image has been migrated
   */
  public has(bookSlug: string, imageName: string): boolean {
    return (
      bookSlug in this.log && 
      imageName in this.log[bookSlug] && 
      this.log[bookSlug][imageName].status === 'success'
    );
  }
  
  /**
   * Get a specific image's migration result
   */
  public get(bookSlug: string, imageName: string): ImageMigrationResult | undefined {
    if (this.log[bookSlug]) {
      return this.log[bookSlug][imageName];
    }
    return undefined;
  }
  
  /**
   * Get all images for a book
   */
  public getBookImages(bookSlug: string): Record<string, ImageMigrationResult> | undefined {
    return this.log[bookSlug];
  }
  
  /**
   * Get all migration results
   */
  public getAll(): Record<string, Record<string, ImageMigrationResult>> {
    return { ...this.log };
  }
}

/**
 * Chapter Image Migration Service
 */
class ChapterImageMigrationService {
  private migrationLog: MigrationLog;
  
  constructor(
    private readonly blobService = blobService,
    private readonly blobPathService = blobPathService,
    logFile: string = 'chapter-images-migration.json'
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
   * Find images for a specific book
   */
  private async findBookImages(bookSlug: string): Promise<string[]> {
    const bookImagesDir = path.join(ASSETS_DIR, bookSlug, 'images');
    
    if (!existsSync(bookImagesDir)) {
      return [];
    }
    
    const files = await fs.readdir(bookImagesDir);
    return files.filter(file => 
      file.toLowerCase().endsWith('.png') || 
      file.toLowerCase().endsWith('.jpg') || 
      file.toLowerCase().endsWith('.jpeg') ||
      file.toLowerCase().endsWith('.gif')
    );
  }
  
  /**
   * Migrate all book chapter images
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
    
    console.log('Starting book chapter images migration');
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
        const bookResult: BookChapterImagesResult = {
          bookSlug,
          total: 0,
          migrated: 0,
          skipped: 0,
          failed: 0,
          images: {},
        };
        
        try {
          // Find all images for this book
          const images = await this.findBookImages(bookSlug);
          bookResult.total = images.length;
          
          if (images.length === 0) {
            console.log(`No images found for book: ${bookSlug}`);
            result.books[bookSlug] = bookResult;
            return;
          }
          
          console.log(`Found ${images.length} images for book: ${bookSlug}`);
          
          // Process images with limited concurrency
          const imageChunks = this.chunkArray(images, concurrency);
          
          for (const imageChunk of imageChunks) {
            await Promise.all(imageChunk.map(async (imageName) => {
              try {
                // Skip if already migrated and not forced
                if (this.migrationLog.has(bookSlug, imageName) && !options.force && !options.dryRun) {
                  const existingResult = this.migrationLog.get(bookSlug, imageName)!;
                  console.log(`Skipping ${bookSlug}/${imageName} (already migrated to ${existingResult.blobPath})`);
                  
                  bookResult.skipped++;
                  bookResult.images[imageName] = existingResult;
                  return;
                }
                
                // Calculate paths
                const originalPath = `/assets/${bookSlug}/images/${imageName}`;
                const blobPath = this.blobPathService.convertLegacyPath(originalPath);
                const blobUrl = this.blobService.getUrlForPath(blobPath);
                
                // Skip actual upload in dry run mode
                if (options.dryRun) {
                  console.log(`DRY RUN: Would migrate ${originalPath} to ${blobPath}`);
                  
                  const migrationResult: ImageMigrationResult = {
                    status: 'skipped',
                    originalPath,
                    blobPath,
                    blobUrl,
                  };
                  
                  bookResult.skipped++;
                  bookResult.images[imageName] = migrationResult;
                  this.migrationLog.add(bookSlug, imageName, migrationResult);
                  return;
                }
                
                // Perform actual migration
                console.log(`Migrating ${bookSlug} image: ${originalPath} -> ${blobPath}`);
                const migrationResult = await this.migrateImage(bookSlug, imageName, options.retries || 3);
                
                // Update statistics
                if (migrationResult.status === 'success') {
                  console.log(`✅ Successfully migrated ${bookSlug}/${imageName} to ${migrationResult.blobUrl}`);
                  bookResult.migrated++;
                } else if (migrationResult.status === 'skipped') {
                  console.log(`⏭️ Skipped ${bookSlug}/${imageName}`);
                  bookResult.skipped++;
                } else {
                  console.error(`❌ Failed to migrate ${bookSlug}/${imageName}: ${migrationResult.error}`);
                  bookResult.failed++;
                }
                
                // Store result
                bookResult.images[imageName] = migrationResult;
                this.migrationLog.add(bookSlug, imageName, migrationResult);
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`⚠️ Error migrating ${bookSlug}/${imageName}: ${errorMessage}`);
                
                // Record failure
                const failedResult: ImageMigrationResult = {
                  status: 'failed',
                  originalPath: `/assets/${bookSlug}/images/${imageName}`,
                  blobPath: this.blobPathService.convertLegacyPath(`/assets/${bookSlug}/images/${imageName}`),
                  blobUrl: '',
                  error: errorMessage,
                };
                
                bookResult.failed++;
                bookResult.images[imageName] = failedResult;
                this.migrationLog.add(bookSlug, imageName, failedResult);
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
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`⚠️ Error processing book ${bookSlug}: ${errorMessage}`);
        }
      }));
    }
    
    // Process shared images in /assets/images
    await this.migrateSharedImages(result, options);
    
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
   * Migrate shared images in /assets/images
   */
  private async migrateSharedImages(
    result: MigrationResult, 
    options: MigrationOptions
  ): Promise<void> {
    const sharedImagesDir = path.join(ASSETS_DIR, 'images');
    
    if (!existsSync(sharedImagesDir)) {
      console.log('Shared images directory not found, skipping');
      return;
    }
    
    const bookSlug = 'shared';
    
    // Track results for shared images
    const bookResult: BookChapterImagesResult = {
      bookSlug,
      total: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      images: {},
    };
    
    // Find all shared images
    const files = await fs.readdir(sharedImagesDir);
    const images = files.filter(file => 
      file.toLowerCase().endsWith('.png') || 
      file.toLowerCase().endsWith('.jpg') || 
      file.toLowerCase().endsWith('.jpeg') ||
      file.toLowerCase().endsWith('.gif')
    );
    
    bookResult.total = images.length;
    console.log(`Found ${images.length} shared images`);
    
    if (images.length === 0) {
      result.books[bookSlug] = bookResult;
      return;
    }
    
    // Process images with limited concurrency
    const concurrency = options.concurrency || 5;
    const imageChunks = this.chunkArray(images, concurrency);
    
    for (const imageChunk of imageChunks) {
      await Promise.all(imageChunk.map(async (imageName) => {
        try {
          // Skip if already migrated and not forced
          if (this.migrationLog.has(bookSlug, imageName) && !options.force && !options.dryRun) {
            const existingResult = this.migrationLog.get(bookSlug, imageName)!;
            console.log(`Skipping shared/${imageName} (already migrated to ${existingResult.blobPath})`);
            
            bookResult.skipped++;
            bookResult.images[imageName] = existingResult;
            return;
          }
          
          // Calculate paths
          const originalPath = `/assets/images/${imageName}`;
          const blobPath = this.blobPathService.convertLegacyPath(originalPath);
          const blobUrl = this.blobService.getUrlForPath(blobPath);
          
          // Skip actual upload in dry run mode
          if (options.dryRun) {
            console.log(`DRY RUN: Would migrate ${originalPath} to ${blobPath}`);
            
            const migrationResult: ImageMigrationResult = {
              status: 'skipped',
              originalPath,
              blobPath,
              blobUrl,
            };
            
            bookResult.skipped++;
            bookResult.images[imageName] = migrationResult;
            this.migrationLog.add(bookSlug, imageName, migrationResult);
            return;
          }
          
          // Perform actual migration
          console.log(`Migrating shared image: ${originalPath} -> ${blobPath}`);
          
          // Shared images are handled a bit differently
          const fullPath = path.join(projectRoot, 'public', originalPath);
          
          if (!existsSync(fullPath)) {
            const error = `File not found: ${fullPath}`;
            console.error(`❌ ${error}`);
            
            const failedResult: ImageMigrationResult = {
              status: 'failed',
              originalPath,
              blobPath,
              blobUrl: '',
              error,
            };
            
            bookResult.failed++;
            bookResult.images[imageName] = failedResult;
            this.migrationLog.add(bookSlug, imageName, failedResult);
            return;
          }
          
          // Read file
          const fileBuffer = await fs.readFile(fullPath);
          const file = new File([fileBuffer], imageName, {
            type: this.getContentType(imageName),
          });
          
          // Get directory path and filename
          const pathname = path.dirname(blobPath);
          const filename = path.basename(blobPath);
          
          // Try upload with retries
          let lastError = '';
          let migrationResult: ImageMigrationResult;
          
          for (let attempt = 0; attempt < (options.retries || 3); attempt++) {
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
                if (attempt < (options.retries || 3) - 1) {
                  const delay = Math.pow(2, attempt) * 1000;
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
                continue; // Retry
              }
              
              migrationResult = {
                status: 'success',
                originalPath,
                blobPath,
                blobUrl: uploadResult.url,
                size: uploadResult.size,
                uploadedAt: uploadResult.uploadedAt,
              };
              
              console.log(`✅ Successfully migrated shared/${imageName} to ${migrationResult.blobUrl}`);
              bookResult.migrated++;
              bookResult.images[imageName] = migrationResult;
              this.migrationLog.add(bookSlug, imageName, migrationResult);
              return;
            } catch (error) {
              lastError = error instanceof Error ? error.message : String(error);
              console.warn(`Attempt ${attempt + 1}/${options.retries || 3} failed: ${lastError}`);
              
              // Wait before retry (exponential backoff)
              if (attempt < (options.retries || 3) - 1) {
                const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, etc.
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
          
          // All retries failed
          migrationResult = {
            status: 'failed',
            originalPath,
            blobPath,
            blobUrl: '',
            error: `Failed after ${options.retries || 3} attempts. Last error: ${lastError}`,
          };
          
          console.error(`❌ Failed to migrate shared/${imageName}: ${migrationResult.error}`);
          bookResult.failed++;
          bookResult.images[imageName] = migrationResult;
          this.migrationLog.add(bookSlug, imageName, migrationResult);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`⚠️ Error migrating shared/${imageName}: ${errorMessage}`);
          
          // Record failure
          const failedResult: ImageMigrationResult = {
            status: 'failed',
            originalPath: `/assets/images/${imageName}`,
            blobPath: this.blobPathService.convertLegacyPath(`/assets/images/${imageName}`),
            blobUrl: '',
            error: errorMessage,
          };
          
          bookResult.failed++;
          bookResult.images[imageName] = failedResult;
          this.migrationLog.add(bookSlug, imageName, failedResult);
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
  }
  
  /**
   * Migrate a single image
   */
  private async migrateImage(
    bookSlug: string, 
    imageName: string,
    maxRetries: number = 3
  ): Promise<ImageMigrationResult> {
    const originalPath = `/assets/${bookSlug}/images/${imageName}`;
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
    const file = new File([fileBuffer], imageName, {
      type: this.getContentType(imageName),
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
    logFile: 'chapter-images-migration.json',
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
  console.log(`Total images: ${result.total}`);
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
        
        // Show details for each failed image
        Object.entries(r.images)
          .filter(([_, ir]) => ir.status === 'failed')
          .forEach(([imageName, ir]) => {
            console.log(`    - ${imageName}: ${ir.error}`);
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
    const migrationService = new ChapterImageMigrationService(
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