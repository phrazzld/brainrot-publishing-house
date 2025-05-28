#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { list } from '@vercel/blob';
import type { ListBlobResult } from '@vercel/blob';

import { logger as _logger } from '../utils/logger.js';

dotenv.config({ path: '.env.local' });

interface AudioFile {
  pathname: string;
  size: number;
  uploadedAt: Date;
}

/**
 * Fetch all audio files from Vercel Blob
 */
async function fetchAudioFiles(): Promise<AudioFile[]> {
  const audioFiles: AudioFile[] = [];
  let cursor: string | undefined;
  let page = 1;

  do {
    const result: ListBlobResult = await list({ prefix: 'assets/audio/', cursor });

    // Filter for full audiobook files
    const fullAudiobooks = result.blobs.filter((blob) => blob.pathname.includes('full-audiobook'));

    // Get all audio files for reference
    const allAudioFiles = result.blobs.filter((blob) => blob.pathname.endsWith('.mp3'));

    audioFiles.push(...allAudioFiles);

    logger.info({
      msg: `Page ${page}: Found ${fullAudiobooks.length} full audiobooks, ${allAudioFiles.length} total audio files`,
      page,
      fullAudiobooksCount: fullAudiobooks.length,
      totalAudioFiles: allAudioFiles.length,
    });

    if (fullAudiobooks.length > 0) {
      logger.info({ msg: 'Full audiobooks found:' });
      fullAudiobooks.forEach((blob) => {
        logger.info({ msg: `  - ${blob.pathname} (${(blob.size / 1024 / 1024).toFixed(2)} MB)` });
      });
    }

    cursor = result.cursor;
    page++;
  } while (cursor);

  return audioFiles;
}

/**
 * Group audio files by book slug
 */
function groupFilesByBook(audioFiles: AudioFile[]): {
  bookMap: Map<string, AudioFile[]>;
  fullAudiobookMap: Map<string, AudioFile>;
} {
  const bookMap = new Map<string, AudioFile[]>();
  const fullAudiobookMap = new Map<string, AudioFile>();

  for (const file of audioFiles) {
    // Extract book slug from pathname (format: assets/audio/book-slug/filename.mp3)
    const pathParts = file.pathname.split('/');
    if (pathParts.length >= 4) {
      const bookSlug = pathParts[2];

      if (!bookMap.has(bookSlug)) {
        bookMap.set(bookSlug, []);
      }
      // Non-null assertion is safe here because we just created the array
      const files = bookMap.get(bookSlug);
      if (files) files.push(file);

      if (file.pathname.includes('full-audiobook')) {
        fullAudiobookMap.set(bookSlug, file);
      }
    }
  }

  return { bookMap, fullAudiobookMap };
}

/**
 * Generate report of audio assets
 */
function generateReport(
  audioFiles: AudioFile[],
  bookMap: Map<string, AudioFile[]>,
  fullAudiobookMap: Map<string, AudioFile>,
): void {
  logger.info({ msg: '📊 Audio Assets Summary:' });
  logger.info({ msg: `Total audio files: ${audioFiles.length}` });
  logger.info({ msg: `Total books with audio: ${bookMap.size}` });
  logger.info({ msg: `Books with full audiobooks: ${fullAudiobookMap.size}` });

  logger.info({ msg: 'Books with full audiobooks:' });
  for (const [slug, file] of fullAudiobookMap.entries()) {
    logger.info({ msg: `  ✅ ${slug}: ${file.pathname}` });
  }

  logger.info({ msg: 'Books missing full audiobooks:' });
  for (const [slug, files] of bookMap.entries()) {
    if (!fullAudiobookMap.has(slug)) {
      logger.info({ msg: `  ❌ ${slug}: ${files.length} chapter files` });
    }
  }
}

/**
 * Check standardized paths for specific books
 */
function checkStandardizedPaths(audioFiles: AudioFile[]): void {
  logger.info({ msg: '🔎 Checking standardized paths:' });
  const booksToCheck = [
    'the-iliad',
    'the-odyssey',
    'the-aeneid',
    'the-declaration',
    'hamlet',
    'huckleberry-finn',
  ];

  for (const bookSlug of booksToCheck) {
    const expectedPath = `assets/audio/${bookSlug}/full-audiobook.mp3`;
    const exists = audioFiles.some((file) => file.pathname === expectedPath);
    logger.info({ msg: `  ${exists ? '✅' : '❌'} ${expectedPath}` });
  }
}

async function checkFullAudiobooks(): Promise<void> {
  logger.info({ msg: '🔍 Checking for full audiobooks in Vercel Blob...' });

  try {
    // Fetch audio files
    logger.info({ msg: 'Fetching audio files from Vercel Blob...' });
    const audioFiles = await fetchAudioFiles();

    // Group files by book
    const { bookMap, fullAudiobookMap } = groupFilesByBook(audioFiles);

    // Generate report
    generateReport(audioFiles, bookMap, fullAudiobookMap);

    // Check standardized paths
    checkStandardizedPaths(audioFiles);
  } catch (error) {
    logger.error({ msg: 'Error listing audio files:', error });
    process.exit(1);
  }
}

checkFullAudiobooks().catch((error) => {
  logger.error({ msg: 'Script failed:', error });
  process.exit(1);
});
