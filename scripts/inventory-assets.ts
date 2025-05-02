#!/usr/bin/env node
/**
 * Asset Inventory Script
 *
 * Scans the public/assets directory and generates a complete inventory
 * of all assets (images and text files) with their future Blob paths.
 *
 * Usage:
 *   npx tsx scripts/inventory-assets.ts [options]
 *
 * Options:
 *   --format=json|csv|md      Output format (default: json)
 *   --output=<path>           Output file path (default: stdout)
 *   --filter=images|text|all  Filter by asset type (default: all)
 */
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Import BlobPathService from the project
import { blobPathService } from '../utils/services/BlobPathService.js';

// Utility to get this file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define inventory data structure
interface AssetFile {
  path: string;
  blobPath: string;
  size: number;
  lastModified: string;
}

interface AssetCategory {
  count: number;
  files: AssetFile[];
}

interface BookAssets {
  images: AssetCategory;
  brainrotText: AssetCategory;
  sourceText: AssetCategory;
  totalSize: number;
}

interface AssetInventory {
  totalAssets: number;
  totalSize: number;
  books: Record<string, BookAssets>;
  sharedImages: AssetCategory;
  generatedAt: string;
}

// Configuration
const ASSETS_DIR = path.resolve(__dirname, '../public/assets');
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
const TEXT_EXTENSIONS = ['.txt', '.md'];

// Helper functions
async function fileStats(filePath: string): Promise<{ size: number; lastModified: string }> {
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    lastModified: stats.mtime.toISOString(),
  };
}

function getAssetType(filePath: string): 'image' | 'text' | 'other' {
  const ext = path.extname(filePath).toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';
  return 'other';
}

function isBrainrotText(filePath: string): boolean {
  return filePath.includes('/text/brainrot/');
}

function isSourceText(filePath: string): boolean {
  return filePath.includes('/text/source/');
}

async function scanDirectory(dir: string, basePath: string = ''): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      const subDirFiles = await scanDirectory(fullPath, relativePath);
      files.push(...subDirFiles);
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

// Main inventory function
async function createAssetInventory(): Promise<AssetInventory> {
  const inventory: AssetInventory = {
    totalAssets: 0,
    totalSize: 0,
    books: {},
    sharedImages: {
      count: 0,
      files: [],
    },
    generatedAt: new Date().toISOString(),
  };

  // Check if assets directory exists
  if (!existsSync(ASSETS_DIR)) {
    console.error(`Assets directory not found: ${ASSETS_DIR}`);
    return inventory;
  }

  // Scan all files in the assets directory
  const files = await scanDirectory(ASSETS_DIR);

  // Process each file
  for (const relativePath of files) {
    const fullPath = path.join(ASSETS_DIR, relativePath);
    const assetType = getAssetType(fullPath);

    if (assetType === 'other') continue; // Skip non-asset files

    // Get file stats
    const stats = await fileStats(fullPath);

    // Update total size
    inventory.totalSize += stats.size;
    inventory.totalAssets++;

    // Create asset entry
    const assetPath = `/assets/${relativePath}`;
    const blobPath = blobPathService.convertLegacyPath(assetPath);

    const assetEntry: AssetFile = {
      path: assetPath,
      blobPath,
      ...stats,
    };

    // Special case for shared images
    if (relativePath.startsWith('images/')) {
      inventory.sharedImages.count++;
      inventory.sharedImages.files.push(assetEntry);
      continue;
    }

    // Handle book assets
    const bookSlug = blobPathService.getBookSlugFromPath(assetPath);

    if (!bookSlug) continue; // Skip if not a book asset

    // Initialize book entry if needed
    if (!inventory.books[bookSlug]) {
      inventory.books[bookSlug] = {
        images: { count: 0, files: [] },
        brainrotText: { count: 0, files: [] },
        sourceText: { count: 0, files: [] },
        totalSize: 0,
      };
    }

    // Add file to appropriate category
    if (assetType === 'image') {
      inventory.books[bookSlug].images.count++;
      inventory.books[bookSlug].images.files.push(assetEntry);
    } else if (isBrainrotText(relativePath)) {
      inventory.books[bookSlug].brainrotText.count++;
      inventory.books[bookSlug].brainrotText.files.push(assetEntry);
    } else if (isSourceText(relativePath)) {
      inventory.books[bookSlug].sourceText.count++;
      inventory.books[bookSlug].sourceText.files.push(assetEntry);
    }

    inventory.books[bookSlug].totalSize += stats.size;
  }

  return inventory;
}

// Output formatters
function formatJson(inventory: AssetInventory): string {
  return JSON.stringify(inventory, null, 2);
}

function formatCsv(inventory: AssetInventory): string {
  const rows: string[] = ['path,blobPath,size,lastModified,book,type'];

  // Add shared images
  for (const file of inventory.sharedImages.files) {
    rows.push(`${file.path},${file.blobPath},${file.size},${file.lastModified},shared,image`);
  }

  // Add book assets
  for (const [bookSlug, book] of Object.entries(inventory.books)) {
    // Images
    for (const file of book.images.files) {
      rows.push(
        `${file.path},${file.blobPath},${file.size},${file.lastModified},${bookSlug},image`
      );
    }

    // Brainrot text
    for (const file of book.brainrotText.files) {
      rows.push(
        `${file.path},${file.blobPath},${file.size},${file.lastModified},${bookSlug},brainrot`
      );
    }

    // Source text
    for (const file of book.sourceText.files) {
      rows.push(
        `${file.path},${file.blobPath},${file.size},${file.lastModified},${bookSlug},source`
      );
    }
  }

  return rows.join('\n');
}

function formatMarkdown(inventory: AssetInventory): string {
  const lines: string[] = [
    '# Asset Inventory',
    '',
    `- **Total Assets:** ${inventory.totalAssets}`,
    `- **Total Size:** ${formatSize(inventory.totalSize)}`,
    `- **Generated At:** ${inventory.generatedAt}`,
    '',
    '## Book Assets',
    '',
  ];

  // Book summary table
  lines.push('| Book | Images | Brainrot Text | Source Text | Total Size |');
  lines.push('|------|--------|--------------|-------------|------------|');

  for (const [bookSlug, book] of Object.entries(inventory.books)) {
    lines.push(
      `| ${bookSlug} | ${book.images.count} | ${book.brainrotText.count} | ${book.sourceText.count} | ${formatSize(book.totalSize)} |`
    );
  }

  lines.push('');
  lines.push('## Shared Images');
  lines.push('');
  lines.push(`- **Count:** ${inventory.sharedImages.count}`);
  lines.push('');

  // Detail sections for each book
  for (const [bookSlug, book] of Object.entries(inventory.books)) {
    lines.push(`## ${bookSlug} Details`);
    lines.push('');

    if (book.images.count > 0) {
      lines.push('### Images');
      lines.push('');
      lines.push('| Current Path | Future Blob Path | Size | Last Modified |');
      lines.push('|--------------|------------------|------|---------------|');

      for (const file of book.images.files) {
        lines.push(
          `| ${file.path} | ${file.blobPath} | ${formatSize(file.size)} | ${formatDate(file.lastModified)} |`
        );
      }
      lines.push('');
    }

    if (book.brainrotText.count > 0) {
      lines.push('### Brainrot Text');
      lines.push('');
      lines.push('| Current Path | Future Blob Path | Size | Last Modified |');
      lines.push('|--------------|------------------|------|---------------|');

      for (const file of book.brainrotText.files) {
        lines.push(
          `| ${file.path} | ${file.blobPath} | ${formatSize(file.size)} | ${formatDate(file.lastModified)} |`
        );
      }
      lines.push('');
    }

    if (book.sourceText.count > 0) {
      lines.push('### Source Text');
      lines.push('');
      lines.push('| Current Path | Future Blob Path | Size | Last Modified |');
      lines.push('|--------------|------------------|------|---------------|');

      for (const file of book.sourceText.files) {
        lines.push(
          `| ${file.path} | ${file.blobPath} | ${formatSize(file.size)} | ${formatDate(file.lastModified)} |`
        );
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// Utility functions
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Parse command line arguments
function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {
    format: 'json',
    output: '',
    filter: 'all',
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (value) args[key] = value;
    }
  }

  return args;
}

// Main execution
async function main() {
  try {
    const args = parseArgs();

    console.log('Scanning assets directory...');
    const inventory = await createAssetInventory();

    // Determine output format
    let output: string;
    switch (args.format.toLowerCase()) {
      case 'csv':
        output = formatCsv(inventory);
        break;
      case 'md':
      case 'markdown':
        output = formatMarkdown(inventory);
        break;
      case 'json':
      default:
        output = formatJson(inventory);
        break;
    }

    // Write output
    if (args.output) {
      await fs.writeFile(args.output, output);
      console.log(`Inventory written to ${args.output}`);
    } else {
      console.log(output);
    }

    // Print summary
    console.error(
      `\nInventory complete: ${inventory.totalAssets} assets found (${formatSize(inventory.totalSize)})`
    );
    console.error(`Books: ${Object.keys(inventory.books).length}`);
    console.error(`Shared images: ${inventory.sharedImages.count}`);
  } catch (error) {
    console.error('Error creating asset inventory:', error);
    process.exit(1);
  }
}

main();
