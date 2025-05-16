import { list, copy } from '@vercel/blob';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MIGRATION_CONFIG = [
  {
    bookSlug: 'huckleberry-finn',
    legacyBookSlug: 'the-adventures-of-huckleberry-finn',
    expectedCount: 43,
    pattern: 'chapter',
    legacyPrefix: 'books/the-adventures-of-huckleberry-finn/text/brainrot/',
    newPrefix: 'assets/text/huckleberry-finn/',
  },
  {
    bookSlug: 'hamlet',
    legacyBookSlug: 'hamlet',
    expectedCount: 5,
    pattern: 'act',
    legacyPrefix: 'books/hamlet/text/brainrot/',
    newPrefix: 'assets/text/hamlet/',
  }
];

// Complete Roman to Arabic mapping
const ROMAN_TO_ARABIC = {
  'i': '01', 'ii': '02', 'iii': '03', 'iv': '04', 'v': '05',
  'vi': '06', 'vii': '07', 'viii': '08', 'ix': '09', 'x': '10',
  'xi': '11', 'xii': '12', 'xiii': '13', 'xiv': '14', 'xv': '15',
  'xvi': '16', 'xvii': '17', 'xviii': '18', 'xix': '19', 'xx': '20',
  'xxi': '21', 'xxii': '22', 'xxiii': '23', 'xxiv': '24', 'xxv': '25',
  'xxvi': '26', 'xxvii': '27', 'xxviii': '28', 'xxix': '29', 'xxx': '30',
  'xxxi': '31', 'xxxii': '32', 'xxxiii': '33', 'xxxiv': '34', 'xxxv': '35',
  'xxxvi': '36', 'xxxvii': '37', 'xxxviii': '38', 'xxxix': '39', 'xl': '40',
  'xli': '41', 'xlii': '42', 'xliii': '43', 'xliv': '44', 'xlv': '45'
};

// Additional mappings found in Huck Finn
const SPECIAL_CHAPTERS = {
  'chapter the last': 'chapter-43'
};

async function findTextFiles(prefix) {
  const files = [];
  let cursor = undefined;
  
  do {
    const listResult = await list({ cursor });
    for (const blob of listResult.blobs) {
      if (blob.pathname.startsWith(prefix) && blob.pathname.endsWith('.txt')) {
        files.push({
          path: blob.pathname,
          url: blob.url,
          size: blob.size
        });
      }
    }
    cursor = listResult.cursor;
  } while (cursor);
  
  return files;
}

async function migrateBook(config) {
  console.log(`\n=== Migrating ${config.bookSlug} ===`);
  
  // Find all text files for this book
  const legacyFiles = await findTextFiles(config.legacyPrefix);
  console.log(`Found ${legacyFiles.length} files in legacy location`);
  
  // Sort files to ensure consistent ordering
  legacyFiles.sort((a, b) => a.path.localeCompare(b.path));
  
  const migrationMap = new Map();
  const errors = [];
  
  for (const file of legacyFiles) {
    const filename = file.path.split('/').pop();
    
    // Extract the chapter/act number
    let romanNumeral = null;
    let newFilename = null;
    
    if (filename.includes(config.pattern)) {
      const match = filename.match(new RegExp(`${config.pattern}-(\\w+)\\.txt`));
      if (match) {
        romanNumeral = match[1];
      } else if (filename === 'chapter the last.txt') {
        // Special case for Huck Finn
        newFilename = 'brainrot-chapter-43.txt';
      }
    }
    
    if (romanNumeral) {
      const arabicNumber = ROMAN_TO_ARABIC[romanNumeral];
      if (arabicNumber) {
        newFilename = `brainrot-${config.pattern}-${arabicNumber}.txt`;
      } else {
        errors.push(`Unknown Roman numeral: ${romanNumeral} in ${filename}`);
        continue;
      }
    }
    
    if (!newFilename) {
      errors.push(`Could not process: ${filename}`);
      continue;
    }
    
    const newPath = config.newPrefix + newFilename;
    migrationMap.set(file, {
      sourcePath: file.path,
      sourceUrl: file.url,
      destPath: newPath,
      filename: newFilename
    });
  }
  
  // Log migration plan
  console.log(`\nMigration plan for ${config.bookSlug}:`);
  console.log(`Will migrate ${migrationMap.size} files`);
  if (errors.length > 0) {
    console.log(`\nErrors encountered:`);
    errors.forEach(err => console.log(`  - ${err}`));
  }
  
  // Execute migration
  console.log(`\nMigrating files...`);
  let successCount = 0;
  let failureCount = 0;
  
  for (const [file, migration] of migrationMap) {
    try {
      console.log(`  Copying: ${migration.filename}`);
      console.log(`    From: ${migration.sourcePath}`);
      console.log(`    To:   ${migration.destPath}`);
      
      await copy(migration.sourceUrl, migration.destPath, { access: 'public' });
      successCount++;
      
    } catch (error) {
      console.error(`    ERROR: ${error.message}`);
      failureCount++;
    }
  }
  
  console.log(`\nMigration complete for ${config.bookSlug}:`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failureCount}`);
  console.log(`  Skipped: ${errors.length}`);
  
  return { successCount, failureCount, errors };
}

async function migrateAllTextFiles() {
  console.log('=== Starting Text File Migration ===');
  console.log('Migrating text files to standardized locations...\n');
  
  const results = [];
  
  for (const config of MIGRATION_CONFIG) {
    try {
      const result = await migrateBook(config);
      results.push({ book: config.bookSlug, ...result });
    } catch (error) {
      console.error(`\nERROR migrating ${config.bookSlug}:`, error);
      results.push({ 
        book: config.bookSlug, 
        successCount: 0, 
        failureCount: 0, 
        errors: [error.message] 
      });
    }
  }
  
  // Final summary
  console.log('\n\n=== MIGRATION SUMMARY ===');
  for (const result of results) {
    console.log(`\n${result.book}:`);
    console.log(`  Success: ${result.successCount}`);
    console.log(`  Failed: ${result.failureCount}`);
    console.log(`  Errors: ${result.errors.length}`);
  }
  
  const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failureCount, 0);
  
  console.log(`\nTotal files migrated: ${totalSuccess}`);
  console.log(`Total failures: ${totalFailed}`);
}

// Execute migration
migrateAllTextFiles()
  .then(() => {
    console.log('\n\nMigration process complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n\nFATAL ERROR:', error);
    process.exit(1);
  });