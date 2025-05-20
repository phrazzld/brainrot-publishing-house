/**
 * Reporting utilities for the blob reorganization tool
 */
import { moveBlob } from './blob-operations';
import { logger as _logger } from './logging';
import { CliOptions, MigrationStats, PathMapping } from './types';

/**
 * Format bytes to a human-readable form
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Reorganize blobs based on path mappings
 */
export async function reorganizeBlobs(
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
      logger.info({
        msg: `Progress: ${stats.processedAssets}/${stats.totalAssets} assets processed`,
      });
    }
  }

  return stats;
}

/**
 * Create a detailed HTML report from the stats
 */
export function createHtmlReport(
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
        <p>Failed assets: <strong class="${stats.failedAssets > 0 ? 'error' : 'success'}">${
          stats.failedAssets
        }</strong></p>
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
