/**
 * Script to add .js extensions to ESM imports
 * 
 * This script scans TypeScript files and adds .js extensions to relative imports
 * as required by the NodeNext module resolution strategy.
 */

import fs from 'fs';
import path from 'path';
import { createScriptLogger } from '../utils/createScriptLogger.js';

// Configure logger
const logger = createScriptLogger('add-js-extensions');

// Import statement regex patterns
const IMPORT_REGEX = /import\s+(?:{[^}]*}|\*\s+as\s+[^;]*|[^;]*)\s+from\s+['"]([^'"]+)['"]/g;
const REQUIRE_REGEX = /(?:const|let|var)\s+(?:{[^}]*}|[^=]*)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
const DYNAMIC_IMPORT_REGEX = /import\(['"]([^'"]+)['"]\)/g;
const JEST_MOCK_REGEX = /jest\.mock\(['"]([^'"]+)['"]/g;
const EXPORT_FROM_REGEX = /export\s+(?:{[^}]*}|\*(?:\s+as\s+[^;]*)?)\s+from\s+['"]([^'"]+)['"]/g;

// Paths to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'public',
  'reports',
];

// File types to process
const INCLUDE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * Information about an import that needs to be processed
 */
interface ImportInfo {
  filePath: string;       // Path to the file containing the import
  importPath: string;     // The path being imported
  statement: string;      // The full import statement
  startPos: number;       // Start position in the file
  endPos: number;         // End position in the file
  needsExtension: boolean; // Whether this import needs a .js extension
}

/**
 * Determines if an import path should have a .js extension added
 */
function shouldAddJsExtension(importPath: string): boolean {
  // Don't add extensions to:
  // 1. External packages (no relative path or alias)
  // 2. Non-JS/TS files (e.g. .json, .css)
  // 3. Paths that already have a file extension
  if (!importPath.startsWith('.') && 
      !importPath.startsWith('/') && 
      !importPath.startsWith('@/')) {
    return false; // External package
  }

  // Check if already has an extension
  if (path.extname(importPath) !== '') {
    return false; 
  }
  
  return true;
}

/**
 * Add .js extension to an import path
 */
function addJsExtension(importPath: string): string {
  return `${importPath}.js`;
}

/**
 * Find import statements of a specific type in a file content
 */
function findImportsWithRegex(
  filePath: string, 
  content: string, 
  regex: RegExp
): ImportInfo[] {
  const imports: ImportInfo[] = [];
  let match;
  
  // Reset regex to start from beginning
  regex.lastIndex = 0;
  
  while ((match = regex.exec(content)) !== null) {
    const importPath = match[1];
    imports.push({
      filePath,
      importPath,
      statement: match[0],
      startPos: match.index,
      endPos: match.index + match[0].length,
      needsExtension: shouldAddJsExtension(importPath)
    });
  }
  
  return imports;
}

/**
 * Find all types of imports in a file content
 */
function findAllImports(filePath: string, content: string): ImportInfo[] {
  const imports: ImportInfo[] = [
    ...findImportsWithRegex(filePath, content, IMPORT_REGEX),
    ...findImportsWithRegex(filePath, content, REQUIRE_REGEX),
    ...findImportsWithRegex(filePath, content, DYNAMIC_IMPORT_REGEX),
    ...findImportsWithRegex(filePath, content, JEST_MOCK_REGEX),
    ...findImportsWithRegex(filePath, content, EXPORT_FROM_REGEX)
  ];
  
  // Sort imports by position (in reverse order to avoid changing positions)
  return imports.sort((a, b) => b.startPos - a.startPos);
}

/**
 * Process an individual file
 */
function processIndividualFile(
  filePath: string,
  options: { dryRun?: boolean }
): { filesProcessed: number; importsFixed: number; errors: string[] } {
  const result = {
    filesProcessed: 0,
    importsFixed: 0,
    errors: [] as string[]
  };
  
  // Process file if it has a supported extension
  const ext = path.extname(filePath);
  if (INCLUDE_EXTENSIONS.includes(ext)) {
    result.filesProcessed = 1;
    
    if (options.dryRun) {
      logger.info({ message: `[DRY RUN] Would process: ${filePath}` });
    } else {
      const fileResult = processFile(filePath);
      result.importsFixed = fileResult.importsFixed;
      result.errors.push(...fileResult.errors);
    }
  }
  
  return result;
}

/**
 * Apply changes to the imports that need extensions
 */
function applyImportChanges(
  content: string,
  imports: ImportInfo[],
  filePath: string
): { content: string; modified: boolean; importsFixed: number } {
  let newContent = content;
  let modified = false;
  let importsFixed = 0;
  
  for (const imp of imports) {
    if (imp.needsExtension) {
      logger.info({ 
        message: `Adding .js extension to import: ${imp.importPath}`,
        file: filePath
      });
      
      const newImportPath = addJsExtension(imp.importPath);
      const newStatement = imp.statement.replace(
        new RegExp(`['"]${imp.importPath}['"]`), 
        `'${newImportPath}'`
      );
      
      newContent = newContent.substring(0, imp.startPos) + 
                   newStatement + 
                   newContent.substring(imp.endPos);
      
      modified = true;
      importsFixed++;
    }
  }
  
  return { content: newContent, modified, importsFixed };
}

/**
 * Process a file to find and fix imports
 */
function processFile(filePath: string): { importsFixed: number, errors: string[] } {
  logger.info({ message: `Processing file: ${filePath}` });
  
  const errors: string[] = [];
  let importsFixed = 0;
  
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find all imports
    const imports = findAllImports(filePath, content);
    
    // Apply changes to the imports that need extensions
    const result = applyImportChanges(content, imports, filePath);
    importsFixed = result.importsFixed;
    
    // Write updated content if changes were made
    if (result.modified) {
      fs.writeFileSync(filePath, result.content, 'utf8');
      logger.info({ 
        message: `Updated ${importsFixed} imports in ${filePath}`,
        file: filePath,
        importsFixed
      });
    } else {
      logger.info({ 
        message: `No changes needed in ${filePath}`,
        file: filePath
      });
    }
    
    return { importsFixed, errors };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ 
      message: `Error processing file: ${filePath}`,
      file: filePath,
      error: errorMessage
    });
    errors.push(`${filePath}: ${errorMessage}`);
    return { importsFixed: 0, errors };
  }
}

/**
 * Walk a directory and process all TypeScript/JavaScript files
 */
function processDirectory(dir: string, options: { dryRun?: boolean } = {}): { 
  filesProcessed: number;
  importsFixed: number;
  errors: string[];
} {
  const result = {
    filesProcessed: 0,
    importsFixed: 0,
    errors: [] as string[]
  };

  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      
      // Skip excluded directories
      if (fs.statSync(fullPath).isDirectory()) {
        if (EXCLUDE_DIRS.includes(file)) {
          logger.info({ message: `Skipping excluded directory: ${fullPath}` });
          continue;
        }
        
        // Process subdirectory recursively
        const subResult = processDirectory(fullPath, options);
        
        result.filesProcessed += subResult.filesProcessed;
        result.importsFixed += subResult.importsFixed;
        result.errors.push(...subResult.errors);
        
      } else {
        // Process individual file
        const fileResult = processIndividualFile(fullPath, options);
        result.filesProcessed += fileResult.filesProcessed;
        result.importsFixed += fileResult.importsFixed;
        result.errors.push(...fileResult.errors);
      }
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ 
      message: `Error processing directory: ${dir}`,
      error: errorMessage
    });
    result.errors.push(`${dir}: ${errorMessage}`);
    return result;
  }
}

/**
 * Process a specific directory or file
 */
function processPaths(paths: string[], options: { dryRun?: boolean } = {}): { 
  filesProcessed: number;
  importsFixed: number;
  errors: string[];
} {
  const result = {
    filesProcessed: 0,
    importsFixed: 0,
    errors: [] as string[]
  };
  
  for (const inputPath of paths) {
    const stats = fs.statSync(inputPath);
    
    if (stats.isDirectory()) {
      logger.info({ message: `Processing directory: ${inputPath}` });
      const dirResult = processDirectory(inputPath, options);
      result.filesProcessed += dirResult.filesProcessed;
      result.importsFixed += dirResult.importsFixed;
      result.errors.push(...dirResult.errors);
    } else if (stats.isFile()) {
      logger.info({ message: `Processing file: ${inputPath}` });
      result.filesProcessed++;
      
      if (options.dryRun) {
        logger.info({ message: `[DRY RUN] Would process: ${inputPath}` });
      } else {
        const fileResult = processFile(inputPath);
        result.importsFixed += fileResult.importsFixed;
        result.errors.push(...fileResult.errors);
      }
    } else {
      logger.error({ message: `Invalid path: ${inputPath}` });
      result.errors.push(`Invalid path: ${inputPath}`);
    }
  }
  
  return result;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  // Remove flags from paths
  const paths = args.filter(arg => !arg.startsWith('--'));
  
  // Default to current directory if no paths specified
  const inputPaths = paths.length > 0 ? paths : ['.'];
  
  logger.info({
    message: `Starting add-js-extensions script`,
    dryRun,
    paths: inputPaths
  });
  
  const startTime = Date.now();
  const result = processPaths(inputPaths, { dryRun });
  const duration = Date.now() - startTime;
  
  // Log summary
  logger.info({
    message: `Completed add-js-extensions script`,
    dryRun,
    filesProcessed: result.filesProcessed,
    importsFixed: result.importsFixed,
    errorCount: result.errors.length,
    durationMs: duration
  });
  
  // Log errors if any
  if (result.errors.length > 0) {
    logger.error({
      message: `Errors occurred during processing:`,
      errors: result.errors
    });
  }
  
  // Exit with appropriate code
  process.exit(result.errors.length > 0 ? 1 : 0);
}

// Run the script
main().catch(error => {
  logger.error({
    message: `Unhandled error in script execution`,
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});