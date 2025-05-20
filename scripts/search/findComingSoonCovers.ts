#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { list } from '@vercel/blob';
import pino from 'pino';

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

interface CoverMapping {
  book: string;
  originalPath: string;
  foundPaths: string[];
  recommendedPath: string;
}

// Coming soon books and their original cover paths from git history
const comingSoonBooks = [
  {
    slug: 'pride-and-prejudice',
    originalPath: '/assets/pride-and-prejudice/images/pride-and-prejudice-01.png',
  },
  { slug: 'paradise-lost', originalPath: '/assets/paradise-lost/images/paradise-lost-01.png' },
  { slug: 'meditations', originalPath: '/assets/meditations/images/meditations-01.png' },
  { slug: 'the-divine-comedy-inferno', originalPath: '/assets/images/inferno-01.png' },
  { slug: 'the-divine-comedy-purgatorio', originalPath: '/assets/images/purgatorio-02.png' },
  { slug: 'the-divine-comedy-paradiso', originalPath: '/assets/images/paradiso-02.png' },
  { slug: 'the-bible-old-testament', originalPath: '/assets/images/old-testament-03.png' },
  { slug: 'the-bible-new-testament', originalPath: '/assets/images/new-testament-01.png' },
  { slug: 'the-quran', originalPath: '/assets/images/quran-01.png' },
  { slug: 'romeo-and-juliet', originalPath: '/assets/images/romeo-and-juliet-02.png' },
  { slug: 'a-midsummer-nights-dream', originalPath: '/assets/images/midsummer-02.png' },
  { slug: 'gilgamesh', originalPath: '/assets/images/gilgamesh-01.png' },
  { slug: 'bhagavad-gita', originalPath: '/assets/images/gita-01.png' },
];

async function searchForCoverImages(): Promise<CoverMapping[]> {
  const mappings: CoverMapping[] = [];

  // First, let's list all image files in blob storage
  logger.info('Listing all image files in blob storage...');

  const imageFiles: string[] = [];
  let cursor: string | undefined;

  do {
    const result = await list({ cursor });
    const images = result.blobs.filter((blob) =>
      blob.pathname.match(/\.(png|jpg|jpeg|gif|webp)$/i)
    );

    imageFiles.push(...images.map((img) => img.pathname));
    cursor = result.cursor;
  } while (cursor);

  logger.info(`Found ${imageFiles.length} total image files`);

  // Now search for each coming soon book's cover
  for (const book of comingSoonBooks) {
    logger.info(`\nSearching for ${book.slug} cover...`);
    logger.info(`Original path: ${book.originalPath}`);

    // Extract the filename from the original path
    const filename = book.originalPath.split('/').pop()!;
    const baseFilename = filename.replace(/\.[^.]+$/, ''); // Remove extension

    // Search strategies:
    // 1. Direct match
    // 2. Filename match (anywhere in blob)
    // 3. Partial filename match
    // 4. Book slug match

    const foundPaths: string[] = [];

    // Direct path match (without leading slash)
    const directPath = book.originalPath.replace(/^\//, '');
    if (imageFiles.includes(directPath)) {
      foundPaths.push(directPath);
    }

    // Filename match anywhere
    const filenameMatches = imageFiles.filter((path) => path.endsWith(filename));
    foundPaths.push(...filenameMatches);

    // Partial filename matches
    const partialMatches = imageFiles.filter((path) =>
      path.toLowerCase().includes(baseFilename.toLowerCase())
    );
    foundPaths.push(...partialMatches);

    // Book slug matches
    const slugMatches = imageFiles.filter((path) =>
      path.toLowerCase().includes(book.slug.toLowerCase())
    );
    foundPaths.push(...slugMatches);

    // Remove duplicates
    const uniquePaths = [...new Set(foundPaths)];

    logger.info(`Found ${uniquePaths.length} potential matches:`);
    uniquePaths.forEach((path) => logger.info(`  - ${path}`));

    // Determine the recommended path
    const recommendedPath = `assets/${book.slug}/images/${filename}`;

    mappings.push({
      book: book.slug,
      originalPath: book.originalPath,
      foundPaths: uniquePaths,
      recommendedPath,
    });
  }

  return mappings;
}

async function generateMigrationScript(mappings: CoverMapping[]): Promise<void> {
  const migrateCommands: string[] = [];

  for (const mapping of mappings) {
    if (mapping.foundPaths.length > 0) {
      // Use the most likely path (prefer direct matches, then filename matches)
      const sourcePath = mapping.foundPaths[0];

      migrateCommands.push(`
# ${mapping.book}
# Original: ${mapping.originalPath}
# Found at: ${sourcePath}
# Move to: ${mapping.recommendedPath}
echo "Moving ${mapping.book} cover..."
# Use a blob copy script or API to move from:
# ${sourcePath}
# to:
# ${mapping.recommendedPath}
`);
    } else {
      migrateCommands.push(`
# ${mapping.book}
# WARNING: Cover not found!
# Original: ${mapping.originalPath}
# Recommended: ${mapping.recommendedPath}
echo "WARNING: Cover not found for ${mapping.book}"
`);
    }
  }

  logger.info('\n=== Migration Commands ===');
  logger.info(migrateCommands.join('\n'));
}

async function main() {
  logger.info('Starting coming soon book cover search...\n');

  const mappings = await searchForCoverImages();

  // Generate summary report
  logger.info('\n=== Summary Report ===');

  const found = mappings.filter((m) => m.foundPaths.length > 0);
  const notFound = mappings.filter((m) => m.foundPaths.length === 0);

  logger.info(`Total books: ${mappings.length}`);
  logger.info(`Covers found: ${found.length}`);
  logger.info(`Covers not found: ${notFound.length}`);

  if (notFound.length > 0) {
    logger.warn('\nMissing covers:');
    notFound.forEach((m) => logger.warn(`  - ${m.book}: ${m.originalPath}`));
  }

  await generateMigrationScript(mappings);
}

main().catch((error) => {
  logger.error(error, 'Script failed');
  process.exit(1);
});
