import { list, copy } from '@vercel/blob';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SPECIAL_FILES = [
  {
    sourcePattern: 'books/the-adventures-of-huckleberry-finn/text/brainrot/chapter-the-last.txt',
    destPath: 'assets/text/huckleberry-finn/brainrot-chapter-43.txt',
    description: 'Huck Finn final chapter'
  }
];

async function findFile(pattern) {
  let cursor = undefined;
  
  do {
    const listResult = await list({ cursor });
    for (const blob of listResult.blobs) {
      if (blob.pathname === pattern) {
        return blob;
      }
    }
    cursor = listResult.cursor;
  } while (cursor);
  
  return null;
}

async function fixSpecialFiles() {
  console.log('=== Fixing Special Text Files ===\n');
  
  for (const special of SPECIAL_FILES) {
    console.log(`Processing: ${special.description}`);
    console.log(`  Looking for: ${special.sourcePattern}`);
    
    const sourceFile = await findFile(special.sourcePattern);
    
    if (!sourceFile) {
      console.log(`  ERROR: Source file not found`);
      continue;
    }
    
    try {
      console.log(`  Found source file: ${sourceFile.url}`);
      console.log(`  Copying to: ${special.destPath}`);
      
      await copy(sourceFile.url, special.destPath, { access: 'public' });
      
      console.log(`  SUCCESS: File copied`);
    } catch (error) {
      console.error(`  ERROR: ${error.message}`);
    }
    
    console.log();
  }
}

// Execute fix
fixSpecialFiles()
  .then(() => {
    console.log('\nSpecial files processing complete!');
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });