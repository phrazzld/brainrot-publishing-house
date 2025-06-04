#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { put } from '@vercel/blob';
import { pino } from 'pino';

dotenv.config({ path: '.env.local' });

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

interface Migration {
  book: string;
  sourcePath: string;
  targetPath: string;
}

const migrations: Migration[] = [
  {
    book: 'pride-and-prejudice',
    sourcePath: 'books/pride-and-prejudice/images/pride-and-prejudice-01.png',
    targetPath: 'assets/pride-and-prejudice/images/pride-and-prejudice-01.png',
  },
  {
    book: 'paradise-lost',
    sourcePath: 'books/paradise-lost/images/paradise-lost-01.png',
    targetPath: 'assets/paradise-lost/images/paradise-lost-01.png',
  },
  {
    book: 'meditations',
    sourcePath: 'books/meditations/images/meditations-01.png',
    targetPath: 'assets/meditations/images/meditations-01.png',
  },
  {
    book: 'the-divine-comedy-inferno',
    sourcePath: 'images/inferno-01.png',
    targetPath: 'assets/the-divine-comedy-inferno/images/inferno-01.png',
  },
  {
    book: 'the-divine-comedy-purgatorio',
    sourcePath: 'images/purgatorio-02.png',
    targetPath: 'assets/the-divine-comedy-purgatorio/images/purgatorio-02.png',
  },
  {
    book: 'the-divine-comedy-paradiso',
    sourcePath: 'images/paradiso-02.png',
    targetPath: 'assets/the-divine-comedy-paradiso/images/paradiso-02.png',
  },
  {
    book: 'the-bible-old-testament',
    sourcePath: 'images/old-testament-03.png',
    targetPath: 'assets/the-bible-old-testament/images/old-testament-03.png',
  },
  {
    book: 'the-bible-new-testament',
    sourcePath: 'images/new-testament-01.png',
    targetPath: 'assets/the-bible-new-testament/images/new-testament-01.png',
  },
  {
    book: 'the-quran',
    sourcePath: 'images/quran-01.png',
    targetPath: 'assets/the-quran/images/quran-01.png',
  },
  {
    book: 'romeo-and-juliet',
    sourcePath: 'images/romeo-and-juliet-02.png',
    targetPath: 'assets/romeo-and-juliet/images/romeo-and-juliet-02.png',
  },
  {
    book: 'a-midsummer-nights-dream',
    sourcePath: 'images/midsummer-02.png',
    targetPath: 'assets/a-midsummer-nights-dream/images/midsummer-02.png',
  },
  {
    book: 'gilgamesh',
    sourcePath: 'images/gilgamesh-01.png',
    targetPath: 'assets/gilgamesh/images/gilgamesh-01.png',
  },
  {
    book: 'bhagavad-gita',
    sourcePath: 'images/gita-01.png',
    targetPath: 'assets/bhagavad-gita/images/gita-01.png',
  },
];

async function getBlobUrl(path: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL || 'https://public.blob.vercel-storage.com';
  return `${baseUrl}/${path}`;
}

async function checkFileExists(path: string): Promise<boolean> {
  try {
    const url = await getBlobUrl(path);
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function copyBlob(sourcePath: string, targetPath: string): Promise<boolean> {
  try {
    // Download the source file
    const sourceUrl = await getBlobUrl(sourcePath);
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      logger.error(`Failed to download ${sourcePath}: ${response.status}`);
      return false;
    }

    const blob = await response.blob();

    // Upload to the target path
    const result = await put(targetPath, blob, {
      contentType: response.headers.get('content-type') || 'image/png',
      addRandomSuffix: false,
      access: 'public',
    });

    logger.info(`Copied ${sourcePath} to ${targetPath}`);
    logger.info(`New URL: ${result.url}`);

    return true;
  } catch (error) {
    logger.error(`Failed to copy ${sourcePath} to ${targetPath}:`, error);
    return false;
  }
}

async function migrateCovers(dryRun: boolean = false): Promise<void> {
  const results = {
    success: [] as string[],
    alreadyExists: [] as string[],
    failed: [] as string[],
  };

  for (const migration of migrations) {
    logger.info(`\nProcessing ${migration.book}...`);

    // Check if source exists
    const sourceExists = await checkFileExists(migration.sourcePath);
    if (!sourceExists) {
      logger.error(`Source file not found: ${migration.sourcePath}`);
      results.failed.push(migration.book);
      continue;
    }

    // Check if target already exists
    const targetExists = await checkFileExists(migration.targetPath);
    if (targetExists) {
      logger.info(`Target already exists: ${migration.targetPath}`);
      results.alreadyExists.push(migration.book);
      continue;
    }

    if (dryRun) {
      logger.info(`[DRY RUN] Would copy ${migration.sourcePath} to ${migration.targetPath}`);
      results.success.push(migration.book);
    } else {
      const success = await copyBlob(migration.sourcePath, migration.targetPath);
      if (success) {
        results.success.push(migration.book);
      } else {
        results.failed.push(migration.book);
      }
    }
  }

  // Print summary
  logger.info('\n=== Migration Summary ===');
  logger.info(`Total books: ${migrations.length}`);
  logger.info(`Successful: ${results.success.length}`);
  logger.info(`Already exists: ${results.alreadyExists.length}`);
  logger.info(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    logger.error('\nFailed migrations:');
    results.failed.forEach((book) => logger.error(`  - ${book}`));
  }

  if (results.alreadyExists.length > 0) {
    logger.info('\nAlready exists:');
    results.alreadyExists.forEach((book) => logger.info(`  - ${book}`));
  }

  if (results.success.length > 0) {
    logger.info('\nSuccessful migrations:');
    results.success.forEach((book) => logger.info(`  - ${book}`));
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  logger.info('Starting coming soon book cover migration...');
  logger.info(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}\n`);

  await migrateCovers(isDryRun);
}

main().catch((error) => {
  logger.error(error, 'Script failed');
  process.exit(1);
});
