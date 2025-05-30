/**
 * Test The Republic's cover image
 */
import dotenv from 'dotenv';
import path from 'path';

import { getAssetUrl } from '../utils.js';
import { logger as _logger } from '../utils/logger.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testRepublic() {
  const republicCoverPath = '/assets/covers/placeholder.jpg';
  const url = getAssetUrl(republicCoverPath, true);

  logger.info({ msg: 'Testing The Republic cover', path: republicCoverPath, url });

  try {
    const response = await fetch(url);
    logger.info({
      msg: 'Result',
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
    });

    if (response.ok) {
      logger.info({ msg: '✓ The Republic placeholder is now working!' });
    } else {
      logger.error({
        msg: '✗ The Republic placeholder still not working',
        status: response.status,
      });
    }
  } catch (error) {
    logger.error({ msg: 'Error fetching cover', error: error.message });
  }
}

testRepublic().catch(console.error);
