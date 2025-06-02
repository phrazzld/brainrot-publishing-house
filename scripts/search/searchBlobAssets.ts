import * as dotenv from 'dotenv';
import { list } from '@vercel/blob';
import { pino } from 'pino';

// Load environment variables
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

interface SearchResult {
  book: string;
  files: string[];
}

async function searchForAssets(bookSlugs: string[]): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (const slug of bookSlugs) {
    logger.info(`Searching for assets for: ${slug}`);
    const files: string[] = [];

    try {
      // Search for any files containing the book slug
      const prefixes = [
        `assets/${slug}`,
        `assets/text/${slug}`,
        `assets/images/${slug}`,
        `assets/audio/${slug}`,
        `books/${slug}`,
      ];

      for (const prefix of prefixes) {
        let cursor: string | undefined;

        do {
          const result = await list({ prefix, cursor });

          for (const blob of result.blobs) {
            files.push(blob.pathname);
            logger.info(`Found: ${blob.pathname}`);
          }

          cursor = result.cursor;
        } while (cursor);
      }

      // Also search for files that might contain the slug in their pathname
      const generalSearch = await list({ limit: 1000 });
      for (const blob of generalSearch.blobs) {
        if (blob.pathname.includes(slug) && !files.includes(blob.pathname)) {
          files.push(blob.pathname);
          logger.info(`Found (general search): ${blob.pathname}`);
        }
      }
    } catch (error) {
      logger.error(`Error searching for ${slug}:`, error);
    }

    results.push({ book: slug, files });
  }

  return results;
}

async function main() {
  logger.info('Starting blob asset search...');

  // Books to search for
  const booksToSearch = ['the-adventures-of-huckleberry-finn', 'declaration-of-independence'];

  const results = await searchForAssets(booksToSearch);

  // Print summary
  logger.info('\n=== Search Results ===');
  for (const result of results) {
    logger.info(`\n${result.book}:`);
    if (result.files.length === 0) {
      logger.warn('  No files found');
    } else {
      logger.info(`  Found ${result.files.length} files:`);
      result.files.forEach((file) => {
        logger.info(`    - ${file}`);
      });
    }
  }
}

main().catch((error) => {
  logger.error(error, 'Script failed');
  process.exit(1);
});
