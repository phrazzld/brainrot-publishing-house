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

// Type definitions for report collections and metrics
interface ReportCollection {
  text: AuditReport;
  image: AuditReport;
  audio: AuditReport;
}

interface AssetMetrics {
  totalAssets: number;
  totalTextAssets: number;
  totalImageAssets: number;
  totalAudioAssets: number;
  standardizedTextAssets: number;
  standardizedImageAssets: number;
  standardizedAudioAssets: number;
  nonStandardizedTextAssets: number;
  nonStandardizedImageAssets: number;
  nonStandardizedAudioAssets: number;
  totalSpecificAssets: number;
  totalStandardizedAssets: number;
  totalNonStandardizedAssets: number;
  overallStandardizationRate: number;
}

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
      fs.readFileSync(path.join('./text-assets-audit', 'text-assets-audit.json'), 'utf8'),
    ) as AuditReport;
    const imageReport = JSON.parse(
      fs.readFileSync(path.join('./image-assets-audit', 'image-assets-audit.json'), 'utf8'),
    ) as AuditReport;
    const audioReport = JSON.parse(
      fs.readFileSync(path.join('./audio-assets-audit', 'audio-assets-audit.json'), 'utf8'),
    ) as AuditReport;

    return { text: textReport, image: imageReport, audio: audioReport };
  } catch (error) {
    logger.error({ message: 'Error reading audit reports', error });
    throw new Error('Failed to read audit reports, please run audit tools first');
  }
}

/**
 * Calculate asset metrics from audit reports
 */
function calculateAssetMetrics(reports: ReportCollection): AssetMetrics {
  // Extract base metrics from reports
  const totalAssets = reports.text.totalAssets; // Should be the same in all reports
  const totalTextAssets = reports.text.textAssets;
  const totalImageAssets = reports.image.imageAssets;
  const totalAudioAssets = reports.audio.audioAssets;

  const standardizedTextAssets = reports.text.standardizedAssets;
  const standardizedImageAssets = reports.image.standardizedAssets;
  const standardizedAudioAssets = reports.audio.standardizedAssets;

  const nonStandardizedTextAssets = reports.text.nonStandardizedAssets;
  const nonStandardizedImageAssets = reports.image.nonStandardizedAssets;
  const nonStandardizedAudioAssets = reports.audio.nonStandardizedAssets;

  // Calculate derived metrics
  const totalSpecificAssets = totalTextAssets + totalImageAssets + totalAudioAssets;
  const totalStandardizedAssets =
    standardizedTextAssets + standardizedImageAssets + standardizedAudioAssets;
  const totalNonStandardizedAssets =
    nonStandardizedTextAssets + nonStandardizedImageAssets + nonStandardizedAudioAssets;
  const overallStandardizationRate =
    totalSpecificAssets > 0 ? Math.round((totalStandardizedAssets / totalSpecificAssets) * 100) : 0;

  return {
    totalAssets,
    totalTextAssets,
    totalImageAssets,
    totalAudioAssets,
    standardizedTextAssets,
    standardizedImageAssets,
    standardizedAudioAssets,
    nonStandardizedTextAssets,
    nonStandardizedImageAssets,
    nonStandardizedAudioAssets,
    totalSpecificAssets,
    totalStandardizedAssets,
    totalNonStandardizedAssets,
    overallStandardizationRate,
  };
}

/**
 * Create a standardized command for the reorganization blob tool
 */
function createReorganizationCommand(prefix: string, verbose: boolean = false): string {
  return `npm run reorganize:blob -- --prefix="${prefix}"${verbose ? ' --verbose' : ''}`;
}

/**
 * Generate commands for text asset reorganization
 */
function generateTextAssetCommands(report: AuditReport): string[] {
  const commands: string[] = [];

  if (report.nonStandardizedAssets > 0) {
    commands.push(createReorganizationCommand('assets/text'));

    // Add specific commands for any legacy patterns found
    for (const path of report.pathIssues.nonStandardPath) {
      if (path.includes('/books/') && path.includes('/text/')) {
        commands.push(createReorganizationCommand('books'));
      } else if (path.match(/^[^/]+\/text\//)) {
        commands.push(createReorganizationCommand('text'));
      }
    }
  }

  return commands;
}

/**
 * Generate commands for image asset reorganization
 */
function generateImageAssetCommands(report: AuditReport): string[] {
  const commands: string[] = [];

  if (report.nonStandardizedAssets > 0) {
    commands.push(createReorganizationCommand('assets/image'));
    commands.push(createReorganizationCommand('assets/shared'));
    commands.push(createReorganizationCommand('assets/site'));

    // Add specific commands for any legacy patterns found
    for (const path of report.pathIssues.nonStandardPath) {
      if (path.includes('/images/')) {
        commands.push(createReorganizationCommand('images'));
      } else if (path.includes('/site-assets/')) {
        commands.push(createReorganizationCommand('site-assets'));
      } else if (path.includes('/books/')) {
        commands.push(createReorganizationCommand('books'));
      }
    }
  }

  return commands;
}

/**
 * Generate commands for audio asset reorganization
 */
function generateAudioAssetCommands(report: AuditReport): string[] {
  const commands: string[] = [];

  if (report.nonStandardizedAssets > 0) {
    commands.push(createReorganizationCommand('assets/audio'));

    // Add specific commands for any legacy patterns found
    for (const path of report.pathIssues.nonStandardPath) {
      if (path.match(/^[^/]+\/audio\//)) {
        commands.push(createReorganizationCommand('audio'));
      } else if (path.includes('/books/') && path.includes('/audio/')) {
        commands.push(createReorganizationCommand('books'));
      }
    }
  }

  return commands;
}

/**
 * Combine all asset commands and remove duplicates
 */
function generateAllReorganizationCommands(reports: ReportCollection): string[] {
  const textCommands = generateTextAssetCommands(reports.text);
  const imageCommands = generateImageAssetCommands(reports.image);
  const audioCommands = generateAudioAssetCommands(reports.audio);

  const allCommands = [...textCommands, ...imageCommands, ...audioCommands];

  // Remove duplicate commands
  return [...new Set(allCommands)];
}

/**
 * Create the summary section of the plan
 */
function createPlanSummary(metrics: AssetMetrics, reports: ReportCollection): string {
  return `
## Summary

- **Total Assets in Vercel Blob**: ${metrics.totalAssets}
- **Assets Audited**: ${metrics.totalSpecificAssets}
  - Text Assets: ${metrics.totalTextAssets} (${reports.text.standardizedAssets} standardized, ${reports.text.nonStandardizedAssets} non-standardized)
  - Image Assets: ${metrics.totalImageAssets} (${reports.image.standardizedAssets} standardized, ${reports.image.nonStandardizedAssets} non-standardized)
  - Audio Assets: ${metrics.totalAudioAssets} (${reports.audio.standardizedAssets} standardized, ${reports.audio.nonStandardizedAssets} non-standardized)
- **Overall Standardization Rate**: ${metrics.overallStandardizationRate}%`;
}

/**
 * Create the commands section of the plan
 */
function createPlanCommands(commands: string[]): string {
  return `
## Reorganization Steps

The following commands should be run in order to standardize all asset paths:

\`\`\`bash
# First, run in dry-run mode to preview changes (recommended)
${commands.map((cmd) => `${cmd} --dry-run`).join('\n')}

# Then run the actual reorganization commands
${commands.join('\n')}
\`\`\``;
}

/**
 * Create the verification section of the plan
 */
function createPlanVerification(): string {
  return `
## Verification

After running these commands, run the audit tools again to verify that all assets are standardized:

\`\`\`bash
npm run audit:all
\`\`\``;
}

/**
 * Create the detailed reports section of the plan
 */
function createPlanDetailedReports(): string {
  return `
## Detailed Reports

Detailed audit reports are available at:
- Text Assets: ./text-assets-audit/text-assets-audit.html
- Image Assets: ./image-assets-audit/image-assets-audit.html
- Audio Assets: ./audio-assets-audit/audio-assets-audit.html`;
}

/**
 * Generate reorganization plan
 */
function generateReorganizationPlan(reports: ReportCollection, _options: PlanOptions): string {
  // Calculate metrics
  const metrics = calculateAssetMetrics(reports);

  // Generate commands
  const commands = generateAllReorganizationCommands(reports);

  // Create the plan
  return `
# Asset Reorganization Plan

## Overview

This plan outlines the steps needed to standardize asset paths in Vercel Blob storage.
Based on the audit results, there are ${metrics.totalNonStandardizedAssets} assets that need to be reorganized.
${createPlanSummary(metrics, reports)}
${createPlanCommands(commands)}
${createPlanVerification()}
${createPlanDetailedReports()}`;
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
