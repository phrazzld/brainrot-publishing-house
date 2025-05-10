/**
 * Audio Asset Audit Tool
 *
 * This script audits the current state of audio assets in Vercel Blob storage,
 * identifies inconsistently named files, and generates a report of actions needed
 * to standardize the paths according to our unified path structure.
 */
/* eslint-disable max-lines */
import fs from 'fs';
import path from 'path';

import { logger as _logger, createRequestLogger } from '../utils/logger';
import { AssetPathService } from '../utils/services/AssetPathService';
import { blobService } from '../utils/services/BlobService';

// Configure logger
const auditLogger = createRequestLogger('audio-audit');

// Initialize services
const assetPathService = new AssetPathService();

interface AuditOptions {
  outputDir: string;
  verbose: boolean;
}

interface AudioAssetInfo {
  path: string;
  url: string;
  size: number;
  contentType: string;
  bookSlug: string | null;
  isStandardized: boolean;
  standardizedPath: string;
  assetType: 'audio' | 'unknown';
  audioType: 'chapter' | 'full' | 'unknown';
  needsReorganization: boolean;
}

interface AuditResults {
  totalAssets: number;
  audioAssets: number;
  standardizedAssets: number;
  nonStandardizedAssets: number;
  bookCount: number;
  byBook: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
      assets: AudioAssetInfo[];
    }
  >;
  byAudioType: Record<
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
    outputDir: './audio-assets-audit',
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
Audio Asset Audit Tool

This script audits the current state of audio assets in Vercel Blob storage,
identifies inconsistently named files, and generates a report of actions needed
to standardize the paths according to our unified path structure.

Options:
  --output, -o           Directory for reports (default: ./audio-assets-audit)
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
 * Determine if a path is an audio asset
 */
function isAudioAsset(path: string, contentType: string = ''): boolean {
  // Check if this is an audio asset based on path pattern or extension
  const hasAudioExtension = /\.(mp3|wav|ogg|m4a|flac)$/i.test(path);
  const isInAudioPath = path.includes('/audio/') || path.includes('/assets/audio/');

  // Content type check is optional since Vercel Blob API doesn't return it
  const isAudioContentType = contentType
    ? contentType.startsWith('audio/') || contentType === 'application/octet-stream'
    : false;

  return isAudioContentType || hasAudioExtension || isInAudioPath;
}

/**
 * Determine if a path follows our standardized format
 */
function isStandardizedPath(path: string): boolean {
  // Check if the path follows our standardized format: assets/audio/book-slug/file-name.ext
  return path.match(/^assets\/audio\/[^/]+\/[^/]+\.(mp3|wav|ogg|m4a|flac)$/i) !== null;
}

/**
 * Determine the audio type
 */
function getAudioType(path: string): 'chapter' | 'full' | 'unknown' {
  if (path.includes('full-audiobook') || path.includes('full.mp3') || path.includes('complete')) {
    return 'full';
  } else if (
    path.includes('chapter') ||
    path.match(/chapter-\d+\.(mp3|wav|ogg|m4a|flac)/i) ||
    path.match(/\d+\.(mp3|wav|ogg|m4a|flac)/i)
  ) {
    return 'chapter';
  }
  return 'unknown';
}

/**
 * Process a single blob and create an asset info object
 */
function processAudioBlob(
  blob: { pathname: string; url: string; size: number; downloadUrl?: string; uploadedAt?: Date },
  bookSlugs: Set<string>,
  pathIssues: Record<string, string[]>
): AudioAssetInfo {
  // Extract book slug from path
  const bookSlug = assetPathService.getBookSlugFromPath(blob.pathname);
  if (bookSlug) {
    bookSlugs.add(bookSlug);
  } else {
    // Audio files should always have a book slug
    pathIssues.missingBookSlug.push(blob.pathname);
  }

  // Generate the standardized path for this asset
  let standardizedPath = blob.pathname;
  if (!isStandardizedPath(blob.pathname)) {
    standardizedPath = assetPathService.convertLegacyPath(blob.pathname);
    pathIssues.nonStandardPath.push(blob.pathname);

    // Check for files not using chapter- prefix
    if (
      blob.pathname.includes('/audio/') &&
      !blob.pathname.includes('chapter-') &&
      !blob.pathname.includes('full-audiobook') &&
      !blob.pathname.includes('complete')
    ) {
      pathIssues.inconsistentNaming.push(blob.pathname);
    }

    // Check for wrong file extensions
    if (!blob.pathname.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
      pathIssues.wrongFileExtension.push(blob.pathname);
    }
  }

  const audioType = getAudioType(blob.pathname);

  // Create the asset info object
  return {
    path: blob.pathname,
    url: blob.url,
    size: blob.size,
    contentType: 'audio/mpeg', // Default for MP3 files
    bookSlug,
    isStandardized: isStandardizedPath(blob.pathname),
    standardizedPath,
    assetType: 'audio',
    audioType,
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
    assets: AudioAssetInfo[];
  }
> {
  const byBook: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
      assets: AudioAssetInfo[];
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
 * Initialize audio type statistics
 */
function initializeAudioTypeStats(): Record<
  string,
  {
    total: number;
    standardized: number;
    nonStandardized: number;
  }
> {
  return {
    chapter: { total: 0, standardized: 0, nonStandardized: 0 },
    full: { total: 0, standardized: 0, nonStandardized: 0 },
    unknown: { total: 0, standardized: 0, nonStandardized: 0 },
  };
}

/**
 * Categorize assets by book and type
 */
function categorizeAssets(
  audioAssets: AudioAssetInfo[],
  byBook: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
      assets: AudioAssetInfo[];
    }
  >,
  byAudioType: Record<
    string,
    {
      total: number;
      standardized: number;
      nonStandardized: number;
    }
  >
): void {
  audioAssets.forEach((asset) => {
    // Categorize by book
    const bookKey = asset.bookSlug || 'unknown';
    byBook[bookKey].total++;
    byBook[bookKey].assets.push(asset);

    if (asset.isStandardized) {
      byBook[bookKey].standardized++;
    } else {
      byBook[bookKey].nonStandardized++;
    }

    // Categorize by audio type
    byAudioType[asset.audioType].total++;
    if (asset.isStandardized) {
      byAudioType[asset.audioType].standardized++;
    } else {
      byAudioType[asset.audioType].nonStandardized++;
    }
  });
}

/**
 * Audit audio assets in Vercel Blob storage
 */
async function auditAudioAssets(options: AuditOptions): Promise<AuditResults> {
  auditLogger.info({ msg: 'Starting audio asset audit...' });

  // List all blobs
  auditLogger.info({ msg: 'Listing all assets in Vercel Blob...' });
  const allBlobs = await listAllBlobs();
  auditLogger.info({ msg: `Found ${allBlobs.length} total assets` });

  // Filter for audio assets
  const audioBlobs = allBlobs.filter((blob) => isAudioAsset(blob.pathname || '', ''));
  auditLogger.info({ msg: `Found ${audioBlobs.length} audio assets` });

  // Analyze each audio asset
  const audioAssets: AudioAssetInfo[] = [];
  const bookSlugs = new Set<string>();
  const pathIssues: Record<string, string[]> = {
    missingBookSlug: [],
    inconsistentNaming: [],
    nonStandardPath: [],
    wrongFileExtension: [],
  };

  // Process each blob
  for (const blob of audioBlobs) {
    const assetInfo = processAudioBlob(blob, bookSlugs, pathIssues);
    audioAssets.push(assetInfo);

    if (options.verbose) {
      auditLogger.info({
        msg: `${assetInfo.isStandardized ? '✓' : '✗'} ${assetInfo.path} ${
          assetInfo.needsReorganization ? `-> ${assetInfo.standardizedPath}` : ''
        }`,
      });
    }
  }

  // Initialize data structures
  const byBook = initializeBookData(bookSlugs);
  const byAudioType = initializeAudioTypeStats();

  // Categorize assets
  categorizeAssets(audioAssets, byBook, byAudioType);

  // Prepare the results
  const results: AuditResults = {
    totalAssets: allBlobs.length,
    audioAssets: audioAssets.length,
    standardizedAssets: audioAssets.filter((a) => a.isStandardized).length,
    nonStandardizedAssets: audioAssets.filter((a) => !a.isStandardized).length,
    bookCount: bookSlugs.size,
    byBook,
    byAudioType,
    pathIssues,
  };

  return results;
}

/**
 * Create a detailed HTML report from the audit results
 */
function createHtmlReport(results: AuditResults): string {
  const standardizationRate =
    results.audioAssets > 0
      ? Math.round((results.standardizedAssets / results.audioAssets) * 100)
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

  // Create a table of audio types
  const audioTypeRows = Object.entries(results.byAudioType)
    .map(([audioType, info]) => {
      const standardizationRate =
        info.total > 0 ? Math.round((info.standardized / info.total) * 100) : 0;

      return `
        <tr>
          <td>${audioType}</td>
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
        <td>${asset.bookSlug || 'unknown'}</td>
        <td>${asset.audioType}</td>
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
      <title>Audio Assets Audit Report</title>
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
      <h1>Audio Assets Audit Report</h1>
      
      <div class="summary">
        <h2>Summary</h2>
        <p>Total assets in Vercel Blob: <strong>${results.totalAssets}</strong></p>
        <p>Audio assets: <strong>${results.audioAssets}</strong></p>
        <p>Standardized assets: <strong class="success">${results.standardizedAssets}</strong></p>
        <p>Non-standardized assets: <strong class="${
          results.nonStandardizedAssets > 0 ? 'error' : 'success'
        }">${results.nonStandardizedAssets}</strong></p>
        <p>Standardization rate: <strong>${standardizationRate}%</strong></p>
        <p>Books with audio assets: <strong>${results.bookCount}</strong></p>
      </div>
      
      <div class="actions">
        <h2>Recommended Actions</h2>
        <p>Run the path reorganization tool to standardize the paths of non-standardized assets:</p>
        <pre>npm run reorganize:blob -- --prefix="assets/audio" --verbose</pre>
        <pre>npm run reorganize:blob -- --prefix="audio" --verbose</pre>
        ${
          results.nonStandardizedAssets > 0
            ? `<p>This will reorganize ${results.nonStandardizedAssets} audio assets to follow the standardized path structure.</p>`
            : `<p>All audio assets already follow the standardized path structure. No action needed.</p>`
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
      
      <h2>Assets by Audio Type</h2>
      <table>
        <thead>
          <tr>
            <th>Audio Type</th>
            <th>Total Assets</th>
            <th>Standardized</th>
            <th>Non-Standardized</th>
            <th>Standardization Rate</th>
          </tr>
        </thead>
        <tbody>
          ${audioTypeRows}
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

    // We don't need to set log level for this simplified implementation

    auditLogger.info({ msg: 'Audio Asset Audit Tool' });

    // Create output directory
    createOutputDirectory(options.outputDir);

    // Run the audit
    auditLogger.info({ msg: 'Analyzing audio assets...' });
    const results = await auditAudioAssets(options);

    // Save results to file
    const jsonPath = path.join(options.outputDir, 'audio-assets-audit.json');
    saveReport(jsonPath, results);

    // Create HTML report
    const htmlReport = createHtmlReport(results);
    const htmlPath = path.join(options.outputDir, 'audio-assets-audit.html');
    fs.writeFileSync(htmlPath, htmlReport);
    auditLogger.info({ msg: `Saved HTML report to ${htmlPath}` });

    // Print summary
    auditLogger.info({
      msg: `
Summary:
  Total assets: ${results.totalAssets}
  Audio assets: ${results.audioAssets}
  Standardized: ${results.standardizedAssets}
  Non-standardized: ${results.nonStandardizedAssets}
  Standardization rate: ${
    results.audioAssets > 0
      ? Math.round((results.standardizedAssets / results.audioAssets) * 100)
      : 0
  }%
  
Reports saved to: ${options.outputDir}
    `,
    });
  } catch (error) {
    auditLogger.error({ msg: 'Error in audio asset audit', error: String(error) });
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}
