#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import pino from 'pino';

import { getAssetUrl } from '../utils';

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

interface TestResult {
  name: string;
  translationPath: string;
  generatedUrl: string;
  status: number;
  success: boolean;
  reason?: string;
}

async function testAsset(name: string, translationPath: string): Promise<TestResult> {
  try {
    logger.info(`Testing: ${name}`);

    // Generate the URL using our mapping
    const url = getAssetUrl(translationPath, true);
    logger.info(`Generated URL: ${url}`);

    // Test if the URL is accessible
    const response = await fetch(url, { method: 'HEAD' });

    const result: TestResult = {
      name,
      translationPath,
      generatedUrl: url,
      status: response.status,
      success: response.ok,
      reason: response.ok ? undefined : `HTTP ${response.status}`,
    };

    if (response.ok) {
      logger.info(`✅ ${name}: Working`);
    } else {
      logger.error(`❌ ${name}: Not working (${response.status})`);
    }

    return result;
  } catch (error) {
    logger.error(`❌ ${name}: Error - ${error}`);
    return {
      name,
      translationPath,
      generatedUrl: '',
      status: 0,
      success: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  logger.info('Testing missing assets after path mapping fixes...\n');

  const assetsToTest = [
    {
      name: 'Huckleberry Finn cover',
      path: '/assets/the-adventures-of-huckleberry-finn/images/huck-finn-09.png',
    },
    {
      name: 'Declaration text',
      path: '/assets/text/declaration-of-independence/brainrot-declaration.txt',
    },
    {
      name: 'Declaration cover',
      path: '/assets/declaration-of-independence/images/the-declaration-01.png',
    },
    { name: 'Placeholder image', path: '/assets/covers/placeholder.jpg' },
  ];

  const results: TestResult[] = [];

  for (const asset of assetsToTest) {
    const result = await testAsset(asset.name, asset.path);
    results.push(result);
    logger.info('---');
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      working: results.filter((r) => r.success).length,
      notWorking: results.filter((r) => !r.success).length,
    },
    results,
  };

  const reportPath = `missing-assets-test-${Date.now()}.json`;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  // Log summary
  logger.info('\n=== Test Summary ===');
  logger.info(`Total: ${report.summary.total}`);
  logger.info(`Working: ${report.summary.working}`);
  logger.info(`Not Working: ${report.summary.notWorking}`);

  if (report.summary.notWorking > 0) {
    logger.error('\nFailed assets:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        logger.error(`- ${r.name}: ${r.reason}`);
      });
  }

  logger.info(`\nReport saved to: ${reportPath}`);
}

main().catch((error) => {
  logger.error(error, 'Script failed');
  process.exit(1);
});
