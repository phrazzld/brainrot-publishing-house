#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixTranslationImports() {
  const scriptsDir = path.join(path.resolve(__dirname, '..'), 'scripts');

  // Find all TypeScript files in scripts directory
  const files = [];

  function findFiles(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        findFiles(itemPath);
      } else if (stat.isFile() && itemPath.endsWith('.ts')) {
        files.push(itemPath);
      }
    }
  }

  findFiles(scriptsDir);
  console.warn(`Found ${files.length} TypeScript files to check`);

  let fixedCount = 0;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Fix the import paths
    const updatedContent = content
      .replace(/from ['"]\.\.\/translations\.js['"]/g, "from '../translations/index.js'")
      .replace(/from ['"]\.\.\/translations['"]/g, "from '../translations/index.js'");

    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.warn(`Fixed imports in ${path.relative(process.cwd(), filePath)}`);
      fixedCount++;
    }
  }

  console.warn(`\nFixed imports in ${fixedCount} files.`);
}

fixTranslationImports().catch((error) => {
  console.error('Error fixing translation imports:', error);
  process.exit(1);
});
