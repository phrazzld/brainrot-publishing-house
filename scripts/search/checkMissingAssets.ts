import { promises as fs } from 'fs';
import fetch from 'node-fetch';
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

interface AssetCheck {
  name: string;
  path: string;
  exists: boolean;
  statusCode?: number;
  error?: string;
  url?: string;
}

async function checkAsset(name: string, path: string): Promise<AssetCheck> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BLOB_BASE_URL ||
    'https://8fcrqxvvve8bqthz.public.blob.vercel-storage.com';
  const url = `${baseUrl}${path}`;

  try {
    logger.info({ name, path, url }, `Checking asset`);
    const response = await fetch(url, { method: 'HEAD' });

    return {
      name,
      path,
      exists: response.ok,
      statusCode: response.status,
      url,
    };
  } catch (error) {
    return {
      name,
      path,
      exists: false,
      error: error instanceof Error ? error.message : String(error),
      url,
    };
  }
}

async function main() {
  logger.info('Starting missing asset verification...');

  const missingAssets = [
    {
      name: 'Huckleberry Finn cover art',
      path: '/assets/the-adventures-of-huckleberry-finn/images/huck-finn-09.png',
      standardPath: '/assets/images/the-adventures-of-huckleberry-finn/huck-finn-09.png',
    },
    {
      name: 'Declaration of Independence text',
      path: '/assets/text/declaration-of-independence/brainrot-declaration.txt',
      standardPath: '/assets/text/declaration-of-independence/brainrot-declaration.txt',
    },
    {
      name: 'Declaration of Independence cover art',
      path: '/assets/declaration-of-independence/images/the-declaration-01.png',
      standardPath: '/assets/images/declaration-of-independence/the-declaration-01.png',
    },
    {
      name: 'Placeholder cover (for coming soon books)',
      path: '/assets/covers/placeholder.jpg',
      standardPath: '/assets/images/placeholder.jpg',
    },
  ];

  const results: AssetCheck[] = [];

  for (const asset of missingAssets) {
    // Check legacy path
    const legacyResult = await checkAsset(`${asset.name} (legacy)`, asset.path);
    results.push(legacyResult);

    // Check standardized path
    const standardResult = await checkAsset(`${asset.name} (standard)`, asset.standardPath);
    results.push(standardResult);
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalChecked: results.length,
    found: results.filter((r) => r.exists).length,
    missing: results.filter((r) => !r.exists).length,
    details: results,
  };

  // Save report
  const reportPath = `missing-assets-check-${Date.now()}.json`;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  // Log summary
  logger.info('=== Missing Assets Check Summary ===');
  results.forEach((result) => {
    if (result.exists) {
      logger.info(`✅ ${result.name}: Found at ${result.url}`);
    } else {
      logger.error(
        `❌ ${result.name}: Not found at ${result.url} (${result.statusCode || result.error})`
      );
    }
  });

  logger.info(`Report saved to: ${reportPath}`);
}

main().catch((error) => {
  logger.error(error, 'Script failed');
  process.exit(1);
});
