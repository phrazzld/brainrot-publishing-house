/**
 * Image Asset Audit Tool
 *
 * This script audits the current state of image assets in Vercel Blob storage,
 * identifies inconsistently named files, and generates a report of actions needed
 * to standardize the paths according to our unified path structure.
 */
/* eslint-disable max-lines */
import fs from 'fs';
import path from 'path';

import { createLogger } from '../utils/logger';
import { AssetPathService } from '../utils/services/AssetPathService';
import { blobService } from '../utils/services/BlobService';

// Configure logger
const logger = createLogger({
  level: 'info',
  prefix: 'image-audit',
});

// Initialize services
const assetPathService = new AssetPathService();

interface AuditOptions {
  outputDir: string;
  verbose: boolean;
}

interface ImageAssetInfo {
  path: string;
  url: string;
  size: number;
  contentType: string;
  bookSlug: string | null;
  isStandardized: boolean;
  standardizedPath: string;
  assetType: 'image' | 'unknown';
  imageType: 'cover' | 'chapter' | 'shared' | 'site' | 'unknown';
  needsReorganization: boolean;
}

interface AuditResults {
  totalAssets: number;
  imageAssets: number;
  standardizedAssets: number;
  nonStandardizedAssets: number;
  bookCount: number;
  byBook: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
      assets: ImageAssetInfo[];
    }
  >;
  byImageType: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
    }
  >;
  pathIssues: Record<string, string[]>;
}

/**
 * Parse command line arguments
 */
function parseArgs(): AuditOptions {
  const args = process.argv.slice(2);
  const options: AuditOptions = {
    outputDir: './image-assets-audit',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
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
Image Asset Audit Tool

This script audits the current state of image assets in Vercel Blob storage,
identifies inconsistently named files, and generates a report of actions needed
to standardize the paths according to our unified path structure.

Options:
  --output, -o           Directory for reports (default: ./image-assets-audit)
  --verbose, -v          Enable verbose logging
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
async function listAllBlobs() {
  const allBlobs = [];
  let cursor: string | undefined;

  do {
    const result = await blobService.listFiles({
      cursor,
      limit: 1000,
    });

    allBlobs.push(...result.blobs);
    cursor = result.cursor;

    logger.info(`Listed ${allBlobs.length} blobs so far...`);
  } while (cursor);

  return allBlobs;
}

/**
 * Determine if a path is an image asset
 */
function isImageAsset(path: string, contentType: string): boolean {
  // Check if this is an image asset based on path pattern or content type
  const isImageContentType = contentType.startsWith('image/');
  const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(path);
  const isInImagePath =
    path.includes('/images/') ||
    path.includes('/assets/image/') ||
    path.includes('/assets/shared/') ||
    path.includes('/site-assets/') ||
    path.includes('/assets/site/');

  return isImageContentType || hasImageExtension || isInImagePath;
}

/**
 * Determine if a path follows our standardized format
 */
function isStandardizedPath(path: string): boolean {
  // Check if the path follows our standardized formats:
  // 1. Book-specific images: assets/image/book-slug/file-name.ext
  // 2. Shared images: assets/shared/file-name.ext
  // 3. Site assets: assets/site/file-name.ext
  return (
    path.match(/^assets\/image\/[^/]+\/[^/]+\.(jpg|jpeg|png|gif|webp|svg|avif)$/i) !== null ||
    path.match(/^assets\/shared\/[^/]+\.(jpg|jpeg|png|gif|webp|svg|avif)$/i) !== null ||
    path.match(/^assets\/site\/[^/]+\.(jpg|jpeg|png|gif|webp|svg|avif)$/i) !== null
  );
}

/**
 * Determine the image type
 */
function getImageType(path: string): 'cover' | 'chapter' | 'shared' | 'site' | 'unknown' {
  if (path.includes('assets/shared/') || path.includes('/images/')) {
    return 'shared';
  } else if (path.includes('assets/site/') || path.includes('/site-assets/')) {
    return 'site';
  } else if (path.includes('cover') || path.endsWith('-cover.jpg') || path.endsWith('-cover.png')) {
    return 'cover';
  } else if (path.includes('chapter') || path.match(/chapter-\d+\.(jpg|png)/i)) {
    return 'chapter';
  }
  return 'unknown';
}

/**
 * Process a single blob and create an asset info object
 */
function processImageBlob(
  blob: { pathname: string; url: string; size: number; contentType: string },
  bookSlugs: Set<string>,
  pathIssues: Record<string, string[]>
): ImageAssetInfo {
  // Extract book slug from path
  const bookSlug = assetPathService.getBookSlugFromPath(blob.pathname);
  if (bookSlug) {
    bookSlugs.add(bookSlug);
  } else if (getImageType(blob.pathname) !== 'shared' && getImageType(blob.pathname) !== 'site') {
    // Non-shared/site images should have a book slug
    pathIssues.missingBookSlug.push(blob.pathname);
  }

  // Generate the standardized path for this asset
  let standardizedPath = blob.pathname;
  if (!isStandardizedPath(blob.pathname)) {
    standardizedPath = assetPathService.convertLegacyPath(blob.pathname);
    pathIssues.nonStandardPath.push(blob.pathname);

    // Check for inconsistent naming patterns
    if (
      blob.pathname.includes('image') &&
      !blob.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)
    ) {
      pathIssues.wrongFileExtension.push(blob.pathname);
    }
  }

  const imageType = getImageType(blob.pathname);

  // Create the asset info object
  return {
    path: blob.pathname,
    url: blob.url,
    size: blob.size,
    contentType: blob.contentType,
    bookSlug,
    isStandardized: isStandardizedPath(blob.pathname),
    standardizedPath,
    assetType: 'image',
    imageType,
    needsReorganization: blob.pathname !== standardizedPath,
  };
}

/**
 * Initialize the book data structure
 */
function initializeBookData(bookSlugs: Set<string>): Record<
  string,
  {
    total: number;
    standardized: number;
    nonStandardized: number;
    assets: ImageAssetInfo[];
  }
> {
  const byBook: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
      assets: ImageAssetInfo[];
    }
  > = {};

  // Initialize book entries
  bookSlugs.forEach((slug) => {
    byBook[slug] = {
      total: 0,
      standardized: 0,
      nonStandardized: 0,
      assets: [],
    };
  });

  // Add special categories for shared and site assets
  byBook['shared'] = {
    total: 0,
    standardized: 0,
    nonStandardized: 0,
    assets: [],
  };

  byBook['site'] = {
    total: 0,
    standardized: 0,
    nonStandardized: 0,
    assets: [],
  };

  byBook['unknown'] = {
    total: 0,
    standardized: 0,
    nonStandardized: 0,
    assets: [],
  };

  return byBook;
}

/**
 * Initialize image type statistics
 */
function initializeImageTypeStats(): Record<
  string,
  {
    total: number;
    standardized: number;
    nonStandardized: number;
  }
> {
  return {
    cover: { total: 0, standardized: 0, nonStandardized: 0 },
    chapter: { total: 0, standardized: 0, nonStandardized: 0 },
    shared: { total: 0, standardized: 0, nonStandardized: 0 },
    site: { total: 0, standardized: 0, nonStandardized: 0 },
    unknown: { total: 0, standardized: 0, nonStandardized: 0 },
  };
}

/**
 * Categorize assets by book and type
 */
function categorizeImageAssets(
  imageAssets: ImageAssetInfo[],
  byBook: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
      assets: ImageAssetInfo[];
    }
  >,
  byImageType: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
    }
  >
): void {
  imageAssets.forEach((asset) => {
    // Categorize by book
    let bookKey = asset.bookSlug || 'unknown';
    if (asset.imageType === 'shared') {
      bookKey = 'shared';
    } else if (asset.imageType === 'site') {
      bookKey = 'site';
    }

    byBook[bookKey].total++;
    byBook[bookKey].assets.push(asset);

    if (asset.isStandardized) {
      byBook[bookKey].standardized++;
    } else {
      byBook[bookKey].nonStandardized++;
    }

    // Categorize by image type
    byImageType[asset.imageType].total++;
    if (asset.isStandardized) {
      byImageType[asset.imageType].standardized++;
    } else {
      byImageType[asset.imageType].nonStandardized++;
    }
  });
}

/**
 * Audit image assets in Vercel Blob storage
 */
async function auditImageAssets(options: AuditOptions): Promise<AuditResults> {
  logger.info('Starting image asset audit...');

  // List all blobs
  logger.info('Listing all assets in Vercel Blob...');
  const allBlobs = await listAllBlobs();
  logger.info(`Found ${allBlobs.length} total assets`);

  // Filter for image assets
  const imageBlobs = allBlobs.filter((blob) => isImageAsset(blob.pathname, blob.contentType));
  logger.info(`Found ${imageBlobs.length} image assets`);

  // Initialize data
  const imageAssets: ImageAssetInfo[] = [];
  const bookSlugs = new Set<string>();
  const pathIssues: Record<string, string[]> = {
    missingBookSlug: [],
    inconsistentNaming: [],
    nonStandardPath: [],
    wrongFileExtension: [],
  };

  // Process each blob
  for (const blob of imageBlobs) {
    const assetInfo = processImageBlob(blob, bookSlugs, pathIssues);
    imageAssets.push(assetInfo);

    if (options.verbose) {
      logger.info(
        `${assetInfo.isStandardized ? '✓' : '✗'} ${assetInfo.path} ${
          assetInfo.needsReorganization ? `-> ${assetInfo.standardizedPath}` : ''
        }`
      );
    }
  }

  // Initialize categorization structures
  const byBook = initializeBookData(bookSlugs);
  const byImageType = initializeImageTypeStats();

  // Categorize assets
  categorizeImageAssets(imageAssets, byBook, byImageType);

  // Prepare the results
  const results: AuditResults = {
    totalAssets: allBlobs.length,
    imageAssets: imageAssets.length,
    standardizedAssets: imageAssets.filter((a) => a.isStandardized).length,
    nonStandardizedAssets: imageAssets.filter((a) => !a.isStandardized).length,
    bookCount: bookSlugs.size,
    byBook,
    byImageType,
    pathIssues,
  };

  return results;
}

/**
 * Create a detailed HTML report from the audit results
 */
function createHtmlReport(results: AuditResults): string {
  const standardizationRate =
    results.imageAssets > 0
      ? Math.round((results.standardizedAssets / results.imageAssets) * 100)
      : 0;

  // Create a table of books and their assets
  const bookRows = Object.entries(results.byBook)
    .map(([bookSlug, bookInfo]) => {
      const standardizationRate =
        bookInfo.total > 0 ? Math.round((bookInfo.standardized / bookInfo.total) * 100) : 0;

      return `
        <tr>
          <td>${bookSlug}</td>
          <td>${bookInfo.total}</td>
          <td>${bookInfo.standardized}</td>
          <td>${bookInfo.nonStandardized}</td>
          <td>${standardizationRate}%</td>
        </tr>
      `;
    })
    .join('');

  // Create a table of image types
  const imageTypeRows = Object.entries(results.byImageType)
    .map(([imageType, info]) => {
      const standardizationRate =
        info.total > 0 ? Math.round((info.standardized / info.total) * 100) : 0;

      return `
        <tr>
          <td>${imageType}</td>
          <td>${info.total}</td>
          <td>${info.standardized}</td>
          <td>${info.nonStandardized}</td>
          <td>${standardizationRate}%</td>
        </tr>
      `;
    })
    .join('');

  // Create a table of assets that need reorganization
  const reorgAssets = Object.values(results.byBook)
    .flatMap((book) => book.assets)
    .filter((asset) => asset.needsReorganization);

  const reorgRows = reorgAssets
    .map(
      (asset) => `
      <tr>
        <td>${asset.path}</td>
        <td>${asset.standardizedPath}</td>
        <td>${asset.bookSlug || asset.imageType}</td>
        <td>${asset.imageType}</td>
        <td>${formatBytes(asset.size)}</td>
      </tr>
    `
    )
    .join('');

  // Create sections for different types of issues
  const issuesSections = Object.entries(results.pathIssues)
    .map(([issueType, paths]) => {
      if (paths.length === 0) return '';

      const rows = paths
        .map(
          (p) => `
        <tr>
          <td>${p}</td>
          <td>${assetPathService.convertLegacyPath(p)}</td>
        </tr>
      `
        )
        .join('');

      return `
        <h3>${formatIssueType(issueType)} (${paths.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Current Path</th>
              <th>Standardized Path</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Image Assets Audit Report</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; max-width: 1200px; margin: 0 auto; }
        h1, h2, h3 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .summary { margin-bottom: 30px; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        .actions { background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>Image Assets Audit Report</h1>
      
      <div class="summary">
        <h2>Summary</h2>
        <p>Total assets in Vercel Blob: <strong>${results.totalAssets}</strong></p>
        <p>Image assets: <strong>${results.imageAssets}</strong></p>
        <p>Standardized assets: <strong class="success">${results.standardizedAssets}</strong></p>
        <p>Non-standardized assets: <strong class="${
          results.nonStandardizedAssets > 0 ? 'error' : 'success'
        }">${results.nonStandardizedAssets}</strong></p>
        <p>Standardization rate: <strong>${standardizationRate}%</strong></p>
        <p>Books with image assets: <strong>${results.bookCount}</strong></p>
      </div>
      
      <div class="actions">
        <h2>Recommended Actions</h2>
        <p>Run the path reorganization tool to standardize the paths of non-standardized assets:</p>
        <pre>npm run reorganize:blob -- --prefix="assets/image" --verbose</pre>
        <pre>npm run reorganize:blob -- --prefix="assets/shared" --verbose</pre>
        <pre>npm run reorganize:blob -- --prefix="assets/site" --verbose</pre>
        <pre>npm run reorganize:blob -- --prefix="images" --verbose</pre>
        ${
          results.nonStandardizedAssets > 0
            ? `<p>This will reorganize ${results.nonStandardizedAssets} image assets to follow the standardized path structure.</p>`
            : `<p>All image assets already follow the standardized path structure. No action needed.</p>`
        }
      </div>
      
      <h2>Assets by Book/Category</h2>
      <table>
        <thead>
          <tr>
            <th>Book/Category</th>
            <th>Total Assets</th>
            <th>Standardized</th>
            <th>Non-Standardized</th>
            <th>Standardization Rate</th>
          </tr>
        </thead>
        <tbody>
          ${bookRows}
        </tbody>
      </table>
      
      <h2>Assets by Image Type</h2>
      <table>
        <thead>
          <tr>
            <th>Image Type</th>
            <th>Total Assets</th>
            <th>Standardized</th>
            <th>Non-Standardized</th>
            <th>Standardization Rate</th>
          </tr>
        </thead>
        <tbody>
          ${imageTypeRows}
        </tbody>
      </table>
      
      <h2>Path Issues</h2>
      ${issuesSections}
      
      <h2>Assets Needing Reorganization (${reorgAssets.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Current Path</th>
            <th>Standardized Path</th>
            <th>Book/Category</th>
            <th>Type</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          ${reorgRows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

/**
 * Format issue type for display
 */
function formatIssueType(issueType: string): string {
  return issueType
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/([A-Z])/g, (match) => match.toUpperCase())
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^([a-zA-Z])/, (match) => match.toUpperCase());
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

    logger.info('Image Asset Audit Tool');

    // Create output directory
    createOutputDirectory(options.outputDir);

    // Run the audit
    logger.info('Analyzing image assets...');
    const results = await auditImageAssets(options);

    // Save results to file
    const jsonPath = path.join(options.outputDir, 'image-assets-audit.json');
    saveReport(jsonPath, results);

    // Create HTML report
    const htmlReport = createHtmlReport(results);
    const htmlPath = path.join(options.outputDir, 'image-assets-audit.html');
    fs.writeFileSync(htmlPath, htmlReport);
    logger.info(`Saved HTML report to ${htmlPath}`);

    // Print summary
    logger.info(`
Summary:
  Total assets: ${results.totalAssets}
  Image assets: ${results.imageAssets}
  Standardized: ${results.standardizedAssets}
  Non-standardized: ${results.nonStandardizedAssets}
  Standardization rate: ${
    results.imageAssets > 0
      ? Math.round((results.standardizedAssets / results.imageAssets) * 100)
      : 0
  }%
  
Reports saved to: ${options.outputDir}
    `);
  } catch (error) {
    logger.error('Error in image asset audit:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}
