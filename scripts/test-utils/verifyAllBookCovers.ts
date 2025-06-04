/**
 * Verify all book covers are accessible - both existing and coming soon
 */
import dotenv from 'dotenv';
import path from 'path';

import { getAssetUrl } from '../../utils.js';
import { logger } from '../../utils/logger.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// All books with their cover paths from translation files
const allBooks = [
  // Existing books (should be in old format: books/*/images/*)
  { name: 'hamlet', path: '/assets/hamlet/images/hamlet-07.png', type: 'existing' },
  { name: 'the-iliad', path: '/assets/the-iliad/images/the-iliad-01.png', type: 'existing' },
  { name: 'the-odyssey', path: '/assets/the-odyssey/images/the-odyssey-01.png', type: 'existing' },
  { name: 'the-aeneid', path: '/assets/the-aeneid/images/the-aeneid-01.png', type: 'existing' },

  // Coming soon books (should be in new format: assets/*/images/*)
  {
    name: 'pride-and-prejudice',
    path: '/assets/pride-and-prejudice/images/pride-and-prejudice-01.png',
    type: 'coming-soon',
  },
  {
    name: 'paradise-lost',
    path: '/assets/paradise-lost/images/paradise-lost-01.png',
    type: 'coming-soon',
  },
  {
    name: 'meditations',
    path: '/assets/meditations/images/meditations-01.png',
    type: 'coming-soon',
  },
  {
    name: 'divine-comedy-inferno',
    path: '/assets/the-divine-comedy-inferno/images/inferno-01.png',
    type: 'coming-soon',
  },
  {
    name: 'divine-comedy-purgatorio',
    path: '/assets/the-divine-comedy-purgatorio/images/purgatorio-02.png',
    type: 'coming-soon',
  },
  {
    name: 'divine-comedy-paradiso',
    path: '/assets/the-divine-comedy-paradiso/images/paradiso-02.png',
    type: 'coming-soon',
  },
  {
    name: 'bible-old-testament',
    path: '/assets/the-bible-old-testament/images/old-testament-03.png',
    type: 'coming-soon',
  },
  {
    name: 'bible-new-testament',
    path: '/assets/the-bible-new-testament/images/new-testament-01.png',
    type: 'coming-soon',
  },
  { name: 'quran', path: '/assets/the-quran/images/quran-01.png', type: 'coming-soon' },
  {
    name: 'romeo-and-juliet',
    path: '/assets/romeo-and-juliet/images/romeo-and-juliet-02.png',
    type: 'coming-soon',
  },
  {
    name: 'midsummer-nights-dream',
    path: '/assets/a-midsummer-nights-dream/images/midsummer-02.png',
    type: 'coming-soon',
  },
  { name: 'gilgamesh', path: '/assets/gilgamesh/images/gilgamesh-01.png', type: 'coming-soon' },
  { name: 'bhagavad-gita', path: '/assets/bhagavad-gita/images/gita-01.png', type: 'coming-soon' },
];

async function verifyCovers() {
  logger.info({ msg: 'Verifying all book covers...' });
  const results: {
    book: string;
    url: string;
    type: string;
    status: 'success' | 'failed';
    error?: string;
  }[] = [];

  for (const book of allBooks) {
    const url = getAssetUrl(book.path, true);

    try {
      logger.info({ msg: `Testing ${book.name} (${book.type})`, url });
      const response = await fetch(url);

      if (response.ok) {
        logger.info({ msg: `✓ ${book.name} cover is accessible` });
        results.push({ book: book.name, url, type: book.type, status: 'success' });
      } else {
        logger.error({ msg: `✗ ${book.name} cover returned ${response.status}`, url });
        results.push({
          book: book.name,
          url,
          type: book.type,
          status: 'failed',
          error: `HTTP ${response.status}`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ msg: `✗ ${book.name} cover failed to fetch`, url, error: errorMessage });
      results.push({
        book: book.name,
        url,
        type: book.type,
        status: 'failed',
        error: errorMessage,
      });
    }
  }

  // Summary by type
  const existingSuccess = results.filter(
    (r) => r.type === 'existing' && r.status === 'success',
  ).length;
  const existingFailed = results.filter(
    (r) => r.type === 'existing' && r.status === 'failed',
  ).length;
  const comingSoonSuccess = results.filter(
    (r) => r.type === 'coming-soon' && r.status === 'success',
  ).length;
  const comingSoonFailed = results.filter(
    (r) => r.type === 'coming-soon' && r.status === 'failed',
  ).length;

  logger.info({
    msg: 'Verification complete',
    existing: { success: existingSuccess, failed: existingFailed },
    comingSoon: { success: comingSoonSuccess, failed: comingSoonFailed },
    total: results.length,
  });

  if (existingFailed > 0) {
    logger.error({
      msg: 'Failed existing book covers:',
      failed: results.filter((r) => r.type === 'existing' && r.status === 'failed'),
    });
  }

  if (comingSoonFailed > 0) {
    logger.error({
      msg: 'Failed coming soon covers:',
      failed: results.filter((r) => r.type === 'coming-soon' && r.status === 'failed'),
    });
  }
}

verifyCovers().catch(console.error);
