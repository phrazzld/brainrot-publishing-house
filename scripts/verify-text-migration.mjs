import { list } from '@vercel/blob';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const EXPECTATIONS = [
  {
    bookSlug: 'huckleberry-finn',
    prefix: 'assets/text/huckleberry-finn/',
    expected: 43,
    pattern: /brainrot-chapter-(\d+)\.txt$/
  },
  {
    bookSlug: 'hamlet',
    prefix: 'assets/text/hamlet/',
    expected: 5,
    pattern: /brainrot-act-(\d+)\.txt$/
  }
];

async function verifyMigration() {
  console.log('=== Verifying Text File Migration ===\n');
  
  for (const expectation of EXPECTATIONS) {
    console.log(`\nVerifying ${expectation.bookSlug}:`);
    console.log(`  Expected ${expectation.expected} files in ${expectation.prefix}`);
    
    const files = [];
    let cursor = undefined;
    
    do {
      const listResult = await list({ cursor });
      for (const blob of listResult.blobs) {
        if (blob.pathname.startsWith(expectation.prefix)) {
          const match = blob.pathname.match(expectation.pattern);
          if (match) {
            files.push({
              path: blob.pathname,
              number: parseInt(match[1], 10),
              size: blob.size
            });
          }
        }
      }
      cursor = listResult.cursor;
    } while (cursor);
    
    // Sort by number
    files.sort((a, b) => a.number - b.number);
    
    console.log(`  Found ${files.length} files`);
    
    // Check for missing chapters
    const missing = [];
    for (let i = 1; i <= expectation.expected; i++) {
      if (!files.find(f => f.number === i)) {
        missing.push(i);
      }
    }
    
    if (missing.length > 0) {
      console.log(`  MISSING: ${missing.join(', ')}`);
    } else {
      console.log(`  ✓ All expected files present`);
    }
    
    // Show sample files
    console.log(`  Sample files:`);
    files.slice(0, 3).forEach(f => {
      console.log(`    - ${f.path} (${f.size} bytes)`);
    });
    
    if (files.length > 3) {
      console.log(`    ...`);
      files.slice(-3).forEach(f => {
        console.log(`    - ${f.path} (${f.size} bytes)`);
      });
    }
  }
  
  console.log('\n\n=== Migration Verification Complete ===');
}

// Execute verification
verifyMigration()
  .then(() => {
    console.log('\nVerification process complete!');
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });