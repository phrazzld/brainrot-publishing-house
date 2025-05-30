#!/usr/bin/env node
/**
 * Check Missing Audio Files
 *
 * Compares the translations data with the actual audio files in Vercel Blob storage
 * to identify any missing audio files.
 *
 * Usage:
 *   npx tsx scripts/checkMissingAudio.ts [--inventory=path/to/audio-inventory.json]
 */
import fs from 'fs/promises';
import path from 'path';

import translations from '../translations/index.js';
import { logger } from '../utils/logger.js';

// Create a script-specific logger
const scriptLogger = logger.child({
  script: 'checkMissingAudio',
  context: 'audio-verification',
});

// Parse command line arguments
const args = process.argv.slice(2);
let inventoryPath = 'audio-inventory.json';

for (const arg of args) {
  if (arg.startsWith('--inventory=')) {
    inventoryPath = arg.substring('--inventory='.length);
  }
}

interface AudioInfo {
  bookSlug: string;
  bookTitle: string;
  chapterTitle: string;
}

interface MissingFile {
  path: string;
  book: string;
  chapter: string;
}

interface Inventory {
  totalFiles: number;
  totalSize: number;
  realAudioFiles: number;
  books: Array<{
    slug: string;
    files: Array<{
      key: string;
      size: number;
    }>;
  }>;
}

interface ResultsReport {
  timestamp: string;
  expectedCount: number;
  actualCount: number;
  missingCount: number;
  unexpectedCount: number;
  missingFiles: MissingFile[];
  unexpectedFiles: string[];
}

async function main() {
  try {
    // Load the inventory file
    scriptLogger.info({
      msg: 'Loading inventory file',
      path: inventoryPath,
    });

    const inventoryData = await fs.readFile(inventoryPath, 'utf-8');
    const inventory: Inventory = JSON.parse(inventoryData);

    scriptLogger.info({
      msg: 'Audio inventory summary',
      totalFiles: inventory.totalFiles,
      totalSizeMB: (inventory.totalSize / (1024 * 1024)).toFixed(2),
      realAudioFiles: inventory.realAudioFiles,
      booksWithAudio: inventory.books.length,
    });

    // Compare with translations
    const expectedAudio = new Map<string, AudioInfo>();
    const actualAudio = new Map<string, boolean>();

    // Collect expected audio files from translations
    collectExpectedAudioFiles(expectedAudio);

    // Collect actual audio files from inventory
    collectActualAudioFiles(inventory, actualAudio);

    // Find missing files
    const missingFiles = findMissingFiles(expectedAudio, actualAudio);

    // Find unexpected files
    const unexpectedFiles = findUnexpectedFiles(actualAudio, expectedAudio);

    // Report findings
    reportFindings(expectedAudio.size, actualAudio.size, missingFiles, unexpectedFiles);

    // Save the results to a file
    await saveResultsToFile(expectedAudio.size, actualAudio.size, missingFiles, unexpectedFiles);

    scriptLogger.info({
      msg: 'Detailed report saved',
      path: 'audio-files-report.json',
    });
  } catch (error) {
    scriptLogger.error({
      msg: 'Error checking missing audio files',
      error,
    });
    process.exit(1);
  }
}

/**
 * Collects expected audio files from translations data
 */
function collectExpectedAudioFiles(expectedAudio: Map<string, AudioInfo>): void {
  for (const book of translations) {
    if (!book.chapters) continue;

    for (const chapter of book.chapters) {
      if (!chapter.audioSrc) continue;

      let normalizedPath = chapter.audioSrc;

      // If it's a URL, extract just the path part
      if (normalizedPath.includes('://')) {
        const url = new URL(normalizedPath);
        normalizedPath = url.pathname;

        // Remove leading slash if present
        if (normalizedPath.startsWith('/')) {
          normalizedPath = normalizedPath.substring(1);
        }
      }

      // Handle both path formats: with or without book prefix
      if (!normalizedPath.startsWith(`${book.slug}/`)) {
        normalizedPath = `${book.slug}/audio/${path.basename(normalizedPath)}`;
      }

      expectedAudio.set(normalizedPath, {
        bookSlug: book.slug,
        bookTitle: book.title,
        chapterTitle: chapter.title,
      });
    }
  }
}

/**
 * Collects actual audio files from inventory
 */
function collectActualAudioFiles(inventory: Inventory, actualAudio: Map<string, boolean>): void {
  for (const bookInfo of inventory.books) {
    for (const file of bookInfo.files) {
      actualAudio.set(file.key, true);
    }
  }
}

/**
 * Finds missing audio files by comparing expected with actual
 */
function findMissingFiles(
  expectedAudio: Map<string, AudioInfo>,
  actualAudio: Map<string, boolean>,
): MissingFile[] {
  const missingFiles: MissingFile[] = [];

  for (const [expectedPath, info] of expectedAudio.entries()) {
    if (!actualAudio.has(expectedPath)) {
      missingFiles.push({
        path: expectedPath,
        book: info.bookTitle,
        chapter: info.chapterTitle,
      });
    }
  }

  return missingFiles;
}

/**
 * Finds unexpected audio files by comparing actual with expected
 */
function findUnexpectedFiles(
  actualAudio: Map<string, boolean>,
  expectedAudio: Map<string, AudioInfo>,
): string[] {
  const unexpectedFiles: string[] = [];

  for (const [actualPath] of actualAudio.entries()) {
    if (!expectedAudio.has(actualPath)) {
      unexpectedFiles.push(actualPath);
    }
  }

  return unexpectedFiles;
}

/**
 * Reports findings to the console via structured logging
 */
function reportFindings(
  expectedCount: number,
  actualCount: number,
  missingFiles: MissingFile[],
  unexpectedFiles: string[],
): void {
  scriptLogger.info({
    msg: 'Audio files verification summary',
    expectedFiles: expectedCount,
    actualFiles: actualCount,
    missingFiles: missingFiles.length,
    unexpectedFiles: unexpectedFiles.length,
  });

  if (missingFiles.length > 0) {
    scriptLogger.warn({
      msg: 'Missing audio files detected',
      count: missingFiles.length,
      files: missingFiles.map((file) => `${file.book} - ${file.chapter} (${file.path})`),
    });
  }

  if (unexpectedFiles.length > 0) {
    scriptLogger.info({
      msg: 'Unexpected audio files (not referenced in translations)',
      count: unexpectedFiles.length,
      files: unexpectedFiles,
    });
  }
}

/**
 * Saves results to a JSON file
 */
async function saveResultsToFile(
  expectedCount: number,
  actualCount: number,
  missingFiles: MissingFile[],
  unexpectedFiles: string[],
): Promise<void> {
  const results: ResultsReport = {
    timestamp: new Date().toISOString(),
    expectedCount,
    actualCount,
    missingCount: missingFiles.length,
    unexpectedCount: unexpectedFiles.length,
    missingFiles,
    unexpectedFiles,
  };

  await fs.writeFile('audio-files-report.json', JSON.stringify(results, null, 2));
}

main();
