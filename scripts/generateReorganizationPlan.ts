/**
 * Asset Reorganization Plan Generator
 *
 * This script runs all audit tools and generates a comprehensive
 * reorganization plan with specific commands to standardize
 * all asset paths in Vercel Blob.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import logger, { createRequestLogger } from '../utils/logger';

// Configure logger for the reorganization planning process
const _planLogger = createRequestLogger('reorg-plan');

interface PlanOptions {
  outputDir: string;
  verbose: boolean;
  runAudits: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): PlanOptions {
  const args = process.argv.slice(2);
  const options: PlanOptions = {
    outputDir: './asset-reorganization-plan',
    verbose: false,
    runAudits: true,
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
      case '--skip-audits':
      case '-s':
        options.runAudits = false;
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
  logger.info({
    message: `
Asset Reorganization Plan Generator

This script runs all audit tools and generates a comprehensive
reorganization plan with specific commands to standardize
all asset paths in Vercel Blob.

Options:
  --output, -o           Directory for the reorganization plan (default: ./asset-reorganization-plan)
  --verbose, -v          Enable verbose logging
  --skip-audits, -s      Skip running audit tools (use existing reports)
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
    logger.info({ message: `Created output directory: ${dirPath}` });
  }
}

/**
 * Run all asset audit tools
 */
async function runAuditTools(verbose: boolean): Promise<void> {
  logger.info({ message: 'Running asset audit tools...' });

  const verboseFlag = verbose ? ' --verbose' : '';

  try {
    logger.info({ message: 'Running text asset audit...' });
    execSync(`npx tsx scripts/auditTextAssets.ts${verboseFlag}`, { stdio: 'inherit' });

    logger.info({ message: 'Running image asset audit...' });
    execSync(`npx tsx scripts/auditImageAssets.ts${verboseFlag}`, { stdio: 'inherit' });

    logger.info({ message: 'Running audio asset audit...' });
    execSync(`npx tsx scripts/auditAudioAssets.ts${verboseFlag}`, { stdio: 'inherit' });

    logger.info({ message: 'All audit tools completed successfully' });
  } catch (error) {
    logger.error({ message: 'Error running audit tools', error });
    throw new Error('Failed to run audit tools');
  }
}

interface AuditReport {
  totalAssets: number;
  textAssets: number;
  imageAssets: number;
  audioAssets: number;
  standardizedAssets: number;
  nonStandardizedAssets: number;
  pathIssues: {
    nonStandardPath: string[];
  };
}

/**
 * Read audit reports
 */
function readAuditReports(): {
  text: AuditReport;
  image: AuditReport;
  audio: AuditReport;
} {
  try {
    const textReport = JSON.parse(
      fs.readFileSync(path.join('./text-assets-audit', 'text-assets-audit.json'), 'utf8')
    ) as AuditReport;
    const imageReport = JSON.parse(
      fs.readFileSync(path.join('./image-assets-audit', 'image-assets-audit.json'), 'utf8')
    ) as AuditReport;
    const audioReport = JSON.parse(
      fs.readFileSync(path.join('./audio-assets-audit', 'audio-assets-audit.json'), 'utf8')
    ) as AuditReport;

    return { text: textReport, image: imageReport, audio: audioReport };
  } catch (error) {
    logger.error({ message: 'Error reading audit reports', error });
    throw new Error('Failed to read audit reports, please run audit tools first');
  }
}

/**
 * Generate reorganization plan
 */
function generateReorganizationPlan(
  reports: {
    text: AuditReport;
    image: AuditReport;
    audio: AuditReport;
  },
  _options: PlanOptions
): string {
  // Calculate total metrics
  const totalAssets = reports.text.totalAssets; // This should be the same in all reports
  const totalTextAssets = reports.text.textAssets;
  const totalImageAssets = reports.image.imageAssets;
  const totalAudioAssets = reports.audio.audioAssets;

  const standardizedTextAssets = reports.text.standardizedAssets;
  const standardizedImageAssets = reports.image.standardizedAssets;
  const standardizedAudioAssets = reports.audio.standardizedAssets;

  const nonStandardizedTextAssets = reports.text.nonStandardizedAssets;
  const nonStandardizedImageAssets = reports.image.nonStandardizedAssets;
  const nonStandardizedAudioAssets = reports.audio.nonStandardizedAssets;

  // Calculate overall stats
  const totalSpecificAssets = totalTextAssets + totalImageAssets + totalAudioAssets;
  const totalStandardizedAssets =
    standardizedTextAssets + standardizedImageAssets + standardizedAudioAssets;
  const totalNonStandardizedAssets =
    nonStandardizedTextAssets + nonStandardizedImageAssets + nonStandardizedAudioAssets;
  const overallStandardizationRate =
    totalSpecificAssets > 0 ? Math.round((totalStandardizedAssets / totalSpecificAssets) * 100) : 0;

  // Generate reorganization commands
  const createCommand = (prefix: string, verbose: boolean = false): string => {
    return `npm run reorganize:blob -- --prefix="${prefix}"${verbose ? ' --verbose' : ''}`;
  };

  // Build commands based on audit results
  const commands: string[] = [];

  // Text asset commands
  if (nonStandardizedTextAssets > 0) {
    commands.push(createCommand('assets/text'));

    // Add specific commands for any legacy patterns found
    for (const path of reports.text.pathIssues.nonStandardPath) {
      if (path.includes('/books/') && path.includes('/text/')) {
        commands.push(createCommand('books'));
      } else if (path.match(/^[^/]+\/text\//)) {
        commands.push(createCommand('text'));
      }
    }
  }

  // Image asset commands
  if (nonStandardizedImageAssets > 0) {
    commands.push(createCommand('assets/image'));
    commands.push(createCommand('assets/shared'));
    commands.push(createCommand('assets/site'));

    // Add specific commands for any legacy patterns found
    for (const path of reports.image.pathIssues.nonStandardPath) {
      // Check for specific patterns and add appropriate commands
      if (path.includes('/images/')) {
        commands.push(createCommand('images'));
      } else if (path.includes('/site-assets/')) {
        commands.push(createCommand('site-assets'));
      } else if (path.includes('/books/')) {
        commands.push(createCommand('books'));
      }
    }
  }

  // Audio asset commands
  if (nonStandardizedAudioAssets > 0) {
    commands.push(createCommand('assets/audio'));

    // Add specific commands for any legacy patterns found
    for (const path of reports.audio.pathIssues.nonStandardPath) {
      if (path.match(/^[^/]+\/audio\//)) {
        commands.push(createCommand('audio'));
      } else if (path.includes('/books/') && path.includes('/audio/')) {
        commands.push(createCommand('books'));
      }
    }
  }

  // Remove duplicate commands
  const uniqueCommands = [...new Set(commands)];

  // Create a reorganization plan
  return `
# Asset Reorganization Plan

## Overview

This plan outlines the steps needed to standardize asset paths in Vercel Blob storage.
Based on the audit results, there are ${totalNonStandardizedAssets} assets that need to be reorganized.

## Summary

- **Total Assets in Vercel Blob**: ${totalAssets}
- **Assets Audited**: ${totalSpecificAssets}
  - Text Assets: ${totalTextAssets} (${reports.text.standardizedAssets} standardized, ${reports.text.nonStandardizedAssets} non-standardized)
  - Image Assets: ${totalImageAssets} (${reports.image.standardizedAssets} standardized, ${reports.image.nonStandardizedAssets} non-standardized)
  - Audio Assets: ${totalAudioAssets} (${reports.audio.standardizedAssets} standardized, ${reports.audio.nonStandardizedAssets} non-standardized)
- **Overall Standardization Rate**: ${overallStandardizationRate}%

## Reorganization Steps

The following commands should be run in order to standardize all asset paths:

\`\`\`bash
# First, run in dry-run mode to preview changes (recommended)
${uniqueCommands.map((cmd) => `${cmd} --dry-run`).join('\n')}

# Then run the actual reorganization commands
${uniqueCommands.join('\n')}
\`\`\`

## Verification

After running these commands, run the audit tools again to verify that all assets are standardized:

\`\`\`bash
npm run audit:all
\`\`\`

## Detailed Reports

Detailed audit reports are available at:
- Text Assets: ./text-assets-audit/text-assets-audit.html
- Image Assets: ./image-assets-audit/image-assets-audit.html
- Audio Assets: ./audio-assets-audit/audio-assets-audit.html
`;
}

/**
 * Save report to file
 */
function saveReport(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content);
  logger.info({ message: `Saved reorganization plan to ${filePath}` });
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const options = parseArgs();

    // Set log level if in server environment
    // We can't directly set the log level with our custom logger interface

    logger.info({ message: 'Asset Reorganization Plan Generator' });

    // Create output directory
    createOutputDirectory(options.outputDir);

    // Run audit tools if not skipped
    if (options.runAudits) {
      await runAuditTools(options.verbose);
    } else {
      logger.info({ message: 'Skipping audit tools, using existing reports' });
    }

    // Read audit reports
    const reports = readAuditReports();

    // Generate reorganization plan
    const plan = generateReorganizationPlan(reports, options);

    // Save plan to file
    const planPath = path.join(options.outputDir, 'reorganization-plan.md');
    saveReport(planPath, plan);

    logger.info({
      message: `
Asset Reorganization Plan generated successfully!
 
Open the plan at: ${planPath}
    `,
    });
  } catch (error) {
    logger.error({ message: 'Error generating reorganization plan', error });
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}
