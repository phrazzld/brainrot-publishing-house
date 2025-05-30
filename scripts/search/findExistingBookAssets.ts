/**
 * Find existing book assets using the migration reports or blob listing
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { logger } from '../../utils/logger.js';
import { blobService } from '../../utils/services/BlobService.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Known existing books that are having issues
const problemBooks = ['the-iliad', 'the-odyssey', 'the-aeneid', 'hamlet'];

async function findAssets() {
  logger.info({ msg: 'Finding assets for existing books...' });

  // First, let's check what BlobPathService does with these paths
  const { blobPathService } = await import('../../utils/services/BlobPathService.js');

  const testPaths = [
    '/assets/hamlet/images/hamlet-07.png',
    '/assets/the-iliad/images/the-iliad-01.png',
    '/assets/the-odyssey/images/the-odyssey-01.png',
    '/assets/the-aeneid/images/the-aeneid-01.png',
  ];

  logger.info({ msg: 'BlobPathService conversions:' });
  for (const testPath of testPaths) {
    const converted = blobPathService.convertLegacyPath(testPath);
    logger.info({ msg: 'Conversion', input: testPath, output: converted });
  }

  // Now let's check each possible location
  const possiblePatterns = [
    (book: string, file: string) => `books/${book}/images/${file}`,
    (book: string, file: string) => `assets/${book}/images/${file}`,
    (book: string, file: string) => `images/${file}`,
    (book: string, file: string) => `images/chapter-images/${book}/${file}`,
  ];

  const imagesToFind = {
    hamlet: 'hamlet-07.png',
    'the-iliad': 'the-iliad-01.png',
    'the-odyssey': 'the-odyssey-01.png',
    'the-aeneid': 'the-aeneid-01.png',
  };

  for (const [book, filename] of Object.entries(imagesToFind)) {
    logger.info({ msg: `\nSearching for ${book} cover: ${filename}` });

    for (const patternFn of possiblePatterns) {
      const path = patternFn(book, filename);
      const url = blobService.getUrlForPath(path);

      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          logger.info({ msg: `✓ Found at: ${path}`, url });
          break;
        } else {
          logger.debug({ msg: `Not found at: ${path}`, status: response.status });
        }
      } catch (error) {
        logger.debug({ msg: `Error checking: ${path}`, error: error.message });
      }
    }
  }

  // Also check the migration logs to see what happened
  const migrationFiles = ['cover-images-migration.json', 'chapter-images-migration.json'];

  for (const file of migrationFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      logger.info({ msg: `\nChecking migration file: ${file}` });
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Look for our problem books
      for (const book of problemBooks) {
        if (content[book]) {
          logger.info({ msg: `Found ${book} in migration:`, data: content[book] });
        }
      }
    }
  }
}

findAssets().catch(console.error);
