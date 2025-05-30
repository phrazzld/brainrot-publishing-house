#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { list } from '@vercel/blob';
import type { ListBlobResult } from '@vercel/blob';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

import translations from '../translations/index.js';
import { logger } from '../utils/logger.js';

dotenv.config({ path: '.env.local' });

// Initialize logger
const scriptLogger = logger.child({
  module: 'audio-file-access-verification',
  script: 'verifyAudioFilesAccess',
});

/**
 * Audio file information
 */
interface AudioFile {
  pathname: string;
  size: number;
  uploadedAt: Date;
  url: string;
}

/**
 * Expected audio file information from translations
 */
interface ExpectedAudioFile {
  bookSlug: string;
  bookTitle: string;
  chapterIndex: number | null;
  chapterTitle: string | null;
  expectedPath: string;
  status: 'available' | 'coming soon';
}

/**
 * Audio verification result
 */
interface AudioVerificationResult {
  expected: ExpectedAudioFile;
  actual: AudioFile | null;
  exists: boolean;
  accessible: boolean | null;
  contentLength: number | null;
  error: string | null;
}

/**
 * Summary of verification
 */
interface VerificationSummary {
  totalExpected: number;
  totalFound: number;
  totalAccessible: number;
  missingFiles: ExpectedAudioFile[];
  inaccessibleFiles: {
    expected: ExpectedAudioFile;
    error: string;
  }[];
  bookSummary: {
    [bookSlug: string]: {
      title: string;
      status: 'available' | 'coming soon';
      expected: number;
      found: number;
      accessible: number;
      hasFullAudiobook: boolean;
    };
  };
  verificationDate: string;
}

/**
 * Fetch all audio files from Vercel Blob
 */
async function fetchAudioFiles(): Promise<AudioFile[]> {
  const audioFiles: AudioFile[] = [];
  let cursor: string | undefined;
  let page = 1;

  try {
    do {
      scriptLogger.info({
        msg: `Fetching audio files page ${page}...`,
        page,
      });

      const result: ListBlobResult = await list({ prefix: 'assets/audio/', cursor });

      // Filter for audio files
      const allAudioFiles = result.blobs.filter((blob) => blob.pathname.endsWith('.mp3'));

      // Transform to AudioFile format
      const transformedFiles = allAudioFiles.map((blob) => ({
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt),
        url: blob.url,
      }));

      audioFiles.push(...transformedFiles);

      scriptLogger.info({
        msg: `Page ${page}: Found ${allAudioFiles.length} audio files`,
        page,
        totalAudioFiles: allAudioFiles.length,
      });

      cursor = result.cursor;
      page++;
    } while (cursor);

    scriptLogger.info({
      msg: `Completed fetching audio files. Total found: ${audioFiles.length}`,
      totalFiles: audioFiles.length,
    });

    return audioFiles;
  } catch (error) {
    scriptLogger.error({
      msg: 'Error fetching audio files from Vercel Blob',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Get expected audio files from translations
 */
function getExpectedAudioFiles(): ExpectedAudioFile[] {
  const expectedFiles: ExpectedAudioFile[] = [];

  translations.forEach((book) => {
    // Add full audiobook expectation for all books
    expectedFiles.push({
      bookSlug: book.slug,
      bookTitle: book.title,
      chapterIndex: null,
      chapterTitle: null,
      expectedPath: `assets/audio/${book.slug}/full-audiobook.mp3`,
      status: book.status,
    });

    // Add chapter files for each book
    if (book.chapters) {
      book.chapters.forEach((chapter, index) => {
        const chapterNumber = index + 1;
        const paddedChapterNumber = String(chapterNumber).padStart(2, '0');

        expectedFiles.push({
          bookSlug: book.slug,
          bookTitle: book.title,
          chapterIndex: chapterNumber,
          chapterTitle: chapter.title,
          expectedPath: `assets/audio/${book.slug}/chapter-${paddedChapterNumber}.mp3`,
          status: book.status,
        });
      });
    }
  });

  return expectedFiles;
}

/**
 * Check if actual audio files match expected paths
 */
function matchAudioFiles(
  expectedFiles: ExpectedAudioFile[],
  actualFiles: AudioFile[],
): Map<string, AudioFile> {
  const fileMap = new Map<string, AudioFile>();

  // Create a map of actual files by pathname for quick lookup
  actualFiles.forEach((file) => {
    fileMap.set(file.pathname, file);
  });

  return fileMap;
}

/**
 * Verify accessibility of audio files
 */
async function verifyAudioFileAccess(
  expected: ExpectedAudioFile,
  actual: AudioFile | null,
): Promise<AudioVerificationResult> {
  const result: AudioVerificationResult = {
    expected,
    actual,
    exists: !!actual,
    accessible: null,
    contentLength: null,
    error: null,
  };

  // Skip access check if file doesn't exist
  if (!actual) {
    return result;
  }

  try {
    // Attempt to access the file
    const response = await fetch(actual.url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'BrainrotPublishingHouseAudioVerifier/1.0',
      },
    });

    result.accessible = response.ok;
    result.contentLength = parseInt(response.headers.get('content-length') || '0', 10) || null;

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    result.accessible = false;
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Process result data for a single book
 */
function processBookResults(
  bookSummary: VerificationSummary['bookSummary'],
  result: AudioVerificationResult,
  missingFiles: ExpectedAudioFile[],
  inaccessibleFiles: { expected: ExpectedAudioFile; error: string }[],
): void {
  const bookSlug = result.expected.bookSlug;

  // Update book summary counts
  if (bookSummary[bookSlug]) {
    bookSummary[bookSlug].expected++;

    if (result.exists) {
      bookSummary[bookSlug].found++;
    }

    if (result.accessible) {
      bookSummary[bookSlug].accessible++;
    }

    // Check if it's a full audiobook
    if (result.expected.chapterIndex === null && result.exists && result.accessible) {
      bookSummary[bookSlug].hasFullAudiobook = true;
    }
  }

  // Track missing files
  if (!result.exists) {
    missingFiles.push(result.expected);
  }

  // Track inaccessible files
  if (result.exists && !result.accessible && result.error) {
    inaccessibleFiles.push({
      expected: result.expected,
      error: result.error,
    });
  }
}

/**
 * Generate a verification summary
 */
function generateSummary(results: AudioVerificationResult[]): VerificationSummary {
  const bookSummary: VerificationSummary['bookSummary'] = {};
  const missingFiles: ExpectedAudioFile[] = [];
  const inaccessibleFiles: { expected: ExpectedAudioFile; error: string }[] = [];

  // Initialize book summary
  translations.forEach((book) => {
    bookSummary[book.slug] = {
      title: book.title,
      status: book.status,
      expected: 0,
      found: 0,
      accessible: 0,
      hasFullAudiobook: false,
    };
  });

  // Process results
  results.forEach((result) => {
    processBookResults(bookSummary, result, missingFiles, inaccessibleFiles);
  });

  return {
    totalExpected: results.length,
    totalFound: results.filter((r) => r.exists).length,
    totalAccessible: results.filter((r) => r.accessible).length,
    missingFiles,
    inaccessibleFiles,
    bookSummary,
    verificationDate: new Date().toISOString(),
  };
}

/**
 * Generate an HTML report
 */
function generateHtmlReport(summary: VerificationSummary): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audio Files Accessibility Verification Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
    h1, h2, h3 { margin-top: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .success { color: #2e7d32; }
    .warning { color: #f57c00; }
    .failure { color: #c62828; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
    .available { background-color: #e8f5e9; }
    .coming-soon { background-color: #fff8e1; }
    .content-length { text-align: right; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Audio Files Accessibility Verification Report</h1>
    
    <div class="summary">
      <h2>Summary</h2>
      <p><strong>Verification Date:</strong> ${new Date(summary.verificationDate).toLocaleString()}</p>
      <p><strong>Total Expected Files:</strong> ${summary.totalExpected}</p>
      <p><strong>Total Found:</strong> ${summary.totalFound} (${((summary.totalFound / summary.totalExpected) * 100).toFixed(2)}%)</p>
      <p><strong>Total Accessible:</strong> ${summary.totalAccessible} (${((summary.totalAccessible / summary.totalExpected) * 100).toFixed(2)}%)</p>
      <p><strong>Missing Files:</strong> ${summary.missingFiles.length}</p>
      <p><strong>Inaccessible Files:</strong> ${summary.inaccessibleFiles.length}</p>
    </div>

    <h2>Book Summary</h2>
    <table>
      <thead>
        <tr>
          <th>Book</th>
          <th>Status</th>
          <th>Expected Files</th>
          <th>Found</th>
          <th>Accessible</th>
          <th>Full Audiobook</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(summary.bookSummary)
          .map(([slug, info]) => {
            const foundPercentage =
              info.expected > 0 ? ((info.found / info.expected) * 100).toFixed(2) : '0.00';
            const accessiblePercentage =
              info.expected > 0 ? ((info.accessible / info.expected) * 100).toFixed(2) : '0.00';

            return `
            <tr class="${info.status === 'available' ? 'available' : 'coming-soon'}">
              <td>${info.title} (${slug})</td>
              <td>${info.status}</td>
              <td>${info.expected}</td>
              <td>${info.found} (${foundPercentage}%)</td>
              <td>${info.accessible} (${accessiblePercentage}%)</td>
              <td>${info.hasFullAudiobook ? '<span class="success">✓ Yes</span>' : '<span class="failure">✗ No</span>'}</td>
            </tr>
          `;
          })
          .join('')}
      </tbody>
    </table>

    <h2>Missing Files</h2>
    ${
      summary.missingFiles.length > 0
        ? `
    <table>
      <thead>
        <tr>
          <th>Book</th>
          <th>Status</th>
          <th>Type</th>
          <th>Expected Path</th>
        </tr>
      </thead>
      <tbody>
        ${summary.missingFiles
          .map((file) => {
            return `
            <tr>
              <td>${file.bookTitle} (${file.bookSlug})</td>
              <td>${file.status}</td>
              <td>${file.chapterIndex === null ? 'Full Audiobook' : `Chapter ${file.chapterIndex}: ${file.chapterTitle}`}</td>
              <td>${file.expectedPath}</td>
            </tr>
          `;
          })
          .join('')}
      </tbody>
    </table>
    `
        : '<p>No missing files.</p>'
    }

    <h2>Inaccessible Files</h2>
    ${
      summary.inaccessibleFiles.length > 0
        ? `
    <table>
      <thead>
        <tr>
          <th>Book</th>
          <th>Status</th>
          <th>Type</th>
          <th>Expected Path</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        ${summary.inaccessibleFiles
          .map((item) => {
            return `
            <tr>
              <td>${item.expected.bookTitle} (${item.expected.bookSlug})</td>
              <td>${item.expected.status}</td>
              <td>${item.expected.chapterIndex === null ? 'Full Audiobook' : `Chapter ${item.expected.chapterIndex}: ${item.expected.chapterTitle}`}</td>
              <td>${item.expected.expectedPath}</td>
              <td>${item.error}</td>
            </tr>
          `;
          })
          .join('')}
      </tbody>
    </table>
    `
        : '<p>No inaccessible files.</p>'
    }
  </div>
</body>
</html>
  `;
}

/**
 * Process command line arguments
 */
function parseArgs(): { skipAccessCheck: boolean } {
  const args = process.argv.slice(2);
  return {
    skipAccessCheck: args.includes('--skip-access-check'),
  };
}

/**
 * Main function
 */
async function verifyAudioFilesAccess(): Promise<void> {
  const startTime = Date.now();
  const options = parseArgs();

  scriptLogger.info({
    msg: '🔍 Starting audio files accessibility verification...',
    options,
  });

  try {
    // Create the output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Get expected audio files from translations
    scriptLogger.info({ msg: 'Getting expected audio files from translations data...' });
    const expectedFiles = getExpectedAudioFiles();
    scriptLogger.info({
      msg: `Found ${expectedFiles.length} expected audio files in translations data`,
      expectedFilesCount: expectedFiles.length,
    });

    // 2. Fetch actual audio files from Vercel Blob
    scriptLogger.info({ msg: 'Fetching actual audio files from Vercel Blob...' });
    const actualFiles = await fetchAudioFiles();
    scriptLogger.info({
      msg: `Found ${actualFiles.length} actual audio files in Vercel Blob`,
      actualFilesCount: actualFiles.length,
    });

    // 3. Match expected files with actual files
    const audioFileMap = matchAudioFiles(expectedFiles, actualFiles);

    // 4. Verify accessibility of each file
    const verificationResults: AudioVerificationResult[] = [];

    scriptLogger.info({
      msg: `Verifying accessibility of ${expectedFiles.length} audio files...`,
      skipAccessCheck: options.skipAccessCheck,
    });

    // Process files in batches to avoid overwhelming the network
    const batchSize = 10;
    for (let i = 0; i < expectedFiles.length; i += batchSize) {
      const batch = expectedFiles.slice(i, i + batchSize);
      const batchPromises = batch.map(async (expected) => {
        const actual = audioFileMap.get(expected.expectedPath) || null;

        if (options.skipAccessCheck) {
          // Skip access check but still record existence
          return {
            expected,
            actual,
            exists: !!actual,
            accessible: !!actual, // Assume accessible if exists when skipping check
            contentLength: actual?.size || null,
            error: null,
          } as AudioVerificationResult;
        } else {
          // Full verification including accessibility check
          return await verifyAudioFileAccess(expected, actual);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      verificationResults.push(...batchResults);

      scriptLogger.info({
        msg: `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(expectedFiles.length / batchSize)}`,
        batchSize,
        progress: `${Math.min(i + batchSize, expectedFiles.length)}/${expectedFiles.length}`,
      });
    }

    // 5. Generate summary
    scriptLogger.info({ msg: 'Generating verification summary...' });
    const summary = generateSummary(verificationResults);

    // 6. Generate and save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlReportPath = path.join(outputDir, `audio-verification-${timestamp}.html`);
    const jsonReportPath = path.join(outputDir, `audio-verification-${timestamp}.json`);

    fs.writeFileSync(htmlReportPath, generateHtmlReport(summary));
    fs.writeFileSync(jsonReportPath, JSON.stringify(summary, null, 2));

    const duration = (Date.now() - startTime) / 1000;
    scriptLogger.info({
      msg: `✅ Verification completed in ${duration.toFixed(2)}s. Reports saved to:`,
      duration: duration.toFixed(2),
      htmlReportPath,
      jsonReportPath,
    });

    scriptLogger.info({
      msg: '📊 Summary:',
      totalExpected: summary.totalExpected,
      totalFound: summary.totalFound,
      totalAccessible: summary.totalAccessible,
      missingFiles: summary.missingFiles.length,
      inaccessibleFiles: summary.inaccessibleFiles.length,
    });

    // Log summary of available books with full audiobooks
    scriptLogger.info({ msg: 'Available books with full audiobooks:' });
    Object.entries(summary.bookSummary)
      .filter(([_, info]) => info.status === 'available' && info.hasFullAudiobook)
      .forEach(([slug, info]) => {
        scriptLogger.info({
          msg: `  ✅ ${info.title} (${slug}): ${info.accessible}/${info.expected} files accessible`,
        });
      });

    // Log summary of available books missing full audiobooks
    scriptLogger.info({ msg: 'Available books missing full audiobooks:' });
    Object.entries(summary.bookSummary)
      .filter(([_, info]) => info.status === 'available' && !info.hasFullAudiobook)
      .forEach(([slug, info]) => {
        scriptLogger.info({
          msg: `  ❌ ${info.title} (${slug}): missing full audiobook`,
        });
      });
  } catch (error) {
    scriptLogger.error({
      msg: 'Error during audio files verification:',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Run the verification
verifyAudioFilesAccess().catch((error) => {
  scriptLogger.error({
    msg: 'Unhandled error during verification:',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
