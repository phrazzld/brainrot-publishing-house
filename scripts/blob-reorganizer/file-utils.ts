/**
 * File utilities for the blob reorganization tool
 */
import fs from 'fs';

import { logger as _logger } from './logging';

/**
 * Create output directory for reports if it doesn't exist
 */
export function createOutputDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info({ msg: `Created output directory: ${dirPath}` });
  }
}

/**
 * Save report data to a JSON file
 */
export function saveReport(filePath: string, content: Record<string, unknown>): void {
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  logger.info({ msg: `Saved report to ${filePath}` });
}

/**
 * Save HTML content to a file
 */
export function saveHtmlReport(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content);
  logger.info({ msg: `Saved HTML report to ${filePath}` });
}
