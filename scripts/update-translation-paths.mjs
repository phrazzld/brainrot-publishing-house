import { promises as fs } from 'fs';
import path from 'path';

const BOOKS_TO_UPDATE = [
  {
    filename: 'huckleberry-finn.ts',
    bookSlug: 'the-adventures-of-huckleberry-finn',
    newBookSlug: 'huckleberry-finn',
    patterns: [
      {
        old: /\/assets\/the-adventures-of-huckleberry-finn\/text\/brainrot\/chapter-([a-z]+)\.txt/g,
        new: (match, roman) => {
          const arabicMap = {
            'i': '01', 'ii': '02', 'iii': '03', 'iv': '04', 'v': '05',
            'vi': '06', 'vii': '07', 'viii': '08', 'ix': '09', 'x': '10',
            'xi': '11', 'xii': '12', 'xiii': '13', 'xiv': '14', 'xv': '15',
            'xvi': '16', 'xvii': '17', 'xviii': '18', 'xix': '19', 'xx': '20',
            'xxi': '21', 'xxii': '22', 'xxiii': '23', 'xxiv': '24', 'xxv': '25',
            'xxvi': '26', 'xxvii': '27', 'xxviii': '28', 'xxix': '29', 'xxx': '30',
            'xxxi': '31', 'xxxii': '32', 'xxxiii': '33', 'xxxiv': '34', 'xxxv': '35',
            'xxxvi': '36', 'xxxvii': '37', 'xxxviii': '38', 'xxxix': '39', 'xl': '40',
            'xli': '41', 'xlii': '42', 'xliii': '43'
          };
          const arabic = arabicMap[roman];
          return arabic ? `/assets/text/huckleberry-finn/brainrot-chapter-${arabic}.txt` : match;
        }
      },
      {
        old: /\/assets\/the-adventures-of-huckleberry-finn\/text\/brainrot\/chapter-the-last\.txt/g,
        new: '/assets/text/huckleberry-finn/brainrot-chapter-43.txt'
      }
    ]
  },
  {
    filename: 'hamlet.ts',
    bookSlug: 'hamlet',
    newBookSlug: 'hamlet',
    patterns: [
      {
        old: /\/assets\/hamlet\/text\/brainrot\/act-([a-z]+)\.txt/g,
        new: (match, roman) => {
          const arabicMap = {
            'i': '01', 'ii': '02', 'iii': '03', 'iv': '04', 'v': '05'
          };
          const arabic = arabicMap[roman];
          return arabic ? `/assets/text/hamlet/brainrot-act-${arabic}.txt` : match;
        }
      }
    ]
  }
];

async function updateTranslationFile(bookConfig) {
  const filePath = path.join(
    process.cwd(),
    'translations/books',
    bookConfig.filename
  );
  
  console.log(`\nProcessing ${bookConfig.filename}...`);
  
  try {
    // Read the file
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;
    
    // Apply all patterns
    for (const pattern of bookConfig.patterns) {
      if (typeof pattern.new === 'function') {
        content = content.replace(pattern.old, pattern.new);
      } else {
        content = content.replace(pattern.old, pattern.new);
      }
    }
    
    // Check if content changed
    if (content !== originalContent) {
      // Write the updated content back
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`  ✓ Updated paths in ${bookConfig.filename}`);
      
      // Count changes
      const changeCount = (originalContent.match(/\/assets\/[^/]+\/text\/brainrot\//g) || []).length;
      console.log(`  ✓ Updated ${changeCount} text paths`);
    } else {
      console.log(`  - No changes needed in ${bookConfig.filename}`);
    }
    
  } catch (error) {
    console.error(`  ✗ Error processing ${bookConfig.filename}:`, error.message);
  }
}

async function updateAllTranslations() {
  console.log('=== Updating Translation File Paths ===');
  console.log('Converting legacy text paths to standardized format...\n');
  
  for (const bookConfig of BOOKS_TO_UPDATE) {
    await updateTranslationFile(bookConfig);
  }
  
  console.log('\n=== Update Complete ===');
}

// Execute the update
updateAllTranslations()
  .then(() => {
    console.log('\nTranslation file update process complete!');
  })
  .catch(error => {
    console.error('\nFATAL ERROR:', error);
    process.exit(1);
  });