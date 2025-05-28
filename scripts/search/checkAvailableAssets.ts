import { put as _put, list } from '@vercel/blob';
import pino from 'pino';

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

async function listAssetsForPrefix(prefix: string) {
  logger.info(`Listing assets for prefix: ${prefix}`);

  try {
    const { blobs } = await list({ prefix, limit: 100 });

    if (blobs.length === 0) {
      logger.warn(`No assets found for prefix: ${prefix}`);
    } else {
      logger.info(`Found ${blobs.length} assets for ${prefix}:`);
      blobs.forEach((blob) => {
        logger.info(`  - ${blob.pathname}`);
      });
    }

    return blobs;
  } catch (error) {
    logger.error({ error }, `Error listing assets for ${prefix}`);
    return [];
  }
}

async function main() {
  logger.info('Checking available assets in blob storage...');

  // Check for Huckleberry Finn assets
  await listAssetsForPrefix('assets/the-adventures-of-huckleberry-finn');
  await listAssetsForPrefix('assets/images/the-adventures-of-huckleberry-finn');

  // Check for Declaration of Independence assets
  await listAssetsForPrefix('assets/declaration-of-independence');
  await listAssetsForPrefix('assets/text/declaration-of-independence');
  await listAssetsForPrefix('assets/images/declaration-of-independence');

  // Check for placeholder images
  await listAssetsForPrefix('assets/covers');
  await listAssetsForPrefix('assets/images/placeholder');
}

main().catch((error) => {
  logger.error(error, 'Script failed');
  process.exit(1);
});
