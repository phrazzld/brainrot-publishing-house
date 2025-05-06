/**
 * Blob Path Reorganization Tool
 *
 * This script reorganizes assets within Vercel Blob to follow the new unified path structure.
 * It uses the AssetPathService to map current paths to the new standardized format,
 * and supports dry-run mode to preview changes without executing them.
 */
import { type ListBlobResultBlob, del, list, put } from '@vercel/blob';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

import { AssetType } from '../types/assets';
import { createLogger } from '../utils/logger';
import { AssetPathService } from '../utils/services/AssetPathService';

// Configure logger
const logger = createLogger({
  level: 'info',
  prefix: 'blob-reorganize',
});

// Initialize AssetPathService
const assetPathService = new AssetPathService();

// CLI options
interface CliOptions {
  dryRun: boolean;
  limit?: number;
  prefix?: string;
  outputDir: string;
  verbose: boolean;
  skipVerification: boolean;
}

// Path mapping
interface PathMapping {
  originalPath: string;
  newPath: string;
  assetType: AssetType | 'shared' | 'site';
  bookSlug: string | null;
  contentType: string;
  size: number;
  url: string;
}

// Stats for reporting
interface MigrationStats {
  totalAssets: number;
  processedAssets: number;
  skippedAssets: number;
  movedAssets: number;
  failedAssets: number;
  byAssetType: Record<
    string,
    {
      total: number;
      processed: number;
      skipped: number;
      moved: number;
      failed: number;
    }
  >;
  byError: Record<string, number>;
  errors: Array<{
    path: string;
    newPath: string;
    error: string;
  }>;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    dryRun: false,
    outputDir: './blob-reorganization-reports',
    verbose: false,
    skipVerification: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--prefix':
      case '-p':
        options.prefix = args[++i];
        break;
      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--skip-verification':
      case '-s':
        options.skipVerification = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        break;
    }
  }

  return options;
}

/**
 * Print help information
 */
function printHelp(): void {
  logger.info(`
Blob Path Reorganization Tool

This script reorganizes assets within Vercel Blob to follow the new unified path structure.

Options:
  --dry-run, -d          Preview changes without executing them
  --limit, -l            Limit the number of assets to process
  --prefix, -p           Process only assets with this prefix
  --output, -o           Directory for reports (default: ./blob-reorganization-reports)
  --verbose, -v          Enable verbose logging
  --skip-verification, -s Skip verification after reorganization
  --help, -h             Show this help message
  `);
}

/**
 * Create output directory for reports
 */
function createOutputDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created output directory: ${dirPath}`);
  }
}

/**
 * Save report to file
 */
function saveReport(filePath: string, content: Record<string, unknown>): void {
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  logger.info(`Saved report to ${filePath}`);
}

/**
 * List all assets in Vercel Blob
 */
async function listAllBlobs(options: {
  prefix?: string;
  limit?: number;
}): Promise<ListBlobResultBlob[]> {
  const allBlobs: ListBlobResultBlob[] = [];
  let cursor: string | undefined;

  do {
    const result = await list({
      prefix: options.prefix,
      limit: 1000,
      cursor,
    });

    allBlobs.push(...result.blobs);
    cursor = result.cursor;

    logger.info(`Listed ${allBlobs.length} blobs so far...`);

    if (options.limit && allBlobs.length >= options.limit) {
      allBlobs.splice(options.limit);
      break;
    }
  } while (cursor);

  return allBlobs;
}

/**
 * Determine asset type and book slug from path
 */
function getAssetTypeAndSlug(path: string): {
  assetType: AssetType | 'shared' | 'site' | null;
  bookSlug: string | null;
} {
  // Try to determine the asset type and book slug based on the path
  if (path.startsWith('books/')) {
    const parts = path.split('/');
    if (parts.length >= 3) {
      const bookSlug = parts[1];

      switch (parts[2]) {
        case 'images':
          return { assetType: AssetType.IMAGE, bookSlug };
        case 'audio':
          return { assetType: AssetType.AUDIO, bookSlug };
        case 'text':
          return { assetType: AssetType.TEXT, bookSlug };
        default:
          return { assetType: null, bookSlug: null };
      }
    }
  } else if (path.match(/^[^/]+\/audio\//)) {
    // Direct audio path: hamlet/audio/act-1.mp3
    const parts = path.split('/');
    return { assetType: AssetType.AUDIO, bookSlug: parts[0] };
  } else if (path.startsWith('images/')) {
    return { assetType: 'shared', bookSlug: null };
  } else if (path.startsWith('site-assets/')) {
    return { assetType: 'site', bookSlug: null };
  }

  return { assetType: null, bookSlug: null };
}

/**
 * Map current paths to new paths using the AssetPathService
 */
function mapPaths(blobs: ListBlobResultBlob[]): PathMapping[] {
  const mappings: PathMapping[] = [];

  for (const blob of blobs) {
    try {
      const path = blob.pathname;
      const { assetType, bookSlug } = getAssetTypeAndSlug(path);

      // Skip if we couldn't determine the asset type
      if (!assetType) {
        logger.warn(`Skipping blob with unrecognized path pattern: ${path}`);
        continue;
      }

      // Generate the new path using AssetPathService
      const newPath = assetPathService.convertLegacyPath(path);

      // Skip if the path doesn't change
      if (newPath === path) {
        logger.debug(`Path already in correct format, skipping: ${path}`);
        continue;
      }

      mappings.push({
        originalPath: path,
        newPath,
        assetType,
        bookSlug,
        contentType: blob.contentType,
        size: blob.size,
        url: blob.url,
      });
    } catch (error) {
      logger.error(`Error mapping path for blob ${blob.pathname}:`, error);
    }
  }

  return mappings;
}

/**
 * Compute hash of content for verification
 */
async function computeContentHash(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
  }

  const content = await response.arrayBuffer();
  return createHash('sha256').update(Buffer.from(content)).digest('hex');
}

/**
 * Move a blob to its new path
 */
async function moveBlob(mapping: PathMapping, options: CliOptions): Promise<boolean> {
  try {
    if (options.dryRun) {
      logger.info(`[DRY RUN] Would move: ${mapping.originalPath} -> ${mapping.newPath}`);
      return true;
    }

    // Fetch the blob content
    const response = await fetch(mapping.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
    }

    const content = await response.arrayBuffer();

    // Compute content hash for verification
    const originalHash = createHash('sha256').update(Buffer.from(content)).digest('hex');

    // Upload to the new path
    logger.info(`Moving blob: ${mapping.originalPath} -> ${mapping.newPath}`);
    const result = await put(mapping.newPath, new Blob([content], { type: mapping.contentType }), {
      access: 'public',
      contentType: mapping.contentType,
    });

    // Verify content hash if verification is enabled
    if (!options.skipVerification) {
      const newHash = await computeContentHash(result.url);
      if (originalHash !== newHash) {
        throw new Error('Content verification failed: hash mismatch');
      }
    }

    // Delete the original blob
    await del(mapping.url);

    logger.info(`Successfully moved: ${mapping.originalPath} -> ${mapping.newPath}`);
    return true;
  } catch (error) {
    logger.error(`Error moving blob ${mapping.originalPath}:`, error);
    return false;
  }
}

/**
 * Reorganize blobs based on path mappings
 */
async function reorganizeBlobs(
  mappings: PathMapping[],
  options: CliOptions
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalAssets: mappings.length,
    processedAssets: 0,
    skippedAssets: 0,
    movedAssets: 0,
    failedAssets: 0,
    byAssetType: {},
    byError: {},
    errors: [],
  };

  // Initialize stats for each asset type
  const assetTypes = new Set<string>();
  mappings.forEach((mapping) => assetTypes.add(String(mapping.assetType)));

  assetTypes.forEach((type) => {
    stats.byAssetType[type] = {
      total: 0,
      processed: 0,
      skipped: 0,
      moved: 0,
      failed: 0,
    };
  });

  // Count total by asset type
  mappings.forEach((mapping) => {
    const type = String(mapping.assetType);
    stats.byAssetType[type].total++;
  });

  // Process mappings
  for (const mapping of mappings) {
    const type = String(mapping.assetType);
    stats.processedAssets++;
    stats.byAssetType[type].processed++;

    const success = await moveBlob(mapping, options);

    if (success) {
      stats.movedAssets++;
      stats.byAssetType[type].moved++;
    } else {
      stats.failedAssets++;
      stats.byAssetType[type].failed++;

      const errorMessage = `Failed to move blob`;
      if (!stats.byError[errorMessage]) {
        stats.byError[errorMessage] = 0;
      }
      stats.byError[errorMessage]++;

      stats.errors.push({
        path: mapping.originalPath,
        newPath: mapping.newPath,
        error: errorMessage,
      });
    }

    // Log progress
    if (stats.processedAssets % 10 === 0 || stats.processedAssets === stats.totalAssets) {
      logger.info(`Progress: ${stats.processedAssets}/${stats.totalAssets} assets processed`);
    }
  }

  return stats;
}

/**
 * Create a detailed HTML report from the stats
 */
function createHtmlReport(
  stats: MigrationStats,
  mappings: PathMapping[],
  options: CliOptions
): string {
  const successRate =
    stats.totalAssets > 0 ? Math.round((stats.movedAssets / stats.totalAssets) * 100) : 0;

  const assetTypeRows = Object.entries(stats.byAssetType)
    .map(([type, typeStat]) => {
      const typeSuccessRate =
        typeStat.total > 0 ? Math.round((typeStat.moved / typeStat.total) * 100) : 0;

      return `
        <tr>
          <td>${type}</td>
          <td>${typeStat.total}</td>
          <td>${typeStat.processed}</td>
          <td>${typeStat.moved}</td>
          <td>${typeStat.failed}</td>
          <td>${typeSuccessRate}%</td>
        </tr>
      `;
    })
    .join('');

  const errorRows = stats.errors
    .map(
      (error) => `
      <tr>
        <td>${error.path}</td>
        <td>${error.newPath}</td>
        <td>${error.error}</td>
      </tr>
    `
    )
    .join('');

  const mappingRows = mappings
    .map(
      (mapping) => `
      <tr>
        <td>${mapping.originalPath}</td>
        <td>${mapping.newPath}</td>
        <td>${mapping.assetType}</td>
        <td>${mapping.bookSlug || 'N/A'}</td>
        <td>${mapping.contentType}</td>
        <td>${formatBytes(mapping.size)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Blob Path Reorganization Report</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        h1, h2, h3 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .summary { margin-bottom: 30px; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
      </style>
    </head>
    <body>
      <h1>Blob Path Reorganization Report</h1>
      
      <div class="summary">
        <h2>Summary</h2>
        <p>Run mode: <strong>${options.dryRun ? 'Dry Run (no changes made)' : 'Execution'}</strong></p>
        <p>Total assets: <strong>${stats.totalAssets}</strong></p>
        <p>Processed assets: <strong>${stats.processedAssets}</strong></p>
        <p>Moved assets: <strong class="success">${stats.movedAssets}</strong></p>
        <p>Failed assets: <strong class="${stats.failedAssets > 0 ? 'error' : 'success'}">${stats.failedAssets}</strong></p>
        <p>Success rate: <strong>${successRate}%</strong></p>
      </div>
      
      <h2>Results by Asset Type</h2>
      <table>
        <thead>
          <tr>
            <th>Asset Type</th>
            <th>Total</th>
            <th>Processed</th>
            <th>Moved</th>
            <th>Failed</th>
            <th>Success Rate</th>
          </tr>
        </thead>
        <tbody>
          ${assetTypeRows}
        </tbody>
      </table>
      
      ${
        stats.errors.length > 0
          ? `
        <h2>Errors</h2>
        <table>
          <thead>
            <tr>
              <th>Original Path</th>
              <th>New Path</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            ${errorRows}
          </tbody>
        </table>
      `
          : ''
      }
      
      <h2>Path Mappings</h2>
      <table>
        <thead>
          <tr>
            <th>Original Path</th>
            <th>New Path</th>
            <th>Asset Type</th>
            <th>Book Slug</th>
            <th>Content Type</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          ${mappingRows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

/**
 * Format bytes to a human-readable form
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const options = parseArgs();

    // Set log level
    if (options.verbose) {
      logger.level = 'debug';
    }

    logger.info('Blob Path Reorganization Tool');
    logger.info(`Mode: ${options.dryRun ? 'Dry Run' : 'Execution'}`);

    // Create output directory
    createOutputDirectory(options.outputDir);

    // List all blobs
    logger.info('Listing blobs...');
    const blobs = await listAllBlobs({
      prefix: options.prefix,
      limit: options.limit,
    });
    logger.info(`Found ${blobs.length} blobs`);

    // Map paths
    logger.info('Mapping paths...');
    const mappings = mapPaths(blobs);
    logger.info(`Generated ${mappings.length} path mappings`);

    // Save mappings to file
    const mappingsPath = path.join(options.outputDir, 'path-mappings.json');
    saveReport(mappingsPath, mappings);

    // Reorganize blobs
    logger.info('Reorganizing blobs...');
    const stats = await reorganizeBlobs(mappings, options);
    logger.info(`Reorganization complete: ${stats.movedAssets}/${stats.totalAssets} assets moved`);

    // Save stats to file
    const statsPath = path.join(options.outputDir, 'reorganization-stats.json');
    saveReport(statsPath, stats);

    // Create HTML report
    const htmlReport = createHtmlReport(stats, mappings, options);
    const htmlPath = path.join(options.outputDir, 'reorganization-report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    logger.info(`Saved HTML report to ${htmlPath}`);

    logger.info('Blob path reorganization complete!');

    // Print summary
    logger.info(`
Summary:
  Total assets: ${stats.totalAssets}
  Processed: ${stats.processedAssets}
  Moved: ${stats.movedAssets}
  Failed: ${stats.failedAssets}
  
Reports saved to: ${options.outputDir}
  
${options.dryRun ? 'This was a dry run. No changes were made.' : ''}
    `);
  } catch (error) {
    logger.error('Error in blob path reorganization:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}
