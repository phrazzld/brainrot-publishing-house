/**
 * Blob Path Reorganization Tool
 *
 * This script reorganizes assets within Vercel Blob to follow the new unified path structure.
 * It uses the AssetPathService to map current paths to the new standardized format,
 * and supports dry-run mode to preview changes without executing them.
 */
import path from 'path';

import { listAllBlobs, mapPaths } from './blob-reorganizer/blob-operations.js';
// Import utilities from our modular organization
import { parseArgs } from './blob-reorganizer/cli.js';
import { createOutputDirectory, saveHtmlReport, saveReport } from './blob-reorganizer/file-utils.js';
import { logger as _logger } from './blob-reorganizer/logging.js';
import { createHtmlReport, reorganizeBlobs } from './blob-reorganizer/reporting.js';

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const options = parseArgs();

    logger.info({ msg: 'Blob Path Reorganization Tool' });
    logger.info({ msg: `Mode: ${options.dryRun ? 'Dry Run' : 'Execution'}` });

    // Create output directory
    createOutputDirectory(options.outputDir);

    // List all blobs
    logger.info({ msg: 'Listing blobs...' });
    const blobs = await listAllBlobs({
      prefix: options.prefix,
      limit: options.limit,
    });
    logger.info({ msg: `Found ${blobs.length} blobs` });

    // Map paths
    logger.info({ msg: 'Mapping paths...' });
    const mappings = mapPaths(blobs);
    logger.info({ msg: `Generated ${mappings.length} path mappings` });

    // Save mappings to file
    const mappingsPath = path.join(options.outputDir, 'path-mappings.json');
    saveReport(mappingsPath, { mappings } as unknown as Record<string, unknown>);

    // Reorganize blobs
    logger.info({ msg: 'Reorganizing blobs...' });
    const stats = await reorganizeBlobs(mappings, options);
    logger.info({
      msg: `Reorganization complete: ${stats.movedAssets}/${stats.totalAssets} assets moved`,
    });

    // Save stats to file
    const statsPath = path.join(options.outputDir, 'reorganization-stats.json');
    saveReport(statsPath, stats as unknown as Record<string, unknown>);

    // Create HTML report
    const htmlReport = createHtmlReport(stats, mappings, options);
    const htmlPath = path.join(options.outputDir, 'reorganization-report.html');
    saveHtmlReport(htmlPath, htmlReport);

    logger.info({ msg: 'Blob path reorganization complete!' });

    // Print summary
    logger.info({
      msg: `
Summary:
  Total assets: ${stats.totalAssets}
  Processed: ${stats.processedAssets}
  Moved: ${stats.movedAssets}
  Failed: ${stats.failedAssets}
  
Reports saved to: ${options.outputDir}
  
${options.dryRun ? 'This was a dry run. No changes were made.' : ''}
    `,
    });
  } catch (error) {
    logger.error({ msg: 'Error in blob path reorganization:', error });
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}
