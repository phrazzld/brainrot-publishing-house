#!/usr/bin/env node
/**
 * Remaining Assets Migration Script
 * 
 * This script identifies and migrates any remaining assets not yet in Vercel Blob storage.
 * It leverages the existing verification script to identify missing assets and then
 * uses the appropriate migration logic for each asset type.
 * 
 * Usage:
 *   npx tsx scripts/migrateRemainingAssets.ts [options]
 * 
 * Options:
 *   --dry-run             Simulate migration without uploading (default: false)
 *   --type=all|cover|chapter|audio|text Specify asset type to migrate (default: all)
 *   --book=slug           Migrate only assets for specific book
 *   --force               Re-upload even if verification passes (default: false)
 *   --retries=3           Number of retries for failed uploads (default: 3)
 *   --concurrency=5       Number of concurrent uploads (default: 5)
 */

import * as dotenv from 'dotenv';
// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import translations from '../translations';
import { blobService } from '../utils/services/BlobService';
import { blobPathService } from '../utils/services/BlobPathService';
import { assetExistsInBlobStorage } from '../utils/getBlobUrl';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Define asset types
type AssetType = 'cover' | 'chapter' | 'audio' | 'text' | 'all';

// Interface for command line options
interface MigrationOptions {
  dryRun?: boolean;
  type?: AssetType;
  bookSlug?: string;
  force?: boolean;
  retries?: number;
  concurrency?: number;
  logFile?: string;
}

// Interface for missing asset
interface MissingAsset {
  book: string;
  type: 'cover' | 'chapter' | 'audio' | 'text';
  path: string;
  blobPath: string;
}

// Interface for migration result
interface AssetMigrationResult {
  book: string;
  type: 'cover' | 'chapter' | 'audio' | 'text';
  path: string;
  blobPath: string;
  status: 'success' | 'skipped' | 'failed';
  error?: string;
  blobUrl?: string;
  size?: number;
}

// Interface for overall migration result
interface MigrationResult {
  timestamp: string;
  options: MigrationOptions;
  totalAssets: number;
  migratedAssets: number;
  skippedAssets: number;
  failedAssets: number;
  byType: {
    cover: { total: number; migrated: number; skipped: number; failed: number };
    chapter: { total: number; migrated: number; skipped: number; failed: number };
    audio: { total: number; migrated: number; skipped: number; failed: number };
    text: { total: number; migrated: number; skipped: number; failed: number };
  };
  results: AssetMigrationResult[];
}

/**
 * Identify all missing assets from Vercel Blob storage
 */
async function identifyMissingAssets(options: MigrationOptions): Promise<MissingAsset[]> {
  console.log('Identifying missing assets...');
  const missingAssets: MissingAsset[] = [];
  
  // Filter books based on provided slug
  const books = options.bookSlug
    ? translations.filter(book => book.slug === options.bookSlug)
    : translations;
  
  for (const book of books) {
    console.log(`Checking book: ${book.title} (${book.slug})`);
    
    // Check cover image if type is 'cover' or 'all'
    if (options.type === 'cover' || options.type === 'all') {
      try {
        const coverExists = options.force ? false : await assetExistsInBlobStorage(book.coverImage);
        if (!coverExists) {
          console.log(`Missing cover image: ${book.coverImage}`);
          missingAssets.push({
            book: book.slug,
            type: 'cover',
            path: book.coverImage,
            blobPath: blobPathService.convertLegacyPath(book.coverImage)
          });
        }
      } catch (error) {
        console.error(`Error checking cover image for ${book.slug}:`, error);
        // Add it to the missing list if there's an error
        missingAssets.push({
          book: book.slug,
          type: 'cover',
          path: book.coverImage,
          blobPath: blobPathService.convertLegacyPath(book.coverImage)
        });
      }
    }
    
    // Check chapters
    for (const chapter of book.chapters) {
      // Chapter text
      if (options.type === 'chapter' || options.type === 'text' || options.type === 'all') {
        try {
          const chapterExists = options.force ? false : await assetExistsInBlobStorage(chapter.text);
          if (!chapterExists) {
            console.log(`Missing chapter text: ${chapter.text}`);
            missingAssets.push({
              book: book.slug,
              type: 'text',
              path: chapter.text,
              blobPath: blobPathService.convertLegacyPath(chapter.text)
            });
          }
        } catch (error) {
          console.error(`Error checking chapter text for ${book.slug}:`, error);
          missingAssets.push({
            book: book.slug,
            type: 'text',
            path: chapter.text,
            blobPath: blobPathService.convertLegacyPath(chapter.text)
          });
        }
      }
      
      // Audio files
      if ((options.type === 'audio' || options.type === 'all') && chapter.audioSrc) {
        try {
          const audioExists = options.force ? false : await assetExistsInBlobStorage(chapter.audioSrc);
          if (!audioExists) {
            console.log(`Missing audio: ${chapter.audioSrc}`);
            
            // Handle audio URLs which might already be full blob URLs
            const isAlreadyFullUrl = chapter.audioSrc.startsWith('http');
            let blobPath;
            
            if (isAlreadyFullUrl) {
              const url = new URL(chapter.audioSrc);
              blobPath = url.pathname.replace(/^\//, '');
            } else {
              blobPath = blobPathService.convertLegacyPath(chapter.audioSrc);
            }
            
            missingAssets.push({
              book: book.slug,
              type: 'audio',
              path: chapter.audioSrc,
              blobPath
            });
          }
        } catch (error) {
          console.error(`Error checking audio for ${book.slug}:`, error);
          
          // Handle audio URLs which might already be full blob URLs
          const isAlreadyFullUrl = chapter.audioSrc.startsWith('http');
          let blobPath;
          
          if (isAlreadyFullUrl) {
            const url = new URL(chapter.audioSrc);
            blobPath = url.pathname.replace(/^\//, '');
          } else {
            blobPath = blobPathService.convertLegacyPath(chapter.audioSrc);
          }
          
          missingAssets.push({
            book: book.slug,
            type: 'audio',
            path: chapter.audioSrc,
            blobPath
          });
        }
      }
    }
  }
  
  return missingAssets;
}

/**
 * Migrate a single book cover image
 */
async function migrateBookCover(
  bookSlug: string,
  originalPath: string,
  blobPath: string,
  maxRetries: number = 3
): Promise<AssetMigrationResult> {
  // Prepare the result object
  const result: AssetMigrationResult = {
    book: bookSlug,
    type: 'cover',
    path: originalPath,
    blobPath,
    status: 'failed'
  };
  
  try {
    // Verify file exists
    const fullPath = path.join(projectRoot, 'public', originalPath);
    
    if (!existsSync(fullPath)) {
      result.error = `File not found: ${fullPath}`;
      return result;
    }
    
    // Read file
    const fileBuffer = await fs.readFile(fullPath);
    const file = new File([fileBuffer], path.basename(originalPath), {
      type: getContentType(originalPath),
    });
    
    // Get the directory path
    const pathname = path.dirname(blobPath);
    const filename = path.basename(blobPath);
    
    // Try upload with retries
    let lastError = '';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Upload to Blob storage
        const uploadResult = await blobService.uploadFile(file, {
          pathname,
          filename,
          access: 'public',
          cacheControl: 'max-age=31536000, immutable', // 1 year cache
        });
        
        // Verify upload
        const verified = await verifyUpload(uploadResult.url);
        
        if (!verified) {
          lastError = 'Verification failed after upload';
          continue; // Retry
        }
        
        // Success
        result.status = 'success';
        result.blobUrl = uploadResult.url;
        result.size = uploadResult.size;
        return result;
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
    result.error = `Failed after ${maxRetries} attempts. Last error: ${lastError}`;
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Migrate a text file
 */
async function migrateTextFile(
  bookSlug: string,
  originalPath: string,
  blobPath: string,
  maxRetries: number = 3
): Promise<AssetMigrationResult> {
  // Prepare the result object
  const result: AssetMigrationResult = {
    book: bookSlug,
    type: 'text',
    path: originalPath,
    blobPath,
    status: 'failed'
  };
  
  try {
    // Verify file exists
    const fullPath = path.join(projectRoot, 'public', originalPath);
    
    if (!existsSync(fullPath)) {
      result.error = `File not found: ${fullPath}`;
      return result;
    }
    
    // Read file content
    const content = await fs.readFile(fullPath, 'utf8');
    
    // Try upload with retries
    let lastError = '';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Upload to Blob storage
        const uploadResult = await blobService.uploadText(content, blobPath, {
          access: 'public',
          cacheControl: 'max-age=3600', // 1 hour cache for text files
          contentType: 'text/plain',
        });
        
        // Verify upload
        const verified = await verifyUpload(uploadResult.url);
        
        if (!verified) {
          lastError = 'Verification failed after upload';
          continue; // Retry
        }
        
        // Success
        result.status = 'success';
        result.blobUrl = uploadResult.url;
        result.size = uploadResult.size;
        return result;
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
    result.error = `Failed after ${maxRetries} attempts. Last error: ${lastError}`;
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Migrate an audio file from Digital Ocean Spaces
 */
async function migrateAudioFile(
  bookSlug: string,
  originalPath: string,
  blobPath: string,
  maxRetries: number = 3
): Promise<AssetMigrationResult> {
  // Prepare the result object
  const result: AssetMigrationResult = {
    book: bookSlug,
    type: 'audio',
    path: originalPath,
    blobPath,
    status: 'failed'
  };
  
  try {
    // For audio files, we need to handle both legacy paths and full URLs
    let sourceUrl: string;
    
    if (originalPath.startsWith('http')) {
      // If it's already a URL, use it directly
      sourceUrl = originalPath;
    } else {
      // If it's a legacy path, convert to URL
      // This assumes audio is hosted in Digital Ocean Spaces
      const cdnBaseUrl = process.env.DO_SPACES_CDN_ENDPOINT || 'https://brainrot-audio.nyc3.digitaloceanspaces.com';
      sourceUrl = `${cdnBaseUrl}${originalPath}`;
    }
    
    // Try to download the audio file
    let lastError = '';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Downloading audio from: ${sourceUrl}`);
        
        // Fetch the audio file
        const response = await fetch(sourceUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Get the audio content as array buffer
        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength < 1000) {
          console.warn(`Warning: Audio file is very small (${arrayBuffer.byteLength} bytes)`);
        }
        
        // Create a File object
        const file = new File([arrayBuffer], path.basename(originalPath), {
          type: 'audio/mpeg'
        });
        
        console.log(`Downloaded ${file.size} bytes`);
        
        // Upload to Vercel Blob
        console.log(`Uploading to Blob: ${blobPath}`);
        
        // Get the directory path
        const pathname = path.dirname(blobPath);
        const filename = path.basename(blobPath);
        
        // Upload to Blob storage
        const uploadResult = await blobService.uploadFile(file, {
          pathname,
          filename,
          access: 'public',
          cacheControl: 'max-age=31536000, immutable', // 1 year cache
          contentType: 'audio/mpeg'
        });
        
        // Verify upload
        const verified = await verifyUpload(uploadResult.url);
        
        if (!verified) {
          lastError = 'Verification failed after upload';
          continue; // Retry
        }
        
        // Success
        result.status = 'success';
        result.blobUrl = uploadResult.url;
        result.size = uploadResult.size;
        return result;
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
    result.error = `Failed after ${maxRetries} attempts. Last error: ${lastError}`;
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Migrate a chapter image file
 */
async function migrateChapterImage(
  bookSlug: string,
  originalPath: string,
  blobPath: string,
  maxRetries: number = 3
): Promise<AssetMigrationResult> {
  // This uses the same logic as book covers since they're both images
  return migrateBookCover(bookSlug, originalPath, blobPath, maxRetries);
}

/**
 * Migrate a single asset based on its type
 */
async function migrateAsset(
  asset: MissingAsset,
  options: MigrationOptions
): Promise<AssetMigrationResult> {
  console.log(`Migrating ${asset.type} asset: ${asset.path} -> ${asset.blobPath}`);
  
  // Skip in dry run mode
  if (options.dryRun) {
    console.log(`DRY RUN: Would migrate ${asset.path} to ${asset.blobPath}`);
    return {
      book: asset.book,
      type: asset.type,
      path: asset.path,
      blobPath: asset.blobPath,
      status: 'skipped',
      error: 'Dry run mode'
    };
  }
  
  // Select the appropriate migration function based on asset type
  switch (asset.type) {
    case 'cover':
      return migrateBookCover(asset.book, asset.path, asset.blobPath, options.retries);
    case 'chapter':
      return migrateChapterImage(asset.book, asset.path, asset.blobPath, options.retries);
    case 'text':
      return migrateTextFile(asset.book, asset.path, asset.blobPath, options.retries);
    case 'audio':
      return migrateAudioFile(asset.book, asset.path, asset.blobPath, options.retries);
    default:
      return {
        book: asset.book,
        type: asset.type,
        path: asset.path,
        blobPath: asset.blobPath,
        status: 'failed',
        error: `Unknown asset type: ${asset.type}`
      };
  }
}

/**
 * Run the migration for all missing assets
 */
async function migrateRemainingAssets(options: MigrationOptions = {}): Promise<MigrationResult> {
  const startTime = new Date();
  
  // Initialize result object
  const result: MigrationResult = {
    timestamp: startTime.toISOString(),
    options,
    totalAssets: 0,
    migratedAssets: 0,
    skippedAssets: 0,
    failedAssets: 0,
    byType: {
      cover: { total: 0, migrated: 0, skipped: 0, failed: 0 },
      chapter: { total: 0, migrated: 0, skipped: 0, failed: 0 },
      audio: { total: 0, migrated: 0, skipped: 0, failed: 0 },
      text: { total: 0, migrated: 0, skipped: 0, failed: 0 }
    },
    results: []
  };
  
  // Identify missing assets
  console.log('Starting missing assets identification...');
  const missingAssets = await identifyMissingAssets(options);
  
  result.totalAssets = missingAssets.length;
  console.log(`Found ${result.totalAssets} missing assets`);
  
  // Group assets by type for better reporting
  const assetsByType = {
    cover: missingAssets.filter(a => a.type === 'cover').length,
    chapter: missingAssets.filter(a => a.type === 'chapter').length,
    audio: missingAssets.filter(a => a.type === 'audio').length,
    text: missingAssets.filter(a => a.type === 'text').length
  };
  
  console.log(`Cover images: ${assetsByType.cover}`);
  console.log(`Chapter images: ${assetsByType.chapter}`);
  console.log(`Audio files: ${assetsByType.audio}`);
  console.log(`Text files: ${assetsByType.text}`);
  
  // Update result totals
  result.byType.cover.total = assetsByType.cover;
  result.byType.chapter.total = assetsByType.chapter;
  result.byType.audio.total = assetsByType.audio;
  result.byType.text.total = assetsByType.text;
  
  // Skip if no assets to migrate
  if (missingAssets.length === 0) {
    console.log('No missing assets to migrate!');
    return result;
  }
  
  // Confirm if not in dry run mode
  if (!options.dryRun) {
    console.log('\nReady to migrate assets. THIS WILL MODIFY BLOB STORAGE.');
    console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Migrate assets with concurrency control
  const concurrency = options.concurrency || 5;
  const chunks = chunkArray(missingAssets, concurrency);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} assets)`);
    
    const chunkResults = await Promise.all(
      chunk.map(asset => migrateAsset(asset, options))
    );
    
    // Process results
    for (const migrationResult of chunkResults) {
      result.results.push(migrationResult);
      
      // Update statistics
      if (migrationResult.status === 'success') {
        result.migratedAssets++;
        result.byType[migrationResult.type].migrated++;
      } else if (migrationResult.status === 'skipped') {
        result.skippedAssets++;
        result.byType[migrationResult.type].skipped++;
      } else {
        result.failedAssets++;
        result.byType[migrationResult.type].failed++;
      }
    }
  }
  
  // Generate and save report
  const reportFile = options.logFile || `remaining-assets-migration-${Date.now()}.json`;
  const reportPath = path.isAbsolute(reportFile)
    ? reportFile
    : path.join(projectRoot, reportFile);
  
  await fs.writeFile(reportPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Migration report saved to: ${reportPath}`);
  
  // Generate markdown report
  const markdownReport = generateMarkdownReport(result);
  const markdownPath = reportPath.replace(/\.json$/, '.md');
  
  await fs.writeFile(markdownPath, markdownReport, 'utf8');
  console.log(`Markdown report saved to: ${markdownPath}`);
  
  return result;
}

/**
 * Verify a file was uploaded successfully
 */
async function verifyUpload(blobUrl: string): Promise<boolean> {
  try {
    // Get file info to verify it exists
    const fileInfo = await blobService.getFileInfo(blobUrl);
    return fileInfo.size > 0;
  } catch (error) {
    console.warn(`Verification failed for ${blobUrl}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Split an array into chunks for concurrency control
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath: string): string {
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
    case '.mp3':
      return 'audio/mpeg';
    case '.txt':
      return 'text/plain';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Generate a markdown report of the migration
 */
function generateMarkdownReport(result: MigrationResult): string {
  const lines = [
    '# Remaining Assets Migration Report',
    '',
    `Generated: ${result.timestamp}`,
    '',
    '## Summary',
    '',
    `- **Total Assets**: ${result.totalAssets}`,
    `- **Successfully Migrated**: ${result.migratedAssets}`,
    `- **Skipped**: ${result.skippedAssets}`,
    `- **Failed**: ${result.failedAssets}`,
    '',
    '## Results by Asset Type',
    ''
  ];
  
  // Cover images
  lines.push('### Cover Images');
  lines.push('');
  lines.push(`- **Total**: ${result.byType.cover.total}`);
  lines.push(`- **Migrated**: ${result.byType.cover.migrated}`);
  lines.push(`- **Skipped**: ${result.byType.cover.skipped}`);
  lines.push(`- **Failed**: ${result.byType.cover.failed}`);
  lines.push('');
  
  // Chapter images
  lines.push('### Chapter Images');
  lines.push('');
  lines.push(`- **Total**: ${result.byType.chapter.total}`);
  lines.push(`- **Migrated**: ${result.byType.chapter.migrated}`);
  lines.push(`- **Skipped**: ${result.byType.chapter.skipped}`);
  lines.push(`- **Failed**: ${result.byType.chapter.failed}`);
  lines.push('');
  
  // Text files
  lines.push('### Text Files');
  lines.push('');
  lines.push(`- **Total**: ${result.byType.text.total}`);
  lines.push(`- **Migrated**: ${result.byType.text.migrated}`);
  lines.push(`- **Skipped**: ${result.byType.text.skipped}`);
  lines.push(`- **Failed**: ${result.byType.text.failed}`);
  lines.push('');
  
  // Audio files
  lines.push('### Audio Files');
  lines.push('');
  lines.push(`- **Total**: ${result.byType.audio.total}`);
  lines.push(`- **Migrated**: ${result.byType.audio.migrated}`);
  lines.push(`- **Skipped**: ${result.byType.audio.skipped}`);
  lines.push(`- **Failed**: ${result.byType.audio.failed}`);
  lines.push('');
  
  // Failed assets
  if (result.failedAssets > 0) {
    lines.push('## Failed Assets');
    lines.push('');
    
    const failedResults = result.results.filter(r => r.status === 'failed');
    for (const failed of failedResults) {
      lines.push(`### ${failed.book} (${failed.type})`);
      lines.push('');
      lines.push(`- **Path**: ${failed.path}`);
      lines.push(`- **Blob Path**: ${failed.blobPath}`);
      lines.push(`- **Error**: ${failed.error}`);
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const options: MigrationOptions = {
    dryRun: false,
    type: 'all',
    force: false,
    retries: 3,
    concurrency: 5,
    logFile: `remaining-assets-migration-${Date.now()}.json`
  };
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--type=')) {
      const typeValue = arg.substring('--type='.length) as AssetType;
      if (['all', 'cover', 'chapter', 'audio', 'text'].includes(typeValue)) {
        options.type = typeValue;
      } else {
        console.warn(`Invalid asset type: ${typeValue}. Using 'all' instead.`);
      }
    } else if (arg.startsWith('--book=')) {
      options.bookSlug = arg.substring('--book='.length);
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
 * Print a summary of the migration results
 */
function printResults(result: MigrationResult): void {
  console.log('\n===== MIGRATION RESULTS =====');
  console.log(`Total assets: ${result.totalAssets}`);
  console.log(`Successfully migrated: ${result.migratedAssets}`);
  console.log(`Skipped: ${result.skippedAssets}`);
  console.log(`Failed: ${result.failedAssets}`);
  
  console.log('\nResults by type:');
  console.log(`Cover images: ${result.byType.cover.migrated}/${result.byType.cover.total} migrated`);
  console.log(`Chapter images: ${result.byType.chapter.migrated}/${result.byType.chapter.total} migrated`);
  console.log(`Text files: ${result.byType.text.migrated}/${result.byType.text.total} migrated`);
  console.log(`Audio files: ${result.byType.audio.migrated}/${result.byType.audio.total} migrated`);
  
  if (result.failedAssets > 0) {
    console.log('\nFailed migrations:');
    result.results
      .filter(r => r.status === 'failed')
      .forEach(r => {
        console.log(`- ${r.book} (${r.type}): ${r.error}`);
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
    
    console.log('Remaining Assets Migration');
    console.log('=========================');
    console.log(`Options: ${JSON.stringify(options, null, 2)}`);
    
    // Run migration
    const result = await migrateRemainingAssets(options);
    
    // Print results
    printResults(result);
    
    // Exit with appropriate code
    process.exit(result.failedAssets > 0 ? 1 : 0);
  } catch (error) {
    console.error('Migration failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the script
main();