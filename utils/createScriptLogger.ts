/**
 * Utility for creating script-specific loggers with consistent context
 */
// We don't use path directly, so we can remove this import
// import path from 'path';
import { Logger, logger as rootLogger } from './logger.js';

export interface ScriptLoggerOptions {
  /**
   * Script file name or identifier (if not provided, attempts to determine from call stack)
   */
  scriptName?: string;

  /**
   * Optional task ID for tracking (e.g., "T046")
   */
  taskId?: string;

  /**
   * Optional context category (e.g., "migration", "verification", "audit")
   */
  context?: 'migration' | 'verification' | 'audit' | 'utility' | 'test' | string;

  /**
   * Additional context properties to include in all logs
   */
  additionalContext?: Record<string, unknown>;
}

/**
 * Creates a script-specific logger with consistent context
 *
 * @param options Options for the script logger
 * @returns A logger instance with script-specific context
 */
export function createScriptLogger(options: ScriptLoggerOptions = {}): Logger {
  // Attempt to determine script name from call stack if not provided
  let scriptName = options.scriptName;

  if (!scriptName) {
    try {
      // Get the call stack (split by newlines and remove first line which is this function)
      const stack = new Error().stack?.split('\n').slice(1) || [];

      // Find the first file path in the stack trace
      const filePath = stack.find((line) => {
        const match = line.match(/\((.+\.(js|ts))/);
        return match && match[1];
      });

      if (filePath) {
        // Extract the filename from the path
        const match = filePath.match(/[/\\]([^/\\]+)\.(js|ts)/);
        if (match) {
          scriptName = match[1];
        }
      }
    } catch {
      // If auto-detection fails, use a default name
      scriptName = 'unknown-script';
    }
  }

  // Create the context object with all provided properties
  const context: Record<string, unknown> = {
    module: scriptName,
    script: scriptName, // Include both names for backward compatibility
    ...options.additionalContext,
  };

  // Add optional properties
  if (options.taskId) {
    context.taskId = options.taskId;
  }

  if (options.context) {
    context.category = options.context;
  }

  // Create and return the logger
  return rootLogger.child(context);
}

export default createScriptLogger;
