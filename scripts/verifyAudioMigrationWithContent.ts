/**
 * Enhanced verification script for audio files in Blob storage
 * 
 * This script verifies that audio files exist in Blob storage and checks
 * that they are proper audio files (not just 1KB placeholders).
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import translations from '../translations';
import { blobService } from '../utils/services/BlobService';

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
 * Main verification function
 */
async function verifyAudioMigration(): Promise<void> {
  console.log('Starting audio migration verification with content checks...');
  
  // Use the Blob base URL from environment
  const baseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  console.log(`Using Blob base URL: ${baseUrl}`);
  
  const results: VerificationResult[] = [];
  let totalFiles = 0;
  let successful = 0;
  let failed = 0;
  
  // Process each book in translations
  for (const book of translations) {
    console.log(`Verifying audio files for book: ${chalk.cyan(book.title)} (${chalk.gray(book.slug)})`);
    
    // Find chapters with audio
    const chaptersWithAudio = book.chapters.filter(c => c.audioSrc);
    
    if (chaptersWithAudio.length === 0) {
      continue; // Skip books without audio
    }
    
    totalFiles += chaptersWithAudio.length;
    
    // Check each audio file
    for (const chapter of chaptersWithAudio) {
      if (!chapter.audioSrc) continue;
      
      try {
        // Normalize the URL path
        let audioPath = chapter.audioSrc;
        let blobUrl = '';
        
        if (audioPath.startsWith('http')) {
          // If it's already a full URL, use it directly
          blobUrl = audioPath;
        } else {
          // Generate URL with the book path
          if (baseUrl) {
            const normalizedPath = audioPath.startsWith('/') ? audioPath.substring(1) : audioPath;
            blobUrl = `${baseUrl}/${normalizedPath}`;
          } else {
            blobUrl = `https://public.blob.vercel-storage.com/${audioPath}`;
          }
        }
        
        // Check if the file exists and get its properties
        const fileInfo = await blobService.getFileInfo(blobUrl);
        
        // Check if this is a valid audio file (larger than 10KB and has audio content type)
        const isValidAudioFile = fileInfo.size > 10 * 1024 && 
                               (fileInfo.contentType?.startsWith('audio/') || 
                               fileInfo.contentType === 'application/octet-stream');
        
        if (isValidAudioFile) {
          console.log(chalk.green(`✅ Valid audio file exists: ${blobUrl} (${fileInfo.size} bytes, ${fileInfo.contentType})`));
          successful++;
        } else if (fileInfo.size > 0) {
          console.log(chalk.yellow(`⚠️ Placeholder audio file exists: ${blobUrl} (${fileInfo.size} bytes, ${fileInfo.contentType})`));
          successful++; // Count as successful but warn
        } else {
          console.log(chalk.red(`❌ File exists but is empty: ${blobUrl}`));
          failed++;
        }
        
        // Add to results
        results.push({
          bookSlug: book.slug,
          audioPath: chapter.audioSrc,
          blobUrl,
          exists: true,
          fileSize: fileInfo.size,
          contentType: fileInfo.contentType,
          isValidAudioFile
        });
      } catch (error) {
        console.log(chalk.red(`❌ Audio file not found: ${chapter.audioSrc}`));
        
        // Add to results
        results.push({
          bookSlug: book.slug,
          audioPath: chapter.audioSrc || '',
          blobUrl: '',
          exists: false,
          error: error instanceof Error ? error.message : String(error)
        });
        
        failed++;
      }
    }
  }
  
  // Calculate statistics
  const successRate = totalFiles > 0 ? (successful / totalFiles * 100).toFixed(1) + '%' : '0%';
  const placeholderCount = results.filter(r => r.exists && r.fileSize && r.fileSize < 10 * 1024).length;
  const properAudioCount = results.filter(r => r.isValidAudioFile).length;
  
  // Print summary
  console.log('\nAudio Migration Verification Summary:');
  console.log(`Total audio files: ${chalk.white(totalFiles)}`);
  console.log(`Files found in Blob storage: ${chalk.green(successful)}`);
  console.log(`Missing files: ${chalk.red(failed)}`);
  console.log(`Small placeholder files (<10KB): ${chalk.yellow(placeholderCount)}`);
  console.log(`Proper audio files (>10KB): ${chalk.green(properAudioCount)}`);
  console.log(`Success rate: ${chalk.cyan(successRate)}`);
  
  // Save report to file
  const reportData = {
    date: new Date().toISOString(),
    summary: {
      total: totalFiles,
      successful,
      failed,
      placeholderCount,
      properAudioCount,
      successRate
    },
    results
  };
  
  const reportDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.resolve(reportDir, `audio-verification-content-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  
  console.log(`Verification report saved to: ${reportPath}`);
  console.log('Audio migration verification complete!');
}

// Run the verification
verifyAudioMigrationWithContent().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});

// Complete verification function
async function verifyAudioMigrationWithContent(): Promise<void> {
  try {
    await verifyAudioMigration();
  } catch (error) {
    console.error('Error in verification:', error);
    throw error;
  }
}