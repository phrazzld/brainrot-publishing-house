#!/usr/bin/env node
/**
 * Check Missing Audio Files
 *
 * Compares the translations data with the actual audio files in Digital Ocean
 * to identify any missing audio files.
 *
 * Usage:
 *   npx tsx scripts/checkMissingAudio.ts [--inventory=path/to/audio-inventory.json]
 */
import fs from 'fs/promises';
import path from 'path';

import translations from '../translations';

// Parse command line arguments
const args = process.argv.slice(2);
let inventoryPath = 'audio-inventory.json';

for (const arg of args) {
  if (arg.startsWith('--inventory=')) {
    inventoryPath = arg.substring('--inventory='.length);
  }
}

async function main() {
  try {
    // Load the inventory file
    console.log(`Loading inventory from ${inventoryPath}...`);
    const inventoryData = await fs.readFile(inventoryPath, 'utf-8');
    const inventory = JSON.parse(inventoryData);

    console.log(`\nAudio Inventory Summary:`);
    console.log(`Total files: ${inventory.totalFiles}`);
    console.log(`Total size: ${(inventory.totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Real audio files: ${inventory.realAudioFiles}`);
    console.log(`Books with audio: ${inventory.books.length}`);

    // Compare with translations
    const expectedAudio = new Map<
      string,
      { bookSlug: string; bookTitle: string; chapterTitle: string }
    >();
    const actualAudio = new Map<string, boolean>();

    // Collect expected audio files from translations
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

    // Collect actual audio files from inventory
    for (const bookInfo of inventory.books) {
      for (const file of bookInfo.files) {
        actualAudio.set(file.key, true);
      }
    }

    // Find missing files
    const missingFiles: { path: string; book: string; chapter: string }[] = [];

    for (const [expectedPath, info] of expectedAudio.entries()) {
      if (!actualAudio.has(expectedPath)) {
        missingFiles.push({
          path: expectedPath,
          book: info.bookTitle,
          chapter: info.chapterTitle,
        });
      }
    }

    // Find unexpected files
    const unexpectedFiles: string[] = [];

    for (const [actualPath] of actualAudio.entries()) {
      if (!expectedAudio.has(actualPath)) {
        unexpectedFiles.push(actualPath);
      }
    }

    // Report findings
    console.log(`\nExpected audio files: ${expectedAudio.size}`);
    console.log(`Actual audio files: ${actualAudio.size}`);
    console.log(`Missing audio files: ${missingFiles.length}`);
    console.log(`Unexpected audio files: ${unexpectedFiles.length}`);

    if (missingFiles.length > 0) {
      console.log('\nMissing Audio Files:');
      missingFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.book} - ${file.chapter} (${file.path})`);
      });
    }

    if (unexpectedFiles.length > 0) {
      console.log('\nUnexpected Audio Files (not referenced in translations):');
      unexpectedFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file}`);
      });
    }

    // Save the results to a file
    const results = {
      timestamp: new Date().toISOString(),
      expectedCount: expectedAudio.size,
      actualCount: actualAudio.size,
      missingCount: missingFiles.length,
      unexpectedCount: unexpectedFiles.length,
      missingFiles,
      unexpectedFiles,
    };

    await fs.writeFile('audio-files-report.json', JSON.stringify(results, null, 2));
    console.log('\nDetailed report saved to audio-files-report.json');
  } catch (error) {
    console.error('Error checking missing audio files:', error);
    process.exit(1);
  }
}

main();
