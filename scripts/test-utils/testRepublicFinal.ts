/**
 * Test The Republic's actual cover image
 */
import dotenv from 'dotenv';
import path from 'path';

import { getAssetUrl } from '../../utils.js';
import { logger } from '../../utils/logger.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testRepublicFinal() {
  const republicCoverPath = '/assets/the-republic/images/republic-07.png';
  const url = getAssetUrl(republicCoverPath, true);

  logger.info({ msg: 'Testing The Republic actual cover', path: republicCoverPath, url });

  try {
    const response = await fetch(url);
    logger.info({
      msg: 'Result',
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
    });

    if (response.ok) {
      logger.info({ msg: '✓ The Republic now has its actual cover image!' });
    } else {
      logger.error({ msg: '✗ The Republic cover still not working', status: response.status });
    }
  } catch (error) {
    logger.error({ msg: 'Error fetching cover', error: error.message });
  }
}

testRepublicFinal().catch(console.error);
