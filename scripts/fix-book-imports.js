#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixBookImports() {
  const booksDir = path.join(path.resolve(__dirname, '..'), 'translations/books');
  const files = fs.readdirSync(booksDir).filter((file) => file.endsWith('.ts'));

  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(booksDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Fix the import paths
    const updatedContent = content
      .replace(
        "import { getAssetUrl } from '../../utils.js';",
        "import { getAssetUrl } from '../utils.js';",
      )
      .replace(
        "import { USE_BLOB_STORAGE } from '../../utils.js';",
        "import { USE_BLOB_STORAGE } from '../utils.js';",
      )
      .replace(
        "import { getAssetUrl, USE_BLOB_STORAGE } from '../../utils.js';",
        "import { getAssetUrl, USE_BLOB_STORAGE } from '../utils.js';",
      );

    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.warn(`Fixed imports in ${file}`);
      fixedCount++;
    }
  }

  console.warn(`\nFixed imports in ${fixedCount} files.`);
}

fixBookImports().catch((error) => {
  console.error('Error fixing book imports:', error);
  process.exit(1);
});
