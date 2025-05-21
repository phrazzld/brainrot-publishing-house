/**
 * Enhanced verification script for audio files in Blob storage
 *
 * This script verifies that audio files exist in Blob storage and checks
 * that they are proper audio files (not just 1KB placeholders).
 */
import fs from 'fs';
import path from 'path';

import translations from '../translations';
import { logger as rootLogger } from '../utils/logger';
import { blobService } from '../utils/services/BlobService';

// Create script-specific logger
const logger = rootLogger.child({ script: 'verifyAudioMigrationWithContent.ts' });

// Define verification result interface
interface VerificationResult {
  bookSlug: string;
  audioPath: string;
  blobUrl: string;
  exists: boolean;
  fileSize?: number;
  contentType?: string;
  isValidAudioFile?: boolean;
  error?: string;
}

/**
 * Get the Blob URL for an audio file path
 */
function getBlobUrlForAudioPath(audioPath: string, baseUrl?: string): string {
  if (audioPath.startsWith('http')) {
    // If it's already a full URL, use it directly
    return audioPath;
  }

  // Generate URL with the book path
  const normalizedPath = audioPath.startsWith('/') ? audioPath.substring(1) : audioPath;

  if (baseUrl) {
    return `${baseUrl}/${normalizedPath}`;
  }

  // Default to the standard Vercel Blob URL
  return `https://public.blob.vercel-storage.com/${normalizedPath}`;
}

/**
 * Check if an audio file is valid (sufficient size and correct content type)
 */
function isValidAudioFile(fileInfo: { size: number; contentType?: string }): boolean {
  return (
    fileInfo.size > 10 * 1024 &&
    (fileInfo.contentType?.startsWith('audio/') ||
      fileInfo.contentType === 'application/octet-stream')
  );
}

/**
 * Verify a single audio file
 */
async function verifyAudioFile(
  audioPath: string,
  bookSlug: string,
  baseUrl?: string,
  stats: { successful: number; failed: number } = { successful: 0, failed: 0 }
): Promise<VerificationResult> {
  if (!audioPath) {
    stats.failed++;
    return {
      bookSlug,
      audioPath: '',
      blobUrl: '',
      exists: false,
      error: 'No audio path provided',
    };
  }

  try {
    // Get the blob URL
    const blobUrl = getBlobUrlForAudioPath(audioPath, baseUrl);

    // Check if the file exists and get its properties
    const fileInfo = await blobService.getFileInfo(blobUrl);

    // Check if this is a valid audio file
    const validAudio = isValidAudioFile(fileInfo);

    if (validAudio) {
      logger.info({
        msg: 'Valid audio file exists',
        url: blobUrl,
        size: fileInfo.size,
        contentType: fileInfo.contentType,
        bookSlug,
      });
      stats.successful++;
    } else if (fileInfo.size > 0) {
      logger.warn({
        msg: 'Placeholder audio file exists',
        url: blobUrl,
        size: fileInfo.size,
        contentType: fileInfo.contentType,
        bookSlug,
      });
      stats.successful++; // Count as successful but warn
    } else {
      logger.error({
        msg: 'File exists but is empty',
        url: blobUrl,
        bookSlug,
      });
      stats.failed++;
    }

    // Create and return result
    return {
      bookSlug,
      audioPath,
      blobUrl,
      exists: true,
      fileSize: fileInfo.size,
      contentType: fileInfo.contentType,
      isValidAudioFile: validAudio,
    };
  } catch (error) {
    logger.error({
      msg: 'Audio file not found',
      path: audioPath,
      bookSlug,
      error,
    });

    stats.failed++;

    return {
      bookSlug,
      audioPath,
      blobUrl: '',
      exists: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process audio files for a book
 */
async function verifyBookAudioFiles(
  book: { slug: string; title: string; chapters: Array<{ audioSrc?: string }> },
  baseUrl?: string,
  stats: { totalFiles: number; successful: number; failed: number } = {
    totalFiles: 0,
    successful: 0,
    failed: 0,
  }
): Promise<VerificationResult[]> {
  logger.info({
    msg: 'Verifying audio files for book',
    bookTitle: book.title,
    bookSlug: book.slug,
  });

  // Find chapters with audio
  const chaptersWithAudio = book.chapters.filter((c) => c.audioSrc);

  // Skip books without audio
  if (chaptersWithAudio.length === 0) {
    return [];
  }

  stats.totalFiles += chaptersWithAudio.length;

  // Verify each audio file
  const results: VerificationResult[] = [];

  for (const chapter of chaptersWithAudio) {
    if (!chapter.audioSrc) continue;

    const result = await verifyAudioFile(chapter.audioSrc, book.slug, baseUrl, stats);

    results.push(result);
  }

  return results;
}

/**
 * Save the verification report to a file
 */
function saveVerificationReport(reportData: {
  date: string;
  summary: {
    total: number;
    successful: number;
    failed: number;
    placeholderCount: number;
    properAudioCount: number;
    successRate: string;
  };
  results: VerificationResult[];
}): string {
  const reportDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.resolve(reportDir, `audio-verification-content-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  logger.info({ msg: 'Verification report saved', path: reportPath });

  return reportPath;
}

/**
 * Main verification function
 */
async function verifyAudioMigration(): Promise<void> {
  logger.info({ msg: 'Starting audio migration verification with content checks' });

  // Use the Blob base URL from environment
  const baseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  logger.info({ msg: 'Using Blob base URL', baseUrl });

  const results: VerificationResult[] = [];
  const stats = { totalFiles: 0, successful: 0, failed: 0 };

  // Process each book in translations
  for (const book of translations) {
    const bookResults = await verifyBookAudioFiles(book, baseUrl, stats);
    results.push(...bookResults);
  }

  // Calculate statistics
  const successRate =
    stats.totalFiles > 0 ? ((stats.successful / stats.totalFiles) * 100).toFixed(1) + '%' : '0%';

  const placeholderCount = results.filter(
    (r) => r.exists && r.fileSize && r.fileSize < 10 * 1024
  ).length;

  const properAudioCount = results.filter((r) => r.isValidAudioFile).length;

  // Log summary
  logger.info({
    msg: 'Audio Migration Verification Summary',
    summary: {
      totalFiles: stats.totalFiles,
      filesFound: stats.successful,
      missingFiles: stats.failed,
      placeholderFiles: placeholderCount,
      properAudioFiles: properAudioCount,
      successRate,
    },
  });

  // Save report to file
  const reportData = {
    date: new Date().toISOString(),
    summary: {
      total: stats.totalFiles,
      successful: stats.successful,
      failed: stats.failed,
      placeholderCount,
      properAudioCount,
      successRate,
    },
    results,
  };

  saveVerificationReport(reportData);
  logger.info({ msg: 'Audio migration verification complete' });
}

// Complete verification function
async function verifyAudioMigrationWithContent(): Promise<void> {
  try {
    await verifyAudioMigration();
  } catch (error) {
    logger.error({ msg: 'Error in verification', error });
    throw error;
  }
}

// Run the verification if this is the main module
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''));
if (isMainModule) {
  verifyAudioMigrationWithContent().catch((error) => {
    logger.error({ msg: 'Verification failed', error });
    process.exit(1);
  });
}

export default verifyAudioMigrationWithContent;
