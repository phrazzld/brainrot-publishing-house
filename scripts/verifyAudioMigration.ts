/**
 * Script to verify audio file migration
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import translations from '../translations';
import { blobService } from '../utils/services';

interface VerificationResult {
  bookSlug: string;
  audioPath: string;
  blobUrl: string;
  exists: boolean;
  error?: string;
}

async function verifyAudioMigration() {
  const results: VerificationResult[] = [];
  let total = 0;
  let successful = 0;
  let failed = 0;
  
  // Get correct Blob base URL from environment
  const blobBaseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL || process.env.NEXT_PUBLIC_BLOB_DEV_URL || 'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com';
  
  console.log('Starting audio migration verification...');
  console.log(`Using Blob base URL: ${blobBaseUrl}`);
  
  // Process each book
  for (const book of translations) {
    console.log(`Verifying audio files for book: ${book.title} (${book.slug})`);
    
    // Check for audio files in each chapter
    if (book.chapters) {
      for (const chapter of book.chapters) {
        if (chapter.audioSrc && typeof chapter.audioSrc === 'string') {
          total++;
          const audioPath = chapter.audioSrc;
          
          try {
            // Get the path part without domain
            const pathOnly = audioPath.replace(/^https?:\/\/[^\/]+\//, '');
            
            // Construct the correct URL with the actual Blob base URL
            const blobUrl = `${blobBaseUrl}/${pathOnly}`;
            
            // Check if it exists using direct fetch
            let exists = false;
            try {
              const response = await fetch(blobUrl, { method: 'HEAD' });
              exists = response.ok;
              
              if (exists) {
                successful++;
                console.log(`✅ Audio file exists: ${blobUrl}`);
              } else {
                failed++;
                console.error(`❌ Audio file not found: ${blobUrl} - Status: ${response.status}`);
              }
            } catch (e) {
              failed++;
              const error = e instanceof Error ? e.message : String(e);
              console.error(`❌ Error checking audio file: ${blobUrl} - ${error}`);
              
              results.push({
                bookSlug: book.slug,
                audioPath,
                blobUrl,
                exists: false,
                error
              });
              continue;
            }
            
            results.push({
              bookSlug: book.slug,
              audioPath,
              blobUrl,
              exists
            });
          } catch (error) {
            failed++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ Error verifying audio file: ${audioPath} - ${errorMessage}`);
            
            results.push({
              bookSlug: book.slug,
              audioPath,
              blobUrl: '',
              exists: false,
              error: errorMessage
            });
          }
        }
      }
    }
  }
  
  // Summarize results
  console.log('\nAudio Migration Verification Summary:');
  console.log(`Total audio files: ${total}`);
  console.log(`Successfully migrated: ${successful}`);
  console.log(`Failed or missing: ${failed}`);
  console.log(`Success rate: ${Math.round((successful / total) * 100)}%`);
  
  // Save verification report
  const report = {
    date: new Date().toISOString(),
    summary: {
      total,
      successful,
      failed,
      successRate: `${Math.round((successful / total) * 100)}%`
    },
    results
  };
  
  const reportPath = path.join(process.cwd(), 'reports', `audio-verification-${Date.now()}.json`);
  
  // Ensure reports directory exists
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!existsSync(reportsDir)) {
    await fs.mkdir(reportsDir, { recursive: true });
  }
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`Verification report saved to: ${reportPath}`);
  
  return report;
}

// Run verification if executed directly
if (import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''))) {
  verifyAudioMigration()
    .then(() => console.log('Audio migration verification complete!'))
    .catch(error => {
      console.error('Audio migration verification failed:', error);
      process.exit(1);
    });
}

export default verifyAudioMigration;