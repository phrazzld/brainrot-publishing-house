/**
 * Text Asset Audit Tool
 *
 * This script audits the current state of text assets in Vercel Blob storage,
 * identifies inconsistently named files, and generates a report of actions needed
 * to standardize the paths according to our unified path structure.
 */
import fs from 'fs';
import path from 'path';

import { createRequestLogger } from '../utils/logger';
import { AssetPathService } from '../utils/services/AssetPathService';
import { blobService } from '../utils/services/BlobService';

// Configure logger
const auditLogger = createRequestLogger('text-audit');

// Initialize services
const assetPathService = new AssetPathService();

interface AuditOptions {
  outputDir: string;
  verbose: boolean;
}

interface TextAssetInfo {
  path: string;
  url: string;
  size: number;
  contentType?: string;
  bookSlug: string | null;
  isStandardized: boolean;
  standardizedPath: string;
  assetType: 'text' | 'unknown'; // Only looking at text assets
  textType: 'source' | 'brainrot' | 'unknown';
  needsReorganization: boolean;
}

interface AuditResults {
  totalAssets: number;
  textAssets: number;
  standardizedAssets: number;
  nonStandardizedAssets: number;
  bookCount: number;
  byBook: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
      assets: TextAssetInfo[];
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
    outputDir: './text-assets-audit',
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
  auditLogger.info({
    msg: `
Text Asset Audit Tool

This script audits the current state of text assets in Vercel Blob storage,
identifies inconsistently named files, and generates a report of actions needed
to standardize the paths according to our unified path structure.

Options:
  --output, -o           Directory for reports (default: ./text-assets-audit)
  --verbose, -v          Enable verbose logging
  --help, -h             Show this help message
  `,
  });
}

/**
 * Create output directory for reports
 */
function createOutputDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    auditLogger.info({ msg: `Created output directory: ${dirPath}` });
  }
}

/**
 * Save report to file
 */
function saveReport(filePath: string, content: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  auditLogger.info({ msg: `Saved report to ${filePath}` });
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

    auditLogger.info({ msg: `Listed ${allBlobs.length} blobs so far...` });
  } while (cursor);

  return allBlobs;
}

/**
 * Determine if a path is a text asset
 */
function isTextAsset(path: string): boolean {
  // Check if this is a text asset based on path pattern or extension
  return (
    path.includes('/text/') ||
    path.includes('/assets/text/') ||
    path.endsWith('.txt') ||
    path.endsWith('.md') ||
    path.includes('brainrot') ||
    path.includes('source-')
  );
}

/**
 * Determine if a path follows our standardized format
 */
function isStandardizedPath(path: string): boolean {
  // Check if the path follows our standardized format: assets/text/book-slug/file-name.txt
  return path.match(/^assets\/text\/[^/]+\/[^/]+\.(txt|md)$/) !== null;
}

/**
 * Determine the text type (source or brainrot)
 */
function getTextType(path: string): 'source' | 'brainrot' | 'unknown' {
  if (path.includes('brainrot') || path.includes('brainrot-')) {
    return 'brainrot';
  } else if (path.includes('source') || path.includes('source-')) {
    return 'source';
  }
  return 'unknown';
}

/**
 * Process a single blob and create an asset info object
 */
function processTextBlob(
  blob: { pathname: string; url: string; size: number; contentType?: string },
  bookSlugs: Set<string>,
  pathIssues: Record<string, string[]>
): TextAssetInfo {
  // Extract book slug from path
  const bookSlug = assetPathService.getBookSlugFromPath(blob.pathname);
  if (bookSlug) {
    bookSlugs.add(bookSlug);
  } else if (isStandardizedPath(blob.pathname)) {
    // This should never happen for a standardized path
    pathIssues.missingBookSlug.push(blob.pathname);
  }

  // Generate the standardized path for this asset
  let standardizedPath = blob.pathname;
  if (!isStandardizedPath(blob.pathname)) {
    standardizedPath = assetPathService.convertLegacyPath(blob.pathname);
    pathIssues.nonStandardPath.push(blob.pathname);

    // Check for inconsistent naming patterns
    if (
      blob.pathname.includes('text') &&
      !blob.pathname.includes('brainrot-') &&
      !blob.pathname.includes('source-')
    ) {
      pathIssues.inconsistentNaming.push(blob.pathname);
    }

    // Check for wrong file extensions
    if (!blob.pathname.endsWith('.txt') && !blob.pathname.endsWith('.md')) {
      pathIssues.wrongFileExtension.push(blob.pathname);
    }
  }

  // Create the asset info object
  return {
    path: blob.pathname,
    url: blob.url,
    size: blob.size,
    contentType: blob.contentType,
    bookSlug,
    isStandardized: isStandardizedPath(blob.pathname),
    standardizedPath,
    assetType: 'text',
    textType: getTextType(blob.pathname),
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
    assets: TextAssetInfo[];
  }
> {
  const byBook: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
      assets: TextAssetInfo[];
    }
  > = {};

  // Initialize all book entries
  bookSlugs.forEach((slug) => {
    byBook[slug] = {
      total: 0,
      standardized: 0,
      nonStandardized: 0,
      assets: [],
    };
  });

  // Add a special category for assets without a book slug
  byBook['unknown'] = {
    total: 0,
    standardized: 0,
    nonStandardized: 0,
    assets: [],
  };

  return byBook;
}

/**
 * Categorize assets by book
 */
function categorizeAssetsByBook(
  textAssets: TextAssetInfo[],
  byBook: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
      assets: TextAssetInfo[];
    }
  >
): void {
  textAssets.forEach((asset) => {
    const bookKey = asset.bookSlug || 'unknown';
    byBook[bookKey].total++;
    byBook[bookKey].assets.push(asset);

    if (asset.isStandardized) {
      byBook[bookKey].standardized++;
    } else {
      byBook[bookKey].nonStandardized++;
    }
  });
}

/**
 * Audit text assets in Vercel Blob storage
 */
async function auditTextAssets(options: AuditOptions): Promise<AuditResults> {
  auditLogger.info({ msg: 'Starting text asset audit...' });

  // List all blobs
  auditLogger.info({ msg: 'Listing all assets in Vercel Blob...' });
  const allBlobs = await listAllBlobs();
  auditLogger.info({ msg: `Found ${allBlobs.length} total assets` });

  // Filter for text assets
  const textBlobs = allBlobs.filter((blob) => isTextAsset(blob.pathname));
  auditLogger.info({ msg: `Found ${textBlobs.length} text assets` });

  // Analyze each text asset
  const textAssets: TextAssetInfo[] = [];
  const bookSlugs = new Set<string>();
  const pathIssues: Record<string, string[]> = {
    missingBookSlug: [],
    inconsistentNaming: [],
    nonStandardPath: [],
    wrongFileExtension: [],
  };

  // Process each blob and create asset info objects
  for (const blob of textBlobs) {
    const assetInfo = processTextBlob(blob, bookSlugs, pathIssues);
    textAssets.push(assetInfo);

    if (options.verbose) {
      auditLogger.info({
        msg: `${assetInfo.isStandardized ? '✓' : '✗'} ${assetInfo.path} ${
          assetInfo.needsReorganization ? `-> ${assetInfo.standardizedPath}` : ''
        }`,
      });
    }
  }

  // Organize by book
  const byBook = initializeBookData(bookSlugs);
  categorizeAssetsByBook(textAssets, byBook);

  // Prepare the results
  const results: AuditResults = {
    totalAssets: allBlobs.length,
    textAssets: textAssets.length,
    standardizedAssets: textAssets.filter((a) => a.isStandardized).length,
    nonStandardizedAssets: textAssets.filter((a) => !a.isStandardized).length,
    bookCount: bookSlugs.size,
    byBook,
    pathIssues,
  };

  return results;
}

/**
 * Create a detailed HTML report from the audit results
 */
function createHtmlReport(results: AuditResults): string {
  const standardizationRate =
    results.textAssets > 0
      ? Math.round((results.standardizedAssets / results.textAssets) * 100)
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
        <td>${asset.bookSlug || 'unknown'}</td>
        <td>${asset.textType}</td>
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
      <title>Text Assets Audit Report</title>
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
      <h1>Text Assets Audit Report</h1>
      
      <div class="summary">
        <h2>Summary</h2>
        <p>Total assets in Vercel Blob: <strong>${results.totalAssets}</strong></p>
        <p>Text assets: <strong>${results.textAssets}</strong></p>
        <p>Standardized assets: <strong class="success">${results.standardizedAssets}</strong></p>
        <p>Non-standardized assets: <strong class="${
          results.nonStandardizedAssets > 0 ? 'error' : 'success'
        }">${results.nonStandardizedAssets}</strong></p>
        <p>Standardization rate: <strong>${standardizationRate}%</strong></p>
        <p>Books with text assets: <strong>${results.bookCount}</strong></p>
      </div>
      
      <div class="actions">
        <h2>Recommended Actions</h2>
        <p>Run the path reorganization tool to standardize the paths of non-standardized assets:</p>
        <pre>npm run reorganize:blob -- --prefix="assets/text" --verbose</pre>
        ${
          results.nonStandardizedAssets > 0
            ? `<p>This will reorganize ${results.nonStandardizedAssets} text assets to follow the standardized path structure.</p>`
            : `<p>All text assets already follow the standardized path structure. No action needed.</p>`
        }
      </div>
      
      <h2>Assets by Book</h2>
      <table>
        <thead>
          <tr>
            <th>Book</th>
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
      
      <h2>Path Issues</h2>
      ${issuesSections}
      
      <h2>Assets Needing Reorganization (${reorgAssets.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Current Path</th>
            <th>Standardized Path</th>
            <th>Book</th>
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

    // Verbose mode is already in options.verbose

    auditLogger.info({ msg: 'Text Asset Audit Tool' });

    // Create output directory
    createOutputDirectory(options.outputDir);

    // Run the audit
    auditLogger.info({ msg: 'Analyzing text assets...' });
    const results = await auditTextAssets(options);

    // Save results to file
    const jsonPath = path.join(options.outputDir, 'text-assets-audit.json');
    saveReport(jsonPath, results);

    // Create HTML report
    const htmlReport = createHtmlReport(results);
    const htmlPath = path.join(options.outputDir, 'text-assets-audit.html');
    fs.writeFileSync(htmlPath, htmlReport);
    auditLogger.info({ msg: `Saved HTML report to ${htmlPath}` });

    // Print summary
    auditLogger.info({
      msg: 'Audit summary',
      summary: {
        totalAssets: results.totalAssets,
        textAssets: results.textAssets,
        standardizedAssets: results.standardizedAssets,
        nonStandardizedAssets: results.nonStandardizedAssets,
        standardizationRate:
          results.textAssets > 0
            ? Math.round((results.standardizedAssets / results.textAssets) * 100)
            : 0,
        reportsDir: options.outputDir,
      },
    });
  } catch (error) {
    auditLogger.error({
      msg: 'Error in text asset audit',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}
