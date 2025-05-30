#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { list } from '@vercel/blob';
import type { ListBlobResult } from '@vercel/blob';

import { logger } from '../utils/logger.js';

dotenv.config({ path: '.env.local' });

interface TextFile {
  pathname: string;
  size: number;
  uploadedAt: Date;
}

/**
 * Fetch all text files from Vercel Blob
 */
async function fetchTextFiles(): Promise<TextFile[]> {
  const textFiles: TextFile[] = [];
  let cursor: string | undefined;
  let page = 1;

  do {
    const result: ListBlobResult = await list({ prefix: 'assets/text/', cursor });

    // Get all text files
    const txtFiles = result.blobs.filter((blob) => blob.pathname.endsWith('.txt'));

    textFiles.push(...txtFiles);

    logger.info({
      msg: `Page ${page}: Found ${txtFiles.length} text files`,
      count: txtFiles.length,
      total: textFiles.length,
    });

    if (txtFiles.length > 0) {
      logger.info({ msg: 'Sample text files found:' });
      txtFiles.slice(0, 5).forEach((blob) => {
        logger.info({
          msg: '  - Text file',
          path: blob.pathname,
          size: `${(blob.size / 1024).toFixed(2)} KB`,
        });
      });
    }

    cursor = result.cursor;
    page++;
  } while (cursor);

  return textFiles;
}

/**
 * Group files by book
 */
function groupByBook(files: TextFile[]): Record<string, TextFile[]> {
  const books: Record<string, TextFile[]> = {};

  files.forEach((file) => {
    // Extract book name from path
    const pathParts = file.pathname.split('/');
    if (pathParts.length >= 4) {
      const bookName = pathParts[2]; // assets/text/{book}/...
      if (!books[bookName]) {
        books[bookName] = [];
      }
      books[bookName].push(file);
    }
  });

  return books;
}

async function main() {
  try {
    logger.info({ msg: 'Checking available text files in Vercel Blob...' });

    // Check if we have proper auth
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      logger.warn({
        msg: 'No BLOB_READ_WRITE_TOKEN found. Will try with public access...',
      });
    }

    const textFiles = await fetchTextFiles();
    logger.info({ msg: 'Total text files found', count: textFiles.length });

    const bookGroups = groupByBook(textFiles);
    logger.info({ msg: 'Books with text files', books: Object.keys(bookGroups) });

    // Show summary by book
    for (const [book, files] of Object.entries(bookGroups)) {
      logger.info({
        msg: `Book: ${book}`,
        fileCount: files.length,
        samplePaths: files.slice(0, 3).map((f) => f.pathname),
      });
    }

    // Check specifically for standardized paths
    const standardizedPaths = textFiles.filter((f) => f.pathname.includes('brainrot-'));
    logger.info({
      msg: 'Standardized text files',
      count: standardizedPaths.length,
      samplePaths: standardizedPaths.slice(0, 5).map((f) => f.pathname),
    });

    // Check for legacy paths
    const legacyPaths = textFiles.filter((f) => f.pathname.includes('books/'));
    logger.info({
      msg: 'Legacy text files',
      count: legacyPaths.length,
      samplePaths: legacyPaths.slice(0, 5).map((f) => f.pathname),
    });
  } catch (error) {
    logger.error({ msg: 'Failed to check text files', error });
    process.exit(1);
  }
}

main();
