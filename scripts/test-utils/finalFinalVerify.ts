/**
 * Final verification with The Republic's actual cover
 */
import dotenv from 'dotenv';
import path from 'path';

import { getAssetUrl } from '../utils';
import { logger as _logger } from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const allBooks = [
  // Existing books
  { name: 'hamlet', path: '/assets/hamlet/images/hamlet-07.png', type: 'existing' },
  { name: 'the-iliad', path: '/assets/the-iliad/images/the-iliad-01.png', type: 'existing' },
  { name: 'the-odyssey', path: '/assets/the-odyssey/images/the-odyssey-01.png', type: 'existing' },
  { name: 'the-aeneid', path: '/assets/the-aeneid/images/the-aeneid-01.png', type: 'existing' },

  // Coming soon books
  {
    name: 'the-republic',
    path: '/assets/the-republic/images/republic-07.png',
    type: 'coming-soon',
  },
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

async function finalFinalVerify() {
  logger.info({ msg: "Final verification with The Republic's actual cover..." });
  const results: any[] = [];

  for (const book of allBooks) {
    const url = getAssetUrl(book.path, true);

    try {
      const response = await fetch(url);

      if (response.ok) {
        logger.info({
          msg: `✓ ${book.name}${book.name === 'the-republic' ? ' (ACTUAL COVER!)' : ''}`,
        });
        results.push({ ...book, status: 'success' });
      } else {
        logger.error({ msg: `✗ ${book.name} - ${response.status}` });
        results.push({ ...book, status: 'failed', error: `HTTP ${response.status}` });
      }
    } catch (error) {
      logger.error({ msg: `✗ ${book.name} - ${error.message}` });
      results.push({ ...book, status: 'failed', error: error.message });
    }
  }

  const successful = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  logger.info({
    msg: '\nFinal Summary',
    total: results.length,
    successful,
    failed,
    allWorking: failed === 0,
  });

  if (failed > 0) {
    logger.error({ msg: 'Failed books:', failed: results.filter((r) => r.status === 'failed') });
  } else {
    logger.info({ msg: '🎉 All books including The Republic with its actual cover are working!' });
  }
}

finalFinalVerify().catch(console.error);
