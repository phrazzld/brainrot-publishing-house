import * as dotenv from 'dotenv';
import pino from 'pino';

import { getAssetUrl } from '../../utils.js';

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

interface TestCase {
  name: string;
  translationPath: string;
  expectedBlobPath: string;
}

const testCases: TestCase[] = [
  {
    name: 'Declaration of Independence text',
    translationPath: '/assets/text/declaration-of-independence/brainrot-declaration.txt',
    expectedBlobPath: 'books/the-declaration/text/brainrot-the-declaration-of-independence.txt',
  },
  {
    name: 'Declaration of Independence cover',
    translationPath: '/assets/declaration-of-independence/images/the-declaration-01.png',
    expectedBlobPath: 'books/the-declaration-of-independence/images/america-01.png',
  },
  {
    name: 'Huckleberry Finn cover',
    translationPath: '/assets/the-adventures-of-huckleberry-finn/images/huck-finn-09.png',
    expectedBlobPath: 'books/the-adventures-of-huckleberry-finn/images/huck-finn-09.png',
  },
  {
    name: 'Placeholder image',
    translationPath: '/assets/covers/placeholder.jpg',
    expectedBlobPath: 'assets/images/placeholder.jpg',
  },
];

async function verifyMapping(testCase: TestCase): Promise<void> {
  const { name, translationPath, expectedBlobPath } = testCase;

  logger.info(`\nTesting: ${name}`);
  logger.info(`Translation path: ${translationPath}`);

  // Get the URL using our mapping
  const url = getAssetUrl(translationPath, true);
  const baseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  const expectedUrl = `${baseUrl}/${expectedBlobPath}`;

  logger.info(`Generated URL: ${url}`);
  logger.info(`Expected URL: ${expectedUrl}`);

  // Check if the mapping worked correctly
  if (url === expectedUrl) {
    logger.info(`✅ Mapping correct!`);
  } else {
    logger.error(`❌ Mapping incorrect!`);
    logger.error(`Expected: ${expectedUrl}`);
    logger.error(`Got: ${url}`);
  }

  // Test if the URL is accessible
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      logger.info(`✅ Asset accessible at URL`);
    } else {
      logger.error(`❌ Asset not accessible: ${response.status}`);
    }
  } catch (error) {
    logger.error(`❌ Failed to check asset: ${error}`);
  }
}

async function main() {
  logger.info('Starting asset mapping verification...');

  for (const testCase of testCases) {
    await verifyMapping(testCase);
  }

  logger.info('\nVerification complete!');
}

main().catch((error) => {
  logger.error(error, 'Script failed');
  process.exit(1);
});
