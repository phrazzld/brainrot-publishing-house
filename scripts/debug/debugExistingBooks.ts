/**
 * Debug script to find where existing book covers are stored
 */
import { logger as _logger } from '../utils/logger';
import { blobService } from '../utils/services/BlobService';

// Book cover paths from translation files
const bookCovers = [
  { book: 'the-iliad', path: '/assets/the-iliad/images/the-iliad-01.png' },
  { book: 'the-odyssey', path: '/assets/the-odyssey/images/the-odyssey-01.png' },
  { book: 'the-aeneid', path: '/assets/the-aeneid/images/the-aeneid-01.png' },
  { book: 'hamlet', path: '/assets/hamlet/images/hamlet-07.png' },
  { book: 'the-republic', path: '/assets/covers/placeholder.jpg' },
];

// Possible paths to check
function getPossiblePaths(book: string, originalPath: string): string[] {
  const filename = originalPath.split('/').pop()!;
  return [
    // New format
    `assets/${book}/images/${filename}`,
    // Old format
    `books/${book}/images/${filename}`,
    // Direct images folder
    `images/${filename}`,
    // Special cases
    `images/chapter-images/${book}/${filename}`,
    // Direct path without prefix
    originalPath.substring(1), // Remove leading slash
  ];
}

async function findBookCovers() {
  logger.info({ msg: 'Searching for existing book covers...' });

  for (const { book, path } of bookCovers) {
    logger.info({ msg: `\nChecking ${book}`, originalPath: path });

    const possiblePaths = getPossiblePaths(book, path);
    let found = false;

    for (const testPath of possiblePaths) {
      try {
        const url = blobService.getUrlForPath(testPath);
        const response = await fetch(url, { method: 'HEAD' });

        if (response.ok) {
          logger.info({ msg: `✓ Found at: ${testPath}`, url });
          found = true;
          break;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    if (!found) {
      logger.error({ msg: `✗ ${book} cover not found in any location` });
    }
  }
}

findBookCovers().catch(console.error);
