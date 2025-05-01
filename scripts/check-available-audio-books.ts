import chalk from 'chalk';

import translations from '../translations';

async function checkBookAudio(
  bookSlug: string
): Promise<{ bookSlug: string; hasAudio: boolean; audioCount: number }> {
  const cdnBaseUrl = 'https://brainrot-publishing.nyc3.cdn.digitaloceanspaces.com';
  let audioCount = 0;
  let hasAudio = false;

  try {
    // Check book-01.mp3 as a test
    const testUrl = `${cdnBaseUrl}/${bookSlug}/audio/book-01.mp3`;
    const response = await fetch(testUrl, { method: 'HEAD' });

    if (response.ok) {
      hasAudio = true;

      // Try to count how many audio files are available
      for (let i = 1; i <= 30; i++) {
        const paddedNumber = String(i).padStart(2, '0');
        const audioUrl = `${cdnBaseUrl}/${bookSlug}/audio/book-${paddedNumber}.mp3`;

        try {
          const fileResponse = await fetch(audioUrl, { method: 'HEAD' });
          if (fileResponse.ok) {
            audioCount++;
          } else {
            // File doesn't exist, that's fine
            break;
          }
        } catch (error) {
          // Network error, just break
          break;
        }
      }
    }
  } catch (error) {
    // Likely no audio for this book
    hasAudio = false;
  }

  return { bookSlug, hasAudio, audioCount };
}

async function main() {
  console.log(chalk.cyan('🔍 Checking available audio books in CDN...'));

  const results = await Promise.all(translations.map((book) => checkBookAudio(book.slug)));

  const booksWithAudio = results.filter((result) => result.hasAudio);

  console.log(chalk.green(`\n📚 Found ${booksWithAudio.length} books with audio content:`));

  booksWithAudio.forEach((book) => {
    console.log(chalk.yellow(`- ${book.bookSlug}: ${book.audioCount} audio files`));
  });

  console.log(chalk.cyan('\n🔢 Total numbers:'));
  console.log(`Total books: ${translations.length}`);
  console.log(`Books with audio: ${booksWithAudio.length}`);
  console.log(
    `Total audio files across all books: ${booksWithAudio.reduce((sum, book) => sum + book.audioCount, 0)}`
  );
}

main().catch((error) => {
  console.error('Error checking audio books:', error);
  process.exit(1);
});
