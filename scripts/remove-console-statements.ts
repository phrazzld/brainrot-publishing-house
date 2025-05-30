#!/usr/bin/env tsx
/**
 * Script to replace console statements with structured logger calls
 * Usage: npx tsx scripts/remove-console-statements.ts [options]
 *
 * Options:
 *   --fix            Apply the changes to files (default: just report)
 *   --dry-run        Show what would be changed without modifying files
 *   --verbose        Show detailed output during processing
 *   --path=dir       Process only files in the specified directory
 *
 * This script identifies all console.log, console.error, console.warn, and other console
 * statements in the codebase and replaces them with appropriate structured logger calls.
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

import { createScriptLogger } from '../utils/createScriptLogger.js';

// Create a script-specific logger
const logger = createScriptLogger({
  taskId: 'T046',
  context: 'utility',
});

// File patterns to process
const _FILE_PATTERNS = ['ts', 'tsx', 'js', 'jsx'].map((ext) => `--include="*.${ext}"`).join(' ');

// Directories to exclude
const _EXCLUDED_DIRS = ['node_modules', '.next', '.git', 'dist', 'build']
  .map((dir) => `--exclude-dir="${dir}"`)
  .join(' ');

// Command line options
interface Options {
  fix: boolean;
  dryRun: boolean;
  verbose: boolean;
  path?: string;
}

// Parse command line arguments
function parseArgs(): Options {
  const options: Options = {
    fix: false,
    dryRun: false,
    verbose: false,
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg.startsWith('--path=')) {
      options.path = arg.substring('--path='.length);
    }
  }

  return options;
}

// Count console statements before replacement
function countConsoleStatements(): number {
  try {
    const cmd = `find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" -exec grep -c "console\\." {} \\; | awk '{s+=$1} END {print s}'`;
    const output = execSync(cmd, { encoding: 'utf8' });
    return parseInt(output.trim(), 10);
  } catch (error) {
    logger.error({
      msg: 'Error counting console statements:',
      operation: 'count_statements',
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// Find files with console statements
function findFilesWithConsoleStatements(basePath: string = '.'): string[] {
  try {
    // Use a simpler find and grep approach
    const cmd = `find ${basePath} -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" -exec grep -l "console\\." {} \\;`;
    const output = execSync(cmd, { encoding: 'utf8' });
    return output.split('\n').filter(Boolean);
  } catch (error) {
    logger.error({
      msg: 'Error finding files with console statements:',
      operation: 'find_files',
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// Interface to track edits
interface FileEdit {
  filePath: string;
  loggerImportAdded: boolean;
  loggerInstanceAdded: boolean;
  replacements: {
    line: number;
    original: string;
    replacement: string;
  }[];
}

// Process a single file to replace console statements with logger calls
function processFile(filePath: string, options: Options): FileEdit | null {
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const fileEdit: FileEdit = {
      filePath,
      loggerImportAdded: false,
      loggerInstanceAdded: false,
      replacements: [],
    };

    // Check if file already imports logger
    const hasLoggerImport = lines.some(
      (line) =>
        line.includes('import') && line.includes('logger') && line.includes('../utils/logger'),
    );

    // Check if file already has a local logger instance
    const hasLoggerInstance = lines.some(
      (line) =>
        line.includes('logger.child') ||
        (line.includes('const') &&
          (line.includes('moduleLogger') || line.includes('logger')) &&
          line.includes('logger')),
    );

    // Find all console statements
    const consoleRegex = /console\.(log|error|warn|info|debug|trace)\s*\(([^;]*)\);?/g;
    let newContent = content;

    // Track replacements for logging
    const replacements = [];

    // Analyze the file for console statements
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineMatches = line.match(consoleRegex);

      if (lineMatches) {
        for (const lineMatch of lineMatches) {
          const methodMatch = lineMatch.match(/console\.(log|error|warn|info|debug)/);
          if (methodMatch) {
            const consoleMethod = methodMatch[1];
            let loggerMethod;

            // Map console methods to logger methods
            switch (consoleMethod) {
              case 'log':
              case 'info':
                loggerMethod = 'info';
                break;
              case 'error':
                loggerMethod = 'error';
                break;
              case 'warn':
                loggerMethod = 'warn';
                break;
              case 'debug':
              case 'trace':
                loggerMethod = 'debug';
                break;
            }

            // Extract arguments
            const argsMatch = lineMatch.match(/console\.[a-z]+\s*\((.*)\);?/);
            if (argsMatch) {
              const args = argsMatch[1].trim();

              // Create replacement with a context object
              const indentation = line.match(/^\s*/)?.[0] || '';
              const loggerName = hasLoggerInstance
                ? line.includes('logger')
                  ? 'logger'
                  : 'moduleLogger'
                : 'logger';
              const contextObject = `{ msg: ${args}, operation: '${path.basename(filePath, path.extname(filePath))}' }`;
              const replacement = `${indentation}${loggerName}.${loggerMethod}(${contextObject})`;

              // Add to replacements list
              replacements.push({
                line: i + 1,
                original: line,
                replacement: line.replace(lineMatch, replacement),
              });
            }
          }
        }
      }
    }

    // Update content with replacements
    for (const replacement of replacements) {
      // Replace the line in newContent
      newContent = newContent.replace(replacement.original, replacement.replacement);
      fileEdit.replacements.push(replacement);
    }

    // Add logger import and instance if needed
    if (replacements.length > 0 && !hasLoggerImport) {
      // Find a good spot to add the import
      let foundImports = false;
      let lastImportLine = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('import ')) {
          foundImports = true;
          lastImportLine = i;
        } else if (foundImports && lines[i].trim() === '') {
          // Skip empty lines after imports
        } else if (foundImports) {
          // We've passed the import section
          break;
        }
      }

      // Calculate relative path to utils/logger
      const relativePath = path
        .relative(path.dirname(filePath), path.join(path.dirname(filePath), '..', 'utils'))
        .replace(/\\/g, '/');

      const importStatement = `import { logger as _logger } from '${relativePath}/logger';`;

      if (lastImportLine >= 0) {
        // Insert after the last import
        lines.splice(lastImportLine + 1, 0, importStatement);
        fileEdit.loggerImportAdded = true;
      } else {
        // No imports found, add to the beginning of the file
        lines.unshift(importStatement);
        fileEdit.loggerImportAdded = true;
      }

      // Add a logger instance if there isn't one
      if (!hasLoggerInstance) {
        // Add a blank line first if not already one
        if (lines[lastImportLine + 2] !== '') {
          lines.splice(lastImportLine + 2, 0, '');
        }

        // Add the logger instance
        const moduleName = path.basename(filePath, path.extname(filePath));
        const loggerInstance = `const moduleLogger = logger.child({ module: '${moduleName}' });`;
        lines.splice(lastImportLine + 3, 0, loggerInstance);
        fileEdit.loggerInstanceAdded = true;
      }

      // Update new content with imports
      newContent = lines.join('\n');
    }

    // Apply changes if requested
    if (
      options.fix &&
      !options.dryRun &&
      (fileEdit.replacements.length > 0 || fileEdit.loggerImportAdded)
    ) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      logger.info({
        msg: `Updated ${filePath} with ${fileEdit.replacements.length} replacements`,
        operation: 'update_file',
        filePath,
        replacements: fileEdit.replacements.length,
        loggerImportAdded: fileEdit.loggerImportAdded,
        loggerInstanceAdded: fileEdit.loggerInstanceAdded,
      });
    }

    return fileEdit.replacements.length > 0 ? fileEdit : null;
  } catch (error) {
    logger.error({
      msg: `Error processing file ${filePath}:`,
      operation: 'process_file',
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// Main function
async function main() {
  // Parse command line options
  const options = parseArgs();

  logger.info({
    msg: `Starting console statement replacement with options: ${JSON.stringify(options)}`,
    operation: 'start',
    options,
  });

  // Define the base path for processing
  const basePath = options.path || '.';

  // Count console statements before processing
  const initialCount = countConsoleStatements();
  logger.info({
    msg: `Found ${initialCount} console statements in the codebase.`,
    operation: 'count_initial',
    count: initialCount,
  });

  // Find files with console statements
  const files = findFilesWithConsoleStatements(basePath);
  logger.info({
    msg: `Found ${files.length} files with console statements.`,
    operation: 'found_files',
    count: files.length,
  });

  // Process each file
  let _modifiedCount = 0;
  const edits: FileEdit[] = [];

  for (const file of files) {
    const fileEdit = processFile(file, options);

    if (fileEdit) {
      edits.push(fileEdit);

      if (options.verbose) {
        logger.debug({
          msg: `File ${file}: ${fileEdit.replacements.length} replacements found`,
          operation: 'file_details',
          filePath: file,
          replacements: fileEdit.replacements.length,
          loggerImportAdded: fileEdit.loggerImportAdded,
          loggerInstanceAdded: fileEdit.loggerInstanceAdded,
        });

        // Log detailed replacements if requested
        if (options.verbose) {
          for (const replacement of fileEdit.replacements) {
            logger.debug({
              msg: `Line ${replacement.line}: ${replacement.original.trim()} -> ${replacement.replacement.trim()}`,
              operation: 'replacement_detail',
              filePath: file,
              line: replacement.line,
              original: replacement.original.trim(),
              replacement: replacement.replacement.trim(),
            });
          }
        }
      }

      if (options.fix && !options.dryRun) {
        _modifiedCount++;
      }
    }
  }

  // Count console statements after processing if changes were applied
  let finalCount = initialCount;
  let removedCount = 0;

  if (options.fix && !options.dryRun) {
    finalCount = countConsoleStatements();
    removedCount = initialCount - finalCount;
  } else {
    // Estimate how many would be replaced
    removedCount = edits.reduce((total, edit) => total + edit.replacements.length, 0);
    finalCount = initialCount - removedCount;
  }

  // Generate and log summary
  const actionVerb = options.fix && !options.dryRun ? 'Replaced' : 'Would replace';

  const summary = `
Summary:
- ${actionVerb} ${removedCount} console statements in ${edits.length} files
- ${finalCount} console statements remain (may require manual intervention or more advanced patterns)
`;

  logger.info({
    msg: summary,
    operation: 'summary',
    replacedStatements: removedCount,
    modifiedFiles: edits.length,
    remainingStatements: finalCount,
    mode: options.fix && !options.dryRun ? 'applied' : 'reported',
  });

  // If statements remain, list the files
  if (finalCount > 0 && options.verbose) {
    logger.debug({
      msg: 'Files with remaining console statements:',
      operation: 'remaining_files',
    });

    const remainingFiles = findFilesWithConsoleStatements(basePath);
    for (const file of remainingFiles) {
      logger.debug({
        msg: `- ${file}`,
        operation: 'remaining_file',
        filePath: file,
      });
    }
  }

  // Add usage hint if just reporting
  if (!options.fix) {
    logger.info({
      msg: 'Run with --fix to apply the changes. Add --dry-run to see what would change without modifying files.',
      operation: 'usage_hint',
    });
  }
}

// Run the script
main().catch((error) => {
  logger.error({
    msg: 'Error running script:',
    operation: 'fatal_error',
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
