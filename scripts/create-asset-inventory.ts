#!/usr/bin/env node
/* eslint-disable max-lines */
/**
 * Asset Inventory Creation Script
 *
 * This script creates a comprehensive inventory of all assets from both
 * Digital Ocean Spaces and Vercel Blob, mapping them to their expected
 * locations in translations data.
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
import { HeadObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { head, list } from '@vercel/blob';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';

import translations from '../translations';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Set constants
const DEFAULT_OUTPUT = 'asset-inventory.json';
const DO_REGION = 'nyc3';
const DO_BUCKET = process.env.DO_SPACES_BUCKET || 'brainrot-publishing';
const DO_SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com';
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

interface Asset {
  type: AssetType;
  bookSlug: string;
  assetName: string;
  digitalOcean: {
    exists: boolean;
    path?: string;
    size?: number;
    lastModified?: Date;
    contentType?: string;
    error?: string;
  };
  vercelBlob: {
    exists: boolean;
    path?: string;
    size?: number;
    lastModified?: Date;
    contentType?: string;
    error?: string;
  };
  translations: {
    referenced: boolean;
    path?: string;
    usageInfo?: string;
  };
  issues: string[];
}

interface BookInventory {
  slug: string;
  title: string;
  assetCount: {
    audio: number;
    text: number;
    image: number;
    total: number;
  };
  assets: Asset[];
  issues: {
    missingAssets: number;
    inconsistentPaths: number;
    duplicateAssets: number;
    other: number;
  };
}

interface InventoryReport {
  timestamp: string;
  options: InventoryOptions;
  summary: {
    totalBooks: number;
    totalAssets: number;
    assetsByType: Record<AssetType, number>;
    issueCount: {
      missingAssets: number;
      inconsistentPaths: number;
      duplicateAssets: number;
      other: number;
      total: number;
    };
    storageStats: {
      digitalOcean: {
        totalSize: number;
        totalCount: number;
      };
      vercelBlob: {
        totalSize: number;
        totalCount: number;
      };
    };
  };
  pathPatterns: {
    digitalOcean: string[];
    vercelBlob: string[];
  };
  books: BookInventory[];
}

// S3 Client for Digital Ocean
let s3Client: S3Client | null = null;

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
  console.log(`
Asset Inventory Creation Script

This script creates a comprehensive inventory of all assets from both
Digital Ocean Spaces and Vercel Blob, mapping them to their expected
locations in translations data.

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
`);
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
 * Initialize the S3 client for Digital Ocean
 */
function initializeS3Client(): S3Client {
  if (s3Client) return s3Client;

  const accessKeyId = process.env.DO_SPACES_ACCESS_KEY;
  const secretAccessKey = process.env.DO_SPACES_SECRET_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'Digital Ocean credentials not found. Set DO_SPACES_ACCESS_KEY and DO_SPACES_SECRET_KEY in .env.local'
    );
  }

  s3Client = new S3Client({
    region: DO_REGION,
    endpoint: `https://${DO_SPACES_ENDPOINT}`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3Client;
}

/**
 * List objects in Digital Ocean Spaces
 */
async function listDigitalOceanObjects(prefix?: string): Promise<Record<string, unknown>[]> {
  const client = initializeS3Client();
  const objects: Record<string, unknown>[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: DO_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    try {
      const response = await client.send(command);
      if (response.Contents) {
        objects.push(...response.Contents);
      }
      continuationToken = response.NextContinuationToken;
    } catch (error) {
      console.error('Error listing objects from Digital Ocean:', error);
      throw error;
    }
  } while (continuationToken);

  return objects;
}

/**
 * Get an object's metadata from Digital Ocean Spaces
 */
async function getDigitalOceanObjectMetadata(key: string): Promise<{
  size: number;
  lastModified: Date;
  contentType: string;
}> {
  const client = initializeS3Client();
  const command = new HeadObjectCommand({
    Bucket: DO_BUCKET,
    Key: key,
  });

  try {
    const response = await client.send(command);
    return {
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      contentType: response.ContentType || 'application/octet-stream',
    };
  } catch (error) {
    throw new Error(`Failed to get metadata for ${key}: ${error}`);
  }
}

/**
 * List objects in Vercel Blob
 */
async function listVercelBlobObjects(prefix?: string): Promise<Record<string, unknown>[]> {
  const objects: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  do {
    try {
      const result = await list({ prefix, cursor });
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
 * Extract asset type from path
 */
function getAssetTypeFromPath(path: string): AssetType {
  if (path.includes('/audio/') || path.endsWith('.mp3')) {
    return 'audio';
  } else if (
    path.includes('/text/') ||
    path.endsWith('.txt') ||
    path.endsWith('.html') ||
    path.endsWith('.md')
  ) {
    return 'text';
  } else if (
    path.includes('/images/') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg') ||
    path.endsWith('.png') ||
    path.endsWith('.gif') ||
    path.endsWith('.svg')
  ) {
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
 * Create the asset inventory report
 */
async function createAssetInventory(options: InventoryOptions): Promise<InventoryReport> {
  // eslint-disable-next-line no-console
  console.log('Creating comprehensive asset inventory...');
  const startTime = Date.now();

  // Get all books to process
  const booksToProcess =
    options.bookSlugs.length > 0
      ? translations.filter((book) => options.bookSlugs.includes(book.slug))
      : translations;

  // eslint-disable-next-line no-console
  console.log(`Processing ${booksToProcess.length} books for asset inventory`);

  // Initialize the report
  const report: InventoryReport = {
    timestamp: new Date().toISOString(),
    options,
    summary: {
      totalBooks: booksToProcess.length,
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
        digitalOcean: {
          totalSize: 0,
          totalCount: 0,
        },
        vercelBlob: {
          totalSize: 0,
          totalCount: 0,
        },
      },
    },
    pathPatterns: {
      digitalOcean: [],
      vercelBlob: [],
    },
    books: [],
  };

  // Fetch all objects from both storage systems
  // eslint-disable-next-line no-console
  console.log('Fetching objects from Digital Ocean Spaces...');
  const doObjects = await listDigitalOceanObjects();
  // eslint-disable-next-line no-console
  console.log(`Found ${doObjects.length} objects in Digital Ocean Spaces`);

  // eslint-disable-next-line no-console
  console.log('Fetching objects from Vercel Blob...');
  const blobObjects = await listVercelBlobObjects();
  // eslint-disable-next-line no-console
  console.log(`Found ${blobObjects.length} objects in Vercel Blob`);

  // Group objects by book

  const doObjectsByBook = new Map<string, Record<string, unknown>[]>();

  const blobObjectsByBook = new Map<string, Record<string, unknown>[]>();
  const pathPatternsDO = new Set<string>();
  const pathPatternsBlob = new Set<string>();

  // Process Digital Ocean objects
  for (const obj of doObjects) {
    const key = obj.Key;
    const bookSlug = getBookSlugFromPath(key);
    if (bookSlug) {
      if (!doObjectsByBook.has(bookSlug)) {
        doObjectsByBook.set(bookSlug, []);
      }
      doObjectsByBook.get(bookSlug)?.push(obj);

      // Extract path pattern
      const pattern = key.replace(bookSlug, '{slug}').replace(/\/[^/]+\.\w+$/, '/{file}');
      pathPatternsDO.add(pattern);
    }
  }

  // Process Vercel Blob objects
  for (const obj of blobObjects) {
    const pathname = obj.pathname;
    const bookSlug = getBookSlugFromPath(pathname);
    if (bookSlug) {
      if (!blobObjectsByBook.has(bookSlug)) {
        blobObjectsByBook.set(bookSlug, []);
      }
      blobObjectsByBook.get(bookSlug)?.push(obj);

      // Extract path pattern
      const pattern = pathname.replace(bookSlug, '{slug}').replace(/\/[^/]+\.\w+$/, '/{file}');
      pathPatternsBlob.add(pattern);
    }
  }

  // Add path patterns to report
  report.pathPatterns.digitalOcean = Array.from(pathPatternsDO);
  report.pathPatterns.vercelBlob = Array.from(pathPatternsBlob);

  // Process each book
  for (const book of booksToProcess) {
    if (options.verbose) {
      console.log(`\nProcessing book: ${book.slug} (${book.title})`);
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
    const doBookObjects = doObjectsByBook.get(book.slug) || [];
    const blobBookObjects = blobObjectsByBook.get(book.slug) || [];

    if (options.verbose) {
      console.log(
        `  Found ${doBookObjects.length} Digital Ocean objects and ${blobBookObjects.length} Vercel Blob objects`
      );
    }

    // Collect assets from translations
    const referencedAssets: Map<string, { type: AssetType; path: string; info: string }> =
      new Map();

    // Chapters for audio
    if (book.chapters && options.assetTypes.includes('audio')) {
      for (const chapter of book.chapters) {
        if (chapter.audioSrc) {
          const assetName = getAssetNameFromPath(chapter.audioSrc);
          const key = `audio:${assetName}`;
          referencedAssets.set(key, {
            type: 'audio',
            path: chapter.audioSrc,
            info: `Chapter: ${chapter.title}`,
          });
        }
      }
    }

    // Full audiobook
    if (book.fullAudioSrc && options.assetTypes.includes('audio')) {
      const assetName = getAssetNameFromPath(book.fullAudioSrc);
      const key = `audio:${assetName}`;
      referencedAssets.set(key, {
        type: 'audio',
        path: book.fullAudioSrc,
        info: 'Full audiobook',
      });
    }

    // Cover image
    if (book.coverImage && options.assetTypes.includes('image')) {
      const assetName = getAssetNameFromPath(book.coverImage);
      const key = `image:${assetName}`;
      referencedAssets.set(key, {
        type: 'image',
        path: book.coverImage,
        info: 'Cover image',
      });
    }

    // Text content
    if (book.fullText && options.assetTypes.includes('text')) {
      const assetName = 'fulltext.txt';
      const key = `text:${assetName}`;
      referencedAssets.set(key, {
        type: 'text',
        path: book.fullText,
        info: 'Full text',
      });
    }

    // Chapter images
    if (book.chapters && options.assetTypes.includes('image')) {
      for (const chapter of book.chapters) {
        if (chapter.image) {
          const assetName = getAssetNameFromPath(chapter.image);
          const key = `image:${assetName}`;
          referencedAssets.set(key, {
            type: 'image',
            path: chapter.image,
            info: `Chapter image: ${chapter.title}`,
          });
        }
      }
    }

    // Collect assets from Digital Ocean
    for (const obj of doBookObjects) {
      const assetName = getAssetNameFromPath(obj.Key);
      const assetType = getAssetTypeFromPath(obj.Key);

      // Skip asset types not in options
      if (!options.assetTypes.includes(assetType)) continue;

      const key = `${assetType}:${assetName}`;
      let asset = bookInventory.assets.find(
        (a) => a.type === assetType && a.assetName === assetName
      );

      if (!asset) {
        asset = {
          type: assetType,
          bookSlug: book.slug,
          assetName,
          digitalOcean: {
            exists: true,
            path: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
          },
          vercelBlob: {
            exists: false,
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
        asset.digitalOcean = {
          exists: true,
          path: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
        };
      }

      // Get full metadata if needed
      if (options.verifyAll || options.checkContent) {
        try {
          const metadata = await getDigitalOceanObjectMetadata(obj.Key);
          asset.digitalOcean.size = metadata.size;
          asset.digitalOcean.lastModified = metadata.lastModified;
          asset.digitalOcean.contentType = metadata.contentType;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          asset.digitalOcean.error = errorMessage;
          asset.issues.push(`Digital Ocean error: ${errorMessage}`);
          bookInventory.issues.other++;
        }
      }

      // Update storage stats
      report.summary.storageStats.digitalOcean.totalCount++;
      report.summary.storageStats.digitalOcean.totalSize += obj.Size || 0;
    }

    // Collect assets from Vercel Blob
    for (const obj of blobBookObjects) {
      const assetName = getAssetNameFromPath(obj.pathname);
      const assetType = getAssetTypeFromPath(obj.pathname);

      // Skip asset types not in options
      if (!options.assetTypes.includes(assetType)) continue;

      const key = `${assetType}:${assetName}`;
      let asset = bookInventory.assets.find(
        (a) => a.type === assetType && a.assetName === assetName
      );

      if (!asset) {
        asset = {
          type: assetType,
          bookSlug: book.slug,
          assetName,
          digitalOcean: {
            exists: false,
          },
          vercelBlob: {
            exists: true,
            path: obj.pathname,
            size: obj.size,
            lastModified: new Date(obj.uploadedAt),
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
          path: obj.pathname,
          size: obj.size,
          lastModified: new Date(obj.uploadedAt),
        };
      }

      // Get full metadata if needed
      if (options.verifyAll || options.checkContent) {
        try {
          const metadata = await getVercelBlobObjectMetadata(obj.url);
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
      report.summary.storageStats.vercelBlob.totalSize += obj.size || 0;
    }

    // Add assets referenced in translations but not found in storage
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [key, assetRef] of referencedAssets.entries()) {
      const assetName = getAssetNameFromPath(assetRef.path);
      const assetType = assetRef.type;

      // Check if asset already exists in our inventory
      let asset = bookInventory.assets.find(
        (a) => a.type === assetType && a.assetName === assetName
      );

      if (!asset) {
        // Asset referenced but not found in any storage
        asset = {
          type: assetType,
          bookSlug: book.slug,
          assetName,
          digitalOcean: {
            exists: false,
          },
          vercelBlob: {
            exists: false,
          },
          translations: {
            referenced: true,
            path: assetRef.path,
            usageInfo: assetRef.info,
          },
          issues: ['Referenced in translations but not found in any storage'],
        };
        bookInventory.assets.push(asset);
        bookInventory.assetCount[assetType]++;
        bookInventory.assetCount.total++;
        bookInventory.issues.missingAssets++;
      }
    }

    // Identify issues for each asset
    for (const asset of bookInventory.assets) {
      // Missing asset
      if (!asset.digitalOcean.exists && !asset.vercelBlob.exists && asset.translations.referenced) {
        asset.issues.push('Asset is referenced but missing from all storage systems');
        bookInventory.issues.missingAssets++;
      }

      // Inconsistent paths
      if (
        asset.digitalOcean.exists &&
        asset.vercelBlob.exists &&
        asset.digitalOcean.path &&
        asset.vercelBlob.path
      ) {
        const doPath = asset.digitalOcean.path;
        const blobPath = asset.vercelBlob.path;

        // If paths have completely different structures
        if (
          doPath.split('/').length !== blobPath.split('/').length ||
          !doPath.endsWith(asset.assetName) ||
          !blobPath.endsWith(asset.assetName)
        ) {
          asset.issues.push('Inconsistent paths between storage systems');
          bookInventory.issues.inconsistentPaths++;
        }
      }

      // Size mismatch
      if (
        asset.digitalOcean.exists &&
        asset.vercelBlob.exists &&
        asset.digitalOcean.size &&
        asset.vercelBlob.size &&
        Math.abs(asset.digitalOcean.size - asset.vercelBlob.size) > 100 // Allow small differences
      ) {
        asset.issues.push(
          `Size mismatch: DO (${formatSize(asset.digitalOcean.size)}) vs Blob (${formatSize(
            asset.vercelBlob.size
          )})`
        );
        bookInventory.issues.other++;
      }

      // Unreferenced asset
      if (!asset.translations.referenced) {
        asset.issues.push('Asset exists in storage but is not referenced in translations');
      }
    }

    // Check for duplicate assets (same type/name but different paths)
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

    // Add book to report
    report.books.push(bookInventory);

    // Update summary counts
    report.summary.assetsByType.audio += bookInventory.assetCount.audio;
    report.summary.assetsByType.text += bookInventory.assetCount.text;
    report.summary.assetsByType.image += bookInventory.assetCount.image;
    report.summary.totalAssets += bookInventory.assetCount.total;
    report.summary.issueCount.missingAssets += bookInventory.issues.missingAssets;
    report.summary.issueCount.inconsistentPaths += bookInventory.issues.inconsistentPaths;
    report.summary.issueCount.duplicateAssets += bookInventory.issues.duplicateAssets;
    report.summary.issueCount.other += bookInventory.issues.other;
  }

  // Calculate total issues
  report.summary.issueCount.total =
    report.summary.issueCount.missingAssets +
    report.summary.issueCount.inconsistentPaths +
    report.summary.issueCount.duplicateAssets +
    report.summary.issueCount.other;

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  console.log(`\nInventory creation completed in ${duration.toFixed(2)} seconds`);

  return report;
}

/**
 * Generate a markdown report
 */
async function generateMarkdownReport(report: InventoryReport, outputPath: string): Promise<void> {
  const lines = [
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
    '## Storage Statistics',
    '',
    '### Digital Ocean Spaces',
    '',
    `- **Total Objects**: ${report.summary.storageStats.digitalOcean.totalCount}`,
    `- **Total Size**: ${formatSize(report.summary.storageStats.digitalOcean.totalSize)}`,
    '',
    '### Vercel Blob',
    '',
    `- **Total Objects**: ${report.summary.storageStats.vercelBlob.totalCount}`,
    `- **Total Size**: ${formatSize(report.summary.storageStats.vercelBlob.totalSize)}`,
    '',
    '## Issues',
    '',
    `- **Total Issues**: ${report.summary.issueCount.total}`,
    `  - Missing Assets: ${report.summary.issueCount.missingAssets}`,
    `  - Inconsistent Paths: ${report.summary.issueCount.inconsistentPaths}`,
    `  - Duplicate Assets: ${report.summary.issueCount.duplicateAssets}`,
    `  - Other Issues: ${report.summary.issueCount.other}`,
    '',
    '## Path Patterns',
    '',
    '### Digital Ocean Spaces',
    '',
  ];

  // Add DO path patterns
  for (const pattern of report.pathPatterns.digitalOcean) {
    lines.push(`- \`${pattern}\``);
  }

  lines.push('', '### Vercel Blob', '');

  // Add Blob path patterns
  for (const pattern of report.pathPatterns.vercelBlob) {
    lines.push(`- \`${pattern}\``);
  }

  lines.push('', '## Books', '');

  // Add book summaries
  for (const book of report.books) {
    lines.push(`### ${book.title} (${book.slug})`, '');
    lines.push(`- **Total Assets**: ${book.assetCount.total}`);
    lines.push(`  - Audio: ${book.assetCount.audio}`);
    lines.push(`  - Text: ${book.assetCount.text}`);
    lines.push(`  - Images: ${book.assetCount.image}`);
    lines.push('');

    if (
      book.issues.missingAssets ||
      book.issues.inconsistentPaths ||
      book.issues.duplicateAssets ||
      book.issues.other
    ) {
      lines.push('#### Issues', '');
      lines.push(`- Missing Assets: ${book.issues.missingAssets}`);
      lines.push(`- Inconsistent Paths: ${book.issues.inconsistentPaths}`);
      lines.push(`- Duplicate Assets: ${book.issues.duplicateAssets}`);
      lines.push(`- Other Issues: ${book.issues.other}`);
      lines.push('');

      // Add detailed issues
      const assetsWithIssues = book.assets.filter((asset) => asset.issues.length > 0);
      if (assetsWithIssues.length > 0) {
        lines.push('##### Detailed Issues', '');
        for (const asset of assetsWithIssues) {
          lines.push(`- **${asset.type}/${asset.assetName}**:`);
          for (const issue of asset.issues) {
            lines.push(`  - ${issue}`);
          }
          lines.push('');
        }
      }
    }
  }

  lines.push(
    '',
    '## Recommendations',
    '',
    '1. **Missing Assets**: Upload any referenced assets missing from storage',
    '2. **Inconsistent Paths**: Standardize path structure across storage systems',
    '3. **Duplicate Assets**: Consolidate duplicate assets to single instances',
    '4. **Path Structure**: Adopt a consistent path structure for all asset types',
    ''
  );

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
    console.log(`Inventory report saved to ${outputPath}`);

    // Generate a markdown report
    const mdPath = outputPath.replace(/\.json$/, '.md');
    await generateMarkdownReport(report, mdPath);
    console.log(`Markdown report saved to ${mdPath}`);
  } catch (error) {
    console.error('Error saving inventory report:', error);
    throw error;
  }
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

    // Print summary
    console.log('\nAsset Inventory Summary:');
    console.log(`Books Processed: ${report.summary.totalBooks}`);
    console.log(`Total Assets: ${report.summary.totalAssets}`);
    console.log(`  - Audio: ${report.summary.assetsByType.audio}`);
    console.log(`  - Text: ${report.summary.assetsByType.text}`);
    console.log(`  - Images: ${report.summary.assetsByType.image}`);
    console.log('\nStorage Statistics:');
    console.log(
      `Digital Ocean: ${report.summary.storageStats.digitalOcean.totalCount} objects (${formatSize(
        report.summary.storageStats.digitalOcean.totalSize
      )})`
    );
    console.log(
      `Vercel Blob: ${report.summary.storageStats.vercelBlob.totalCount} objects (${formatSize(
        report.summary.storageStats.vercelBlob.totalSize
      )})`
    );
    console.log('\nIssues Detected:');
    console.log(`Total Issues: ${report.summary.issueCount.total}`);
    console.log(`  - Missing Assets: ${report.summary.issueCount.missingAssets}`);
    console.log(`  - Inconsistent Paths: ${report.summary.issueCount.inconsistentPaths}`);
    console.log(`  - Duplicate Assets: ${report.summary.issueCount.duplicateAssets}`);
    console.log(`  - Other Issues: ${report.summary.issueCount.other}`);

    // Save the report
    await saveInventoryReport(report, options.outputPath);

    console.log('\nInventory creation completed successfully!');
  } catch (error) {
    console.error('Error creating asset inventory:', error);
    process.exit(1);
  }
}

// Run the main function
main();
