/**
 * Script to verify audio file migration
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

import translations from '../translations';
import { logger as rootLogger } from '../utils/logger';
import { adaptTranslation } from '../utils/migration/TranslationAdapter';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { blobService } from '../utils/services';

// Create a script-specific logger instance
const logger = rootLogger.child({ script: 'verifyAudioMigration.ts' });

dotenv.config({ path: '.env.local' });

interface VerificationResult {
  bookSlug: string;
  audioPath: string;
  blobUrl: string;
  exists: boolean;
  error?: string;
}

/**
 * Check if an audio file exists at the given URL
 */
async function checkAudioFileExists(blobUrl: string): Promise<boolean> {
  try {
    const response = await fetch(blobUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    logger.error({ msg: 'Error checking audio file existence', url: blobUrl, error });
    return false;
  }
}

/**
 * Process a single audio file and verify its existence
 */
async function verifyAudioFile(
  audioPath: string,
  bookSlug: string,
  blobBaseUrl: string,
  counters: { total: number; successful: number; failed: number }
): Promise<VerificationResult> {
  counters.total++;

  try {
    // Get the path part without domain
    const pathOnly = audioPath.replace(/^https?:\/\/[^/]+\//, '');

    // Construct the correct URL with the actual Blob base URL
    const blobUrl = `${blobBaseUrl}/${pathOnly}`;

    // Check if the file exists
    const exists = await checkAudioFileExists(blobUrl);

    if (exists) {
      counters.successful++;
      logger.info({ msg: 'Audio file exists', url: blobUrl });
    } else {
      counters.failed++;
      logger.error({ msg: 'Audio file not found', url: blobUrl });
    }

    return {
      bookSlug,
      audioPath,
      blobUrl,
      exists,
    };
  } catch (error) {
    counters.failed++;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ msg: 'Error verifying audio file', path: audioPath, error: errorMessage });

    return {
      bookSlug,
      audioPath,
      blobUrl: '',
      exists: false,
      error: errorMessage,
    };
  }
}

/**
 * Process all audio files for a book
 */
async function verifyBookAudio(
  book: { slug: string; title: string; chapters?: Array<{ audioSrc?: string }> },
  blobBaseUrl: string,
  counters: { total: number; successful: number; failed: number }
): Promise<VerificationResult[]> {
  const bookResults: VerificationResult[] = [];

  logger.info({
    msg: `Verifying audio files for book`,
    bookTitle: book.title,
    bookSlug: book.slug,
  });

  // Skip if no chapters
  if (!book.chapters) {
    return bookResults;
  }

  // Process each chapter
  for (const chapter of book.chapters) {
    if (chapter.audioSrc && typeof chapter.audioSrc === 'string') {
      const result = await verifyAudioFile(chapter.audioSrc, book.slug, blobBaseUrl, counters);
      bookResults.push(result);
    }
  }

  return bookResults;
}

/**
 * Save verification report to a file
 */
async function saveVerificationReport(
  summary: { total: number; successful: number; failed: number },
  results: VerificationResult[]
): Promise<string> {
  // Calculate success rate
  const successRate =
    summary.total > 0 ? Math.round((summary.successful / summary.total) * 100) : 0;

  // Create report object
  const report = {
    date: new Date().toISOString(),
    summary: {
      total: summary.total,
      successful: summary.successful,
      failed: summary.failed,
      successRate: `${successRate}%`,
    },
    results,
  };

  // Generate report path
  const reportPath = path.join(process.cwd(), 'reports', `audio-verification-${Date.now()}.json`);

  // Ensure reports directory exists
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!existsSync(reportsDir)) {
    await fs.mkdir(reportsDir, { recursive: true });
  }

  // Write report
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  logger.info({ msg: 'Verification report saved', path: reportPath });

  return reportPath;
}

/**
 * Main function to verify audio file migration
 */
async function verifyAudioMigration() {
  const results: VerificationResult[] = [];
  const counters = { total: 0, successful: 0, failed: 0 };

  // Get correct Blob base URL from environment
  const blobBaseUrl =
    process.env.NEXT_PUBLIC_BLOB_BASE_URL ||
    process.env.NEXT_PUBLIC_BLOB_DEV_URL ||
    'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com';

  logger.info({
    msg: 'Starting audio migration verification',
    blobBaseUrl,
  });

  // Process each book with adapted translations
  for (const translation of translations) {
    const adaptedBook = adaptTranslation(translation);
    const bookResults = await verifyBookAudio(adaptedBook, blobBaseUrl, counters);
    results.push(...bookResults);
  }

  // Summarize results
  const successRate =
    counters.total > 0 ? Math.round((counters.successful / counters.total) * 100) : 0;

  logger.info({
    msg: 'Audio Migration Verification Summary',
    summary: {
      total: counters.total,
      successful: counters.successful,
      failed: counters.failed,
      successRate: `${successRate}%`,
    },
  });

  // Save verification report
  await saveVerificationReport(counters, results);

  // Create report object to return
  return {
    date: new Date().toISOString(),
    summary: {
      total: counters.total,
      successful: counters.successful,
      failed: counters.failed,
      successRate: `${successRate}%`,
    },
    results,
  };
}

// Run verification if executed directly
if (require.main === module) {
  verifyAudioMigration()
    .then(() => logger.info({ msg: 'Audio migration verification complete!' }))
    .catch((error) => {
      logger.error({ msg: 'Audio migration verification failed', error });
      process.exit(1);
    });
}

export default verifyAudioMigration;
