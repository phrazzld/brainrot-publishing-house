// Mock implementation of cleanupLocalAssets
// This avoids the ESM import.meta issues in the test

/**
 * Mock implementation that returns a predefined report
 */
const cleanupLocalAssets = jest.fn().mockImplementation(async (dryRun = true) => {
  return {
    date: '2025-04-29T10:30:00.000Z',
    dryRun,
    overallSummary: {
      totalBooks: 1,
      totalAssets: 3,
      assetsInBlob: 2,
      assetsDeleted: dryRun ? 0 : 2,
      assetsKept: dryRun ? 0 : 1,
      errors: 0
    },
    bookResults: [
      {
        slug: 'test-book',
        title: 'Test Book',
        results: [
          {
            path: '/assets/test-book/images/cover.png',
            localPath: '/Users/phaedrus/Development/brainrot-publishing-house/public/assets/test-book/images/cover.png',
            existsInBlob: true,
            wasDeleted: !dryRun,
            type: 'cover'
          },
          {
            path: '/assets/test-book/text/brainrot/chapter-1.txt',
            localPath: '/Users/phaedrus/Development/brainrot-publishing-house/public/assets/test-book/text/brainrot/chapter-1.txt',
            existsInBlob: true,
            wasDeleted: !dryRun,
            type: 'chapter'
          },
          {
            path: '/test-book/audio/chapter-1.mp3',
            localPath: '/Users/phaedrus/Development/brainrot-publishing-house/public/test-book/audio/chapter-1.mp3',
            existsInBlob: false,
            wasDeleted: false,
            type: 'audio'
          }
        ],
        summary: {
          totalAssets: 3,
          existInBlob: 2,
          deleted: dryRun ? 0 : 2,
          keptLocal: dryRun ? 0 : 1,
          errors: 0
        }
      }
    ]
  };
});

module.exports = cleanupLocalAssets;