/**
 * Logging utilities for the blob reorganization tool
 */
import { createRequestLogger } from '../../utils/logger';

/**
 * Logger instance for the blob reorganization tool
 */
export const logger = createRequestLogger('blob-reorganize');

/**
 * Log levels for the blob reorganization tool
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Safely logs messages, handling any logger errors
 */
export function safeLog(level: LogLevel, data: Record<string, unknown>): void {
  try {
    logger[level](data);
  } catch {
    // Fallback to console if logger fails
    console.error(`[${level.toUpperCase()}]`, data);
  }
}
