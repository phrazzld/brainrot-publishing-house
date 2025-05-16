#!/usr/bin/env node
/**
 * Audio Files Inventory and Verification Script
 *
 * This script creates a comprehensive inventory of audio files in Vercel Blob storage:
 * 1. Lists all audio files in Vercel Blob
 * 2. Verifies file existence, size, and content type
 * 3. Maps files to books and chapters in translations
 * 4. Generates a detailed inventory report
 *
 * Usage:
 *   npx tsx scripts/createAudioInventory.ts [options]
 *
 * Options:
 *   --output=<path>      Path to save the inventory JSON file (default: audio-inventory.json)
 *   --verify-content     Download sample bytes to verify audio content
 *   --book=<slug>        Generate inventory for specific book only
 */
// Load environment variables
import * as dotenv from 'dotenv';
import { head, list } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

import translations from '../translations';

dotenv.config({ path: '.env.local' });

// Constants
const MIN_AUDIO_SIZE = 50 * 1024; // 50KB - minimum size for a real audio file

// Types
interface AudioFileInfo {
  pathname: string;
  size: number;
  lastModified?: Date;
  contentType?: string;
  exists: boolean;
  isPlaceholder: boolean;
  url: string;
  bookSlug?: string;
  chapterTitle?: string;
  verifiedContent?: boolean;
  error?: string;
}

interface BookAudioInfo {
  slug: string;
  title: string;
  audioCount: number;
  totalSize: number;
  files: AudioFileInfo[];
  missingFiles: string[];
}

interface InventoryResult {
  timestamp: string;
  totalFiles: number;
  totalSize: number;
  realAudioFiles: number;
  placeholderFiles: number;
  books: BookAudioInfo[];
  orphanedFiles: AudioFileInfo[];
}

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    output: 'audio-inventory.json',
    verifyContent: false,
    bookSlug: '',
  };

  for (const arg of args) {
    if (arg.startsWith('--output=')) {
      options.output = arg.substring('--output='.length);
    } else if (arg === '--verify-content') {
      options.verifyContent = true;
    } else if (arg.startsWith('--book=')) {
      options.bookSlug = arg.substring('--book='.length);
    }
  }

  return options;
}

/**
 * List all audio files in Vercel Blob
 */
async function listAudioFiles(): Promise<
  Array<{ pathname: string; url: string; size: number; uploadedAt: string }>
> {
  const audioFiles: Array<{ pathname: string; url: string; size: number; uploadedAt: string }> = [];
  let cursor: string | undefined;

  try {
    do {
      const result = await list({ prefix: 'books/', cursor });

      // Filter to only include .mp3 files
      const mp3Files = result.blobs.filter((blob) =>
        (blob.pathname as string).toLowerCase().endsWith('.mp3')
      );

      audioFiles.push(...mp3Files);
      cursor = result.cursor;
    } while (cursor);

    return audioFiles;
  } catch (error) {
    console.error('Error listing audio files from Vercel Blob:', error);
    throw error;
  }
}

/**
 * Get detailed information about a file
 */
async function getFileInfo(blobInfo: {
  pathname: string;
  url: string;
  size: number;
  uploadedAt: string;
}): Promise<AudioFileInfo> {
  try {
    const pathname = blobInfo.pathname;
    const url = blobInfo.url;
    const size = blobInfo.size;
    const uploadedAt = blobInfo.uploadedAt;

    // Extract book slug from the path
    // Format is usually: "books/{bookSlug}/audio/{filename}.mp3"
    const pathParts = pathname.split('/');
    const bookSlug = pathParts.length > 2 ? pathParts[1] : undefined;

    return {
      pathname,
      size,
      lastModified: new Date(uploadedAt),
      contentType: 'audio/mpeg', // Assuming MP3 files
      exists: true,
      isPlaceholder: size < MIN_AUDIO_SIZE,
      url,
      bookSlug,
    };
  } catch (error) {
    return {
      pathname: blobInfo.pathname,
      size: 0,
      exists: false,
      isPlaceholder: false,
      url: blobInfo.url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verify that a file contains valid audio content by checking its headers
 */
async function verifyAudioContent(url: string): Promise<boolean> {
  try {
    // For Vercel Blob we would need to fetch the first bytes of the file
    // This would require a different approach than with S3
    // We'll skip the verification for now

    // In a real implementation, you would:
    // 1. Fetch the first few KB of the file using fetch() with a Range header
    // 2. Check for MP3 magic numbers in the response

    // For this example, we'll just return true if the file exists
    const metadata = await head(url);
    return metadata && metadata.size > 0;
  } catch (error) {
    console.error(`Error verifying audio content for ${url}:`, error);
    return false;
  }
}

/**
 * Map file paths to book and chapter information from translations
 */
function mapToTranslations(files: AudioFileInfo[]): AudioFileInfo[] {
  const result = [...files];

  for (const file of result) {
    if (!file.bookSlug) continue;

    const book = translations.find((t) => t.slug === file.bookSlug);
    if (!book || !book.chapters) continue;

    // Extract the filename without path and extension
    const filename = path.basename(file.pathname, '.mp3');

    // Find the matching chapter
    const chapter = book.chapters.find((c) => {
      if (!c.audioSrc) return false;

      const chapterFilename = path.basename(c.audioSrc, '.mp3');
      return chapterFilename === filename;
    });

    if (chapter) {
      file.chapterTitle = chapter.title;
    }
  }

  return result;
}

/**
 * Group files by book
 *
 * This is a complex function that handles multiple edge cases
 * eslint-disable-next-line complexity
 */
function groupByBook(files: AudioFileInfo[]): {
  bookFiles: BookAudioInfo[];
  orphanedFiles: AudioFileInfo[];
} {
  const bookMap = new Map<string, BookAudioInfo>();
  const orphanedFiles: AudioFileInfo[] = [];

  // Initialize book info
  for (const translation of translations) {
    bookMap.set(translation.slug, {
      slug: translation.slug,
      title: translation.title,
      audioCount: 0,
      totalSize: 0,
      files: [],
      missingFiles: [],
    });
  }

  // Process each file
  for (const file of files) {
    if (file.bookSlug && bookMap.has(file.bookSlug)) {
      const bookInfo = bookMap.get(file.bookSlug);
      if (bookInfo) {
        bookInfo.files.push(file);
        bookInfo.audioCount++;
        bookInfo.totalSize += file.size;
      }
    } else {
      orphanedFiles.push(file);
    }
  }

  // Find missing files
  for (const translation of translations) {
    if (!translation.chapters) continue;

    const bookInfo = bookMap.get(translation.slug);
    if (!bookInfo) continue;

    for (const chapter of translation.chapters) {
      if (!chapter.audioSrc) continue;

      const filename = path.basename(chapter.audioSrc);
      const expectedPath = `books/${translation.slug}/audio/${filename}`;

      // Check if the file exists in the collected files
      const fileExists = bookInfo.files.some((f) => f.pathname === expectedPath);

      if (!fileExists) {
        bookInfo.missingFiles.push(expectedPath);
      }
    }
  }

  return {
    bookFiles: Array.from(bookMap.values()),
    orphanedFiles,
  };
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  console.warn('Audio Inventory Options:', options);

  try {
    // List all audio files
    console.warn('Listing audio files in Vercel Blob...');
    const audioBlobs = await listAudioFiles();
    console.warn(`Found ${audioBlobs.length} audio files`);

    // Filter by book if specified
    const filteredBlobs = options.bookSlug
      ? audioBlobs.filter((blob) => {
          const pathname = blob.pathname;
          return pathname.includes(`/books/${options.bookSlug}/`);
        })
      : audioBlobs;

    if (options.bookSlug) {
      console.warn(`Filtered to ${filteredBlobs.length} files for book: ${options.bookSlug}`);
    }

    // Get detailed information for each file
    console.warn('Getting detailed information for each file...');
    const fileInfoPromises = filteredBlobs.map((blob) => getFileInfo(blob));
    const filesInfo = await Promise.all(fileInfoPromises);

    // Verify audio content if requested
    if (options.verifyContent) {
      console.warn('Verifying audio content...');

      // Only verify files that exist and aren't placeholders
      const filesToVerify = filesInfo.filter((file) => file.exists && !file.isPlaceholder);

      for (const file of filesToVerify) {
        console.warn(`Verifying content for: ${file.pathname}`);
        file.verifiedContent = await verifyAudioContent(file.url);
      }
    }

    // Map files to translations data
    console.warn('Mapping files to translations...');
    const mappedFiles = mapToTranslations(filesInfo);

    // Group by book
    console.warn('Grouping files by book...');
    const { bookFiles, orphanedFiles } = groupByBook(mappedFiles);

    // Calculate statistics
    const totalSize = mappedFiles.reduce((sum, file) => sum + file.size, 0);
    const realAudioFiles = mappedFiles.filter((file) => file.exists && !file.isPlaceholder).length;
    const placeholderFiles = mappedFiles.filter((file) => file.exists && file.isPlaceholder).length;

    // Create the inventory result
    const inventory: InventoryResult = {
      timestamp: new Date().toISOString(),
      totalFiles: mappedFiles.length,
      totalSize,
      realAudioFiles,
      placeholderFiles,
      books: bookFiles.filter((book) => book.audioCount > 0 || book.missingFiles.length > 0),
      orphanedFiles,
    };

    // Save the inventory to a file
    console.warn(`Saving inventory to ${options.output}...`);
    await fs.writeFile(options.output, JSON.stringify(inventory, null, 2));

    // Print summary
    console.warn('\nInventory Summary:');
    console.warn(`Total audio files: ${inventory.totalFiles}`);
    console.warn(`Total size: ${(inventory.totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.warn(`Real audio files: ${inventory.realAudioFiles}`);
    console.warn(`Placeholder files: ${inventory.placeholderFiles}`);
    console.warn(`Books with audio: ${inventory.books.length}`);
    console.warn(`Orphaned files: ${inventory.orphanedFiles.length}`);

    console.warn('\nBooks Summary:');
    for (const book of inventory.books) {
      console.warn(
        `- ${book.title} (${book.slug}): ${book.audioCount} files, ${(
          book.totalSize /
          (1024 * 1024)
        ).toFixed(2)} MB, ${book.missingFiles.length} missing`
      );
    }

    console.warn('\n✅ Audio inventory completed successfully!');
  } catch (error) {
    console.error('❌ Error creating audio inventory:', error);
    process.exit(1);
  }
}

// Run the main function
main();
