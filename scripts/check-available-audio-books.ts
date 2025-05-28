import chalk from 'chalk';

import translations from '../translations';

async function checkBookAudio(
  bookSlug: string,
): Promise<{ bookSlug: string; hasAudio: boolean; audioCount: number }> {
  const blobBaseUrl =
    process.env.NEXT_PUBLIC_BLOB_BASE_URL || 'https://public.blob.vercel-storage.com';
  let audioCount = 0;
  let hasAudio = false;

  try {
    // Check book-01.mp3 as a test
    const testUrl = `${blobBaseUrl}/books/${bookSlug}/audio/book-01.mp3`;
    const response = await fetch(testUrl, { method: 'HEAD' });

    if (response.ok) {
      hasAudio = true;

      // Try to count how many audio files are available
      for (let i = 1; i <= 30; i++) {
        const paddedNumber = String(i).padStart(2, '0');
        const audioUrl = `${blobBaseUrl}/books/${bookSlug}/audio/book-${paddedNumber}.mp3`;

        try {
          const fileResponse = await fetch(audioUrl, { method: 'HEAD' });
          if (fileResponse.ok) {
            audioCount++;
          } else {
            // File doesn't exist, that's fine
            break;
          }
        } catch {
          // Network error, just break
          break;
        }
      }
    }
  } catch {
    // Likely no audio for this book
    hasAudio = false;
  }

  return { bookSlug, hasAudio, audioCount };
}

async function main() {
  console.error(chalk.cyan('🔍 Checking available audio books in CDN...'));

  const results = await Promise.all(translations.map((book) => checkBookAudio(book.slug)));

  const booksWithAudio = results.filter((result) => result.hasAudio);

  console.error(chalk.green(`\n📚 Found ${booksWithAudio.length} books with audio content:`));

  booksWithAudio.forEach((book) => {
    console.error(chalk.yellow(`- ${book.bookSlug}: ${book.audioCount} audio files`));
  });

  console.error(chalk.cyan('\n🔢 Total numbers:'));
  console.error(`Total books: ${translations.length}`);
  console.error(`Books with audio: ${booksWithAudio.length}`);
  console.error(
    `Total audio files across all books: ${booksWithAudio.reduce((sum, book) => sum + book.audioCount, 0)}`,
  );
}

main().catch((error) => {
  console.error('Error checking audio books:', error);
  process.exit(1);
});
