import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import cleanupLocalAssets from '../../scripts/cleanupLocalAssets';
import * as utils from '../../utils';

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
    (utils.assetExistsInBlobStorage as jest.Mock).mockImplementation(async (path: string) => {
      // Return true for cover and text, false for audio to test both scenarios
      if (path.includes('audio')) {
        return false;
      }
      return true;
    });
    
    // Mock fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    
    // Mock path functions
    (path.join as jest.Mock).mockImplementation((...parts) => parts.join('/'));
  });
  
  it('should run in dry-run mode without deleting files', async () => {
    const report = await cleanupLocalAssets(true);
    
    // Verify it ran correctly
    expect(utils.assetExistsInBlobStorage).toHaveBeenCalledTimes(3);
    expect(fs.unlinkSync).not.toHaveBeenCalled();
    
    // Verify report contains expected data
    expect(report.dryRun).toBe(true);
    expect(report.overallSummary.totalAssets).toBe(3);
    expect(report.overallSummary.assetsInBlob).toBe(2);
    expect(report.overallSummary.assetsDeleted).toBe(0);
  });
  
  it('should delete files that exist in Blob storage when not in dry-run mode', async () => {
    const report = await cleanupLocalAssets(false);
    
    // Verify it deleted files that exist in Blob
    expect(utils.assetExistsInBlobStorage).toHaveBeenCalledTimes(3);
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    
    // Verify report contains expected data
    expect(report.dryRun).toBe(false);
    expect(report.overallSummary.totalAssets).toBe(3);
    expect(report.overallSummary.assetsInBlob).toBe(2);
    expect(report.overallSummary.assetsDeleted).toBe(2);
    expect(report.overallSummary.assetsKept).toBe(0);
  });
  
  it('should handle errors during Blob verification', async () => {
    // Make assetExistsInBlobStorage throw an error for one path
    (utils.assetExistsInBlobStorage as jest.Mock).mockImplementation(async (path: string) => {
      if (path.includes('chapter-1.txt')) {
        throw new Error('Test error');
      }
      return true;
    });
    
    const report = await cleanupLocalAssets(true);
    
    // Verify error handling
    expect(report.overallSummary.errors).toBe(1);
    expect(report.bookResults[0].results.some(r => r.error)).toBe(true);
  });
  
  it('should not delete files that don\'t exist in Blob storage', async () => {
    const report = await cleanupLocalAssets(false);
    
    // Verify it only deleted files that exist in Blob
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    
    // Check that the audio file (which doesn't exist in Blob) wasn't deleted
    expect(report.bookResults[0].results.find(r => r.type === 'audio')?.wasDeleted).toBe(false);
  });
});