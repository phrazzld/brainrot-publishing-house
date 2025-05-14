#!/usr/bin/env node
/* eslint-disable max-lines */
/**
 * Asset Inventory Creation Script
 *
 * This script creates a comprehensive inventory of all assets from Vercel Blob,
 * mapping them to their expected locations in translations data.
 *
 * It identifies:
 * - Missing assets
 * - Inconsistent assets
 * - Duplicate files
 * - Path pattern inconsistencies
 *
 * Usage:
 *   npx tsx scripts/create-asset-inventory.ts [options]
 *
 * Options:
 *   --output=path        Output file path (default: asset-inventory.json)
 *   --verbose            Enable verbose logging
 *   --books=slug1,slug2  Process only specific books
 *   --types=audio,text   Process only specific asset types
 *   --check-content      Verify actual content of assets (slower)
 *   --verify-all         Verify all assets exist (slower)
 */
import * as dotenv from 'dotenv';
import { head, list } from '@vercel/blob';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';

import translations from '../translations';
import { Translation as ImportedTranslation } from '../translations/types';
import logger from '../utils/logger';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Set constants
const DEFAULT_OUTPUT = 'asset-inventory.json';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VERCEL_BLOB_BASE_URL = process.env.NEXT_PUBLIC_BLOB_BASE_URL || '';

// Define types
type AssetType = 'audio' | 'text' | 'image';

interface InventoryOptions {
  outputPath: string;
  verbose: boolean;
  bookSlugs: string[];
  assetTypes: AssetType[];
  checkContent: boolean;
  verifyAll: boolean;
}

interface AssetStorageInfo {
  exists: boolean;
  path?: string;
  size?: number;
  lastModified?: Date;
  contentType?: string;
  error?: string;
}

interface AssetTranslationInfo {
  referenced: boolean;
  path?: string;
  usageInfo?: string;
}

interface Asset {
  type: AssetType;
  bookSlug: string;
  assetName: string;
  vercelBlob: AssetStorageInfo;
  translations: AssetTranslationInfo;
  issues: string[];
}

interface BookIssueCount {
  missingAssets: number;
  inconsistentPaths: number;
  duplicateAssets: number;
  other: number;
}

interface AssetCount {
  audio: number;
  text: number;
  image: number;
  total: number;
}

interface StorageStats {
  totalSize: number;
  totalCount: number;
}

interface BookInventory {
  slug: string;
  title: string;
  assetCount: AssetCount;
  assets: Asset[];
  issues: BookIssueCount;
}

interface InventoryReport {
  timestamp: string;
  options: InventoryOptions;
  summary: {
    totalBooks: number;
    totalAssets: number;
    assetsByType: Record<AssetType, number>;
    issueCount: BookIssueCount & {
      total: number;
    };
    storageStats: {
      vercelBlob: StorageStats;
    };
  };
  pathPatterns: {
    vercelBlob: string[];
  };
  books: BookInventory[];
}

// Define local Translation interface that extends the imported one
interface Translation extends ImportedTranslation {
  [key: string]: unknown;
}

// Helper interfaces to reduce function parameter counts
interface ProcessObjectsContext {
  book: Translation;
  bookInventory: BookInventory;
  referencedAssets: Map<string, { type: AssetType; path: string; info: string }>;
  options: InventoryOptions;
  report: InventoryReport;
}

interface StorageObject {
  key?: string;
  path?: string;
  size?: number;
  lastModified?: Date;
  contentType?: string;
  [key: string]: unknown;
}

interface ProcessBookContext {
  book: Translation;
  blobObjectsByBook: Map<string, StorageObject[]>;
  options: InventoryOptions;
  report: InventoryReport;
}

// No S3 client needed as we're only using Vercel Blob

/**
 * Parse command line arguments
 */
function parseArguments(): InventoryOptions {
  const args = process.argv.slice(2);
  const options: InventoryOptions = {
    outputPath: DEFAULT_OUTPUT,
    verbose: false,
    bookSlugs: [],
    assetTypes: ['audio', 'text', 'image'],
    checkContent: false,
    verifyAll: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--output=')) {
      options.outputPath = arg.substring('--output='.length);
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg.startsWith('--books=')) {
      options.bookSlugs = arg.substring('--books='.length).split(',');
    } else if (arg.startsWith('--types=')) {
      options.assetTypes = arg.substring('--types='.length).split(',') as AssetType[];
    } else if (arg === '--check-content') {
      options.checkContent = true;
    } else if (arg === '--verify-all') {
      options.verifyAll = true;
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Print help information
 */
function printHelp(): void {
  const helpText = `
Asset Inventory Creation Script

This script creates a comprehensive inventory of all assets from Vercel Blob,
mapping them to their expected locations in translations data.

Usage:
  npx tsx scripts/create-asset-inventory.ts [options]

Options:
  --output=path        Output file path (default: asset-inventory.json)
  --verbose            Enable verbose logging
  --books=slug1,slug2  Process only specific books
  --types=audio,text   Process only specific asset types
  --check-content      Verify actual content of assets (slower)
  --verify-all         Verify all assets exist (slower)
  --help               Show this help message
`;

  // Use console.error for help text as this is intentional CLI output
  console.error(helpText);
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
 * No S3 client initialization needed
 */

/**
 * List objects function removed as we only use Vercel Blob now
 */

/**
 * Digital Ocean metadata function removed as we only use Vercel Blob now
 */

/**
 * List objects in Vercel Blob
 */
async function listVercelBlobObjects(prefix?: string): Promise<Record<string, unknown>[]> {
  const objects: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  do {
    try {
      const result = await list({ prefix, cursor });
      // @ts-expect-error: Vercel Blob types are not fully compatible with TypeScript's strictness
      objects.push(...result.blobs);
      cursor = result.cursor;
    } catch (error) {
      console.error('Error listing objects from Vercel Blob:', error);
      throw error;
    }
  } while (cursor);

  return objects;
}

/**
 * Get an object's metadata from Vercel Blob
 */
async function getVercelBlobObjectMetadata(url: string): Promise<{
  size: number;
  lastModified: Date;
  contentType: string;
}> {
  try {
    const metadata = await head(url);
    return {
      size: metadata.size || 0,
      lastModified: new Date(metadata.uploadedAt || Date.now()),
      contentType: metadata.contentType || 'application/octet-stream',
    };
  } catch (error) {
    throw new Error(`Failed to get metadata for ${url}: ${error}`);
  }
}

/**
 * Check if path matches audio patterns
 */
function isAudioAsset(path: string): boolean {
  return path.includes('/audio/') || path.endsWith('.mp3');
}

/**
 * Check if path matches text patterns
 */
function isTextAsset(path: string): boolean {
  const textExtensions = ['.txt', '.html', '.md'];
  return path.includes('/text/') || textExtensions.some((ext) => path.endsWith(ext));
}

/**
 * Check if path matches image patterns
 */
function isImageAsset(path: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];
  return path.includes('/images/') || imageExtensions.some((ext) => path.endsWith(ext));
}

/**
 * Extract asset type from path
 */
function getAssetTypeFromPath(path: string): AssetType {
  if (isAudioAsset(path)) {
    return 'audio';
  } else if (isTextAsset(path)) {
    return 'text';
  } else if (isImageAsset(path)) {
    return 'image';
  }
  return 'text'; // Default
}

/**
 * Extract book slug from path
 */
function getBookSlugFromPath(path: string): string | null {
  // Try to extract from Vercel Blob path (books/slug/...)
  const blobMatch = path.match(/^books\/([^/]+)\//);
  if (blobMatch) {
    return blobMatch[1];
  }

  // Try to extract from Digital Ocean path (slug/audio/...)
  const doMatch = path.match(/^([^/]+)\/(?:audio|text|images)\//);
  if (doMatch) {
    return doMatch[1];
  }

  return null;
}

/**
 * Extract asset name from path
 */
function getAssetNameFromPath(path: string): string {
  return path.split('/').pop() || '';
}

/**
 * Initialize inventory report structure
 */
function initializeInventoryReport(options: InventoryOptions, bookCount: number): InventoryReport {
  return {
    timestamp: new Date().toISOString(),
    options,
    summary: {
      totalBooks: bookCount,
      totalAssets: 0,
      assetsByType: {
        audio: 0,
        text: 0,
        image: 0,
      },
      issueCount: {
        missingAssets: 0,
        inconsistentPaths: 0,
        duplicateAssets: 0,
        other: 0,
        total: 0,
      },
      storageStats: {
        vercelBlob: {
          totalSize: 0,
          totalCount: 0,
        },
      },
    },
    pathPatterns: {
      vercelBlob: [],
    },
    books: [],
  };
}

/**
 * Group objects by book slug
 */
function groupObjectsByBook(objects: Record<string, unknown>[]): {
  objectsByBook: Map<string, Record<string, unknown>[]>;
  pathPatterns: Set<string>;
} {
  const objectsByBook = new Map<string, Record<string, unknown>[]>();
  const pathPatterns = new Set<string>();

  for (const obj of objects) {
    const key = obj.pathname as string;
    const bookSlug = getBookSlugFromPath(key);
    if (bookSlug) {
      if (!objectsByBook.has(bookSlug)) {
        objectsByBook.set(bookSlug, []);
      }
      objectsByBook.get(bookSlug)?.push(obj);

      // Extract path pattern
      const pattern = key.replace(bookSlug, '{slug}').replace(/\/[^/]+\.\w+$/, '/{file}');
      pathPatterns.add(pattern);
    }
  }

  return { objectsByBook, pathPatterns };
}

/**
 * Collect audio assets from a book's chapters
 */
function collectChapterAudioAssets(
  chapters: Array<{ audioSrc?: string; title: string }>,
  referencedAssets: Map<string, { type: AssetType; path: string; info: string }>
): void {
  for (const chapter of chapters) {
    if (chapter.audioSrc) {
      const assetName = getAssetNameFromPath(chapter.audioSrc);
      referencedAssets.set(`audio:${assetName}`, {
        type: 'audio',
        path: chapter.audioSrc,
        info: `Chapter: ${chapter.title}`,
      });
    }
  }
}

/**
 * Collect full audiobook asset
 */
function collectFullAudioAsset(
  fullAudioSrc: string,
  referencedAssets: Map<string, { type: AssetType; path: string; info: string }>
): void {
  const assetName = getAssetNameFromPath(fullAudioSrc);
  referencedAssets.set(`audio:${assetName}`, {
    type: 'audio',
    path: fullAudioSrc,
    info: 'Full audiobook',
  });
}

/**
 * Collect cover image asset
 */
function collectCoverImageAsset(
  coverImage: string,
  referencedAssets: Map<string, { type: AssetType; path: string; info: string }>
): void {
  const assetName = getAssetNameFromPath(coverImage);
  referencedAssets.set(`image:${assetName}`, {
    type: 'image',
    path: coverImage,
    info: 'Cover image',
  });
}

/**
 * Collect full text asset
 */
function collectFullTextAsset(
  fullText: string,
  referencedAssets: Map<string, { type: AssetType; path: string; info: string }>
): void {
  referencedAssets.set(`text:fulltext.txt`, {
    type: 'text',
    path: fullText,
    info: 'Full text',
  });
}

/**
 * Collect chapter image assets
 */
function collectChapterImageAssets(
  chapters: Array<{ image?: string; title: string }>,
  referencedAssets: Map<string, { type: AssetType; path: string; info: string }>
): void {
  for (const chapter of chapters) {
    if (chapter.image) {
      const assetName = getAssetNameFromPath(chapter.image);
      referencedAssets.set(`image:${assetName}`, {
        type: 'image',
        path: chapter.image,
        info: `Chapter image: ${chapter.title}`,
      });
    }
  }
}

/**
 * Collect all audio assets from a book
 */
function collectAudioAssets(
  typedBook: {
    chapters?: Array<{ audioSrc?: string; title: string; image?: string }>;
    fullAudioSrc?: string;
  },
  referencedAssets: Map<string, { type: AssetType; path: string; info: string }>
): void {
  // Chapters audio
  if (typedBook.chapters) {
    collectChapterAudioAssets(typedBook.chapters, referencedAssets);
  }

  // Full audiobook
  if (typedBook.fullAudioSrc) {
    collectFullAudioAsset(typedBook.fullAudioSrc, referencedAssets);
  }
}

/**
 * Collect all image assets from a book
 */
function collectImageAssets(
  typedBook: {
    chapters?: Array<{ image?: string; title: string }>;
    coverImage?: string;
  },
  referencedAssets: Map<string, { type: AssetType; path: string; info: string }>
): void {
  // Cover image
  if (typedBook.coverImage) {
    collectCoverImageAsset(typedBook.coverImage, referencedAssets);
  }

  // Chapter images
  if (typedBook.chapters) {
    collectChapterImageAssets(typedBook.chapters, referencedAssets);
  }
}

/**
 * Collect referenced assets from a book's translations data
 */
function collectReferencedAssets(
  book: Record<string, unknown>,
  options: InventoryOptions
): Map<string, { type: AssetType; path: string; info: string }> {
  const referencedAssets = new Map<string, { type: AssetType; path: string; info: string }>();

  // Extract typed book properties
  const typedBook = book as {
    chapters?: Array<{ audioSrc?: string; title: string; image?: string }>;
    fullAudioSrc?: string;
    coverImage?: string;
    fullText?: string;
    slug: string;
  };

  // Audio assets
  if (options.assetTypes.includes('audio')) {
    collectAudioAssets(typedBook, referencedAssets);
  }

  // Image assets
  if (options.assetTypes.includes('image')) {
    collectImageAssets(typedBook, referencedAssets);
  }

  // Text content
  if (typedBook.fullText && options.assetTypes.includes('text')) {
    collectFullTextAsset(typedBook.fullText, referencedAssets);
  }

  return referencedAssets;
}

/**
 * Digital Ocean object processing removed as we only use Vercel Blob now
 */

/**
 * Digital Ocean objects processing removed as we only use Vercel Blob now
 */

/**
 * Process a single Vercel Blob object
 */
async function processVercelBlobObject(
  obj: Record<string, unknown>,
  context: ProcessObjectsContext,
  getBlobMetadata: boolean
): Promise<void> {
  const { book, bookInventory, referencedAssets, options, report } = context;

  const assetName = getAssetNameFromPath(obj.pathname as string);
  const assetType = getAssetTypeFromPath(obj.pathname as string);

  // Skip asset types not in options
  if (!options.assetTypes.includes(assetType)) return;

  const key = `${assetType}:${assetName}`;
  let asset = bookInventory.assets.find((a) => a.type === assetType && a.assetName === assetName);

  if (!asset) {
    asset = {
      type: assetType,
      bookSlug: book.slug as string,
      assetName,
      vercelBlob: {
        exists: true,
        path: obj.pathname as string,
        size: obj.size as number,
        lastModified: new Date(obj.uploadedAt as string),
      },
      translations: {
        referenced: referencedAssets.has(key),
        path: referencedAssets.get(key)?.path,
        usageInfo: referencedAssets.get(key)?.info,
      },
      issues: [],
    };
    bookInventory.assets.push(asset);
    bookInventory.assetCount[assetType]++;
    bookInventory.assetCount.total++;
  } else {
    asset.vercelBlob = {
      exists: true,
      path: obj.pathname as string,
      size: obj.size as number,
      lastModified: new Date(obj.uploadedAt as string),
    };
  }

  // Get full metadata if needed
  if (getBlobMetadata) {
    try {
      const metadata = await getVercelBlobObjectMetadata(obj.url as string);
      asset.vercelBlob.size = metadata.size;
      asset.vercelBlob.lastModified = metadata.lastModified;
      asset.vercelBlob.contentType = metadata.contentType;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      asset.vercelBlob.error = errorMessage;
      asset.issues.push(`Vercel Blob error: ${errorMessage}`);
      bookInventory.issues.other++;
    }
  }

  // Update storage stats
  report.summary.storageStats.vercelBlob.totalCount++;
  report.summary.storageStats.vercelBlob.totalSize += (obj.size as number) || 0;
}

/**
 * Process Vercel Blob objects for a book
 */
async function processVercelBlobObjects(
  context: ProcessObjectsContext,
  blobBookObjects: Record<string, unknown>[]
): Promise<void> {
  const { options } = context;
  const getBlobMetadata = options.verifyAll || options.checkContent;

  // Process each object in parallel
  const processPromises = blobBookObjects.map((obj) =>
    processVercelBlobObject(obj, context, getBlobMetadata)
  );

  await Promise.all(processPromises);
}

/**
 * Process missing assets referenced in translations
 */
function processMissingReferencedAssets(
  book: Record<string, unknown>,
  bookInventory: BookInventory,
  referencedAssets: Map<string, { type: AssetType; path: string; info: string }>
): void {
  for (const [_key, assetRef] of referencedAssets.entries()) {
    const assetName = getAssetNameFromPath(assetRef.path);
    const assetType = assetRef.type;

    // Check if asset already exists in our inventory
    const asset = bookInventory.assets.find(
      (a) => a.type === assetType && a.assetName === assetName
    );

    if (!asset) {
      // Asset referenced but not found in any storage
      const newAsset = {
        type: assetType,
        bookSlug: book.slug as string,
        assetName,
        vercelBlob: {
          exists: false,
        },
        translations: {
          referenced: true,
          path: assetRef.path,
          usageInfo: assetRef.info,
        },
        issues: ['Referenced in translations but not found in storage'],
      };
      bookInventory.assets.push(newAsset);
      bookInventory.assetCount[assetType]++;
      bookInventory.assetCount.total++;
      bookInventory.issues.missingAssets++;
    }
  }
}

/**
 * Identify issues for assets in a book
 */
function identifyAssetIssues(bookInventory: BookInventory): void {
  // Identify issues for each asset
  for (const asset of bookInventory.assets) {
    identifySingleAssetIssues(asset, bookInventory);
  }

  // Check for duplicate assets (same type/name but different paths)
  identifyDuplicateAssets(bookInventory);
}

/**
 * Check if asset is missing from all storage systems
 */
function checkMissingAsset(asset: Asset, bookInventory: BookInventory): void {
  if (!asset.vercelBlob.exists && asset.translations.referenced) {
    asset.issues.push('Asset is referenced but missing from storage');
    bookInventory.issues.missingAssets++;
  }
}

/**
 * Check for inconsistent paths between storage systems
 */
function checkInconsistentPaths(_asset: Asset, _bookInventory: BookInventory): void {
  // No inconsistent paths check needed as we only use Vercel Blob now
  return;
}

/**
 * Check for size mismatches between storage systems
 */
function checkSizeMismatch(_asset: Asset, _bookInventory: BookInventory): void {
  // No size mismatch check needed as we only use Vercel Blob now
  return;
}

/**
 * Check if asset is unreferenced in translations
 */
function checkUnreferencedAsset(asset: Asset): void {
  if (!asset.translations.referenced) {
    asset.issues.push('Asset exists in storage but is not referenced in translations');
  }
}

/**
 * Identify issues for a single asset
 */
function identifySingleAssetIssues(asset: Asset, bookInventory: BookInventory): void {
  // Run a series of checks
  checkMissingAsset(asset, bookInventory);
  checkInconsistentPaths(asset, bookInventory);
  checkSizeMismatch(asset, bookInventory);
  checkUnreferencedAsset(asset);
}

/**
 * Identify duplicate assets in a book
 */
function identifyDuplicateAssets(bookInventory: BookInventory): void {
  const assetCounts = new Map<string, number>();
  for (const asset of bookInventory.assets) {
    const key = `${asset.type}:${asset.assetName}`;
    const count = assetCounts.get(key) || 0;
    assetCounts.set(key, count + 1);
  }

  for (const [key, count] of assetCounts.entries()) {
    if (count > 1) {
      const [type, name] = key.split(':');
      const assets = bookInventory.assets.filter((a) => a.type === type && a.assetName === name);
      for (const asset of assets) {
        asset.issues.push(`Duplicate asset found (${count} instances)`);
        bookInventory.issues.duplicateAssets++;
      }
    }
  }
}

/**
 * Process a single book and add it to the inventory
 */
async function processBook(context: ProcessBookContext): Promise<BookInventory> {
  const { book, blobObjectsByBook, options, report } = context;

  if (options.verbose) {
    logger.info({ msg: `Processing book: ${book.slug} (${book.title})` });
  }

  const bookInventory: BookInventory = {
    slug: book.slug,
    title: book.title,
    assetCount: {
      audio: 0,
      text: 0,
      image: 0,
      total: 0,
    },
    assets: [],
    issues: {
      missingAssets: 0,
      inconsistentPaths: 0,
      duplicateAssets: 0,
      other: 0,
    },
  };

  // Get book objects
  const blobBookObjects: StorageObject[] = blobObjectsByBook.get(book.slug) || [];

  if (options.verbose) {
    logger.info({
      msg: `Found ${blobBookObjects.length} Vercel Blob objects`,
      book: book.slug,
    });
  }

  // Collect assets from translations
  const referencedAssets = collectReferencedAssets(book, options);

  // Create processing context for this book
  const processingContext: ProcessObjectsContext = {
    book,
    bookInventory,
    referencedAssets,
    options,
    report,
  };

  // Process Vercel Blob objects
  await processVercelBlobObjects(processingContext, blobBookObjects);

  // Add assets referenced in translations but not found in storage
  processMissingReferencedAssets(book, bookInventory, referencedAssets);

  // Identify issues for assets
  identifyAssetIssues(bookInventory);

  // Update summary counts
  updateReportSummary(report, bookInventory);

  return bookInventory;
}

/**
 * Update report summary with book inventory data
 */
function updateReportSummary(report: InventoryReport, bookInventory: BookInventory): void {
  report.summary.assetsByType.audio += bookInventory.assetCount.audio;
  report.summary.assetsByType.text += bookInventory.assetCount.text;
  report.summary.assetsByType.image += bookInventory.assetCount.image;
  report.summary.totalAssets += bookInventory.assetCount.total;
  report.summary.issueCount.missingAssets += bookInventory.issues.missingAssets;
  report.summary.issueCount.inconsistentPaths += bookInventory.issues.inconsistentPaths;
  report.summary.issueCount.duplicateAssets += bookInventory.issues.duplicateAssets;
  report.summary.issueCount.other += bookInventory.issues.other;
}

/**
 * Create the asset inventory report
 */
async function createAssetInventory(options: InventoryOptions): Promise<InventoryReport> {
  logger.info({ msg: 'Creating comprehensive asset inventory...' });
  const startTime = Date.now();

  // Get all books to process
  const booksToProcess =
    options.bookSlugs.length > 0
      ? (translations.filter((book) => options.bookSlugs.includes(book.slug)) as Translation[])
      : (translations as Translation[]);

  logger.info({ msg: `Processing ${booksToProcess.length} books for asset inventory` });

  // Initialize the report
  const report = initializeInventoryReport(options, booksToProcess.length);

  // Fetch all objects from Vercel Blob storage
  logger.info({ msg: 'Fetching objects from Vercel Blob...' });
  const blobObjects = await listVercelBlobObjects();
  logger.info({ msg: `Found ${blobObjects.length} objects in Vercel Blob` });

  // Group objects by book and extract path patterns
  const { objectsByBook: blobObjectsByBook, pathPatterns: pathPatternsBlob } =
    groupObjectsByBook(blobObjects);

  // Add path patterns to report
  report.pathPatterns.vercelBlob = Array.from(pathPatternsBlob);

  // Process each book
  // We process books serially to avoid overwhelming the system
  for (const book of booksToProcess) {
    const context: ProcessBookContext = {
      book,
      blobObjectsByBook: blobObjectsByBook as Map<string, StorageObject[]>,
      options,
      report,
    };

    const bookInventory = await processBook(context);
    report.books.push(bookInventory);
  }

  // Calculate total issues
  report.summary.issueCount.total =
    report.summary.issueCount.missingAssets +
    report.summary.issueCount.inconsistentPaths +
    report.summary.issueCount.duplicateAssets +
    report.summary.issueCount.other;

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  logger.info({ msg: `Inventory creation completed in ${duration.toFixed(2)} seconds` });

  return report;
}

/**
 * Generate a detailed markdown report with recommendations
 */
async function generateMarkdownReport(report: InventoryReport, outputPath: string): Promise<void> {
  const generateSummarySection = (report: InventoryReport): string[] => {
    return [
      '# Asset Inventory Report',
      '',
      `Generated: ${report.timestamp}`,
      '',
      '## Summary',
      '',
      `- **Total Books**: ${report.summary.totalBooks}`,
      `- **Total Assets**: ${report.summary.totalAssets}`,
      `  - Audio: ${report.summary.assetsByType.audio}`,
      `  - Text: ${report.summary.assetsByType.text}`,
      `  - Images: ${report.summary.assetsByType.image}`,
      '',
    ];
  };

  const generateStorageSection = (report: InventoryReport): string[] => {
    return [
      '## Storage Statistics',
      '',
      '### Vercel Blob',
      '',
      `- **Total Objects**: ${report.summary.storageStats.vercelBlob.totalCount}`,
      `- **Total Size**: ${formatSize(report.summary.storageStats.vercelBlob.totalSize)}`,
      '',
    ];
  };

  const generateIssuesSection = (report: InventoryReport): string[] => {
    return [
      '## Issues',
      '',
      `- **Total Issues**: ${report.summary.issueCount.total}`,
      `  - Missing Assets: ${report.summary.issueCount.missingAssets}`,
      `  - Inconsistent Paths: ${report.summary.issueCount.inconsistentPaths}`,
      `  - Duplicate Assets: ${report.summary.issueCount.duplicateAssets}`,
      `  - Other Issues: ${report.summary.issueCount.other}`,
      '',
    ];
  };

  const generatePathPatternsSection = (report: InventoryReport): string[] => {
    const lines = ['## Path Patterns', '', '### Vercel Blob', ''];

    // Add Blob path patterns
    for (const pattern of report.pathPatterns.vercelBlob) {
      lines.push(`- \`${pattern}\``);
    }

    lines.push('');
    return lines;
  };

  /**
   * Generate detailed issue list for assets with issues
   */
  function generateDetailedIssues(assetsWithIssues: Asset[]): string[] {
    const lines: string[] = ['##### Detailed Issues', ''];

    for (const asset of assetsWithIssues) {
      lines.push(`- **${asset.type}/${asset.assetName}**:`);

      // Add all issues for this asset
      asset.issues.forEach((issue) => {
        lines.push(`  - ${issue}`);
      });

      lines.push('');
    }

    return lines;
  }

  /**
   * Generate issue summary for a book
   */
  function generateBookIssuesSummary(book: BookInventory): string[] {
    const lines: string[] = ['#### Issues', ''];

    lines.push(`- Missing Assets: ${book.issues.missingAssets}`);
    lines.push(`- Inconsistent Paths: ${book.issues.inconsistentPaths}`);
    lines.push(`- Duplicate Assets: ${book.issues.duplicateAssets}`);
    lines.push(`- Other Issues: ${book.issues.other}`);
    lines.push('');

    // Add detailed issues if any assets have issues
    const assetsWithIssues = book.assets.filter((asset) => asset.issues.length > 0);
    if (assetsWithIssues.length > 0) {
      lines.push(...generateDetailedIssues(assetsWithIssues));
    }

    return lines;
  }

  const generateBookDetailsSection = (report: InventoryReport): string[] => {
    const lines = ['## Books', ''];

    // Add book summaries
    for (const book of report.books) {
      lines.push(`### ${book.title} (${book.slug})`, '');
      lines.push(`- **Total Assets**: ${book.assetCount.total}`);
      lines.push(`  - Audio: ${book.assetCount.audio}`);
      lines.push(`  - Text: ${book.assetCount.text}`);
      lines.push(`  - Images: ${book.assetCount.image}`);
      lines.push('');

      // Add issues if any exist
      const hasIssues =
        book.issues.missingAssets ||
        book.issues.inconsistentPaths ||
        book.issues.duplicateAssets ||
        book.issues.other;

      if (hasIssues) {
        lines.push(...generateBookIssuesSummary(book));
      }
    }

    return lines;
  };

  const generateRecommendationsSection = (): string[] => {
    return [
      '## Recommendations',
      '',
      '1. **Missing Assets**: Upload any referenced assets missing from storage',
      '2. **Duplicate Assets**: Consolidate duplicate assets to single instances',
      '3. **Path Structure**: Adopt a consistent path structure for all asset types',
      '',
    ];
  };

  // Generate all sections
  const lines = [
    ...generateSummarySection(report),
    ...generateStorageSection(report),
    ...generateIssuesSection(report),
    ...generatePathPatternsSection(report),
    ...generateBookDetailsSection(report),
    ...generateRecommendationsSection(),
  ];

  await fs.writeFile(outputPath, lines.join('\n'), 'utf8');
}

/**
 * Save the inventory report to a file
 */
async function saveInventoryReport(report: InventoryReport, outputPath: string): Promise<void> {
  try {
    // Ensure the directory exists
    const dir = path.dirname(outputPath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Write the JSON report
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
    logger.info({ msg: `Inventory report saved to ${outputPath}` });

    // Generate a markdown report
    const mdPath = outputPath.replace(/\.json$/, '.md');
    await generateMarkdownReport(report, mdPath);
    logger.info({ msg: `Markdown report saved to ${mdPath}` });
  } catch (error) {
    logger.error({ msg: 'Error saving inventory report', error });
    throw error;
  }
}

/**
 * Print inventory summary to console
 */
function printInventorySummary(report: InventoryReport): void {
  // Use console.error for CLI output as this is intentional output to the user
  console.error('\nAsset Inventory Summary:');
  console.error(`Books Processed: ${report.summary.totalBooks}`);
  console.error(`Total Assets: ${report.summary.totalAssets}`);
  console.error(`  - Audio: ${report.summary.assetsByType.audio}`);
  console.error(`  - Text: ${report.summary.assetsByType.text}`);
  console.error(`  - Images: ${report.summary.assetsByType.image}`);
  console.error('\nStorage Statistics:');
  console.error(
    `Vercel Blob: ${report.summary.storageStats.vercelBlob.totalCount} objects (${formatSize(
      report.summary.storageStats.vercelBlob.totalSize
    )})`
  );
  console.error('\nIssues Detected:');
  console.error(`Total Issues: ${report.summary.issueCount.total}`);
  console.error(`  - Missing Assets: ${report.summary.issueCount.missingAssets}`);
  console.error(`  - Inconsistent Paths: ${report.summary.issueCount.inconsistentPaths}`);
  console.error(`  - Duplicate Assets: ${report.summary.issueCount.duplicateAssets}`);
  console.error(`  - Other Issues: ${report.summary.issueCount.other}`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const options = parseArguments();

    // Create the asset inventory
    const report = await createAssetInventory(options);

    // Print summary to console (expected CLI output)
    printInventorySummary(report);

    // Save the report
    await saveInventoryReport(report, options.outputPath);

    // Log to structured logging system
    logger.info({ msg: 'Inventory creation completed successfully' });

    // CLI output for user
    console.error('\nInventory creation completed successfully!');
  } catch (error) {
    // Log to structured logging system
    logger.error({ msg: 'Error creating asset inventory', error });

    // CLI output for user
    console.error('Error creating asset inventory:', error);
    process.exit(1);
  }
}

// Run the main function
main();
