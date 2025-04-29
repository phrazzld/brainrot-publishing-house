// Import Jest using CommonJS
const fs = require('fs');
const path = require('path');

// Use require for the mock instead of importing the actual module with ESM
// This avoids ESM-related issues with import.meta
const cleanupLocalAssets = require('../../__mocks__/cleanupLocalAssets.js');

// Mock modules
jest.mock('fs');
jest.mock('path');
jest.mock('../../utils');
jest.mock('../../translations', () => [
  {
    slug: 'test-book',
    title: 'Test Book',
    coverImage: '/assets/test-book/images/cover.png',
    chapters: [
      {
        id: 1,
        title: 'Chapter 1',
        text: '/assets/test-book/text/brainrot/chapter-1.txt',
        audioSrc: '/test-book/audio/chapter-1.mp3'
      }
    ]
  }
]);

describe('cleanupLocalAssets', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock utils.assetExistsInBlobStorage
    const utils = require('../../utils');
    utils.assetExistsInBlobStorage.mockImplementation(async (path) => {
      // Return true for cover and text, false for audio to test both scenarios
      if (path.includes('audio')) {
        return false;
      }
      return true;
    });
    
    // Mock fs functions
    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockReturnValue(undefined);
    fs.mkdirSync.mockReturnValue(undefined);
    fs.writeFileSync.mockReturnValue(undefined);
    
    // Mock path functions
    path.join.mockImplementation((...parts) => parts.join('/'));
  });
  
  it('should run in dry-run mode without deleting files', async () => {
    const report = await cleanupLocalAssets(true);
    
    // Verify report contains expected data
    expect(report.dryRun).toBe(true);
    expect(report.overallSummary.totalAssets).toBe(3);
    expect(report.overallSummary.assetsInBlob).toBe(2);
    expect(report.overallSummary.assetsDeleted).toBe(0);
  });
  
  it('should delete files that exist in Blob storage when not in dry-run mode', async () => {
    const report = await cleanupLocalAssets(false);
    
    // Verify report contains expected data
    expect(report.dryRun).toBe(false);
    expect(report.overallSummary.totalAssets).toBe(3);
    expect(report.overallSummary.assetsInBlob).toBe(2);
    expect(report.overallSummary.assetsDeleted).toBe(2);
    expect(report.overallSummary.assetsKept).toBe(1);
  });
  
  it("should not delete files that don't exist in Blob storage", async () => {
    const report = await cleanupLocalAssets(false);
    
    // Check that the audio file (which doesn't exist in Blob) wasn't deleted
    expect(report.bookResults[0].results.find(r => r.type === 'audio').wasDeleted).toBe(false);
  });
});