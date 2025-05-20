/**
 * Verify all coming soon book covers are accessible
 */
import dotenv from 'dotenv';
import path from 'path';

import { getAssetUrl } from '../utils';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const comingSoonBooks = [
  {
    name: 'pride-and-prejudice',
    path: '/assets/pride-and-prejudice/images/pride-and-prejudice-01.png',
  },
  { name: 'paradise-lost', path: '/assets/paradise-lost/images/paradise-lost-01.png' },
  { name: 'meditations', path: '/assets/meditations/images/meditations-01.png' },
  {
    name: 'divine-comedy-inferno',
    path: '/assets/the-divine-comedy-inferno/images/inferno-01.png',
  },
  {
    name: 'divine-comedy-purgatorio',
    path: '/assets/the-divine-comedy-purgatorio/images/purgatorio-02.png',
  },
  {
    name: 'divine-comedy-paradiso',
    path: '/assets/the-divine-comedy-paradiso/images/paradiso-02.png',
  },
  {
    name: 'bible-old-testament',
    path: '/assets/the-bible-old-testament/images/old-testament-03.png',
  },
  {
    name: 'bible-new-testament',
    path: '/assets/the-bible-new-testament/images/new-testament-01.png',
  },
  { name: 'quran', path: '/assets/the-quran/images/quran-01.png' },
  { name: 'romeo-and-juliet', path: '/assets/romeo-and-juliet/images/romeo-and-juliet-02.png' },
  {
    name: 'midsummer-nights-dream',
    path: '/assets/a-midsummer-nights-dream/images/midsummer-02.png',
  },
  { name: 'gilgamesh', path: '/assets/gilgamesh/images/gilgamesh-01.png' },
  { name: 'bhagavad-gita', path: '/assets/bhagavad-gita/images/gita-01.png' },
];

async function verifyCovers() {
  logger.info({ msg: 'Verifying coming soon book covers...' });
  const results: { book: string; url: string; status: 'success' | 'failed'; error?: string }[] = [];

  for (const book of comingSoonBooks) {
    const url = getAssetUrl(book.path, true);

    try {
      logger.info({ msg: `Testing ${book.name}`, url });
      const response = await fetch(url);

      if (response.ok) {
        logger.info({ msg: `✓ ${book.name} cover is accessible` });
        results.push({ book: book.name, url, status: 'success' });
      } else {
        logger.error({ msg: `✗ ${book.name} cover returned ${response.status}`, url });
        results.push({ book: book.name, url, status: 'failed', error: `HTTP ${response.status}` });
      }
    } catch (error) {
      logger.error({ msg: `✗ ${book.name} cover failed to fetch`, url, error: error.message });
      results.push({ book: book.name, url, status: 'failed', error: error.message });
    }
  }

  // Summary
  const successful = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  logger.info({
    msg: 'Verification complete',
    successful,
    failed,
    total: results.length,
  });

  if (failed > 0) {
    logger.error({
      msg: 'Failed covers:',
      failed: results.filter((r) => r.status === 'failed'),
    });
  }
}

verifyCovers().catch(console.error);
