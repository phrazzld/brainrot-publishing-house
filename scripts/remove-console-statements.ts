#!/usr/bin/env ts-node
/**
 * Script to remove console statements from the codebase
 * Usage: npx tsx scripts/remove-console-statements.ts
 * 
 * This script identifies all console.log, console.error, console.warn, and other console
 * statements in the codebase and removes them.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// File patterns to process
const FILE_PATTERNS = ['ts', 'tsx', 'js', 'jsx'].map(ext => `--include="*.${ext}"`).join(' ');

// Directories to exclude
const EXCLUDED_DIRS = ['node_modules', '.next', '.git', 'dist', 'build'].map(dir => `--exclude-dir="${dir}"`).join(' ');

// Count console statements before removal
function countConsoleStatements(): number {
  try {
    const cmd = `grep -r "console\\." ${FILE_PATTERNS} ${EXCLUDED_DIRS} . | wc -l`;
    const output = execSync(cmd, { encoding: 'utf8' });
    return parseInt(output.trim(), 10);
  } catch (error) {
    console.error('Error counting console statements:', error);
    return 0;
  }
}

// Find files with console statements
function findFilesWithConsoleStatements(): string[] {
  try {
    const cmd = `grep -l "console\\." ${FILE_PATTERNS} ${EXCLUDED_DIRS} .`;
    const output = execSync(cmd, { encoding: 'utf8' });
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding files with console statements:', error);
    return [];
  }
}

// Process a single file to remove console statements
function processFile(filePath: string): boolean {
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Replace console statements
    // This regex matches console.X(...) statements, including multi-line ones
    const newContent = content.replace(
      /console\.(log|error|warn|info|debug|trace|time|timeEnd|assert|count|countReset|group|groupEnd|table)\s*\([^;]*\);?/g,
      ''
    );
    
    // Also remove entire lines that only contained a console statement (to avoid empty lines)
    const cleanedContent = newContent.replace(/^\s*\/\/?\s*console\..*$/gm, '');
    
    // Write file if content changed
    if (cleanedContent !== content) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

// Main function
async function main() {
  // Count console statements before removal
  const initialCount = countConsoleStatements();
  console.log(`Found ${initialCount} console statements in the codebase.`);
  
  // Find files with console statements
  const files = findFilesWithConsoleStatements();
  console.log(`Found ${files.length} files with console statements.`);
  
  // Process each file
  let modifiedCount = 0;
  for (const file of files) {
    const wasModified = processFile(file);
    if (wasModified) {
      modifiedCount++;
      console.log(`Processed: ${file}`);
    }
  }
  
  // Count console statements after removal
  const finalCount = countConsoleStatements();
  const removedCount = initialCount - finalCount;
  
  console.log(`
Summary:
- Modified ${modifiedCount} files
- Removed ${removedCount} console statements
- ${finalCount} console statements remain (these may require manual intervention)
`);
  
  // If statements remain, list the files
  if (finalCount > 0) {
    console.log('Files with remaining console statements:');
    const remainingFiles = findFilesWithConsoleStatements();
    remainingFiles.forEach(file => console.log(`- ${file}`));
  }
}

// Run the script
main().catch(error => {
  console.error('Error running script:', error);
  process.exit(1);
});