#!/usr/bin/env node
/**
 * Audio Playback Test Utility
 * 
 * This script tests audio file playback in the application by:
 * 1. Starting a headless browser
 * 2. Navigating to the reading room for specified books
 * 3. Testing audio playback functionality
 * 4. Generating a report on playback results
 * 
 * Usage:
 *   npx tsx scripts/testAudioPlayback.ts [options]
 * 
 * Options:
 *   --book=slug           Test only a specific book
 *   --headless=false      Run with visible browser (for debugging)
 *   --timeout=60000       Set test timeout in milliseconds
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import translations from '../translations';

// Define interfaces
interface TestOptions {
  bookSlug: string;
  headless: boolean;
  timeout: number;
  outputFile: string;
}

interface TestResult {
  book: string;
  chapter: string;
  loaded: boolean;
  playable: boolean;
  seekable: boolean;
  pausable: boolean;
  errors: string[];
  url: string;
  loadTime: number; // in milliseconds
}

interface TestSummary {
  timestamp: string;
  totalTests: number;
  successful: number;
  failed: number;
  bookResults: {
    [key: string]: {
      total: number;
      success: number;
      failure: number;
    }
  };
  results: TestResult[];
}

// Parse command-line arguments
function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  const options: TestOptions = {
    bookSlug: '',
    headless: true,
    timeout: 60000,
    outputFile: 'audio-playback-test.json'
  };

  for (const arg of args) {
    if (arg.startsWith('--book=')) {
      options.bookSlug = arg.substring('--book='.length);
    } else if (arg === '--headless=false') {
      options.headless = false;
    } else if (arg.startsWith('--timeout=')) {
      options.timeout = parseInt(arg.substring('--timeout='.length), 10);
    } else if (arg.startsWith('--output=')) {
      options.outputFile = arg.substring('--output='.length);
    }
  }

  return options;
}

/**
 * Find chapters with audio for testing
 */
function findTestCases(bookSlug: string = ''): { book: string, bookTitle: string, chapterIndex: number, chapterTitle: string }[] {
  const testCases: { book: string, bookTitle: string, chapterIndex: number, chapterTitle: string }[] = [];
  
  const books = bookSlug 
    ? translations.filter(t => t.slug === bookSlug)
    : translations;

  for (const book of books) {
    if (!book.chapters) continue;

    for (let i = 0; i < book.chapters.length; i++) {
      const chapter = book.chapters[i];
      
      // Only include chapters with audio
      if (chapter.audioSrc && typeof chapter.audioSrc === 'string') {
        testCases.push({
          book: book.slug,
          bookTitle: book.title,
          chapterIndex: i,
          chapterTitle: chapter.title
        });
      }
    }
  }

  return testCases;
}

/**
 * Test playback for a single chapter
 */
async function testChapterPlayback(
  browser: puppeteer.Browser,
  book: string,
  chapterIndex: number,
  timeout: number
): Promise<TestResult> {
  // Create a new page for this test
  const page = await browser.newPage();
  
  // Set up result object
  const result: TestResult = {
    book,
    chapter: `Chapter ${chapterIndex + 1}`,
    loaded: false,
    playable: false,
    seekable: false,
    pausable: false,
    errors: [],
    url: `http://localhost:3000/reading-room/${book}?c=${chapterIndex}`,
    loadTime: 0
  };
  
  // Set up error logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      result.errors.push(`Console error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    result.errors.push(`Page error: ${err.message}`);
  });
  
  const startTime = Date.now();
  
  try {
    // Navigate to the reading room
    await page.goto(result.url, { timeout, waitUntil: 'networkidle2' });
    
    // Calculate load time
    result.loadTime = Date.now() - startTime;
    
    // Check if audio player is present
    const audioPlayer = await page.$('.audio-player');
    result.loaded = !!audioPlayer;
    
    if (!audioPlayer) {
      result.errors.push('Audio player not found');
      return result;
    }
    
    // Test play functionality
    const playButton = await page.$('.play-button');
    if (playButton) {
      await playButton.click();
      await page.waitForFunction(() => {
        const player = document.querySelector('.audio-player');
        return player && player.classList.contains('playing');
      }, { timeout: 5000 }).catch(() => {
        result.errors.push('Audio did not start playing within timeout');
      });
      
      // Check if audio is playing
      const isPlaying = await page.evaluate(() => {
        const player = document.querySelector('.audio-player');
        return player && player.classList.contains('playing');
      });
      
      result.playable = isPlaying;
      
      // Test pause functionality
      if (isPlaying) {
        await playButton.click();
        await page.waitForFunction(() => {
          const player = document.querySelector('.audio-player');
          return player && !player.classList.contains('playing');
        }, { timeout: 5000 }).catch(() => {
          result.errors.push('Audio did not pause within timeout');
        });
        
        // Check if audio is paused
        const isPaused = await page.evaluate(() => {
          const player = document.querySelector('.audio-player');
          return player && !player.classList.contains('playing');
        });
        
        result.pausable = isPaused;
      }
      
      // Test seek functionality
      const progressBar = await page.$('.progress-bar');
      if (progressBar) {
        const bounds = await progressBar.boundingBox();
        if (bounds) {
          // Click somewhere in the middle of the progress bar
          await page.mouse.click(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2
          );
          
          // Check if seek was successful by monitoring the current time
          const timeBeforeSeek = await page.evaluate(() => {
            const timeDisplay = document.querySelector('.time-display');
            return timeDisplay ? timeDisplay.textContent : '';
          });
          
          // Wait a moment for seek to complete
          await page.waitForTimeout(1000);
          
          const timeAfterSeek = await page.evaluate(() => {
            const timeDisplay = document.querySelector('.time-display');
            return timeDisplay ? timeDisplay.textContent : '';
          });
          
          result.seekable = timeBeforeSeek !== timeAfterSeek;
          
          if (timeBeforeSeek === timeAfterSeek) {
            result.errors.push('Seek operation did not change playback time');
          }
        }
      }
    } else {
      result.errors.push('Play button not found');
    }
  } catch (error) {
    result.errors.push(`Test error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // Take a screenshot for debugging if there were errors
    if (result.errors.length > 0) {
      const screenshotPath = `${book}-chapter${chapterIndex}-error.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved to ${screenshotPath}`);
    }
    
    // Close the page
    await page.close();
  }
  
  return result;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  console.log('Audio Playback Test');
  console.log('==================');
  
  if (options.bookSlug) {
    console.log(`Testing book: ${options.bookSlug}`);
  } else {
    console.log('Testing all books with audio');
  }
  
  // Find test cases
  const testCases = findTestCases(options.bookSlug);
  console.log(`Found ${testCases.length} chapters with audio to test`);
  
  if (testCases.length === 0) {
    console.log('No audio files to test. Exiting.');
    return;
  }
  
  // Confirm dev server is running
  try {
    const response = await fetch('http://localhost:3000');
    if (!response.ok) {
      throw new Error(`Dev server responded with status: ${response.status}`);
    }
  } catch (error) {
    console.error('ERROR: Development server is not running at http://localhost:3000');
    console.error('Please start the dev server with `npm run dev` before running this test');
    process.exit(1);
  }
  
  // Launch browser
  console.log(`Launching ${options.headless ? 'headless' : 'visible'} browser...`);
  const browser = await puppeteer.launch({ 
    headless: options.headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const results: TestResult[] = [];
  
  try {
    // Run tests for each chapter
    for (let i = 0; i < testCases.length; i++) {
      const { book, bookTitle, chapterIndex, chapterTitle } = testCases[i];
      console.log(`Testing [${i + 1}/${testCases.length}]: ${bookTitle} - ${chapterTitle}`);
      
      const result = await testChapterPlayback(browser, book, chapterIndex, options.timeout);
      results.push(result);
      
      // Print result
      if (result.loaded && result.playable && !result.errors.length) {
        console.log(`  ✅ Passed - Load time: ${result.loadTime}ms`);
      } else {
        console.log(`  ❌ Failed - Errors: ${result.errors.length}`);
        for (const error of result.errors) {
          console.log(`    - ${error}`);
        }
      }
    }
  } finally {
    // Close browser
    await browser.close();
  }
  
  // Generate summary
  const bookResults: { [key: string]: { total: number, success: number, failure: number } } = {};
  let successful = 0;
  let failed = 0;
  
  for (const result of results) {
    if (!bookResults[result.book]) {
      bookResults[result.book] = { total: 0, success: 0, failure: 0 };
    }
    
    bookResults[result.book].total++;
    
    // Consider a test successful if audio loaded and is playable with no errors
    const isSuccess = result.loaded && result.playable && result.errors.length === 0;
    if (isSuccess) {
      bookResults[result.book].success++;
      successful++;
    } else {
      bookResults[result.book].failure++;
      failed++;
    }
  }
  
  const summary: TestSummary = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    successful,
    failed,
    bookResults,
    results
  };
  
  // Print summary
  console.log('\nSummary:');
  console.log(`Total tests: ${summary.totalTests}`);
  console.log(`Successful: ${summary.successful}`);
  console.log(`Failed: ${summary.failed}`);
  
  console.log('\nResults by Book:');
  for (const [book, counts] of Object.entries(summary.bookResults)) {
    console.log(`- ${book}: ${counts.success}/${counts.total} successful`);
  }
  
  // Save results to file
  const outputPath = path.isAbsolute(options.outputFile)
    ? options.outputFile
    : path.join(process.cwd(), options.outputFile);
    
  await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
  console.log(`\nDetailed results saved to: ${outputPath}`);
  
  // Create markdown report
  const markdownReport = generateMarkdownReport(summary);
  const markdownPath = outputPath.replace(/\.json$/, '.md');
  await fs.writeFile(markdownPath, markdownReport);
  console.log(`Markdown report saved to: ${markdownPath}`);
  
  // Return appropriate exit code
  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Generate a markdown report
 */
function generateMarkdownReport(summary: TestSummary): string {
  const lines = [
    '# Audio Playback Test Report',
    '',
    `Generated: ${summary.timestamp}`,
    '',
    '## Summary',
    '',
    `- **Total Tests**: ${summary.totalTests}`,
    `- **Successful**: ${summary.successful}`,
    `- **Failed**: ${summary.failed}`,
    '',
    '## Results by Book',
    ''
  ];
  
  for (const [book, counts] of Object.entries(summary.bookResults)) {
    const successPercent = counts.total > 0 
      ? Math.round((counts.success / counts.total) * 100) 
      : 0;
      
    lines.push(`### ${book}`);
    lines.push('');
    lines.push(`- **Total**: ${counts.total}`);
    lines.push(`- **Successful**: ${counts.success} (${successPercent}%)`);
    lines.push(`- **Failed**: ${counts.failure}`);
    lines.push('');
    
    // Add details for all tests in this book
    lines.push('#### Test Details');
    lines.push('');
    lines.push('| Chapter | Loaded | Playable | Seekable | Pausable | Load Time | Errors |');
    lines.push('| ------- | ------ | -------- | -------- | -------- | --------- | ------ |');
    
    const bookResults = summary.results.filter(r => r.book === book);
    for (const result of bookResults) {
      const loadedIcon = result.loaded ? '✅' : '❌';
      const playableIcon = result.playable ? '✅' : '❌';
      const seekableIcon = result.seekable ? '✅' : '❌';
      const pausableIcon = result.pausable ? '✅' : '❌';
      const errorsText = result.errors.length > 0 
        ? `${result.errors.length} errors` 
        : 'None';
        
      lines.push(`| ${result.chapter} | ${loadedIcon} | ${playableIcon} | ${seekableIcon} | ${pausableIcon} | ${result.loadTime}ms | ${errorsText} |`);
    }
    
    lines.push('');
    
    // Add error details if any
    const failedTests = bookResults.filter(r => r.errors.length > 0);
    if (failedTests.length > 0) {
      lines.push('#### Error Details');
      lines.push('');
      
      for (const result of failedTests) {
        lines.push(`##### ${result.chapter}`);
        lines.push('');
        lines.push(`- URL: ${result.url}`);
        lines.push('- Errors:');
        for (const error of result.errors) {
          lines.push(`  - ${error}`);
        }
        lines.push('');
      }
    }
  }
  
  return lines.join('\n');
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
} catch (e) {
  console.error('ERROR: puppeteer is not installed. Run `npm install puppeteer` first.');
  process.exit(1);
}

// Run the main function
main();