/**
 * Script to check if specific blob URLs are accessible
 */
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get the base URL from environment variables
const BASE_URL = process.env.NEXT_PUBLIC_BLOB_BASE_URL;

if (!BASE_URL) {
  console.error('NEXT_PUBLIC_BLOB_BASE_URL environment variable is not set');
  process.exit(1);
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const status = response.status;
    console.log(`URL: ${url}`);
    console.log(`Status: ${status}`);
    console.log(`Exists: ${response.ok}`);
    return response.ok;
  } catch (error) {
    console.error(`Error checking URL ${url}:`, error);
    return false;
  }
}

async function main() {
  // Test URLs for the custom migrated assets
  const testUrls = [
    `${BASE_URL}/books/the-iliad/text/book-01.txt`,
    `${BASE_URL}/books/the-odyssey/text/book-01.txt`,
    `${BASE_URL}/books/the-aeneid/text/book-01.txt`,
    `${BASE_URL}/books/the-declaration-of-independence/text/the-declaration-of-independence.txt`,
  ];

  console.log('Base URL:', BASE_URL);
  let successCount = 0;

  for (const url of testUrls) {
    console.log('\nChecking:', url);
    const exists = await checkUrl(url);
    if (exists) successCount++;
  }

  console.log(`\nSummary: ${successCount} out of ${testUrls.length} URLs are accessible`);
}

main().catch(console.error);
