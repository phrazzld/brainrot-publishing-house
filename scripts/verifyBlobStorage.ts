/**
 * Verification script for Blob Storage
 * 
 * This script verifies that all assets have been properly migrated to Blob storage.
 * It generates a report of what has been migrated and what still needs to be migrated.
 */

import translations from '../translations';
import { assetExistsInBlobStorage } from '../utils';
import path from 'path';
import fs from 'fs';

interface AssetVerificationResult {
  path: string;
  exists: boolean;
  type: 'cover' | 'chapter' | 'audio';
}

interface BookVerificationResult {
  slug: string;
  title: string;
  coverImage: AssetVerificationResult;
  chapters: AssetVerificationResult[];
  audio: AssetVerificationResult[];
  summary: {
    total: number;
    migrated: number;
    missing: number;
    coverImageMigrated: boolean;
  };
}

interface VerificationReport {
  date: string;
  overallSummary: {
    totalBooks: number;
    booksWithCover: number;
    booksWithAllContent: number;
    totalAssets: number;
    migratedAssets: number;
    missingAssets: number;
  };
  bookResults: BookVerificationResult[];
}

// Main function to verify all assets and generate a report
async function verifyBlobStorage(): Promise<VerificationReport> {
  console.log('Starting Blob storage verification...');
  
  const bookResults: BookVerificationResult[] = [];
  let totalAssets = 0;
  let migratedAssets = 0;
  
  // Process each book
  for (const book of translations) {
    console.log(`Verifying book: ${book.title} (${book.slug})`);
    
    // Initialize book result
    const bookResult: BookVerificationResult = {
      slug: book.slug,
      title: book.title,
      coverImage: {
        path: book.coverImage,
        exists: false,
        type: 'cover'
      },
      chapters: [],
      audio: [],
      summary: {
        total: 0,
        migrated: 0,
        missing: 0,
        coverImageMigrated: false
      }
    };
    
    // Check cover image
    totalAssets++;
    bookResult.summary.total++;
    try {
      const coverExists = await assetExistsInBlobStorage(book.coverImage);
      bookResult.coverImage.exists = coverExists;
      
      if (coverExists) {
        migratedAssets++;
        bookResult.summary.migrated++;
        bookResult.summary.coverImageMigrated = true;
      } else {
        bookResult.summary.missing++;
      }
    } catch (error) {
      console.error(`Error checking cover image for ${book.slug}:`, error);
      bookResult.summary.missing++;
    }
    
    // Check chapters
    for (const chapter of book.chapters) {
      // Chapter text
      totalAssets++;
      bookResult.summary.total++;
      try {
        const chapterExists = await assetExistsInBlobStorage(chapter.text);
        const chapterResult: AssetVerificationResult = {
          path: chapter.text,
          exists: chapterExists,
          type: 'chapter'
        };
        
        bookResult.chapters.push(chapterResult);
        
        if (chapterExists) {
          migratedAssets++;
          bookResult.summary.migrated++;
        } else {
          bookResult.summary.missing++;
        }
      } catch (error) {
        console.error(`Error checking chapter text for ${book.slug}:`, error);
        bookResult.chapters.push({
          path: chapter.text,
          exists: false,
          type: 'chapter'
        });
        bookResult.summary.missing++;
      }
      
      // Audio (if available)
      if (chapter.audioSrc) {
        totalAssets++;
        bookResult.summary.total++;
        try {
          const audioExists = await assetExistsInBlobStorage(chapter.audioSrc);
          const audioResult: AssetVerificationResult = {
            path: chapter.audioSrc,
            exists: audioExists,
            type: 'audio'
          };
          
          bookResult.audio.push(audioResult);
          
          if (audioExists) {
            migratedAssets++;
            bookResult.summary.migrated++;
          } else {
            bookResult.summary.missing++;
          }
        } catch (error) {
          console.error(`Error checking audio for ${book.slug}:`, error);
          bookResult.audio.push({
            path: chapter.audioSrc,
            exists: false,
            type: 'audio'
          });
          bookResult.summary.missing++;
        }
      }
    }
    
    bookResults.push(bookResult);
  }
  
  // Calculate overall summary
  const overallSummary = {
    totalBooks: translations.length,
    booksWithCover: bookResults.filter(b => b.coverImage.exists).length,
    booksWithAllContent: bookResults.filter(b => 
      b.coverImage.exists && 
      b.chapters.every(c => c.exists) &&
      b.audio.every(a => a.exists)
    ).length,
    totalAssets,
    migratedAssets,
    missingAssets: totalAssets - migratedAssets
  };
  
  // Generate report
  const report: VerificationReport = {
    date: new Date().toISOString(),
    overallSummary,
    bookResults
  };
  
  // Output report
  console.log('\nBlob Storage Verification Report:');
  console.log(`Date: ${new Date().toLocaleString()}`);
  console.log(`Total Books: ${overallSummary.totalBooks}`);
  console.log(`Books with Cover Image: ${overallSummary.booksWithCover}`);
  console.log(`Books with All Content: ${overallSummary.booksWithAllContent}`);
  console.log(`Total Assets: ${overallSummary.totalAssets}`);
  console.log(`Migrated Assets: ${overallSummary.migratedAssets}`);
  console.log(`Missing Assets: ${overallSummary.missingAssets}`);
  
  // Save report to file
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }
  
  const reportPath = path.join(reportDir, `blob-verification-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to ${reportPath}`);
  
  return report;
}

// Run the verification if executed directly
if (require.main === module) {
  verifyBlobStorage()
    .then(() => console.log('Verification complete!'))
    .catch(error => console.error('Verification failed:', error));
}

export default verifyBlobStorage;