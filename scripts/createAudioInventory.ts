#!/usr/bin/env node
/**
 * Audio Files Inventory and Verification Script
 * 
 * This script creates a comprehensive inventory of audio files in Digital Ocean Spaces:
 * 1. Lists all audio files in the DO Spaces bucket
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
dotenv.config({ path: '.env.local' });

import fs from 'fs/promises';
import path from 'path';
import { S3Client, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import translations from '../translations';

// Constants
const DO_REGION = 'nyc3';
const DO_BUCKET = process.env.DO_SPACES_BUCKET || 'brainrot-publishing';
const DO_BASE_URL = `https://${DO_BUCKET}.${DO_REGION}.digitaloceanspaces.com`;
const DO_CDN_URL = `https://${DO_BUCKET}.${DO_REGION}.cdn.digitaloceanspaces.com`;
const MIN_AUDIO_SIZE = 50 * 1024; // 50KB - minimum size for a real audio file
const MP3_HEADER_MAGIC = Buffer.from([0xFF, 0xFB]); // Common MP3 frame header start

// Types
interface AudioFileInfo {
  key: string;
  size: number;
  lastModified?: Date;
  contentType?: string;
  exists: boolean;
  isPlaceholder: boolean;
  url: string;
  cdnUrl: string;
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
 * Create a Digital Ocean S3 client
 */
function createDigitalOceanClient(): S3Client {
  const accessKeyId = process.env.DO_SPACES_ACCESS_KEY;
  const secretAccessKey = process.env.DO_SPACES_SECRET_KEY;
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Digital Ocean credentials not found. Set DO_SPACES_ACCESS_KEY and DO_SPACES_SECRET_KEY in .env.local');
  }
  
  return new S3Client({
    region: DO_REGION,
    endpoint: `https://${DO_REGION}.digitaloceanspaces.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

/**
 * List all audio files in Digital Ocean Space
 */
async function listAudioFiles(client: S3Client): Promise<string[]> {
  const allKeys: string[] = [];
  let continuationToken: string | undefined;
  
  do {
    const command = new ListObjectsV2Command({
      Bucket: DO_BUCKET,
      ContinuationToken: continuationToken,
      MaxKeys: 1000
    });
    
    const response = await client.send(command);
    
    if (response.Contents) {
      // Filter to only include .mp3 files
      const audioKeys = response.Contents
        .filter(item => item.Key && item.Key.toLowerCase().endsWith('.mp3'))
        .map(item => item.Key as string);
      
      allKeys.push(...audioKeys);
    }
    
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
  
  return allKeys;
}

/**
 * Get detailed information about a file
 */
async function getFileInfo(client: S3Client, key: string): Promise<AudioFileInfo> {
  try {
    const command = new HeadObjectCommand({
      Bucket: DO_BUCKET,
      Key: key
    });
    
    const response = await client.send(command);
    
    // Extract book slug from the key path
    // Format is usually: "{bookSlug}/audio/{filename}.mp3"
    const pathParts = key.split('/');
    const bookSlug = pathParts.length > 1 ? pathParts[0] : undefined;
    
    return {
      key,
      size: response.ContentLength || 0,
      lastModified: response.LastModified,
      contentType: response.ContentType,
      exists: true,
      isPlaceholder: (response.ContentLength || 0) < MIN_AUDIO_SIZE,
      url: `${DO_BASE_URL}/${key}`,
      cdnUrl: `${DO_CDN_URL}/${key}`,
      bookSlug
    };
  } catch (error) {
    return {
      key,
      size: 0,
      exists: false,
      isPlaceholder: false,
      url: `${DO_BASE_URL}/${key}`,
      cdnUrl: `${DO_CDN_URL}/${key}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Verify that a file contains valid audio content by checking its headers
 */
async function verifyAudioContent(client: S3Client, key: string): Promise<boolean> {
  try {
    // Get just the first few KB to check headers
    const command = new GetObjectCommand({
      Bucket: DO_BUCKET,
      Key: key,
      Range: 'bytes=0-4095' // First 4KB
    });
    
    const response = await client.send(command);
    
    if (!response.Body) {
      return false;
    }
    
    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const content = Buffer.concat(chunks);
    
    // Check for MP3 header magic bytes
    // This is a simplified check - in production you might want more robust validation
    for (let i = 0; i < content.length - 1; i++) {
      if (content[i] === MP3_HEADER_MAGIC[0] && content[i + 1] === MP3_HEADER_MAGIC[1]) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error verifying audio content for ${key}:`, error);
    return false;
  }
}

/**
 * Map file keys to book and chapter information from translations
 */
function mapToTranslations(files: AudioFileInfo[]): AudioFileInfo[] {
  const result = [...files];
  
  for (const file of result) {
    if (!file.bookSlug) continue;
    
    const book = translations.find(t => t.slug === file.bookSlug);
    if (!book || !book.chapters) continue;
    
    // Extract the filename without path and extension
    const filename = path.basename(file.key, '.mp3');
    
    // Find the matching chapter
    const chapter = book.chapters.find(c => {
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
 */
function groupByBook(files: AudioFileInfo[]): { bookFiles: BookAudioInfo[], orphanedFiles: AudioFileInfo[] } {
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
      missingFiles: []
    });
  }
  
  // Process each file
  for (const file of files) {
    if (file.bookSlug && bookMap.has(file.bookSlug)) {
      const bookInfo = bookMap.get(file.bookSlug)!;
      bookInfo.files.push(file);
      bookInfo.audioCount++;
      bookInfo.totalSize += file.size;
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
      const expectedPath = `${translation.slug}/audio/${filename}`;
      
      // Check if the file exists in the collected files
      const fileExists = bookInfo.files.some(f => f.key === expectedPath);
      
      if (!fileExists) {
        bookInfo.missingFiles.push(expectedPath);
      }
    }
  }
  
  return {
    bookFiles: Array.from(bookMap.values()),
    orphanedFiles
  };
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  console.log('Audio Inventory Options:', options);
  
  try {
    console.log('Creating Digital Ocean client...');
    const client = createDigitalOceanClient();
    
    // List all audio files
    console.log('Listing audio files in Digital Ocean...');
    const audioKeys = await listAudioFiles(client);
    console.log(`Found ${audioKeys.length} audio files`);
    
    // Filter by book if specified
    const filteredKeys = options.bookSlug 
      ? audioKeys.filter(key => key.startsWith(`${options.bookSlug}/`))
      : audioKeys;
    
    if (options.bookSlug) {
      console.log(`Filtered to ${filteredKeys.length} files for book: ${options.bookSlug}`);
    }
    
    // Get detailed information for each file
    console.log('Getting detailed information for each file...');
    const fileInfoPromises = filteredKeys.map(key => getFileInfo(client, key));
    const filesInfo = await Promise.all(fileInfoPromises);
    
    // Verify audio content if requested
    if (options.verifyContent) {
      console.log('Verifying audio content...');
      
      // Only verify files that exist and aren't placeholders
      const filesToVerify = filesInfo.filter(file => file.exists && !file.isPlaceholder);
      
      for (const file of filesToVerify) {
        console.log(`Verifying content for: ${file.key}`);
        file.verifiedContent = await verifyAudioContent(client, file.key);
      }
    }
    
    // Map files to translations data
    console.log('Mapping files to translations...');
    const mappedFiles = mapToTranslations(filesInfo);
    
    // Group by book
    console.log('Grouping files by book...');
    const { bookFiles, orphanedFiles } = groupByBook(mappedFiles);
    
    // Calculate statistics
    const totalSize = mappedFiles.reduce((sum, file) => sum + file.size, 0);
    const realAudioFiles = mappedFiles.filter(file => file.exists && !file.isPlaceholder).length;
    const placeholderFiles = mappedFiles.filter(file => file.exists && file.isPlaceholder).length;
    
    // Create the inventory result
    const inventory: InventoryResult = {
      timestamp: new Date().toISOString(),
      totalFiles: mappedFiles.length,
      totalSize,
      realAudioFiles,
      placeholderFiles,
      books: bookFiles.filter(book => book.audioCount > 0 || book.missingFiles.length > 0),
      orphanedFiles
    };
    
    // Save the inventory to a file
    console.log(`Saving inventory to ${options.output}...`);
    await fs.writeFile(options.output, JSON.stringify(inventory, null, 2));
    
    // Print summary
    console.log('\nInventory Summary:');
    console.log(`Total audio files: ${inventory.totalFiles}`);
    console.log(`Total size: ${(inventory.totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Real audio files: ${inventory.realAudioFiles}`);
    console.log(`Placeholder files: ${inventory.placeholderFiles}`);
    console.log(`Books with audio: ${inventory.books.length}`);
    console.log(`Orphaned files: ${inventory.orphanedFiles.length}`);
    
    console.log('\nBooks Summary:');
    for (const book of inventory.books) {
      console.log(`- ${book.title} (${book.slug}): ${book.audioCount} files, ${(book.totalSize / (1024 * 1024)).toFixed(2)} MB, ${book.missingFiles.length} missing`);
    }
    
    console.log('\n✅ Audio inventory completed successfully!');
  } catch (error) {
    console.error('❌ Error creating audio inventory:', error);
    process.exit(1);
  }
}

// Run the main function
main();