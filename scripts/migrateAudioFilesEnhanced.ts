#!/usr/bin/env node
/**
 * Enhanced Audio Files Migration Script with Validation
 * 
 * This script properly migrates audio files from Digital Ocean Spaces to Vercel Blob storage,
 * with robust validation, progress tracking, and error handling.
 * 
 * Usage:
 *   npx tsx scripts/migrateAudioFilesEnhanced.ts [options]
 * 
 * Options:
 *   --dry-run             Simulate migration without uploading (default: false)
 *   --books=slug1,slug2   Comma-separated list of book slugs to migrate (default: all)
 *   --force               Re-upload even if already migrated (default: false)
 *   --retries=3           Number of retries for failed operations (default: 3)
 *   --concurrency=3       Number of concurrent operations (default: 3)
 *   --log-file=path       Path to migration log file (default: audio-migration-enhanced.json)
 *   --verbose             Enable detailed logging (default: false)
 *   --size-threshold=N    Minimum size (in KB) to consider file valid (default: 100)
 *   --inventory=path      Path to existing audio inventory JSON file (optional)
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { blobService } from '../utils/services/BlobService';
import translations from '../translations';

// Constants
const DO_REGION = 'nyc3';
const DO_BUCKET = process.env.DO_SPACES_BUCKET || 'brainrot-publishing';
const DO_SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com';
const DO_BASE_URL = `https://${DO_BUCKET}.${DO_REGION}.digitaloceanspaces.com`;
const DO_CDN_URL = `https://${DO_BUCKET}.${DO_REGION}.cdn.digitaloceanspaces.com`;
const MIN_AUDIO_SIZE_KB = 100; // Minimum size in KB for a valid audio file
const MP3_HEADER_MAGIC = Buffer.from([0xFF, 0xFB]); // Common MP3 frame header start

// Types
interface MigrationOptions {
  dryRun: boolean;
  books: string[];
  force: boolean;
  retries: number;
  concurrency: number;
  logFile: string;
  verbose: boolean;
  sizeThreshold: number; // in KB
  inventoryPath?: string;
}

interface AudioFile {
  key: string;
  bookSlug: string;
  chapterTitle?: string;
  size?: number;
  cdnUrl: string;
  blobPath: string;
  blobUrl: string;
}

interface MigrationResult {
  status: 'success' | 'skipped' | 'failed';
  bookSlug: string;
  chapterTitle?: string;
  key: string;
  cdnUrl: string;
  blobPath: string;
  blobUrl: string;
  downloadSize?: number;
  uploadSize?: number;
  contentType?: string;
  error?: string;
  skipReason?: string;
  downloadTime?: number;
  uploadTime?: number;
  totalTime?: number;
  uploadedAt?: string;
  validated: boolean;
  validationInfo?: {
    sizeMatch: boolean;
    contentValidated: boolean;
    expectedSize?: number;
    actualSize?: number;
  };
}

interface MigrationSummary {
  timestamp: string;
  total: number;
  successful: number;
  skipped: number;
  failed: number;
  totalDownloadSize: number; // in bytes
  totalUploadSize: number;   // in bytes
  totalDuration: number;     // in milliseconds
  booksCovered: string[];
  validationSuccess: number;
  validationFailed: number;
  startTime: string;
  endTime: string;
}

interface DownloadOptions {
  maxRetries?: number;
  timeout?: number;
  verbose?: boolean;
}

interface DownloadResult {
  key: string;
  content: Buffer;
  size: number;
  contentType: string;
  timeTaken: number;
}

/**
 * Create a Digital Ocean S3 client
 */
function createDigitalOceanClient(): S3Client {
  const accessKeyId = process.env.DO_SPACES_ACCESS_KEY;
  const secretAccessKey = process.env.DO_SPACES_SECRET_KEY;
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Digital Ocean credentials not found. Set DO_SPACES_ACCESS_KEY and DO_SPACES_SECRET_KEY in .env.local');
  }
  
  return new S3Client({
    region: DO_REGION,
    endpoint: `https://${DO_SPACES_ENDPOINT}`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

/**
 * Download an audio file from Digital Ocean Spaces
 */
async function downloadFromDigitalOcean(
  client: S3Client,
  key: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  // Default options
  const {
    maxRetries = 3,
    timeout = 300000, // 5 minutes default timeout for large files
    verbose = false,
  } = options;

  let retries = 0;
  let lastError: Error | null = null;

  // Start timing
  const startTime = Date.now();

  if (verbose) {
    console.log(`Downloading from Digital Ocean: ${key}`);
  }

  // Try downloading with retries
  while (retries <= maxRetries) {
    try {
      const command = new GetObjectCommand({
        Bucket: DO_BUCKET,
        Key: key
      });
      
      const response = await client.send(command);
      
      if (!response.Body) {
        throw new Error(`Empty body received for ${key}`);
      }
      
      const contentType = response.ContentType || 'audio/mpeg';
      const expectedSize = response.ContentLength || 0;
      
      // Convert stream to buffer
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      
      const content = Buffer.concat(chunks);
      
      if (content.length !== expectedSize) {
        throw new Error(`Download size mismatch for ${key}: expected ${expectedSize}, got ${content.length}`);
      }

      // Calculate time taken
      const timeTaken = Date.now() - startTime;
      
      if (verbose) {
        console.log(`Download successful: ${key}`);
        console.log(`Size: ${content.length} bytes, Content-Type: ${contentType}`);
        console.log(`Time taken: ${timeTaken}ms`);
      }
      
      return {
        key,
        content,
        size: content.length,
        contentType,
        timeTaken
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retries++;
      
      if (verbose) {
        console.warn(`Download attempt ${retries} failed: ${lastError.message}`);
      }
      
      // If we've used all retries, throw the error
      if (retries > maxRetries) {
        throw new Error(`Failed to download ${key} after ${maxRetries} attempts: ${lastError.message}`);
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retries - 1), 30000);
      
      if (verbose) {
        console.log(`Retrying in ${delay}ms...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the throw in the retry loop
  throw lastError || new Error(`Failed to download ${key} for unknown reason`);
}

/**
 * Verify that a buffer contains valid audio content
 */
function verifyAudioContent(buffer: Buffer): boolean {
  // Check for MP3 header magic bytes
  for (let i = 0; i < Math.min(buffer.length, 4096) - 1; i++) {
    if (buffer[i] === MP3_HEADER_MAGIC[0] && buffer[i + 1] === MP3_HEADER_MAGIC[1]) {
      return true;
    }
  }
  
  return false;
}

/**
 * Parse command-line arguments
 */
function parseArgs(): MigrationOptions {
  const options: MigrationOptions = {
    dryRun: false,
    books: [],
    force: false,
    retries: 3,
    concurrency: 3,
    logFile: 'audio-migration-enhanced.json',
    verbose: false,
    sizeThreshold: MIN_AUDIO_SIZE_KB,
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
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg.startsWith('--size-threshold=')) {
      options.sizeThreshold = parseInt(arg.substring('--size-threshold='.length), 10);
    } else if (arg.startsWith('--inventory=')) {
      options.inventoryPath = arg.substring('--inventory='.length);
    }
  }
  
  return options;
}

/**
 * Create a readline interface for user confirmation
 */
function createInterface(): NodeJS.ReadableStream & { 
  question(query: string, callback: (answer: string) => void): void;
  close(): void;
} {
  const readline = require('readline');
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * Main class for enhanced audio file migration
 */
class EnhancedAudioMigrator {
  private client: S3Client;
  private results: MigrationResult[] = [];
  private activePromises: Promise<void>[] = [];
  private semaphoreValue: number;
  private startTime: Date = new Date();
  private progressCount = 0;
  private totalFiles = 0;
  private audioFiles: AudioFile[] = [];
  
  constructor(private readonly options: MigrationOptions) {
    this.client = createDigitalOceanClient();
    this.semaphoreValue = options.concurrency;
  }
  
  /**
   * Run the migration process
   */
  public async run(): Promise<MigrationSummary> {
    this.startTime = new Date();
    console.log(`\n🎵 Starting enhanced audio files migration ${this.options.dryRun ? '(DRY RUN)' : ''}`);
    
    try {
      // Get books to process
      const booksToProcess = this.options.books.length > 0 
        ? this.options.books 
        : translations.map(book => book.slug);
        
      console.log(`Processing books: ${booksToProcess.join(', ')}`);
      
      // Gather all audio files to process
      await this.gatherAudioFiles(booksToProcess);
      
      // Process each audio file with concurrency
      this.totalFiles = this.audioFiles.length;
      console.log(`Found ${this.totalFiles} audio files to process`);
      
      // Confirm operation before beginning
      if (!this.options.dryRun && !await this.confirmOperation()) {
        console.log('Operation cancelled by user');
        process.exit(0);
      }
      
      // Process files in parallel with semaphore
      for (const audioFile of this.audioFiles) {
        // Wait if we've reached concurrency limit
        if (this.semaphoreValue <= 0) {
          await Promise.race(this.activePromises);
        }
        
        // Process the file
        this.semaphoreValue--;
        
        const promise = this.processAudioFile(audioFile)
          .catch(error => {
            console.error(`Error processing ${audioFile.key}:`, error);
          })
          .finally(() => {
            this.semaphoreValue++;
            this.activePromises = this.activePromises.filter(p => p !== promise);
            this.progressCount++;
            this.updateProgress();
          });
        
        this.activePromises.push(promise);
      }
      
      // Wait for all remaining operations
      if (this.activePromises.length > 0) {
        console.log(`Waiting for ${this.activePromises.length} remaining operations...`);
        await Promise.all(this.activePromises);
      }
      
      // Generate and save summary
      const summary = this.generateSummary();
      this.printSummary(summary);
      await this.saveResults(summary);
      
      return summary;
    } catch (error) {
      console.error('Migration failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  /**
   * Display progress update
   */
  private updateProgress(): void {
    if (this.totalFiles === 0) return;
    
    const percent = Math.round((this.progressCount / this.totalFiles) * 100);
    const success = this.results.filter(r => r.status === 'success').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    
    process.stdout.write(`\rProgress: ${this.progressCount}/${this.totalFiles} (${percent}%) - Success: ${success}, Skipped: ${skipped}, Failed: ${failed}`);
  }
  
  /**
   * Gather all audio files that need to be processed
   */
  private async gatherAudioFiles(booksToProcess: string[]): Promise<void> {
    // If inventory path is provided, load from there
    if (this.options.inventoryPath && existsSync(this.options.inventoryPath)) {
      console.log(`Loading audio inventory from ${this.options.inventoryPath}...`);
      await this.loadAudioFilesFromInventory();
      return;
    }
    
    // Otherwise build list from translations
    console.log('Building audio files list from translations...');
    for (const bookSlug of booksToProcess) {
      const book = translations.find(t => t.slug === bookSlug);
      
      if (!book) {
        console.warn(`Book not found: ${bookSlug}`);
        continue;
      }
      
      if (!book.chapters) {
        console.log(`No chapters found for book: ${bookSlug}`);
        continue;
      }
      
      for (const chapter of book.chapters) {
        if (!chapter.audioSrc) continue;
        
        // Extract the file name
        const fileName = path.basename(chapter.audioSrc);
        // Construct the S3 key
        const key = `${bookSlug}/audio/${fileName}`;
        // Construct CDN URL
        const cdnUrl = `${DO_CDN_URL}/${key}`;
        // Construct blob path
        const blobPath = `${bookSlug}/audio/${fileName}`;
        // Get URL for verification and uploading
        const blobUrl = blobService.getUrlForPath(blobPath);
        
        this.audioFiles.push({
          key,
          bookSlug,
          chapterTitle: chapter.title,
          cdnUrl,
          blobPath,
          blobUrl
        });
      }
    }
  }
  
  /**
   * Load audio files from an existing inventory JSON file
   */
  private async loadAudioFilesFromInventory(): Promise<void> {
    if (!this.options.inventoryPath) return;
    
    try {
      const inventoryData = await fs.readFile(this.options.inventoryPath, 'utf8');
      const inventory = JSON.parse(inventoryData);
      
      // Check if this is the expected format (from createAudioInventory.ts)
      if (inventory.books && Array.isArray(inventory.books)) {
        // Filter to only include books specified in options.books if any
        const booksToInclude = this.options.books.length > 0 
          ? inventory.books.filter((b: any) => this.options.books.includes(b.slug))
          : inventory.books;
          
        for (const book of booksToInclude) {
          if (!book.files || !Array.isArray(book.files)) continue;
          
          for (const file of book.files) {
            // Skip placeholder files
            if (file.isPlaceholder) continue;
            
            // Skip non-existent files
            if (!file.exists) continue;
            
            const fileName = path.basename(file.key);
            const blobPath = `${book.slug}/audio/${fileName}`;
            const blobUrl = blobService.getUrlForPath(blobPath);
            
            this.audioFiles.push({
              key: file.key,
              bookSlug: book.slug,
              chapterTitle: file.chapterTitle,
              size: file.size,
              cdnUrl: file.cdnUrl,
              blobPath,
              blobUrl
            });
          }
        }
      } else {
        throw new Error('Invalid inventory format');
      }
      
      console.log(`Loaded ${this.audioFiles.length} audio files from inventory`);
    } catch (error) {
      console.error('Error loading inventory:', error);
      throw new Error(`Failed to load inventory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Process a single audio file
   */
  private async processAudioFile(audioFile: AudioFile): Promise<void> {
    const operationStartTime = Date.now();
    const { key, bookSlug, chapterTitle, blobPath, blobUrl, cdnUrl } = audioFile;
    
    this.log(`\nProcessing: ${key} -> ${blobPath}`);
    
    const result: MigrationResult = {
      status: 'failed',
      bookSlug,
      chapterTitle,
      key,
      cdnUrl,
      blobPath,
      blobUrl,
      totalTime: 0,
      validated: false
    };
    
    try {
      // Check if file already exists in Blob storage
      let exists = false;
      let existingSize = 0;
      
      try {
        const fileInfo = await blobService.getFileInfo(blobUrl);
        existingSize = fileInfo?.size || 0;
        
        // Consider it exists only if it's a real file (not a tiny placeholder)
        exists = fileInfo && fileInfo.size > this.options.sizeThreshold * 1024;
        
        if (exists) {
          this.log(`File already exists in Blob storage (${formatSize(fileInfo.size)})`);
        } else if (existingSize > 0) {
          this.log(`Small placeholder file exists (${formatSize(existingSize)}) - will replace`);
        }
      } catch (error) {
        // File doesn't exist, we'll upload it
        exists = false;
      }
      
      // Skip if already exists and not forced
      if (exists && !this.options.force) {
        this.log(`Skipping (already exists as real audio file)`);
        
        result.status = 'skipped';
        result.skipReason = 'already exists';
        this.results.push(result);
        return;
      }
      
      // In dry run mode, simulate the operation
      if (this.options.dryRun) {
        this.log(`DRY RUN: Would download and upload ${key}`);
        
        result.status = 'skipped';
        result.skipReason = 'dry run';
        this.results.push(result);
        return;
      }
      
      // Download the audio file from Digital Ocean
      this.log(`Downloading from Digital Ocean: ${key}`);
      const downloadStartTime = Date.now();
      
      const downloadResult = await downloadFromDigitalOcean(this.client, key, {
        maxRetries: this.options.retries,
        verbose: this.options.verbose
      });
      
      const downloadDuration = Date.now() - downloadStartTime;
      this.log(`Downloaded ${formatSize(downloadResult.size)} (${downloadResult.contentType}) in ${downloadDuration}ms`);
      
      result.downloadSize = downloadResult.size;
      result.contentType = downloadResult.contentType;
      result.downloadTime = downloadDuration;
      
      // Verify audio content
      const contentValid = verifyAudioContent(downloadResult.content);
      if (!contentValid) {
        this.log(`WARNING: Content validation failed - file doesn't appear to be valid MP3`);
      } else {
        this.log(`Content validation passed - file appears to be valid MP3`);
      }
      
      // Create a File object from the downloaded buffer
      const file = new File(
        [downloadResult.content], 
        path.basename(blobPath), 
        { type: downloadResult.contentType }
      );
      
      // Upload to Vercel Blob storage
      this.log(`Uploading to Vercel Blob: ${blobPath}`);
      const uploadStartTime = Date.now();
      
      const uploadResult = await blobService.uploadFile(file, {
        pathname: path.dirname(blobPath),
        filename: path.basename(blobPath),
        access: 'public',
        contentType: downloadResult.contentType,
        addRandomSuffix: false,
        allowOverwrite: true
      });
      
      const uploadDuration = Date.now() - uploadStartTime;
      this.log(`Uploaded to ${uploadResult.url} (${formatSize(uploadResult.size)}) in ${uploadDuration}ms`);
      
      // Verify the upload
      const verifyResult = await blobService.getFileInfo(uploadResult.url);
      const sizeMatch = verifyResult.size === downloadResult.size;
      
      if (!sizeMatch) {
        this.log(`WARNING: Upload verification failed - size mismatch (expected ${downloadResult.size}, got ${verifyResult.size})`);
      } else {
        this.log(`Upload verification passed - size matches`);
      }
      
      // Record validation information
      result.validated = true;
      result.validationInfo = {
        sizeMatch,
        contentValidated: contentValid,
        expectedSize: downloadResult.size,
        actualSize: verifyResult.size
      };
      
      // Mark as success only if validation passed
      result.status = sizeMatch ? 'success' : 'failed';
      result.uploadSize = uploadResult.size;
      result.uploadTime = uploadDuration;
      result.uploadedAt = uploadResult.uploadedAt;
      result.totalTime = Date.now() - operationStartTime;
      
      if (result.status === 'success') {
        this.log(`Successfully migrated audio file in ${result.totalTime}ms`);
      } else {
        result.error = `Validation failed: size mismatch (expected ${downloadResult.size}, got ${verifyResult.size})`;
        this.log(`Migration failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Error: ${errorMessage}`);
      
      result.status = 'failed';
      result.error = errorMessage;
      result.totalTime = Date.now() - operationStartTime;
    }
    
    // Add to results
    this.results.push(result);
  }
  
  /**
   * Confirm operation with user
   */
  private async confirmOperation(): Promise<boolean> {
    if (this.options.force) return true;
    
    const rl = createInterface();
    
    return new Promise((resolve) => {
      rl.question(`About to migrate ${this.totalFiles} audio files. Proceed? (y/N) `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }
  
  /**
   * Generate migration summary
   */
  private generateSummary(): MigrationSummary {
    const endTime = new Date();
    
    const successful = this.results.filter(r => r.status === 'success').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    
    const totalDownloadSize = this.results.reduce((total, r) => total + (r.downloadSize || 0), 0);
    const totalUploadSize = this.results.reduce((total, r) => total + (r.uploadSize || 0), 0);
    const totalDuration = endTime.getTime() - this.startTime.getTime();
    
    const booksCovered = [...new Set(this.results.map(r => r.bookSlug))];
    
    const validationSuccess = this.results.filter(r => r.validated && r.validationInfo?.sizeMatch).length;
    const validationFailed = this.results.filter(r => r.validated && !r.validationInfo?.sizeMatch).length;
    
    return {
      timestamp: new Date().toISOString(),
      total: this.results.length,
      successful,
      skipped,
      failed,
      totalDownloadSize,
      totalUploadSize,
      totalDuration,
      booksCovered,
      validationSuccess,
      validationFailed,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString()
    };
  }
  
  /**
   * Print migration summary
   */
  private printSummary(summary: MigrationSummary): void {
    console.log('\n\n📊 Migration Summary');
    console.log('------------------');
    console.log(`Total files: ${summary.total}`);
    console.log(`Successful : ${summary.successful}`);
    console.log(`Skipped    : ${summary.skipped}`);
    console.log(`Failed     : ${summary.failed}`);
    
    console.log('\nValidation:');
    console.log(`Success    : ${summary.validationSuccess}`);
    console.log(`Failed     : ${summary.validationFailed}`);
    
    const downloadSizeMB = (summary.totalDownloadSize / (1024 * 1024)).toFixed(2);
    const uploadSizeMB = (summary.totalUploadSize / (1024 * 1024)).toFixed(2);
    const durationMin = (summary.totalDuration / (1000 * 60)).toFixed(2);
    
    console.log(`\nTotal downloaded: ${downloadSizeMB} MB`);
    console.log(`Total uploaded  : ${uploadSizeMB} MB`);
    console.log(`Total duration  : ${durationMin} minutes`);
    
    console.log(`\nBooks covered: ${summary.booksCovered.join(', ')}`);
    
    if (summary.failed > 0) {
      console.log('\n❌ Failed Files:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`   - ${r.bookSlug} / ${r.key}: ${r.error}`);
        });
    }
  }
  
  /**
   * Save migration results to file
   */
  private async saveResults(summary: MigrationSummary): Promise<void> {
    const output = {
      summary,
      options: this.options,
      results: this.results
    };
    
    const outputPath = path.isAbsolute(this.options.logFile)
      ? this.options.logFile
      : path.join(process.cwd(), this.options.logFile);
    
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`\n💾 Results saved to ${outputPath}`);
    
    // Also save a human-readable report
    const reportPath = outputPath.replace(/\.json$/, '.md');
    await this.saveMarkdownReport(summary, reportPath);
    console.log(`📝 Report saved to ${reportPath}`);
  }
  
  /**
   * Save a human-readable Markdown report
   */
  private async saveMarkdownReport(summary: MigrationSummary, filePath: string): Promise<void> {
    const lines = [
      '# Enhanced Audio Migration Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      '',
      `- **Total files**: ${summary.total}`,
      `- **Successful**: ${summary.successful}`,
      `- **Skipped**: ${summary.skipped}`,
      `- **Failed**: ${summary.failed}`,
      '',
      '### Validation',
      '',
      `- **Success**: ${summary.validationSuccess}`,
      `- **Failed**: ${summary.validationFailed}`,
      '',
      '### Transfer Statistics',
      '',
      `- **Total downloaded**: ${(summary.totalDownloadSize / (1024 * 1024)).toFixed(2)} MB`,
      `- **Total uploaded**: ${(summary.totalUploadSize / (1024 * 1024)).toFixed(2)} MB`,
      `- **Total duration**: ${(summary.totalDuration / (1000 * 60)).toFixed(2)} minutes`,
      '',
      '### Books Covered',
      '',
      ...summary.booksCovered.map(book => `- ${book}`),
      '',
    ];
    
    // Add book-by-book breakdown
    lines.push('## Book-by-Book Breakdown', '');
    
    for (const bookSlug of summary.booksCovered) {
      const bookResults = this.results.filter(r => r.bookSlug === bookSlug);
      const bookSuccess = bookResults.filter(r => r.status === 'success').length;
      const bookSkipped = bookResults.filter(r => r.status === 'skipped').length;
      const bookFailed = bookResults.filter(r => r.status === 'failed').length;
      const bookTotal = bookResults.length;
      
      lines.push(`### ${bookSlug}`, '');
      lines.push(`- **Total**: ${bookTotal}`);
      lines.push(`- **Success**: ${bookSuccess}`);
      lines.push(`- **Skipped**: ${bookSkipped}`);
      lines.push(`- **Failed**: ${bookFailed}`);
      lines.push('');
      
      if (bookFailed > 0) {
        lines.push('#### Failed Files', '');
        
        for (const result of bookResults.filter(r => r.status === 'failed')) {
          lines.push(`- **${result.key}**: ${result.error}`);
        }
        
        lines.push('');
      }
    }
    
    // Add detailed logs for failures
    if (summary.failed > 0) {
      lines.push('## Detailed Failure Logs', '');
      
      for (const result of this.results.filter(r => r.status === 'failed')) {
        lines.push(`### ${result.bookSlug} / ${result.key}`, '');
        lines.push(`- **Status**: ${result.status}`);
        lines.push(`- **Error**: ${result.error}`);
        
        if (result.validated) {
          lines.push(`- **Size Match**: ${result.validationInfo?.sizeMatch}`);
          lines.push(`- **Expected Size**: ${formatSize(result.validationInfo?.expectedSize || 0)}`);
          lines.push(`- **Actual Size**: ${formatSize(result.validationInfo?.actualSize || 0)}`);
        }
        
        lines.push('');
      }
    }
    
    await fs.writeFile(filePath, lines.join('\n'), 'utf8');
  }
  
  /**
   * Conditionally log messages based on verbose option
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(message);
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    const migrator = new EnhancedAudioMigrator(options);
    await migrator.run();
    
    console.log('\n✅ Enhanced audio migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Enhanced audio migration failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();